# Portfolio

## What it is for

The portfolio tracks spot holdings: what you own, what you paid, what it is
worth now, and how the allocation is distributed.

## Overview

- **Add asset** records a symbol, quantity, average cost and optional current
  price.
- Crypto holdings can track a live price; see **Automatic prices** below.
- Value, unrealized PnL and allocation are derived per row.

## Automatic prices

- The asset form has an **Automatic price** switch. It is on for new crypto
  assets and off for everything else; each asset can be changed at any time.
- While it is on, the Portfolio writes the latest shared market price into
  Current price. The list refreshes at most every 5 minutes, and an open asset
  form at most every 30 seconds.
- A price older than 15 minutes is never written. The row still shows the last
  update time, with a **Stale** badge, so an old quote is visible instead of
  silently becoming your valuation.
- Turn the switch off before typing a price by hand, so the next refresh does
  not overwrite it. An empty price means the holding is valued at cost, and
  totals stay honest rather than guessing.
- Only crypto is covered. Forex, stocks and the other markets stay manual.

## Stats

- Total value, total cost and unrealized PnL across all holdings.
- Allocation chart by asset, plus unrealized PnL per asset.
- Assets without a current price are valued at cost, so totals stay honest instead
  of guessing. Turn on automatic pricing or enter a price in the overview to see
  unrealized PnL.

## Filtering

- A **Filters** button above the table (or the charts on Stats) opens the sheet,
  which holds search, markets, quantity, average cost, current price, value,
  PnL, PnL %, outcome and presence (has price / notes) conditions. Changes apply
  live.
- The button shows a badge with the number of active groups; the sheet's section
  headers show where those groups are. Sections start collapsed and a section
  with an active filter opens on first view.
- Filters are per page and are dropped when you leave the tab. Totals and the
  allocation and PnL charts follow the filtered set.
- See **Filtering** under Features for how conditions combine, the Min/Max number
  ranges and the filtered-empty state.

## Why it works this way

- **Automatic pricing is opt-in and bounded.** A local-first app should not
  silently depend on a price API to show you your own data. Per-asset control, a
  5-minute cache and a 15-minute stale guard keep the portfolio honest and the
  provider budget intact.
- **Manual prices still work.** Turn automatic pricing off and type the price;
  nothing forces a network call for a holding you prefer to value yourself.
- **Average cost, not lots.** For a long-term spot portfolio, a single blended
  cost basis is easier to maintain and good enough for decisions.
- **Futures belong in the Journal.** Mixing leveraged positions into a spot
  allocation distorts both views.
