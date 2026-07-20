require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Book Keeper — main entry point
// Loads all commands from /commands subfolders and routes Discord interactions

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
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

client.once('ready', async () => {
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
        if (command?.autocomplete) await command.autocomplete(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);
        const reply = { content: 'An error occurred while executing that command.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

client.login(process.env.BOT_TOKEN);
