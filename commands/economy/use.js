// /use <item> <quantity> — consume items from your inventory
// Autocomplete reads from inventory cache (warmed by /inventory); falls back to Sheets if cold

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, getInventory, removeInventoryItem, addPoints } = require('../../utils/sheets');
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
        await interaction.respond(items.map(i => ({ name: `${i.itemName} (x${i.quantity})`, value: i.itemName })));
    },

    async execute(interaction) {
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const target = interaction.user;

        await interaction.deferReply();
        try {
            const { characterName, house } = await getUser(interaction.user.id);
            let embed;
            
            await removeInventoryItem(characterName, itemName, quantity);
            clearInventoryCache(interaction.user.id); // inventory changed — force fresh fetch on next autocomplete
            if(itemName == "House Mascot Plush"){
                const newBalance = await addPoints(house, 20);
                embed = new EmbedBuilder()
                .setTitle('House Mascot Plush Used!')
                .setColor(0xB7B75F)
                .setDescription(`<@${target.id}> used their **${itemName}**.\n+20 points to **${house}**!`);
            }
            else if(itemName == 'Unknown Potion'){
                const choices = [
                    '2P Potion: Your personality is does a 180.',
                    'Kemonomimi Potion: You grow ears and a tail! (Animal of your choice)',    
                    'Hair Potion: Your hair length and color changes. (Length/Color of your choice)',
                    'Screaming Potion: You can only yell.'
                ];
                const size = choices.length;

                const final = Math.floor(Math.random() * size) + 1; 
                const hours = Math.floor(Math.random() * 24) + 1; 

                embed = new EmbedBuilder()
                    .setTitle(`Unknown Potion Used!`)
                    .setColor(0xB7B75F)
                    .setDescription(`${choices[final-1]}\nLasts for ${hours} hours.`);
            }
            else{
                embed = new EmbedBuilder()
                .setTitle('Item Used!')
                .setColor(0xB7B75F)
                .setDescription(`<@${target.id}> used x${quantity} **${itemName}**`);
            }

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
                    .setDescription(`You don't have enough **${itemName}** to use.`)
                await interaction.editReply({ embeds: [embed] });
            }
            else await interaction.editReply(`Error: ${err.message}`);
        }
    },
};

