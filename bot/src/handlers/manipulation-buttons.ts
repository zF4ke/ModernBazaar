import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuInteraction, StringSelectMenuBuilder } from 'discord.js';
import { MarketManipulationService, ManipulationParams } from '../services/market-manipulation.js';
import { EMBED_COLORS } from '../constants/index.js';
import { formatCurrency, formatPercentage, formatItemName, formatFullNumber, formatHourlyMovement } from '../utils/formatting.js';

const ITEMS_PER_PAGE = 2; // Smaller page size for better display

// Cache for storing current item ID during step navigation
const currentItemCache = new Map<string, string>(); // userId -> itemId

function getCacheKey(interaction: ButtonInteraction | StringSelectMenuInteraction): string {
    return interaction.user.id;
}

export async function handleManipulationButtons(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    if (!interaction.customId.startsWith('manip_')) return;

    await interaction.deferUpdate();

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
        const parts = interaction.customId.split('_');
        if (parts[1] === 'item' && parts[2] === 'select') {
            const budget = parseInt(parts[3]);
            const roi = parseFloat(parts[4]);
            const risk = parts[5] as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
            const minDemand = parseInt(parts[6]);
            const currentPage = parseInt(parts[7]);
            const selectedItemId = interaction.values[0];

            // console.log(`DEBUG: Selected itemId: "${selectedItemId}" (type: ${typeof selectedItemId})`);
            
            // Cache the selected item ID for this user
            currentItemCache.set(getCacheKey(interaction), selectedItemId);
            
            await showItemStrategy(interaction, selectedItemId, budget, roi, risk, minDemand, currentPage);
            return;
        }
    }

    // Handle button interactions
    if (!interaction.isButton()) return;

    const parts = interaction.customId.split('_');
    const action = parts[1]; // first, prev, next, last, page, refresh, strategy, risk, select, step
    
    // Handle step navigation (manip_step_ITEMID_budget_roi_risk_minDemand_page_step)
    if (action === 'step') {
        // Get the cached item ID instead of parsing from button (which gets truncated)
        const cachedItemId = currentItemCache.get(getCacheKey(interaction));
        if (!cachedItemId) {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.ERROR)
                .setTitle('❌ Session Expired')
                .setDescription('Please select an item again from the list to continue.')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed], components: [] });
            return;
        }
        
        const budget = parseInt(parts[3]);
        const roi = parseFloat(parts[4]);
        const risk = parts[5] as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
        const minDemand = parseInt(parts[6]);
        const currentPage = parseInt(parts[7]);
        const step = parseInt(parts[8]);
        
        await showItemStrategy(interaction, cachedItemId, budget, roi, risk, minDemand, currentPage, step);
        return;
    }
    
    // Handle item selection (different format: manip_select_ITEMID_budget_roi_risk_minDemand_page)
    if (action === 'select') {
        const itemId = parts[2];
        const budget = parseInt(parts[3]);
        const roi = parseFloat(parts[4]);
        const risk = parts[5] as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
        const minDemand = parseInt(parts[6]);
        const currentPage = parseInt(parts[7]);
        
        await showItemStrategy(interaction, itemId, budget, roi, risk, minDemand, currentPage);
        return;
    }
    
    const budget = parseInt(parts[2]);
    const roi = parseFloat(parts[3]);
    const risk = parts[4] as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    const minDemand = parseInt(parts[5]);
    let currentPageFromButton = parts[6] ? parseInt(parts[6]) : 1;

    let targetPage = currentPageFromButton;

    // Handle navigation
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
            targetPage = 999; // Will be corrected by the service
            break;
        case 'page':
        case 'refresh':
            // No change needed, just refresh current page
            break;
        case 'strategy':
            await showManipulationStrategy(interaction, budget, roi, risk, minDemand, currentPageFromButton);
            return;
        case 'risk':
            await showRiskAnalysis(interaction, budget, roi, risk, minDemand);
            return;
    }

    try {
        const params: ManipulationParams = {
            maxBudget: budget,
            targetROI: roi,
            maxRisk: risk,
            minDemand: minDemand
        };

        // Get opportunities - use cache for navigation, force refresh for refresh button
        const forceRefresh = action === 'refresh';
        const result = await MarketManipulationService.findManipulationOpportunities(params, targetPage, ITEMS_PER_PAGE, forceRefresh);
        const { opportunities, totalCount, totalPages, currentPage, isFromCache } = result;

        // Correct last page navigation
        if (action === 'last') {
            if (totalPages > 0 && currentPage !== totalPages) {
                const lastResult = await MarketManipulationService.findManipulationOpportunities(params, totalPages, ITEMS_PER_PAGE, forceRefresh);
                Object.assign(result, lastResult);
            }
        }

        if (totalCount === 0) {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.WARNING)
                .setTitle('⚠️ No Market Manipulation Opportunities Found')
                .setDescription('No items meet your criteria for market manipulation.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], components: [] });
            return;
        }

        // Build the embed - EXACT COPY from command file
        const cacheStatus = isFromCache ? '🔄 Cached data' : '✨ Fresh data';
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.WARNING) // Use warning color for manipulation
            .setTitle(`⚡ Market Manipulation Opportunities`)
            .setDescription(
                `**Budget:** ${formatFullNumber(budget)} coins | **Target ROI:** ${roi}x | **Risk:** ${risk}\n` +
                `**Min Demand:** ${formatFullNumber(minDemand)}/week | ${cacheStatus}\n\n` +
                `📊 **Page ${result.currentPage} of ${result.totalPages}** • **${totalCount} total opportunities**\n\n` +
                `👁️ = Full market visibility | ⚠️ = Hidden orders estimated\n` +
                `⚠️ **WARNING:** Market manipulation is high-risk and may result in significant losses!`
            );

        let fieldValue = '';
        
        for (let i = 0; i < result.opportunities.length; i++) {
            const opp = result.opportunities[i];
            const globalRank = (result.currentPage - 1) * 5 + i + 1; // ITEMS_PER_PAGE = 5
            const riskEmoji = opp.riskLevel === 'LOW' ? '🟢' : opp.riskLevel === 'MEDIUM' ? '🟡' : opp.riskLevel === 'HIGH' ? '🟠' : '🔴';
            const scoreEmoji = opp.manipulationScore >= 80 ? '🎯' : opp.manipulationScore >= 60 ? '📈' : '📊';
            const visibilityEmoji = opp.isFullyVisible ? '👁️' : '⚠️'; // Full visibility vs estimated

            fieldValue += `${riskEmoji} **#${globalRank}. ${formatItemName(opp.itemId)}** ${scoreEmoji}${visibilityEmoji}\n`;
            fieldValue += `**Buyout Cost:** ${formatCurrency(opp.totalAcquisitionCost)} (${formatFullNumber(opp.totalItemsAvailable)} items)\n`;
            fieldValue += `**Supply:** ${formatFullNumber(opp.sellVolume)} vol, ${opp.sellOrderCount} orders • **Demand:** ${formatFullNumber(opp.buyVolume)} vol, ${opp.buyOrderCount} orders\n`;
            fieldValue += `**Avg Cost:** ${formatCurrency(opp.averageCostPerItem)} → **Min Sell:** ${formatCurrency(opp.minimumSellPrice)}\n`;
            fieldValue += `**Target Price:** ${formatCurrency(opp.initialBuyOrderPrice)} (${formatPercentage(opp.profitMargin)} margin)\n`;
            fieldValue += `**Projected Profit:** ${formatCurrency(opp.projectedProfit)} (${(opp.projectedProfit/opp.totalAcquisitionCost*100).toFixed(1)}% ROI)\n`;
            fieldValue += `**Hourly Movement:** ${formatHourlyMovement(opp.weeklyBuyMovement)} buy, ${formatHourlyMovement(opp.weeklySellMovement)} sell • **Est. Time:** ${opp.estimatedTimeToSell.toFixed(1)}h\n`;
            fieldValue += `**Score:** ${opp.manipulationScore.toFixed(1)}/100 (D:${opp.demandScore.toFixed(0)} S:${opp.supplyScore.toFixed(0)})\n\n`;
        }

        embed.addFields({
            name: `🎯 Manipulation Targets (#${(result.currentPage - 1) * 5 + 1}-${Math.min(result.currentPage * 5, totalCount)})`,
            value: fieldValue || 'No opportunities on this page.',
            inline: false
        });

        // Calculate summary statistics
        const totalBuyoutCost = result.opportunities.reduce((sum, opp) => sum + opp.totalAcquisitionCost, 0);
        const totalProjectedProfit = result.opportunities.reduce((sum, opp) => sum + opp.projectedProfit, 0);
        const avgScore = result.opportunities.reduce((sum, opp) => sum + opp.manipulationScore, 0) / result.opportunities.length;
        const lowRiskCount = result.opportunities.filter(opp => opp.riskLevel === 'LOW').length;

        embed.addFields({
            name: '📈 Summary',
            value: `**Page:** ${result.currentPage} of ${result.totalPages}\n` +
                   `**Total Buyout Cost:** ${formatCurrency(totalBuyoutCost)}\n` +
                   `**Total Projected Profit:** ${formatCurrency(totalProjectedProfit)}\n` +
                   `**Average Score:** ${avgScore.toFixed(1)}/100\n` +
                   `**Low Risk Items:** ${lowRiskCount}/${result.opportunities.length}`,
            inline: false
        });

        // embed.addFields({
        //     name: '⚠️ Risk Warning',
        //     value: `Market manipulation involves:\n` +
        //            `• **High capital requirements** - Need full buyout budget\n` +
        //            `• **Price execution risk** - Others may undercut your strategy\n` +
        //            `• **Liquidity risk** - May take longer to sell than estimated\n` +
        //            `• **Competition risk** - Other players may interfere\n` +
        //            `• **Market risk** - Demand patterns may change`,
        //     inline: false
        // });

        embed.setFooter({ 
            text: `⚠️ Market manipulation is high-risk! Only invest what you can afford to lose completely!` 
        })
        .setTimestamp();

        // Create updated navigation buttons
        const navigationRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`manip_first_${budget}_${roi}_${risk}_${minDemand}`)
                    .setLabel('⏮️ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`manip_prev_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId(`manip_page_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                    .setLabel(`Page ${result.currentPage}/${result.totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`manip_next_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.currentPage === result.totalPages),
                new ButtonBuilder()
                    .setCustomId(`manip_last_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                    .setLabel('Last ⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(result.currentPage === result.totalPages)
            );

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`manip_refresh_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`manip_strategy_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                    .setLabel('📋 Show Strategy')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.opportunities.length === 0),
                new ButtonBuilder()
                    .setCustomId(`manip_risk_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                    .setLabel('⚠️ Risk Analysis')
                    .setStyle(ButtonStyle.Danger)
            );

        // Create select menu for item selection (up to 25 items)
        const components: any[] = [navigationRow, actionRow];
        
        if (result.opportunities.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`manip_item_select_${budget}_${roi}_${risk}_${minDemand}_${result.currentPage}`)
                .setPlaceholder('💎 Select an item for step-by-step manipulation guide')
                .setMinValues(1)
                .setMaxValues(1);

            // Add up to 25 options to the select menu
            for (let i = 0; i < Math.min(result.opportunities.length, 25); i++) {
                const opp = result.opportunities[i];
                const globalRank = (result.currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                const riskEmoji = opp.riskLevel === 'LOW' ? '🟢' : opp.riskLevel === 'MEDIUM' ? '🟡' : opp.riskLevel === 'HIGH' ? '🟠' : '🔴';
                const scaleEmoji = opp.totalAcquisitionCost >= 100000000 ? '🔥' : opp.totalAcquisitionCost >= 10000000 ? '💎' : '💰';
                
                selectMenu.addOptions({
                    label: `#${globalRank} ${formatItemName(opp.itemId)}`.substring(0, 100), // Discord limit
                    description: `💰 ${formatCurrency(opp.projectedProfit).substring(0, 50)} profit | ${formatCurrency(opp.totalAcquisitionCost).substring(0, 50)} cost`.substring(0, 100),
                    value: opp.itemId,
                    emoji: `${riskEmoji}`
                });
            }

            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(selectMenu);
                
            components.push(selectRow);
        }

        await interaction.editReply({ 
            embeds: [embed], 
            components: components
        });

    } catch (error) {
        console.error('Error handling manipulation button:', error);
        
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription('Failed to load manipulation opportunities. Please try again.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    }
}

async function showManipulationStrategy(
    interaction: ButtonInteraction, 
    budget: number, 
    roi: number, 
    risk: string, 
    minDemand: number, 
    currentPage: number
) {
    const params: ManipulationParams = {
        maxBudget: budget,
        targetROI: roi,
        maxRisk: risk as any,
        minDemand: minDemand
    };

    const result = await MarketManipulationService.findManipulationOpportunities(params, currentPage, ITEMS_PER_PAGE, false); // Use cache
    
    if (result.opportunities.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.WARNING)
            .setTitle('❌ No Strategy Available')
            .setDescription('No opportunities found to show strategy for.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    const topOpportunity = result.opportunities[0];
    const strategy = MarketManipulationService.calculateSteppingStrategy(topOpportunity);

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.INFO)
        .setTitle(`📋 Manipulation Strategy: ${formatItemName(topOpportunity.itemId)}`)
        .setDescription(
            `**Step-by-step strategy for maximum profit potential**\n\n` +
            `**Phase 1: Market Buyout**\n` +
            `• Buy all ${formatFullNumber(topOpportunity.totalItemsAvailable)} items for ${formatCurrency(topOpportunity.totalAcquisitionCost)}\n` +
            `• Average cost per item: ${formatCurrency(topOpportunity.averageCostPerItem)}\n` +
            `• Minimum selling price: ${formatCurrency(topOpportunity.minimumSellPrice)} (including 1.125% tax)\n\n` +
            `**Phase 2: Price Manipulation**\n` +
            `• Set high sell orders at ${formatCurrency(topOpportunity.targetSellPrice)} (${roi}x ROI target)\n` +
            `• Create artificial price ceiling to influence market perception\n\n` +
            `**Phase 3: Stepping Strategy**`
        );

    let strategySteps = '';
    for (let i = 0; i < Math.min(strategy.steps.length, 5); i++) {
        const step = strategy.steps[i];
        strategySteps += `**Step ${i + 1}:** Buy order at ${formatCurrency(step.buyOrderPrice)}\n`;
    }

    if (strategy.steps.length > 5) {
        strategySteps += `*... and ${strategy.steps.length - 5} more steps*\n`;
    }

    embed.addFields({
        name: '📈 Price Stepping Strategy',
        value: strategySteps || 'No stepping strategy calculated.',
        inline: false
    });

    embed.addFields({
        name: '⏱️ Timeline & Risks',
        value: `**Estimated Time to Sell:** ${topOpportunity.estimatedTimeToSell.toFixed(1)} hours\n` +
               `**Market Demand:** ${formatHourlyMovement(topOpportunity.weeklyBuyMovement)}/hour\n` +
               `**Risk Level:** ${topOpportunity.riskLevel}\n` +
               `**Success Rate:** Market dependent - high competition risk`,
        inline: false
    });

    embed.addFields({
        name: '⚠️ Critical Warnings',
        value: `• **Capital Lock-up:** ${formatCurrency(topOpportunity.totalAcquisitionCost)} will be tied up\n` +
               `• **Price Competition:** Other players may undercut your strategy\n` +
               `• **Market Shift:** Demand patterns may change during execution\n` +
               `• **Timing Risk:** May take much longer than estimated to sell\n` +
               `• **Loss Potential:** You could lose significant money if strategy fails`,
        inline: false
    });

    embed.setFooter({ 
        text: `💀 Execute at your own risk! This is not financial advice • Based on current market data` 
    })
    .setTimestamp();

    const backButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`manip_refresh_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                .setLabel('◀️ Back to Opportunities')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [backButton] });
}

async function showRiskAnalysis(
    interaction: ButtonInteraction,
    budget: number,
    roi: number,
    risk: string,
    minDemand: number
) {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle('⚠️ Market Manipulation Risk Analysis')
        .setDescription(
            `**EXTREME CAUTION ADVISED**\n\n` +
            `Market manipulation is one of the highest-risk strategies in Hypixel Bazaar trading. ` +
            `Understanding these risks is crucial before committing capital.`
        );

    embed.addFields({
        name: '💰 Financial Risks',
        value: `**Capital Requirements:**\n` +
               `• Must have full budget (${formatFullNumber(budget)} coins) available\n` +
               `• Money will be locked up for extended periods\n` +
               `• No guarantee of returns - could lose everything\n\n` +
               `**Market Volatility:**\n` +
               `• Prices can move against your position\n` +
               `• Other players may dump similar items\n` +
               `• Demand can disappear overnight`,
        inline: false
    });

    embed.addFields({
        name: '🎯 Execution Risks',
        value: `**Competition:**\n` +
               `• Other players may copy your strategy\n` +
               `• Price wars can eliminate profits\n` +
               `• Coordinated counter-manipulation possible\n\n` +
               `**Timing:**\n` +
               `• May take much longer to sell than estimated\n` +
               `• Market conditions can change during execution\n` +
               `• Opportunity windows may close rapidly`,
        inline: false
    });

    embed.addFields({
        name: '📉 Worst-Case Scenarios',
        value: `**Total Loss:** If demand disappears, you may be unable to sell items\n` +
               `**Partial Loss:** Forced to sell below break-even due to competition\n` +
               `**Opportunity Cost:** Money tied up prevents other profitable trades\n` +
               `**Market Crash:** Overall market decline affects all items`,
        inline: false
    });

    embed.addFields({
        name: '✅ Risk Mitigation Strategies',
        value: `• **Start Small:** Test with lower-value items first\n` +
               `• **Diversify:** Don't put all money into one manipulation\n` +
               `• **Set Limits:** Define maximum acceptable loss beforehand\n` +
               `• **Monitor Constantly:** Watch for market changes and competition\n` +
               `• **Exit Strategy:** Have a plan for cutting losses if needed`,
        inline: false
    });

    embed.addFields({
        name: '📋 Current Settings Risk Assessment',
        value: `**Budget:** ${formatFullNumber(budget)} coins - ${budget >= 10000000 ? '🔴 HIGH EXPOSURE' : budget >= 1000000 ? '🟡 MEDIUM EXPOSURE' : '🟢 LOW EXPOSURE'}\n` +
               `**ROI Target:** ${roi}x - ${roi >= 3 ? '🔴 VERY AGGRESSIVE' : roi >= 2 ? '🟡 AGGRESSIVE' : '🟢 CONSERVATIVE'}\n` +
               `**Risk Tolerance:** ${risk} - ${risk === 'EXTREME' ? '🔴 DANGEROUS' : risk === 'HIGH' ? '🟠 RISKY' : risk === 'MEDIUM' ? '🟡 MODERATE' : '🟢 CAUTIOUS'}\n` +
               `**Overall Assessment:** ${getOverallRiskAssessment(budget, roi, risk)}`,
        inline: false
    });

    embed.setFooter({ 
        text: `💀 DISCLAIMER: This is not financial advice. Trade at your own risk. Past performance does not guarantee future results.` 
    })
    .setTimestamp();

    const backButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`manip_refresh_${budget}_${roi}_0_${minDemand}_1`)
                .setLabel('◀️ Back to Opportunities')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('manip_disclaimer')
                .setLabel('⚠️ I Understand the Risks')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
        );

    await interaction.editReply({ embeds: [embed], components: [backButton] });
}

