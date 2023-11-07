module.exports = {
    data: {
        name: 'ping',
        description: 'Responde con Pong!',
    },

    run: ({ interaction }) => {
        interaction.reply('Pong!');
    },
};