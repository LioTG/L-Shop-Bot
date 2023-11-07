const { SlashCommandBuilder } = require('@discordjs/builders');
const UserProfile = require('../../schemas/UserProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Muestra el ranking de usuarios por saldo.'),

    async run(interaction) {
        const members = await UserProfile.find().sort({ balance: -1 }).limit(10);
        const leaderboardEmbed = createLeaderboardEmbed(members);
        await interaction.reply({ embeds: [leaderboardEmbed] });
    },
};