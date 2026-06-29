// /inventory — view your own inventory
// Also warms the inventory cache so /use and /transferitem autocomplete works without hitting Sheets again
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, getInventory } = require('../../utils/sheets');
const { setInventoryCache } = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory'),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            // Resolve Discord user → character name before querying inventory
            const { characterName } = await getUser(interaction.user.id);
            const allItems = await getInventory(characterName);
            const items = allItems.filter(i => i.quantity > 0);
            setInventoryCache(interaction.user.id, items); // warm cache for /use and /transferitem autocomplete

            if (items.length === 0) return interaction.editReply('Your inventory is empty.');

            const embed = new EmbedBuilder()
                .setTitle(`${characterName}'s Inventory`)
                .setColor(0x3498db)
                .setDescription(items.map(i => `**${i.itemName}** x${i.quantity}`).join('\n'));

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
