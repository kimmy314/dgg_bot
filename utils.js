const channelCounts = {};

async function initializeChannelCount(client, channelId) {
    console.log("Counting from history")
    const channel = await client.channels.fetch(channelId);
    let totalCount = 0;
    let messages = await channel.messages.fetch({limit: 100});
    while (messages.size > 0) {
        messages.forEach(message => {
            const countMatch = message.content.match(/^(\d+)\s+done$/);
            if (countMatch) {
                totalCount += parseInt(countMatch[1], 10);
                message.react('👍');
            }
        });
        messages = await channel.messages.fetch({limit: 100, before: messages.last().id});
    }
    channelCounts[channel.id] = totalCount;
}

module.exports = { initializeChannelCount, channelCounts }