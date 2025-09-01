/**
 * Application permissions constants
 * These define what features users can access based on their Auth0 roles and permissions
 * 
 * Source: Backend SecurityConfig.java - these are the actual permissions used
 */

export const PERMISSIONS = {
  // Read Permissions
  READ_PLANS: 'read:plans',
  READ_SUBSCRIPTION: 'read:subscription',
  READ_MARKET_DATA: 'read:market_data',
  
  // Admin Permissions
  MANAGE_PLANS: 'manage:plans',
  
  // Tier-based Permissions (from Auth0 roles)
  USE_STARTER: 'use:starter',
  USE_FLIPPER: 'use:flipper',
  USE_ELITE: 'use:elite',
  
  // Feature-specific Permissions
  USE_BAZAAR_FLIPPING: 'use:bazaar-flipping',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

/**
 * Permission groups for different subscription tiers
 * These should match the Auth0 roles assigned to users
 * 
 * Based on actual Auth0 role configuration:
 * - FREE: read:market_data, read:plans, read:subscription
 * - STARTER: use:starter + all FREE permissions
 * - FLIPPER: use:flipper + all FREE permissions  
 * - ELITE: use:elite + all FREE permissions
 */
export const PERMISSION_GROUPS = {
  FREE: [
    PERMISSIONS.READ_MARKET_DATA,
    PERMISSIONS.READ_PLANS,
    PERMISSIONS.READ_SUBSCRIPTION,
  ],
  STARTER: [
    PERMISSIONS.USE_STARTER,
    PERMISSIONS.READ_MARKET_DATA,
    PERMISSIONS.READ_PLANS,
    PERMISSIONS.READ_SUBSCRIPTION,
  ],
  FLIPPER: [
    PERMISSIONS.USE_FLIPPER,
    PERMISSIONS.READ_MARKET_DATA,
    PERMISSIONS.READ_PLANS,
    PERMISSIONS.READ_SUBSCRIPTION,
  ],
  ELITE: [
    PERMISSIONS.USE_ELITE,
    PERMISSIONS.READ_MARKET_DATA,
    PERMISSIONS.READ_PLANS,
    PERMISSIONS.READ_SUBSCRIPTION,
  ],
} as const

/**
 * Auth0 role names that correspond to subscription tiers
 */
export const AUTH0_ROLES = {
  FREE: 'free-user',
  STARTER: 'starter',
  FLIPPER: 'flipper',
  ELITE: 'elite',
} as const
