// /logthread <start> <end> — count words per user between two messages, with optional edel grant
// Accepts message IDs (uses current channel) or full Discord message links
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance } = require('../../utils/sheets');

function parseInput(input, fallbackChannelId) {
    const linkMatch = input.match(/channels\/\d+\/(\d+)\/(\d+)/);
    if (linkMatch) return { channelId: linkMatch[1], messageId: linkMatch[2] };
    if (/^\d+$/.test(input.trim())) return { channelId: fallbackChannelId, messageId: input.trim() };
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logthread')
        .setDescription('Count words per user between two messages')
        .addStringOption(opt =>
            opt.setName('start').setDescription('Start message ID or link').setRequired(true))
        .addStringOption(opt =>
            opt.setName('end').setDescription('End message ID or link').setRequired(true)),

    async execute(interaction) {
        const startInput = interaction.options.getString('start');
        const endInput   = interaction.options.getString('end');

        await interaction.deferReply();
        try {
            const startParsed = parseInput(startInput, interaction.channel.id);
            const endParsed   = parseInput(endInput,   interaction.channel.id);

            if (!startParsed || !endParsed) {
                return interaction.editReply('Invalid message ID or link.');
            }

            const channel = await interaction.client.channels.fetch(startParsed.channelId);
            if (!channel) return interaction.editReply('Channel not found.');

            const startMsg = await channel.messages.fetch(startParsed.messageId);
            const endMsg   = await channel.messages.fetch(endParsed.messageId);

            const startId = BigInt(startMsg.id);
            const endId   = BigInt(endMsg.id);

            if (startId > endId) {
                return interaction.editReply('Start message must be before the end message.');
            }

            const wordMap = new Map(); // userId → word count
            let messageCount = 0;

            const tally = (msg) => {
                const words = countWords(msg.content);
                if (words === 0) return;
                wordMap.set(msg.author.id, (wordMap.get(msg.author.id) ?? 0) + words);
            };

            tally(startMsg);
            messageCount++;

            let afterId = startMsg.id;
            let done = false;

            while (!done) {
                const batch = await channel.messages.fetch({ after: afterId, limit: 100 });
                if (batch.size === 0) break;

                const sorted = [...batch.values()].sort((a, b) =>
                    BigInt(a.id) < BigInt(b.id) ? -1 : 1
                );

                for (const msg of sorted) {
                    if (BigInt(msg.id) >= endId) { done = true; break; }
                    tally(msg);
                    messageCount++;
                }

                if (batch.size < 100 || done) break;
                afterId = sorted[sorted.length - 1].id;
            }

            // Always tally the end message explicitly (unless start === end, already counted)
            if (startId !== endId) {
                tally(endMsg);
                messageCount++;
            }

            if (wordMap.size === 0) {
                return interaction.editReply('No user messages found in that range.');
            }

            const memberMap = await interaction.guild.members.fetch({ user: [...wordMap.keys()] });

            const results = [...wordMap.entries()]
                .map(([userId, words]) => ({
                    userId,
                    name: memberMap.get(userId)?.displayName ?? userId,
                    words,
                }))
                .sort((a, b) => b.words - a.words);

            const totalWords = results.reduce((sum, r) => sum + r.words, 0);

            const lines = results.map((r, i) => `${i + 1}. **${r.name}** — ${r.words} words`);

            let description = '';
            let shown = 0;
            for (const line of lines) {
                if (description.length + line.length + 1 > 4000) break;
                description += (description ? '\n' : '') + line;
                shown++;
            }
            if (shown < lines.length) description += `\n*...and ${lines.length - shown} more*`;
            description += `\n\n${totalWords} total words · ${messageCount} messages scanned`;

            const embed = new EmbedBuilder()
                .setTitle('Log Thread Word Count')
                .setColor(0xB7B75F)
                .setDescription(description);

            const reply = await interaction.editReply({ embeds: [embed], components: [buildButtons()] });

            // ── Button collector ──────────────────────────────────────────────
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60_000,
                max: 1,
            });

            collector.on('collect', async i => {
                await i.update({ components: [buildButtons(true)] });

                if (i.customId === 'logthread_cancel') return;

                // Grant 1 edel per word to each user
                const granted = [];
                const failed  = [];

                for (const r of results) {
                    try {
                        await addBalance(r.userId, r.words);
                        granted.push(`**${r.name}** +${r.words} edels`);
                    } catch {
                        failed.push(r.name);
                    }
                }

                let grantDesc = granted.join('\n');
                if (failed.length > 0) grantDesc += `\n\nNo profile found for: ${failed.map(n => `**${n}**`).join(', ')}`;

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
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
