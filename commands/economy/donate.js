const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
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
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Error')
                .setDescription('Por favor, proporciona un destinatario válido y una cantidad positiva para la donación.')
                .setTimestamp()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ embeds: [errorEmbed] });
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
                const insufficientFundsEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Saldo insuficiente')
                    .setDescription('No tienes suficiente saldo para realizar esta donación.')
                    .setTimestamp()
                    .setAuthor({
                        name: interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    });

                await interaction.editReply({ embeds: [insufficientFundsEmbed] });
                return;
            }

            // Actualizar los saldos de los perfiles de usuario.
            senderProfile.balance -= donationAmount;
            recipientProfile.balance += donationAmount;

            // Guardar los cambios en la base de datos.
            await senderProfile.save();
            await recipientProfile.save();

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Donación Exitosa')
                .setDescription(`Has donado <:pcb:827581416681898014> ${donationAmount} a <@${recipientUserId}>.\nTu saldo actual es de <:pcb:827581416681898014> ${senderProfile.balance}.`)
                .setTimestamp()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            console.log(`Error handling /donate: ${error}`);
            await interaction.editReply({
                content: "Ocurrió un error al intentar realizar la donación.",
                ephemeral: true,
            });
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
};