// /transfermoney @user <amount> — send coins to another user (deducted from your balance)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { deductBalance, addBalance } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfermoney')
        .setDescription('Transfer money to another user')
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to send money to').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to transfer').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const sender = interaction.user;

        if (target.id === sender.id) return interaction.reply({ content: 'You cannot transfer money to yourself.', ephemeral: true });
        if (target.bot) return interaction.reply({ content: 'You cannot transfer money to a bot.', ephemeral: true });

        await interaction.deferReply();
        try {
            // Deduct first — if this fails (insufficient funds), addBalance is never called
            const newBalance = await deductBalance(sender.id, amount);
            await addBalance(target.id, amount);
            
            var line = "Transferred **" + amount + "** edels from <@" + sender + "> to <@" + target + ">";
            
            const embed = new EmbedBuilder()
            .setTitle('Edels Transferred!')
            .setColor(0xB7B75F)
            .setDescription(line);

            await interaction.editReply({ embeds: [embed] });
            
            //await interaction.editReply(`Transferred **${amount}** to ${target}. Your balance: **${newBalance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
