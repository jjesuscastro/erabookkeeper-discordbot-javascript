// /transfermoney <user> <amount> — send coins to another user (deducted from your balance)
// <user> accepts a character name (autocomplete) or a Discord @mention
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { deductBalance, addBalance } = require('../../utils/sheets');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfermoney')
        .setDescription('Transfer money to another user')
        .addStringOption(opt =>
            opt.setName('user').setDescription('Character name or @mention').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to transfer').setMinValue(1).setRequired(true)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const choices = await autocompleteProfiles(focused);
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const input = interaction.options.getString('user');
        const amount = interaction.options.getInteger('amount');
        const sender = interaction.user;

        await interaction.deferReply();
        try {
            const target = await resolveTarget(input);

            if (target.discordId === sender.id) {
                const embed = new EmbedBuilder()
                    .setTitle('Uh oh...')
                    .setColor(0xB7B75F)
                    .setDescription('You cannot transfer money to yourself!');
                return interaction.editReply({ embeds: [embed] });
            }

            const newBalance = await deductBalance(sender.id, amount);
            await addBalance(target.discordId, amount);

            const embed = new EmbedBuilder()
                .setTitle('Edels Transferred!')
                .setColor(0xB7B75F)
                .setDescription(`Transferred **${amount}** edels from <@${sender.id}> to <@${target.discordId}>`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
