const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
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
    } catch (err) {
        console.error('Could not read data/products.json for autocomplete:', err);
        return [];
    }
};

// Carga productos desde JSON; si está vacío, cae a la base de datos.
const loadProducts = async () => {
    const fromJson = await loadProductsFromJson();
    if (fromJson.length) return fromJson;
    try {
        const fromDb = await Product.find().lean();
        return fromDb;
    } catch (err) {
        console.error('Products could not be read from Mongo:', err);
        return [];
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy-item')
        .setDescription('Buy a PC component.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Product name to buy')
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Quantity of product to buy')
                .setRequired(true)
        ),

        async autocomplete({ interaction }) {
            try {
                const focusedOption = interaction.options.getFocused(true);
                if (focusedOption.name !== 'name') return;

                const searchQuery = (focusedOption.value || '').toLowerCase();

                const products = await loadProducts();
                console.log(`[autocomplete /buy-item] query="${searchQuery}" src_count=${products.length}`);

                const filtered = products.filter((p) => {
                    const matchesName = searchQuery
                        ? (p.name || '').toLowerCase().includes(searchQuery)
                        : true;
                    return matchesName;
                });

                const sorted = filtered.slice().sort((a, b) =>
                    (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' })
                );

                const choices = sorted.slice(0, 25).map(product => ({ name: product.name, value: product.name }));
                await interaction.respond(choices);
            } catch (error) {
                console.error('Error en autocomplete /buy-item:', error);
                try { await interaction.respond([]); } catch (_) {}
            }
        },

    async run({ interaction }) {    
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'This command can only be executed within a server.', flags: MessageFlags.Ephemeral });
            return;
        }

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const nameQuery = interaction.options.getString('name');
        const cantidad = interaction.options.getInteger('quantity') || 1;

        console.log(`User: ${userId}, Name(query): ${nameQuery}, Quantity: ${cantidad}`);

        const userProfile = await UserProfile.findOne({ userId, guildId });

        if (!userProfile) {
            await interaction.reply({ content: 'You dont have a registered profile. Register first!', flags: MessageFlags.Ephemeral });
            return;
        }

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const comprar = async (product, replyFn) => {
            const costoTotal = product.price * cantidad;
            if (userProfile.balance < costoTotal) {
                await replyFn({ content: 'You dont have enough money to buy these products.', flags: MessageFlags.Ephemeral });
                return;
            }

            const inventoryItemIndex = userProfile.inventory.findIndex(item => item.name === product.name);

            if (inventoryItemIndex !== -1) {
                userProfile.inventory[inventoryItemIndex].quantity += cantidad;
            } else {
                userProfile.inventory.push({ category: product.category, name: product.name, quantity: cantidad });
            }

            userProfile.balance -= costoTotal;

            await userProfile.save();

            const embed = new EmbedBuilder()
                .setTitle('Successful purchase')
                .setColor(0x00FF00)
                .setDescription(`You have purchased **${cantidad}** ${product.name}(s) for <:pcb:827581416681898014> **${costoTotal}**!`)
                .addFields(
                    { name: 'Product', value: product.name, inline: true },
                    { name: 'Quantity', value: cantidad.toString(), inline: true },
                    { name: 'Total cost', value: `<:pcb:827581416681898014> ${costoTotal}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Thank you for your purchase!' });

            await replyFn({ embeds: [embed] });
        };

        // Intento de compra directa si el nombre coincide exactamente (selección desde autocomplete).
        if (nameQuery) {
            const exact = await Product.findOne({ name: new RegExp(`^${escapeRegex(nameQuery)}$`, 'i') });
            if (exact) {
                await comprar(exact, interaction.reply.bind(interaction));
                return;
            }
        }

        // Buscar productos que coincidan con el texto proporcionado.
        const nameFilter = nameQuery ? { name: new RegExp(nameQuery, 'i') } : {};
        const products = await Product.find(nameFilter).sort({ name: 1 }).limit(10);

        if (!products.length) {
            await interaction.reply({ content: `I found no products that match "${nameQuery}".`, flags: MessageFlags.Ephemeral });
            return;
        }

        const listLines = products.map((product, idx) => `**${idx + 1}.** ${product.imageUrl} ${product.name} — <:pcb:827581416681898014> ${product.price}`);

        const listEmbed = new EmbedBuilder()
            .setTitle('Select a product to buy')
            .setDescription(listLines.join('\n'))
            .setColor(0xFFFFFF)
            .setFooter({ text: 'Enter the product number or "cancel" to cancel.' });

        await interaction.reply({
            content: `I found ${products.length} result(s). Enter the number of the product you want to buy (${cantidad} unit(s)) or "cancel" to cancel.`,
            embeds: [listEmbed],
        });

        const filterMsg = (msg) => msg.author.id === interaction.user.id;
        const collector = interaction.channel?.createMessageCollector({ filter: filterMsg, time: 30_000 });

        if (!collector) {
            await interaction.followUp({ content: 'I was unable to start the message collector. Please try again.', flags: MessageFlags.Ephemeral });
            return;
        }

        collector.on('collect', async (msg) => {
            const content = msg.content.trim().toLowerCase();
            if (content === 'cancel') {
                collector.stop('cancelled');
                await interaction.followUp({ content: 'Purchase cancelled.', flags: MessageFlags.Ephemeral });
                return;
            }

            const choice = parseInt(content, 10);
            if (Number.isNaN(choice) || choice < 1 || choice > products.length) {
                await interaction.followUp({ content: 'Invalid number. Send a number from the list or "cancel".', flags: MessageFlags.Ephemeral });
                return;
            }

            const product = products[choice - 1];
            collector.stop('selected');

            try {
                await comprar(product, interaction.followUp.bind(interaction));
            } catch (error) {
                console.error('Error saving user profile:', error);
                await interaction.followUp({ content: `An error occurred while trying to purchase the product. Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        });

        collector.on('end', async (_collected, reason) => {
            if (reason === 'time') {
                await interaction.followUp({ content: 'Time expired. Enter the command again to purchase.', flags: MessageFlags.Ephemeral });
            }
        });
    },
};
