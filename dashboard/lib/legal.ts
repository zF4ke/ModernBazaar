/**
 * Single source of truth for the operator details referenced across the legal
 * pages. Update these here and every policy page stays in sync.
 *
 * NOTE: Modern Bazaar uses a Merchant of Record (Stripe Managed Payments) for
 * checkout. Stripe is the *seller of record* that charges the customer and
 * remits sales tax / VAT. The operator below is the *service operator and data
 * controller* — the entity that runs the product and is responsible for your data.
 */
export const LEGAL = {
  /** Product / brand name. */
  product: 'Modern Bazaar',
  /** Legal entity operating the service (individual / sole proprietor). */
  operator: 'Pedro Silva',
  /** Support & legal contact. */
  email: 'modernbazaar.support@gmail.com',
  /** Governing-law jurisdiction. */
  jurisdiction: 'Portugal',
  /** Merchant of Record that processes payments and remits tax. */
  merchantOfRecord: 'Stripe Managed Payments (Stripe, Inc.)',
  /** Shown as "Last updated" on every policy page. */
  lastUpdated: 'June 18, 2026',
} as const
