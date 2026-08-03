// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addTupper } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registertupper')
        .addStringOption(opt =>
            opt.setName('tupper name').setDescription('make sure its exactly the same as your tupper!').setRequired(true))
        .addBooleanOption(opt =>
            opt.setName('player character').setDescription('false if npc').setMinValue(1).setRequired(true)),
        
    async execute(interaction) {
        const tupperName = interaction.options.getString('tupper name');
        const playerChara = interaction.options.getBoolean('player character');

        await interaction.deferReply();
        try {
            
            await addTupper(interaction.user.id, tupperName, playerChara);

            const embed = new EmbedBuilder()
                .setTitle('Congratulations!')
                .setColor(0xB7B75F)
                .setDescription(`tupper registered`)
                //.setFooter({text:`Keep up the good work!`});

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
