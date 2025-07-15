/**
 * Configuration constants for the Hypixel Bazaar Bot
 */

// Discord API Limits
export const DISCORD_LIMITS = {
    AUTOCOMPLETE_MAX_OPTIONS: 25,
    EMBED_FIELD_MAX_LENGTH: 1024,
    EMBED_DESCRIPTION_MAX_LENGTH: 4096,
    EMBED_TITLE_MAX_LENGTH: 256
} as const;

// Hypixel API Configuration
export const HYPIXEL_API = {
    BAZAAR_URL: "https://api.hypixel.net/skyblock/bazaar",
    REQUEST_TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3
} as const;

// Market Analysis Thresholds
export const MARKET_ANALYSIS = {
    TOP_ORDERS_COUNT: 5,
    AVERAGE_PRICE_ORDERS: 5,
    HIGH_VOLATILITY_THRESHOLD: 10, // percentage
    MEDIUM_VOLATILITY_THRESHOLD: 5, // percentage
    LOW_VOLATILITY_THRESHOLD: 2, // percentage
    HIGH_SPREAD_THRESHOLD: 5, // percentage
    MODERATE_SPREAD_THRESHOLD: 2, // percentage
    HIGH_LIQUIDITY_THRESHOLD: 10000, // volume
    LOW_LIQUIDITY_THRESHOLD: 1000, // volume
    MAX_AUTOCOMPLETE_RESULTS: 25 // maximum autocomplete suggestions
} as const;

// Flipping Analysis Constants
export const FLIPPING_ANALYSIS = {
    MIN_PROFIT_MARGIN: 1000, // minimum coins profit
    MIN_PROFIT_PERCENTAGE: 1, // minimum 1% profit
    MAX_RESULTS: 20, // maximum items to show in flip recommendations
    HIGH_MARGIN_THRESHOLD: 10, // 10% margin considered high
    MEDIUM_MARGIN_THRESHOLD: 5, // 5% margin considered medium
    MIN_VOLUME_FOR_RECOMMENDATION: 100, // minimum volume to recommend
    PREFERRED_VOLUME_THRESHOLD: 1000, // preferred volume for good liquidity
    // Price volatility thresholds (difference between instant vs weighted prices)
    HIGH_VOLATILITY_THRESHOLD: 15, // >15% volatility = HIGH RISK (new/uncertain items)
    MEDIUM_VOLATILITY_THRESHOLD: 8, // 8-15% volatility = MEDIUM RISK (some uncertainty)
    LOW_VOLATILITY_THRESHOLD: 5, // ≤5% volatility = LOW RISK (stable pricing)
    // Risk assessment thresholds
    LOW_LIQUIDITY_THRESHOLD: 30, // <30 liquidity score = high risk
    MEDIUM_LIQUIDITY_THRESHOLD: 50, // <50 liquidity score = medium risk
    HIGH_LIQUIDITY_THRESHOLD: 70, // ≥70 liquidity score for low risk
    // Display thresholds for liquidity emojis
    LIQUIDITY_EMOJI_HIGH_THRESHOLD: 70, // 💦 High liquidity emoji
    LIQUIDITY_EMOJI_MEDIUM_THRESHOLD: 40, // 💧 Medium liquidity emoji (below this = 💤 low)
    // Liquidity score calculation constants
    LIQUIDITY_SCORE_VOLUME_DIVISOR: 20000, // Volume threshold for max volume points
    LIQUIDITY_SCORE_MAX_VOLUME_POINTS: 50, // Maximum points from volume alone
    LIQUIDITY_SCORE_MAX_BALANCE_POINTS: 30, // Maximum points from balanced buy/sell
    LIQUIDITY_SCORE_PREFERRED_VOLUME_BONUS: 20 // Bonus points for preferred volume
} as const;

// Number Formatting Thresholds
export const NUMBER_FORMAT = {
    BILLION_THRESHOLD: 1_000_000_000,
    MILLION_THRESHOLD: 1_000_000,
    THOUSAND_THRESHOLD: 1_000
} as const;

// Error Messages
export const ERROR_MESSAGES = {
    ITEM_NOT_FOUND: "Item not found in bazaar",
    RECIPE_NOT_FOUND: "Recipe not found for item",
    API_ERROR: "Failed to fetch bazaar data",
    DISCORD_TOKEN_MISSING: "DISCORD_TOKEN not found in environment variables",
    COMMAND_ERROR: "There was an error while executing this command!"
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    BOT_READY: "✅ Bot is ready! Logged in as",
    COMMANDS_REFRESHING: "🔄 Started refreshing application (/) commands...",
    COMMANDS_REFRESHED: "✅ Successfully reloaded application (/) commands."
} as const;
