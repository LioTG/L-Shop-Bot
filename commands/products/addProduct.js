const { SlashCommandBuilder } = require('@discordjs/builders');
const { productSchema } = require('../schemas/Product')

const product = {
    id: '',
    name: '',
    price: 0,
    imageUrl: ''
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addproduct')
        .setDescription('Añade un producto a la tienda.'),
    async run() {
    }
}