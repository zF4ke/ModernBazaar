# Modern Hypixel Bazaar Bot

A Discord bot for Hypixel SkyBlock bazaar trading and profit analysis.

## features

- Real-time bazaar price checking
- Item flipping recommendations with profit analysis
- Crafting profit calculator with multiple pricing strategies
- Market analysis with order book data
- Recipe database for crafting opportunities
- NPC arbitrage with smart margin-focused scoring algorithms

## 📚 [full documentation](./docs/README.md)

want the complete guide? check out the [detailed docs](./docs/README.md) for in-depth explanations, examples, and troubleshooting.

## commands

### `/bazaar-price <item>`
shows current buy/sell prices for any item

### `/market-analysis <item>`
detailed market analysis with order book data

### `/flip-recommendations`
finds the best items to flip based on profit margins
- `category` - filter by item category
- `budget` - your available budget
- `count` - how many results to show

### `/craft-flipping <budget>`
finds the most profitable crafting recipes for your budget
- `pricing-strategy` - how you want to buy/sell (default: buy orders → sell orders)
- `count` - how many results to show (1-15)
- `include-risky` - include volatile items

### `/calculate-profit <item> <budget>`
calculates profit for crafting a specific item
- `pricing-strategy` - same as above

### `/list-recipes`
shows all available crafting recipes (add more in `src/data/recipes.ts`)
- `search` - search for specific recipes

### `/npc-arbitrage <budget>`
finds items cheaper on bazaar than NPC sell price for instant profit
- `strategy` - buying strategy (buy orders vs instant buy)
- `sort` - sorting method (balanced score, delta score, total profit, profit per hour, etc.)
- `page` - navigate through results
- `item` - analyze a specific item

**balanced score** (default): volume-focused algorithm with proven efficiency:
- logarithmic total profit and profit per item scaling
- balanced instasell coverage emphasis (up to 3x ratio)
- logarithmic quantity penalty (favors manageable quantities)
- proven track record for practical trading scenarios

**delta score**: advanced margin-focused algorithm with mathematical sophistication:
- enhanced margin weighting with square root amplification
- smooth liquidity curves using hyperbolic tangent
- sigmoid efficiency bonuses for optimal quantity management
- sophisticated mathematical caps instead of hard filters

### `/help`
shows what each command does

## pricing strategies

- **buy orders → sell orders** - place buy orders for ingredients, sell orders for results (most profit)
- **buy orders → instant sell** - place buy orders for ingredients, instant sell results
- **instant buy → sell orders** - instant buy ingredients, sell orders for results  
- **instant buy → instant sell** - instant buy ingredients, instant sell results (fastest)

## setup

1. clone this
2. `npm install`
3. add your discord bot token to `.env`
4. `npm start`

that's it. no api keys needed, uses public hypixel api.

## notes

- prices update in real time
- results are sorted by total profit
- high-risk items are filtered out by default
- uses order book strategy by default (best profits)

made this because i was tired of manually checking bazaar prices lol
