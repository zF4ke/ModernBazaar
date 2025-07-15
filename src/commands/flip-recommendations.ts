import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { FlippingService } from "../services/flipping";
import { formatCurrency, formatPercentage, formatItemName } from "../utils/formatting";
import { FLIPPING_ANALYSIS } from "../constants";

export const flipRecommendationsCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('flip-recommendations')
        .setDescription('Get the best items to flip based on supply/demand and profit margins')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter recommendations by category')
                .setRequired(false)
                .addChoices(
                    { name: 'All (Best Overall)', value: 'all' },
                    { name: 'High Margin', value: 'high-margin' },
                    { name: 'High Volume', value: 'high-volume' },
                    { name: 'Low Risk', value: 'low-risk' }
                )
        )
        .addStringOption(option =>
            option.setName('price-type')
                .setDescription('Price calculation method')
                .setRequired(false)
                .addChoices(
                    { name: 'Order Book Prices (Default)', value: 'instant' },
                    { name: 'Weighted Average (Top 2%)', value: 'weighted' }
                )
        )
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of recommendations to show (1-20)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const category = interaction.options.getString('category') || 'all';
        const priceType = interaction.options.getString('price-type') || 'instant';
        const count = interaction.options.getInteger('count') || 10;

        await interaction.deferReply();

        try {
            let opportunities;
            
            if (category === 'all') {
                opportunities = await FlippingService.getBestFlippingOpportunities(count, priceType as 'instant' | 'weighted');
            } else {
                opportunities = await FlippingService.getFlippingOpportunitiesByCategory(
                    category as 'high-margin' | 'high-volume' | 'low-risk',
                    priceType as 'instant' | 'weighted'
                );
                opportunities = opportunities.slice(0, count);
            }

            if (opportunities.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('📊 No Flipping Opportunities')
                    .setDescription('No profitable flipping opportunities found with the current criteria.')
                    .setColor(0x8B7D6B);

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const categoryTitle = category === 'all' ? 'Best Overall' : 
                                category === 'high-margin' ? 'High Margin' :
                                category === 'high-volume' ? 'High Volume' : 'Low Risk';

            const priceTypeTitle = priceType === 'instant' ? 'order book prices' : 'weighted average prices (top 2%)';
            const priceTypeNote = priceType === 'instant' ? 
                '*Note: Uses competitive order book prices - place orders and wait for execution*' :
                '*Note: Uses realistic trading prices, not order book competition*';

            const embed = new EmbedBuilder()
                .setTitle(`💰 Flip Recommendations - ${categoryTitle}`)
                .setDescription(`Top ${opportunities.length} flipping opportunities based on **${priceTypeTitle}**\n\n${priceTypeNote}`)
                .setColor(0x5D7B5D)
                .setTimestamp();

            // Add top 3 as detailed fields
            const topOpportunities = opportunities.slice(0, 3);
            const priceLabel = priceType === 'instant' ? 'Order Book' : 'Weighted Avg';
            topOpportunities.forEach((op, index) => {
                const riskEmoji = op.riskLevel === 'LOW' ? '🟢' : op.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
                const liquidityEmoji = op.liquidityScore >= FLIPPING_ANALYSIS.LIQUIDITY_EMOJI_HIGH_THRESHOLD ? '💦' : 
                                      op.liquidityScore >= FLIPPING_ANALYSIS.LIQUIDITY_EMOJI_MEDIUM_THRESHOLD ? '💧' : '💤';
                
                embed.addFields({
                    name: `${index + 1}. ${formatItemName(op.itemId)} ${riskEmoji}`,
                    value: `**Profit:** ${formatCurrency(op.profitMargin)} (${formatPercentage(op.profitPercentage)})\n` +
                           `**${priceLabel} Buy:** ${formatCurrency(op.buyPrice)} → **Sell:** ${formatCurrency(op.sellPrice)}\n` +
                           `**Volume:** ${op.buyVolume.toLocaleString()} / ${op.sellVolume.toLocaleString()} ${liquidityEmoji}\n` +
                           `**Score:** ${op.recommendationScore.toFixed(3)}/100`,
                    inline: true
                });
            });

            // Add remaining items as a list
            if (opportunities.length > 3) {
                const remainingItems = opportunities.slice(3).map((op, index) => {
                    const riskEmoji = op.riskLevel === 'LOW' ? '🟢' : op.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
                    return `**${index + 4}.** ${formatItemName(op.itemId)} ${riskEmoji} - ${formatCurrency(op.profitMargin)} (${formatPercentage(op.profitPercentage)})`;
                }).join('\n');

                embed.addFields({
                    name: `📋 Other Opportunities (${opportunities.length - 3} more)`,
                    value: remainingItems.length > 1000 ? remainingItems.substring(0, 1000) + '...' : remainingItems,
                    inline: false
                });
            }

            // Add legend
            const priceExplanation = priceType === 'instant' ? 
                'order book prices - place competitive buy/sell orders and wait for execution' :
                'weighted averages (top 2% by volume) - realistic for bulk trading';
            
            embed.addFields({
                name: '📖 Legend',
                value: '🟢 Low Risk | 🟡 Medium Risk | 🔴 High Risk\n' +
                       '💦 High Liquidity | 💧 Medium Liquidity | 💤 Low Liquidity\n' +
                       '**Volume format:** Buy Volume / Sell Volume\n' +
                       `**Prices:** ${priceExplanation}\n` +
                       '**Strategy:** Place buy orders, wait for fill, then place sell orders',
                inline: false
            });

            // Add market summary
            const avgProfit = opportunities.reduce((sum, op) => sum + op.profitMargin, 0) / opportunities.length;
            const avgMargin = opportunities.reduce((sum, op) => sum + op.profitPercentage, 0) / opportunities.length;
            const lowRiskCount = opportunities.filter(op => op.riskLevel === 'LOW').length;

            embed.addFields({
                name: '📊 Market Summary',
                value: `**Average Profit:** ${formatCurrency(avgProfit)}\n` +
                       `**Average Margin:** ${formatPercentage(avgMargin)}\n` +
                       `**Low Risk Items:** ${lowRiskCount}/${opportunities.length}`,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error getting flip recommendations:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(error instanceof Error ? error.message : 'Failed to analyze flipping opportunities. Please try again later.')
                .setColor(0x8B4B4B);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
