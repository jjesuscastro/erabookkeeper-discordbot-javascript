// /profile [user] — display a character's profile (name, age, pronouns, height, balance)
// [user] accepts a character name (autocomplete) or @mention; omit for self
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../../utils/sheets');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("View a character's profile")
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

            const { characterName, age, pronouns, height, profile, balance } = await getUser(userId);

            const embed = new EmbedBuilder()
                .setTitle(characterName)
                .setColor(0xB7B75F)
                .addFields(
                    { name: 'Age',      value: age      || '—', inline: true },
                    { name: 'Pronouns', value: pronouns || '—', inline: true },
                    { name: 'Height',   value: height   || '—', inline: true },
                    { name: 'Profile',  value: profile  || '—', inline: true },
                    { name: 'Balance',  value: `${balance} edels`, inline: true },
                );

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
