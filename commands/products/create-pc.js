const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'products.json');

const BUILD_STEPS = [
    { category: 'cases', label: 'Case' },
    { category: 'motherboard', label: 'Motherboard' },
    { category: 'cpu', label: 'CPU' },
    { category: 'cooler', label: 'Cooler' },
    { category: 'ram', label: 'RAM' },
    { category: 'storage', label: 'Storage' },
    { category: 'gpu', label: 'GPU' },
    { category: 'psu', label: 'PSU' },
];

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

const normalizeRamSlots = (ramSlots) => {
    const numeric = Number(ramSlots);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : null;
};

const checkCpuMotherboardCompatibility = (cpuProduct, motherboardProduct) => {
    const cpuSocket = normalizeSocket(cpuProduct?.socket);
    const motherboardSocket = normalizeSocket(motherboardProduct?.socket);

    if (!cpuSocket || !motherboardSocket) {
        return { ok: true, reason: 'unknown', cpuSocket, motherboardSocket };
    }

    if (cpuSocket === motherboardSocket) {
        return { ok: true, reason: 'match', cpuSocket, motherboardSocket };
    }

    return { ok: false, reason: 'mismatch', cpuSocket, motherboardSocket };
};

const checkRamMotherboardCompatibility = (ramProduct, motherboardProduct) => {
    const ramType = normalizeRamType(ramProduct?.ramType);
    const motherboardRamType = normalizeRamType(motherboardProduct?.ramType);

    if (!ramType || !motherboardRamType) {
        return { ok: true, reason: 'unknown', ramType, motherboardRamType };
    }

    if (ramType === motherboardRamType) {
        return { ok: true, reason: 'match', ramType, motherboardRamType };
    }

    return { ok: false, reason: 'mismatch', ramType, motherboardRamType };
};

const getDefaultPcName = (existingPcs = []) => {
    const usedNames = new Set(existingPcs.map((pc) => (pc.name || '').toLowerCase()));
    let counter = 1;
    let candidate = `PC ${counter}`;
    while (usedNames.has(candidate.toLowerCase())) {
        counter += 1;
        candidate = `PC ${counter}`;
    }
    return candidate;
};

const formatRamSelection = (ramSelections = []) => {
    if (!Array.isArray(ramSelections) || ramSelections.length === 0) return 'Not selected';
    const grouped = new Map();
    for (const entry of ramSelections) {
        const name = entry.product?.name || entry.name;
        if (!name) continue;
        const existing = grouped.get(name) || { count: 0, product: entry.product };
        existing.count += 1;
        existing.product = existing.product || entry.product;
        grouped.set(name, existing);
    }
    return Array.from(grouped.entries()).map(([name, info]) => {
        const icon = info.product?.imageUrl ? `${info.product.imageUrl} ` : '';
        const qty = info.count > 1 ? ` x${info.count}` : '';
        return `${icon}${name}${qty}`;
    }).join('\n') || 'Not selected';
};

const buildProgressEmbed = (selectedByCategory, currentIndex, ramOptionsState) => {
    const ramSlots = normalizeRamSlots(selectedByCategory.motherboard?.product?.ramSlots);
    const ramSlotsText = ramSlots ? `${ramSlots}` : 'Unknown';
    const isRamStep = BUILD_STEPS[currentIndex]?.category === 'ram';
    const truncatedNote = isRamStep && ramOptionsState?.truncated ? ' Only the first 25 RAM sticks are shown.' : '';
    const embed = new EmbedBuilder()
        .setTitle('Virtual PC Builder')
        .setColor('#00A3FF')
        .setDescription(`Select components from your inventory in order. RAM slots: ${ramSlotsText}.${truncatedNote}`);

    BUILD_STEPS.forEach((step, idx) => {
        const picked = selectedByCategory[step.category];
        const prefix = picked ? '[OK]' : idx === currentIndex ? '[>]' : '[ ]';
        const label = `${prefix} ${step.label}`;
        let value = 'Not selected';
        if (step.category === 'ram') {
            value = formatRamSelection(picked);
        } else if (picked) {
            value = `${picked.product?.imageUrl ? `${picked.product.imageUrl} ` : ''}${picked.product?.name || picked.name}`;
        }

        embed.addFields({ name: label, value, inline: false });
    });

    const footerText = currentIndex < BUILD_STEPS.length
        ? `Step ${currentIndex + 1} of ${BUILD_STEPS.length}: ${BUILD_STEPS[currentIndex].label}`
        : 'All components selected';
    embed.setFooter({ text: footerText });

    return embed;
};

