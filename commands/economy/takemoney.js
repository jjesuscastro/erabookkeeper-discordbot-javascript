// /takemoney @user <amount> — admin only: remove coins from a user and destroy them
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { deductBalance } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('takemoney')
        .setDescription("give us your money (mod only)")
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to take edels from').setRequired(true))
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
            var line = "Took **" + amount + "** edels from <@" + target + ">\nNew balance: " + newBalance + " edels";
            
            const embed = new EmbedBuilder()
            .setTitle('Goodbye Edels...')
            .setColor(0xB7B75F)
            .setDescription(line);

            await interaction.editReply({ embeds: [embed] });
            
            //await interaction.editReply(`Took **${amount}** from ${target}. Their new balance: **${newBalance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
