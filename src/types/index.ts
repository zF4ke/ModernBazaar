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
    sell_summary: Array<{
        amount: number;
        pricePerUnit: number;
        orders: number;
    }>;
    buy_summary: Array<{
        amount: number;
        pricePerUnit: number;
        orders: number;
    }>;
    quick_status: {
        productId: string;
        sellPrice: number;
        sellVolume: number;
        sellMovingWeek: number;
        sellOrders: number;
        buyPrice: number;
        buyVolume: number;
        buyMovingWeek: number;
        buyOrders: number;
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
