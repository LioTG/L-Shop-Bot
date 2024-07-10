const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inv')
        .setDescription('Muestra tu inventario de componentes de PC.'),
    async run({ interaction }) {
        const { user } = interaction;

        // Obtén el perfil del usuario desde la base de datos
        const userProfile = await UserProfile.findOne({ userId: user.id });

        if (!userProfile) {
            await interaction.reply('No tienes un perfil registrado. ¡Regístrate primero!');
            return;
        }

        // Accede al campo de inventario del perfil del usuario
        const inventory = userProfile.inventory;

        if (!inventory || inventory.length === 0) {
            await interaction.reply('Tu inventario está vacío.');
            return;
        }

        // Agrupa los elementos del inventario por nombre y suma las cantidades
        const groupedInventory = {};
        for (const inventoryItem of inventory) {
            const { name, category, quantity } = inventoryItem;
            if (!groupedInventory[name]) {
                groupedInventory[name] = { category, quantity: 0 };
            }
            groupedInventory[name].quantity += quantity;
        }

        const aggregatedInventory = Object.entries(groupedInventory).map(([name, { category, quantity }]) => ({
            name,
            category,
            quantity,
        }));

        const itemsPerPage = 10;
        const totalItems = aggregatedInventory.reduce((acc, item) => acc + item.quantity, 0);
        const totalPages = Math.ceil(aggregatedInventory.length / itemsPerPage);

        let currentPage = 1;

        const generateEmbed = async (page) => {
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;

            const pageItems = aggregatedInventory.slice(start, end);

            const inventoryEmbed = new EmbedBuilder()
                .setTitle(`🎒 Inventario de ${user.username} 🎒`)
                .setColor(0xFFFFFF);

            for (const item of pageItems) {
                const product = await Product.findOne({ name: item.name });
                if (product) {
                    inventoryEmbed.addFields({
                        name: `${product.imageUrl} ${product.name}`,
                        value: `Cantidad: ${item.quantity}`,
                        inline: false,
                    });
                } else {
                    inventoryEmbed.addFields({
                        name: 'Producto desconocido',
                        value: `Categoría: ${item.category} | Nombre: ${item.name} | Cantidad: ${item.quantity}`,
                        inline: false,
                    });
                }
            }

            inventoryEmbed.setFooter({ text: `Página ${page} de ${totalPages} | Total de ítems: ${totalItems}` });

            return inventoryEmbed;
        };

        const generateButtons = (page) => {
            const actionRow = new ActionRowBuilder();

            if (page > 1) {
                actionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Anterior')
                        .setStyle(ButtonStyle.Primary)
                );
            }

            if (page < totalPages) {
                actionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Siguiente')
                        .setStyle(ButtonStyle.Primary)
                );
            }

            return actionRow;
        };

        const embedMessage = await interaction.reply({
            embeds: [await generateEmbed(currentPage)],
            components: totalPages > 1 ? [generateButtons(currentPage)] : [],
            fetchReply: true
        });

        if (totalPages > 1) {
            const filter = (i) => ['prev', 'next'].includes(i.customId) && i.user.id === user.id;
            const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'prev' && currentPage > 1) {
                    currentPage--;
                } else if (i.customId === 'next' && currentPage < totalPages) {
                    currentPage++;
                }

                await i.update({
                    embeds: [await generateEmbed(currentPage)],
                    components: [generateButtons(currentPage)]
                });
            });

            collector.on('end', async () => {
                if (embedMessage.editable) {
                    await embedMessage.edit({
                        components: []
                    });
                }
            });
        }
    }
};