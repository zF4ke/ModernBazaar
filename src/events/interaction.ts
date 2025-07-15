import { Events } from "discord.js";
import { ExtendedClient } from "../types";
import { CraftingService } from "../services/crafting";
import { BazaarAutocompleteService } from "../services/autocomplete";
import { DISCORD_LIMITS, ERROR_MESSAGES } from "../constants";

export function setupInteractionEvent(client: ExtendedClient) {
    client.on(Events.InteractionCreate, async interaction => {
        // Handle autocomplete
        if (interaction.isAutocomplete()) {
            const { commandName, options } = interaction;
            
            if (commandName === 'calculate-profit') {
                const focusedOption = options.getFocused();
                
                try {
                    // Normalize the search term by converting spaces to underscores to match recipe format
                    const normalizedSearch = focusedOption.replace(/\s+/g, '_');
                    const recipes = CraftingService.searchRecipes(normalizedSearch);
                    const choices = recipes
                        .slice(0, DISCORD_LIMITS.AUTOCOMPLETE_MAX_OPTIONS)
                        .map(recipe => ({
                            name: recipe.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()),
                            value: recipe
                        }));
                    
                    await interaction.respond(choices);
                } catch (error) {
                    console.error('Error in autocomplete:', error);
                    await interaction.respond([]);
                }
            } else if (commandName === 'bazaar-price' || commandName === 'market-analysis') {
                const focusedOption = options.getFocused();
                
                try {
                    const items = await BazaarAutocompleteService.searchBazaarItems(focusedOption);
                    const choices = items.map(item => ({
                        name: BazaarAutocompleteService.formatItemNameForDisplay(item),
                        value: item
                    }));
                    
                    await interaction.respond(choices);
                } catch (error) {
                    console.error('Error in autocomplete:', error);
                    await interaction.respond([]);
                }
            }
            return;
        }
        
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`❌ No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('❌ Error executing command:', error);
                
                const errorMessage = {
                    content: ERROR_MESSAGES.COMMAND_ERROR,
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
    });
}
