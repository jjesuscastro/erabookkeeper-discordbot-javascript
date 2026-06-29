// /givemoney @user <amount> — admin only: add coins to a user (no one loses balance)
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addBalance } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givemoney')
        .setDescription('Add coins to a user (admin only)')
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to give coins to').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to give').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply();
        try {
            const newBalance = await addBalance(target.id, amount);
            await interaction.editReply(`Gave **${amount}** to ${target}. New balance: **${newBalance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
