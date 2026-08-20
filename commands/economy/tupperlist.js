// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getTupperList, getUser } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tupperlist')
        .setDescription('see all registered tuppers under a user')
        .addUserOption(opt =>
            opt.setName('user').setDescription('user to check (default: you)').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
            
        await interaction.deferReply();
        try {
            const { characterName } = await getUser(target.id);
            const allTuppers = await getTupperList(target.id);

            allTuppers.sort((a,b) => b.tupperName - a.tupperName );
            
            var list = allTuppers.map(i => i.playerChara==='TRUE' ? `**${i.tupperName}** - \`PLAYER CHARACTER\``:`**${i.tupperName}** - \`NPC\``).join('\n');
            
            if (allTuppers.length === 0) list = "No tuppers registered :("
            
            const embed = new EmbedBuilder()
                .setTitle(`📜 ${target.username}'s Tuppers`)
                .setColor(0xB7B75F)
                .setDescription(list);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
