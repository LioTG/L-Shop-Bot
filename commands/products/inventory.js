const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');
const { EmbedBuilder } = require('discord.js');

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

        // Crea un mensaje embed para mostrar el inventario
        // Puedes personalizar el formato de salida según tus preferencias
        const inventoryEmbed = new EmbedBuilder()
            .setTitle('**🎒 Inventario de Componentes de PC 🎒**')
            .setColor("White");
            inventoryEmbed.setDescription( `
            **Case:** ${inventory.case}
            **Motherboard:** ${inventory.motherboard}
            **Procesador:** ${inventory.cpu}
            **Cooler:** ${inventory.coolers}
            **RAM:** ${inventory.ram}
            **Almacenamiento:** ${inventory.storage}
            **Tarjeta Gráfica:** ${inventory.gpu}
            **Fuente de poder:** ${inventory.psu}
            `),

        await interaction.reply({ embeds: [inventoryEmbed] });
    },
};
