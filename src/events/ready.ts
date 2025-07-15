import { Events, REST, Routes } from "discord.js";
import { ExtendedClient, Command } from "../types";
import { SUCCESS_MESSAGES } from "../constants";
import { HypixelService } from "../services/hypixel";

export function setupReadyEvent(client: ExtendedClient, commands: Command[]) {
    client.once(Events.ClientReady, async () => {
        console.log(`${SUCCESS_MESSAGES.BOT_READY} ${client.user?.tag}\n`);
        
        // Initialize Hypixel service and autocomplete cache
        await HypixelService.initialize();
        
        // Register slash commands
        if (client.user) {
            const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
            
            try {
                console.log(`${SUCCESS_MESSAGES.COMMANDS_REFRESHING}`);
                
                const commandData = commands.map(command => command.data.toJSON());
                
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commandData }
                );
                
                console.log(`${SUCCESS_MESSAGES.COMMANDS_REFRESHED}\n`);
            } catch (error) {
                console.error('❌ Error refreshing commands:', error);
            }
        }
    });
}
