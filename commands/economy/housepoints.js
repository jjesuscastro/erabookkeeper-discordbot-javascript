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
            if(house==='luna')
                const picture = 'https://media.discordapp.net/attachments/1517194272846118993/1532812025473007666/luna_logo.png?ex=6a6e35f1&is=6a6ce471&hm=fe4cf6820a371f67a81cde5599caf56fa96f431df4090fbac6cd9ca2b6d1f4c4&=&format=webp&quality=lossless&width=592&height=570';
            else if(house==='solis')
                const picture = 'https://media.discordapp.net/attachments/1517194272846118993/1532812026106216509/solis.png?ex=6a6e35f1&is=6a6ce471&hm=3bce5929e7e6019c4efc4f6868233d12611c606e06468a6a2ce3e609bc495d19&=&format=webp&quality=lossless&width=804&height=805';
            else
                const picture = 'https://media.discordapp.net/attachments/1517194272846118993/1532812026718720130/astra.png?ex=6a6e35f1&is=6a6ce471&hm=ed642578f181606577bed6ca463efda8471ea616cfc474fc435d98cfb6e06fd6&=&format=webp&quality=lossless&width=660&height=660';
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
