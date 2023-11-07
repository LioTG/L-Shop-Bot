const { EmbedBuilder } = require('@discordjs/builders');

module.exports = {
    run: async ({ interaction }) => {
        if(!interaction.inGuild()) {
            interaction.reply({
                content: "Este comando solo puede ser ejecutado dentro de un servidor.",
                ephemeral: true,
            });
            return;
        }

        const { guild } = interaction;

        const serverInfoEmbed = new EmbedBuilder({
            author: { name: guild.name, iconURL: guild.iconURL({ size: 256})},

            fields: [
                { name: 'Owner', value: (await guild.fetchOwner()).user.tag, inline: true},
                { name: 'Text Channels', value: guild.channels.cache.filter((c) => c.type === 0).size, inline: true},
                { name: 'Voice Channels', value: guild.channels.cache.filter((c) => c.type === 2).size, inline: true},
                { name: 'Category Channels', value: guild.channels.cache.filter((c) => c.type === 4).size, inline: true},
                { name: 'Members', value: guild.memberCount, inline: true},
                { name: 'Roles', value: guild.roles.cache.size, inline: true},
                { name: 'Role List', value: guild.roles.cache
                    .map(role => role.name)
                    .filter(role => !(role.includes('='))).join(', ') }
            ],

            footer: { text: `ID: ${guild.id} | Server Created: ${guild.createdAt.toDateString()}` }
        });

        interaction.reply({ embeds: [serverInfoEmbed] });
    },

    data: {
        name: 'serverinfo',
        description: 'Obtén información acerca de este servidor.',
    }
};
