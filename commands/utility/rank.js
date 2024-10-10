const { SlashCommandBuilder } = require('discord.js');
const { initializeChannelCount, reports } = require('../../utils');

function toOrdinal(number) {
    // Shamelessly stolen from https://stackoverflow.com/a/39466341
    return `${number}${["st", "nd", "rd"][((number + 90) % 100 - 10) % 10 - 1] || "th"}`;
}

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Tells you how you rank up compared to other people.'),
    async execute(interaction) {
        if (!interaction.channel) {
            await interaction.reply('This command can only be used in a channel.');
            return;
        }

        const channelId = interaction.channel.id;
        const userId = interaction.user.id;

        try {
            const reportsInChannel = reports.filter(report => report.message.channel.id === channelId);

            const countsByAuthor = {};
            for (const report of reportsInChannel) {
                countsByAuthor[report.message.author.id] = (countsByAuthor[report.message.author.id] || 0) + report.quantity;
            }

            const countsEntries = Object.entries(countsByAuthor).sort(([a, c1], [b, c2]) => c2 - c1);

            const requestorIndex = countsEntries.findIndex(([author]) => author === userId);

            const userIdToName = reportsInChannel.reduce((map, report) => {
                map[report.message.author.id] = report.message.author.username;
                return map;
            }, {});

            const requestorCount = countsByAuthor[userId];

            const topN = countsEntries.slice(0, 5);

            const reply = [];

            if (topN.length > 0) {
                reply.push('```');
                for (let i = 0; i < topN.length; ++i) {
                    reply.push(`${i + 1} | ${userIdToName[topN[i][0]].padStart(30)} | ${topN[i][1]}`);
                }
                reply.push('```');
            }

            reply.push(`You are in ${toOrdinal(requestorIndex + 1)} place with ${requestorCount}`);

            interaction.reply(reply.join('\n'));
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the message history.');
        }
    },
};