const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
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

        const targetUserId = interaction.options.getUser('target-user')?.id || interaction.user.id;
        const targetUser = interaction.options.getUser('target-user') || interaction.user;
        const guildId = interaction.guild.id;

        await interaction.deferReply();

        try {
            let userProfile = await UserProfile.findOne({ userId: targetUserId, guildId });

            if (!userProfile) {
                userProfile = new UserProfile({ userId: targetUserId, guildId });
            }

            const balanceEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle('Balance')
                .setDescription(
                    targetUserId === interaction.user.id 
                        ? `Your balance is <:pcb:827581416681898014> ${userProfile.balance}` 
                        : `The balance of <@${targetUserId}> is <:pcb:827581416681898014> ${userProfile.balance}`
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
                content: "An error occurred while retrieving the balance.",
                ephemeral: true,
            });
        }
    },

    data: {
        name: 'balance',
        description: "Check your balance.",
        options: [
            {
                name: 'target-user',
                description: "The user whose balance you want to see.",
                type: ApplicationCommandOptionType.User,
            }
        ]
    }
};
