const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Cooldown = require('../../schemas/Cooldown');
const UserProfile = require('../../schemas/UserProfile');

function getRandomNumber(x, y) {
    const range = y - x + 1;
    const randomNumber = Math.floor(Math.random() * range);
    return randomNumber + x;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabaja para tener dinero extra.'),

    run: async ({ interaction }) => {
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: "Este comando solo puede ser ejecutado dentro de un servidor.",
                ephemeral: true,
            });
            return;
        }

        try {
            await interaction.deferReply();

            const commandName = 'work';
            const userId = interaction.user.id;

            let cooldown = await Cooldown.findOne({ userId, commandName });

            if (cooldown && Date.now() < cooldown.endsAt) {
                const { default: prettyMs } = await import('pretty-ms');

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('Cooldown')
                            .setDescription(`No puedes trabajar por ${prettyMs(cooldown.endsAt - Date.now())}`)
                            .setTimestamp()
                            .setAuthor({
                                name: interaction.user.username,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            })
                    ]
                });
                return;
            }

            if (!cooldown) {
                cooldown = new Cooldown({ userId, commandName });
            }

            const amount = getRandomNumber(30, 80);

            let userProfile = await UserProfile.findOne({ userId }).select('userId balance');

            if (!userProfile) {
                userProfile = new UserProfile({ userId });
            }

            userProfile.balance += amount;
            cooldown.endsAt = Date.now() + 300_000;

            await Promise.all([cooldown.save(), userProfile.save()]);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Trabajo completado!')
                        .setDescription(`Obtuviste <:pcb:827581416681898014> ${amount}!\nNuevo saldo: <:pcb:827581416681898014> ${userProfile.balance}`)
                        .setTimestamp()
                        .setAuthor({
                            name: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                        })
                ]
            });
        } catch (error) {
            console.log(`Error handling /work: ${error}`);
        }
    }
};