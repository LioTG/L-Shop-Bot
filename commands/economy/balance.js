const { ApplicationCommandOptionType } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile'); 

module.exports = {
    run: async ({ interaction }) => {
        if (!interaction.inGuild()) {
            interaction.reply({
                content: "Este comando solo puede ser ejecutado dentro de un servidor.",
                ephemeral: true,
            });
            return;
        }

        const targetUserId = interaction.options.getUser('target-user')?.id || interaction.user.id;

        await interaction.deferReply();

        try {
            let userProfile = await UserProfile.findOne({ userId: targetUserId });

            if(!userProfile) {
                userProfile = new UserProfile({ userId: targetUserId });
            }

            interaction.editReply(
                // Operador ternario
                targetUserId === interaction.user.id ? `Tu saldo es de <:pcb:827581416681898014> ${userProfile.balance}` : `El saldo de <@${targetUserId}> es de <:pcb:827581416681898014> ${userProfile.balance}`
            );
        } catch (error) {
            console.error(`Error handling /balance: ${error}`);
        }
    },

    data: {
        name: 'balance',
        description: "Revisa tu saldo.",
        options: [
            {
                name: 'target-user',
                description: "El usuario cuyo saldo quieres ver.",
                type: ApplicationCommandOptionType.User,
            }
        ]
    }
}