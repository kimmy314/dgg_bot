const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const { ReportManager } = require('./report-manager');
const { toOrdinal } = require('./utils');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

client.cooldowns = new Collection();
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.once(Events.ClientReady, async c => {
    console.log(`Logged in as ${c.user.tag}.`);

    const channels = [...client.guilds.cache.flatMap(guild => 
        (config.channels)
            ? guild.channels.cache.filter(channel => config.channels.includes(channel.id))
            : guild.channels.cache.filter(channel => channel.name.includes('count'))
    )].map(([id, channel]) => channel);

    console.log(`Initializing ${channels.length} channels.`);

    await ReportManager.initializeManagers(client, channels);

    console.log(`All channels initialized. Ready to receive inputs.`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    const { cooldowns } = interaction.client;

    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const defaultCooldownDuration = 3;
    const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
            const expiredTimestamp = Math.round(expirationTime / 1000);
            return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
        }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

function isAppropriateChannel(message) {
    if (config.channels) {
        return config.channels.includes(message.channelId);
    } else {
        const channelName = message.channel.name.toLowerCase();
        // if the channel name has count in it or test
        return channelName.includes('count') || channelName.includes('test');
    }
}

async function doneHandler(message) {
    const authorId = message.author.id;
    const channelId = message.channel.id;

    if (isAppropriateChannel(message)) {
        const manager = await ReportManager.forChannel(channelId);

        const countMatch = message.content.match(/^(\d+)\s+done$/);
        if (countMatch) {
            const prevCount = manager.totalCount;
            const prevRanking = manager.rankings().findIndex(({user}) => user.id === authorId);
            manager.handleMessage(message);
            const currCount = manager.totalCount;
            const currRankings = manager.rankings();
            const currRanking = currRankings.findIndex(({user}) => user.id === authorId);

            if (prevRanking !== -1 && prevRanking !== currRanking) {
                const victor = currRankings[currRanking];
                const victim = currRankings[prevRanking];

                const needed = victor.quantity - victim.quantity + 1;

                if (needed > 0) {
                    message.reply(`You've moved up to ${toOrdinal(currRanking + 1)} place!\n<@${victim.user.id}>, do ${needed} more to redeem yourself!`);
                }
            }

            // Check if the previous count was below a hundreds boundary and the current count is at or above a new hundreds boundary
            const prevHundreds = Math.floor(prevCount / 100);
            const currHundreds = Math.floor(currCount / 100);

            if (currHundreds > prevHundreds) {
                message.channel.send(`The total count is now at ${manager.totalCount}!`);
            }
        }
    }
}

client.on(Events.MessageCreate, doneHandler);

client.login(config.token);