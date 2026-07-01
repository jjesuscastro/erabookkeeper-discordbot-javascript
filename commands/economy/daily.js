// /daily — claim a daily coin bonus (24h cooldown)
const { SlashCommandBuilder } = require('discord.js');
const { getUser, addBalance, setLastDaily } = require('../../utils/sheets');

const DAILY_AMOUNT = 100;
const COOLDOWN_MS = 0;
//const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function formatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(`Claim your daily allowance!`),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            // rowIndex is needed to write LastDaily back to the correct row
            const { rowIndex, lastDaily } = await getUser(interaction.user.id);

            if (lastDaily) {
                const elapsed = Date.now() - new Date(lastDaily).getTime();
                if (elapsed < COOLDOWN_MS) {
                    const remaining = COOLDOWN_MS - elapsed;
                    return interaction.editReply(`Allowance already claimed! Come back in **${formatTimeRemaining(remaining)}**.`);
                }
            }

            //const target = interaction.options.getUser('user') ?? interaction.user;
            const newBalance = await addBalance(interaction.user.id, DAILY_AMOUNT);
            await setLastDaily(rowIndex, new Date().toISOString());
            const target = await getUser(target.id);
            
             const embed = new EmbedBuilder()
                .setTitle('Here\'s your allowance!')
                .setColor(0xE5CA95)
                .setDescription('Claimed your daily **${DAILY_AMOUNT}**! Don\'t waste it! \n **${characterName}**\'s balance: **${balance}**');

            await interaction.editReply({ embeds: [embed] });
            //await interaction.editReply(`Claimed your daily **${DAILY_AMOUNT}**! Balance: **${newBalance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
