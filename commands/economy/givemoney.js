// /givemoney @user <amount> — admin only: add coins to a user (no one loses balance)
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addBalance } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givemoney')
        .setDescription('free money (mod use only)')
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

            var line = "Gave **" + amount + "** edels to <@" + target + ">\nNew balance: " + newBalance + " edels";
            
            const embed = new EmbedBuilder()
            .setTitle('Yay Edels!')
            .setColor(0xB7B75F)
            .setDescription(line);

            await interaction.editReply({ embeds: [embed] });

            //await interaction.editReply(`Gave **${amount}** to can${target}. New balance: **${newBalance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
