const { ActivityType } = require('discord.js');

module.exports = (_, client) => {
    console.log("Estoy listo!");
    // Set bot presence to "Playing Ultimate PC Simulator"
    if (client?.user) {
        client.user.setActivity('Ultimate PC Simulator', { type: ActivityType.Playing });
    }
};
