# Modern Bazaar

[![CI](https://github.com/zF4ke/ModernBazaar/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/zF4ke/ModernBazaar/actions/workflows/ci.yml)
<!--![GitHub release](https://img.shields.io/github/v/release/zF4ke/ModernBazaar)-->

> ⚠️ Work in progress.

A personal attempt to build a modular, enterprise‑grade bazaar market analyzer for Hypixel SkyBlock.  
Java/Spring Boot core, TypeScript NextJS dashboard, Dockerized infra (PostgreSQL, Prometheus, Grafana).  
Real-time bazaar analytics with comprehensive trading data and strategies; ML-driven forecasting and anomaly detection later.

## 💡 Vision 
A cleanly separated system:
- Core backend that fetches, monitors, stores, and serves market data via a stable API.
- Empirical data analysis for different trading strategies.
- Dashboard as the primary user interface.
- Optional Python/Java modules for heavier analysis or ML.
- Production-style observability and reliability

## 🛣️ Roadmap
I'll try to keep this updated as I make progress, but it will not be exhaustive (especially around the specific trading strategies I want to implement).

- [x] Core project scaffolded (Gradle, Dockerfile, Spring profiles)
- [x] Infra stack (Postgres, Prometheus, Grafana) running with basic metrics
- [x] GitHub Actions CI/CD pipeline for building, testing, and deploying

**Core API & persistence**
- [x] Background job: poll Hypixel → `BazaarItemSnapshot`
- [x] Skip duplicate snapshots
- [x] Swagger UI & OpenAPI (`/swagger-ui.html`, `/v3/api-docs`)
- [x] `GET /api/bazaar/items` & `GET /api/bazaar/items/{productId}` (now live snapshot + HourSummary)
- [x] Pagination, filtering, error handling
- [x] Skyblock Items API + catalog refresh endpoints
- [x] `GET /api/bazaar/items/{productId}/history?from=&to=&withPoints=` (hour summaries)
- [ ] **(obsolete)** minute-level snapshots endpoint — replaced by history above

**Web Dashboard (Next.js + TypeScript)**
- [x] Basic dashboard structure with navigation
- [x] Bazaar Items page with pagination, filtering, composite live view
- [x] Skyblock Items page with filtering
- [x] Settings page with system status and data management
- [x] Multi-metric ECharts implementation (Price, Orders, Delta, Volume)
- [x] Interactive time-range controls (1H, 6H, 24H, 7D, Total)
- [x] Responsive layout, tooltips, zoom/pan, smooth animations
- [ ] Advanced filtering and search features

**Trading Strategies & Analysis**
- [ ] `GET /api/rankings/top-[spread|volume|volatility|profit|custom-score]`
- [ ] Additional strategy endpoints & UI
- [ ] Replace prior bot interactions with API-powered UI
- [ ] (Optional) Auth + subscription support
- [ ] Trade journal storage

**Retention & pruning**
- [x] **Hourly compaction**  
  • raw snapshots ➜ HourSummary + kept HourPoints  
  • deletes heavy snapshots once processed
- [ ] Nightly job: thin/archive old HourPoints (e.g., keep 7 days, then downsample)
- [ ] Optional S3 export for long-term history
- [ ] Cold-snapshot archive to reduce DB footprint

**Other**
- [ ] Recording rules, alerts, refined Grafana dashboards
- [ ] Cache hot reads & optimize background jobs
- [ ] ML modules (prediction, anomaly detection) tied into Core
- [ ] Scale/shard where necessary

## ⚡ Quick start

```
git clone https://github.com/zF4ke/ModernBazaar.git
cd ModernBazaar
cp infra/.env.example infra/.env # fill in Postgres creds
./gradlew fullUp
```

Core health: http://localhost:8080/actuator/health  
Dashboard:   http://localhost:3000  
Prometheus:   http://localhost:9090  
Grafana:      http://localhost:3000

## License

CC BY‑NC‑SA 4.0
https://creativecommons.org/licenses/by-nc-sa/4.0/

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. 

---

This is a personal project and not affiliated with Hypixel. \
I'm not an expert at any of these technologies, so expect some rough edges, and I'm not used to contributions but if you want to help I'll try to be open to feedback and PRs. 💜
