// /transferitem @user <item> <quantity> — give items from your inventory to another user
// Autocomplete reads from sender's inventory cache; falls back to Sheets if cold
const { SlashCommandBuilder } = require('discord.js');
const { getUser, getInventory, removeInventoryItem, addInventoryItem } = require('../../utils/sheets');
const { getInventoryCache, clearInventoryCache } = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transferitem')
        .setDescription('Give an item from your inventory to another user')
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to give the item to').setRequired(true))
        .addStringOption(opt =>
            opt.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('quantity').setDescription('How many to transfer').setMinValue(1).setRequired(true)),

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
        const target = interaction.options.getUser('user');
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const sender = interaction.user;

        if (target.id === sender.id){ 
            
            return interaction.reply({ content: 'You cannot transfer items to yourself.', ephemeral: true });
        }
        if (target.bot) return interaction.reply({ content: 'You cannot transfer items to a bot.', ephemeral: true });

        await interaction.deferReply();
        try {
            // Resolve both users' character names before touching inventory
            const { characterName: senderName } = await getUser(sender.id);
            const { characterName: receiverName } = await getUser(target.id);

            await removeInventoryItem(senderName, itemName, quantity);
            await addInventoryItem(receiverName, itemName, quantity);
            // Clear both sides — sender lost items, receiver gained them
            clearInventoryCache(sender.id);
            clearInventoryCache(target.id);

            var line = "Transferred x" + quantity + " **" + itemName + "** from <@" + sender + "> to <@" + target + ">";
            
            const embed = new EmbedBuilder()
            .setTitle('Item Transferred!')
            .setColor(0xB7B75F)
            .setDescription(line);

            await interaction.editReply({ embeds: [embed] });

            //await interaction.editReply(`Transferred **${quantity}x ${itemName}** to ${target}.`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
