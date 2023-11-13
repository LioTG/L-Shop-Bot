const { ActionRowBuilder } = require("@discordjs/builders");
const { component, embed } = require('../../components/case')
module.exports = async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "components_store") {
    const category = interaction.values[0];
    
    const row = new ActionRowBuilder().addComponents(component);
    const categoryMessage = {
      case: { content: "", embeds: [embed], components: [row]},
      motherboard: { content: "", embeds: [], components: [] },
      cpu: { content: "", embeds: [], components: [] },
      cooler: { content: "", embeds: [], components: [] },
      ram: { content: "", embeds: [], components: [] },
      hard_disk: { content: "", embeds: [], components: [] },
      gpu: { content: "", embeds: [], components: [] },
      power_supply: { content: "", embeds: [], components: [] },
    };


    interaction.update(categoryMessage[category]);
  }
  // console.log(interaction);
};
