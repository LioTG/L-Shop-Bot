const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'products.json');
const COLLECT_COOLDOWN_MS = 60 * 60 * 1000;
const BASE_YIELD = 30;
const YIELD_DIVISOR = 4;
const MIN_YIELD = 20;
const MAX_YIELD = 600;
const HASHRATE_COMPONENTS = new Set(['gpu', 'cpu', 'ram', 'storage']);
const HASHRATE_PRICE_MULTIPLIER = {
    gpu: 0.25,
    cpu: 0.15,
    ram: 0.06,
    storage: 0.04
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

const normalizeHashRate = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

const buildProductMaps = (dbProducts, jsonProducts) => {
    const byName = new Map();
    const byId = new Map();

    const normalizeProduct = (product) => ({
        ...product,
        hashRate: normalizeHashRate(product.hashRate)
    });

    const ingest = (product) => {
        if (!product) return;
        const normalized = normalizeProduct(product);
        if (normalized.name) byName.set(normalized.name, normalized);
        const numericId = Number(normalized.id);
        if (Number.isFinite(numericId)) {
            byId.set(numericId, normalized);
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
        if (existing.hashRate === undefined && jsonProduct.hashRate !== undefined) {
            existing.hashRate = normalizeHashRate(jsonProduct.hashRate);
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

const getComponentHashRate = (component, productMaps) => {
    const fallback = component.name
        ? productMaps.byName.get(component.name)
        : productMaps.byId.get(Number(component.productId));
    const category = component.category || fallback?.category;
    if (!HASHRATE_COMPONENTS.has(category)) return 0;

    const baseHash = normalizeHashRate(component.hashRate);
    if (baseHash !== undefined) return baseHash;

    const fallbackHash = normalizeHashRate(fallback?.hashRate);
    if (fallbackHash !== undefined) return fallbackHash;

    const price = getComponentPrice(component, productMaps);
    const multiplier = HASHRATE_PRICE_MULTIPLIER[category] || 0;
    return price * multiplier;
};

const getPcYield = (pc, productMaps) => {
    let totalHashRate = 0;
    for (const component of pc.components || []) {
        const quantity = Number(component.quantity) || 1;
        totalHashRate += getComponentHashRate(component, productMaps) * quantity;
    }

    const raw = BASE_YIELD + (totalHashRate / YIELD_DIVISOR);
    return Math.max(MIN_YIELD, Math.min(MAX_YIELD, Math.round(raw)));
};

const buildMiningEmbed = async (pcName, yieldValue, nextCollectMs) => {
    const { default: prettyMs } = await import('pretty-ms');
    return new EmbedBuilder()
        .setTitle(`Mining started: ${pcName || 'Unnamed'}`)
        .setColor('#00FF99')
        .setDescription('This PC is now mining LioCoins.')
        .addFields(
            { name: 'Hourly yield', value: `<:pcb:827581416681898014> ${yieldValue}` },
            { name: 'Cooldown', value: prettyMs(COLLECT_COOLDOWN_MS) },
            { name: 'Next collect in', value: prettyMs(nextCollectMs) }
        )
        .setTimestamp();
};

const buildAlreadyMiningEmbed = async (pcName, nextCollectMs) => {
    const { default: prettyMs } = await import('pretty-ms');
    return new EmbedBuilder()
        .setTitle(`Already mining: ${pcName || 'Unnamed'}`)
        .setColor('#FFD166')
        .setDescription('This PC is already mining.')
        .addFields(
            { name: 'Next collect in', value: prettyMs(nextCollectMs) }
        )
        .setTimestamp();
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine-pc')
        .setDescription('Start mining with a PC.')
        .addStringOption((option) =>
            option
                .setName('nombre')
                .setDescription('PC name to start mining (optional)')
                .setRequired(false),
        ),

    async run({ interaction }) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }

        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const providedName = (interaction.options.getString('nombre') || '').trim();
        const nameFilter = providedName.toLowerCase();

        const userProfile = await UserProfile.findOne({ userId, guildId });
        if (!userProfile || !(userProfile.pcs?.length)) {
            await interaction.editReply({ content: 'You have no saved PCs. Use /create-pc first.' });
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

        const startMining = async (pcIndex, responseInteraction) => {
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

            pc.mining = pc.mining || {};
            const now = Date.now();
            const lastCollected = pc.mining.lastCollectedAt ? new Date(pc.mining.lastCollectedAt).getTime() : now;
            const nextCollectMs = Math.max(0, (lastCollected + COLLECT_COOLDOWN_MS) - now);

            if (pc.mining.isMining) {
                const embed = await buildAlreadyMiningEmbed(pc.name, nextCollectMs);
                await responseInteraction.editReply({ embeds: [embed], components: [] });
                return;
            }

            pc.mining.isMining = true;
            pc.mining.startedAt = new Date();
            pc.mining.lastCollectedAt = new Date();

            await freshProfile.save();

            const yieldValue = getPcYield(pc, productMaps);
            const embed = await buildMiningEmbed(pc.name, yieldValue, COLLECT_COOLDOWN_MS);
            await responseInteraction.editReply({ embeds: [embed], components: [] });
        };

        if (nameFilter) {
            const foundIndex = pcs.findIndex((pc) => (pc.name || '').toLowerCase() === nameFilter);
            if (foundIndex === -1) {
                await interaction.editReply({ content: `I could not find a PC named "${providedName}".` });
                return;
            }
            await startMining(foundIndex, interaction);
            return;
        }

        if (pcs.length === 1) {
            await startMining(0, interaction);
            return;
        }

        const buildSelectRow = () => {
            const options = pcs.slice(0, 25).map((pc, idx) => ({
                label: pc.name || `PC ${idx + 1}`,
                value: String(idx)
            }));
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('pcmine_select')
                    .setPlaceholder('Select a PC')
                    .addOptions(options)
            );
        };

        const message = await interaction.editReply({
            content: 'Select the PC you want to start mining with.',
            components: [buildSelectRow()],
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === 'pcmine_select',
            time: 120000
        });

        collector.on('collect', async (selectInteraction) => {
            const chosenIndex = Number(selectInteraction.values[0]);
            const pcIndex = Number.isInteger(chosenIndex) ? chosenIndex : -1;
            if (pcIndex < 0 || pcIndex >= pcs.length) {
                await selectInteraction.reply({ content: 'I could not load that PC. Try again.', ephemeral: true });
                return;
            }

            await selectInteraction.update({ content: 'Starting mining...', components: [] });
            await startMining(pcIndex, selectInteraction);
            collector.stop('completed');
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'completed') return;
            if (!message.editable) return;
            await message.edit({ components: [] });
            if (reason === 'time') {
                await interaction.followUp({ content: 'Time expired. Run /mine-pc again.', ephemeral: true });
            }
        });
    }
};
