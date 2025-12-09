const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Cooldown = require('../../schemas/Cooldown');
const UserProfile = require('../../schemas/UserProfile');

function getRandomNumber(x, y) {
    const range = y - x + 1;
    const randomNumber = Math.floor(Math.random() * range);
    return randomNumber + x;
}

const WORK_MESSAGES = [
    (amount) => `You helped Lio buy a super PC and earned <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You installed a clean Windows build and wiped every bloatware app. Tip jar: <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You reapplied thermal paste and shaved off 10C. Client paid <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You built a silent workstation with proper airflow. Paycheck: <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You rescued a PC from a failed BIOS flash. Hazard bonus: <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You cable-managed a battle-station and the owner slipped you <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You diagnosed coil whine and swapped a PSU. Earned <:pcb:827581416681898014> ${amount}.`,
    (amount) => `You tuned RAM timings and unlocked extra FPS. Paid <:pcb:827581416681898014> ${amount}.`
];

const pickWorkMessage = (amount) => {
    const randomIndex = Math.floor(Math.random() * WORK_MESSAGES.length);
    return WORK_MESSAGES[randomIndex](amount);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn extra money.'),

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

            const commandName = 'work';
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            let cooldown = await Cooldown.findOne({ userId, guildId, commandName });

            if (cooldown && Date.now() < cooldown.endsAt) {
                const { default: prettyMs } = await import('pretty-ms');

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('Cooldown')
                            .setDescription(`You cannot work for ${prettyMs(cooldown.endsAt - Date.now())}`)
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
                cooldown = new Cooldown({ userId, guildId, commandName });
            }

            const amount = getRandomNumber(30, 80);
            const flavorText = pickWorkMessage(amount);

            let userProfile = await UserProfile.findOne({ userId, guildId }).select('userId guildId balance');

            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            userProfile.balance += amount;
            cooldown.endsAt = Date.now() + 300_000;

            await Promise.all([cooldown.save(), userProfile.save()]);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Job completed!')
                        .setDescription(`${flavorText}\nNew balance: <:pcb:827581416681898014> ${userProfile.balance}`)
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
