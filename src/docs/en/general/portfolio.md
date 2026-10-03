# Portfolio

## What it is for

The portfolio tracks spot holdings: what you own, what you paid, what it is
worth now, and how the allocation is distributed.

## Overview

- **Add asset** records a symbol, quantity, average cost and optional current
  price.
- Current price is entered manually in V1. Live market data is an external
  integration planned after V1.
- Value, unrealized PnL and allocation are derived per row.

## Stats

- Total value, total cost and unrealized PnL across all holdings.
- Allocation chart by asset, plus unrealized PnL per asset.
- Assets without a current price are valued at cost, so totals stay honest instead
  of guessing. Update prices in the overview to see unrealized PnL.

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

- **Manual prices keep V1 honest and offline.** A local-first app should not
  silently depend on a price API to show you your own data.
- **Average cost, not lots.** For a long-term spot portfolio, a single blended
  cost basis is easier to maintain and good enough for decisions.
- **Futures belong in the Journal.** Mixing leveraged positions into a spot
  allocation distorts both views.
