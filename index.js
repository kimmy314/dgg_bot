const { Client, GatewayIntentBits } = require('discord.js');

// Create a new Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Store counts for each server channel
const channelCounts = {};

// Event: When the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event: When a message is sent in a channel
client.on('messageCreate', message => {
    // Check if the message matches the pattern (number followed by "done")
    const match = message.content.match(/^(\d+)\s+done/i);
    if (match) {
        const number = parseInt(match[1], 10);
        const channelId = message.channel.id;

        // Initialize count for the channel if it doesn't exist
        if (!channelCounts[channelId]) {
            channelCounts[channelId] = 0;
        }

        // Update the count for the channel
        channelCounts[channelId] += number;

        // Reply to the user with the accumulated count
        message.channel.send(`${channelCounts[channelId]} accumulated!`);
    }
});

// Log in to Discord with your bot token
client.login('YOUR_BOT_TOKEN');
