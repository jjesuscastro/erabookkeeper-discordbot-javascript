// /givemoney <user> <amount> — admin only: add coins to a user (no one loses balance)
// <user> accepts a character name (autocomplete) or a Discord @mention
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addBalance } = require('../../utils/sheets');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givemoney')
        .setDescription('free money (mod use only)')
        .addStringOption(opt =>
            opt.setName('user').setDescription('Character name or @mention').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to give').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const choices = await autocompleteProfiles(focused);
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const input = interaction.options.getString('user');
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply();
        try {
            const target = await resolveTarget(input);
            const newBalance = await addBalance(target.discordId, amount);

            const embed = new EmbedBuilder()
                .setTitle('Yay Edels!')
                .setColor(0xB7B75F)
                .setDescription(`Gave **${amount}** edels to <@${target.discordId}>\nNew balance: ${newBalance} edels`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
