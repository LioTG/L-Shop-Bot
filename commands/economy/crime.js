const { EmbedBuilder } = require('discord.js');
const Cooldown = require('../../schemas/Cooldown');
const UserProfile = require('../../schemas/UserProfile');

function getRandomNumber(x, y) {
    const range = y - x + 1;
    const randomNumber = Math.floor(Math.random() * range);
    return randomNumber + x;
}

const SUCCESS_MESSAGES = [
    (amount) => `You flipped a batch of GPUs on the grey market and cleared <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You cloned a VIP's PC image and sold the access kit for <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You snuck into a datacenter and "borrowed" some RAM sticks. Profit: <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You resold scalped consoles with custom firmware. Take home: <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You flashed a shady BIOS mod and the client still paid <:pcb:827581416681898014> ${amount}.`
];

const FAIL_MESSAGES = [
    (amount) => `Security caught you trying to bypass the server rack lock. You paid <:pcb:827581416681898014> ${amount} in fines.`,
    (amount) => `The GPU scam backfired and you refunded <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You tried to pawn fake SSDs; shop kept your cash: <:pcb:827581416681898014> ${amount}.`,
    (amount) => `Custom firmware bricked the client's rig. You compensated them <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You were traced while selling leaked keys. Penalty: <:pcb:827581416681898014> ${amount}.`
];

const pickMessage = (messages, amount) => {
    const idx = Math.floor(Math.random() * messages.length);
    return messages[idx](amount);
};

module.exports = {
    run: async ({ interaction }) => {
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: "This command can only be executed within a server.",
                ephemeral: true,
            });
            return;
        }

        try {
            await interaction.deferReply();

            const commandName = 'crime';
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            let cooldown = await Cooldown.findOne({ userId, guildId, commandName });

            if (cooldown && Date.now() < cooldown.endsAt) {
                const { default: prettyMs } = await import('pretty-ms');

                const cooldownEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Cooldown')
                    .setDescription(`You cannot commit a crime for  ${prettyMs(cooldown.endsAt - Date.now())}`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [cooldownEmbed] });
                return;
            }

            if (!cooldown) {
                cooldown = new Cooldown({ userId, guildId, commandName });
            }

            const success = Math.random() < 0.5; // 50% de probabilidad de Acxito
            let message = '';
            let color = '';
            let title = '';

            if (success) {
                const amount = getRandomNumber(200, 300);
                let userProfile = await UserProfile.findOne({ userId, guildId }).select('userId guildId balance');

                if (!userProfile) {
                    userProfile = new UserProfile({ userId, guildId });
                }

                userProfile.balance += amount;
                cooldown.endsAt = Date.now() + 300_000;

                await Promise.all([cooldown.save(), userProfile.save()]);

                const flavor = pickMessage(SUCCESS_MESSAGES, amount);
                message = `${flavor}\nNew balance: <:pcb:827581416681898014> ${userProfile.balance}`;
                color = '#00FF00';
                title = 'Success!';
            } else {
                const lossAmount = getRandomNumber(200, 250);
                let userProfile = await UserProfile.findOne({ userId, guildId }).select('userId guildId balance');

                if (!userProfile) {
                    userProfile = new UserProfile({ userId, guildId });
                }

                userProfile.balance -= lossAmount;
                cooldown.endsAt = Date.now() + 300_000;

                await Promise.all([cooldown.save(), userProfile.save()]);

                const flavor = pickMessage(FAIL_MESSAGES, lossAmount);
                message = `${flavor}\nNew balance: <:pcb:827581416681898014> ${userProfile.balance}`;
                color = '#FF0000';
                title = 'Failed!';
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
                content: "A mistake occurred while attempting to commit the crime.",
                ephemeral: true,
            });
        }
    },

    data: {
        name: 'crime',
        description: 'Unleash a crime and earn extra money.'
    },
};
