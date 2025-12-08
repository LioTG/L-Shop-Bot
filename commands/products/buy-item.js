const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy-item')
        .setDescription('Compra un componente de PC.')
        .addStringOption(option =>
            option.setName('categoria')
                .setDescription('Categoría del producto')
                .setRequired(true)
                .addChoices(
                    { name: 'Cases', value: 'cases' },
                    { name: 'Motherboards', value: 'motherboard' },
                    { name: 'Procesadores', value: 'cpu' },
                    { name: 'Coolers', value: 'cooler' },
                    { name: 'RAM', value: 'ram' },
                    { name: 'Almacenamiento', value: 'storage' },
                    { name: 'Tarjetas Gráficas', value: 'gpu' },
                    { name: 'Fuente de poder', value: 'psu' },
                ))
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('Nombre del producto')
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Cantidad del producto a comprar')
                .setRequired(true)
        ),

        async autocomplete({ interaction }) {
            try {
                const focusedOption = interaction.options.getFocused(true);
                if (focusedOption.name !== 'nombre') return;

                const categoryId = interaction.options.getString('categoria');
                const searchQuery = focusedOption.value || '';

                const nameFilter = searchQuery ? { name: new RegExp(searchQuery, 'i') } : {};
                const filter = categoryId ? { ...nameFilter, category: categoryId } : nameFilter;

                let products = await Product.find(filter).limit(25);

                // Si no hay resultados en la categoría elegida, intenta sin categoría para dar alguna sugerencia.
                if (!products.length && categoryId) {
                    products = await Product.find(nameFilter).limit(25);
                }

                const choices = products.map(product => ({ name: product.name, value: product.name }));
                await interaction.respond(choices);
            } catch (error) {
                console.error('Error en autocomplete /buy-item:', error);
            }
        },

    async run({ interaction }) {    
        const userId = interaction.user.id;
        const categoryId = interaction.options.getString('categoria');
        const nameQuery = interaction.options.getString('nombre');
        const cantidad = interaction.options.getInteger('cantidad') || 1;

        console.log(`Usuario: ${userId}, Categoría: ${categoryId}, Nombre(query): ${nameQuery}, Cantidad: ${cantidad}`);

        const userProfile = await UserProfile.findOne({ userId: userId });

        if (!userProfile) {
            await interaction.reply({ content: 'No tienes un perfil registrado. ¡Regístrate primero!', flags: MessageFlags.Ephemeral });
            return;
        }

        // Buscar productos que coincidan con la categoría y el texto proporcionado.
        const nameFilter = nameQuery ? { name: new RegExp(nameQuery, 'i') } : {};
        const filter = categoryId ? { ...nameFilter, category: categoryId } : nameFilter;

        const products = await Product.find(filter).sort({ name: 1 }).limit(10);

        if (!products.length) {
            await interaction.reply({ content: `No encontré productos que coincidan con "${nameQuery}" en la categoría "${categoryId}".`, flags: MessageFlags.Ephemeral });
            return;
        }

        const listLines = products.map((product, idx) => `**${idx + 1}.** ${product.imageUrl} ${product.name} — <:pcb:827581416681898014> ${product.price}`);

        const listEmbed = new EmbedBuilder()
            .setTitle('Selecciona un producto')
            .setDescription(listLines.join('\n'))
            .setColor(0xFFFFFF)
            .setFooter({ text: 'Escribe el número del producto o "cancel" para cancelar.' });

        await interaction.reply({
            content: `Encontré ${products.length} resultado(s). Escribe el número del producto que quieres comprar (${cantidad} unidad(es)) o "cancel" para cancelar.`,
            embeds: [listEmbed],
        });

        const filterMsg = (msg) => msg.author.id === interaction.user.id;
        const collector = interaction.channel?.createMessageCollector({ filter: filterMsg, time: 30_000 });

        if (!collector) {
            await interaction.followUp({ content: 'No pude iniciar el colector de mensajes. Intenta de nuevo.', flags: MessageFlags.Ephemeral });
            return;
        }

        collector.on('collect', async (msg) => {
            const content = msg.content.trim().toLowerCase();
            if (content === 'cancel') {
                collector.stop('cancelled');
                await interaction.followUp({ content: 'Compra cancelada.', flags: MessageFlags.Ephemeral });
                return;
            }

            const choice = parseInt(content, 10);
            if (Number.isNaN(choice) || choice < 1 || choice > products.length) {
                await interaction.followUp({ content: 'Número inválido. Envía un número de la lista o "cancel".', flags: MessageFlags.Ephemeral });
                return;
            }

            const product = products[choice - 1];
            collector.stop('selected');

            const costoTotal = product.price * cantidad;
            if (userProfile.balance < costoTotal) {
                await interaction.followUp({ content: 'No tienes suficiente dinero para comprar estos productos.', flags: MessageFlags.Ephemeral });
                return;
            }

            const inventoryItemIndex = userProfile.inventory.findIndex(item => item.name === product.name);

            try {
                if (inventoryItemIndex !== -1) {
                    userProfile.inventory[inventoryItemIndex].quantity += cantidad;
                } else {
                    userProfile.inventory.push({ category: product.category, name: product.name, quantity: cantidad });
                }

                userProfile.balance -= costoTotal;

                await userProfile.save();

                const embed = new EmbedBuilder()
                    .setTitle('Compra exitosa')
                    .setColor(0x00FF00)
                    .setDescription(`Has comprado **${cantidad}** ${product.name}(s) por <:pcb:827581416681898014> **${costoTotal}**!`)
                    .addFields(
                        { name: 'Producto', value: product.name, inline: true },
                        { name: 'Cantidad', value: cantidad.toString(), inline: true },
                        { name: 'Costo total', value: `<:pcb:827581416681898014> ${costoTotal}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: '¡Gracias por tu compra!' });

                await interaction.followUp({ embeds: [embed] });
            } catch (error) {
                console.error('Error al guardar el perfil de usuario:', error);
                await interaction.followUp({ content: `Ocurrió un error al intentar comprar el producto. Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        });

        collector.on('end', async (_collected, reason) => {
            if (reason === 'time') {
                await interaction.followUp({ content: 'Tiempo agotado. Escribe el comando nuevamente para comprar.', flags: MessageFlags.Ephemeral });
            }
        });
    },
};
