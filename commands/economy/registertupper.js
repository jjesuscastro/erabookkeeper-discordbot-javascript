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
            opt.setName('pc').setDescription('false if npc').setRequired(true))
        .addUserOption(opt =>
            opt.setName('user').setDescription('user to check (default: you)').setRequired(false)),

    async execute(interaction) {
        const tupperName = interaction.options.getString('name');
        const playerChara = interaction.options.getBoolean('pc');
        const target = interaction.options.getUser('user') ?? interaction.user;
        
        await interaction.deferReply();
        try {
            const userId = target.id;
            
            await addTupper(userId, tupperName, playerChara);

            const embed = new EmbedBuilder()
                .setTitle('📜 OC Added!')
                .setColor(0xB7B75F)
                .setDescription(`Tupper Name: **${tupperName}** \nMun: <@${userId}>`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
