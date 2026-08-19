const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('choose an option from a list')
        .addStringOption(opt =>
            opt.setName('options').setDescription('separated by |').setRequired(true)),
        
    async execute(interaction) {
        const input = interaction.options.getString('options');

        await interaction.deferReply();
        try {
            const choices = input.split('|');
            const size = choices.length;

            const final = Math.floor(Math.random() * size) + 1; 

            const embed = new EmbedBuilder()
                .setTitle(`${choices[final-1]}`)
                .setColor(0xB7B75F)
                .setDescription(`${input}`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
