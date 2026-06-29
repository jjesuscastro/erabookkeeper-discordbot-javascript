// /balance [@user] — check your own or another user's coin balance
const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check a user's balance")
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to check (defaults to yourself)').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        await interaction.deferReply();
        try {
            const { characterName, balance } = await getUser(target.id);
            await interaction.editReply(`**${characterName}**'s balance: **${balance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
