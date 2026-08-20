// /takemoney <user> <amount> — admin only: remove coins from a user and destroy them
// <user> accepts a character name (autocomplete) or a Discord @mention
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { deductBalance } = require('../../utils/sheets');
const { resolveTarget, autocompleteProfiles } = require('../../utils/resolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('takemoney')
        .setDescription("give us your money (mod only)")
        .addUserOption(opt =>
            opt.setName('user').setDescription('Mun name').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Amount to take').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const choices = await autocompleteProfiles(focused);
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const input = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply();
        try {
            const target = await resolveTarget(`<@${input.id}>`);
            const newBalance = await deductBalance(target.discordId, amount);

            var edels = "edels";
            if(amount === 1)
                edels = "edel"; 
            var edels2 = "edels";
            if(newBalance === 1)
                edels2 = "edel"; 

            const embed = new EmbedBuilder()
                .setTitle('Goodbye Edels...')
                .setColor(0xEBBCA2)
                .setDescription(`Took **${amount}** ${edels} from <@${target.discordId}>.`)
                .setFooter({text:`— New balance: ${newBalance} ${edels2}.`});

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            if(err.message === 'Insufficient funds.'){
                const embed = new EmbedBuilder()
                    .setTitle('❌ Uh oh...')
                    .setColor(0xEBBCA2)
                    .setDescription(`Insufficient funds!`)
                await interaction.editReply({ embeds: [embed] });
            }
            else await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
