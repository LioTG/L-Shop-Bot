const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');
const { Product } = require('../../schemas/Product');
const Category = require('../../schemas/Category');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Compra un componente de PC.')
        .addStringOption(option => option.setName('categoria')
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
        .addStringOption(option => option.setName('nombre')
            .setDescription('Nombre del producto')
            .setRequired(true))
        .addIntegerOption(option => option.setName('cantidad')
            .setDescription('Cantidad del producto a comprar')
            .setRequired(true)),
    async run({ interaction }) {
        const userId = interaction.user.id;
        const categoryId = interaction.options.getString('categoria');
        const name = interaction.options.getString('nombre');
        const cantidad = interaction.options.getInteger('cantidad') || 1; // Por defecto, compra una unidad si no se especifica la cantidad

        // Obtén el perfil del usuario desde la base de datos
        const userProfile = await UserProfile.findOne({ userId: userId });

        if (!userProfile) {
            await interaction.reply('No tienes un perfil registrado. ¡Regístrate primero!');
            return;
        }

        // Obtén el producto desde la base de datos
        const product = await Product.findOne({ name: name });

        if (!product) {
            await interaction.reply(`No existe un producto con el nombre ${name}.`);
            return;
        }

        // Resta el costo total al balance del usuario
        const costoTotal = product.price * cantidad;
        if (userProfile.balance < costoTotal) {
            await interaction.reply('No tienes suficiente dinero para comprar estos productos.');
            return;
        }

        userProfile.balance -= costoTotal;

        // Añade la cantidad de productos al inventario del usuario
        userProfile.inventory[categoryId] += cantidad;

        await userProfile.save();

        await interaction.reply(`Has comprado ${cantidad} ${name}(s) por <:pcb:827581416681898014> ${costoTotal}!`);
    },
};
