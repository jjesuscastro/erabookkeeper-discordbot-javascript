// adds new tupper in the sheets
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { deleteTupper, getTupper } = require('../../utils/sheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deletetupper')
        .setDescription('delete one of your tuppers')
        .addStringOption(opt =>
            opt.setName('name').setDescription('make sure its exactly the same as your tupper!').setRequired(true)),

    async execute(interaction) {
        const tupperName = interaction.options.getString('name');
        const target = interaction.user;
        
        await interaction.deferReply();
        try {
            const userId = target.id;
            const tupper = await getTupper(tupperName);
            if( tupper.tupperuser == userId){
                const embed = new EmbedBuilder()
                .setTitle('❌ Uh oh...')
                .setColor(0xEBBCA2)
                .setDescription(`**${tupperName}** belongs to <@${tupperuser}>,\nYou can only delete your own tuppers.`);

                return interaction.editReply({ embeds: [embed] });
            }

            await deleteTupper(tupperName);

            const embed = new EmbedBuilder()
                .setTitle('📜 OC Deleted!')
                .setColor(0xB7B75F)
                .setDescription(`**${tupperName}** deleted from list. \nSee \`/tupperlist\` to view all your tuppers.`);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            if(err.message === 'Tupper not found.'){
                const embed = new EmbedBuilder()
                    .setTitle('❌ Uh oh...')
                    .setColor(0xEBBCA2)
                    .setDescription(`We couldn't find the tupper **${tupperName}**.`)
                await interaction.editReply({ embeds: [embed] });
            }
            else await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
