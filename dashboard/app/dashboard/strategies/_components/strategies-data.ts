import {
  BarChart3,
  DollarSign,
  Hammer,
  Coins,
  Shuffle,
  Crosshair
} from "lucide-react"

export const strategies = [
  {
    id: "bazaar-flipping",
    title: "Bazaar Flipping",
    description: "Buy low, sell high on the Hypixel Bazaar. The most reliable way to generate consistent profits.",
    icon: Shuffle,
    status: "released",
    href: "/dashboard/strategies/flipping",
    color: "emerald"
  },
  {
    id: "craft-flipping",
    title: "Craft Flipping",
    description: "Profit from crafting items by analyzing material costs vs. final product prices.",
    icon: Hammer,
    status: "coming-soon",
    href: "#",
    color: "blue"
  },
  {
    id: "npc-flipping",
    title: "NPC Flipping",
    description: "Maximize profits from the 200M daily NPC limit by finding the highest margin items.",
    icon: Coins,
    status: "coming-soon",
    href: "#",
    color: "amber"
  },
  {
    id: "bazaar-manipulation",
    title: "Bazaar Manipulation",
    description: "Corner thin-supply, high-demand markets, set the price, and lure overpriced buy orders. High risk, high reward.",
    icon: Crosshair,
    status: "released",
    href: "/dashboard/strategies/manipulation",
    color: "rose"
  },
  {
    id: "budget-planner",
    title: "Budget Planner",
    description: "Allocate coins across strategies with risk-adjusted projections.",
    icon: DollarSign,
    status: "planned",
    href: "#",
    color: "rose"
  },
  {
    id: "auction-house",
    title: "Auction House",
    description: "Snipe underpriced items and flip them for profit. Requires quick reflexes and market knowledge.",
    icon: BarChart3,
    status: "planned",
    href: "#",
    color: "purple"
  }
]

// FAQ data for different strategies
export const getFAQData = (strategyId: string) => {
  switch (strategyId) {
    case "bazaar-flipping":
      return [
        {
          question: "How does the scoring system work?",
          answer: "Our scoring formula starts with profit per hour, then applies small penalties for risk (volatile prices, suspicious jumps) and competition (how many people are flipping the same item). The system also considers demand/supply per hour and order creation rates. We can't reveal all the formula details to maintain our competitive edge, but this gives you the key concepts."
        },
        {
          question: "What do the risk percentages mean?",
          answer: "Risk percentages show how much the scoring system reduces an item's score due to price volatility. Higher percentages mean the system thinks prices are jumping around, look manipulated, or have thin order books. You can toggle off risk penalties if you're comfortable with volatility."
        },
        {
          question: "How do I interpret competition levels?",
          answer: "Competition per hour shows how busy an item is. Lower numbers mean fewer people are trying to flip it, which usually means better opportunities. Higher competition means more people competing for the same profits."
        },
        {
          question: "What's the difference between the trading presets?",
          answer: "Fast (30min) maximizes profit per hour and disables risk penalties. Default (1h) balances profit with safety. Stable (6h) focuses on items with stable prices so you can hold them longer and be confident the prices won't change much, ensuring you still make profit even after several hours."
        }
      ]
    case "bazaar-manipulation":
      return [
        {
          question: "How does cornering the market work?",
          answer: "We look for items with thin supply (few standing sell orders, low sell volume) but strong demand (lots of buyers per hour). We add up every visible sell offer to estimate how many coins it takes to buy out the whole market, and the average cost per unit. Once you hold all the supply, you control the price."
        },
        {
          question: "What is the minimum resell price?",
          answer: "It's your break-even after the Bazaar tax. If your average cost is C per unit and tax is 1.125%, you need to sell at C / (1 - 0.01125) just to break even. We never suggest selling below that."
        },
        {
          question: "What do ROI and the doublings mean?",
          answer: "ROI is how inflated your buy order is versus the break-even price. At 2x, your inflated buy order is twice the break-even, so when other players outbid it and you insta-sell into them, you roughly double your cornering capital. The doublings show how many times the current top bid must double to reach that inflated buy order."
        },
        {
          question: "Why is this high risk?",
          answer: "Cornering ties up a lot of capital in one item, and you rely on other players continuing to buy. They can dump their own supply, undercut your sell wall, or simply stop buying. The sell-through estimate assumes current demand holds. Only risk what you can afford to hold."
        }
      ]
    case "craft-flipping":
      return [
        {
          question: "How do I calculate crafting costs?",
          answer: "Our tools will automatically calculate total material costs by analyzing current market prices for all required ingredients."
        },
        {
          question: "What's a good profit margin for crafting?",
          answer: "Aim for at least 15-20% profit margin after accounting for material costs and time investment."
        },
        {
          question: "Which items are best for craft flipping?",
          answer: "Focus on items with consistent material availability and stable end-product demand."
        },
        {
          question: "How do I track material prices?",
          answer: "We'll provide real-time monitoring of material costs to help you time your purchases optimally."
        }
      ]
    case "npc-flipping":
      return [
        {
          question: "What's the daily NPC limit?",
          answer: "You can sell up to 200 million coins worth of items to NPCs per day."
        },
        {
          question: "How do I find the best NPC margins?",
          answer: "Compare fixed NPC buy prices with current market prices to identify items with the highest profit potential."
        },
        {
          question: "Which items have the best NPC margins?",
          answer: "Common drops and materials often have the best margins since NPCs pay fixed prices regardless of market conditions."
        },
        {
          question: "When should I sell to NPCs?",
          answer: "Sell to NPCs when market prices are low or when you need quick liquidity."
        }
      ]
    default:
      return [
        {
          question: "When will this strategy be available?",
          answer: "This strategy is currently in development. Check back later for updates and release information."
        },
        {
          question: "What features are planned?",
          answer: "We're working on comprehensive tools and analysis features. Stay tuned for announcements."
        },
        {
          question: "Can I suggest features?",
          answer: "Yes! We welcome feedback and suggestions for improving our trading tools."
        },
        {
          question: "How do I stay updated?",
          answer: "Check our dashboard regularly for updates on strategy development and new features."
        }
      ]
  }
}
