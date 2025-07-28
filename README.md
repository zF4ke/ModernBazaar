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
- [x] Github Actions CI/CD pipeline for building, testing, and deploying
- [ ] **Core API & persistence**
  - [x] Implement background job to fetch Hypixel's API and save `BazaarItem` + `BazaarProductSnapshot`
  - [x] Only persist snapshots if data has changed (skip duplicates)  
  - [x] Swagger UI & OpenAPI (`/swagger-ui.html`, `/v3/api-docs`)
  - [x] `GET /api/bazaar/items` & `GET /api/bazaar/items/{productId}` (ItemsController + DTOs)
  - [x] Add ~~paging~~ (in the future if needed), filtering and error handling to each endpoint
  - [ ] Implement `GET /api/bazaar/items/{productId}/snapshots?from={timestamp}&to={timestamp}` endpoint
- [ ] Implement `GET /api/rankings/top-[spread|volume|volatility|profit|custom-score]` endpoints
  - [ ] Implement other endpoints for trading strategies and analysis
  - [ ] Find a way to keep track of my trades and store them
  - [ ] **Retention & pruning**  
    - [ ] Schedule nightly analysis job to aggregate/prune old `BazaarProductSnapshot` records (e.g. keep hourly snapshots, drop minute‑level)  
    - [ ] Archive or delete stale snapshot data to reduce DB footprint  
- [ ] Build web dashboard to explore trends, prices, and strategies
  - [ ] Replace prior bot interactions with API-powered UI
  - [ ] (Optional) Add authentication and subscription support
- [ ] Add recording rules, alerts, and refined dashboards in Grafana
- [ ] Optimize background jobs & introduce caching for high‑frequency updates
- [ ] Introduce ML modules (prediction, anomaly detection) and tie them into Core
- [ ] Scale/shard where necessary

## ⚡ Quick start

```
git clone https://github.com/zF4ke/ModernBazaar.git
cd ModernBazaar
cp infra/.env.example infra/.env # fill in Postgres creds
./gradlew fullUp
```

Core health: http://localhost:8080/actuator/health  
Prometheus:   http://localhost:9090  
Grafana:      http://localhost:3000

## License

CC BY‑NC‑SA 4.0
https://creativecommons.org/licenses/by-nc-sa/4.0/

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. 

---

This is a personal project and not affiliated with Hypixel. \
I'm not an expert at any of these technologies, so expect some rough edges, and I'm not used to contributions but if you want to help I'll try to be open to feedback and PRs. 💜
