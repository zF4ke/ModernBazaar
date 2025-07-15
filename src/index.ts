require("dotenv").config();
import { Client, GatewayIntentBits, Collection, Partials } from "discord.js";
import { ExtendedClient, Command } from "./types";
import { ERROR_MESSAGES } from "./constants";
import { HypixelService } from "./services/hypixel";

// Import commands
import { calculateProfitCommand } from "./commands/calculate-profit";
import { listRecipesCommand } from "./commands/list-recipes";
import { bazaarPriceCommand } from "./commands/bazaar-price";
import { marketAnalysisCommand } from "./commands/market-analysis";
import { flipRecommendationsCommand } from "./commands/flip-recommendations";
import { helpCommand } from "./commands/help";

// Import events
import { setupEvents } from "./events";
import { craftFlippingCommand } from "./commands";

const { Guilds, GuildMembers, GuildMessages, MessageContent } = GatewayIntentBits;
const { User, Message, GuildMember, ThreadMember, Channel } = Partials;

const client = new Client({
    intents: [Guilds, GuildMembers, GuildMessages, MessageContent],
    partials: [User, Message, GuildMember, ThreadMember, Channel],
}) as ExtendedClient;

client.commands = new Collection();

// Register commands
const commands: Command[] = [
    calculateProfitCommand,
    listRecipesCommand,
    bazaarPriceCommand,
    marketAnalysisCommand,
    flipRecommendationsCommand,
    helpCommand,
    craftFlippingCommand
];

commands.forEach(command => {
    client.commands.set(command.data.name, command);
});

// Setup all events
setupEvents(client, commands);

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    console.error(`❌ ${ERROR_MESSAGES.DISCORD_TOKEN_MISSING}`);
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
