import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { botConfig } from "../config/bot-config";

export const verboseCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('verbose')
        .setDescription('Toggle verbose debug mode for detailed pricing calculations'),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const newState = botConfig.toggleVerbose();
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Debug Mode')
            .setDescription(`Verbose mode is now **${newState ? 'ENABLED' : 'DISABLED'}**`)
            .setColor(newState ? 0x5D7B5D : 0x8B4B4B)
            .addFields({
                name: 'What this does',
                value: newState 
                    ? '📊 Commands will show detailed order book analysis, market depth calculations, and step-by-step pricing breakdowns in the console.'
                    : '🔇 Commands will run silently without detailed debug output.',
                inline: false
            })
            .setTimestamp();

        if (newState) {
            embed.addFields({
                name: '🔍 Debug Features',
                value: '• Order book consumption analysis\n• Market depth calculations\n• 4% instant buy surcharge breakdown\n• Ingredient cost step-by-step\n• Market feasibility checks',
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
