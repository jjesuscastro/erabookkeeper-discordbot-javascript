// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getTupperList, getUser } = require('../../utils/sheets');
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
        const target = interaction.options.getUser('user') ?? interaction.user;
        
        await interaction.deferReply();
        try {
            const allTuppers = await getTupperList(target.id);
            const user = await getUser(target.id); 

            allTuppers.sort((a,b) => b.tupperName - a.tupperName );
            
            var list = allTuppers.map(i => i.playerChara==='TRUE' ? `**${i.tupperName}** - \`PLAYER CHARACTER\``:`**${i.tupperName}** - \`NPC\``).join('\n');
            
            if (allTuppers.length === 0) list = "No tuppers registered :("
            
            const embed = new EmbedBuilder()
                .setTitle(`📜 ${user.characterName}'s Tuppers`)
                .setColor(0xB7B75F)
                .setDescription(list);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
