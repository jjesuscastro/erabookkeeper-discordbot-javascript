// /takemoney <user> <amount> — admin only: remove coins from a user and destroy them
// <user> accepts a character name (autocomplete) or a Discord @mention
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { deductBalance } = require('../../utils/sheets');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('takemoney')
        .setDescription("give us your money (mod only)")
        .addStringOption(opt =>
            opt.setName('user').setDescription('Character name or @mention').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to take').setMinValue(1).setRequired(true))
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
            const newBalance = await deductBalance(target.discordId, amount);

            const embed = new EmbedBuilder()
                .setTitle('Goodbye Edels...')
                .setColor(0xB7B75F)
                .setDescription(`Took **${amount}** edels from <@${target.discordId}>\nNew balance: ${newBalance} edels`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
