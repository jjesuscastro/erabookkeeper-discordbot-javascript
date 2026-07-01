// /shop — display all available items and their prices
// Also warms the shop cache so /buy autocomplete works without hitting Sheets again
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getShopItems } = require('../../utils/sheets');
const { setShopCache } = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View available items in the shop'),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const items = await getShopItems();
            setShopCache(items); // warm cache for /buy autocomplete
            if (items.length === 0) return interaction.editReply('The shop is currently empty.');

            const embed = new EmbedBuilder()
                .setTitle('Eirenhel Services')
                .setColor(0xCEA45A)
                .setDescription(items.map(i => `**${i.name}** — *${i.price} edels* \n > ${i.itemdesc} \n`).join('\n'));

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
