module.exports = {
    data: {
        name: 'ping',
        description: 'Respond with Pong!',
    },

    run: ({ interaction }) => {
        interaction.reply('Pong!');
    },
};