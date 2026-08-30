require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const mode = process.argv[2] ?? 'global';
const guildIdArg = process.argv[3];
const validModes = new Set(['global', 'dev', 'clear-dev']);

if (!validModes.has(mode)) {
    console.error(`Unknown deploy mode: ${mode}`);
    console.error('Expected one of: global, dev, clear-dev');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('Missing CLIENT_ID in environment.');
    process.exit(1);
}

if (!process.env.BOT_TOKEN) {
    console.error('Missing BOT_TOKEN in environment.');
    process.exit(1);
}

const guildId = mode === 'clear-dev' ? guildIdArg ?? process.env.GUILD_ID : process.env.GUILD_ID;

if ((mode === 'dev' || mode === 'clear-dev') && !guildId) {
    console.error('Missing guild id. Set GUILD_ID or pass one to clear:dev with: npm run clear:dev -- <guild_id>');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if (command.data) commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        if (mode === 'clear-dev') {
            console.log(`Clearing development commands for guild ${guildId}...`);
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: [] }
            );
            console.log('Successfully cleared development commands.');
            return;
        }

        const isDev = mode === 'dev';
        const route = isDev
            ? Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
            : Routes.applicationCommands(process.env.CLIENT_ID);
        const label = isDev ? `development commands for guild ${guildId}` : 'global commands';

        console.log(`Registering ${commands.length} ${label}...`);
        await rest.put(route, { body: commands });
        console.log(`Successfully registered ${label}.`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
