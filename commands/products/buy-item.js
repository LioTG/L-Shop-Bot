const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
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
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Cantidad del producto a comprar')
                .setRequired(true)
        ),
    async autocomplete({ interaction }) {
        const focusedOption = interaction.options.getFocused(true);
    
        if (focusedOption.name === 'nombre') {
            const categoryId = interaction.options.getString('categoria');
            const searchQuery = focusedOption.value;
                
            // Buscar productos basados en la categoría y el texto de búsqueda
            const products = await Product.find({ category: categoryId, name: new RegExp(searchQuery, 'i') }).limit(25);
    
            const choices = products.map(product => ({ name: product.name, value: product.name }));
            await interaction.respond(choices);
        }
    },
    async run({ interaction }) {
        const userId = interaction.user.id;
        const categoryId = interaction.options.getString('categoria');
        const name = interaction.options.getString('nombre');
        const cantidad = interaction.options.getInteger('cantidad') || 1;

        console.log(`Usuario: ${userId}, Categoría: ${categoryId}, Nombre: ${name}, Cantidad: ${cantidad}`);

        const userProfile = await UserProfile.findOne({ userId: userId });

        if (!userProfile) {
            await interaction.reply('No tienes un perfil registrado. ¡Regístrate primero!');
            return;
        }

        const product = await Product.findOne({ name: name });

        if (!product) {
            await interaction.reply(`No existe un producto con el nombre ${name}.`);
            return;
        }

        const costoTotal = product.price * cantidad;
        if (userProfile.balance < costoTotal) {
            await interaction.reply('No tienes suficiente dinero para comprar estos productos.');
            return;
        }

        userProfile.balance -= costoTotal;

        // Encuentra el artículo en el inventario del usuario
        let inventoryItem = userProfile.inventory.find(item => item.name === name);

        if (inventoryItem) {
            // Si el artículo ya existe en el inventario, actualiza la cantidad
            inventoryItem.quantity += cantidad;
        } else {
            // Si el artículo no existe en el inventario, agrégalo
            inventoryItem = { category: categoryId, name: name, quantity: cantidad };
            userProfile.inventory.push(inventoryItem);
        }

        // Verificar que todos los campos estén presentes antes de guardar
        userProfile.inventory = userProfile.inventory.map(item => ({
            category: item.category || categoryId,
            name: item.name || name,
            quantity: item.quantity || cantidad
        }));

        console.log('Inventario actualizado:', userProfile.inventory);

        try {
            await userProfile.save();
            
            const embed = new EmbedBuilder()
                .setTitle('Compra exitosa')
                .setColor(0x00FF00)
                .setDescription(`Has comprado **${cantidad}** ${name}(s) por <:pcb:827581416681898014> **${costoTotal}**!`)
                .addFields(
                    { name: 'Producto', value: name, inline: true },
                    { name: 'Categoría', value: categoryId, inline: true },
                    { name: 'Cantidad', value: cantidad.toString(), inline: true },
                    { name: 'Costo total', value: `<:pcb:827581416681898014> ${costoTotal}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: '¡Gracias por tu compra!' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al guardar el perfil de usuario:', error);
            await interaction.reply(`Ocurrió un error al intentar comprar el producto. Error: ${error.message}`);
        }
    },
};