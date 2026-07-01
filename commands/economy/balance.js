// /balance [user] — check your own or another user's coin balance
// [user] accepts a character name (autocomplete) or a Discord @mention; omit for self
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../../utils/sheets');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check a user's balance")
        .addStringOption(opt =>
            opt.setName('user').setDescription('Character name or @mention (default: you)').setRequired(false).setAutocomplete(true)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const choices = await autocompleteProfiles(focused);
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const input = interaction.options.getString('user');
        await interaction.deferReply();
        try {
            let userId;
            if (input) {
                const target = await resolveTarget(input);
                userId = target.discordId;
            } else {
                userId = interaction.user.id;
            }

            const { characterName, balance } = await getUser(userId);

            const embed = new EmbedBuilder()
                .setTitle(`${characterName}'s balance`)
                .setColor(0xB7B75F)
                .setDescription(`\`\`\`✧ ${balance} edels ✧\`\`\``);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
