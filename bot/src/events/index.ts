import { ExtendedClient, Command } from "../types";
import { setupReadyEvent } from "./ready";
import { setupInteractionEvent } from "./interaction";
import { setupErrorEvent } from "./error";

export function setupEvents(client: ExtendedClient, commands: Command[]) {
    setupReadyEvent(client, commands);
    setupInteractionEvent(client);
    setupErrorEvent(client);
}
