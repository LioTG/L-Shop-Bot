const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inv')
        .setDescription('Muestra tu inventario de componentes de PC.'),
    async run({interaction}) {
        const { user } = interaction;

        // Obtén el perfil del usuario desde la base de datos
        const userProfile = await UserProfile.findOne({ userId: user.id });

        if (!userProfile) {
            await interaction.reply('No tienes un perfil registrado. ¡Regístrate primero!');
            return;
        }

        // Accede al campo de inventario del perfil del usuario
        const inventory = userProfile.inventory;

        // Crea un array de fields para mostrar el inventario
        const inventoryFields = [];

        // Agrega cada producto del inventario como un field
        for (const item of inventory) {
            const [productName, quantity] = item.split('-');

            // Puedes personalizar el formato de salida según tus preferencias
            const field = {
                name: `${productName.trim()}`,
                value: `${quantity.trim()}`,
                inline: false,
            };

            inventoryFields.push(field);
        }

        const inventoryEmbed = {
            title: `🎒 Inventario de ${user.tag} 🎒`,
            color: 0xFFFFFF,
            fields: inventoryFields,
        };

        await interaction.reply({ embeds: [inventoryEmbed] });
    },
};

