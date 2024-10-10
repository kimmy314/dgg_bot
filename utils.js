const channelCounts = {};
const reports = [];

const REPORT_REGEX = /^(\d+)\s+done$/;

const MessageType = {
    Live: "Live",
    Historical: "Historical"
};

async function initializeChannelCount(client, channelId) {
    console.log("Counting from history")
    const channel = await client.channels.fetch(channelId);
    channelCounts[channelId] = 0;
    let messages = await channel.messages.fetch({limit: 100});
    while (messages.size > 0) {
        messages.forEach(message => {
            handleMessage(message, MessageType.Historical);
        });
        messages = await channel.messages.fetch({limit: 100, before: messages.last().id});
    }
}

async function handleMessage(message, messageType = MessageType.Live) {
    if (REPORT_REGEX.test(message.content)) {
        handleReport(message, messageType);
    }
}

async function handleReport(message, messageType) {
    const match = message.content.match(REPORT_REGEX);
    const quantity = parseInt(match[1], 10);

    const report = {
        message,
        quantity,
    };

    reports.push(report);

    countReport(report);
    reactToReport(report);
    if (messageType === MessageType.Live) {
        updateLongestStreak(report);
    }
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

async function updateLongestStreak({message}) {
    const reportsByUserInChannel = reports.filter(report => report.message.author.id === message.author.id && report.message.channel.id === message.channel.id);

    function getDayAfter(date) {
        // Month is 1-indexed (why? 😩)
        const next = new Date(`${date.getFullYear()} ${date.getMonth() + 1} ${date.getDate()}`);
        // setDate automatically rolls over the day/month/year as appropriate, however the constructor does not. If we had tried to do this there it would result in invalid dates.
        next.setDate(date.getDate() + 1);
        return next;
    }

    // Javascript's Date class provides methods for working in the local timezone or UTC. Ideally this would behave consistantly regardless of where the bot is deployed, but I think that may require a more sophisticated library.

    let longestStreak = 1;
    let currentStreak = 1;
    let nextDay = getDayAfter(reportsByUserInChannel[0].message.createdAt);
    let skippedLastReport = false;

    for (let i = 1; i < reportsByUserInChannel.length; ++i) {
        const report = reportsByUserInChannel[i];
        const createdAt = report.message.createdAt;


        if (createdAt < nextDay) {
            // multiple reports in a single day don't help.
            skippedLastReport = true;
            continue;
        }

        skippedLastReport = false;
        
        if (createdAt.getFullYear() === nextDay.getFullYear() && createdAt.getMonth() === nextDay.getMonth() && createdAt.getDate() === nextDay.getDate()) {
            currentStreak++;
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
            }
        } else {
            currentStreak = 1;
        }

        nextDay = getDayAfter(createdAt);
    }

    // If we didn't skip the last report then it contributed to making the current streak and we should notify the user.
    if (!skippedLastReport && currentStreak > 1) {
        const reply = [];

        reply.push(`You are on a streak of ${currentStreak} days!`);

        if (longestStreak !== currentStreak && longestStreak > 1) {
            reply.push(`Your longest streak so far was ${longestStreak} days.`);
        }

        message.reply(reply.join(' '));
    }
}

module.exports = { initializeChannelCount, channelCounts, handleMessage, reports }