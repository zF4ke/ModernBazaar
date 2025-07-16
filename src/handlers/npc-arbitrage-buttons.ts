import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { NPCArbitrageService } from '../services/npc-arbitrage.js';
import { EMBED_COLORS } from '../constants/index.js';
import { formatCurrency, formatFullNumber } from '../utils/formatting.js';

export async function handleNPCArbitrageButtons(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('npc_arbitrage_')) return;

    await interaction.deferUpdate();

    const parts = interaction.customId.split('_');
    const action = parts[2]; // first, prev, next, last, or page
    const budget = parseInt(parts[3]);
    const strategy = parts[4] as 'instabuy' | 'buyorder';
    const currentPageFromButton = parts[5] ? parseInt(parts[5]) : 1;

    let targetPage = currentPageFromButton;

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

    try {
        // Get the opportunities for the target page (use cache, don't force refresh)
        const result = await NPCArbitrageService.findArbitrageOpportunities(
            budget,
            targetPage,
            7,
            strategy,
            false // Don't force refresh - use cached data for button navigation
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
                    7,
                    strategy,
                    false // Don't force refresh
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
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.SUCCESS)
            .setTitle(`🏪 NPC Arbitrage Opportunities (${formatFullNumber(budget)} coins)`)
            .setDescription(`**Strategy:** ${strategyText}\n**Buy from Bazaar → Sell to NPCs**\n\n📊 **Page ${result.currentPage} of ${result.totalPages}** • **${totalCount} total opportunities**\n\n*Results sorted by total profit*`);

        // Add opportunities
        let fieldValue = '';
        for (let i = 0; i < result.opportunities.length; i++) {
            const opp = result.opportunities[i];
            const globalRank = (result.currentPage - 1) * 7 + i + 1;
            const profitIcon = opp.profitPerItem > 1000 ? '🔥' : opp.profitPerItem > 100 ? '💰' : '💡';
            const totalCost = opp.maxAffordable * opp.bazaarBuyPrice;
            
            fieldValue += `${profitIcon} **#${globalRank}. ${opp.itemName}**\n`;
            fieldValue += `Buy: ${opp.bazaarBuyPrice.toFixed(3)} → NPC: ${formatCurrency(opp.npcSellPrice)} `;
            fieldValue += `(+${opp.profitPerItem.toFixed(3)} coins, ${opp.profitMargin.toFixed(1)}%)\n`;
            fieldValue += `Max: ${formatFullNumber(opp.maxAffordable)} items (cost: ${formatCurrency(totalCost)}) = ${formatCurrency(opp.totalProfit)} total profit\n\n`;
        }

        embed.addFields({
            name: `💰 Top Opportunities (#${(result.currentPage - 1) * 7 + 1}-${Math.min(result.currentPage * 7, totalCount)})`,
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
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_first_${budget}_${strategy}`)
                    .setLabel('⏮️ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_prev_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_page_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel(`Page ${result.currentPage}/${result.totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_next_${budget}_${strategy}_${result.currentPage}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === result.totalPages),
                new ButtonBuilder()
                    .setCustomId(`npc_arbitrage_last_${budget}_${strategy}_${result.totalPages}`)
                    .setLabel('Last ⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === result.totalPages)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });

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
