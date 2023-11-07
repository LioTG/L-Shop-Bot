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

            const commandName = 'work';
            const userId = interaction.user.id;

            let cooldown = await Cooldown.findOne({ userId, commandName });

            if (cooldown && Date.now() < cooldown.endsAt) {
                const { default: prettyMs } = await import('pretty-ms');

                await interaction.editReply(
                    `No puedes trabajar por ${prettyMs(cooldown.endsAt - Date.now())}`
                );
                return;
            }

            if(!cooldown) {
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

          await interaction.editReply(`Obtuviste <:pcb:827581416681898014> ${amount}!\nNuevo saldo: <:pcb:827581416681898014> ${userProfile.balance}`);
        } catch (error) {
            console.log(`Error handling /work: ${error}`);
        }
    },

    data: {
        name: 'work',
        description: 'Trabaja para tener dinero extra.'
    },
};