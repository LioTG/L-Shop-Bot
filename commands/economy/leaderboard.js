const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

const LEADERBOARD_PAGE_SIZE = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Muestra el ranking de usuarios por saldo.'),

    async run({ interaction }) {
        try {
            await interaction.deferReply();

            const members = await UserProfile.find().sort({ balance: -1 }).limit(50); // Adjust limit as needed
            let currentPage = 0;

            const userIndex = members.findIndex(member => member.userId === interaction.user.id);
            const userRanking = userIndex !== -1 ? `${userIndex + 1}th` : 'No rank';

            const generateEmbed = async (page) => {
                const start = page * LEADERBOARD_PAGE_SIZE;
                const end = start + LEADERBOARD_PAGE_SIZE;
                const currentMembers = members.slice(start, end);

                const leaderboardEmbed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setAuthor({ name: `Leaderboard`, iconURL: `https://cdn-icons-png.flaticon.com/512/3150/3150115.png`})
                    .setTimestamp();

                for (let i = 0; i < currentMembers.length; i++) {
                    const member = currentMembers[i];
                    const user = await interaction.guild.members.fetch(member.userId).catch(() => null);

                    if (user) {
                        leaderboardEmbed.addFields({
                            name: `${start + i + 1}. ${user.user.username}`,
                            value: `Saldo: <:pcb:827581416681898014> ${member.balance}`,
                        });
                    } else {
                        leaderboardEmbed.addFields({
                            name: `${start + i + 1}. Usuario desconocido`,
                            value: `Saldo: <:pcb:827581416681898014> ${member.balance}`,
                        });
                    }
                }

                leaderboardEmbed.setFooter({ text: `Page ${page + 1}/${Math.ceil(members.length / LEADERBOARD_PAGE_SIZE)}  •  Tu ranking es: ${userRanking}` });

                return leaderboardEmbed;
            };

            const generateButtons = (page) => {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Anterior')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Siguiente')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled((page + 1) * LEADERBOARD_PAGE_SIZE >= members.length)
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
                content: 'Ocurrió un error al mostrar la leaderboard.',
                ephemeral: true,
            });
        }
    },
};