const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addproduct')
        .setDescription('Añade un producto a la tienda.'),
    async run({ interaction }) {
    }
}