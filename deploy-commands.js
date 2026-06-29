require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Run this script once whenever you add, remove, or rename a slash command.
// Guild-scoped commands (GUILD_ID) register instantly during development.
// To go global later, swap Routes.applicationGuildCommands → Routes.applicationCommands
// and remove the GUILD_ID argument.

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

// Collect the JSON definition from every command file
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
        console.log(`Registering ${commands.length} application command(s)...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('Successfully registered application commands.');
    } catch (err) {
        console.error(err);
    }
})();
