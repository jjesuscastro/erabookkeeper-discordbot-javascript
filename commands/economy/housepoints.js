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
            
            if(input.toLowerCase() ==='luna')
                const picture = 'https://i.gyazo.com/e895b504e3a89152e91cdb2bccd1812c.png';
            else if(input.toLowerCase() ==='solis')
                const picture = 'https://i.gyazo.com/807ed6c68623dd6b8e7778709e09a8f8.png';
            else
                const picture = 'https://i.gyazo.com/9bfe2be2895083682c6b9278e37f3b97.png';
            
            const embed = new EmbedBuilder()
                .setThumbnail(picture)
                .setTitle(`${input.charAt(0).toUpperCase()}${input.slice(1)} House Points`)
                .setColor(0xB7B75F)
                .setDescription(`\`\`\`✧ ${points} points ✧\`\`\``);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
