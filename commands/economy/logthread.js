// /logthread — count words per user in a whole thread or an inclusive message range
// Accepts message IDs (uses current channel) or full Discord message links
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { addBalance, getUserID } = require('../../utils/sheets');

class LogThreadError extends Error {}

function parseInput(input, fallbackChannelId) {
    if (!input) return null;

    const trimmed = input.trim();
    var linkMatch = trimmed.match(/channels\/(?:@me|\d+)\/(\d+)\/(\d+)/);
    if (linkMatch) return { channelId: linkMatch[1], messageId: linkMatch[2] };
    else if (/^\d+$/.test(trimmed)){
        return { channelId: fallbackChannelId, messageId: trimmed };
    }
    return null;
}

function countWords(content) {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function buildButtons(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('logthread_grant')
            .setLabel('Grant Edels')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('logthread_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
    );
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
            let StartLink;
            let EndLink;

            if (isThreadMode) {
                const parsed = await parseInput(threadInput, interaction.channel.id);
                if (!parsed) throw new LogThreadError('Invalid thread message ID or link.');

                const { thread, starter } = await resolveThread(interaction.client, parsed);
                messages = await fetchThreadMessages(thread, starter);
            } else {
                const startParsed = await parseInput(startInput, interaction.channel.id);
                const endParsed = await parseInput(endInput, interaction.channel.id);
                if (!startParsed) throw new LogThreadError('Invalid start message ID or link.');
                if (!endParsed) throw new LogThreadError('Invalid end message ID or link.');
                if (startParsed.channelId !== endParsed.channelId) {
                    throw new LogThreadError('Start and end messages must be in the same channel.');
                }

                const { channel, message: startMessage } = await fetchMessage(interaction.client, startParsed, 'start');
                const { message: endMessage } = await fetchMessage(interaction.client, endParsed, 'end');
                messages = await fetchRangeMessages(channel, startMessage, endMessage);

                const startId = startMessage.id;
                const endId = endMessage.id;
                
                const start = await channel.messages.fetch(startId);
                StartLink = start.url;
                const end = await channel.messages.fetch(endId);
                EndLink = end.url;
            }
            
            const wordMap = new Map();
            for (const message of messages) {
                const words = countWords(message.content);
                if (words === 0) continue;
                if (message.webhookId) wordMap.set(message.author.username , (wordMap.get(message.author.id) ?? 0) + words);
                else wordMap.set(message.member.displayName , (wordMap.get(message.author.id) ?? 0) + words);
            }

            if (wordMap.size === 0) {
                return interaction.editReply('No messages with words found.');
            }

            const memberMap = await interaction.guild.members.fetch({ user: [...wordMap.keys()] });
            const results = [...wordMap.entries()]
                .map(([name, words]) => ({
                    userId: getUserID(name) ?? memberMap.find(member => member.displayName === name).id,
                    //name: memberMap.get(userId)?.displayName ?? userId,
                    name: name,
                    words,
                    edels: Math.floor(parseInt(words)/5),
                }))
                .sort((a, b) => b.words - a.words);

            const totalWords = results.reduce((sum, result) => sum + result.words, 0);
            const lines = results.map((result) =>
                `\`${result.words.toString().padEnd(parseInt(results[0].words.toString().length), " ")} WC\` — **${result.name}** — <@${result.userId}>`
            );

            let description = '';
            let shown = 0;
            for (const line of lines) {
                if (description.length + line.length + 1 > 4000) break;
                description += (description ? '\n' : '') + line;
                shown++;
            }
            if (shown < lines.length) description += `\n*...and ${lines.length - shown} more*`;
            const embed = new EmbedBuilder()
                .setTitle('🪶 Log RP')
                .setColor(0xB7B75F)
                .addFields(
                    { name: '',      value: '**Start: **'+StartLink+'\n**End: **'+EndLink, inline: true },
                    //{ name: ' ', value: ' ', inline: true },
                    { name: '', value: `**Total WC: **`+totalWords.toString()+'\n**Total Messages: **'+messages.length.toString(), inline: true },
                    
                    { name: '', value: '``` ```', inline: false},
                    { name: 'LOG SUMMARY', value: description, inline: false},
                    { name: '', value: '', inline: false},
                    { name: 'EDELS', value: results.map((result) =>
                        `\`${result.edels.toString().padEnd(parseInt(results[0].edels.toString().length), " ")} edels\` — <@${result.userId}>`).join(`\n`), inline: false},
                    { name: '', value: '', inline: false},
                    { name: 'HOUSE POINTS', value: 'tba', inline: false},
                    
                )
                //.setDescription(`\n${description}`);
            const reply = await interaction.editReply({ embeds: [embed], components: [buildButtons()] });
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300_000,
                max: 1,
            });

            collector.on('collect', async i => {
                await i.update({ components: [buildButtons(true)] });
                if (i.customId === 'logthread_cancel') return;

                const granted = [];
                const failed = [];
                for (const result of results) {
                    try {
                        await addBalance(result.userId, result.edels);
                        granted.push(`**<@${result.userId}>** — +${result.edels} edels`);
                    } catch {
                        failed.push(result.name);
                    }
                }

                let grantDesc = granted.join('\n');
                if (failed.length > 0) {
                    grantDesc += `\n\nNo profile found for: ${failed.map(name => `**${name}**`).join(', ')}`;
                }

                const grantEmbed = new EmbedBuilder()
                    .setTitle('Edels Granted!')
                    .setColor(0xB7B75F)
                    .setDescription(grantDesc);

                await interaction.followUp({ embeds: [grantEmbed] });
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ components: [buildButtons(true)] }).catch(() => {});
                }
            });
        } catch (err) {
            const message = err instanceof LogThreadError ? err.message : `Error: ${err.message}`;
            await interaction.editReply(message);
        }
    },
};
