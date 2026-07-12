// /shop — display all available items and their prices
// Also warms the shop cache so /buy autocomplete works without hitting Sheets again
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStandings } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('housestandings')
        .setDescription('View the current ranks of each house'),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const items = await getStandings();

            const embed = new EmbedBuilder()
                .setTitle('House Standings')
                .setColor(0xCEA45A)
                .setDescription(items.map(i => `**${i.house}** — *${i.points} points./*`).join('\n'));

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
