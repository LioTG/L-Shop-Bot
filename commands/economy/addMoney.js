const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../schemas/UserProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-money')
        .setDescription('Añade dinero a un usuario.')
        .addUserOption(option => option.setName('usuario')
            .setDescription('El usuario al que se le añadirá dinero')
            .setRequired(true))
        .addIntegerOption(option => option.setName('cantidad')
            .setDescription('La cantidad de dinero a añadir')
            .setRequired(true)),
    async run({ interaction }) {
        // Verifica si el usuario que ejecuta el comando es un administrador
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('Solo los administradores pueden usar este comando.');
        }

        // Obtén el usuario y la cantidad desde las opciones
        const user = interaction.options.getUser('usuario');
        const cantidad = interaction.options.getInteger('cantidad');

        // Obtén el perfil del usuario desde la base de datos
        const userProfile = await UserProfile.findOne({ userId: user.id });

        if (!userProfile) {
            return interaction.reply(`No se encontró un perfil para el usuario ${user.username}.`);
        }

        // Añade la cantidad de dinero al balance del usuario
        userProfile.balance += cantidad;

        await userProfile.save();

        return interaction.reply(`Se añadieron <:pcb:827581416681898014> ${cantidad} a la cuenta de ${user.username}. Nuevo saldo: <:pcb:827581416681898014> ${userProfile.balance}`);
    },
};
