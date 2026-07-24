# Plans & feature tiers — what we offer and what's actually enforced

Three plans: **Free ($0) / Flipper ($5.99/mo or $59.90/yr) / Elite ($25.99/mo or $259.90/yr)**. This is the
realistic feature split (only things we can actually deliver) plus an honest
**enforcement** column — i.e. whether the code really stops a lower tier from using it.

## Feature matrix

| Feature | Free | Flipper | Elite | Gated by | Enforced today? |
|---|:---:|:---:|:---:|---|---|
| Live Bazaar prices | ✓ | ✓ | ✓ | public | n/a (free) |
| Item catalog (Bazaar + Skyblock) | ✓ | ✓ | ✓ | public | n/a (free) |
| Favorites & search | ✓ | ✓ | ✓ | client-side | n/a (free) |
| **Bazaar Flipping finder** (profit/hr score, filters, presets, budget sizing) | no | yes | yes | scope `use:bazaar-flipping` on `/api/strategies/flipping` | ✅ endpoint enforced; **paying grants the scope** via `syncPlanRoles` (needs the Auth0 **Flipper** role configured) |
| **Bazaar Manipulation** (corner plan, break-even, ladder, sell-through) | no | no | yes | scope `use:bazaar-manipulation` on `/api/strategies/manipulation` | ✅ endpoint enforced; granted on payment, revoked on cancel (needs the Auth0 **Elite** role configured) |
| Priority support | — | — | ✓ | manual / ops | manual |
| Deeper price history (48h → extended) | 48h | deeper | extended | — | ❌ **NOT enforced** — there's no per-tier history limit in code |

## The enforcement reality (from the money-loss audit)

- The two **tools** are correctly gated at the API by OAuth scopes — calling
  `/api/strategies/**` without the scope returns 403. The frontend gating matches.
- ✅ **Paying now grants the scope, canceling revokes it.** `applyProviderWebhook`
  calls `Auth0ManagementService.syncPlanRoles` to set the user's Auth0 role to match
  their entitled plan (per the June 2026 money-loss audit, resolved). The one
  remaining step is **owner config in Auth0**: create the `Flipper`/`Elite` roles with
  the matching RBAC permissions, or the role grants no scopes. Steps in
  [LEMON_SQUEEZY_SETUP.md](LEMON_SQUEEZY_SETUP.md).
- "Deeper / extended price history" is **advertised but not enforced** — any tier gets
  the same history. Either implement a per-tier history window (clamp `from`/range by
  scope) or drop the claim from the pricing copy so we're not overselling.

## Recommendation: keep the split to what we can enforce

The cleanly enforceable differentiators are the **two tools** (scope-gated). Lead the
pricing with those and make secondary perks real:
- **Free** — live prices, full catalog, favorites (a genuine taste).
- **Flipper** — the Flipping finder + its tuning/presets (scope `use:bazaar-flipping`).
- **Elite** — adds Manipulation (scope `use:bazaar-manipulation`) + priority support.

Add `read:market_data`-gated extras later (e.g. raw data export, longer history) only
once the per-tier limit is actually implemented — never advertise an unenforced limit.

## To make the tiers real (checklist)
1. Create Auth0 roles **Flipper** / **Elite** with the matching RBAC permissions.
2. Implement `syncPlanRoles` and call it from the webhook on upgrade/downgrade
   (per the June 2026 money-loss audit, resolved).
3. Either build the per-tier history window or remove that line from pricing.
