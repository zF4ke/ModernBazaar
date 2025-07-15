import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../types";

export const helpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show information about bot commands and usage'),

    async execute(interaction: CommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Hypixel Bazaar Profit Calculator Bot')
            .setDescription('Calculate crafting profits using real-time Hypixel Bazaar data!')
            .setColor(0x5D7B5D)
            .addFields(
                {
                    name: '🔨 `/calculate-profit`',
                    value: 'Calculate profit for crafting a specific item using order book strategy\n' +
                           '**Usage:** `/calculate-profit item:ENCHANTED_BREAD budget:1000000`\n' +
                           '• `item`: The item you want to craft (use autocomplete)\n' +
                           '• `budget`: Your total budget in coins\n' +
                           '• Uses buy orders for ingredients and sell orders for results',
                    inline: false
                },
                {
                    name: '📜 `/list-recipes`',
                    value: 'List all available crafting recipes\n' +
                           '**Usage:** `/list-recipes [search:optional]`\n' +
                           '• `search`: Optional search term to filter recipes',
                    inline: false
                },
                {
                    name: '💰 `/bazaar-price`',
                    value: 'Check current bazaar prices for any item\n' +
                           '**Usage:** `/bazaar-price item:WHEAT`\n' +
                           '• `item`: The exact bazaar item ID to check',
                    inline: false
                },
                {
                    name: '📊 `/market-analysis`',
                    value: 'Get detailed market analysis with order book data\n' +
                           '**Usage:** `/market-analysis item:ENCHANTED_BREAD`\n' +
                           '• `item`: The exact bazaar item ID to analyze\n' +
                           '• Shows top buy/sell orders, market depth, and trading recommendations',
                    inline: false
                },
                {
                    name: '💸 `/flip-recommendations`',
                    value: 'Get the best items to flip based on supply/demand and margins\n' +
                           '**Usage:** `/flip-recommendations [category:all] [count:10]`\n' +
                           '• `category`: Filter by All, High Margin, High Volume, or Low Risk\n' +
                           '• `count`: Number of recommendations (1-20)\n' +
                           '• Shows profit margins, volumes, and risk levels',
                    inline: false
                },
                {
                    name: '🔨 `/craft-flipping`',
                    value: 'Analyze crafting recipes for flipping opportunities using order book strategy\n' +
                           '**Usage:** `/craft-flipping budget:10000000 [count:10] [include-risky:false]`\n' +
                           '• `budget`: Your total budget in coins (required)\n' +
                           '• `count`: Number of opportunities to show (1-15)\n' +
                           '• `include-risky`: Include volatile items with price uncertainty\n' +
                           '• Uses buy orders for ingredients and sell orders for results\n' +
                           '• Shows volatility-based risk levels and max craftable quantities',
                    inline: false
                },
                {
                    name: '❓ `/help`',
                    value: 'Show this help message',
                    inline: false
                }
            )
            .addFields(
                {
                    name: '📊 Features',
                    value: '• Real-time Hypixel Bazaar data\n' +
                           '• Order book strategy profit calculations\n' +
                           '• Ingredient cost breakdown with buy orders\n' +
                           '• Budget-based crafting limits\n' +
                           '• Recipe search functionality\n' +
                           '• Market analysis with order book\n' +
                           '• Flipping recommendations with risk analysis\n' +
                           '• Craft flipping opportunities with budget constraints\n' +
                           '• Trading insights and liquidity scores',
                    inline: true
                },
                {
                    name: '💡 Tips',
                    value: '• Use autocomplete for item names\n' +
                           '• Check recipes with `/list-recipes`\n' +
                           '• Verify item IDs with `/bazaar-price`\n' +
                           '• Budget format: 1000000 = 1M coins',
                    inline: true
                }
            )
            .setFooter({ text: 'Made with ❤️ for Hypixel SkyBlock players' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