const getInventoryCountMap = (inventory = []) => {
    const counts = new Map();
    for (const item of inventory) {
        const name = item.name;
        const quantity = Number(item.quantity) || 0;
        counts.set(name, (counts.get(name) || 0) + quantity);
    }
    return counts;
};

const getMissingInventory = (inventory = [], requiredMap) => {
    const counts = getInventoryCountMap(inventory);
    const missing = [];
    for (const [name, quantity] of requiredMap) {
        const available = counts.get(name) || 0;
        if (available < quantity) {
            missing.push(`${name} (x${quantity - available})`);
        }
    }
    return missing;
};

const consumeInventory = (inventory = [], requiredMap) => {
    for (const [name, quantity] of requiredMap) {
        let remaining = quantity;
        for (const item of inventory) {
            if (item.name !== name || remaining <= 0) continue;
            const take = Math.min(Number(item.quantity) || 0, remaining);
            item.quantity -= take;
            remaining -= take;
        }
    }
    return inventory.filter((item) => (Number(item.quantity) || 0) > 0);
};

const buildRamOptions = (ramInventory = [], ramSlotsLimit) => {
    const options = [];
    const valueMap = new Map();
    let totalUnits = 0;

    for (const entry of ramInventory) {
        const count = Math.max(Number(entry.quantity) || 0, 0);
        for (let i = 1; i <= count; i += 1) {
            totalUnits += 1;
            const baseLabel = entry.product?.name || entry.name || 'RAM';
            const label = count > 1 ? `${baseLabel} (#${i})` : baseLabel;
            const value = `${entry.name || baseLabel}::${i}`;
            const description = `RAM: ${entry.product?.ramType || 'N/A'}`;
            options.push({
                label: label.slice(0, 100),
                value,
                description: description.slice(0, 100)
            });
            valueMap.set(value, { name: entry.name || baseLabel, product: entry.product });
            if (options.length >= 25) break;
        }
        if (options.length >= 25) break;
    }

    const maxValues = Math.min(
        options.length,
        ramSlotsLimit && ramSlotsLimit > 0 ? ramSlotsLimit : options.length
    );

    return {
        options,
        valueMap,
        maxValues,
        truncated: totalUnits > options.length
    };
};

