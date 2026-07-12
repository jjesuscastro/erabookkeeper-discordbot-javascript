// /givepoints <house> <amount> — admin only: give points to a house
// <user> accepts a character name (autocomplete) or a Discord @mention
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addPoints } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deducthousepoints')
        .setDescription('(mod only)')
        .addStringOption(opt =>
            opt.setName('house').setDescription('Luna, Solis, or Astra').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to give').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const input = interaction.options.getString('house');
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply();
        try {
            const newBalance = await deductPoints(input, amount);

            const embed = new EmbedBuilder()
                .setTitle('Congratulations!')
                .setColor(0xB7B75F)
                .setDescription(`House **${input.charAt(0).toUpperCase()}${input.slice(1)}** has gained ${amount} points!\nCurrent standing: ${newBalance} points.`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
