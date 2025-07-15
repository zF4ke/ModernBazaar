import { Recipe } from "../types";

// Sample recipes for common Hypixel SkyBlock items
// Item IDs should match the ones used in the Hypixel Bazaar API
const RECIPES: Record<string, Recipe> = {
    "REVENANT_VISCERA": {
        ingredients: {
            "ENCHANTED_STRING": 32,
            "REVENANT_FLESH": 128,
        },
        result: {
            item: "REVENANT_VISCERA",
            count: 1
        }
    },
    "TARANTULA_SILK": {
        ingredients: {
            "ENCHANTED_FLINT": 32,
            "TARANTULA_WEB": 128,
        },
        result: {
            item: "TARANTULA_SILK",
            count: 1
        }
    },
    "GOLDEN_TOOTH": {
        ingredients: {
            "ENCHANTED_GOLD": 32,
            "WOLF_TOOTH": 128,
        },
        result: {
            item: "GOLDEN_TOOTH",
            count: 1
        }
    },
    "BRAIDED_GRIFFIN_FEATHER": {
        ingredients: {
            "GRIFFIN_FEATHER": 160,
            "SOUL_STRING": 256,
        },
        result: {
            item: "BRAIDED_GRIFFIN_FEATHER",
            count: 1
        }
    },
    "NULL_EDGE": {
        ingredients: {
            "NULL_ATOM": 3,
            "ENCHANTED_MITHRIL": 192,
        },
        result: {
            item: "NULL_EDGE",
            count: 1
        }
    },
    "NULL_OVOID": {
        ingredients: {
            "ENCHANTED_OBSIDIAN": 32,
            "NULL_SPHERE": 64,
        },
        result: {
            item: "NULL_OVOID",
            count: 1
        }
    },
    "NULL_BLADE": {
        ingredients: {
            "NULL_EDGE": 3,
            "NULL_OVOID": 64,
            "ENCHANTED_QUARTZ_BLOCK": 64,
        },
        result: {
            item: "NULL_BLADE",
            count: 1
        }
    },
    "LESSER_SOULFLOW_ENGINE": {
        ingredients: {
            "NULL_OVOID": 6,
            "ENCHANTED_EYE_OF_ENDER": 48,
            "ENCHANTED_IRON_BLOCK": 8,
        },
        result: {
            item: "LESSER_SOULFLOW_ENGINE",
            count: 1
        }
    },
    "SOULFLOW": {
        ingredients: {
            "RAW_SOULFLOW": 160,
        },
        result: {
            item: "SOULFLOW",
            count: 1
        }
    },
    "ABSOLUTE_ENDER_PEARL": {
        ingredients: {
            "ENCHANTED_ENDER_PEARL": 80,
        },
        result: {
            item: "ABSOLUTE_ENDER_PEARL",
            count: 1
        }
    },
    "TESSELLATED_ENDER_PEARL": {
        ingredients: {
            "ENCHANTED_LAPIS_LAZULI_BLOCK": 32,
            "ABSOLUTE_ENDER_PEARL": 80,
        },
        result: {
            item: "TESSELLATED_ENDER_PEARL",
            count: 1
        }
    },
    // AMALGAMATED_CRIMSONITE (two recipes?? idk too much work and i don't care)
    "INFERNO_VERTEX": {
        ingredients: {
            "MOLTEN_POWDER": 64,
            "HYPERGOLIC_IONIZED_CERAMICS": 6,
        },
        result: {
            item: "INFERNO_VERTEX",
            count: 1
        }
    },
    "INFERNO_APEX": {
        ingredients: {
            "MOLTEN_POWDER": 64,
            "INFERNO_VERTEX": 64,
        },
        result: {
            item: "INFERNO_APEX",
            count: 1
        }
    },
};

export class RecipeDatabase {
    /**
     * Gets a recipe by item name
     */
    static getRecipe(itemName: string): Recipe | null {
        return RECIPES[itemName.toUpperCase()] || null;
    }
    
    /**
     * Gets all available recipe names
     */
    static getAllRecipeNames(): string[] {
        return Object.keys(RECIPES);
    }
    
    /**
     * Searches for recipes by partial name matching
     */
    static searchRecipes(searchTerm: string): string[] {
        const term = searchTerm.toLowerCase();
        return Object.keys(RECIPES).filter(name => 
            name.toLowerCase().includes(term)
        );
    }
    
    /**
     * Adds a new recipe to the database
     */
    static addRecipe(itemName: string, recipe: Recipe): void {
        RECIPES[itemName.toUpperCase()] = recipe;
    }
    
    /**
     * Gets all recipes
     */
    static getAllRecipes(): Record<string, Recipe> {
        return { ...RECIPES };
    }
}
