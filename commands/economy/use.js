// /use <item> <quantity> — consume items from your inventory
// Autocomplete reads from inventory cache (warmed by /inventory); falls back to Sheets if cold
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, getInventory, removeInventoryItem } = require('../../utils/sheets');
const { getInventoryCache, clearInventoryCache } = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use (consume) an item from your inventory')
        .addStringOption(opt =>
            opt.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('quantity').setDescription('How many to use').setMinValue(1).setRequired(true)),

    async autocomplete(interaction) {
        let items = getInventoryCache(interaction.user.id);
        if (!items) {
            // Cache is cold — resolve character name first, then fetch inventory
            const { characterName } = await getUser(interaction.user.id);
            items = await getInventory(characterName);
        }
        await interaction.respond(items.map(i => ({ name: `${i.itemName} x${i.quantity}`, value: i.itemName })));
    },

    async execute(interaction) {
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const target = interaction.user;

        await interaction.deferReply();
        try {
            const { characterName } = await getUser(interaction.user.id);
            await removeInventoryItem(characterName, itemName, quantity);
            clearInventoryCache(interaction.user.id); // inventory changed — force fresh fetch on next autocomplete
            
            const embed = new EmbedBuilder()
                .setTitle('Item Used!')
                .setColor(0xCEA45A)
                .setDescription(`<@${target.id}> used x${quantity} **${itemName}**`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            if(err.message === 'Item does not exist.'){
                const embed = new EmbedBuilder()
                    .setTitle('❌ Uh oh...')
                    .setColor(0xEBBCA2)
                    .setDescription(`**${itemName}** not found.`)
                await interaction.editReply({ embeds: [embed] });
            
            }
            else if(err.message === 'Insufficient quantity.'){
                const embed = new EmbedBuilder()
                    .setTitle('❌ Uh oh...')
                    .setColor(0xEBBCA2)
                    .setDescription(`You don't have enough **${itemName}** to transfer.`)
                await interaction.editReply({ embeds: [embed] });
            }
            else await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
