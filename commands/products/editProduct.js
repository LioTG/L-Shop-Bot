const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product } = require('../../schemas/Product');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-product')
    .setDescription('Edit a product in the store.')
    .addStringOption(option => option.setName('nombre')
      .setDescription('Product name to edit')
      .setRequired(true))
    .addIntegerOption(option => option.setName('nuevoprecio')
      .setDescription('New product price')
      .setRequired(true))
    .addStringOption(option => option.setName('socket')
      .setDescription('New socket (CPU/Motherboard only)')
      .setRequired(false))
    .addStringOption(option => option.setName('ramtype')
      .setDescription('New RAM type (RAM/Motherboard only)')
      .setRequired(false))
    .addIntegerOption(option => option.setName('ramslots')
      .setDescription('New RAM slots (Motherboard only)')
      .setRequired(false)),

  async run({ interaction }) {
    const name = interaction.options.getString('nombre');
    const newPrice = interaction.options.getInteger('nuevoprecio');
    const socketRaw = interaction.options.getString('socket');
    const ramTypeRaw = interaction.options.getString('ramtype');
    const ramSlotsRaw = interaction.options.getInteger('ramslots');
    const socket = socketRaw ? socketRaw.toUpperCase() : undefined;
    const ramType = ramTypeRaw ? ramTypeRaw.toUpperCase() : undefined;
    const ramSlots = Number.isFinite(ramSlotsRaw) ? ramSlotsRaw : undefined;

    await interaction.deferReply();

    try {
      const setData = { price: newPrice };
      if (socket) {
        setData.socket = socket;
      }
      if (ramType) {
        setData.ramType = ramType;
      }
      if (ramSlots !== undefined) {
        setData.ramSlots = ramSlots;
      }

      const product = await Product.findOneAndUpdate(
        { name: name },
        { $set: setData },
        { new: true }
      );

      if (product) {
        const socketMsg = socket ? ` | Socket: ${socket}` : '';
        const ramMsg = ramType ? ` | RAM: ${ramType}` : '';
        const slotsMsg = ramSlots !== undefined ? ` | RAM slots: ${ramSlots}` : '';
        await interaction.editReply({ content: `${name} updated. New price: <:pcb:827581416681898014> ${newPrice}${socketMsg}${ramMsg}${slotsMsg}` });
      } else {
        await interaction.editReply({ content: `No product found with name ${name}.`, ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'There was an error while editing the product.', ephemeral: true });
    }
  },
};