function getOverallRiskAssessment(budget: number, roi: number, risk: string): string {
    let riskScore = 0;
    
    if (budget >= 10000000) riskScore += 3;
    else if (budget >= 1000000) riskScore += 2;
    else riskScore += 1;
    
    if (roi >= 3) riskScore += 3;
    else if (roi >= 2) riskScore += 2;
    else riskScore += 1;
    
    if (risk === 'EXTREME') riskScore += 3;
    else if (risk === 'HIGH') riskScore += 2;
    else if (risk === 'MEDIUM') riskScore += 1;
    
    if (riskScore >= 8) return '🔴 EXTREMELY DANGEROUS - Reconsider this strategy';
    else if (riskScore >= 6) return '🟠 VERY HIGH RISK - Only for experienced traders';
    else if (riskScore >= 4) return '🟡 HIGH RISK - Proceed with extreme caution';
    else return '🟢 MODERATE RISK - Still significant potential for loss';
}

async function showItemStrategy(
    interaction: ButtonInteraction | StringSelectMenuInteraction, 
    itemId: string,
    budget: number, 
    roi: number, 
    risk: string, 
    minDemand: number, 
    currentPage: number,
    step: number = 1
) {
    const params: ManipulationParams = {
        maxBudget: budget,
        targetROI: roi,
        maxRisk: risk as any,
        minDemand: minDemand
    };

    // console.log(`DEBUG: Selected itemId: "${itemId}" (type: ${typeof itemId})`);

    // Find the specific item - search through cached opportunities first
    const result = await MarketManipulationService.findManipulationOpportunities(params, 1, 1000, false); // Use cache
    // console.log(`DEBUG: Looking for itemId: "${itemId}", found ${result.opportunities.length} opportunities`);
    // console.log(`DEBUG: Available itemIds:`, result.opportunities.slice(0, 5).map(opp => `"${opp.itemId}"`));
    
    let opportunity = result.opportunities.find(
        opp => String(opp.itemId).toUpperCase().trim() === String(itemId).toUpperCase().trim()
    );
    
    // If still not found, try with relaxed parameters to ensure we can find the item
    if (!opportunity) {
        const relaxedParams: ManipulationParams = {
            maxBudget: budget * 10, // Increase budget limit
            targetROI: roi * 0.5, // Lower ROI requirement
            maxRisk: 'EXTREME', // Allow any risk level
            minDemand: 0 // Remove demand requirement
        };
        const relaxedResult = await MarketManipulationService.findManipulationOpportunities(relaxedParams, 1, 1000, false); // Use cache
        opportunity = relaxedResult.opportunities.find(
            opp => String(opp.itemId).toUpperCase().trim() === String(itemId).toUpperCase().trim()
        );
    }
    
    if (!opportunity) {
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setTitle('❌ Item Not Found')
            .setDescription('The selected item is no longer available for manipulation. Market conditions may have changed.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    const totalSteps = 6;
    const stepEmojis = ['📊', '💰', '🎯', '🪜', '🔄', '🎉'];
    const currentStepEmoji = stepEmojis[step - 1] || '📋';

    let embed = new EmbedBuilder()
        .setColor(step === totalSteps ? EMBED_COLORS.SUCCESS : EMBED_COLORS.INFO)
        .setTitle(`${currentStepEmoji} Step ${step} of ${totalSteps}: ${getStepTitle(step)}`)
        .setDescription(`**Market Manipulation Guide for ${formatItemName(opportunity.itemId)}**\n\n${getStepDescription(step, opportunity, roi)}`);

    // Add progress bar
    let progressBar = '';
    for (let i = 1; i <= totalSteps; i++) {
        if (i < step) progressBar += '✅';
        else if (i === step) progressBar += '🔴';
        else progressBar += '⚪';
    }
    embed.addFields({
        name: `📈 Progress: ${step}/${totalSteps}`,
        value: progressBar,
        inline: false
    });

    // Add step-specific content
    embed.addFields(getStepFields(step, opportunity));

    embed.setFooter({ 
        text: `Investment: ${formatCurrency(opportunity.totalAcquisitionCost)} • Expected Profit: ${formatCurrency(opportunity.projectedProfit)} • Risk: ${opportunity.riskLevel}` 
    })
    .setTimestamp();

    // Create navigation buttons
    const navButtons = new ActionRowBuilder<ButtonBuilder>();
    
    navButtons.addComponents(
        new ButtonBuilder()
            .setCustomId(`manip_refresh_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
            .setLabel('◀️ Back to List')
            .setStyle(ButtonStyle.Secondary)
    );
    
    if (step > 1) {
        navButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`manip_step_CACHED_${budget}_${roi}_${risk}_${minDemand}_${currentPage}_${step - 1}`)
                .setLabel('◀️ Previous Step')
                .setStyle(ButtonStyle.Secondary)
        );
    }
    
    if (step < totalSteps) {
        navButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`manip_step_CACHED_${budget}_${roi}_${risk}_${minDemand}_${currentPage}_${step + 1}`)
                .setLabel('Next Step ▶️')
                .setStyle(ButtonStyle.Primary)
        );
    }

    if (step === totalSteps) {
        navButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`manip_step_CACHED_${budget}_${roi}_${risk}_${minDemand}_${currentPage}_1`)
                .setLabel('🔄 Restart Guide')
                .setStyle(ButtonStyle.Success)
        );
    }

    await interaction.editReply({ embeds: [embed], components: [navButtons] });
}

function getStepTitle(step: number): string {
    const titles = [
        '🔍 Identify: Perfect Manipulation Target',
        '🧮 Calculate: Total Buyout Cost & Break-Even', 
        '🎯 Psychology: Set High Sell Orders for Price Manipulation',
        '🪜 Ladder: Create Buy Order Stepping Strategy',
        '💰 Execute: Place Buy Orders and Wait',
        '🔄 Repeat: Execute Ladder Until Everything is Sold'
    ];
    return titles[step - 1] || 'Unknown Step';
}

function getStepDescription(step: number, opportunity: any, roi: number = 2): string {
    switch (step) {
        case 1:
            return `**Perfect manipulation target identified:**\n\n` +
                   `✅ **Low supply:** Only ${formatFullNumber(opportunity.sellVolume)} sell volume and ${formatFullNumber(opportunity.weeklySellMovement / 168)}/hour supply\n` +
                   `✅ **High demand:** ${formatFullNumber(opportunity.buyVolume)} buy volume and ${formatFullNumber(opportunity.weeklyBuyMovement / 168)}/hour demand\n` +
                   `✅ **Large scale:** ${formatCurrency(opportunity.totalAcquisitionCost)} buyout required\n\n` +
                   `🎯 **This item is suitable for manipulation - low supply + high demand = profit potential**`;
        case 2:
            return `**Complete market domination calculation:**\n\n` +
                   `💰 **Total buyout cost:** ${formatCurrency(opportunity.totalAcquisitionCost)}\n` +
                   `📦 **Total items:** ${formatFullNumber(opportunity.totalItemsAvailable)} items\n` +
                   `💸 **Average cost/item:** ${formatCurrency(opportunity.averageCostPerItem)}\n` +
                   `📈 **Break-even price:** ${formatCurrency(opportunity.minimumSellPrice)} (includes 1.125% tax)\n\n` +
                   `🎯 **You need ${formatCurrency(opportunity.totalAcquisitionCost)} to buy the entire market**`;
        case 3:
            return `**Price psychology manipulation:**\n\n` +
                   `🧠 **Goal:** Make players think "${formatItemName(opportunity.itemId)} is worth more"\n` +
                   `🎯 **Target price:** ${formatCurrency(opportunity.targetSellPrice)} (${roi}x your break-even)\n` +
                   `📈 **Strategy:** High sell orders = artificial price ceiling = player psychology manipulation\n`;
        case 4:
            return `**Buy order ladder strategy:**\n\n` +
                   `🪜 **Strategy:** Start low, make players outbid you, sell to their inflated orders\n` +
                   `💰 **Current highest buy:** ${formatCurrency(opportunity.currentBuyPrice)}\n` +
                   `🎯 **Target buy order:** ${formatCurrency(opportunity.initialBuyOrderPrice)}\n` +
                   `💸 **Profit per item:** ${formatCurrency(opportunity.initialBuyOrderPrice - opportunity.minimumSellPrice)}\n\n` +
                   `🔥 **Every time someone outbids you by 0.1 coin = instant profit when you sell**`;
        case 5:
            return `**Execute buy order placement:**\n\n` +
                   `⚡ **Speed is critical** - Other traders scan for these opportunities\n` +
                   `📈 **Place all your buy orders from the ladder strategy**\n` +
                   `⏰ **Wait for other players to outbid your orders**\n\n` +
                   `🎯 **Once prices are driven up, sell everything to the highest buy orders**`;
        case 6:
            return `**Rinse and repeat until complete:**\n\n` +
                   `🔄 **Keep running the ladder until all ${formatFullNumber(opportunity.totalItemsAvailable)} items are sold**\n` +
                   `💰 **Each cycle = more profit as prices get driven higher**\n` +
                   `⏱️ **Est. completion time:** ${opportunity.estimatedTimeToSell.toFixed(1)} hours\n` +
                   `🎉 **Final profit:** ${formatCurrency(opportunity.projectedProfit)} minimum\n\n` +
                   `🚀 **Congratulations - You've successfully manipulated the market**`;
        default:
            return 'Unknown step in manipulation strategy.';
    }
}

function getStepFields(step: number, opportunity: any, roi: number = 2): any[] {
    switch (step) {
        case 1:
            return [{
                name: '🎯 Manipulation Target Analysis',
                value: `**Supply Metrics (low = good):**\n` +
                       `• Sell Volume: ${formatFullNumber(opportunity.sellVolume)} (low supply ✅)\n` +
                       `• Supply Rate: ${formatFullNumber(opportunity.weeklySellMovement / 168)}/hour (${opportunity.weeklySellMovement}/week)\n` +
                       `• Items Available: ${formatFullNumber(opportunity.totalItemsAvailable)} items to buy\n\n` +
                       `**Demand Metrics (high = good):**\n` +
                       `• Buy Volume: ${formatFullNumber(opportunity.buyVolume)} (strong demand ✅)\n` +
                       `• Demand Rate: ${formatFullNumber(opportunity.weeklyBuyMovement / 168)}/hour (${opportunity.weeklyBuyMovement}/week)\n` +
                       `• Buy Orders: Active buyers ready to pay more\n\n` +
                       `📊 **Manipulation Score: ${opportunity.manipulationScore.toFixed(1)}/100**`,
                inline: false
            }];
        case 2:
            return [{
                name: '📋 Buyout Instructions',
                value: `**1.** Go to \`/bazaar\` in Hypixel Skyblock\n` +
                       `**2.** Search for "${formatItemName(opportunity.itemId)}"\n` +
                       `**3.** Click "Buy Instantly"\n` +
                       `**4.** Purchase all ${formatFullNumber(opportunity.totalItemsAvailable)} items\n` +
                       `**5.** Confirm total cost: ${formatCurrency(opportunity.totalAcquisitionCost)}\n\n` +
                       `⚠️ **Warning:** Execute this immediately! Delay = someone else may buy the items.`,
                inline: false
            }];
        case 3:
            return [{
                name: '🎯 Sell Order Setup',
                value: `**1.** List 5-10 items at ${formatCurrency(opportunity.targetSellPrice)} each\n` +
                       `**2.** Keep remaining items in your inventory\n` +
                       `**3.** These high sell orders create a "price ceiling"\n` +
                       `**4.** Players will see this high price and think the item is valuable\n\n` +
                       `🧠 **Psychology:** High sell orders influence player perception of item value.`,
                inline: false
            }];
        case 4:
            const strategy = MarketManipulationService.calculateSteppingStrategy(opportunity);
            
            let steppingInstructions = `1. Set all buy orders below to drive prices up\n`;
            steppingInstructions += `2. Wait for other players to outbid your orders\n`;
            steppingInstructions += `3. Once prices are high, sell all items at final price\n\n`;

            steppingInstructions += `**Current Highest Buy:** ${formatCurrency(strategy.currentHighestBuy)}\n`;
            steppingInstructions += `**Target Buy Price:** ${formatCurrency(strategy.targetBuyPrice)}\n`;
            steppingInstructions += `**Price Gap to Bridge:** ${formatCurrency(strategy.priceGapToBridge)}\n\n`;
            
            const maxSteps = Math.min(strategy.steps.length, 10);
            for (let i = 0; i < maxSteps; i++) {
                const step = strategy.steps[i];
                steppingInstructions += `**Buy Order ${step.stepNumber}:** Set at **${formatCurrency(step.buyOrderPrice)}**\n`;
            }
            if (strategy.steps.length > 5) {
                steppingInstructions += `*Continue this pattern for ${strategy.steps.length - 5} more price levels...*\n\n`;
            } else {
                steppingInstructions += `\n`;
            }
            
            const finalProfit = opportunity.projectedProfit;
            // Use the highest buy order price + 0.1 as the final sell price (not the inflated targetSellPrice)
            const highestBuyOrderPrice = strategy.steps[strategy.steps.length - 1]?.buyOrderPrice || strategy.targetBuyPrice;
            const finalSellPrice = highestBuyOrderPrice + 0.1; // Sell just above highest buy order
            steppingInstructions += `**💰 Sell all ${formatFullNumber(opportunity.totalItemsAvailable)} items at ${formatCurrency(finalSellPrice)}**\n`;
            steppingInstructions += `**🎉 Total Profit: ${formatCurrency(finalProfit)}**`;
            
            return [{
                name: '🪜 Manipulation Strategy',
                value: steppingInstructions,
                inline: false
            }];
        case 5:
            return [{
                name: '📊 Active Management',
                value: `**1.** Check buy orders every 10-20 seconds\n` +
                       `**2.** When someone outbids your order → sell immediately\n` +
                       `**3.** Place next buy order according to strategy\n` +
                       `**4.** Monitor for competition or market changes\n` +
                       `**5.** Be prepared to exit if demand disappears\n\n` +
                       `⏱️ **Estimated completion:** ${opportunity.estimatedTimeToSell.toFixed(1)} hours`,
                inline: false
            }];
        case 6:
            return [{
                name: '🎉 Results Summary',
                value: `**Initial Investment:** ${formatCurrency(opportunity.totalAcquisitionCost)}\n` +
                       `**Projected Profit:** ${formatCurrency(opportunity.projectedProfit)}\n` +
                       `**ROI:** ${(opportunity.projectedProfit/opportunity.totalAcquisitionCost*100).toFixed(1)}%\n` +
                       `**Items Manipulated:** ${formatFullNumber(opportunity.totalItemsAvailable)}\n` +
                       `**Strategy Risk:** ${opportunity.riskLevel}\n\n` +
                       `${opportunity.projectedProfit > 0 ? '🎯 **Success!** Profit achieved through market manipulation.' : '⚠️ **Check actual results** - market may have shifted during execution.'}`,
                inline: false
            }];
        default:
            return [];
    }
}
