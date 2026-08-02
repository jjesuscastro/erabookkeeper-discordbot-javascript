// /inventory — view your own inventory
// Also warms the inventory cache so /use and /transferitem autocomplete works without hitting Sheets again
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, getInventory } = require('../../utils/sheets');
const { setInventoryCache } = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View a user\'s inventory')
        .addUserOption(opt =>
            opt.setName('user').setDescription('user to check (default: you)').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        await interaction.deferReply();
        try {
            // Resolve Discord user → character name before querying inventory
            const { characterName, balance } = await getUser(target.id);
            
            const allItems = await getInventory(characterName);
            const items = allItems.filter(i => i.quantity > 0);
            setInventoryCache(target.id, items); // warm cache for /use and /transferitem autocomplete
            items.sort((a,b) => b.quantity - a.quantity );
            const line = `**BALANCE**\n\`\`\`✧ ${balance} edels ✧\`\`\`\n**ITEMS**\n`;
            
            var inv = items.map(i => `\`x${i.quantity.toString().padStart(items[0].quantity.toString().length)}\` **${i.itemName}**`).join('\n');
            
            if (items.length === 0) inv = "Nothing inside :("
            
            const embed = new EmbedBuilder()
                .setTitle(`📚 ${characterName}'s Inventory`)
                .setColor(0xB7B75F)
                .setDescription(line + inv);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
