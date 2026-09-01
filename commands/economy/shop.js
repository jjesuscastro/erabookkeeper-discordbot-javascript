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
            const shop1 = [];
            const shop2 = [];

            for(const i of items){
                if(!(i.name.includes('Potion'))){
                    shop1.push(`**${i.name}** — *${i.price} edels* \n > ${i.itemdesc} \n`);
                }
                else
                    shop2.push(`**${i.name}** — *${i.price} edels* \n > ${i.itemdesc} \n`);
            }
            const embed = new EmbedBuilder()
                .setTitle('Eirenhel Services')
                .setColor(0xB7B75F)
                .setDescription(shop1.join('\n'))
                .setFooter({text:`Every shop item is a one time \`/use\``});

            const embed1 = new EmbedBuilder()
                .setColor(0xB7B75F)
                .setDescription(shop2.join('\n'))
                //.setDescription(items.map(i => `**${i.name}** — *${i.price} edels* \n > ${i.itemdesc} \n`).join('\n'))
                .setFooter({text:`Every shop item is a one time \`/use\``});

            await interaction.editReply({ embeds: [embed, embed1] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};

