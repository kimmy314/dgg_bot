const { SlashCommandBuilder } = require('discord.js');
const { initializeChannelCount, channelCounts } = require('../../utils');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Tells you the progress so far.'),
    async execute(interaction) {
        if (!interaction.channel) {
            await interaction.reply('This command can only be used in a channel.');
            return;
        }

        const channelId = interaction.channel.id;

        try {
            if (!channelCounts[channelId]) {
                await initializeChannelCount(interaction.client, channelId);
            }

            const totalCount = channelCounts[channelId];
            await interaction.reply(`Total count for this channel from message history is ${totalCount}.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the message history.');
        }
    },
};