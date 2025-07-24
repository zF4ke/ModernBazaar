import { botConfig } from '../config/bot-config.js';

/**
 * Centralized logging utility that respects the global verbose setting
 */
export class Logger {
    /**
     * Logs a message only if verbose mode is enabled
     * @param message The message to log
     * @param ...args Additional arguments to pass to console.log
     */
    static verbose(message: string, ...args: any[]): void {
        if (botConfig.verbose) {
            console.log(message, ...args);
        }
    }

    /**
     * Always logs a message regardless of verbose setting
     * @param message The message to log
     * @param ...args Additional arguments to pass to console.log
     */
    static info(message: string, ...args: any[]): void {
        console.log(message, ...args);
    }

    /**
     * Always logs an error message regardless of verbose setting
     * @param message The error message to log
     * @param ...args Additional arguments to pass to console.error
     */
    static error(message: string, ...args: any[]): void {
        console.error(message, ...args);
    }

    /**
     * Always logs a warning message regardless of verbose setting
     * @param message The warning message to log
     * @param ...args Additional arguments to pass to console.warn
     */
    static warn(message: string, ...args: any[]): void {
        console.warn(message, ...args);
    }
}
