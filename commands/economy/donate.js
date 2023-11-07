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

        const senderUserId = interaction.user.id;
        const recipientUserId = interaction.options.getUser('target-user')?.id;
        const donationAmount = interaction.options.getInteger('amount');

        if (!recipientUserId || donationAmount <= 0) {
            interaction.editReply("Por favor, proporciona un destinatario válido y una cantidad positiva para la donación.");
            return;
        }

        await interaction.deferReply();

        try {
            // Obtener los perfiles de usuario del remitente y del destinatario.
            let senderProfile = await UserProfile.findOne({ userId: senderUserId });
            let recipientProfile = await UserProfile.findOne({ userId: recipientUserId });

            if (!senderProfile) {
                senderProfile = new UserProfile({ userId: senderUserId, balance: 0 });
            }

            if (!recipientProfile) {
                recipientProfile = new UserProfile({ userId: recipientUserId, balance: 0 });
            }

            if (senderProfile.balance < donationAmount) {
                interaction.editReply("No tienes suficiente saldo para realizar esta donación.");
                return;
            }

            // Actualizar los saldos de los perfiles de usuario.
            senderProfile.balance -= donationAmount;
            recipientProfile.balance += donationAmount;

            // Guardar los cambios en la base de datos.
            await senderProfile.save();
            await recipientProfile.save();

            interaction.editReply(`Has donado <:pcb:827581416681898014> ${donationAmount} a <@${recipientUserId}>. Tu saldo actual es de <:pcb:827581416681898014> ${senderProfile.balance}.`);
        } catch (error) {
            console.log(`Error handling /donate: ${error}`);
        }
    },

    data: {
        name: 'donate',
        description: "Realiza una donación a otro usuario.",
        options: [
            {
                name: 'target-user',
                description: "El usuario al que quieres donar.",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: 'amount',
                description: "La cantidad a donar.",
                type: ApplicationCommandOptionType.Integer,
                required: true,
            }
        ]
    }
}