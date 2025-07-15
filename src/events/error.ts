import { Events } from "discord.js";
import { ExtendedClient } from "../types";

export function setupErrorEvent(client: ExtendedClient) {
    client.on(Events.Error, error => {
        console.error('❌ Discord client error:', error);
    });
}
