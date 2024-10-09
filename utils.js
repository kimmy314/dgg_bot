const channelCounts = {};

async function initializeChannelCount(client, channelId) {
    console.log("Counting from history")
    const channel = await client.channels.fetch(channelId);
    channelCounts[channelId] = 0;
    let messages = await channel.messages.fetch({limit: 100});
    while (messages.size > 0) {
        messages.forEach(message => {
            countMessage(channelId, message);
        });
        messages = await channel.messages.fetch({limit: 100, before: messages.last().id});
    }
}

async function countMessage(channelId, message) {
    const countMsg = message.content.match(/^(\d+)\s+done$/);
    let count = null
    if (countMsg) {
        count = parseInt(countMsg[1], 10);

        if (message.author.id == 340576035663773699) {
            message.react('<:cheng:1263644903733461042>')
        } else {
            message.react('👍');
        }
        channelCounts[channelId] += count;
    }
    return count
}

module.exports = { initializeChannelCount, channelCounts, countMessage }