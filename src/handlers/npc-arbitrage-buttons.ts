import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { NPCArbitrageService } from '../services/npc-arbitrage.js';
import { EMBED_COLORS } from '../constants/index.js';
import { formatCurrency, formatFullNumber, formatHourlyMovement } from '../utils/formatting.js';

const ITEMS_PER_PAGE = 5;

export async function handleNPCArbitrageButtons(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('npc_arbitrage_')) return;

    await interaction.deferUpdate();

    const parts = interaction.customId.split('_');
    const action = parts[2]; // first, prev, next, last, page, or sort
    
    let budget: number;
    let strategy: 'instabuy' | 'buyorder';
    let currentPageFromButton: number;
    let sortBy: 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'weeklySellMovement' | 'maxAffordable' | 'maxInstasellRatio' | 'profitPerHour' | 'balancedScore' = 'balancedScore';

    if (action === 'sort') {
        // Sort button: npc_arbitrage_sort_<sortType>_<budget>_<strategy>_<page>
        const sortType = parts[3];
        budget = parseInt(parts[4]);
        strategy = parts[5] as 'instabuy' | 'buyorder';
        currentPageFromButton = parts[6] ? parseInt(parts[6]) : 1;
        sortBy = sortType as 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'weeklySellMovement' | 'maxAffordable' | 'maxInstasellRatio' | 'profitPerHour' | 'balancedScore';
    } else {
        // Navigation button: npc_arbitrage_<action>_<budget>_<strategy>_[page]_[sortBy]
        budget = parseInt(parts[3]);
        strategy = parts[4] as 'instabuy' | 'buyorder';
        
        if (action === 'first') {
            // npc_arbitrage_first_<budget>_<strategy>_<sortBy>
            currentPageFromButton = 1; // Will be overridden anyway
            sortBy = (parts[5] as 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'weeklySellMovement' | 'maxAffordable' | 'maxInstasellRatio' | 'profitPerHour' | 'balancedScore') || 'balancedScore';
        } else {
            // npc_arbitrage_<action>_<budget>_<strategy>_<page>_<sortBy>
            currentPageFromButton = parts[5] ? parseInt(parts[5]) : 1;
            sortBy = (parts[6] as 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'weeklySellMovement' | 'maxAffordable' | 'maxInstasellRatio' | 'profitPerHour' | 'balancedScore') || 'balancedScore';
        }
    }

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
        // Get the opportunities for the target page (use cache, don't force refresh)
        const result = await NPCArbitrageService.findArbitrageOpportunities(
            budget,
            targetPage,
            ITEMS_PER_PAGE,
            strategy,
            false, // Don't force refresh - use cached data for button navigation
            sortBy
        );

        const { opportunities, totalCount, totalPages, currentPage, totalProfit } = result;

        // Correct last page navigation
        if (action === 'last') {
            targetPage = totalPages;
            if (currentPage !== totalPages) {
                // Re-fetch with correct last page (still using cache)
                const lastResult = await NPCArbitrageService.findArbitrageOpportunities(
                    budget,
                    totalPages,
                    ITEMS_PER_PAGE,
                    strategy,
                    false, // Don't force refresh
                    sortBy
                );
                Object.assign(result, lastResult);
            }
        }

        if (totalCount === 0) {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.WARNING)
                .setTitle('🏪 No NPC Arbitrage Opportunities Found')
                .setDescription(`No profitable NPC arbitrage opportunities found with your budget of **${formatFullNumber(budget)} coins**.`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], components: [] });
            return;
        }

        // Build the embed
        const strategyText = strategy === 'instabuy' ? 'Instant Buy (depth-aware)' : 'Buy Orders (market price)';
        const sortText = {
            'balancedScore': 'balanced score',
            'totalProfit': 'total profit',
            'profitMargin': 'profit margin %',
            'profitPerItem': 'profit per item',
            'weeklySellMovement': 'weekly volume',
            'maxAffordable': 'max affordable',
            'maxInstasellRatio': 'max/instasell ratio',
            'profitPerHour': 'profit per hour'
        }[sortBy];
        
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.SUCCESS)
            .setTitle(`🏪 NPC Arbitrage Opportunities (${formatFullNumber(budget)} coins)`)
            .setDescription(`**Strategy:** ${strategyText}\n**Buy from Bazaar → Sell to NPCs**\n\n📊 **Page ${result.currentPage} of ${result.totalPages}** • **${totalCount} total opportunities**\n\n*Results sorted by ${sortText}*`);

        // Add opportunities
        let fieldValue = '';
        for (let i = 0; i < result.opportunities.length; i++) {
            const opp = result.opportunities[i];
            const globalRank = (result.currentPage - 1) * ITEMS_PER_PAGE + i + 1;
            const profitIcon = opp.profitPerItem > 1000 ? '🔥' : opp.profitPerItem > 100 ? '💰' : '💡';
            const totalCost = opp.maxAffordable * opp.bazaarBuyPrice;
            
            fieldValue += `${profitIcon} **#${globalRank}. ${opp.itemName}**\n`;
            fieldValue += `Buy: ${opp.bazaarBuyPrice.toFixed(2)} → NPC: ${formatCurrency(opp.npcSellPrice)} `;
            fieldValue += `(+${opp.profitPerItem.toFixed(2)} coins, ${opp.profitMargin.toFixed(1)}%)\n`;
            fieldValue += `Max: ${formatFullNumber(opp.maxAffordable)} items (cost: ${formatCurrency(totalCost)}) = ${formatCurrency(opp.totalProfit)} total profit\n`;
            fieldValue += `📤 Hourly Instasells: ${formatHourlyMovement(opp.weeklySellMovement)}/hr\n\n`;
        }

        embed.addFields({
            name: `💰 Top Opportunities (#${(result.currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(result.currentPage * ITEMS_PER_PAGE, totalCount)})`,
            value: fieldValue || 'No opportunities on this page.',
            inline: false
        });

        // Calculate current page profit and add summary
        const currentPageProfit = result.opportunities.reduce((sum, opp) => sum + opp.totalProfit, 0);
        embed.addFields({
            name: '📈 Summary',
            value: `**Page:** ${result.currentPage} of ${result.totalPages}\n**Page Profit:** ${formatCurrency(currentPageProfit)} coins\n**Total Profit (All):** ${formatCurrency(totalProfit)} coins\n**Best Margin:** ${result.opportunities[0]?.profitMargin.toFixed(2)}%`,
            inline: false
        });

        embed.setFooter({ 
            text: `💡 Use navigation buttons or page:<number> • ${strategy === 'instabuy' ? 'Depth-aware pricing' : 'Buy order prices'}` 
        })
        .setTimestamp();

        // Create updated navigation buttons
        const navigationRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_first_${budget}_${strategy}_${sortBy}`)
                    .setLabel('⏮️ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_prev_${budget}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_page_${budget}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel(`Page ${result.currentPage}/${result.totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_next_${budget}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === result.totalPages),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_last_${budget}_${strategy}_${result.currentPage}_${sortBy}`)
                    .setLabel('Last ⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === result.totalPages)
            );

        // Create sort buttons (split into two rows - 4 and 4 buttons)
        const sortRow1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_balancedScore_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('⭐ Balanced Score')
                    .setStyle(sortBy === 'balancedScore' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_totalProfit_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('💰 Total Profit')
                    .setStyle(sortBy === 'totalProfit' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_profitPerItem_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('🪙 Margin Coins')
                    .setStyle(sortBy === 'profitPerItem' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_profitPerHour_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('⏰ Profit/Hour')
                    .setStyle(sortBy === 'profitPerHour' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        const sortRow2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_profitMargin_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('📊 Margin %')
                    .setStyle(sortBy === 'profitMargin' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_weeklySellMovement_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('📈 Volume')
                    .setStyle(sortBy === 'weeklySellMovement' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_maxAffordable_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('🛒 Max Affordable')
                    .setStyle(sortBy === 'maxAffordable' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_sort_maxInstasellRatio_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('⚖️ Max/Instasell')
                    .setStyle(sortBy === 'maxInstasellRatio' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [navigationRow, sortRow1, sortRow2] });

    } catch (error) {
        console.error('Error handling NPC arbitrage button:', error);
        
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription('Failed to load the requested page. Please try again.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    }
}
