// /givepoints <house> <amount> — admin only: give points to a house
// <user> accepts a character name (autocomplete) or a Discord @mention
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addPoints } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addhousepoints')
        .setDescription('(mod only)')
        .addStringOption(opt =>
            opt.setName('house').setDescription('Luna, Solis, or Astra').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to give').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const input = interaction.options.getString('house');
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply();
        try {
            if(input.toLowerCase() ==='luna'){
                var picture = 'https://i.gyazo.com/586f175c28889ba68a223f5f22d813d3.png';
                var color = 0xA3D1F9;
            }
            else if(input.toLowerCase() ==='solis'){
                var picture = 'https://i.gyazo.com/807ed6c68623dd6b8e7778709e09a8f8.png';
                var color = 0xFFE1B7;
            }
            else{
                var picture = 'https://i.gyazo.com/9bfe2be2895083682c6b9278e37f3b97.png';
                var color = 0xDDB0FF;
            }

            const newBalance = await addPoints(input, amount);
            var point = "points";
            var point2 = "points";
            if(amount === 1)
                point = "point"; 
            if(newBalance === 1)
                point = "point"; 
            const embed = new EmbedBuilder()
                .setTitle('Congratulations!')
                .setThumbnail(picture)
                .setColor(color)
                .setDescription(`✧ **House ${input.charAt(0).toUpperCase()}${input.slice(1)}** has gained **${amount}** ${point}!\n— Current standing: ${newBalance} ${point2}.`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
