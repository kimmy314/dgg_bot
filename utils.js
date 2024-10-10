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
    const reportsByUserInChannel = getReportsInChannelByUser(message.author.id, message.channel.id);

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

function getReportsInChannelByUser(userId, channelId) {
    return reports.filter(report => report.message.author.id === userId && report.message.channel.id === channelId);
}

function countDistinctDays(userId, channelId) {
    const reportsInChannelByUser = getReportsInChannelByUser(userId, channelId);
    const reportDays = reportsInChannelByUser.map(report => report.message.createdAt).map(date => `${date.getFullYear()} ${date.getMonth()} ${date.getDate()}`);
    const distinctDays = new Set(reportDays);
    return distinctDays.size;
}

function channelRankings(channelId) {
    const reportsInChannel = reports.filter(report => report.message.channel.id === channelId);

    const countsByAuthor = {};

    for (const report of reportsInChannel) {
        const id = report.message.author.id;
        if (!countsByAuthor[id]) {
            countsByAuthor[id] = { 
                user: report.message.author,
                quantity: report.quantity,
            };
        } else {
            countsByAuthor[id].quantity += report.quantity;
        }
    }

    return Object.values(countsByAuthor).sort(({quantity: q1}, {quantity: q2}) => q2 - q1);;
}

module.exports = { initializeChannelCount, channelCounts, handleMessage, reports, countDistinctDays, channelRankings }