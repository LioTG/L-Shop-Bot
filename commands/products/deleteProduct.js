const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product } = require('../../schemas/Product');
const { Category } = require('../../schemas/Category');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-product')
    .setDescription('Elimina un producto de la tienda.')
    .addStringOption(option => option.setName('nombre')
      .setDescription('Nombre del producto a eliminar')
      .setRequired(true)),

  async run({ interaction }) {
    const name = interaction.options.getString('nombre');

    await interaction.deferReply();

    try {
      const product = await Product.findOneAndDelete({ name: name });

      if (product) {
        const category = await Category.findOneAndUpdate(
          { name: product.category },
          { $pull: { products: product._id } },
          { new: true }
        );

        if (category) {
          await category.save();
        }
        await interaction.editReply({ content: `${name} ha sido eliminado de la tienda.` });
      } else {
        await interaction.editReply({ content: `No se encontró un producto con el nombre ${name}.` });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Hubo un error al intentar eliminar el producto.' });
    }
  },
};
