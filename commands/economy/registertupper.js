// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addTupper } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registertupper')
        .setDescription('add a new tupper to your roster')
        .addStringOption(opt =>
            opt.setName('name').setDescription('make sure its exactly the same as your tupper!').setRequired(true))
        .addBooleanOption(opt =>
            opt.setName('pc').setDescription('false if npc').setRequired(true)),
        
    async execute(interaction) {
        const tupperName = interaction.options.getString('name');
        const playerChara = interaction.options.getBoolean('pc');

        await interaction.deferReply();
        try {
            
            await addTupper(interaction.user.id, tupperName, playerChara);

            const embed = new EmbedBuilder()
                .setTitle('Congratulations!')
                .setColor(0xB7B75F)
                .setDescription(`tupper registered`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
