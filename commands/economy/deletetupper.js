// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { deleteTupper } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deletetupper')
        .setDescription('delete one of your tuppers')
        .addStringOption(opt =>
            opt.setName('name').setDescription('make sure its exactly the same as your tupper!').setRequired(true)),

    async execute(interaction) {
        const tupperName = interaction.options.getString('name');
        const target = interaction.user;
        
        await interaction.deferReply();
        try {
            const userId = target.id;
            
            await deleteTupper(tupperName);

            const embed = new EmbedBuilder()
                .setTitle('📜 OC Deleted!')
                .setColor(0xB7B75F)
                .setDescription(`**${tupperName}** deleted from list. See \`/tupperlist\` to view all your tuppers.`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
