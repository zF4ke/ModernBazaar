import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { HypixelService } from "../services/hypixel";
import { formatCurrency, formatItemName, formatFullNumber, formatHourlyMovement } from "../utils/formatting";

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
            const { quick_status, buy_orders, sell_orders } = product;
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 Market Analysis - ${formatItemName(itemId)}`)
                .setDescription('*Comparing instant order prices vs weighted average trading prices*')
                .setColor(0x7B6B8E)
                .addFields(
                    {
                        name: '💰 Current Prices',
                        value: `**Instant Buy:** ${bestSellOrder ? formatCurrency(bestSellOrder.price) : 'No orders'}\n` +
                               `**Instant Sell:** ${bestBuyOrder ? formatCurrency(bestBuyOrder.price) : 'No orders'}\n` +
                               `**Spread:** ${(bestBuyOrder && bestSellOrder) ? formatCurrency(bestSellOrder.price - bestBuyOrder.price) : 'N/A'}`,
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
                        name: '📈 Market Depth (Buy / Sell)',
                        value: `**Orders:** ${quick_status.buyOrders.toLocaleString()} / ${quick_status.sellOrders.toLocaleString()}\n` +
                               `**Volume:** ${quick_status.totalItemsInBuyOrders.toLocaleString()} / ${quick_status.totalItemsInSellOrders.toLocaleString()}\n` +
                               `**Hourly:** ${formatHourlyMovement(quick_status.buyMovingWeek)} / ${formatHourlyMovement(quick_status.sellMovingWeek)}`,
                        inline: true
                    }
                );

            // Add top buy orders - Now using intuitive field names!
            if (buy_orders.length > 0) {
                const topBuyOrders = buy_orders
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

            // Add top sell orders - Now using intuitive field names!
            if (sell_orders.length > 0) {
                const topSellOrders = sell_orders
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
            if (buy_orders.length >= 3 && sell_orders.length >= 3) {
                const buyRange = buy_orders[0].pricePerUnit - buy_orders[2].pricePerUnit;
                const sellRange = sell_orders[2].pricePerUnit - sell_orders[0].pricePerUnit;
                const volatility = ((buyRange + sellRange) / 2) / quick_status.buyPrice * 100;
                
                const volatilityText = volatility >= 0 
                    ? `${volatility.toFixed(2)}% (Higher price variation, more trading opportunities)`
                    : `${volatility.toFixed(2)}% (Lower price variation, stable market)`;

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
            const spread = quick_status.buyPrice - quick_status.sellPrice; // Buy price - sell price (correct)
            const spreadPercentage = (spread / quick_status.buyPrice) * 100;

            if (spreadPercentage > 5) {
                recommendation = '📈 **High spread** - Good for flipping (buy low, sell high with bigger profit margin)';
            } else if (spreadPercentage > 2) {
                recommendation = '📊 **Moderate spread** - Decent flipping opportunity (moderate difference between buy/sell prices)';
            } else {
                recommendation = '📉 **Low spread** - Limited profit potential (small difference between buy/sell prices)';
            }

            if (quick_status.totalItemsInBuyOrders > 10000 && quick_status.totalItemsInSellOrders > 10000) {
                recommendation += '\n✅ **High liquidity** - Easy to buy/sell large quantities';
            } else if (quick_status.totalItemsInBuyOrders < 1000 || quick_status.totalItemsInSellOrders < 1000) {
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
