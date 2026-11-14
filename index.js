require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logAutocompleteUsage, logCommandUsage, logInteractionError } = require('./utils/logger');

process.on('unhandledRejection', err => {
    console.error('Unhandled promise rejection:', err);
});

process.on('uncaughtException', err => {
    console.error('Uncaught exception:', err);
});

// Book Keeper — main entry point
// Loads all commands from /commands subfolders and routes Discord interactions

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Reaction],
});
client.commands = new Collection();

// Dynamically load every command file from commands/<folder>/<file>.js
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
        }
    }
}

client.once('clientReady', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    try {
        const { getAllProfiles, getShopItems } = require('./utils/sheets');
        const { setProfilesCache, setShopCache } = require('./utils/cache');
        const [profiles, shopItems] = await Promise.all([getAllProfiles(), getShopItems()]);
        setProfilesCache(profiles);
        setShopCache(shopItems);
        console.log(`Cache warmed: ${profiles.length} profiles, ${shopItems.length} shop items`);
    } catch (err) {
        console.error('Failed to warm cache on startup:', err);
    }
});

client.on('interactionCreate', async interaction => {
    // Handle autocomplete before command execution so item dropdowns work
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        logAutocompleteUsage(interaction);
        if (command?.autocomplete) {
            try {
                await command.autocomplete(interaction);
            } catch (err) {
                logInteractionError('Autocomplete failed', err, interaction);
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        logCommandUsage(interaction);
        await command.execute(interaction);
    } catch (err) {
        logInteractionError('Command failed', err, interaction);
        try {
            const reply = { content: 'An error occurred while executing that command.', ephemeral: true };
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        } catch (replyErr) {
            console.error('Failed to send command error response:', replyErr);
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot || reaction.emoji.name !== '🎨') return;

    const destinationId = process.env.FORWARD_CHANNEL_ID;
    if (!destinationId) {
        console.error('Cannot forward art-reacted message: FORWARD_CHANNEL_ID is not configured.');
        return;
    }

    try {
        if (reaction.partial) await reaction.fetch();
        const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
        if (!message.guild || message.channel.id === destinationId) return;

        const { claimForwardedMessage, releaseForwardedMessage } = require('./utils/forwarded-messages');
        const claimed = await claimForwardedMessage(message.id);
        if (!claimed) return;

        try {
            const destination = await client.channels.fetch(destinationId);
            if (!destination?.isTextBased() || !destination.messages) {
                throw new Error('FORWARD_CHANNEL_ID must refer to a text channel the bot can access.');
            }

            const authorId = message.author.id;
            const author = message.author?.tag || 'Unknown user';
            const sourceChannel = message.channel.name ? `#${message.channel.name}` : 'a channel';
            const attachmentLinks = [...message.attachments.values()].map(file => file.url);
            const body = [message.content, ...attachmentLinks].filter(Boolean).join('\n');
            const attribution = `🎨 **<@${authorId}>** in <#${message.channel.id}>`;
            //const attribution = `🎨 **${author}** in <#${message.channel.id}>\n> [link to post](${message.url})`;
            const maxBodyLength = Math.max(0, 2000 - attribution.length - 5);
            const forwardedBody = body.length > maxBodyLength ? `${body.slice(0, maxBodyLength - 1)}…` : body;
            await destination.send({
                //content: [attribution, forwardedBody].filter(Boolean).join('\n\n'),
                content: [attribution].filter(Boolean).join('\n\n'),
                allowedMentions: { parse: [] },
            });
            await message.forward(destination);
        } catch (error) {
            await releaseForwardedMessage(message.id).catch(dbError => {
                console.error('Failed to release forwarding claim:', dbError);
            });
            throw error;
        }
    } catch (error) {
        console.error('Failed to forward art-reacted message:', error);
    }
});

client.login(process.env.BOT_TOKEN);
