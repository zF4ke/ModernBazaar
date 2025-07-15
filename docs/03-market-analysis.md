# 🔬 market analysis

[← back to docs](./README.md)

## how the bot figures out if you're dreaming

the bot doesn't just look at top prices. it simulates actually buying/selling your order to see what really happens.

## depth-aware pricing

**what it is:** calculates real costs when buying lots of items

**why it matters:** buying 1000 enchanted diamonds isn't 1000x the price of buying 1

### example time

you want to buy 1000 enchanted coal:

```
order book:
1. 500 coal @ 100 coins each
2. 300 coal @ 105 coins each  
3. 200 coal @ 110 coins each

naive calculation: 1000 × 100 = 100k coins
reality check:
- first 500 @ 100 = 50k coins
- next 300 @ 105 = 31.5k coins
- last 200 @ 110 = 22k coins
- total: 103.5k coins + 4% surcharge = 107.6k coins

actual cost: 107.6 coins per item (not 100!)
```

## order book consumption

shows exactly how your order gets filled:

```
🔄 Starting order consumption process:
   Order 1: 100.0 × 500 = 50,000 coins
             Running total: 50,000 coins, 500 items remaining
   Order 2: 105.0 × 300 = 31,500 coins
             Running total: 81,500 coins, 200 items remaining
   Order 3: 110.0 × 200 = 22,000 coins
             Running total: 103,500 coins, 0 items remaining
   ✅ Full quantity obtained after 3 orders
```

## feasibility checks

**what if there's not enough supply?**

```
you want: 1000 enchanted diamonds
available: 750 enchanted diamonds

result: "⚠️ Market insufficient! Can only buy 750 of 1000"
max possible crafts: 750
```

the bot won't lie to you about impossible trades.

## volatility detection

flags items that are:
- price swinging wildly
- low volume (easy to manipulate)
- missing from one side of the order book

```
⚠️ HIGH VOLATILITY WARNING
enchanted_eye_of_ender:
- price changed 45% in last hour
- only 12 buy orders available
- recommend smaller position size
```

## hypixel's 4% instant buy tax

**important:** hypixel adds 4% to all instant buys for "market stability"

```
base cost: 100k coins
hypixel surcharge: 4k coins
actual cost: 104k coins
```

the bot always includes this in calculations. 

## market depth visualization

when verbose mode is on (`/verbose toggle`), you get detailed breakdowns:

```
📊 Order Book Preview (first 5 orders):
   1. 245.5 coins × 1,247 items
   2. 246.0 coins × 892 items
   3. 247.2 coins × 2,156 items
   4. 248.1 coins × 445 items
   5. 249.0 coins × 1,891 items

📈 Market Analysis:
   Total available: 15,247 items
   Requested: 5,000 items
   Will buy: 5,000 items
   ✅ Market has sufficient supply
```
