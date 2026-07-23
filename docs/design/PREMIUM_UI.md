# Premium UI - direction and working notes

Branch: `feat/premium-ui`. Source ruleset: `Repertoire/design/DESIGN_PRINCIPLES.md`
(the owner's portable knowledge library; this file records the decisions made
for THIS product).

## Identity

**A precision trading instrument for a playful game economy.** Calm, confident,
satisfying to touch. Linear/Notion restraint, chess.com smoothness, a hint of
terminal (mono numbers) because the product is live market data. Not "gaming UI",
not neon, not glassmorphism.

## Decisions (locked)

- **Neutrals**: cool navy-tinted dark ramp (canvas, surface, raised well), hairline
  borders. Never flat `#121212`-style pure gray, never pure black or white.
  Light theme exists but dark is the designed-first experience.
- **One accent**: brand blue (the logo blue). It carries interaction: primary
  buttons, active nav, focus, links. Locked everywhere.
- **Semantic hues only** (muted, informational, never decorative):
  - emerald = buy/profit/live, red = sell/loss/offline, amber = risk/warning
  - purple = the Elite tier and Bazaar Manipulation identity, kept muted
  - everything else that is currently violet/amber/random icon tinting collapses
    to neutral or accent.
- **Type**: Space Grotesk for UI (base weight 500 on dark), Space Mono for real
  tabular numbers (prices, spreads, scores, stat tiles). Sentences with a number
  stay sans; mono is for data, not prose.
- **Motion**: two easings only.
  - spring `cubic-bezier(0.34, 1.56, 0.64, 1)` for physical things (press scale,
    toggle thumbs, sliding indicators)
  - ease-out `cubic-bezier(0.16, 1, 0.3, 1)` for fades/slides/panels
  - 120-200ms presses, 250-400ms panels. Reduced-motion collapses everything.
- **Radius**: one scale from `--radius` (10px base). No mixing rounded-xl/2xl ad hoc.
- **Separation**: whitespace + hairlines over nested cards. Cards only where
  elevation means something (an opportunity, a plan, a modal).

## Diagnosis of the old UI (what we are fixing)

1. Tailwind config hardcoded flat hexes (`#121212`, `#1E1E1E`) over the CSS vars:
   flat gray world, light theme dead. -> tokens now live in globals.css only.
2. Inter everywhere, no tabular numerals in a numbers product.
3. Hue confetti: blue primary + purple manipulation + emerald live/unlock + violet
   items + amber catalog, all at decoration strength.
4. Infinite animated gradient on the Manipulation title (banned: unmotivated,
   loops forever, cheap tell). Glow blobs on most cards.
5. No motion system: no press feedback, no sliding indicators, hard swaps.
6. Landing = AI-slop template shape: centered hero + badge pill + three equal
   pricing cards + icon confetti background in the featured card.
7. Sign-in / empty states: oversized icon + heading + a caption that restates the
   heading + a second caption box restating it again.
8. `→` characters used as connectors in copy; middots as separators.

## Screen priorities (order of passes)

1. Foundation (tokens, fonts, motion utilities, button/input/card primitives)
2. Landing page (the sales surface; must make someone want to pay)
3. Dashboard chrome: sidebar (sliding active indicator), header, home
4. Flipping + Manipulation (the paid product: opportunity cards, filters,
   segmented controls, stat tiles)
5. Bazaar items table (tnum columns), item detail, profile/billing
6. States pass: loading (skeletons that match layout), empty, error, sign-in
7. Micro-interaction checklist + reduced-motion + mobile pass

## Status after pass 1 (five commits on feat/premium-ui)

Done: foundation (tokens/type/motion), landing page, dashboard chrome (sliding
sidebar pill, header dot, home stat tiles), LoginCheck/PermissionCheck gates,
flipping + manipulation opportunity cards (numbered steps, semantic hues, mono
data), opportunity feed, hero preview regenerated.

## Status after pass 2 (owner feedback + full queue)

Owner feedback folded in: trophy badge pill and Zap CTA restored, catchy save
percent in gain color, data pages full-width, pill/stat footer row aligned,
global cursor-pointer rule. Then the queue: Segmented control (sliding pill)
for the preset picker, grid-rows collapse for both filter panels, FeatureCard
flattened, item-detail header + mono stats, market page headers, chart
neutrals on the ramp, flipping skeleton rebuilt to mirror the real card, admin
sweep (tier tokens, middots, comments), legal pages em-dash sweep, mobile
overflow fixed (landing nav at 375px). Mobile + fonts verified in the live
browser (scrollWidth = viewport, Space Grotesk/Mono loaded).

## Still open (needs a logged-in click-through or a later round)

1. Authenticated-flow feel test: segmented preset switch, filter collapse,
   card expand, portal/cancel buttons. Code follows verified patterns but eyes
   beat inference.
2. Item detail deep sections (order tables, 48h average card, chart legend
   copy) got a light pass only; a dedicated round could tighten them.
3. Admin pages are consistent but un-redesigned (Discord-style tables etc.).
4. Light theme exists at token level; the product ships dark-first and the
   light ramp has not been visually tuned.

## Verification loop

Headless Chrome screenshots (the embedded pane cannot capture):
`chrome --headless=new --screenshot=out.png --window-size=1440,H url`
Authenticated screens: log in via the real browser, or judge from code + ask the
owner to click through. Every pass ends with: look, list what is off, fix, look
again. Commit per coherent pass.
