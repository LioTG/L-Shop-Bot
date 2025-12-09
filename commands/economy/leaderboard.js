const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

const LEADERBOARD_PAGE_SIZE = 10;

const formatRankLabel = (position) => {
    if (position === 1) return '1st place';
    if (position === 2) return '2nd place';
    if (position === 3) return '3rd place';
    return `#${position}`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('It shows the ranking of users by balance.'),

    async run({ interaction }) {
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: "This command can only be executed within a server.",
                ephemeral: true,
            });
            return;
        }

        try {
            await interaction.deferReply();

            const guildId = interaction.guild.id;

            const [members, totalProfiles, userProfile] = await Promise.all([
                UserProfile.find({ guildId }).sort({ balance: -1 }).limit(50).lean(),
                UserProfile.countDocuments({ guildId }),
                UserProfile.findOne({ userId: interaction.user.id, guildId }).select('balance userId guildId').lean(),
            ]);

            if (!members.length) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFFFFF')
                            .setAuthor({ name: 'Leaderboard', iconURL: 'https://cdn-icons-png.flaticon.com/512/3150/3150115.png' })
                            .setDescription('No players have earned currency yet. Use `/work` to be the first!')
                            .setTimestamp()
                    ]
                });
                return;
            }

            const userRanking = userProfile
                ? (await UserProfile.countDocuments({ guildId, balance: { $gt: userProfile.balance } })) + 1
                : null;

            let currentPage = 0;
            const totalPages = Math.max(1, Math.ceil(members.length / LEADERBOARD_PAGE_SIZE));

            const generateEmbed = async (page) => {
                const start = page * LEADERBOARD_PAGE_SIZE;
                const end = start + LEADERBOARD_PAGE_SIZE;
                const currentMembers = members.slice(start, end);

                const leaderboardEmbed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setAuthor({ name: 'Leaderboard', iconURL: 'https://cdn-icons-png.flaticon.com/512/3150/3150115.png' })
                    .setTimestamp();

                for (let i = 0; i < currentMembers.length; i++) {
                    const member = currentMembers[i];
                    const position = start + i + 1;
                    const user = await interaction.guild.members.fetch(member.userId).catch(() => null);
                    const displayName = user ? user.user.username : 'Unknown user';

                    leaderboardEmbed.addFields({
                        name: `${formatRankLabel(position)} - ${displayName}`,
                        value: `Balance: <:pcb:827581416681898014> ${member.balance}`,
                    });
                }

                if (userRanking && (userRanking <= start || userRanking > end)) {
                    leaderboardEmbed.addFields({
                        name: 'Your position',
                        value: `${formatRankLabel(userRanking)} - ${interaction.user.username}\nBalance: <:pcb:827581416681898014> ${userProfile.balance}`,
                    });
                }

                leaderboardEmbed.setFooter({
                    text: `Page ${page + 1}/${totalPages} | Players: ${totalProfiles} | Your rank: ${userRanking || 'N/A'}`
                });

                return leaderboardEmbed;
            };

            const generateButtons = (page) => {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page + 1 >= totalPages)
                );

                return row;
            };

            const initialEmbed = await generateEmbed(currentPage);
            const buttons = generateButtons(currentPage);

            const message = await interaction.editReply({
                embeds: [initialEmbed],
                components: [buttons],
                fetchReply: true,
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'previous') {
                    currentPage--;
                } else if (i.customId === 'next') {
                    currentPage++;
                }

                await i.update({
                    embeds: [await generateEmbed(currentPage)],
                    components: [generateButtons(currentPage)],
                });
            });

        } catch (error) {
            console.error(`Error handling /leaderboard: ${error}`);
            await interaction.followUp({
                content: 'An error occurred while displaying the leaderboard.',
                ephemeral: true,
            });
        }
    },
};
