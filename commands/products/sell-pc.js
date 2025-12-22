const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'products.json');
const SELL_RATE = 0.95;

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
        if (!existing.price && jsonProduct.price) {
            existing.price = jsonProduct.price;
        }
        ingest(existing);
    }

    return { byName, byId };
};

const getComponentPrice = (component, productMaps) => {
    const basePrice = typeof component.price === 'number' ? component.price : Number(component.price);
    if (Number.isFinite(basePrice)) return basePrice;
    const fallback = component.name
        ? productMaps.byName.get(component.name)
        : productMaps.byId.get(Number(component.productId));
    const fallbackPrice = typeof fallback?.price === 'number' ? fallback.price : Number(fallback?.price);
    return Number.isFinite(fallbackPrice) ? fallbackPrice : 0;
};

const getPcValue = (pc, productMaps) => {
    const components = pc.components || [];
    return components.reduce((sum, comp) => {
        const quantity = Number(comp.quantity) || 1;
        return sum + getComponentPrice(comp, productMaps) * quantity;
    }, 0);
};

const buildSellEmbed = (pcName, totalValue, saleValue, newBalance) => {
    return new EmbedBuilder()
        .setTitle(`PC sold: ${pcName || 'Unnamed'}`)
        .setColor('#00FF99')
        .setDescription(`You received <:pcb:827581416681898014> ${saleValue}.`)
        .addFields(
            { name: 'Estimated value', value: `<:pcb:827581416681898014> ${totalValue}` },
            { name: 'Sell rate', value: `${Math.round(SELL_RATE * 100)}%` },
            { name: 'New balance', value: `<:pcb:827581416681898014> ${newBalance}` }
        )
        .setTimestamp();
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell-pc')
        .setDescription('Sell a PC from your inventory.')
        .addStringOption((option) =>
            option
                .setName('nombre')
                .setDescription('PC name to sell (optional)')
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
            await interaction.editReply({ content: 'You have no saved PCs to sell.' });
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

        const sellByIndex = async (pcIndex, responseInteraction) => {
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

            const totalValue = Math.round(getPcValue(pc, productMaps));
            const saleValue = Math.round(totalValue * SELL_RATE);
            freshProfile.balance += saleValue;
            freshProfile.pcs.splice(pcIndex, 1);

            await freshProfile.save();

            const embed = buildSellEmbed(pc.name, totalValue, saleValue, freshProfile.balance);
            await responseInteraction.editReply({ embeds: [embed], components: [] });
        };

        if (nameFilter) {
            const foundIndex = pcs.findIndex((pc) => (pc.name || '').toLowerCase() === nameFilter);
            if (foundIndex === -1) {
                await interaction.editReply({ content: `I could not find a PC named "${providedName}".` });
                return;
            }
            await sellByIndex(foundIndex, interaction);
            return;
        }

        if (pcs.length === 1) {
            await sellByIndex(0, interaction);
            return;
        }

        const buildSelectRow = () => {
            const options = pcs.slice(0, 25).map((pc, idx) => ({
                label: pc.name || `PC ${idx + 1}`,
                value: String(idx)
            }));
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('pcsell_select')
                    .setPlaceholder('Select a PC')
                    .addOptions(options)
            );
        };

        const message = await interaction.editReply({
            content: 'Select the PC you want to sell.',
            components: [buildSelectRow()],
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === 'pcsell_select',
            time: 120000
        });

        collector.on('collect', async (selectInteraction) => {
            const chosenIndex = Number(selectInteraction.values[0]);
            const pcIndex = Number.isInteger(chosenIndex) ? chosenIndex : -1;
            if (pcIndex < 0 || pcIndex >= pcs.length) {
                await selectInteraction.reply({ content: 'I could not load that PC. Try again.', ephemeral: true });
                return;
            }

            await selectInteraction.update({ content: 'Selling PC...', components: [] });
            await sellByIndex(pcIndex, selectInteraction);
            collector.stop('completed');
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'completed') return;
            if (!message.editable) return;
            await message.edit({ components: [] });
            if (reason === 'time') {
                await interaction.followUp({ content: 'Time expired. Run /sell-pc again.', ephemeral: true });
            }
        });
    }
};
