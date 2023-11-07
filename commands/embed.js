const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('This is an embed guide'),
    async run({ interaction, client, handler }) {

        const embed = new EmbedBuilder()
        .setColor("White")
        .setTitle('THE EMBED TITLE')
        .setURL('https://discord.js.org/')
        .setAuthor({ name: `L-Shop`, iconURL: `https://cdn.discordapp.com/avatars/1005989631864606831/e6976fe6cb61b8db8d743f9917020471.png?size=4096&ignore=true`})
        .setDescription('This is L-Shop Bot')
        .setThumbnail('https://i.imgur.com/AfFp7pu.png')
	    .addFields(
		{ name: 'Regular field title', value: 'Some value here' },
		{ name: '\u200B', value: '\u200B' },
		{ name: 'Inline field title', value: 'Some value here', inline: true },
		{ name: 'Inline field title', value: 'Some value here', inline: true },
	    )
	    .addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
	    .setImage('https://i.imgur.com/AfFp7pu.png')
	    .setTimestamp()
	    .setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

        await interaction.reply({ embeds: [embed] })
    }
}