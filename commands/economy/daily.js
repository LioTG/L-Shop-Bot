const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

const dailyAmount = 100;

module.exports = {
    run: async ({ interaction }) => {
        if (!interaction.inGuild()) {
            interaction.reply({
                content: "This command can only be executed within a server.",
                ephemeral: true,
            });
            return;
        }
        try {
            await interaction.deferReply();

            const guildId = interaction.guild.id;

            let userProfile = await UserProfile.findOne({
                userId: interaction.member.id,
                guildId,
            });

            if (userProfile) {
                const lastDailyDate = userProfile.lastDailyCollected?.toDateString();
                const currentDate = new Date().toDateString();

                if (lastDailyDate === currentDate) {
                    const cooldownEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Daily Reward')
                        .setDescription('You have already claimed your daily reward. Come back tomorrow.')
                        .setTimestamp()
                        .setAuthor({
                            name: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                        });

                    await interaction.editReply({ embeds: [cooldownEmbed] });
                    return;
                }
            } else {
                userProfile = new UserProfile({
                    userId: interaction.member.id,
                    guildId,
                });
            }

            userProfile.balance += dailyAmount;
            userProfile.lastDailyCollected = new Date();

            await userProfile.save();

            const rewardEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Daily Reward')
                .setDescription(`<:pcb:827581416681898014> ${dailyAmount} LioCoins were added to your balance.\nNew balance: <:pcb:827581416681898014> ${userProfile.balance}`)
                .setTimestamp()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ embeds: [rewardEmbed] });

        } catch (error) {
            console.log(`Error handling /daily: ${error}`);
            await interaction.editReply({
                content: "An error occurred while claiming your daily reward.",
                ephemeral: true,
            });
        }
    },

    data: {
        name: 'daily',
        description: 'Claim your daily reward!',
    },
};
