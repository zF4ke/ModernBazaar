import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../types/index.js';
import { NPCArbitrageService, ArbitrageOpportunity } from '../services/npc-arbitrage.js';
import { ERROR_MESSAGES, EMBED_COLORS } from '../constants/index.js';
import { formatCurrency, formatFullNumber } from '../utils/formatting.js';
import { Logger } from '../utils/logger.js';

export const npcArbitrageCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('npc-arbitrage')
        .setDescription('Find items cheaper on bazaar than NPC sell price')
        .addIntegerOption(option =>
            option.setName('budget')
                .setDescription('Your available budget in coins')
                .setRequired(true)
                .setMinValue(100)
                .setMaxValue(2000000000)
        )
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number (7 opportunities per page)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Analyze a specific item for NPC arbitrage (use exact bazaar item ID)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('strategy')
                .setDescription('Buying strategy for profit calculations')
                .setRequired(false)
                .addChoices(
                    { name: 'Instant Buy (4% surcharge)', value: 'instabuy' },
                    { name: 'Buy Orders (market price)', value: 'buyorder' }
                )
        )
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('Sort opportunities by different criteria')
                .setRequired(false)
                .addChoices(
                    { name: 'Total Profit (Default)', value: 'totalProfit' },
                    { name: 'Profit Margin %', value: 'profitMargin' },
                    { name: 'Profit per Item (Coins)', value: 'profitPerItem' },
                    { name: 'Weekly Volume', value: 'weeklySellMovement' },
                    { name: 'Max Affordable', value: 'maxAffordable' }
                )
        ),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isRepliable() || !interaction.isChatInputCommand()) return;

        // Always defer reply for long-running operations
        try {
            await interaction.deferReply();
        } catch (error) {
            //console.error('Failed to defer reply:', error);
        }

        try {
            const budget = interaction.options.getInteger('budget', true);
            const page = interaction.options.getInteger('page') || 1;
            const specificItem = interaction.options.getString('item');
            const strategy = interaction.options.getString('strategy') || 'instabuy';
            const sortBy = interaction.options.getString('sort') || 'totalProfit';

            if (specificItem) {
                // Analyze specific item
                const opportunity = await NPCArbitrageService.analyzeSpecificItem(
                    specificItem.toUpperCase(), 
                    budget, 
                    strategy as 'instabuy' | 'buyorder'
                );
                
                if (!opportunity) {
                    const embed = new EmbedBuilder()
                        .setColor(EMBED_COLORS.ERROR)
                        .setTitle('❌ Item Analysis Failed')
                        .setDescription(`Could not find NPC arbitrage data for **${specificItem}**\n\nThis item either:\n• Has no NPC sell price\n• Is not available on bazaar\n• Does not exist`)
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                const strategyText = strategy === 'instabuy' ? 'Instant Buy (depth-aware)' : 'Buy Orders (market price)';
                const embed = new EmbedBuilder()
                    .setColor(opportunity.feasible && opportunity.profitPerItem > 0 ? EMBED_COLORS.SUCCESS : EMBED_COLORS.ERROR)
                    .setTitle(`🏪 NPC Arbitrage Analysis: ${opportunity.itemName}`)
                    .setDescription(opportunity.feasible && opportunity.profitPerItem > 0 ? 
                        '💰 **PROFITABLE OPPORTUNITY FOUND!**' : 
                        '❌ **NOT PROFITABLE**')
                    .addFields(
                        {
                            name: '💸 Strategy & Costs',
                            value: `**Strategy:** ${strategyText}\n**Bazaar Buy Price:** ${opportunity.bazaarBuyPrice.toFixed(3)} coins\n**NPC Sell Price:** ${formatCurrency(opportunity.npcSellPrice)} coins`,
                            inline: true
                        },
                        {
                            name: '💰 Profit Analysis',
                            value: `**Profit per Item:** ${opportunity.profitPerItem > 0 ? '+' : ''}${opportunity.profitPerItem.toFixed(3)} coins\n**Profit Margin:** ${opportunity.profitMargin.toFixed(2)}%`,
                            inline: true
                        },
                        {
                            name: '📊 With Your Budget',
                            value: `**Budget:** ${formatFullNumber(budget)} coins\n**Max Items:** ${formatCurrency(opportunity.maxAffordable)}\n**Total Profit:** ${opportunity.totalProfit > 0 ? '+' : ''}${formatCurrency(opportunity.totalProfit)} coins`,
                            inline: false
                        }
                    );

                if (opportunity.feasible && opportunity.profitPerItem > 0) {
                    embed.addFields({
                        name: '🎯 How to Execute',
                        value: strategy === 'instabuy' 
                            ? `1. Go to Bazaar and instant buy **${formatFullNumber(opportunity.maxAffordable)}x ${opportunity.itemName}**\n2. Find the appropriate NPC and sell all items\n3. Profit: **${formatCurrency(opportunity.totalProfit)} coins**`
                            : `1. Place buy orders for **${formatFullNumber(opportunity.maxAffordable)}x ${opportunity.itemName}** at market price\n2. Wait for orders to fill, then sell to NPCs\n3. Profit: **${formatCurrency(opportunity.totalProfit)} coins**`,
                        inline: false
                    });
                }

                embed.setFooter({ 
                    text: strategy === 'instabuy' 
                        ? 'Prices include depth-aware calculation • NPC prices from Hypixel API' 
                        : 'Based on buy order prices • NPC prices from Hypixel API'
                })
                .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Find all opportunities with pagination (force refresh for new command)
            const result = await NPCArbitrageService.findArbitrageOpportunities(
                budget, 
                page, 
                7, // 7 items per page
                strategy as 'instabuy' | 'buyorder',
                true, // Force refresh for new command execution
                sortBy as 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'weeklySellMovement' | 'maxAffordable'
            );

            const { opportunities, totalCount, totalPages, currentPage, totalProfit } = result;

            if (totalCount === 0) {
                const cacheStats = NPCArbitrageService.getCacheStats();
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.WARNING)
                    .setTitle('🏪 No NPC Arbitrage Opportunities Found')
                    .setDescription(`No profitable NPC arbitrage opportunities found with your budget of **${formatFullNumber(budget)} coins**.`)
                    .addFields({
                        name: '📊 Analysis Info',
                        value: `**Items Checked:** ${cacheStats.itemCount}\n**Budget:** ${formatFullNumber(budget)} coins\n**Cache Age:** ${Math.round(cacheStats.cacheAge / 1000 / 60)} minutes`,
                        inline: false
                    })
                    .setFooter({ text: 'Try with a larger budget or check back later when market conditions change' })
                    .setTimestamp();

                try {
                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    //
                }
                return;
            }

            // Build results embed with compact organization and pagination
            const strategyText = strategy === 'instabuy' ? 'Instant Buy (depth-aware)' : 'Buy Orders (market price)';
            const sortText = {
                'totalProfit': 'total profit',
                'profitMargin': 'profit margin %',
                'profitPerItem': 'profit per item',
                'weeklySellMovement': 'weekly volume',
                'maxAffordable': 'max affordable'
            }[sortBy];
            
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle(`🏪 NPC Arbitrage Opportunities (${formatFullNumber(budget)} coins)`)
                .setDescription(`**Strategy:** ${strategyText}\n**Buy from Bazaar → Sell to NPCs**\n\n📊 **Page ${currentPage} of ${totalPages}** • **${totalCount} total opportunities**\n\n*Results sorted by ${sortText}*`);

            // Create compact table-like format with one item per line for better readability
            let fieldValue = '';
            
            for (let i = 0; i < opportunities.length; i++) {
                const opp = opportunities[i];
                const globalRank = (currentPage - 1) * 7 + i + 1; // Global ranking across all pages
                const profitIcon = opp.profitPerItem > 1000 ? '🔥' : opp.profitPerItem > 100 ? '💰' : '💡';
                
                // Format: Buy: 1,040.123 → NPC: 2,000 (+960.123 coins, 92.3%)
                // Max: 961,538x (cost: 1,000,000) = 923,076,480.123 total profit
                const totalCost = opp.maxAffordable * opp.bazaarBuyPrice;
                fieldValue += `${profitIcon} **#${globalRank}. ${opp.itemName}**\n`;
                fieldValue += `Buy: ${opp.bazaarBuyPrice.toFixed(3)} → NPC: ${formatCurrency(opp.npcSellPrice)} `;
                fieldValue += `(+${opp.profitPerItem.toFixed(3)} coins, ${opp.profitMargin.toFixed(1)}%)\n`;
                fieldValue += `Max: ${formatFullNumber(opp.maxAffordable)} items (cost: ${formatCurrency(totalCost)}) = ${formatCurrency(opp.totalProfit)} total profit\n\n`;
            }

            // Add all opportunities in a single field since we have max 7 per page
            embed.addFields({
                name: `� Top Opportunities (#${(currentPage - 1) * 7 + 1}-${Math.min(currentPage * 7, totalCount)})`,
                value: fieldValue || 'No opportunities on this page.',
                inline: false
            });

            // Calculate total profit for current page
            const currentPageProfit = opportunities.reduce((sum, opp) => sum + opp.totalProfit, 0);
            
            embed.addFields({
                name: '📈 Summary',
                value: `**Page:** ${currentPage} of ${totalPages}\n**Page Profit:** ${formatCurrency(currentPageProfit)} coins\n**Total Profit (All):** ${formatCurrency(totalProfit)} coins\n**Best Margin:** ${opportunities[0]?.profitMargin.toFixed(2)}%`,
                inline: false
            });

            embed.setFooter({ 
                text: `💡 Use navigation buttons or page:<number> • ${strategy === 'instabuy' ? 'Depth-aware pricing' : 'Buy order prices'}` 
            })
            .setTimestamp();

            // Create navigation buttons
            const navigationRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_first_${budget}_${strategy}_${sortBy}`)
                        .setLabel('⏮️ First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_prev_${budget}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_page_${budget}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel(`Page ${currentPage}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_next_${budget}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages),
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_last_${budget}_${strategy}_${currentPage}_${sortBy}`)
                        .setLabel('Last ⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );

            // Create sort buttons (split into two rows - 3 and 2 buttons)
            const sortRow1 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_sort_totalProfit_${budget}_${strategy}_${currentPage}`)
                        .setLabel('💰 Total Profit')
                        .setStyle(sortBy === 'totalProfit' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_sort_profitMargin_${budget}_${strategy}_${currentPage}`)
                        .setLabel('📊 Margin %')
                        .setStyle(sortBy === 'profitMargin' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_sort_profitPerItem_${budget}_${strategy}_${currentPage}`)
                        .setLabel('🪙 Margin Coins')
                        .setStyle(sortBy === 'profitPerItem' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const sortRow2 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_sort_weeklySellMovement_${budget}_${strategy}_${currentPage}`)
                        .setLabel('📦 Volume')
                        .setStyle(sortBy === 'weeklySellMovement' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`npc_arbitrage_sort_maxAffordable_${budget}_${strategy}_${currentPage}`)
                        .setLabel('🛒 Max Affordable')
                        .setStyle(sortBy === 'maxAffordable' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            await interaction.editReply({ embeds: [embed], components: [navigationRow, sortRow1, sortRow2] });

        } catch (error) {
            // console.error('Error in npc-arbitrage command:', error);
            
            // let errorMessage: string = ERROR_MESSAGES.COMMAND_ERROR;
            // let errorTitle = '❌ Error';
            
            // if (error instanceof Error) {
            //     if (error.message.includes('timed out')) {
            //         errorTitle = '⏱️ Request Timed Out';
            //         errorMessage = 'The analysis took too long to complete. This usually happens when:\n\n• The Hypixel API is slow\n• There are many items to analyze\n• Network connectivity issues\n\nPlease try again in a moment.';
            //     } else if (error.message.includes('fetch')) {
            //         errorTitle = '🌐 Network Error';
            //         errorMessage = 'Failed to fetch data from Hypixel API. Please check your internet connection and try again.';
            //     } else {
            //         errorMessage = error.message;
            //     }
            // }
            
            // const embed = new EmbedBuilder()
            //     .setColor(EMBED_COLORS.ERROR)
            //     .setTitle(errorTitle)
            //     .setDescription(errorMessage)
            //     .setTimestamp();

            // try {
            //     await interaction.followUp({ embeds: [embed] });
            // } catch (followUpError) {
            //     console.error('Failed to send error message:', followUpError);
            // }
        }

        // await interaction.editReply({
        //     content: 'This command is currently under maintenance. Please check back later for updates.',
        // });
    }
};
