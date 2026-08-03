// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addTupper } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registertupper')
        .setDescription('add a new tupper to your roster')
        .addStringOption(opt =>
            opt.setName('user').setDescription('Who owns the OC (default: you)').setRequired(false).setAutocomplete(true))
        .addStringOption(opt =>
            opt.setName('name').setDescription('make sure its exactly the same as your tupper!').setRequired(true))
        .addBooleanOption(opt =>
            opt.setName('pc').setDescription('false if npc').setRequired(true)),
    
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const choices = await autocompleteProfiles(focused);
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const tupperName = interaction.options.getString('name');
        const playerChara = interaction.options.getBoolean('pc');
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
            
            await addTupper(userId, tupperName, playerChara);

            const embed = new EmbedBuilder()
                .setTitle('OC Added!')
                .setColor(0xB7B75F)
                .setDescription(`📜 New tupper: ${tupperName}`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
