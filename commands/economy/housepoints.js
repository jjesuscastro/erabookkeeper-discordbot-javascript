// /housepoints <name> — check a house points
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHousePoints } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('housepoints')
        .setDescription("Check a house's current points")
        .addStringOption(opt =>
            opt.setName('house').setDescription('Luna, Solis, or Astra').setRequired(true).setAutocomplete(false)),

    async execute(interaction) {
        const input = interaction.options.getString('house');
        await interaction.deferReply();
        try {
            const points = await getHousePoints(input);
            const embed = new EmbedBuilder()
                .setTitle(`${input.charAt(0).toUpperCase()}${input.slice(1)} House Points`)
                .setColor(0xB7B75F)
                .setDescription(`\`\`\`✧ ${points} points ✧\`\`\``);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
