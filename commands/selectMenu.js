const {
  ActionRowBuilder,
  SlashCommandBuilder,
} = require("@discordjs/builders");

const { menuStore } = require("../components/selectMenu");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("selectmenu")
    .setDescription("Descripcion"),

  async run({ interaction }) {
    const row = new ActionRowBuilder().addComponents(menuStore);

    await interaction.reply({
      content: "Choose your starter!",
      embeds: [
        {
          type: "rich",
          title: `🛒 Tienda de Componentes de PC 🛒`,
          description: `Aquí encontrarás variedad de componentes para PC con los que podrás armar con el comando /createpc`,
          color: 0xffffff,
          fields: [
            {
              name: `AMD Ryzen 9 5900X`,
              value: `Precio: 💸2000`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
            {
              name: `AMD Ryzen 9 5950X`,
              value: `Precio: 💸2200`,
              inline: true,
            },
          ],
        },
      ],
      components: [row],
    });
  },
};
