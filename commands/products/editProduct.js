const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product } = require('../../schemas/Product');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editproduct')
    .setDescription('Edita un producto en la tienda.')
    .addStringOption(option => option.setName('nombre')
      .setDescription('Nombre del producto a editar')
      .setRequired(true))
    .addIntegerOption(option => option.setName('nuevoprecio')
      .setDescription('Nuevo precio del producto')
      .setRequired(true)),

  async run({ interaction }) {
    const name = interaction.options.getString('nombre');
    const newPrice = interaction.options.getInteger('nuevoprecio');

    await interaction.deferReply();

    try {
      const product = await Product.findOneAndUpdate(
        { name: name },
        { $set: { price: newPrice } },
        { new: true }
      );

      if (product) {
        await interaction.editReply({ content: `${name} ha sido editado. Nuevo precio: <:pcb:827581416681898014> ${newPrice}` });
      } else {
        await interaction.editReply({ content: `No se encontró un producto con el nombre ${name}.` });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Hubo un error al intentar editar el producto.' });
    }
  },
};
