const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

module.exports = {
    run: async ({ interaction }) => {
        if (!interaction.inGuild()) {
            interaction.reply({
                content: "This command can only be executed within a server.",
                ephemeral: true,
            });
            return;
        }

        const senderUserId = interaction.user.id;
        const recipientUserId = interaction.options.getUser('target-user')?.id;
        const donationAmount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        if (!recipientUserId || donationAmount <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Error')
                .setDescription('Please provide a valid recipient and a positive amount for the donation.')
                .setTimestamp()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.deferReply();

        try {
            // Obtener los perfiles de usuario del remitente y del destinatario.
            let senderProfile = await UserProfile.findOne({ userId: senderUserId, guildId });
            let recipientProfile = await UserProfile.findOne({ userId: recipientUserId, guildId });

            if (!senderProfile) {
                senderProfile = new UserProfile({ userId: senderUserId, guildId, balance: 0 });
            }

            if (!recipientProfile) {
                recipientProfile = new UserProfile({ userId: recipientUserId, guildId, balance: 0 });
            }

            if (senderProfile.balance < donationAmount) {
                const insufficientFundsEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Insufficient balance')
                    .setDescription('You do not have enough funds to make this donation.')
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
                .setTitle('Successful Donation')
                .setDescription(`You have donated <:pcb:827581416681898014> ${donationAmount} to <@${recipientUserId}>.\nYour current balance is <:pcb:827581416681898014> ${senderProfile.balance}.`)
                .setTimestamp()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            console.log(`Error handling /donate: ${error}`);
            await interaction.editReply({
                content: "An error occurred while attempting to make the donation.",
                ephemeral: true,
            });
        }
    },

    data: {
        name: 'donate',
        description: "Make a donation to another user.",
        options: [
            {
                name: 'target-user',
                description: "The user you want to donate to.",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: 'amount',
                description: "The amount to donate.",
                type: ApplicationCommandOptionType.Integer,
                required: true,
            }
        ]
    }
};
