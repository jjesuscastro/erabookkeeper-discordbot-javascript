// /balance [@user] — check your own or another user's coin balance
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check a user's balance")
        .addUserOption(opt =>
            opt.setName('user').setDescription('user to check (default: you)').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        await interaction.deferReply();
        try {
            const { characterName, balance } = await getUser(target.id);
            
            var line = characterName + "'s balance";
            var line2 = balance + " edels";
            const embed = new EmbedBuilder()
            .setTitle(line)
            .setColor(0xB7B75F)
            .setDescription(line2);

             await interaction.editReply({ embeds: [embed] });
            //await interaction.editReply(`**${characterName}**'s balance: **${balance}**`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
