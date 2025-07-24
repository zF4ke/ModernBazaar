import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { FlippingService, FlippingOpportunity } from '../services/flipping.js';
import { EMBED_COLORS } from '../constants/index.js';
import { formatCurrency, formatPercentage, formatItemName, formatHourlyMovement, formatFullNumber, formatLargeNumber } from '../utils/formatting.js';

const ITEMS_PER_PAGE = 4;

export async function handleFlipButtons(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('flip_')) return;

    await interaction.deferUpdate();

    const parts = interaction.customId.split('_');
    const action = parts[1]; // first, prev, next, last, page, sort, or refresh
    
    let budget: number | null;
    let strategy: 'orderbook' | 'instant';
    let currentPageFromButton: number;
    let sortBy: 'flipScore' | 'competitionAwareFlipScore' | 'competition' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel' = 'flipScore';

    if (action === 'sort') {
        // Sort button: flip_sort_<sortType>_<budget>_<strategy>_<page>
        const sortType = parts[2];
        budget = parseInt(parts[3]) || null;
        strategy = parts[4] as 'orderbook' | 'instant';
        currentPageFromButton = parts[5] ? parseInt(parts[5]) : 1;
        sortBy = sortType as 'flipScore' | 'competitionAwareFlipScore' | 'competition' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel';
    } else if (action === 'refresh') {
        // Refresh button: flip_refresh_<budget>_<strategy>_<page>_<sortBy>
        budget = parseInt(parts[2]) || null;
        strategy = parts[3] as 'orderbook' | 'instant';
        currentPageFromButton = parts[4] ? parseInt(parts[4]) : 1;
        sortBy = (parts[5] as 'flipScore' | 'competitionAwareFlipScore' | 'competition' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel') || 'flipScore';
    } else {
        // Navigation button: flip_<action>_<budget>_<strategy>_[page]_[sortBy]
        budget = parseInt(parts[2]) || null;
        strategy = parts[3] as 'orderbook' | 'instant';
        
        if (action === 'first') {
            // flip_first_<budget>_<strategy>_<sortBy>
            currentPageFromButton = 1; // Will be overridden anyway
            sortBy = (parts[4] as 'flipScore' | 'competitionAwareFlipScore' | 'competition' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel') || 'flipScore';
        } else {
            // flip_<action>_<budget>_<strategy>_<page>_<sortBy>
            currentPageFromButton = parts[4] ? parseInt(parts[4]) : 1;
            sortBy = (parts[5] as 'flipScore' | 'competitionAwareFlipScore' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel') || 'flipScore';
        }
    }

    // Determine items per page based on sort type
    const itemsPerPage = sortBy === 'competition' ? 3 : ITEMS_PER_PAGE;

    let targetPage = currentPageFromButton;

    if (action === 'sort') {
        // Sort button clicked - stay on current page but change sort
        targetPage = currentPageFromButton;
    } else {
        // Navigation button clicked
        switch (action) {
            case 'first':
                targetPage = 1;
                break;
            case 'prev':
                targetPage = Math.max(1, currentPageFromButton - 1);
                break;
            case 'next':
                targetPage = currentPageFromButton + 1;
                break;
            case 'last':
                // We need to get total pages, so we'll calculate it in the service call
                targetPage = 999; // Will be corrected by the service
                break;
            case 'page':
                // No change needed, just refresh current page
                break;
        }
    }

    try {
        // Get the opportunities for the target page
        const result = await FlippingService.findFlippingOpportunities(
            budget,
            targetPage,
            itemsPerPage,
            strategy,
            false, // Don't force refresh - this would be expensive for button clicks
            sortBy
        );

        const { opportunities, totalCount, totalPages, currentPage, totalProfit } = result;

        // Correct last page navigation
        if (action === 'last') {
            targetPage = totalPages;
            if (currentPage !== totalPages) {
                // Re-fetch with correct last page
                const lastResult = await FlippingService.findFlippingOpportunities(
                    budget,
                    totalPages,
                    itemsPerPage,
                    strategy,
                    false,
                    sortBy
                );
                Object.assign(result, lastResult);
            }
        }

        if (totalCount === 0) {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.WARNING)
                .setTitle('📊 No Flipping Opportunities Found')
                .setDescription('No profitable flipping opportunities found with the current criteria.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], components: [] });
            return;
        }

        // Build the embed
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
            'riskLevel': 'risk level (lowest first)'
        }[sortBy];
        
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.SUCCESS)
            .setTitle(`💰 Flip Recommendations${budget ? ` (${formatFullNumber(budget)} coins)` : ''}`)
            .setDescription(`**Strategy:** ${strategyText}\n**Buy Low → Sell High on Bazaar**\n\n📊 **Page ${result.currentPage} of ${result.totalPages}** • **${totalCount} total opportunities**\n\n*Results sorted by ${sortText}*`);

        // Add opportunities
        let fieldValue = '';
        for (let i = 0; i < result.opportunities.length; i++) {
            const opp = result.opportunities[i];
            const globalRank = (result.currentPage - 1) * itemsPerPage + i + 1;
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
            fieldValue += `⚡ Est. ${formatLargeNumber((opp as any).estimatedItemsPerHour)}/hr tradeable (${formatCurrency((opp as any).estimatedProfitPerHour)}/hr profit)${budgetWarning}\n\n`;
        }

        embed.addFields({
            name: `💰 Top Opportunities (#${(result.currentPage - 1) * itemsPerPage + 1}-${Math.min(result.currentPage * itemsPerPage, totalCount)})`,
            value: fieldValue || 'No opportunities on this page.',
            inline: false
        });

        // Calculate current page profit and add summary
        const currentPageProfit = budget ? 
            result.opportunities.reduce((sum: number, opp: FlippingOpportunity) => {
                const maxAffordable = Math.floor(budget / opp.buyPrice);
                return sum + (maxAffordable * opp.profitMargin);
            }, 0) : 
            result.opportunities.reduce((sum: number, opp: FlippingOpportunity) => sum + opp.profitMargin, 0);
        
        const avgRisk = result.opportunities.filter((opp: FlippingOpportunity) => opp.riskLevel === 'LOW').length;
        
        embed.addFields({
            name: '📈 Summary',
            value: `**Page:** ${result.currentPage} of ${result.totalPages}\n` +
                   `**${budget ? 'Page Profit Potential' : 'Page Avg Profit'}:** ${formatCurrency(currentPageProfit)}${budget ? '' : ' per item'}\n` +
                   `**${budget ? 'Total Profit Potential' : 'Total Opportunities'}:** ${budget ? formatCurrency(totalProfit) : totalCount}\n` +
                   `**Low Risk Items:** ${avgRisk}/${result.opportunities.length}`,
            inline: false
        });

        embed.setFooter({ 
            text: `💡 Use navigation buttons or page:<number> • ${strategy === 'instant' ? 'Includes 4% bazaar tax' : 'Place orders and wait'}` 
        })
        .setTimestamp();

        // Create updated navigation buttons
        const navigationRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`flip_first_${budget || 0}_${strategy}_${sortBy}`)
                    .setLabel('⏮️ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`flip_prev_${budget || 0}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`flip_page_${budget || 0}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel(`Page ${result.currentPage}/${result.totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`flip_next_${budget || 0}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === result.totalPages),
                new ButtonBuilder()
                    .setCustomId(`flip_last_${budget || 0}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel('Last ⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === result.totalPages)
            );

        // Create sort buttons (3-3-3 layout)
        const sortRow1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`flip_sort_flipScore_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('⭐ Flip Score')
                    .setStyle(sortBy === 'flipScore' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`flip_sort_competitionAwareFlipScore_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('🏆 Competition-Aware')
                    .setStyle(sortBy === 'competitionAwareFlipScore' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`flip_sort_totalProfit_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('💰 Total Profit')
                    .setStyle(sortBy === 'totalProfit' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        const sortRow2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`flip_sort_profitMargin_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('📊 Margin %')
                    .setStyle(sortBy === 'profitMargin' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`flip_sort_profitPerItem_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('🪙 Profit/Item')
                    .setStyle(sortBy === 'profitPerItem' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`flip_sort_profitPerHour_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('⏰ Profit/Hr')
                    .setStyle(sortBy === 'profitPerHour' ? ButtonStyle.Success : ButtonStyle.Secondary)
                // instasold per hour
                .setCustomId(`flip_sort_instasoldPerHour_${budget || 0}_${strategy}_${result.currentPage}`)
                .setLabel('⏰ Instasold/Hr')
                .setStyle(sortBy === 'instasoldPerHour' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        const sortRow3 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`flip_sort_instabuyVolume_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('📥 Instabuy Vol')
                    .setStyle(sortBy === 'instabuyVolume' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`flip_sort_instasellVolume_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('📤 Instasell Vol')
                    .setStyle(sortBy === 'instasellVolume' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`flip_sort_instaboughtPerHour_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('⏰ Instabought/Hr')
                    .setStyle(sortBy === 'instaboughtPerHour' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`flip_sort_competition_${budget || 0}_${strategy}_${result.currentPage}`)
                    .setLabel('🥊 Competition')
                    .setStyle(sortBy === 'competition' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [navigationRow, sortRow1, sortRow2, sortRow3] });

    } catch (error) {
        console.error('Error handling flip button:', error);
        
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription('Failed to load the requested page. Please try again.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    }
}
