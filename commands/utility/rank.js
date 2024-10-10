const { SlashCommandBuilder } = require('discord.js');
const { initializeChannelCount, reports, channelRankings } = require('../../utils');

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
            const rankings = channelRankings(channelId);

            const requestorIndex = rankings.findIndex(({user}) => user.id === userId);
            const requestorCount = rankings[requestorIndex].quantity;

            const topN = rankings.slice(0, 5);

            const reply = [];

            if (topN.length > 0) {
                reply.push('```');
                for (let i = 0; i < topN.length; ++i) {
                    reply.push(`${i + 1} | ${topN[i].user.username.padStart(30)} | ${topN[i].quantity}`);
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