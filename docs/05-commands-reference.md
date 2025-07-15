# 📋 commands

[← back to docs](./README.md)

## all the commands explained

### `/bazaar-price <item>`
**what it does:** shows current buy/sell prices

```
/bazaar-price enchanted_diamond

result:
💎 Enchanted Diamond
📈 Instant Buy: 580,432 coins
📉 Instant Sell: 565,891 coins
📊 Spread: 14,541 coins (2.5%)
```

### `/market-analysis <item>`
**what it does:** detailed market breakdown with order book

```
/market-analysis enchanted_diamond

result:
💎 Enchanted Diamond Market Analysis
📊 Order Book Summary:
   Top Buy Order: 565,891 coins (×47 items)
   Top Sell Order: 580,432 coins (×23 items)
📈 Average Prices (top 5 orders):
   Buy Orders: 564,205 coins
   Sell Orders: 582,156 coins
⏰ Data Age: 23 seconds
```

### `/flip-recommendations`
**what it does:** finds items with good profit margins

**options:**
- `category` - filter by item type (optional)
- `budget` - your available coins (default: 1M)
- `count` - how many results (default: 10, max: 15)

```
/flip-recommendations budget:5000000 count:5

result:
💰 Top 5 Flipping Opportunities (5M budget)
1. Enchanted Iron Block
   Buy: 45,230 → Sell: 48,901 (+3,671 coins, 8.1%)
2. Enchanted Gold Block  
   Buy: 67,432 → Sell: 72,105 (+4,673 coins, 6.9%)
...
```

### `/craft-flipping <budget>`
**what it does:** finds profitable crafting recipes

**options:**
- `pricing-strategy` - how you trade (default: buy orders → sell orders)
- `count` - results to show (default: 10, max: 15)
- `include-risky` - include volatile items (default: false)

```
/craft-flipping budget:10000000 pricing-strategy:instant_buy_instant_sell count:3

result:
🛠️ Top 3 Crafting Opportunities (10M budget)
Strategy: Instant Buy → Instant Sell

1. Enchanted Diamond (×17 crafts)
   Cost: 580k per craft → Revenue: 600k
   Profit: 340k total (20k per craft, 3.4%)
   
2. Enchanted Iron Block (×22 crafts)
   Cost: 450k per craft → Revenue: 465k  
   Profit: 330k total (15k per craft, 3.3%)
...
```

### `/calculate-profit <item> <budget>`
**what it does:** calculates profit for a specific recipe

**options:**
- `pricing-strategy` - same as craft-flipping

```
/calculate-profit enchanted_diamond budget:5000000

result:
🛠️ Enchanted Diamond Crafting Analysis
💰 Budget: 5,000,000 coins
📊 Strategy: Buy Orders → Sell Orders

💸 Ingredient Costs (per craft):
   Enchanted Coal: 160 × 100 = 16,000 coins
   Diamond: 9 × 15,500 = 139,500 coins
   Total: 555,500 coins per craft

📈 Revenue: 620,000 coins per craft
💎 Profit: 64,500 coins per craft (11.6%)
🔢 Max Crafts: 9 (limited by budget)
💰 Total Profit: 580,500 coins
```

### `/list-recipes`
**what it does:** shows available recipes

**options:**
- `search` - filter recipes (optional)

```
/list-recipes search:diamond

result:
💎 Available Diamond Recipes:
• enchanted_diamond (160 coal + 1 diamond)
• diamond_block (9 diamonds)
• enchanted_diamond_block (160 enchanted_diamonds)
```

### `/help`
**what it does:** shows what each command does

### `/verbose`
**what it does:** toggles debug mode on/off

```
/verbose

result when turned ON:
🔊 Verbose Mode: ENABLED
Debug information will now appear in command responses.

Features enabled:
• Order book consumption details
• Market feasibility analysis  
• Depth-aware pricing breakdowns
• API response timing
• Calculation step-by-step
```

## pricing strategy options

use these values for the `pricing-strategy` parameter:

- `buy_order_sell_order` - place orders (most profit, slowest)
- `buy_order_instant_sell` - buy orders, instant sell (balanced)
- `instant_buy_sell_order` - instant buy, sell orders (quick entry)
- `instant_buy_instant_sell` - all instant (fastest, least profit)

## tips

- use tab completion for item names
- larger budgets = more opportunities
- enable verbose mode to understand the calculations
