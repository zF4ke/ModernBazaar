# 🤖 what this bot does

[← back to docs](./README.md)

## the basics

this is a discord bot that helps you make coins in hypixel skyblock. it watches the bazaar 24/7 and tells you where the money is.

## why use this?

because manually checking bazaar prices is boring and you probably miscalculate profits anyway.

## what it actually does

### 📊 real-time market watching
- grabs fresh data from hypixel's api every time you ask
- fixes hypixel's backwards field naming (seriously, who designed that?)
- shows actual buy/sell prices with order book analysis

### 💡 four ways to trade
1. **buy orders → sell orders** - slow but most profit
2. **buy orders → instant sell** - decent profit, faster
3. **instant buy → sell orders** - quick entry, good profit
4. **instant buy → instant sell** - fast but lowest profit

### 🔬 smart market analysis
- **depth-aware pricing** - calculates real costs for big orders
- **order consumption** - shows how prices change as you buy more
- **feasibility checks** - won't recommend impossible trades
- **volatility detection** - flags risky markets

### 🛠️ crafting profit calculator
- Comprehensive ingredient cost breakdown
- Profit calculations per item and total
- Market depth limitations for ingredients and results
- Shopping lists with exact quantities needed

## Architecture Overview

```
Discord Commands → Bot Logic → Hypixel API → Data Processing → Results
```

### Key Components

1. **Command Handlers**: Process Discord slash commands
2. **Service Layer**: Business logic for calculations and analysis
3. **API Integration**: Hypixel Bazaar API with data transformation
4. **Data Processing**: Order book analysis and pricing calculations
5. **Cache System**: Autocomplete and performance optimization

## What Makes This Bot Special?

### 🎯 Accuracy First
- Accounts for Hypixel's 4% instant buy surcharge
- Handles the confusing API field naming correctly
- Provides realistic pricing for large orders

### 🔍 Transparency
- Verbose mode shows detailed calculation steps
- Clear explanation of market limitations
- Debug information for verification

### 📈 Profit-Focused
- Identifies the most profitable opportunities
- Considers market depth and execution feasibility
- Provides actionable trading recommendations

---

## Next Steps

- [Learn about Pricing Strategies →](./02-pricing-strategies.md)
- [Explore Market Analysis Features →](./03-market-analysis.md)
- [View Commands Reference →](./05-commands-reference.md)

[← Back to Documentation Home](./README.md)
