// /buy <item> <quantity> — purchase an item from the shop
// Autocomplete reads from shop cache (warmed by /shop); falls back to Sheets if cache is cold

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, addInventoryItem } = require('../../utils/sheets');
const shop = require('./shop');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additem')
        .setDescription('Add to inventory (mod only)')
        .addUserOption(opt =>
            opt.setName('user').setDescription('Mun name').setRequired(true))
        .addStringOption(opt =>
            opt.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt =>
            opt.setName('quantity').setDescription('How many').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const input = interaction.options.getUser('user');

        await interaction.deferReply();
        try {
            const { characterName } = await getUser(input.id);

            await addInventoryItem(characterName, itemName, quantity);
            clearInventoryCache(input.id); // inventory changed — force fresh fetch on next autocomplete
            
            const embed = new EmbedBuilder()
            .setTitle('🛍️ Item Given!')
            .setColor(0xB7B75F)
            .setDescription(`Gave x${quantity} **${itemName}** to ${input.username}.`)

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
