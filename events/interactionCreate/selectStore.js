const { ActionRowBuilder } = require("@discordjs/builders");
const { caseStore } = require("../../components/selectMenu");
module.exports = async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "components_store") {
    const category = interaction.values[0];

    const categoryMessage = {
      case: { content: "", embeds: [], components: caseStore },
      motherboard: { content: "", embeds: [], components: [] },
      cpu: { content: "", embeds: [], components: [] },
      cooler: { content: "", embeds: [], components: [] },
      ram: { content: "", embeds: [], components: [] },
      hard_disk: { content: "", embeds: [], components: [] },
      gpu: { content: "", embeds: [], components: [] },
      power_supply: { content: "", embeds: [], components: [] },
    };

    const row = new ActionRowBuilder().addComponents(
      categoryMessage[category].components
    );

    interaction.update({ components: [row] });
  }
  // console.log(interaction);
};
