const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const packageInfo = require('../package.json');

const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Show L-Shop bot information.'),
    async run({ interaction }) {
        const client = interaction.client;

        const totalServers = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
        const uptime = formatDuration(client.uptime || 0);
        const ping = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('L-Shop Bot')
            .setURL('https://nutellagamertv2000.wixsite.com/lstudios')
            .setAuthor({ name: 'L.Studios', iconURL: 'https://cdn.discordapp.com/avatars/1005989631864606831/e6976fe6cb61b8db8d743f9917020471.png?size=4096&ignore=true' })
            .setDescription('Overview and runtime stats for the L-Shop Discord bot.')
            .setThumbnail('https://cdn.discordapp.com/avatars/1005989631864606831/e6976fe6cb61b8db8d743f9917020471.png?size=4096&ignore=true')
            .addFields(
                { name: 'Developer', value: 'liotg', inline: true },
                { name: 'Version', value: packageInfo.version || 'unknown', inline: true },
                { name: 'Ping', value: `${ping} ms`, inline: true },
                { name: 'Uptime', value: uptime, inline: true },
                { name: 'Servers', value: `${totalServers}`, inline: true },
                { name: 'Users', value: `${totalUsers}`, inline: true },
                { name: 'Node.js', value: process.version, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    }
};
