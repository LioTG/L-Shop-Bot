const { EmbedBuilder } = require('discord.js');
const Cooldown = require('../../schemas/Cooldown');
const UserProfile = require('../../schemas/UserProfile');

function getRandomNumber(x, y) {
    const range = y - x + 1;
    const randomNumber = Math.floor(Math.random() * range);
    return randomNumber + x;
}

module.exports = {
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

            const commandName = 'crime';
            const userId = interaction.user.id;

            let cooldown = await Cooldown.findOne({ userId, commandName });

            if (cooldown && Date.now() < cooldown.endsAt) {
                const { default: prettyMs } = await import('pretty-ms');

                const cooldownEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Cooldown')
                    .setDescription(`No puedes cometer un crimen por ${prettyMs(cooldown.endsAt - Date.now())}`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [cooldownEmbed] });
                return;
            }

            if(!cooldown) {
                cooldown = new Cooldown({ userId, commandName });
            }

            const success = Math.random() < 0.5; // 50% de probabilidad de éxito
            let message = '';
            let color = '';
            let title = '';

            if (success) {
                const amount = getRandomNumber(200, 300);
                let userProfile = await UserProfile.findOne({ userId }).select('userId balance');

                if (!userProfile) {
                    userProfile = new UserProfile({ userId });
                }

                userProfile.balance += amount;
                cooldown.endsAt = Date.now() + 300_000;

                await Promise.all([cooldown.save(), userProfile.save()]);

                message = `¡Has tenido éxito en el crimen y obtuviste <:pcb:827581416681898014> ${amount}!\nNuevo saldo: <:pcb:827581416681898014> ${userProfile.balance}`;
                color = '#00FF00';
                title = 'Éxito';
            } else {
                const lossAmount = getRandomNumber(200, 250);
                let userProfile = await UserProfile.findOne({ userId }).select('userId balance');

                if (!userProfile) {
                    userProfile = new UserProfile({ userId });
                }

                userProfile.balance -= lossAmount;
                cooldown.endsAt = Date.now() + 300_000;

                await Promise.all([cooldown.save(), userProfile.save()]);

                message = `¡Has sido atrapado en el crimen y has perdido <:pcb:827581416681898014> ${lossAmount}!\nNuevo saldo: <:pcb:827581416681898014> ${userProfile.balance}`;
                color = '#FF0000';
                title = 'Fallo';
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(message)
                .setTimestamp()
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.log(`Error handling /crime: ${error}`);
            await interaction.editReply({
                content: "Ocurrió un error al intentar cometer el crimen.",
                ephemeral: true,
            });
        }
    },

    data: {
        name: 'crime',
        description: 'Desata un crimen y gana dinero extra.'
    },
};