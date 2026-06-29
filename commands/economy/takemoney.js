// /takemoney @user <amount> — admin only: remove coins from a user and destroy them
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { deductBalance } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('takemoney')
        .setDescription("Take and trash money from a user's balance (admin only)")
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to take money from').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to take').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply();
        try {
            // Coins are deducted and not given to anyone — they're simply removed
            const newBalance = await deductBalance(target.id, amount);
            await interaction.editReply(`Took **${amount}** from ${target}. Their new balance: **${newBalance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
