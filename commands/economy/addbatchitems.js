  
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, addInventoryItem } = require('../../utils/sheets');
const { clearInventoryCache } = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbatchitems')
        .setDescription('Add batch of items to inventory (mod only)')
        .addUserOption(opt =>
            opt.setName('user').setDescription('Mun name').setRequired(true))
        .addStringOption(opt =>
            opt.setName('items').setDescription('message link to the item list').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const messageLink = interaction.options.getString('items');
        const input = interaction.options.getUser('user');

        await interaction.deferReply();
        try {
            const { characterName } = await getUser(input.id);

            if (!messageLink){
                throw new Error('Invalid Message Link.');
            }
            let channelId;
            let messageId;

            const trimmed = messageLink.trim();
            const linkMatch = trimmed.match(/channels\/(?:@me|\d+)\/(\d+)\/(\d+)/);
            if (linkMatch){
                channelId = linkMatch[1];
                messageId = linkMatch[2];
            }
            if (/^\d+$/.test(trimmed)){
                channelId = interaction.channel.id;
                messageId = trimmed;
            }
            
            if (!messageId) {
                throw new Error(`Invalid message ID or link.`);
            }
            let channel;
            let message;
            try {
                channel = await interaction.client.channels.fetch(channelId);
            } catch {
                throw new Error(`Could not access the channel for the message.`);
            }

            if (!channel?.isTextBased() || !channel.messages) {
                throw new Error(`The message is not in a text-based channel.`);
            }

            try {
                message = await channel.messages.fetch(messageId)
            } catch {
                throw new Error(`Could not find or access the message.`);
            }

            message = message.slice(3, -3);
            const items = message.split('-');
            
            //await addInventoryItem(characterName, itemName, 1);


            clearInventoryCache(input.id); // inventory changed — force fresh fetch on next autocomplete
            
            const embed = new EmbedBuilder()
            .setTitle('🛍️ Items Given!')
            .setColor(0xB7B75F)
            .setDescription(`${items}`);
            //.setDescription(`Gave x${quantity} **${itemName}** to ${input.username}.`)

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
