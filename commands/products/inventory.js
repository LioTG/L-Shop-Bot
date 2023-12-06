const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inv')
        .setDescription('Muestra tu inventario de componentes de PC.'),
    async run({ interaction }) {
        const { user } = interaction;

        // Obtén el perfil del usuario desde la base de datos
        const userProfile = await UserProfile.findOne({ userId: user.id });

        if (!userProfile) {
            await interaction.reply('No tienes un perfil registrado. ¡Regístrate primero!');
            return;
        }

        // Accede al campo de inventario del perfil del usuario
        const inventory = userProfile.inventory;

        // Crea un mensaje embed para mostrar el inventario
        const inventoryEmbed = new EmbedBuilder()
            .setTitle(`🎒 Inventario de @${user.username} 🎒`)
            .setColor(0xFFFFFF);

        // Itera sobre las entradas del objeto inventory y agrega cada elemento al embed con el formato deseado
        for (const inventoryItem of inventory) {
            // Separa la información del producto
            const [imageUrl, name, quantity] = inventoryItem.split('-');
            
            // Agrega un campo al embed con la información formateada
            inventoryEmbed.addFields({
                name: `**${imageUrl}** - ${name}`,
                value: `Cantidad: ${quantity}`,
                inline: false,
            });
        }

        await interaction.reply({ embeds: [inventoryEmbed] });
    },
};