const groupRamSelections = (ramSelections = []) => {
    const grouped = new Map();
    for (const entry of ramSelections) {
        const name = entry.product?.name || entry.name;
        if (!name) continue;
        const existing = grouped.get(name) || { name, product: entry.product, quantity: 0 };
        existing.quantity += 1;
        existing.product = existing.product || entry.product;
        grouped.set(name, existing);
    }
    return Array.from(grouped.values());
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-pc')
        .setDescription('Build a virtual PC with components from your inventory.')
        .addStringOption((option) =>
            option
                .setName('nombre')
                .setDescription('PC name (optional, default is PC 1, PC 2, etc.)')
                .setRequired(false),
        ),

    async run({ interaction }) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const desiredName = (interaction.options.getString('nombre') || '').trim();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const userProfile = await UserProfile.findOne({ userId, guildId });
        if (!userProfile) {
            await interaction.editReply({ content: 'You do not have a profile yet. Use /work or /buy-item first.' });
            return;
        }

        const [jsonProducts, dbProducts] = await Promise.all([
            loadProductsFromJson(),
            Product.find({ name: { $in: userProfile.inventory.map((i) => i.name) } }).lean()
        ]);

        const productMap = new Map();
        for (const product of dbProducts) {
            productMap.set(product.name, {
                ...product,
                socket: normalizeSocket(product.socket),
                ramType: normalizeRamType(product.ramType),
                ramSlots: normalizeRamSlots(product.ramSlots)
            });
        }
        for (const jsonProduct of jsonProducts) {
            if (!productMap.has(jsonProduct.name)) {
                productMap.set(jsonProduct.name, {
                    ...jsonProduct,
                    socket: normalizeSocket(jsonProduct.socket),
                    ramType: normalizeRamType(jsonProduct.ramType),
                    ramSlots: normalizeRamSlots(jsonProduct.ramSlots)
                });
                continue;
            }
            const stored = productMap.get(jsonProduct.name);
            if (!stored.socket && jsonProduct.socket) {
                stored.socket = normalizeSocket(jsonProduct.socket);
            }
            if (!stored.ramType && jsonProduct.ramType) {
                stored.ramType = normalizeRamType(jsonProduct.ramType);
            }
            if (!stored.ramSlots && jsonProduct.ramSlots) {
                stored.ramSlots = normalizeRamSlots(jsonProduct.ramSlots);
            }
            if (!stored.imageUrl && jsonProduct.imageUrl) {
                stored.imageUrl = jsonProduct.imageUrl;
            }
            if (!stored.category && jsonProduct.category) {
                stored.category = jsonProduct.category;
            }
        }

        const inventoryByCategory = new Map();
        for (const item of userProfile.inventory) {
            const product = productMap.get(item.name) || { name: item.name, category: item.category };
            const category = product.category || item.category || 'unknown';
            const bucket = inventoryByCategory.get(category) || [];
            const existing = bucket.find((entry) => entry.name === item.name);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                bucket.push({
                    name: item.name,
                    quantity: item.quantity,
                    product
                });
            }
            inventoryByCategory.set(category, bucket);
        }

        const missingCategories = BUILD_STEPS
            .filter((step) => !(inventoryByCategory.get(step.category)?.length));

        if (missingCategories.length) {
            const list = missingCategories.map((step) => `- ${step.label}`).join('\n');
            await interaction.editReply({
                content: `You are missing components in your inventory to create a PC:\n${list}`
            });
            return;
        }

        const selected = {};
        let currentIndex = 0;
        let ramOptionsState = { truncated: false, valueMap: new Map(), maxValues: 0 };

        const buildSelectRow = () => {
            const step = BUILD_STEPS[currentIndex];
            if (step.category === 'ram') {
                const ramSlotsLimit = normalizeRamSlots(selected.motherboard?.product?.ramSlots);
                const ramInventory = inventoryByCategory.get('ram') || [];
                ramOptionsState = buildRamOptions(ramInventory, ramSlotsLimit);
                if (!ramOptionsState.options.length) {
                    return null;
                }

                const menu = new StringSelectMenuBuilder()
                    .setCustomId('pcbuilder_select')
                    .setPlaceholder('Select RAM sticks')
                    .addOptions(ramOptionsState.options)
                    .setMinValues(1)
                    .setMaxValues(ramOptionsState.maxValues);

                return new ActionRowBuilder().addComponents(menu);
            }

            const options = (inventoryByCategory.get(step.category) || []).slice(0, 25).map((entry) => {
                const baseLabel = entry.product?.name || entry.name;
                const socketSuffix = ['cpu', 'motherboard'].includes(step.category)
                    ? ` | Socket: ${entry.product?.socket || 'N/A'}`
                    : '';
                const ramSuffix = ['ram', 'motherboard'].includes(step.category)
                    ? ` | RAM: ${entry.product?.ramType || 'N/A'}`
                    : '';
                const description = `Qty: ${entry.quantity}${socketSuffix}${ramSuffix}`;
                return {
                    label: baseLabel,
                    value: entry.name,
                    description: description.slice(0, 100)
                };
            });

            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('pcbuilder_select')
                    .setPlaceholder(`Select ${step.label}`)
                    .addOptions(options),
            );
        };

        const row = buildSelectRow();
        if (!row) {
            await interaction.editReply({ content: 'There are no selectable items for this step.' });
            return;
        }

        const message = await interaction.editReply({
            embeds: [buildProgressEmbed(selected, currentIndex, ramOptionsState)],
            components: [row],
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === 'pcbuilder_select',
            time: 120000
        });

        collector.on('collect', async (selectInteraction) => {
            const step = BUILD_STEPS[currentIndex];
            if (step.category === 'ram') {
                const values = selectInteraction.values || [];
                if (!values.length) {
                    await selectInteraction.reply({ content: 'Select at least one RAM stick.', ephemeral: true });
                    return;
                }

                const selectedRam = values.map((value) => ramOptionsState.valueMap.get(value)).filter(Boolean);
                if (!selectedRam.length) {
                    await selectInteraction.reply({ content: 'I could not load those RAM sticks. Try again.', ephemeral: true });
                    return;
                }

                const ramSlotsLimit = normalizeRamSlots(selected.motherboard?.product?.ramSlots);
                if (ramSlotsLimit && selectedRam.length > ramSlotsLimit) {
                    await selectInteraction.reply({
                        content: `You selected ${selectedRam.length} RAM sticks, but the motherboard has ${ramSlotsLimit} slots.`,
                        ephemeral: true
                    });
                    return;
                }

                if (selected.motherboard) {
                    const mismatch = selectedRam.find((ramEntry) =>
                        !checkRamMotherboardCompatibility(ramEntry.product, selected.motherboard.product).ok
                    );
                    if (mismatch) {
                        await selectInteraction.reply({
                            content: 'One or more selected RAM sticks are not compatible with the motherboard.',
                            ephemeral: true
                        });
                        return;
                    }
                }

                selected.ram = selectedRam;
            } else {
                const chosenName = selectInteraction.values[0];
                const options = inventoryByCategory.get(step.category) || [];
                const chosen = options.find((entry) => entry.name === chosenName);

                if (!chosen) {
                    await selectInteraction.reply({ content: 'I could not find that component in your inventory.', ephemeral: true });
                    return;
                }

                if (step.category === 'cpu' && selected.motherboard) {
                    const compatibility = checkCpuMotherboardCompatibility(chosen.product, selected.motherboard.product);
                    if (!compatibility.ok) {
                        await selectInteraction.reply({
                            content: 'CPU is not compatible with the selected motherboard. Choose another CPU.',
                            ephemeral: true
                        });
                        return;
                    }
                }

                selected[step.category] = chosen;
            }

            currentIndex += 1;

            if (currentIndex >= BUILD_STEPS.length) {
                const requiredMap = new Map();
                for (const stepInfo of BUILD_STEPS) {
                    if (stepInfo.category === 'ram') {
                        const ramSelections = Array.isArray(selected.ram) ? selected.ram : [];
                        for (const ramEntry of ramSelections) {
                            const name = ramEntry.product?.name || ramEntry.name;
                            if (!name) continue;
                            requiredMap.set(name, (requiredMap.get(name) || 0) + 1);
                        }
                        continue;
                    }

                    const item = selected[stepInfo.category];
                    if (!item) continue;
                    const name = item.product?.name || item.name;
                    requiredMap.set(name, (requiredMap.get(name) || 0) + 1);
                }

                const freshProfile = await UserProfile.findOne({ userId, guildId });
                if (!freshProfile) {
                    await selectInteraction.update({
                        content: 'Your profile is not available. Try again.',
                        embeds: [],
                        components: []
                    });
                    collector.stop('profile_missing');
                    return;
                }

                const missingItems = getMissingInventory(freshProfile.inventory, requiredMap);
                if (missingItems.length) {
                    await selectInteraction.update({
                        content: `You do not have enough items to finish this PC:\n${missingItems.map((item) => `- ${item}`).join('\n')}`,
                        embeds: [],
                        components: []
                    });
                    collector.stop('inventory_missing');
                    return;
                }

                freshProfile.inventory = consumeInventory(freshProfile.inventory, requiredMap);

                const existingNames = new Set((freshProfile.pcs || []).map((pc) => (pc.name || '').toLowerCase()));
                let pcName = desiredName || getDefaultPcName(freshProfile.pcs);
                if (existingNames.has(pcName.toLowerCase())) {
                    let suffix = 2;
                    let candidate = `${pcName} (${suffix})`;
                    while (existingNames.has(candidate.toLowerCase())) {
                        suffix += 1;
                        candidate = `${pcName} (${suffix})`;
                    }
                    pcName = candidate;
                }

                const components = [];
                for (const stepInfo of BUILD_STEPS) {
                    if (stepInfo.category === 'ram') {
                        const groupedRam = groupRamSelections(selected.ram || []);
                        for (const ramGroup of groupedRam) {
                            const product = ramGroup.product || {};
                            const numericId = typeof product.id === 'number' ? product.id : Number(product.id) || undefined;
                            const numericPrice = typeof product.price === 'number' ? product.price : Number(product.price) || undefined;
                            components.push({
                                category: 'ram',
                                name: ramGroup.name,
                                quantity: ramGroup.quantity,
                                productId: numericId,
                                price: numericPrice,
                                socket: product.socket,
                                ramType: product.ramType,
                                imageUrl: product.imageUrl
                            });
                        }
                        continue;
                    }

                    const item = selected[stepInfo.category];
                    const product = item?.product || {};
                    const numericId = typeof product.id === 'number' ? product.id : Number(product.id) || undefined;
                    const numericPrice = typeof product.price === 'number' ? product.price : Number(product.price) || undefined;
                    components.push({
                        category: stepInfo.category,
                        name: product.name || item?.name,
                        quantity: 1,
                        productId: numericId,
                        price: numericPrice,
                        socket: product.socket,
                        ramType: product.ramType,
                        imageUrl: product.imageUrl
                    });
                }

                freshProfile.pcs = freshProfile.pcs || [];
                freshProfile.pcs.push({
                    name: pcName,
                    components,
                    createdAt: new Date()
                });

                await freshProfile.save();

                const finalCpu = selected.cpu?.product;
                const finalMotherboard = selected.motherboard?.product;
                const cpuCompatibility = checkCpuMotherboardCompatibility(finalCpu, finalMotherboard);
                const ramSelections = Array.isArray(selected.ram) ? selected.ram : [];
                const ramCompatibilityOk = ramSelections.every((ramEntry) =>
                    checkRamMotherboardCompatibility(ramEntry.product, finalMotherboard).ok
                );
                const allCompatOk = cpuCompatibility.ok && ramCompatibilityOk;

                const summaryEmbed = new EmbedBuilder()
                    .setTitle(`PC created: ${pcName}`)
                    .setColor(allCompatOk ? '#00FF99' : '#FF4D4D')
                    .setDescription('Selected components:')
                    .addFields(BUILD_STEPS.map((stepInfo) => {
                        if (stepInfo.category === 'ram') {
                            const value = formatRamSelection(ramSelections);
                            return { name: 'RAM', value: value || 'Not selected', inline: false };
                        }
                        const item = selected[stepInfo.category];
                        const product = item?.product || {};
                        return {
                            name: stepInfo.label,
                            value: `${product.imageUrl ? `${product.imageUrl} ` : ''}${product.name || item?.name || 'N/A'}`,
                            inline: false
                        };
                    }))
                    .setFooter({ text: 'Components were consumed from your inventory. Use /dissasemble-pc to return them.' })
                    .setTimestamp();

                await selectInteraction.update({
                    embeds: [summaryEmbed],
                    components: []
                });
                collector.stop('completed');
                return;
            }

            const nextRow = buildSelectRow();
            if (!nextRow) {
                await selectInteraction.update({
                    content: 'No RAM sticks are available for selection.',
                    embeds: [],
                    components: []
                });
                collector.stop('ram_empty');
                return;
            }

            await selectInteraction.update({
                embeds: [buildProgressEmbed(selected, currentIndex, ramOptionsState)],
                components: [nextRow]
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'completed') return;
            if (message.editable) {
                await message.edit({ components: [] });
            }
            if (reason === 'time') {
                await interaction.followUp({ content: 'Time expired. Run /create-pc again to try again.', ephemeral: true });
            }
        });
    },
};
