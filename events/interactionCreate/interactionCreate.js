const { InteractionType } = require("discord.js");

// djs-commander ya gestiona slash commands (isChatInputCommand).
// Aquí solo manejamos autocomplete y, si existieran, context menus.
module.exports = async (interaction, client, handler) => {
    // Autocompletado de slash commands
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        console.log(`[autocomplete] ${interaction.commandName} focused:`, interaction.options.getFocused(true));
        const command = handler.commands.find((cmd) => cmd.name === interaction.commandName);
        if (!command || typeof command.autocomplete !== "function") return;

        try {
            await command.autocomplete({ interaction, client });
        } catch (error) {
            console.error("Error en autocomplete:", error);
        }
        return;
    }

    // Context menu commands (user/message) si algún día los agregas
    if (interaction.isContextMenuCommand && interaction.isContextMenuCommand()) {
        const command = handler.commands.find((cmd) => cmd.name === interaction.commandName);
        if (!command || typeof command.run !== "function") return;

        try {
            await command.run({ interaction, client, handler });
        } catch (error) {
            console.error("Error ejecutando context menu:", error);
        }
    }
};
