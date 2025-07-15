# ⚙️ technical stuff

[← back to docs](./README.md)

## the boring but important details

### hypixel api quirks

**biggest wtf:** hypixel's field names are backwards

```javascript
// what hypixel calls them:
sell_summary = buy orders (what people want to buy for)
buy_summary = sell orders (what people want to sell for)

// what they should be called:
buy_orders = actual buy orders
sell_orders = actual sell orders
```

we fix this mess in `transformBazaarData()` so the rest of the code makes sense.

### the 4% instant buy surcharge

hypixel adds 4% to all instant buys.

```javascript
// other tools:
cost = 100k coins

// reality:
baseCost = 100k coins
surcharge = 4k coins (4%)
actualCost = 104k coins
```

### pricing strategy logic

```javascript
// buying ingredients:
if (buyOrders || quickSell) {
    price = sellOrders[0].pricePerUnit  // compete with sellers
} else {
    price = calculateDepthAware(buyOrders)  // instant buy + surcharge
}

// selling results:
if (sellOrders || quickBuy) {
    price = buyOrders[0].pricePerUnit  // compete with buyers  
} else {
    price = calculateDepthAware(sellOrders)  // instant sell
}
```

### depth-aware calculations

simulates filling your order through the order book:

```javascript
let totalCost = 0;
for (const order of sellOrders) {
    const quantity = Math.min(order.amount, remaining);
    totalCost += quantity * order.pricePerUnit;
    remaining -= quantity;
}
// add 4% surcharge for instant buys
return totalCost * 1.04;
```

### global verbose system

instead of passing `verbose` everywhere:

```javascript
// old way (bad):
function doStuff(item, verbose) {
    if (verbose) console.log("doing stuff");
}

// new way (good):
Logger.verbose("doing stuff");  // checks global config internally
```

### error handling

the bot handles:
- api timeouts
- invalid item names  
- insufficient market depth

### caching

- autocomplete cache: item names (refreshed on api calls)
- no price caching (always fresh data)
- recipe cache: in-memory only

### rate limits

hypixel api limits:
- 120 requests per minute
- we use 1 request per command
- no issues unless you spam

### data flow

```
discord command 
→ command handler
→ service (crafting/flipping)
→ hypixel service
→ api call
→ data transformation
→ calculation
→ discord embed
→ response
```

### why typescript?

- catches api field mistakes at compile time
- better autocomplete
- self-documenting interfaces
- easier refactoring

### file structure

```
src/
├── commands/        # discord commands
├── services/        # business logic
├── types/          # typescript interfaces  
├── utils/          # shared utilities
├── config/         # global settings
├── constants/      # static values
└── data/           # recipes
```

## debugging

enable verbose mode: `/verbose toggle`

you'll see:
- order book consumption details
- market feasibility checks
- actual vs theoretical costs
- api response timing
- calculation breakdowns

useful for understanding why the bot recommends what it does.
