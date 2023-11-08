const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Product = require('../../schemas/Product');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Compra componentes de PC.'),

  async run({ interaction }) {
    // const products = await Product.find();
    const products = [
      {
        id: 123213,
        name: 'Producto',
        price: 123,
        image: "<:adobexd:920121777043161088>"
      },
    ]

    const shopEmbed = new EmbedBuilder()
      .setTitle('**🛒 Tienda de Componentes de PC 🛒**')
      .setColor("White");

    if (!products.length) {
      shopEmbed.setDescription('La tienda está vacía por el momento');
    } else {

      for (let i in products) {
        const product = products[i]
        shopEmbed.addFields({
          name: product.name,
          value: `Precio: ${product.image} ${product.price}`,
          inline: true
        })
      }
      await interaction.reply({ embeds: [shopEmbed] });
    }
  }
}