const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Product = require('../../schemas/Product');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Compra componentes de PC.'),
  
  async run({interaction}) {
    const products = await Product.find();

    const shopEmbed = new EmbedBuilder()
      .setTitle('**🛒 Tienda de Componentes de PC 🛒**')
      .setColor("White");

    if(!products.length) {
      shopEmbed.setDescription('La tienda está vacía por el momento');  
    } else {
      products.forEach(product => {
        shopEmbed.addFields({
          name: product.name,
          value: `Precio: ${product.price}`,
          inline: true
        });
      });
    }

    await interaction.reply({ embeds: [shopEmbed] });
  }
}