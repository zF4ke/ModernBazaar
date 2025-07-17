import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Command } from "../types";
import { FlippingService, FlippingOpportunity } from "../services/flipping";
import { formatCurrency, formatPercentage, formatItemName, formatHourlyMovement, formatFullNumber, formatLargeNumber } from "../utils/formatting";
import { FLIPPING_ANALYSIS, EMBED_COLORS } from "../constants";

const ITEMS_PER_PAGE = 4;

export const flipRecommendationsCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('flip-recommendations')
        .setDescription('Get the best items to flip with advanced sorting and pagination')
        .addIntegerOption(option =>
            option.setName('budget')
                .setDescription('Your available budget in coins (optional)')
                .setRequired(false)
                .setMinValue(1000)
                .setMaxValue(2000000000)
        )
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number (5 opportunities per page)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addStringOption(option =>
            option.setName('strategy')
                .setDescription('Trading strategy for profit calculations')
                .setRequired(false)
                .addChoices(
                    { name: 'Order Book Trading (Default)', value: 'orderbook' },
                    { name: 'Instant Trading (4% tax)', value: 'instant' }
                )
        )
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('Sort opportunities by different criteria')
                .setRequired(false)
                .addChoices(
                    { name: '⭐ Flip Score (Default) - Volume-Focused Efficiency', value: 'flipScore' },
                    { name: 'Total Profit Potential', value: 'totalProfit' },
                    { name: 'Profit Margin %', value: 'profitMargin' },
                    { name: 'Profit per Item (Coins)', value: 'profitPerItem' },
                    { name: 'Instabuy Volume', value: 'instabuyVolume' },
                    { name: 'Instasell Volume', value: 'instasellVolume' },
                    { name: 'Combined Liquidity', value: 'combinedLiquidity' },
                    { name: 'Risk Level (Lowest First)', value: 'riskLevel' }
                )
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        // Always defer reply for long-running operations
        try {
            await interaction.deferReply();
        } catch (error) {
            //console.error('Failed to defer reply:', error);
        }

        try {
            const budget = interaction.options.getInteger('budget');
            const page = interaction.options.getInteger('page') || 1;
            const strategy = interaction.options.getString('strategy') || 'orderbook';
            const sortBy = interaction.options.getString('sort') || 'flipScore';

            // Get enhanced flipping opportunities with pagination
            const result = await FlippingService.findFlippingOpportunities(
                budget,
                page,
                ITEMS_PER_PAGE,
                strategy as 'orderbook' | 'instant',
                true, // Force refresh for new command execution
                sortBy as 'flipScore' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'instabuyVolume' | 'instasellVolume' | 'combinedLiquidity' | 'riskLevel'
            );

            const { opportunities, totalCount, totalPages, currentPage, totalProfit } = result;

            if (totalCount === 0) {
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.WARNING)
                    .setTitle('📊 No Flipping Opportunities Found')
                    .setDescription('No profitable flipping opportunities found with the current criteria.')
                    .addFields({
                        name: '💡 Tips',
                        value: budget ? 
                            `• Try increasing your budget from ${formatFullNumber(budget)} coins\n• Check back later when market conditions change\n• Consider different trading strategies` :
                            '• Add a budget parameter to see more personalized results\n• Check back later when market conditions change\n• Different sorting methods may reveal opportunities',
                        inline: false
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Build results embed with compact organization and pagination
            const strategyText = strategy === 'instant' ? 'Instant Trading (4% tax)' : 'Order Book Trading (no tax)';
            const sortText = {
                'flipScore': 'flip score (volume-focused efficiency)',
                'totalProfit': 'total profit potential',
                'profitMargin': 'profit margin %',
                'profitPerItem': 'profit per item',
                'instabuyVolume': 'instabuy volume',
                'instasellVolume': 'instasell volume',
                'combinedLiquidity': 'combined liquidity',
                'riskLevel': 'risk level (lowest first)'
            }[sortBy];
            
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle(`💰 Flip Recommendations${budget ? ` (${formatFullNumber(budget)} coins)` : ''}`)
                .setDescription(`**Strategy:** ${strategyText}\n${budget ? `**Budget:** ${formatFullNumber(budget)} coins\n` : ''}**Buy Low → Sell High on Bazaar**\n\n📊 **Page ${currentPage} of ${totalPages}** • **${totalCount} total opportunities**\n\n*Results sorted by ${sortText}*`);

            // Create compact table-like format with one item per line for better readability
            let fieldValue = '';
            
            for (let i = 0; i < opportunities.length; i++) {
                const opp = opportunities[i];
                const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                const riskEmoji = opp.riskLevel === 'LOW' ? '🟢' : opp.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
                const liquidityEmoji = opp.liquidityScore >= 80 ? '💦' : opp.liquidityScore >= 50 ? '💧' : '💤';
                
                fieldValue += `${riskEmoji} **#${globalRank}. ${formatItemName(opp.itemId)}** ${liquidityEmoji}\n`;
                fieldValue += `Buy: ${formatCurrency(opp.buyPrice)} → Sell: ${formatCurrency(opp.sellPrice)} `;
                fieldValue += `(+${formatCurrency(opp.profitMargin)}, ${formatPercentage(opp.profitPercentage)})\n`;
                
                if (budget) {
                    const maxAffordable = Math.floor(budget / opp.buyPrice);
                    const totalPotentialProfit = maxAffordable * opp.profitMargin;
                    fieldValue += `Max: ${formatFullNumber(maxAffordable)} items = ${formatCurrency(totalPotentialProfit)} total profit\n`;
                }
                
                fieldValue += `📥 Instabuy: ${formatHourlyMovement(opp.weeklyBuyMovement)}/hr • `;
                fieldValue += `📤 Instasell: ${formatHourlyMovement(opp.weeklySellMovement)}/hr\n`;
                
                const budgetWarning = (opp as any).budgetLimited ? ' ⚠️ budget limited' : '';
                fieldValue += `⚡ Est. ${formatLargeNumber((opp as any).estimatedItemsPerHour)}/hr tradeable (${formatCurrency((opp as any).estimatedProfitPerHour)}/hr profit)${budgetWarning}\n\n`;
            }

            // Add all opportunities in a single field since we have max 5 per page
            embed.addFields({
                name: `📋 Top Opportunities (#${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, totalCount)})`,
                value: fieldValue || 'No opportunities on this page.',
                inline: false
            });

            // Calculate total profit for current page
            const currentPageProfit = budget ? 
                opportunities.reduce((sum: number, opp: FlippingOpportunity) => {
                    const maxAffordable = Math.floor(budget / opp.buyPrice);
                    return sum + (maxAffordable * opp.profitMargin);
                }, 0) : 
                opportunities.reduce((sum: number, opp: FlippingOpportunity) => sum + opp.profitMargin, 0);
            
            const avgRisk = opportunities.filter((opp: FlippingOpportunity) => opp.riskLevel === 'LOW').length;
            
            embed.addFields({
                name: '📈 Summary',
                value: `**Page:** ${currentPage} of ${totalPages}\n` +
                       `**${budget ? 'Page Profit Potential' : 'Page Avg Profit'}:** ${formatCurrency(currentPageProfit)}${budget ? '' : ' per item'}\n` +
                       `**${budget ? 'Total Profit Potential' : 'Total Opportunities'}:** ${budget ? formatCurrency(totalProfit) : totalCount}\n` +
                       `**Low Risk Items:** ${avgRisk}/${opportunities.length}`,
                inline: false
            });

            embed.setFooter({ 
                text: `💡 Use navigation buttons or page:<number> • ${strategy === 'instant' ? 'Includes 4% bazaar tax' : 'Place orders and wait'}` 
            })
            .setTimestamp();

            // Create navigation buttons
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`flip_first_${budget || 0}_${strategy}_${sortBy}`)
                        .setLabel('⏮️ First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`flip_prev_${budget || 0}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`flip_page_${budget || 0}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel(`Page ${currentPage}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`flip_next_${budget || 0}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages),
                    new ButtonBuilder()
                        .setCustomId(`flip_last_${budget || 0}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel('Last ⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );

            // Create sort buttons (3-3-3 layout)
            const sortRow1 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_flipScore_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('⭐ Flip Score')
                        .setStyle(sortBy === 'flipScore' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_totalProfit_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('💰 Total Profit')
                        .setStyle(sortBy === 'totalProfit' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_profitMargin_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('📊 Margin %')
                        .setStyle(sortBy === 'profitMargin' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const sortRow2 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_profitPerItem_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('🪙 Profit/Item')
                        .setStyle(sortBy === 'profitPerItem' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_combinedLiquidity_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('💧 Liquidity')
                        .setStyle(sortBy === 'combinedLiquidity' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_instabuyVolume_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('📥 Instabuy Vol')
                        .setStyle(sortBy === 'instabuyVolume' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const sortRow3 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_instasellVolume_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('📤 Instasell Vol')
                        .setStyle(sortBy === 'instasellVolume' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_riskLevel_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('🟢 Low Risk')
                        .setStyle(sortBy === 'riskLevel' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_refresh_${budget || 0}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.editReply({ embeds: [embed], components: [navigationRow, sortRow1, sortRow2, sortRow3] });

        } catch (error) {
            console.error('Error in flip-recommendations command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to analyze flipping opportunities. Please try again later.')
                .setColor(EMBED_COLORS.ERROR)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
