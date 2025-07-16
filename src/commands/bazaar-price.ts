import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";
import { HypixelService } from "../services/hypixel";
import { formatCurrency, formatItemName, formatHourlyMovement } from "../utils/formatting";

export const bazaarPriceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('bazaar-price')
        .setDescription('Check current bazaar prices for an item')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to check prices for (use exact bazaar ID)')
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
                    .setDescription(`Item "${itemId}" was not found in the bazaar.\n\nMake sure you're using the exact bazaar item ID (e.g., "ENCHANTED_BREAD", "WHEAT", etc.)`)
                    .setColor(0x8B4B4B);

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const { product, bestBuyOrder, bestSellOrder, averageBuyPrice, averageSellPrice } = detailedInfo;
            const { quick_status } = product;
            
            const embed = new EmbedBuilder()
                .setTitle(`💰 Bazaar Prices - ${formatItemName(itemId)}`)
                .setDescription('*Instant prices = best orders | Weighted avg = top 2% by volume*')
                .setColor(0x6B8E7D)
                .addFields(
                    {
                        name: '🟢 Instant Buy Price',
                        value: bestSellOrder ? formatCurrency(bestSellOrder.price) : 'No orders',
                        inline: true
                    },
                    {
                        name: '🔴 Instant Sell Price',
                        value: bestBuyOrder ? formatCurrency(bestBuyOrder.price) : 'No orders',
                        inline: true
                    },
                    {
                        name: '📊 Spread',
                        value: (bestSellOrder && bestBuyOrder) ? formatCurrency(bestSellOrder.price - bestBuyOrder.price) : 'N/A',
                        inline: true
                    }
                );

            // Add best order information if available
            if (bestSellOrder || bestBuyOrder) {
                let orderInfo = '';
                if (bestSellOrder) {
                    orderInfo += `**Best Sell Order:** ${formatCurrency(bestSellOrder.price)} (${bestSellOrder.amount.toLocaleString()} items)\n`;
                }
                if (bestBuyOrder) {
                    orderInfo += `**Best Buy Order:** ${formatCurrency(bestBuyOrder.price)} (${bestBuyOrder.amount.toLocaleString()} items)`;
                }
                
                embed.addFields({
                    name: '📋 Best Orders',
                    value: orderInfo,
                    inline: false
                });
            }

            // Add weighted average prices (top 2% by volume)
            embed.addFields({
                name: '⚖️ Weighted Average Prices (Top 2%)',
                value: `**Buy Price:** ${formatCurrency(quick_status.sellPrice)}\n**Sell Price:** ${formatCurrency(quick_status.buyPrice)}`,
                inline: false
            });

            // Add average price information if available
            if (averageBuyPrice || averageSellPrice) {
                let avgInfo = '';
                if (averageBuyPrice) {
                    avgInfo += `**Avg Buy Price (Top 5):** ${formatCurrency(averageBuyPrice)}\n`;
                }
                if (averageSellPrice) {
                    avgInfo += `**Avg Sell Price (Top 5):** ${formatCurrency(averageSellPrice)}`;
                }
                
                embed.addFields({
                    name: '📊 Average Prices',
                    value: avgInfo,
                    inline: false
                });
            }

            embed.addFields(
                {
                    name: '📈 Buy Orders',
                    value: quick_status.buyOrders.toLocaleString(),
                    inline: true
                },
                {
                    name: '📉 Sell Orders',
                    value: quick_status.sellOrders.toLocaleString(),
                    inline: true
                },
                {
                    name: '📦 Buy Volume',
                    value: quick_status.buyVolume.toLocaleString(),
                    inline: true
                },
                {
                    name: '📦 Sell Volume',
                    value: quick_status.sellVolume.toLocaleString(),
                    inline: true
                },
                {
                    name: '📊 Weekly Buy Movement',
                    value: quick_status.buyMovingWeek.toLocaleString(),
                    inline: true
                },
                {
                    name: '📊 Weekly Sell Movement',
                    value: quick_status.sellMovingWeek.toLocaleString(),
                    inline: true
                },
                {
                    name: '📥 Hourly Instabuys',
                    value: formatHourlyMovement(quick_status.buyMovingWeek),
                    inline: true
                },
                {
                    name: '📤 Hourly Instasells',
                    value: formatHourlyMovement(quick_status.sellMovingWeek),
                    inline: true
                }
            );

            const bazaarData = await HypixelService.getBazaarPrices();
            embed.setFooter({ text: `Data last updated: ${new Date(bazaarData.lastUpdated).toLocaleString()}` })
                 .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching bazaar prices:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(error instanceof Error ? error.message : 'Failed to fetch bazaar data. Please try again later.')
                .setColor(0x8B4B4B);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
