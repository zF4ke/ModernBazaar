export interface Plan {
  slug: string
  name: string
  stripePriceId: string | null
  active: boolean
  featuresJson: string
}

export interface Subscription {
  planSlug: string
  planName: string | null
  stripePriceId: string | null
  status: string
  currentPeriodEnd: string | null
  featuresJson: string | null
}

export interface SubscriptionResponse {
  subscription: Subscription
  plans: Plan[]
}

// Alias for backward compatibility
export type PlanDTO = Plan

