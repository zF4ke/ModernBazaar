import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } from "discord.js";
import { Command } from "../types";
import { MarketManipulationService, ManipulationParams } from "../services/market-manipulation";
import { formatCurrency, formatPercentage, formatItemName, formatFullNumber, formatHourlyMovement } from "../utils/formatting";
import { EMBED_COLORS } from "../constants";

const ITEMS_PER_PAGE = 2;

export const bazaarManipulationCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('bazaar-manipulation')
        .setDescription('Find items suitable for market manipulation strategies')
        .addIntegerOption(option =>
            option.setName('budget')
                .setDescription('Maximum budget for buying out the market (required)')
                .setRequired(true)
                .setMinValue(100000)
                .setMaxValue(2000000000)
        )
        .addNumberOption(option =>
            option.setName('roi')
                .setDescription('Target return on investment multiplier (default: 2.0 = double money)')
                .setRequired(false)
                .setMinValue(1.1)
                .setMaxValue(10.0)
        )
        .addStringOption(option =>
            option.setName('risk')
                .setDescription('Maximum risk tolerance (default: MEDIUM)')
                .setRequired(false)
                .addChoices(
                    { name: 'Low Risk - Conservative plays only', value: 'LOW' },
                    { name: 'Medium Risk - Balanced approach', value: 'MEDIUM' },
                    { name: 'High Risk - Aggressive strategies', value: 'HIGH' },
                    { name: 'Extreme Risk - Dangerous but potentially very profitable', value: 'EXTREME' }
                )
        )
        .addIntegerOption(option =>
            option.setName('min-demand')
                .setDescription('Minimum weekly buy movement required (default: 1000)')
                .setRequired(false)
                .setMinValue(100)
                .setMaxValue(100000)
        )
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        try {
            const budget = interaction.options.getInteger('budget')!;
            const roi = interaction.options.getNumber('roi') || 2.0;
            const risk = interaction.options.getString('risk') || 'MEDIUM';
            const minDemand = interaction.options.getInteger('min-demand') || 1000;
            const page = interaction.options.getInteger('page') || 1;

            const params: ManipulationParams = {
                maxBudget: budget,
                targetROI: roi,
                maxRisk: risk as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
                minDemand: minDemand
            };

            // Clear cache and force refresh when user runs the command
            MarketManipulationService.clearCache();
            const result = await MarketManipulationService.findManipulationOpportunities(params, page, ITEMS_PER_PAGE, true);
            const { opportunities, totalCount, totalPages, currentPage, isFromCache } = result;

            if (totalCount === 0) {
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.WARNING)
                    .setTitle('⚠️ No Market Manipulation Opportunities Found')
                    .setDescription('No items meet your criteria for market manipulation.')
                    .addFields({
                        name: '💡 Tips to Find Opportunities',
                        value: `• Increase your budget from ${formatFullNumber(budget)} coins\n` +
                               `• Lower your ROI target from ${roi}x\n` +
                               `• Increase risk tolerance from ${risk}\n` +
                               `• Lower minimum demand from ${formatFullNumber(minDemand)}/week\n` +
                               `• Check back later for market changes`,
                        inline: false
                    })
                    .setFooter({ text: '⚠️ Market manipulation carries significant financial risk!' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Build results embed
            const cacheStatus = isFromCache ? '🔄 Cached data' : '✨ Fresh data';
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.WARNING) // Use warning color for manipulation
                .setTitle(`⚡ Market Manipulation Opportunities`)
            .setDescription(
                `**Budget:** ${formatFullNumber(budget)} coins | **Target ROI:** ${roi}x | **Risk:** ${risk}\n` +
                `**Min Demand:** ${formatFullNumber(minDemand)}/week | ${cacheStatus}\n\n` +
                `📊 **Page ${currentPage} of ${totalPages}** • **${totalCount} total opportunities**\n\n` +
                `👁️ = Full market visibility | ⚠️ = Hidden orders estimated\n` +
                `⚠️ **WARNING:** Market manipulation is high-risk and may result in significant losses!`
            );            let fieldValue = '';
            
            for (let i = 0; i < opportunities.length; i++) {
                const opp = opportunities[i];
                const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
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
                name: `🎯 Manipulation Targets (#${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, totalCount)})`,
                value: fieldValue || 'No opportunities on this page.',
                inline: false
            });

            // Calculate summary statistics
            const totalBuyoutCost = opportunities.reduce((sum, opp) => sum + opp.totalAcquisitionCost, 0);
            const totalProjectedProfit = opportunities.reduce((sum, opp) => sum + opp.projectedProfit, 0);
            const avgScore = opportunities.reduce((sum, opp) => sum + opp.manipulationScore, 0) / opportunities.length;
            const lowRiskCount = opportunities.filter(opp => opp.riskLevel === 'LOW').length;

            embed.addFields({
                name: '📈 Summary',
                value: `**Page:** ${currentPage} of ${totalPages}\n` +
                       `**Total Buyout Cost:** ${formatCurrency(totalBuyoutCost)}\n` +
                       `**Total Projected Profit:** ${formatCurrency(totalProjectedProfit)}\n` +
                       `**Average Score:** ${avgScore.toFixed(1)}/100\n` +
                       `**Low Risk Items:** ${lowRiskCount}/${opportunities.length}`,
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
                text: `💀 High-risk strategy! Only invest what you can afford to lose • Page navigation below` 
            })
            .setTimestamp();

            // Create navigation buttons
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`manip_first_${budget}_${roi}_${risk}_${minDemand}`)
                        .setLabel('⏮️ First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`manip_prev_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`manip_page_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel(`Page ${currentPage}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`manip_next_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages),
                    new ButtonBuilder()
                        .setCustomId(`manip_last_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('Last ⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );

            // Create action buttons
            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`manip_refresh_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`manip_strategy_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('📋 Show Strategy')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(opportunities.length === 0),
                    new ButtonBuilder()
                        .setCustomId(`manip_risk_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('⚠️ Risk Analysis')
                        .setStyle(ButtonStyle.Danger)
                );

            // Create action buttons
            const actionButtons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`manip_refresh_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`manip_risk_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                        .setLabel('⚠️ Risk Analysis')
                        .setStyle(ButtonStyle.Danger)
                );

            // Create item selection dropdown (up to 25 items)
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>();
            if (opportunities.length > 0) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`manip_item_select_${budget}_${roi}_${risk}_${minDemand}_${currentPage}`)
                    .setPlaceholder('📋 Select an item to see step-by-step strategy')
                    .setMinValues(1)
                    .setMaxValues(1);

                for (let i = 0; i < Math.min(opportunities.length, 25); i++) {
                    const opp = opportunities[i];
                    const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                    const riskEmoji = opp.riskLevel === 'LOW' ? '🟢' : opp.riskLevel === 'MEDIUM' ? '🟡' : opp.riskLevel === 'HIGH' ? '🟠' : '🔴';
                    
                    selectMenu.addOptions({
                        label: `#${globalRank}. ${formatItemName(opp.itemId).substring(0, 80)}`,
                        description: `${formatCurrency(opp.projectedProfit)} profit • ${formatCurrency(opp.totalAcquisitionCost)} cost`,
                        value: opp.itemId,
                        emoji: riskEmoji
                    });
                }
                
                selectRow.addComponents(selectMenu);
            }

            const components: any[] = [navigationRow, actionButtons];
            if (opportunities.length > 0) {
                components.push(selectRow);
            }

            await interaction.editReply({ 
                embeds: [embed], 
                components: components
            });

        } catch (error) {
            console.error('Error in bazaar-manipulation command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to analyze market manipulation opportunities. Please try again later.')
                .setColor(EMBED_COLORS.ERROR)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
