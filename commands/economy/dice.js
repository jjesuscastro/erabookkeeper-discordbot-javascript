const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('roll the dice!')
        .addStringOption(opt =>
            opt.setName('roll').setDescription('2d20, 2d20+1').setRequired(true)),
        
    async execute(interaction) {
        const input = interaction.options.getString('roll');

        await interaction.deferReply();
        try {
            const diceRegex = /(\d+)[d](\d+)(\-?\+?)(\d*)(k?)(\d?)/;
            const match = input.match(diceRegex);

            if (match) {
                const numDice = parseInt(match[1]);
                const sideDice = parseInt(match[2]);
                const diceModifier = match[3];
                const numModifier = parseInt(match[4]);
                const keep = match[5];
                const keepNum = parseInt(match[6]);
                const rolls = [];
                const rolls2 = [];
                var total = 0;

                for (let i = 0; i < numDice; i++) {
                    const roll = Math.floor(Math.random() * sideDice) + 1;
                    rolls2.push(roll);
                    total+=roll;
                }
                
                /*if(keep){
                    if(keep.toString() == "k"){
                        total = 0;
                        var tempRolls = rolls2.slice();
                        let tempMax = 0;
                        for(let i = 0; i < keepNum; i++){
                            tempMax = Math.max(tempRolls);
                            total += tempMax;
                            var maxindex = tempRolls.indexOf(tempMax);
                            tempRolls.splice(1,maxindex);
                            rolls2[maxindex] = rolls[maxindex]+"d";
                        }
                    }
                }*/

                if(diceModifier){
                    if (diceModifier.toString() == "+"){
                        total += numModifier;
                    }
                    if (diceModifier.toString() == "-"){
                        total -= numModifier;
                    }
                }

                rolls.push(`\`🎲${total}\``);
                    
                const match2 = match[0].toString();
                var diceRoll = match2;

                var line1 = "Rolled: " + diceRoll;
                var line2 = "[" + rolls2 + "]";
                if (diceModifier.toString() == "+"){
                    line2 += "+" + numModifier;
                }
                if (diceModifier.toString() == "-"){
                    line2 += "-" + numModifier;
                }
                line2 += " ➜ " + total;

                const embed = new EmbedBuilder()
                    .setTitle(`🎲 ${total}`)
                    .setColor(0xEBBCA2)
                    .addFields(
                        { name: line1, value: line2 }
                    );

                // text += "\n > " + "**Rolled: ";
                // text += diceRoll + "**";
                // text += "\n > -# " + "[" + rolls2 + "]";
                // if (diceModifier.toString() == "+"){
                //     text += "+" + numModifier;
                // }
                // if (diceModifier.toString() == "-"){
                //     text += "-" + numModifier;
                // }
                // text += " ➜ " + total;
                
                return interaction.editReply({ embeds: [embed] });
            }
            throw new Error(`Wrong dice expression!`);
        } catch (err) {
            await interaction.editReply(`Error: ${err.message}`);
        }
    },
};
