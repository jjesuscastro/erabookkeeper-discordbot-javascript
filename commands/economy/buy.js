// /buy <item> <quantity> — purchase an item from the shop
// Autocomplete reads from shop cache (warmed by /shop); falls back to Sheets if cache is cold
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, getShopItems, deductBalance, addInventoryItem } = require('../../utils/sheets');
const { getShopCache, clearInventoryCache } = require('../../utils/cache');
const shop = require('./shop');

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
        await interaction.respond(items.map(i => ({ name: `${i.name} (${i.price} coins)`, value: i.name })));
    },

    async execute(interaction) {
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');

        await interaction.deferReply();
        try {
            const items = getShopCache() ?? await getShopItems();
            const shopItem = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (!shopItem){ 
                const embed = new EmbedBuilder()
                    .setTitle('❌ Uh oh...')
                    .setColor(0xEBBCA2)
                    .setDescription(`**${itemName}** is not in the shop. Check out \`/shop\` to see our available items.`)

                    return interaction.editReply({ embeds: [embed] });
            }
            
            const totalCost = shopItem.price * quantity;

            // Resolve character name before touching inventory
            const { characterName } = await getUser(interaction.user.id);
            const newBalance = await deductBalance(interaction.user.id, totalCost);
            await addInventoryItem(characterName, shopItem.name, quantity);
            clearInventoryCache(interaction.user.id); // inventory changed — force fresh fetch on next autocomplete

            var edels = "edels";
            if(newBalance === 1)
                edels = "edel"; 
            
            const embed = new EmbedBuilder()
            .setTitle('🛍️ Item bought!')
            .setColor(0xB7B75F)
            .setDescription(`Purchased x${quantity} **${shopItem.name}** for ${totalCost} edels.`)
            .setFooter({text:`— New balance: ${newBalance} ${edels}.`});

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
