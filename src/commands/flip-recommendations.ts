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
                    { name: '🏆 Competition-Aware Score - Prioritizes Low Competition', value: 'competitionAwareFlipScore' },
                    { name: '🥊 Competition Only - Most Competitive First', value: 'competition' },
                    { name: 'Total Profit Potential', value: 'totalProfit' },
                    { name: 'Profit Margin %', value: 'profitMargin' },
                    { name: 'Profit per Item (Coins)', value: 'profitPerItem' },
                    { name: 'Profit per Hour (X/hr profit)', value: 'profitPerHour' },
                    { name: 'Instabuy Volume', value: 'instabuyVolume' },
                    { name: 'Instasell Volume', value: 'instasellVolume' },
                    { name: 'Most Instabought per Hour', value: 'instaboughtPerHour' },
                    // { name: 'Combined Liquidity', value: 'combinedLiquidity' },
                    { name: 'Most Instasold per Hour', value: 'instasoldPerHour' },
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

            // Determine items per page based on sort type
            const itemsPerPage = sortBy === 'competition' ? 3 : ITEMS_PER_PAGE;

            // Get enhanced flipping opportunities with pagination
            const result = await FlippingService.findFlippingOpportunities(
                budget,
                page,
                itemsPerPage,
                strategy as 'orderbook' | 'instant',
                true, // Force refresh for new command execution
                sortBy as 'flipScore' | 'competitionAwareFlipScore' | 'competition' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel'
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
                'competitionAwareFlipScore': 'competition-aware flip score (low competition prioritized)',
                'competition': 'competition level (highest first)',
                'totalProfit': 'total profit potential',
                'profitMargin': 'profit margin %',
                'profitPerItem': 'profit per item',
                'profitPerHour': 'profit per hour',
                'instabuyVolume': 'instabuy volume',
                'instasellVolume': 'instasell volume',
                'instaboughtPerHour': 'most instabought per hour',
                'instasoldPerHour': 'most instasold per hour',
                // 'combinedLiquidity': 'combined liquidity',
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
                const globalRank = (currentPage - 1) * itemsPerPage + i + 1;
                const riskEmoji = opp.riskLevel === 'LOW' ? '🟢' : opp.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
                const liquidityEmoji = opp.liquidityScore >= 80 ? '💦' : opp.liquidityScore >= 50 ? '💧' : '💤';
                
                fieldValue += `${riskEmoji} **#${globalRank}. ${formatItemName(opp.itemId)}** ${liquidityEmoji}\n`;
                fieldValue += `Buy: ${formatCurrency(opp.buyPrice)} → Sell: ${formatCurrency(opp.sellPrice)} `;
                fieldValue += `(+${formatCurrency(opp.profitMargin)}, ${formatPercentage(opp.profitPercentage)})\n`;
                
                // Show competition score if sorting by competition
                if (sortBy === 'competition') {
                    const enhancedOpp = opp as any;
                    const competitionEmoji = enhancedOpp.competitionScore <= 20 ? '🟢' : enhancedOpp.competitionScore <= 50 ? '🟡' : '🔴';
                    fieldValue += `${competitionEmoji} **Competition Score:** ${enhancedOpp.competitionScore.toFixed(1)}/100 (lower = less competitive)\n`;
                }
                
                if (budget) {
                    const maxAffordable = Math.floor(budget / opp.buyPrice);
                    const totalPotentialProfit = maxAffordable * opp.profitMargin;
                    fieldValue += `Max: ${formatFullNumber(maxAffordable)} items = ${formatCurrency(totalPotentialProfit)} total profit\n`;
                }
                
                fieldValue += `📥 Instabuy: ${formatHourlyMovement(opp.weeklyBuyMovement)}/hr • `;
                fieldValue += `📤 Instasell: ${formatHourlyMovement(opp.weeklySellMovement)}/hr\n`;
                
                const budgetWarning = (opp as any).budgetLimited ? ' ⚠️ budget limited' : '';
                fieldValue += `⚡ Est. ${formatFullNumber((opp as any).estimatedItemsPerHour)}/hr tradeable (${formatCurrency((opp as any).estimatedProfitPerHour)}/hr profit)${budgetWarning}\n\n`;
            }

            // Add all opportunities in a single field since we have max 5 per page
            embed.addFields({
                name: `📋 Top Opportunities (#${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalCount)})`,
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
                        .setCustomId(`flip_sort_competitionAwareFlipScore_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('🏆 Competition-Aware')
                        .setStyle(sortBy === 'competitionAwareFlipScore' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_totalProfit_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('💰 Total Profit')
                        .setStyle(sortBy === 'totalProfit' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const sortRow2 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_profitMargin_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('📊 Margin %')
                        .setStyle(sortBy === 'profitMargin' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_profitPerItem_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('🪙 Profit/Item')
                        .setStyle(sortBy === 'profitPerItem' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_profitPerHour_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('⏰ Profit/Hr')
                        .setStyle(sortBy === 'profitPerHour' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    // new ButtonBuilder()
                    //     .setCustomId(`flip_sort_combinedLiquidity_${budget || 0}_${strategy}_${currentPage}`)
                    //     .setLabel('💧 Liquidity')
                    //     .setStyle(sortBy === 'combinedLiquidity' ? ButtonStyle.Success : ButtonStyle.Secondary)
                        new ButtonBuilder()// instasoldPerHour
                            .setCustomId(`flip_sort_instasoldPerHour_${budget || 0}_${strategy}_${currentPage}`)
                            .setLabel('⏰ Instasold/Hr')
                            .setStyle(sortBy === 'instasoldPerHour' ? ButtonStyle.Success : ButtonStyle.Secondary),

                );

            const sortRow3 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_instabuyVolume_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('📥 Instabuy Vol')
                        .setStyle(sortBy === 'instabuyVolume' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_instasellVolume_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('📤 Instasell Vol')
                        .setStyle(sortBy === 'instasellVolume' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_instaboughtPerHour_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('⏰ Instabought/Hr')
                        .setStyle(sortBy === 'instaboughtPerHour' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`flip_sort_competition_${budget || 0}_${strategy}_${currentPage}`)
                        .setLabel('🥊 Competition')
                        .setStyle(sortBy === 'competition' ? ButtonStyle.Success : ButtonStyle.Secondary)
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
