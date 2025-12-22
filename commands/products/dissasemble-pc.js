const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'products.json');

const loadProductsFromJson = async () => {
    try {
        const content = await fs.readFile(PRODUCTS_JSON_PATH, 'utf8');
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Could not read data/products.json:', error);
        return [];
    }
};

const buildProductMaps = (dbProducts, jsonProducts) => {
    const byName = new Map();
    const byId = new Map();

    const ingest = (product) => {
        if (!product) return;
        if (product.name) byName.set(product.name, product);
        const numericId = Number(product.id);
        if (Number.isFinite(numericId)) {
            byId.set(numericId, product);
        }
    };

    for (const product of dbProducts) {
        ingest(product);
    }
    for (const jsonProduct of jsonProducts) {
        const existing = jsonProduct.name ? byName.get(jsonProduct.name) : undefined;
        if (!existing) {
            ingest(jsonProduct);
            continue;
        }
        if (!existing.category && jsonProduct.category) {
            existing.category = jsonProduct.category;
        }
        ingest(existing);
    }

    return { byName, byId };
};

const restoreComponentsToInventory = (profile, pc, productMaps) => {
    const summary = new Map();
    for (const component of pc.components || []) {
        const fallback = component.name
            ? productMaps.byName.get(component.name)
            : productMaps.byId.get(Number(component.productId));
        const name = component.name || fallback?.name;
        if (!name) continue;
        const category = component.category || fallback?.category || 'unknown';
        const quantity = Number(component.quantity) || 1;

        const existing = profile.inventory.find((item) => item.name === name);
        if (existing) {
            existing.quantity += quantity;
        } else {
            profile.inventory.push({ category, name, quantity });
        }
        summary.set(name, (summary.get(name) || 0) + quantity);
    }
    return summary;
};

const buildSummaryEmbed = (pcName, summaryMap) => {
    const embed = new EmbedBuilder()
        .setTitle(`PC disassembled: ${pcName || 'Unnamed'}`)
        .setColor('#00FF99')
        .setFooter({ text: 'Components returned to your inventory.' })
        .setTimestamp();

    if (!summaryMap.size) {
        embed.setDescription('There were no components to return.');
        return embed;
    }

    const lines = Array.from(summaryMap.entries())
        .map(([name, qty]) => `- ${name} x${qty}`)
        .join('\n');
    embed.setDescription(lines);
    return embed;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dissasemble-pc')
        .setDescription('Disassemble a PC and return components to your inventory.')
        .addStringOption((option) =>
            option
                .setName('nombre')
                .setDescription('PC name to disassemble (optional)')
                .setRequired(false),
        ),

    async run({ interaction }) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const providedName = (interaction.options.getString('nombre') || '').trim();
        const nameFilter = providedName.toLowerCase();

        const userProfile = await UserProfile.findOne({ userId, guildId });
        if (!userProfile || !(userProfile.pcs?.length)) {
            await interaction.editReply({ content: 'You have no saved PCs to disassemble.' });
            return;
        }

        const pcs = userProfile.pcs;
        const componentNames = Array.from(new Set(
            pcs.flatMap((pc) => (pc.components || []).map((comp) => comp.name).filter(Boolean))
        ));
        const componentIds = Array.from(new Set(
            pcs.flatMap((pc) => (pc.components || []).map((comp) => Number(comp.productId)).filter(Number.isFinite))
        ));

        const dbQuery = [];
        if (componentNames.length) dbQuery.push({ name: { $in: componentNames } });
        if (componentIds.length) dbQuery.push({ id: { $in: componentIds } });

        const [jsonProducts, dbProducts] = await Promise.all([
            loadProductsFromJson(),
            dbQuery.length ? Product.find({ $or: dbQuery }).lean() : Promise.resolve([])
        ]);
        const productMaps = buildProductMaps(dbProducts, jsonProducts);

        const disassembleByIndex = async (pcIndex, responseInteraction) => {
            const freshProfile = await UserProfile.findOne({ userId, guildId });
            if (!freshProfile || !(freshProfile.pcs?.length)) {
                await responseInteraction.editReply({ content: 'Your profile could not be loaded. Try again.' });
                return;
            }
            const pc = freshProfile.pcs[pcIndex];
            if (!pc) {
                await responseInteraction.editReply({ content: 'That PC could not be found. Try again.' });
                return;
            }

            const summary = restoreComponentsToInventory(freshProfile, pc, productMaps);
            freshProfile.pcs.splice(pcIndex, 1);
            await freshProfile.save();

            const embed = buildSummaryEmbed(pc.name, summary);
            await responseInteraction.editReply({ embeds: [embed], components: [] });
        };

        if (nameFilter) {
            const foundIndex = pcs.findIndex((pc) => (pc.name || '').toLowerCase() === nameFilter);
            if (foundIndex === -1) {
                await interaction.editReply({ content: `I could not find a PC named "${providedName}".` });
                return;
            }
            await disassembleByIndex(foundIndex, interaction);
            return;
        }

        if (pcs.length === 1) {
            await disassembleByIndex(0, interaction);
            return;
        }

        const buildSelectRow = () => {
            const options = pcs.slice(0, 25).map((pc, idx) => ({
                label: pc.name || `PC ${idx + 1}`,
                value: String(idx)
            }));
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('pcdisassemble_select')
                    .setPlaceholder('Select a PC')
                    .addOptions(options)
            );
        };

        const message = await interaction.editReply({
            content: 'Select the PC you want to disassemble.',
            components: [buildSelectRow()],
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === 'pcdisassemble_select',
            time: 120000
        });

        collector.on('collect', async (selectInteraction) => {
            const chosenIndex = Number(selectInteraction.values[0]);
            const pcIndex = Number.isInteger(chosenIndex) ? chosenIndex : -1;
            if (pcIndex < 0 || pcIndex >= pcs.length) {
                await selectInteraction.reply({ content: 'I could not load that PC. Try again.', ephemeral: true });
                return;
            }

            await selectInteraction.update({ content: 'Disassembling PC...', components: [] });
            await disassembleByIndex(pcIndex, selectInteraction);
            collector.stop('completed');
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'completed') return;
            if (!message.editable) return;
            await message.edit({ components: [] });
            if (reason === 'time') {
                await interaction.followUp({ content: 'Time expired. Run /dissasemble-pc again.', ephemeral: true });
            }
        });
    }
};
