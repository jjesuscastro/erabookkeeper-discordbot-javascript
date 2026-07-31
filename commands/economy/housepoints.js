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
            
            if(input.toLowerCase() ==='luna'){
                var picture = 'https://i.gyazo.com/586f175c28889ba68a223f5f22d813d3.png';
                var color = '0xA3D1F9';
            }
            else if(input.toLowerCase() ==='solis'){
                var picture = 'https://i.gyazo.com/807ed6c68623dd6b8e7778709e09a8f8.png';
                var color = '0xFFE1B7';
            }
            else{
                var picture = 'https://i.gyazo.com/9bfe2be2895083682c6b9278e37f3b97.png';
                var color = '0xDDB0FF';
            }
            const embed = new EmbedBuilder()
                .setThumbnail(picture)
                .setTitle(`${input.charAt(0).toUpperCase()}${input.slice(1)} House Points`)
                .setColor(color)
                .setDescription(`\`\`\`✧ ${points} points ✧\`\`\``);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
