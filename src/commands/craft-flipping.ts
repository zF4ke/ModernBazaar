import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { CraftingService, CraftFlippingOpportunity, PricingStrategy } from "../services/crafting";
import { formatCurrency, formatPercentage, formatItemName } from "../utils/formatting";

export const craftFlippingCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('craft-flipping')
        .setDescription('Analyze crafting recipes for flipping opportunities with customizable pricing strategy')
        .addIntegerOption(option =>
            option.setName('budget')
                .setDescription('Your total budget in coins')
                .setRequired(true)
                .setMinValue(1000)
        )
        .addStringOption(option =>
            option.setName('pricing-strategy')
                .setDescription('Choose your pricing strategy')
                .setRequired(false)
                .addChoices(
                    { name: 'Buy Orders → Sell Orders (Default)', value: 'buy_order_sell_order' },
                    { name: 'Buy Orders → Instant Sell', value: 'buy_order_instant_sell' },
                    { name: 'Instant Buy → Sell Orders', value: 'instant_buy_sell_order' },
                    { name: 'Instant Buy → Instant Sell', value: 'instant_buy_instant_sell' }
                )
        )
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of opportunities to show (1-15)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(15)
        )
        .addBooleanOption(option =>
            option.setName('include-risky')
                .setDescription('Include high-risk opportunities with volatile pricing')
                .setRequired(false)
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const budget = interaction.options.getInteger('budget')!;
        const pricingStrategyValue = interaction.options.getString('pricing-strategy') || 'buy_order_sell_order';
        const count = interaction.options.getInteger('count') || 10;
        const includeRisky = interaction.options.getBoolean('include-risky') ?? false;

        // Convert string to enum
        const pricingStrategy = pricingStrategyValue as PricingStrategy;

        await interaction.deferReply();

        try {
            const opportunities = await CraftingService.analyzeCraftingOpportunities(
                includeRisky,
                budget,
                pricingStrategy
            );

            if (opportunities.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('📊 No Crafting Opportunities')
                    .setDescription('No profitable crafting opportunities found with the current criteria.')
                    .setColor(0x8B7D6B);

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const filteredOpportunities = opportunities.slice(0, count);
            const riskNote = includeRisky ? '' : '\n*High-risk items with volatile pricing are excluded by default*';
            
            // Get strategy description
            const strategyDescriptions = {
                [PricingStrategy.BUY_ORDER_SELL_ORDER]: 'Buy Orders → Sell Orders',
                [PricingStrategy.BUY_ORDER_INSTANT_SELL]: 'Buy Orders → Instant Sell',
                [PricingStrategy.INSTANT_BUY_SELL_ORDER]: 'Instant Buy → Sell Orders', 
                [PricingStrategy.INSTANT_BUY_INSTANT_SELL]: 'Instant Buy → Instant Sell'
            };

            const embed = new EmbedBuilder()
                .setTitle('🔨 Craft Flipping Opportunities')
                .setDescription(`Top ${filteredOpportunities.length} crafting opportunities using **${strategyDescriptions[pricingStrategy]}** strategy with ${formatCurrency(budget)} budget${riskNote}`)
                .setColor(0x5D7B5D)
                .setTimestamp();

            // Add top 3 as detailed fields
            const topOpportunities = filteredOpportunities.slice(0, 3);
            topOpportunities.forEach((op: CraftFlippingOpportunity, index: number) => {
                const riskEmoji = op.riskLevel === 'LOW' ? '🟢' : op.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
                const volatilityText = op.priceVolatility > 0 ? ` (${op.priceVolatility.toFixed(1)}% volatility)` : '';
                
                embed.addFields({
                    name: `${index + 1}. ${formatItemName(op.itemName)} ${riskEmoji}`,
                    value: `**Profit:** ${formatCurrency(op.profitMargin)} per craft (${formatPercentage(op.profitPercentage)})\n` +
                           `**Cost:** ${formatCurrency(op.ingredientCost)} → **Sell:** ${formatCurrency(op.sellPrice)}\n` +
                           `**Can Craft:** ${op.maxCraftable.toLocaleString()} items → **Total Profit:** ${formatCurrency(op.totalProfit)}\n` +
                           `**Score:** ${op.recommendationScore.toFixed(1)} ${volatilityText}`,
                    inline: true
                });
            });

            // Add remaining items as a list
            if (filteredOpportunities.length > 3) {
                const remainingItems = filteredOpportunities.slice(3).map((op: CraftFlippingOpportunity, index: number) => {
                    const riskEmoji = op.riskLevel === 'LOW' ? '🟢' : op.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
                    return `**${index + 4}.** ${formatItemName(op.itemName)} ${riskEmoji} - ${formatCurrency(op.profitMargin)} per craft (${formatPercentage(op.profitPercentage)}) → ${op.maxCraftable} craftable`;
                }).join('\n');

                embed.addFields({
                    name: `📋 Other Opportunities (${filteredOpportunities.length - 3} more)`,
                    value: remainingItems.length > 1000 ? remainingItems.substring(0, 1000) + '...' : remainingItems,
                    inline: false
                });
            }

            // Add legend
            embed.addFields({
                name: '📖 Legend',
                value: '🟢 Low Risk (stable pricing) | 🟡 Medium Risk | 🔴 High Risk (volatile pricing)\n' +
                       '**Strategy:** Place buy orders for ingredients, craft items, place sell orders for results\n' +
                       '**Cost:** Total cost using current sell order prices (what you pay in buy orders)\n' +
                       '**Sell Price:** Revenue using current buy order prices (what you get in sell orders)\n' +
                       '**Volatility:** Price difference between instant vs order book prices',
                inline: false
            });

            // Add market summary
            const avgProfit = filteredOpportunities.reduce((sum: number, op: CraftFlippingOpportunity) => sum + op.profitMargin, 0) / filteredOpportunities.length;
            const avgMargin = filteredOpportunities.reduce((sum: number, op: CraftFlippingOpportunity) => sum + op.profitPercentage, 0) / filteredOpportunities.length;
            const lowRiskCount = filteredOpportunities.filter((op: CraftFlippingOpportunity) => op.riskLevel === 'LOW').length;
            const totalMaxProfit = filteredOpportunities.reduce((sum: number, op: CraftFlippingOpportunity) => sum + op.totalProfit, 0);

            embed.addFields({
                name: '📊 Crafting Summary',
                value: `**Budget:** ${formatCurrency(budget)}\n` +
                       `**Average Profit:** ${formatCurrency(avgProfit)} per craft\n` +
                       `**Average Margin:** ${formatPercentage(avgMargin)}\n` +
                       `**Max Total Profit:** ${formatCurrency(totalMaxProfit)}\n` +
                       `**Low Risk Items:** ${lowRiskCount}/${filteredOpportunities.length}`,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error analyzing crafting opportunities:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(error instanceof Error ? error.message : 'Failed to analyze crafting opportunities. Please try again later.')
                .setColor(0x8B4B4B);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
