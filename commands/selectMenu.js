const { SlashCommandBuilder } = require('@discordjs/builders');

// Marcado para eliminar el comando antiguo "selectmenu" de Discord.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('selectmenu')
    .setDescription('deprecated'),
  // djs-commander usará esto para borrar el comando registrado.
  deleted: true,
  // Nunca se ejecutará; se requiere para pasar la validación del handler.
  run: async ({ interaction }) => {
    await interaction.reply({ content: 'Este comando está deshabilitado.', ephemeral: true });
  },
};
