const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

const dailyAmount = 100;

module.exports = {
    run: async ({ interaction }) => {
        if (!interaction.inGuild()) {
            interaction.reply({
                content: "Este comando solo puede ser ejecutado dentro de un servidor.",
                ephemeral: true,
            });
            return;
        }
        try {
            await interaction.deferReply();

            let userProfile = await UserProfile.findOne({
                userId: interaction.member.id,
            });

            if (userProfile) {
                const lastDailyDate = userProfile.lastDailyCollected?.toDateString();
                const currentDate = new Date().toDateString();

                if (lastDailyDate === currentDate) {
                    const cooldownEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Recompensa Diaria')
                        .setDescription('Ya has reclamado tu recompensa diaria. Vuelve mañana.')
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
                });
            }

            userProfile.balance += dailyAmount;
            userProfile.lastDailyCollected = new Date();

            await userProfile.save();

            const rewardEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Recompensa Diaria')
                .setDescription(`<:pcb:827581416681898014> ${dailyAmount} LioCoins fueron añadidos a tu saldo.\nNuevo saldo: <:pcb:827581416681898014> ${userProfile.balance}`)
                .setTimestamp()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ embeds: [rewardEmbed] });

        } catch (error) {
            console.log(`Error handling /daily: ${error}`);
            await interaction.editReply({
                content: "Ocurrió un error al reclamar tu recompensa diaria.",
                ephemeral: true,
            });
        }
    },

    data: {
        name: 'daily',
        description: 'Reclama tu recompensa diaria!',
    },
};