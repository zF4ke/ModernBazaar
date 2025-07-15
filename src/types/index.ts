import { SlashCommandBuilder, CommandInteraction, Client, Collection, SlashCommandOptionsOnlyBuilder } from "discord.js";

/* == Command Type Definitions == */
export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
}


/* == Hypixel Bazaar API Types == */
export interface BazaarResponse {
    success: boolean;
    lastUpdated: number;
    products: Record<string, BazaarProduct>;
}

export interface BazaarProduct {
    product_id: string;
    // Renamed from Hypixel's confusing field names for clarity:
    // buy_orders (was sell_summary): actual buy orders from players wanting to buy
    // sell_orders (was buy_summary): actual sell orders from players wanting to sell
    buy_orders: Array<{
        amount: number;
        pricePerUnit: number;
        orders: number;
    }>;
    sell_orders: Array<{
        amount: number;
        pricePerUnit: number;
        orders: number;
    }>;
    quick_status: {
        productId: string;
        // NOTE: quick_status field names are intuitive (unlike order book fields)
        sellPrice: number;     // Weighted average sell price (what you pay to buy)
        sellVolume: number;    // Volume of items being sold
        sellMovingWeek: number;
        sellOrders: number;    // Number of sell orders
        buyPrice: number;      // Weighted average buy price (what you get when selling)
        buyVolume: number;     // Volume of items being bought
        buyMovingWeek: number;
        buyOrders: number;     // Number of buy orders
    };
}


/* == Crafting Service Types == */
export interface Recipe {
    ingredients: Record<string, number>;
    result: {
        item: string;
        count: number;
    };
}

export interface CraftingCalculation {
    itemName: string;
    budget: number;
    ingredientCosts: Record<string, { price: number; quantity: number; total: number }>;
    totalIngredientCost: number;
    sellingPrice: number;
    profitPerItem: number;
    maxCraftable: number;
    totalProfit: number;
    profitPercentage: number;
}
