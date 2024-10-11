const { Client, GuildBasedChannel, Message } = require('discord.js');
const moment = require('moment-timezone');

const REPORT_REGEX = /^(\d+)\s+done$/;

const MessageType = {
    Live: "Live",
    Historical: "Historical"
};

/**
 * @typedef {Object} Report
 * @property {Message<true>} message
 * @property {number} quantity
 */

class ReportManager {
    /** @type {Object.<string, Promise<ReportManager>} */
    static #managers = {};

    /**
     * @param {string} channelId
     * @returns {Promise<ReportManager>}
     */
    static forChannel(channelId) {
        return ReportManager.#managers[channelId];
    }

    static async initializeManagers(client, channels) {
        for (const channel of channels) {
            const manager = new ReportManager(client, channel);
            ReportManager.#managers[channel.id] = new Promise(resolve => {
                console.log(`Initializing ${channel.name}.`)
                manager.#initializeChannelCount().then(() => {
                    resolve(manager);
                });
                console.log(`Finished initializing ${channel.name}.`);
            });
        }
        return Promise.all(Object.values(ReportManager.#managers));
    }

    #client;
    #channel;

    /** @type {Report[]} */
    reports = [];
    totalCount = 0;

    /**
     * @param {Client} client 
     * @param {GuildBasedChannel} channel 
     */
    constructor(client, channel) {
        this.#client = client;
        this.#channel = channel;
    }

    getReportsByUser(userId) {
        return this.reports.filter(report => report.message.author.id === userId);
    }

    countDistinctDays(userId) {
        const reportsByUser = this.getReportsByUser(userId);
        const reportDays = reportsByUser.map(report => moment(report.message.createdAt).tz("US/Pacific").format('YYYY MM DD'));
        const distinctDays = new Set(reportDays);
        return distinctDays.size;
    }

    rankings() {
        const countsByAuthor = {};

        for (const report of this.reports) {
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

        return Object.values(countsByAuthor).sort(({ quantity: q1 }, { quantity: q2 }) => q2 - q1);
    }


    async handleMessage(message, messageType = MessageType.Live) {
        if (REPORT_REGEX.test(message.content)) {
            await this.#handleReport(message, messageType);
        }
    }

    async #handleReport(message, messageType) {
        const match = message.content.match(REPORT_REGEX);
        const quantity = parseInt(match[1], 10);

        const report = {
            message,
            quantity,
        };

        this.reports.push(report);

        this.#countReport(report);
        this.#reactToReport(report);
        if (messageType === MessageType.Live) {
            this.#updateLongestStreak(report);
        }
    }

    async #countReport({ quantity }) {
        this.totalCount += quantity;
    }

    async #reactToReport({ message }) {
        if (message.author.id == 340576035663773699) {
            message.react('<:cheng:1263644903733461042>')
        } else {
            message.react('👍');
        }
    }

    async #updateLongestStreak({ message }) {
        const reportsByUser = this.getReportsByUser(message.author.id, message.channel.id);

        let longestStreak = 1;
        let currentStreak = 1;
        let nextDay = moment(reportsByUser[0].message.createdAt).tz("US/Pacific").startOf('day').add(1, 'day');
        let skippedLastReport = false;

        for (let i = 1; i < reportsByUser.length; ++i) {
            const report = reportsByUser[i];
            const createdAt = moment(report.message.createdAt).tz("US/Pacific");

            if (createdAt.isBefore(nextDay)) {
                // multiple reports in a single day don't help.
                skippedLastReport = true;
                continue;
            }

            skippedLastReport = false;

            if (createdAt.format('YYYY MM DD') === nextDay.format('YYYY MM DD')) {
                currentStreak++;
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                }
            } else {
                currentStreak = 1;
            }

            nextDay = createdAt.startOf('day').add(1, 'day');
        }

        // If we didn't skip the last report then it contributed to making the current streak and we should notify the user.
        if (!skippedLastReport && currentStreak > 1) {
            const reply = [];

            reply.push(`You are on a ${currentStreak}-day streak!`);

            if (longestStreak !== currentStreak && longestStreak > 1) {
                reply.push(`Your longest streak so far was ${longestStreak} days.`);
            }

            message.reply(reply.join(' '));
        }
    }

    async #initializeChannelCount() {
        const channel = await this.#client.channels.fetch(this.#channel.id);
        const messages = [];
        let buffer = await channel.messages.fetch({ limit: 100 });
        while (buffer.size > 0) {
            messages.push(...buffer);
            buffer = await channel.messages.fetch({ limit: 100, before: buffer.last().id });
        }

        await Promise.all(
            messages
                .reverse()
                .map(([id, message]) => this.handleMessage(message, MessageType.Historical)));
    }
}

module.exports = { ReportManager };