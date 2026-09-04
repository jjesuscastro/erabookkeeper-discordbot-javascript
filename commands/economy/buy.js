// /buy <item> <quantity> - purchase an item from the shop
// Autocomplete reads from shop cache (warmed by /shop); falls back to the data source if cache is cold.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, getShopItems, getInventory, purchaseShopItem } = require('../../utils/sheets');
const { getShopCache, setShopCache, clearInventoryCache } = require('../../utils/cache');
const { logStockDeduction } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop')
        .addStringOption(opt =>
            opt.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('quantity').setDescription('How many to buy').setMinValue(1).setRequired(true)),

    async autocomplete(interaction) {
        const items = getShopCache() ?? await getShopItems();
        await interaction.respond(items.map(i => ({ name: `${i.name} - ${i.price}`, value: i.name })));
    },

    async execute(interaction) {
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');

        await interaction.deferReply();
        try {
            const items = getShopCache() ?? await getShopItems();
            const shopItem = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (!shopItem) {
                const embed = new EmbedBuilder()
                    .setTitle('Uh oh...')
                    .setColor(0xEBBCA2)
                    .setDescription(`**${itemName}** not found. Check out \`/shop\` to see our available items.`);

                return interaction.editReply({ embeds: [embed] });
            }

            const totalCost = shopItem.price * quantity;

            const { characterName, balance } = await getUser(interaction.user.id);
            if (balance < totalCost) {
                let edels = 'edels';
                if (balance === 1) edels = 'edel';

                const embed = new EmbedBuilder()
                    .setTitle('Uh oh...')
                    .setColor(0xEBBCA2)
                    .setDescription(`You don't have enough money! You only have ${balance} ${edels}.`);

                return interaction.editReply({ embeds: [embed] });
            }

            if (shopItem.name.toLowerCase() === 'house mascot plush') {
                const allItems = await getInventory(characterName);
                const existing = allItems.filter(i => i.itemName === 'House Mascot Plush');
                if (existing.length > 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('Uh oh...')
                        .setColor(0xEBBCA2)
                        .setDescription('You already have a plush in your inventory!');

                    return interaction.editReply({ embeds: [embed] });
                }
            }

            const purchase = await purchaseShopItem(interaction.user.id, characterName, shopItem.name, quantity);
            clearInventoryCache(interaction.user.id);
            setShopCache(null);
            logStockDeduction(interaction, {
                itemName: purchase.itemName,
                quantity,
                previousStock: purchase.previousStock,
                currentStock: purchase.remainingStock,
            });

            let edels = 'edels';
            if (purchase.newBalance === 1) edels = 'edel';

            const embed = new EmbedBuilder()
                .setTitle('Item bought!')
                .setColor(0xB7B75F)
                .setDescription(`Purchased x${quantity} **${purchase.itemName}** for ${purchase.totalCost} edels.`)
                .setFooter({ text: `- New balance: ${purchase.newBalance} ${edels}.` });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            if (err.message === 'No stocks left.') {
                return interaction.editReply('No stocks left.');
            }

            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
