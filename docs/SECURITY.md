# Security model & hardening

How Modern Bazaar protects authentication, authorization, and money flows, plus the
findings from the June 2026 adversarial audit and how each was fixed.

## Model

- **AuthN** — Auth0 (OIDC). The dashboard uses `@auth0/nextjs-auth0` v4: the session
  and access token live **server-side** in an encrypted cookie. The browser never
  holds the token; Next.js proxy routes attach it when calling the backend.
- **AuthZ** — the Spring backend is the **single source of truth**. It validates the
  Auth0 JWT and maps its `scope` / `permissions` claims to authorities. Every
  protected route is gated in `SecurityConfig` (`/api/admin/**` → `manage:plans`,
  strategy routes → feature scopes). The Next.js proxy makes **no** trust decisions.
- **Admin** — the `manage:plans` scope. Granted via Auth0 RBAC, or bootstrapped with
  the `ADMIN_USER_SUBS` allowlist (see the README "Becoming an admin").
- **Payments** — Lemon Squeezy (Merchant of Record). The only state-changing entry
  point is the signed webhook; checkout attribution rides on `custom_data.user_id`.

## Fail-closed principles

- A missing `AUTH_JWKS_URI` (with `auth.mock-enabled=false`) **refuses to start**
  rather than falling back to a permissive decoder.
- The mock/test JWT decoder (trusts any token, grants every scope) runs **only** when
  `AUTH_MOCK_ENABLED=true`. Never set that outside local dev.
- The billing webhook **rejects unsigned requests** when billing is enabled; a blank
  `LEMONSQUEEZY_WEBHOOK_SECRET` is treated as misconfiguration, not "skip verification".

## June 2026 audit — findings & resolutions

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| C-1 | Critical | Blank `AUTH_JWKS_URI` silently used a trust-everything decoder (one unset env var → full admin to anyone) | Fail closed: throw at startup unless `mock-enabled`; removed the catch→test-decoder fallback |
| C-2 | Critical | Webhook processed **unsigned** payloads when the secret was blank → forge a free Elite upgrade | Reject when billing is on and the secret is unset; always verify the signature |
| C-3 | Critical | Webhook trusted client `user_id` with no replay protection → replay inflates referral conversions | Signature now mandatory (closes forgery); referral conversions made **idempotent** per referred user (`referral_conversion` table); self-referral ignored |
| H-1 | High | Proxy honored a client `x-backend-url`, forwarding the user's token to any host (SSRF / token exfil) | Ignore `x-backend-url` in production; resolve the backend only from server env (dev override retained) |
| M-1 | Medium | Credentialed CORS allowed a plain-HTTP origin + wildcard headers | Dropped the `http://` prod origin; explicit header allowlist |
| M-2 | Medium | `extend(days)` accepted negative/huge values | Validated to 1–3650; `IllegalArgumentException` → HTTP 400 |
| L-1 | Low | Webhook signature compared raw (format-fragile) | Normalize incoming signature (trim/lowercase/strip `sha256=`) |

**Checked and clean:** SQL/HQL queries (parameterized, no concatenation); discount
input bounds (1–100); admin proxy routes (backend re-checks `manage:plans`); no
secrets in tracked files or git history; access token not exposed to the client bundle.

## Operational must-dos before going live

1. Set `AUTH_JWKS_URI`, `AUTH_AUDIENCE`, `AUTH_ISSUER_URI` in the backend env. Never set `AUTH_MOCK_ENABLED=true` in production.
2. Set `LEMONSQUEEZY_WEBHOOK_SECRET` before `BILLING_ENABLED=true`.
3. Set `CORS_ALLOWED_ORIGINS` to the exact HTTPS dashboard domain(s).
4. Keep `infra/.env` out of git (it already is) and rotate any secret that has ever been shared.

## Reporting

This is a personal project — open a private issue or contact the maintainer for
anything security-sensitive rather than filing a public issue with exploit details.
