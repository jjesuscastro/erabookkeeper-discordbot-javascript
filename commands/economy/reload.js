// /reload — admin only: refresh profiles, shop, and all inventory caches from Sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllProfiles, getShopItems } = require('../../utils/sheets');
const { setProfilesCache, setShopCache, clearAllInventoryCache } = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Refresh all caches from the sheet (mod only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        try {
            const [profiles, shopItems] = await Promise.all([getAllProfiles(), getShopItems()]);
            setProfilesCache(profiles);
            setShopCache(shopItems);
            clearAllInventoryCache();

            const embed = new EmbedBuilder()
                .setTitle('Cache Reloaded')
                .setColor(0xB7B75F)
                .setDescription(`Refreshed **${profiles.length}** profiles, **${shopItems.length}** shop items.\nAll inventory caches cleared.`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
