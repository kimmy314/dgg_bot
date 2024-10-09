const channelCounts = {};

const REPORT_REGEX = /^(\d+)\s+done$/;

async function initializeChannelCount(client, channelId) {
    console.log("Counting from history")
    const channel = await client.channels.fetch(channelId);
    channelCounts[channelId] = 0;
    let messages = await channel.messages.fetch({limit: 100});
    while (messages.size > 0) {
        messages.forEach(message => {
            handleMessage(message);
        });
        messages = await channel.messages.fetch({limit: 100, before: messages.last().id});
    }
}

async function handleMessage(message) {
    if (REPORT_REGEX.test(message.content)) {
        handleReport(message);
    }
}

async function handleReport(message) {
    const match = message.content.match(REPORT_REGEX);
    const quantity = parseInt(match[1], 10);

    const report = {
        message,
        quantity,
    };

    countReport(report);
    reactToReport(report);
}

async function countReport({message, quantity}) {
    channelCounts[message.channelId] += quantity;
}

async function reactToReport({message}) {
    if (message.author.id == 340576035663773699) {
        message.react('<:cheng:1263644903733461042>')
    } else {
        message.react('👍');
    }
}

module.exports = { initializeChannelCount, channelCounts, handleMessage }