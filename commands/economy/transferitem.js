// /transferitem <user> <item> <quantity> — give items from your inventory to another user
// <user> accepts a character name (autocomplete) or a Discord @mention
// Item autocomplete reads from sender's inventory cache; falls back to Sheets if cold
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, getInventory, removeInventoryItem, addInventoryItem } = require('../../utils/sheets');
const { getInventoryCache, clearInventoryCache } = require('../../utils/cache');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transferitem')
        .setDescription('Give an item from your inventory to another user')
        .addStringOption(opt =>
            opt.setName('user').setDescription('Character name or @mention').setRequired(true).setAutocomplete(true))
        .addStringOption(opt =>
            opt.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('quantity').setDescription('How many to transfer').setMinValue(1).setRequired(true)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);

        if (focused.name === 'user') {
            const choices = await autocompleteProfiles(focused.value);
            return interaction.respond(choices);
        }

        if (focused.name === 'item') {
            let items = getInventoryCache(interaction.user.id);
            if (!items) {
                const { characterName } = await getUser(interaction.user.id);
                items = await getInventory(characterName);
            }
            return interaction.respond(items.map(i => ({ name: `${i.itemName} x${i.quantity}`, value: i.itemName })));
        }
    },

    async execute(interaction) {
        const input = interaction.options.getString('user');
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const sender = interaction.user;

        await interaction.deferReply();
        try {
            const target = await resolveTarget(input);

            if (target.discordId === sender.id) {
                return interaction.editReply('You cannot transfer items to yourself.');
            }

            const { characterName: senderName } = await getUser(sender.id);

            await removeInventoryItem(senderName, itemName, quantity);
            await addInventoryItem(target.characterName, itemName, quantity);
            clearInventoryCache(sender.id);
            clearInventoryCache(target.discordId);

            const embed = new EmbedBuilder()
                .setTitle('Item Transferred!')
                .setColor(0xB7B75F)
                .setDescription(`Transferred x${quantity} **${itemName}** from <@${sender.id}> to <@${target.discordId}>`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
