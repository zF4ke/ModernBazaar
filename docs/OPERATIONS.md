# Operations: maintenance mode, DDoS, and guardrails

## Maintenance mode (the kill switch)

An instant, runtime switch to take the API down for everyone except admins — no redeploy.

- **Turn it on/off:** Admin → **Settings → Maintenance mode** toggle. (Or call
  `POST /api/admin/maintenance {"enabled":true}` as an admin.)
- **What it does:** when on, `MaintenanceFilter` returns **503** for every request
  except `/api/admin/**` (so you can turn it back off), `/actuator/**`, `/api/status`,
  and OPTIONS. The state persists in the `app_setting` table (survives restarts).
- **When to use it:** a bad deploy, data corruption, a payment/webhook bug, or an active
  abuse/DDoS incident you need to stop while you investigate.
- **Frontend:** `/api/status` reports `{maintenance:true}` so the dashboard can show a
  banner (wire a banner to it as a follow-up).

## DDoS protection — do it at the edge, not the app

A Spring app cannot absorb a volumetric DDoS; don't try. Put **Cloudflare (free tier)**
in front of the dashboard and API:

1. Proxy the domain through Cloudflare (orange-cloud). This alone absorbs L3/L4 floods.
2. Enable **Bot Fight Mode** and **rate-limiting rules** (e.g. >X req/min per IP to
   `/api/**` → challenge/block). This fixes the audit's finding 9 (our app rate limiters
   are global single buckets, not per-IP — the edge does per-IP properly).
3. Add a WAF rule to block obvious scrapers hammering `/api/bazaar/**` / `/api/metrics`.
4. Cache public GETs at the edge so scraping our market data doesn't hit origin.

Never expose the origin IP directly (today `188.166.192.72` is hardcoded as a default in
the admin settings UI — remove that and route only through Cloudflare).

## Automatic guardrails — alert first, trip manually

You asked "how/when" to auto-shutdown. Recommended posture:

- **Auto at the edge (safe):** Cloudflare rate-limit/WAF rules act automatically per-IP.
  This is where automation belongs — it's surgical (blocks the abuser, not everyone).
- **Alert, don't auto-kill (app level):** wire Prometheus/Grafana alerts on error rate,
  p99 latency, 5xx spikes, DB connections, and webhook failures → notify you (email/Discord).
  Auto-flipping the *whole site* to maintenance on a threshold is risky (a false positive
  becomes a self-inflicted outage). Keep the kill switch **one click away** instead.
- **The one auto-trip worth considering:** if the **billing webhook** starts failing
  repeatedly or signature checks spike, alert immediately — that's money/integrity, not
  just load.

## Cost guardrails (tie-in to the money-loss audit)
- Clamp expensive params (done: `limit` capped at 200 in `BazaarItemsQueryService`).
- Cache/limit `/api/metrics` (audit finding 8).
- Watch Auth0 MAU (free to ~25k, then expensive) and Stripe fee drag; the cost model is the admin Finances page (/dashboard/admin/finances).

## Incident quick-runbook
1. Flip **Maintenance mode** on (Settings).
2. Check Grafana (error rate, DB), and `docker compose ... logs core`.
3. If abuse: add a Cloudflare block rule for the source.
4. Fix → verify on a non-prod or with maintenance still on (admins bypass) → flip off.
