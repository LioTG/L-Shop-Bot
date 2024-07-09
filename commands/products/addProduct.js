const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product } = require('../../schemas/Product')
const Category = require('../../schemas/Category')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-product')
        .setDescription('Añade un producto a la tienda.')
        .addStringOption(option => option.setName('categoria')
            .setDescription('Categoria del producto')
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
        .addStringOption(option => option.setName('emoji')
            .setDescription('ID del emoji')
            .setRequired(true))
        .addIntegerOption(option => option.setName('precio')
            .setDescription('Precio del producto')
            .setRequired(true)),
    async run({ interaction }) {
        const categoryId = interaction.options.getString('categoria')
        const name = interaction.options.getString('nombre')
        const price = interaction.options.getInteger('precio')
        const imageUrl = interaction.options.getString('emoji');

        await interaction.deferReply();

        var product = await Product.findOne({ name: name })

        if (!product) {
            product = new Product({ id: Math.floor(Math.random() * 1000) + 1, name: name, price: price, imageUrl: imageUrl })

            var category = await Category.findOne({ name: categoryId })
            if (!category) {
                category = new Category({ id: Math.floor(Math.random() * 1000) + 1000, name: categoryId, products: [] })
            }

            await Category.updateOne({ name: categoryId }, { $push: { products: product } });
            await category.save();
            await product.save();
            await interaction.editReply({ content: `${imageUrl} ${name} de la categoría ${categoryId} ha sido creado con un precio de <:pcb:827581416681898014> ${price}` })
        }
        else {
            await interaction.editReply({
                content: "Ya existe un producto con ese nombre"
            })
        }
    }
}
