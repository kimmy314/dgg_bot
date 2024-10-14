const { SlashCommandBuilder } = require('discord.js');
const { formatAsTable } = require('../../utils');
const { ReportManager } = require('../../report-manager');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Tests a thing.'),
    async execute(interaction) {
        if (!interaction.channel) {
            await interaction.reply('This command can only be used in a channel.');
            return;
        }

        const channelId = interaction.channel.id;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        
    },
};