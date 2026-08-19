// /shop — display all available items and their prices
// Also warms the shop cache so /buy autocomplete works without hitting Sheets again
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllBalances } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('allbalances')
        .setDescription('View all player balances.'),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const items = await getAllBalances();
            items.sort((a,b) => b.balance - a.balance );
    
            const embed = new EmbedBuilder()
                .setTitle('All Balances')
                .setColor(0xB7B75F)
                .setDescription(items.map(i => `**${i.index+1}**. **${i.character}** — *${i.balance} edels*`).join('\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
