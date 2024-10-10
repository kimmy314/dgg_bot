const { SlashCommandBuilder } = require('discord.js');
const {  reports, channelRankings, countDistinctDays } = require('../../utils');

function toTable(headers, rows) {
    headers = headers.map(header => `${header}`);
    rows = rows.map(row => row.map(cell => `${cell}`));

    const widths = headers.map((header, index) => Math.max(...[header, ...rows.map(row => row[index])].map(s => s.length)));

    const header = headers.map((header, index) => header.padStart(widths[index])).join(' | ')
    const divider = new Array(widths.reduce((acc, a) => acc + a, 0) + (widths.length * 3)).fill('-').join('');
    const body = rows.map(row => row.map((string, index) => string.padStart(widths[index])).join(' | ')).join('\n');

    return '```' + `${header}\n${divider}\n${body}` + '```';
}

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
            const rankings = channelRankings(channelId);

            for (const ranking of rankings) {
                ranking.distinctDays = countDistinctDays(ranking.user.id, channelId);
            }

            interaction.reply(toTable(
                ['#', 'user', 'quantity', 'days'],
                rankings.map(({user, quantity, distinctDays}, index) => [index + 1, user.username, quantity, distinctDays])
            ));
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the message history.');
        }
    },
};