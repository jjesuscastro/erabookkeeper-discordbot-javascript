const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadHelpers() {
    const filename = path.join(__dirname, '..', 'commands', 'economy', 'logthread.js');
    const source = `${fs.readFileSync(filename, 'utf8')}
        module.exports.__test = {
            parseInput,
            countWords,
            resolveThread,
            fetchThreadMessages,
            fetchRangeMessages,
        };`;

    class Builder {
        setName() { return this; }
        setDescription() { return this; }
        setRequired() { return this; }
        setCustomId() { return this; }
        setLabel() { return this; }
        setStyle() { return this; }
        setDisabled() { return this; }
        setTitle() { return this; }
        setColor() { return this; }
        addStringOption(callback) { callback(new Builder()); return this; }
        addComponents() { return this; }
    }

    const module = { exports: {} };
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        require(request) {
            if (request === 'discord.js') {
                return {
                    SlashCommandBuilder: Builder,
                    EmbedBuilder: Builder,
                    ActionRowBuilder: Builder,
                    ButtonBuilder: Builder,
                    ButtonStyle: { Success: 1, Secondary: 2 },
                };
            }
            if (request === '../../utils/sheets') return { addBalance: async () => {} };
            throw new Error(`Unexpected import: ${request}`);
        },
        Map,
        BigInt,
        Error,
    }, { filename });

    return module.exports.__test;
}

const helpers = loadHelpers();

function message(id, content = `message ${id}`, authorId = 'user') {
    return { id: String(id), content, author: { id: authorId } };
}

function collection(items) {
    const result = new Map(items.map(item => [item.id, item]));
    result.last = () => items.at(-1);
    return result;
}

function paginatedManager(allMessages) {
    const descending = [...allMessages].sort((a, b) => Number(BigInt(b.id) - BigInt(a.id)));
    return {
        calls: 0,
        async fetch(options) {
            this.calls++;
            const before = options.before ? BigInt(options.before) : null;
            const page = descending
                .filter(item => before === null || BigInt(item.id) < before)
                .slice(0, options.limit);
            return collection(page);
        },
    };
}

test('parses message links and resolves bare IDs against the current channel', () => {
    assert.deepEqual(
        { ...helpers.parseInput('https://discord.com/channels/1/22/333', '99') },
        { channelId: '22', messageId: '333' },
    );
    assert.deepEqual(
        { ...helpers.parseInput(' 444 ', '99') },
        { channelId: '99', messageId: '444' },
    );
    assert.equal(helpers.parseInput('not-a-message', '99'), null);
});

test('counts whitespace-separated text content', () => {
    assert.equal(helpers.countWords(' one\n two   three '), 3);
    assert.equal(helpers.countWords(''), 0);
    assert.equal(helpers.countWords(null), 0);
});

test('range scan is inclusive and supports a single-message range', async () => {
    const all = [message(100), message(101), message(102), message(103), message(104)];
    const channel = { messages: paginatedManager(all) };

    const range = await helpers.fetchRangeMessages(channel, all[1], all[3]);
    assert.deepEqual([...range.map(item => item.id)].sort(), ['101', '102', '103']);
    const singleMessageRange = await helpers.fetchRangeMessages(channel, all[2], all[2]);
    assert.deepEqual([...singleMessageRange].map(item => item.id), ['102']);
});

test('range scan paginates beyond 100 messages without duplicates', async () => {
    const all = Array.from({ length: 205 }, (_, index) => message(1000 + index));
    const manager = paginatedManager(all);
    const range = await helpers.fetchRangeMessages({ messages: manager }, all[0], all.at(-1));

    assert.equal(range.length, 205);
    assert.equal(new Set(range.map(item => item.id)).size, 205);
    assert.equal(manager.calls, 3);
});

test('range scan rejects reversed endpoints', async () => {
    await assert.rejects(
        helpers.fetchRangeMessages({ messages: paginatedManager([]) }, message(20), message(10)),
        /Start message must be before/,
    );
});

test('thread scan includes its starter and paginates beyond 100 replies', async () => {
    const starter = message(500);
    const replies = Array.from({ length: 205 }, (_, index) => message(501 + index));
    const manager = paginatedManager(replies);
    const scanned = await helpers.fetchThreadMessages({ messages: manager }, starter);

    assert.equal(scanned.length, 206);
    assert.equal(new Set(scanned.map(item => item.id)).size, 206);
    assert.ok(scanned.some(item => item.id === starter.id));
    assert.equal(manager.calls, 3);
});

test('thread resolution accepts a reply inside a thread', async () => {
    const starter = message(700);
    const reply = message(701);
    const thread = {
        isTextBased: () => true,
        isThread: () => true,
        messages: { fetch: async id => assert.equal(id, reply.id) || reply },
        fetchStarterMessage: async () => starter,
    };
    thread.messages.fetch = async id => {
        assert.equal(id, reply.id);
        return reply;
    };

    const resolved = await helpers.resolveThread(
        { channels: { fetch: async () => thread } },
        { channelId: 'thread-channel', messageId: reply.id },
    );
    assert.equal(resolved.thread, thread);
    assert.equal(resolved.starter, starter);
});

test('thread resolution accepts a parent-channel starter', async () => {
    const starter = message(800);
    const associatedThread = { id: starter.id };
    const parent = {
        isTextBased: () => true,
        isThread: () => false,
        messages: { fetch: async () => starter },
        threads: { fetch: async id => id === starter.id ? associatedThread : null },
    };

    const resolved = await helpers.resolveThread(
        { channels: { fetch: async () => parent } },
        { channelId: 'parent-channel', messageId: starter.id },
    );
    assert.equal(resolved.thread, associatedThread);
    assert.equal(resolved.starter, starter);
});
