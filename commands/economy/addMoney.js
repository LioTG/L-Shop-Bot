const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-money')
        .setDescription('Add money to a user - ADMINS ONLY')
        .addUserOption(option => option.setName('user')
            .setDescription('The target user who will receive additional money')
            .setRequired(true))
        .addIntegerOption(option => option.setName('quantity')
            .setDescription('The amount of money to add')
            .setRequired(true)),
    async run({ interaction }) {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: "This command can only be executed within a server.",
                ephemeral: true,
            });
        }

        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('Only administrators can use this command.');
        }

        const user = interaction.options.getUser('user');
        const cantidad = interaction.options.getInteger('quantity');
        const guildId = interaction.guild.id;

        let userProfile = await UserProfile.findOne({ userId: user.id, guildId });

        if (!userProfile) {
            userProfile = new UserProfile({ userId: user.id, guildId });
        }

        userProfile.balance += cantidad;

        await userProfile.save();

        return interaction.reply(`<:pcb:827581416681898014> ${cantidad} was added to ${user.username}'s account. New balance: <:pcb:827581416681898014> ${userProfile.balance}`);
    },
};
