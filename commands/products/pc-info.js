const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'products.json');

const CATEGORY_LABELS = {
    cases: 'Case',
    motherboard: 'Motherboard',
    cpu: 'CPU',
    cooler: 'Cooler',
    ram: 'RAM',
    storage: 'Storage',
    gpu: 'GPU',
    psu: 'PSU'
};

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

const normalizeSocket = (socket) => {
    if (!socket) return null;
    return String(socket).trim().toUpperCase();
};

const normalizeRamType = (ramType) => {
    if (!ramType) return null;
    return String(ramType).trim().toUpperCase();
};

const checkCpuMotherboardCompatibility = (cpuComponent, motherboardComponent) => {
    const cpuSocket = normalizeSocket(cpuComponent?.socket);
    const motherboardSocket = normalizeSocket(motherboardComponent?.socket);

    if (!cpuSocket || !motherboardSocket) {
        return { ok: true };
    }

    return { ok: cpuSocket === motherboardSocket };
};

const checkRamMotherboardCompatibility = (ramComponent, motherboardComponent) => {
    const ramType = normalizeRamType(ramComponent?.ramType);
    const motherboardRamType = normalizeRamType(motherboardComponent?.ramType);

    if (!ramType || !motherboardRamType) {
        return { ok: true };
    }

    return { ok: ramType === motherboardRamType };
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
        ingest({
            ...product,
            socket: normalizeSocket(product.socket),
            ramType: normalizeRamType(product.ramType)
        });
    }

    for (const jsonProduct of jsonProducts) {
        const existing = jsonProduct.name ? byName.get(jsonProduct.name) : undefined;
        if (!existing) {
            ingest({
                ...jsonProduct,
                socket: normalizeSocket(jsonProduct.socket),
                ramType: normalizeRamType(jsonProduct.ramType)
            });
            continue;
        }

        if (!existing.socket && jsonProduct.socket) {
            existing.socket = normalizeSocket(jsonProduct.socket);
        }
        if (!existing.ramType && jsonProduct.ramType) {
            existing.ramType = normalizeRamType(jsonProduct.ramType);
        }
        if (!existing.imageUrl && jsonProduct.imageUrl) {
            existing.imageUrl = jsonProduct.imageUrl;
        }
        if (!existing.category && jsonProduct.category) {
            existing.category = jsonProduct.category;
        }
        if (existing.price === undefined && jsonProduct.price !== undefined) {
            existing.price = jsonProduct.price;
        }
        ingest(existing);
    }

    return { byName, byId };
};

const enrichComponent = (component, productMaps) => {
    const byName = productMaps.byName;
    const byId = productMaps.byId;
    const fallback = component.name ? byName.get(component.name) : byId.get(Number(component.productId));
    const basePrice = typeof component.price === 'number' ? component.price : Number(component.price);
    const fallbackPrice = typeof fallback?.price === 'number' ? fallback.price : Number(fallback?.price);
    const quantity = Number(component.quantity);

    return {
        ...component,
        name: component.name || fallback?.name || 'N/A',
        category: component.category || fallback?.category,
        price: Number.isFinite(basePrice)
            ? basePrice
            : (Number.isFinite(fallbackPrice) ? fallbackPrice : undefined),
        socket: normalizeSocket(component.socket || fallback?.socket),
        ramType: normalizeRamType(component.ramType || fallback?.ramType),
        imageUrl: component.imageUrl || fallback?.imageUrl,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    };
};

const buildPcEmbed = (pc, productMaps) => {
    const components = (pc.components || []).map((comp) => enrichComponent(comp, productMaps));
    const cpu = components.find((c) => c.category === 'cpu');
    const motherboard = components.find((c) => c.category === 'motherboard');
    const ramComponents = components.filter((c) => c.category === 'ram');

    const cpuCompat = checkCpuMotherboardCompatibility(cpu, motherboard);
    const ramCompatOk = ramComponents.every((ram) => checkRamMotherboardCompatibility(ram, motherboard).ok);
    const allCompatOk = cpuCompat.ok && ramCompatOk;

    const totalPrice = components.reduce((sum, comp) => {
        const quantity = Number(comp.quantity) || 1;
        return sum + (comp.price || 0) * quantity;
    }, 0);
    const embed = new EmbedBuilder()
        .setTitle(`PC: ${pc.name || 'Unnamed'}`)
        .setColor(allCompatOk ? '#00FF99' : '#FF4D4D')
        .setTimestamp(pc.createdAt ? new Date(pc.createdAt) : undefined);

    if (components.length) {
        embed.setDescription(
            components.map((comp) => {
                const label = CATEGORY_LABELS[comp.category] || comp.category || 'Component';
                const quantity = Number(comp.quantity) || 1;
                const linePrice = Number.isFinite(comp.price) ? comp.price * quantity : undefined;
                const priceText = linePrice ? ` | <:pcb:827581416681898014> ${linePrice}` : '';
                const qtyText = quantity > 1 ? ` x${quantity}` : '';
                return `- ${label}: ${comp.imageUrl ? `${comp.imageUrl} ` : ''}${comp.name || 'N/A'}${qtyText}${priceText}`;
            }).join('\n')
        );
    } else {
        embed.setDescription('This PC has no saved components.');
    }

    embed.addFields(
        { name: 'Estimated value', value: totalPrice ? `<:pcb:827581416681898014> ${totalPrice}` : 'Not available' }
    );

    return embed;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pc-info')
        .setDescription('Show information about your virtual PCs.')
        .addStringOption((option) =>
            option
                .setName('nombre')
                .setDescription('PC name to show (optional)')
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
            await interaction.editReply({ content: 'You have no saved PCs. Use /create-pc to create one.' });
            return;
        }

        const pcs = userProfile.pcs;
        let selectedPc = pcs[pcs.length - 1];
        if (nameFilter) {
            const found = pcs.find((pc) => (pc.name || '').toLowerCase() === nameFilter);
            if (found) {
                selectedPc = found;
            } else {
                await interaction.editReply({ content: `I could not find a PC named "${providedName}".` });
                return;
            }
        }

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

        const buildSelectRow = () => {
            const options = pcs.slice(0, 25).map((pc, idx) => ({
                label: pc.name || `PC ${idx + 1}`,
                value: String(idx)
            }));
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('pcinfo_select')
                    .setPlaceholder('Select a PC')
                    .addOptions(options)
            );
        };

        const message = await interaction.editReply({
            embeds: [buildPcEmbed(selectedPc, productMaps)],
            components: pcs.length > 1 ? [buildSelectRow()] : [],
            fetchReply: true
        });

        if (pcs.length <= 1) return;

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === 'pcinfo_select',
            time: 120000
        });

        collector.on('collect', async (selectInteraction) => {
            const chosenIndex = Number(selectInteraction.values[0]);
            const pc = Number.isInteger(chosenIndex) ? pcs[chosenIndex] : undefined;
            if (!pc) {
                await selectInteraction.reply({ content: 'I could not load that PC. Try again.', ephemeral: true });
                return;
            }

            await selectInteraction.update({
                embeds: [buildPcEmbed(pc, productMaps)],
                components: [buildSelectRow()]
            });
        });

        collector.on('end', async () => {
            if (!message.editable) return;
            await message.edit({ components: [] });
        });
    }
};
