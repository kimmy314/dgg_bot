const { SlashCommandBuilder } = require('discord.js');
const { ReportManager } = require('../../report-manager');
const { toOrdinal } = require('../../utils');

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
            const manager = await ReportManager.forChannel(channelId);
            const rankings = [
                ...manager.rankings(),
                // Sentinel value at end in case user has no reports
                { user: { id: userId }, quantity: 0 },
            ];

            const requestorIndex = rankings.findIndex(({user}) => user.id === userId);
            const requestorCount = rankings[requestorIndex].quantity;

            let reply = `You are in ${toOrdinal(requestorIndex + 1)} place with ${requestorCount}.`;

            if (requestorIndex > 0) {
                reply += ` You only need to do ${rankings[requestorIndex - 1].quantity - requestorCount + 1} more to be ${toOrdinal(requestorIndex)}!`;
            }

            const message = await interaction.reply({ content: reply, fetchReply: true });

            if (requestorIndex === rankings.length - 1) {
                message.react('🤡');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the message history.');
        }
    },
};