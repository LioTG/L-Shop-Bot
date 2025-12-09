const { SlashCommandBuilder, EmbedBuilder, ChannelType, time } = require('discord.js');

const formatVerification = (level = '') => String(level).toLowerCase().replace(/_/g, ' ');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Learn more about this server.'),

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

            const { guild } = interaction;
            const owner = await guild.fetchOwner();

            const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
            const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
            const stageChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildStageVoice).size;
            const forumChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildForum).size;
            const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;

            const roleMentions = guild.roles.cache
                .filter((role) => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .map((role) => `<@&${role.id}>`);

            const maxRolesToShow = 15;
            const displayedRoles = roleMentions.slice(0, maxRolesToShow).join(', ') || 'None';
            const hiddenRoles = roleMentions.length > maxRolesToShow ? ` +${roleMentions.length - maxRolesToShow} more` : '';

            const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostTier = guild.premiumTier || 0;
            const boostTierLabel = boostTier > 0 ? `Tier ${boostTier}` : 'No tier';

            const serverInfoEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 256 }) ?? undefined })
                .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
                .addFields(
                    { name: 'Owner', value: owner.user.tag, inline: true },
                    { name: 'Created', value: `${time(createdTimestamp, 'D')} (${time(createdTimestamp, 'R')})`, inline: true },
                    { name: 'Members', value: `${guild.memberCount}`, inline: true },
                    {
                        name: 'Channels',
                        value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nStage: ${stageChannels}\nForum: ${forumChannels}\nCategories: ${categories}`,
                        inline: true,
                    },
                    {
                        name: 'Boosts',
                        value: `${boostTierLabel} | ${boostCount} boost${boostCount === 1 ? '' : 's'}`,
                        inline: true,
                    },
                    {
                        name: 'Security',
                        value: `Verification: ${formatVerification(guild.verificationLevel)}\n2FA for mods: ${guild.mfaLevel === 1 ? 'On' : 'Off'}`,
                        inline: true,
                    },
                    {
                        name: 'Assets',
                        value: `Roles: ${guild.roles.cache.size}\nEmojis: ${guild.emojis.cache.size}\nStickers: ${guild.stickers.cache.size}`,
                        inline: true,
                    },
                    { name: 'Top roles', value: `${displayedRoles}${hiddenRoles}`, inline: false },
                )
                .setFooter({ text: `ID: ${guild.id}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [serverInfoEmbed] });
        } catch (error) {
            console.error(`Error handling /serverinfo: ${error}`);
            await interaction.editReply({
                content: 'An error occurred while fetching server info.',
            });
        }
    },
};
