import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { CraftingService } from "../services/crafting";
import { formatItemName, formatEmbedField } from "../utils/formatting";

export const listRecipesCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('list-recipes')
        .setDescription('List all available crafting recipes')
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Search for specific recipes')
                .setRequired(false)
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const searchTerm = interaction.options.getString('search');

        await interaction.deferReply();

        try {
            let recipes: string[];
            
            if (searchTerm) {
                recipes = CraftingService.searchRecipes(searchTerm);
                if (recipes.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🔍 Recipe Search')
                        .setDescription(`No recipes found matching "${searchTerm}"`)
                        .setColor(0x8B7D6B);
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
            } else {
                recipes = CraftingService.getAvailableRecipes();
            }

            // Format recipes into columns for better display
            const formattedRecipes = recipes
                .map(recipe => `• ${formatItemName(recipe)}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle(searchTerm ? `🔍 Recipe Search Results` : '📜 Available Recipes')
                .setDescription(searchTerm ? `Found ${recipes.length} recipes matching "${searchTerm}":` : `${recipes.length} recipes available:`)
                .addFields({
                    name: 'Recipes',
                    value: formatEmbedField(formattedRecipes, 4000),
                    inline: false
                })
                .setColor(0x6B8E7D)
                .setFooter({ text: 'Use /calculate-profit to analyze any of these items!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error listing recipes:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to retrieve recipes. Please try again later.')
                .setColor(0x8B4B4B);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
