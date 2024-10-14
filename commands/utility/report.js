const { SlashCommandBuilder } = require('discord.js');
const { formatAsTable } = require('../../utils');
const { ReportManager } = require('../../report-manager');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Reports stats for the entire channel.'),
    async execute(interaction) {
        if (!interaction.channel) {
            await interaction.reply('This command can only be used in a channel.');
            return;
        }

        const channelId = interaction.channel.id;

        try {
            const manager = await ReportManager.forChannel(channelId);
            const rankings = manager.rankings(channelId);

            for (const ranking of rankings) {
                ranking.distinctDays = manager.countDistinctDays(ranking.user.id, channelId);
            }

            const totalToday = rankings.reduce((total, {today}) => total += today, 0);

            const guildMembers = await interaction.guild.members.fetch({ user: rankings.map(ranking => ranking.user.id)});

            interaction.reply(formatAsTable(
                ['#', 'user', 'today', 'total', 'days'],
                rankings.map(({ user, today, quantity, distinctDays }, index) => [index + 1, (guildMembers.get(user.id).nickname || user.displayName).slice(0, 10), today, quantity, distinctDays]),
                ['', '', totalToday, manager.totalCount, '']
            ));
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the message history.');
        }
    },
};