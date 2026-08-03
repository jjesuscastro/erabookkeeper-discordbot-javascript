// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addTupper } = require('../../utils/sheets');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tupperlist')
        .setDescription('see all registered tuppers under a user')
        .addStringOption(opt =>
            opt.setName('user').setDescription('Who owns the OC (default: you)').setRequired(false).setAutocomplete(true)),
    
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
            
            
            const embed = new EmbedBuilder()
                .setTitle('📜 OC Added!')
                .setColor(0xB7B75F)
                .setDescription(`New tupper: ${tupperName}`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
