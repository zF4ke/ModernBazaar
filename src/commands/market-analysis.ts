import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { HypixelService } from "../services/hypixel";
import { formatCurrency, formatItemName, formatFullNumber } from "../utils/formatting";

export const marketAnalysisCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('market-analysis')
        .setDescription('Get detailed market analysis for an item including order book')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to analyze (use exact bazaar ID)')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const itemId = interaction.options.getString('item', true).toUpperCase();

        await interaction.deferReply();

        try {
            const detailedInfo = await HypixelService.getDetailedItemInfo(itemId);

            if (!detailedInfo) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Item Not Found')
                    .setDescription(`Item "${itemId}" was not found in the bazaar.\n\nMake sure you're using the exact bazaar item ID.`)
                    .setColor(0x8B4B4B);

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const { product, bestBuyOrder, bestSellOrder, averageBuyPrice, averageSellPrice, lastUpdated } = detailedInfo;
            const { quick_status, buy_summary, sell_summary } = product;
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 Market Analysis - ${formatItemName(itemId)}`)
                .setDescription('*Comparing instant order prices vs weighted average trading prices*')
                .setColor(0x7B6B8E)
                .addFields(
                    {
                        name: '💰 Current Prices',
                        value: `**Instant Buy:** ${bestBuyOrder ? formatCurrency(bestBuyOrder.price) : 'No orders'}\n` +
                               `**Instant Sell:** ${bestSellOrder ? formatCurrency(bestSellOrder.price) : 'No orders'}\n` +
                               `**Spread:** ${(bestBuyOrder && bestSellOrder) ? formatCurrency(bestBuyOrder.price - bestSellOrder.price) : 'N/A'}`,
                        inline: true
                    },
                    {
                        name: '⚖️ Weighted Avg (Top 2%)',
                        value: `**Buy Price:** ${formatCurrency(quick_status.buyPrice)}\n` +
                               `**Sell Price:** ${formatCurrency(quick_status.sellPrice)}\n` +
                               `**Spread:** ${formatCurrency(quick_status.buyPrice - quick_status.sellPrice)}`,
                        inline: true
                    },
                    {
                        name: '📈 Market Depth',
                        value: `**Buy Orders:** ${quick_status.buyOrders.toLocaleString()}\n` +
                               `**Sell Orders:** ${quick_status.sellOrders.toLocaleString()}\n` +
                               `**Buy Volume:** ${quick_status.buyVolume.toLocaleString()}\n` +
                               `**Sell Volume:** ${quick_status.sellVolume.toLocaleString()}`,
                        inline: true
                    }
                );

            // Add top buy orders
            if (buy_summary.length > 0) {
                const topBuyOrders = buy_summary
                    .slice(0, 5)
                    .map((order, index) => 
                        `**${index + 1}.** ${formatFullNumber(order.pricePerUnit)} (${order.amount.toLocaleString()} items, ${order.orders} orders)`
                    )
                    .join('\n');

                embed.addFields({
                    name: '🟢 Top Buy Orders',
                    value: topBuyOrders,
                    inline: false
                });
            }

            // Add top sell orders
            if (sell_summary.length > 0) {
                const topSellOrders = sell_summary
                    .slice(0, 5)
                    .map((order, index) => 
                        `**${index + 1}.** ${formatFullNumber(order.pricePerUnit)} (${order.amount.toLocaleString()} items, ${order.orders} orders)`
                    )
                    .join('\n');

                embed.addFields({
                    name: '🔴 Top Sell Orders',
                    value: topSellOrders,
                    inline: false
                });
            }

            // Add market statistics
            const marketStats = [];
            
            if (averageBuyPrice) {
                marketStats.push(`**Avg Buy Price (Top 5):** ${formatFullNumber(averageBuyPrice)}`);
            }
            if (averageSellPrice) {
                marketStats.push(`**Avg Sell Price (Top 5):** ${formatFullNumber(averageSellPrice)}`);
            }
            
            // Calculate price volatility indicator
            if (buy_summary.length >= 3 && sell_summary.length >= 3) {
                const buyRange = buy_summary[0].pricePerUnit - buy_summary[2].pricePerUnit;
                const sellRange = sell_summary[2].pricePerUnit - sell_summary[0].pricePerUnit;
                const volatility = ((buyRange + sellRange) / 2) / quick_status.buyPrice * 100;
                
                const volatilityText = volatility >= 0 
                    ? `${volatility.toFixed(3)}% (Higher price variation, more trading opportunities)`
                    : `${volatility.toFixed(3)}% (Lower price variation, stable market)`;
                
                marketStats.push(`**Price Volatility:** ${volatilityText}`);
            }

            if (marketStats.length > 0) {
                embed.addFields({
                    name: '📊 Market Statistics',
                    value: marketStats.join('\n'),
                    inline: false
                });
            }

            // Add trading recommendations
            let recommendation = '';
            const spread = quick_status.buyPrice - quick_status.sellPrice;
            const spreadPercentage = (spread / quick_status.buyPrice) * 100;

            if (spreadPercentage > 5) {
                recommendation = '📈 **High spread** - Good for flipping (buy low, sell high with bigger profit margin)';
            } else if (spreadPercentage > 2) {
                recommendation = '📊 **Moderate spread** - Decent flipping opportunity (moderate difference between buy/sell prices)';
            } else {
                recommendation = '📉 **Low spread** - Limited profit potential (small difference between buy/sell prices)';
            }

            if (quick_status.buyVolume > 10000 && quick_status.sellVolume > 10000) {
                recommendation += '\n✅ **High liquidity** - Easy to buy/sell large quantities';
            } else if (quick_status.buyVolume < 1000 || quick_status.sellVolume < 1000) {
                recommendation += '\n⚠️ **Low liquidity** - May be difficult to trade large amounts';
            }

            embed.addFields({
                name: '💡 Trading Analysis',
                value: recommendation,
                inline: false
            });

            embed.setFooter({ text: `Last updated: ${new Date(lastUpdated).toLocaleString()}` })
                 .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in market analysis:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(error instanceof Error ? error.message : 'Failed to analyze market data. Please try again later.')
                .setColor(0x8B4B4B);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
