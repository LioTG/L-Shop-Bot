const {
  ActionRowBuilder,
  SlashCommandBuilder,
} = require("@discordjs/builders");

const { storeComponent } = require("../components/selectMenu");
const { storeEmbed } = require('../components/embedMenu')
module.exports = {
  data: new SlashCommandBuilder()
    .setName("selectmenu")
    .setDescription("Descripcion"),

  async run({ interaction }) {
    const row = new ActionRowBuilder().addComponents(storeComponent);

    await interaction.reply({
      content: "Choose your starter!",
      embeds: storeEmbed,
      components: [row],
    });
  },
};
