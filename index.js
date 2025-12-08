require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const { CommandHandler } = require('djs-commander');
const mongoose = require('mongoose');
const path = require('path');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

// Capturar excepciones no controladas
process.on('uncaughtException', (error) => {
    console.error('Excepción no controlada:', error);
    // Aquí puedes agregar más lógica, como notificar a un canal de errores en Discord.
});

// Capturar promesas no gestionadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa no gestionada:', promise, 'Razón:', reason);
    // Aquí puedes agregar más lógica, como notificar a un canal de errores en Discord.
});

new CommandHandler({
    client,
    eventsPath: path.join(__dirname, 'events'),
    commandsPath: path.join(__dirname, 'commands'),
});

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to database.");

        client.login(process.env.TOKEN);
    } catch (error) {
        console.error('Error al conectar a la base de datos o al iniciar sesión:', error);
    }
})();
