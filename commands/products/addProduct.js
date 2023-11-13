const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product } = require('../../schemas/Product')
const Category = require('../../schemas/Category')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addproduct')
        .setDescription('Añade un producto a la tienda.')
        .addStringOption(option => option.setName('categoria')
            .setDescription('Categoria del producto')
            .setRequired(true)
            .addChoices({ name: 'Cases', value: 'cases' },))
        .addStringOption(option => option.setName('nombre')
            .setDescription('Nombre del producto')
            .setRequired(true))
        .addIntegerOption(option => option.setName('precio')
            .setDescription('Precio del producto')
            .setRequired(true)),
    async run({ interaction }) {
        const categoryId = interaction.options.getString('categoria')
        const name = interaction.options.getString('nombre')
        const price = interaction.options.getInteger('precio');

        await interaction.deferReply();

        var product = await Product.findOne({ name: name })

        if (!product) {
            product = new Product({ id: Math.floor(Math.random() * 1000) + 1, name: name, price: price })

            var category = await Category.findOne({ name: categoryId })
            if (!!category) {
                category = new Category({ id: Math.floor(Math.random() * 1000) + 1000, name: "Cases" })
            }
            const products = Category.find().select('products')
            Category.updateOne({ name: name }, { $set: { products: [...products, product]} })
            await category.save();
            await product.save();
            await interaction.editReply({ content: `${name} - ${category} ha sido creado con un precio de <:pcb:827581416681898014> ${price}` })
        }
        else {
            await interaction.editReply({
                content: "Ya existe un producto con ese nombre"
            })
        }

    }
}