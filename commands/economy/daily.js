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
                    interaction.editReply("Ya has reclamado tu recompensa diaria. Vuelve mañana.");
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

          interaction.editReply(
            `<:pcb:827581416681898014> ${dailyAmount} LioCoins fueron añadidos a tu saldo.\nNuevo saldo: <:pcb:827581416681898014> ${userProfile.balance}`
          );

        } catch (error) {
            console.log(`Error handling /daily: ${error}`);
        }
    },

    data: {
        name: 'daily',
        description: 'Reclama tu recompensa diaria!',
    },
};