import { NUMBER_FORMAT, DISCORD_LIMITS, MARKET_ANALYSIS } from "../constants";

/**
 * Formats a number as currency (coins) with at least 3 decimal precision for larger values
 */
export function formatCurrency(amount: number): string {
    if (amount >= NUMBER_FORMAT.BILLION_THRESHOLD) {
        return `${(amount / NUMBER_FORMAT.BILLION_THRESHOLD).toFixed(2)}B`;
    } else if (amount >= NUMBER_FORMAT.MILLION_THRESHOLD) {
        return `${(amount / NUMBER_FORMAT.MILLION_THRESHOLD).toFixed(2)}M`;
    } else if (amount >= NUMBER_FORMAT.THOUSAND_THRESHOLD) {
        return `${(amount / NUMBER_FORMAT.THOUSAND_THRESHOLD).toFixed(2)}K`;
    }
    // For smaller numbers, use comma as thousand separator and dot for decimals
    if (amount % 1 === 0) {
        return Math.round(amount).toLocaleString('en-US');
    } else {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

/**
 * Formats a percentage with at least 3 decimal precision
 */
export function formatPercentage(percentage: number): string {
    return `${percentage.toFixed(2)}%`;
}

/**
 * Capitalizes the first letter of each word and replaces underscores with spaces
 */
export function formatItemName(itemName: string): string {
    return itemName
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Truncates text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validates if a number is positive
 */
export function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Safely parses a number from string input
 */
export function parseNumber(input: string): number | null {
    const cleaned = input.replace(/[,\s]/g, '');
    const number = parseFloat(cleaned);
    return isNaN(number) ? null : number;
}

/**
 * Formats a Discord embed field value with proper length limits
 */
export function formatEmbedField(content: string, maxLength: number = DISCORD_LIMITS.EMBED_FIELD_MAX_LENGTH): string {
    return truncateText(content, maxLength);
}

/**
 * Calculates the percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Formats a percentage change with appropriate color indicators
 */
export function formatPercentageChange(percentage: number): string {
    const formatted = formatPercentage(Math.abs(percentage));
    if (percentage > 0) {
        return `+${formatted} 📈`;
    } else if (percentage < 0) {
        return `-${formatted} 📉`;
    }
    return `${formatted} ➡️`;
}

/**
 * Determines market volatility level based on price spread
 */
export function getVolatilityLevel(volatilityPercentage: number): string {
    if (volatilityPercentage > MARKET_ANALYSIS.HIGH_VOLATILITY_THRESHOLD) {
        return '🔴 High Volatility';
    } else if (volatilityPercentage > MARKET_ANALYSIS.MEDIUM_VOLATILITY_THRESHOLD) {
        return '🟡 Medium Volatility';
    } else if (volatilityPercentage > MARKET_ANALYSIS.LOW_VOLATILITY_THRESHOLD) {
        return '🟢 Low Volatility';
    } else {
        return '🔵 Very Stable';
    }
}

/**
 * Formats large numbers with appropriate suffixes and 3 decimal precision
 */
export function formatLargeNumber(num: number): string {
    if (num >= NUMBER_FORMAT.BILLION_THRESHOLD) {
        return `${(num / NUMBER_FORMAT.BILLION_THRESHOLD).toFixed(2)}B`;
    } else if (num >= NUMBER_FORMAT.MILLION_THRESHOLD) {
        return `${(num / NUMBER_FORMAT.MILLION_THRESHOLD).toFixed(2)}M`;
    } else if (num >= NUMBER_FORMAT.THOUSAND_THRESHOLD) {
        return `${(num / NUMBER_FORMAT.THOUSAND_THRESHOLD).toFixed(2)}K`;
    }
    // For smaller numbers, use comma as thousand separator and dot for decimals
    if (num % 1 === 0) {
        return num.toLocaleString('en-US');
    } else {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

/**
 * Calculates hourly movement from weekly movement data
 */
export function formatHourlyMovement(weeklyMovement: number): string {
    const hourlyMovement = weeklyMovement / (24 * 7); // 168 hours in a week
    return formatLargeNumber(hourlyMovement);
}

/**
 * Formats a number with full comma notation (no K/M/B abbreviations) for detailed analysis
 */
export function formatFullNumber(amount: number): string {
    if (amount % 1 === 0) {
        return Math.round(amount).toLocaleString('en-US');
    } else {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}
