import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { CraftingService, PricingStrategy } from "../services/crafting";
import { formatCurrency, formatPercentage, formatItemName, formatEmbedField, formatFullNumber } from "../utils/formatting";

export const calculateProfitCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('calculate-profit')
        .setDescription('Calculate profit for crafting a specific item with customizable pricing strategy')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item you want to craft')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addNumberOption(option =>
            option.setName('budget')
                .setDescription('Your total budget for crafting (in coins)')
                .setRequired(true)
                .setMinValue(1)
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
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const itemName = interaction.options.getString('item', true);
        const budget = interaction.options.getNumber('budget', true);
        const pricingStrategyValue = interaction.options.getString('pricing-strategy') || 'buy_order_sell_order';

        // Convert string to enum
        const pricingStrategy = pricingStrategyValue as PricingStrategy;

        await interaction.deferReply();

        try {
            const calculation = await CraftingService.calculateCraftingProfit(itemName, budget, pricingStrategy);

            // Get strategy description
            const strategyDescriptions = {
                [PricingStrategy.BUY_ORDER_SELL_ORDER]: 'Buy Orders → Sell Orders',
                [PricingStrategy.BUY_ORDER_INSTANT_SELL]: 'Buy Orders → Instant Sell',
                [PricingStrategy.INSTANT_BUY_SELL_ORDER]: 'Instant Buy → Sell Orders', 
                [PricingStrategy.INSTANT_BUY_INSTANT_SELL]: 'Instant Buy → Instant Sell'
            };

            // Create embed with calculation results
            const embed = new EmbedBuilder()
                .setTitle(`🔨 Crafting Profit Calculator`)
                .setDescription(`**Item:** ${formatItemName(calculation.itemName)}\n**Strategy:** ${strategyDescriptions[pricingStrategy]}`)
                .setColor(calculation.profitPerItem > 0 ? 0x5D7B5D : 0x8B4B4B)
                .addFields(
                    {
                        name: '💰 Budget',
                        value: formatCurrency(calculation.budget),
                        inline: true
                    },
                    {
                        name: '🔨 Max Craftable',
                        value: calculation.maxCraftable.toString(),
                        inline: true
                    },
                    {
                        name: '📈 Profit per Item',
                        value: `${formatCurrency(calculation.profitPerItem)} (${formatPercentage(calculation.profitPercentage)})`,
                        inline: true
                    },
                    {
                        name: '💎 Total Profit',
                        value: formatCurrency(calculation.totalProfit),
                        inline: true
                    },
                    {
                        name: '💰 Cost per Item',
                        value: formatCurrency(calculation.totalIngredientCost),
                        inline: true
                    },
                    {
                        name: '💵 Selling Price',
                        value: formatCurrency(calculation.sellingPrice),
                        inline: true
                    }
                )
                .setTimestamp();

            // Add depth-aware pricing information if used
            if (calculation.depthAnalysis?.usedDepthAware) {
                const depthInfo = calculation.depthAnalysis;
                const depthStatus = depthInfo.feasible ? '✅ Market has sufficient depth' : '⚠️ Limited market depth detected';
                const surchargeInfo = pricingStrategy.includes('instant_buy') ? '\n💰 **Includes 4% Hypixel surcharge** for instant buys' : '';
                const depthText = `🔍 **Depth-Aware Pricing Used**\n${depthStatus}\nAnalyzed for ${depthInfo.estimatedCrafts} estimated crafts${surchargeInfo}`;
                
                embed.addFields({
                    name: '📊 Market Depth Analysis',
                    value: depthText,
                    inline: false
                });
            }

            // Add ingredient breakdown
            const ingredientBreakdown = Object.entries(calculation.ingredientCosts)
                .map(([ingredient, cost]) => {
                    const formattedName = formatItemName(ingredient);
                    return `**${formattedName}:** ${cost.quantity}x @ ${formatCurrency(cost.price)} = ${formatCurrency(cost.total)}`;
                })
                .join('\n');

            if (ingredientBreakdown) {
                embed.addFields({
                    name: '🧾 Ingredient Costs (Per Item)',
                    value: formatEmbedField(ingredientBreakdown),
                    inline: false
                });
            }

            // Add total ingredients needed for max craftable amount
            if (calculation.maxCraftable > 0) {
                const totalIngredientsNeeded = Object.entries(calculation.ingredientCosts)
                    .map(([ingredient, cost]) => {
                        const totalQuantity = cost.quantity * calculation.maxCraftable;
                        const totalCost = cost.total * calculation.maxCraftable;
                        const formattedName = formatItemName(ingredient);
                        return `**${formattedName}:** ${formatFullNumber(totalQuantity)} items → ${formatCurrency(totalCost)}`;
                    })
                    .join('\n');

                embed.addFields({
                    name: `🛒 Shopping List (${formatFullNumber(calculation.maxCraftable)} crafts)`,
                    value: formatEmbedField(totalIngredientsNeeded),
                    inline: false
                });
            }

            // Add profit analysis
            let analysis = '';
            if (calculation.profitPerItem > 0) {
                analysis = `✅ **Profitable!** You can make ${formatCurrency(calculation.totalProfit)} profit by crafting ${calculation.maxCraftable} items.`;
            } else if (calculation.profitPerItem === 0) {
                analysis = `⚖️ **Break-even.** No profit or loss from crafting this item.`;
            } else {
                analysis = `❌ **Not profitable.** You would lose ${formatCurrency(Math.abs(calculation.totalProfit))} by crafting ${calculation.maxCraftable} items.`;
            }

            embed.addFields({
                name: '📊 Analysis',
                value: analysis,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error calculating profit:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(error instanceof Error ? error.message : 'An unknown error occurred')
                .setColor(0x8B4B4B);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
