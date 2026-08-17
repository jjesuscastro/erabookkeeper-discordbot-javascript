// /logthread - count words per user in a whole thread or an inclusive message range
// Accepts message IDs (uses current channel) or full Discord message links.
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { addBalance, getTupper } = require('../../utils/sheets');

class LogThreadError extends Error {}

const PERIOD_MULTIPLIERS = {
    Monthly: 1,
    qte: 1,
    assignment: 1,
};
const DEFAULT_PERIOD = 'None';

function parseInput(input, fallbackChannelId) {
    if (!input) return null;

    const trimmed = input.trim();
    const linkMatch = trimmed.match(/channels\/(?:@me|\d+)\/(\d+)\/(\d+)/);
    if (linkMatch) return { channelId: linkMatch[1], messageId: linkMatch[2] };
    if (/^\d+$/.test(trimmed)) return { channelId: fallbackChannelId, messageId: trimmed };
    return null;
}

function countWords(content) {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function applyPeriodMultiplier(edels, period) {
    return edels * (PERIOD_MULTIPLIERS[period] ?? PERIOD_MULTIPLIERS[DEFAULT_PERIOD]);
}

function isAdminInteraction(interaction) {
    return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));
}

function buildSubmitComponents(selectedPeriod = DEFAULT_PERIOD, disabled = false) {
    const periodSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('logthread_period')
            .setPlaceholder('Event Bonuses')
            .setDisabled(disabled)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('None')
                    .setValue('None')
                    .setDefault(selectedPeriod === 'None'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Monthly Event')
                    .setValue('Monthly')
                    .setDefault(selectedPeriod === 'Monthly'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('QTE Event')
                    .setValue('qte')
                    .setDefault(selectedPeriod === 'qte'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('School Assignment')
                    .setValue('Assignment')
                    .setDefault(selectedPeriod === 'assignment'),
            ),
    );

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('logthread_submit')
            .setLabel('Submit')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('logthread_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
    );

    return [periodSelect, buttons];
}

function buildReviewButtons(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('logthread_grant')
            .setLabel('Grant Edels')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('logthread_review_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
    );
}

function buildPayMap(results) {
    const payMap = new Map();
    for (const result of results) {
        payMap.set(result.userId, (payMap.get(result.userId) ?? 0) + result.edels);
    }
    return payMap;
}

async function grantEdels(results) {
    const granted = [];
    const failed = [];

    for (const [id, edels] of buildPayMap(results)) {
        try {
            if (id !== '') {
                await addBalance(id, edels);
                granted.push(`**<@${id}>** - +${edels} edels`);
            }
        } catch {
            failed.push(id);
        }
    }

    let grantDesc = granted.join('\n') || 'No registered payouts found.';
    if (failed.length > 0) {
        grantDesc += `\n\nNo profile found for: ${failed.map(name => `**${name}**`).join(', ')}`;
    }

    return new EmbedBuilder()
        .setTitle('Edels Granted!')
        .setColor(0xB7B75F)
        .setDescription(grantDesc);
}

function buildLogEmbed({ startLink, endLink, totalWords, messageCount, description, payouts, period }) {
    return new EmbedBuilder()
        .setTitle('Log RP')
        .setColor(0xB7B75F)
        .addFields(
            { name: '', value: `**Start: **${startLink ?? 'N/A'}\n**End: **${endLink ?? 'N/A'}`, inline: true },
            { name: '', value: `**Total WC: **${totalWords}\n**Total Messages: **${messageCount}`, inline: true },
            { name: '', value: `**Bonus: **${period}`, inline: true },
            { name: '', value: '``` ```', inline: false },
            { name: 'LOG SUMMARY', value: description, inline: false },
            { name: '', value: '', inline: false },
            { name: 'EDELS', value: payouts, inline: false },
            { name: '', value: '', inline: false },
            { name: 'HOUSE POINTS', value: 'tba', inline: false },
        );
}

async function fetchReviewChannel(client) {
    const channelId = process.env.LOGTHREAD_REVIEW_CHANNEL_ID;
    if (!channelId) throw new LogThreadError('LOGTHREAD_REVIEW_CHANNEL_ID is not configured.');

    let channel;
    try {
        channel = await client.channels.fetch(channelId);
    } catch {
        throw new LogThreadError('Could not access the logthread review channel.');
    }

    if (!channel?.isTextBased()) {
        throw new LogThreadError('The logthread review channel is not text-based.');
    }
    return channel;
}

async function fetchMessage(client, parsed, label) {
    let channel;
    try {
        channel = await client.channels.fetch(parsed.channelId);
    } catch {
        throw new LogThreadError(`Could not access the channel for the ${label} message.`);
    }

    if (!channel?.isTextBased() || !channel.messages) {
        throw new LogThreadError(`The ${label} message is not in a text-based channel.`);
    }

    try {
        return { channel, message: await channel.messages.fetch(parsed.messageId) };
    } catch {
        throw new LogThreadError(`Could not find or access the ${label} message.`);
    }
}

async function resolveThread(client, parsed) {
    const { channel, message } = await fetchMessage(client, parsed, 'thread');

    if (channel.isThread()) {
        let starter;
        try {
            starter = await channel.fetchStarterMessage();
        } catch {
            throw new LogThreadError('Could not find or access this thread\'s starter message.');
        }
        return { thread: channel, starter };
    }

    if (!channel.threads) {
        throw new LogThreadError('The supplied message does not have an associated thread.');
    }

    try {
        const thread = await channel.threads.fetch(message.id);
        if (!thread) throw new Error('Thread not found');
        return { thread, starter: message };
    } catch {
        throw new LogThreadError('The supplied message does not have an associated thread.');
    }
}

async function fetchThreadMessages(thread, starter) {
    const messages = new Map([[starter.id, starter]]);
    let before;

    while (true) {
        const options = { limit: 100 };
        if (before) options.before = before;

        const batch = await thread.messages.fetch(options);
        for (const message of batch.values()) messages.set(message.id, message);

        if (batch.size < 100) break;
        before = batch.last().id;
    }

    return [...messages.values()];
}

async function fetchRangeMessages(channel, startMessage, endMessage) {
    const startId = BigInt(startMessage.id);
    const endId = BigInt(endMessage.id);
    if (startId > endId) {
        throw new LogThreadError('Start message must be before the end message.');
    }

    if (startId === endId) return [startMessage];

    const messages = new Map([[endMessage.id, endMessage]]);
    let before = endMessage.id;

    while (true) {
        const batch = await channel.messages.fetch({ before, limit: 100 });
        if (batch.size === 0) break;

        let reachedStart = false;
        for (const message of batch.values()) {
            const id = BigInt(message.id);
            if (id < startId) {
                reachedStart = true;
                continue;
            }
            messages.set(message.id, message);
            if (id === startId) reachedStart = true;
        }

        if (reachedStart || batch.size < 100) break;
        before = batch.last().id;
    }

    if (!messages.has(startMessage.id)) {
        throw new LogThreadError('Could not scan the complete message range.');
    }

    return [...messages.values()];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logthread')
        .setDescription('Log your RPs!')
        .addStringOption(opt =>
            opt.setName('thread').setDescription('Thread starter or reply message ID/link').setRequired(false))
        .addStringOption(opt =>
            opt.setName('start').setDescription('Start message ID or link').setRequired(false))
        .addStringOption(opt =>
            opt.setName('end').setDescription('End message ID or link').setRequired(false)),

    async execute(interaction) {
        const threadInput = interaction.options.getString('thread');
        const startInput = interaction.options.getString('start');
        const endInput = interaction.options.getString('end');
        const isThreadMode = Boolean(threadInput) && !startInput && !endInput;
        const isRangeMode = !threadInput && Boolean(startInput) && Boolean(endInput);

        if (!isThreadMode && !isRangeMode) {
            return interaction.reply({
                content: 'Provide either `thread` by itself, or provide both `start` and `end`.',
                ephemeral: true,
            });
        }

        await interaction.deferReply();
        try {
            let messages;
            let startLink;
            let endLink;

            if (isThreadMode) {
                const parsed = parseInput(threadInput, interaction.channel.id);
                if (!parsed) throw new LogThreadError('Invalid thread message ID or link.');

                const { thread, starter } = await resolveThread(interaction.client, parsed);
                messages = await fetchThreadMessages(thread, starter);
                startLink = starter.url;
                endLink = starter.url;
            } else {
                const startParsed = parseInput(startInput, interaction.channel.id);
                const endParsed = parseInput(endInput, interaction.channel.id);
                if (!startParsed) throw new LogThreadError('Invalid start message ID or link.');
                if (!endParsed) throw new LogThreadError('Invalid end message ID or link.');
                if (startParsed.channelId !== endParsed.channelId) {
                    throw new LogThreadError('Start and end messages must be in the same channel.');
                }

                const { channel, message: startMessage } = await fetchMessage(interaction.client, startParsed, 'start');
                const { message: endMessage } = await fetchMessage(interaction.client, endParsed, 'end');
                messages = await fetchRangeMessages(channel, startMessage, endMessage);
                startLink = startMessage.url;
                endLink = endMessage.url;
            }

            const wordMap = new Map();
            for (const message of messages) {
                const words = countWords(message.content);
                if (words === 0) continue;

                const name = message.webhookId
                    ? message.author.username
                    : (message.member ? message.member.displayName : message.author.username);
                wordMap.set(name, (wordMap.get(name) ?? 0) + words);
            }

            if (wordMap.size === 0) {
                return interaction.editReply('No messages with words found.');
            }

            const results = [...wordMap.entries()]
                .map(([name, words]) => ({
                    userId: '',
                    name,
                    words,
                    edels: Math.floor(parseInt(words) / 5),
                    registered: true,
                }))
                .sort((a, b) => b.words - a.words);

            const lines = [];
            const wordWidth = results[0].words.toString().length;
            for (const result of results) {
                const { tupperuser, playerChara } = await getTupper(result.name);

                result.userId = tupperuser ?? '';
                if (result.userId !== '') {
                    if (playerChara == 'TRUE') {
                        lines.push(`\`${result.words.toString().padEnd(wordWidth, ' ')} WC\` - **${result.name}** - <@${tupperuser}>`);
                    } else {
                        lines.push(`\`${result.words.toString().padEnd(wordWidth, ' ')} WC\` - \`NPC\` **${result.name}** - <@${tupperuser}>`);
                        result.edels = result.edels * 5 / 20;
                    }
                } else {
                    lines.push(`\`${result.words.toString().padEnd(wordWidth, ' ')} WC\` - **${result.name}**`);
                    result.registered = false;
                }
            }

            let description = '';
            let shown = 0;
            for (const line of lines) {
                if (description.length + line.length + 1 > 4000) break;
                description += (description ? '\n' : '') + line;
                shown++;
            }
            if (shown < lines.length) description += `\n*...and ${lines.length - shown} more*`;

            const totalWords = results.reduce((sum, result) => sum + result.words, 0);
            let selectedPeriod = DEFAULT_PERIOD;
            const buildPayoutSnapshot = period => results.map(result => ({
                ...result,
                edels: applyPeriodMultiplier(result.edels, period),
            }));
            const buildPayoutText = snapshot => {
                const registered = snapshot.filter(result => result.userId !== '');
                const width = registered.reduce((max, result) => Math.max(max, result.edels.toString().length), 1);
                let text = '';

                for (const result of registered) {
                    const line = `\`${result.edels.toString().padEnd(width, ' ')} edels\` - ${result.name}`;
                    if (text.length + line.length + 1 > 4000) break;
                    text += (text ? '\n' : '') + line;
                }

                return text || 'No registered payouts.';
            };
            const buildCurrentEmbed = (period, snapshot = buildPayoutSnapshot(period)) => buildLogEmbed({
                startLink,
                endLink,
                totalWords,
                messageCount: messages.length,
                description,
                payouts: buildPayoutText(snapshot),
                period,
            });

            const reply = await interaction.editReply({
                embeds: [buildCurrentEmbed(selectedPeriod)],
                components: buildSubmitComponents(selectedPeriod),
            });
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && ['logthread_period', 'logthread_submit', 'logthread_cancel'].includes(i.customId),
                time: 300_000,
            });

            collector.on('collect', async i => {
                if (i.customId === 'logthread_period') {
                    selectedPeriod = i.values[0];
                    await i.update({
                        embeds: [buildCurrentEmbed(selectedPeriod)],
                        components: buildSubmitComponents(selectedPeriod),
                    });
                    return;
                }

                const finalPeriod = selectedPeriod;
                const payoutSnapshot = buildPayoutSnapshot(finalPeriod);
                const finalEmbed = buildCurrentEmbed(finalPeriod, payoutSnapshot);
                await i.update({ embeds: [finalEmbed], components: buildSubmitComponents(finalPeriod, true) });
                collector.stop(i.customId);
                if (i.customId === 'logthread_cancel') return;

                let reviewChannel;
                let reviewMessage;
                try {
                    reviewChannel = await fetchReviewChannel(interaction.client);
                    reviewMessage = await reviewChannel.send({
                        content: `Log submitted by <@${interaction.user.id}>`,
                        embeds: [finalEmbed],
                        components: [buildReviewButtons()],
                    });
                } catch (err) {
                    const message = err instanceof LogThreadError ? err.message : `Error: ${err.message}`;
                    await interaction.followUp({ content: message, ephemeral: true });
                    return;
                }

                await interaction.followUp({ content: `Submitted for admin review in <#${reviewChannel.id}>.` });

                const reviewCollector = reviewMessage.createMessageComponentCollector({
                    filter: action => ['logthread_grant', 'logthread_review_cancel'].includes(action.customId),
                });

                reviewCollector.on('collect', async action => {
                    if (!isAdminInteraction(action)) {
                        await action.reply({ content: 'Only administrators can approve logthread payouts.', ephemeral: true });
                        return;
                    }

                    await action.update({ components: [buildReviewButtons(true)] });
                    reviewCollector.stop(action.customId);
                    if (action.customId === 'logthread_review_cancel') return;

                    const grantEmbed = await grantEdels(payoutSnapshot);
                    await reviewChannel.send({ embeds: [grantEmbed] });
                });
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ components: buildSubmitComponents(selectedPeriod, true) }).catch(() => {});
                }
            });
        } catch (err) {
            const message = err instanceof LogThreadError ? err.message : `Error: ${err.message}`;
            await interaction.editReply(message);
        }
    },
};
