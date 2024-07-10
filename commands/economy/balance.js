const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
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
        const targetUser = interaction.options.getUser('target-user') || interaction.user;

        await interaction.deferReply();

        try {
            let userProfile = await UserProfile.findOne({ userId: targetUserId });

            if (!userProfile) {
                userProfile = new UserProfile({ userId: targetUserId });
            }

            const balanceEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle('Saldo')
                .setDescription(
                    targetUserId === interaction.user.id 
                        ? `Tu saldo es de <:pcb:827581416681898014> ${userProfile.balance}` 
                        : `El saldo de <@${targetUserId}> es de <:pcb:827581416681898014> ${userProfile.balance}`
                )
                .setTimestamp()
                .setAuthor({
                    name: targetUser.username,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                });

            interaction.editReply({ embeds: [balanceEmbed] });
        } catch (error) {
            console.error(`Error handling /balance: ${error}`);
            interaction.editReply({
                content: "Ocurrió un error al obtener el saldo.",
                ephemeral: true,
            });
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
};