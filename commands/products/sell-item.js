const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell-item')
        .setDescription('Vende un componente de PC del inventario.')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('Nombre del producto a vender')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Cantidad del producto a vender')
                .setRequired(true)
        ),
    async run({ interaction }) {
        const userId = interaction.user.id;
        const name = interaction.options.getString('nombre');
        const cantidad = interaction.options.getInteger('cantidad') || 1;

        console.log(`Usuario: ${userId}, Nombre: ${name}, Cantidad: ${cantidad}`);

        const userProfile = await UserProfile.findOne({ userId: userId });

        if (!userProfile) {
            await interaction.reply('No tienes un perfil registrado. ¡Regístrate primero!');
            return;
        }

        // Buscar el artículo en el inventario del usuario
        let inventoryItem = userProfile.inventory.find(item => item.name === name);

        if (!inventoryItem || inventoryItem.quantity < cantidad) {
            await interaction.reply(`No tienes suficientes ${name}(s) en tu inventario.`);
            return;
        }

        // Encontrar el producto en la base de datos para obtener su precio
        const product = await Product.findOne({ name: name });

        if (!product) {
            await interaction.reply(`No se encontró información del producto ${name}.`);
            return;
        }

        const ventaTotal = Math.round(product.price * 0.6 * cantidad); // El usuario obtiene el 60% del precio original por cada unidad vendida

        // Actualizar el balance del usuario
        userProfile.balance += ventaTotal;

        // Actualizar el inventario del usuario
        inventoryItem.quantity -= cantidad;
        if (inventoryItem.quantity === 0) {
            userProfile.inventory = userProfile.inventory.filter(item => item.name !== name);
        }

        try {
            await userProfile.save();

            // Crear un mensaje embed para mostrar la información de la venta
            const sellEmbed = new EmbedBuilder()
                .setTitle(`Venta de ${cantidad} ${name}(s)`)
                .setColor('#00ff00')
                .setDescription(`Has vendido ${cantidad} ${name}(s) por <:pcb:827581416681898014> ${ventaTotal}!`);

            await interaction.reply({ embeds: [sellEmbed] });
        } catch (error) {
            console.error('Error al guardar el perfil de usuario:', error);
            await interaction.reply(`Ocurrió un error al intentar vender el producto. Error: ${error.message}`);
        }
    },
};