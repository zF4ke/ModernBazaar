// Global bot configuration
class BotConfig {
    private static instance: BotConfig;
    private _verbose: boolean = false;

    private constructor() {}

    static getInstance(): BotConfig {
        if (!BotConfig.instance) {
            BotConfig.instance = new BotConfig();
        }
        return BotConfig.instance;
    }

    get verbose(): boolean {
        return this._verbose;
    }

    set verbose(value: boolean) {
        this._verbose = value;
        console.log(`🔧 Verbose mode ${value ? 'enabled' : 'disabled'}`);
    }

    toggleVerbose(): boolean {
        this.verbose = !this._verbose;
        return this._verbose;
    }
}

export const botConfig = BotConfig.getInstance();
