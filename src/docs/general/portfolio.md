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

## Why it works this way

- **Manual prices keep V1 honest and offline.** A local-first app should not
  silently depend on a price API to show you your own data.
- **Average cost, not lots.** For a long-term spot portfolio, a single blended
  cost basis is easier to maintain and good enough for decisions.
- **Futures belong in the Journal.** Mixing leveraged positions into a spot
  allocation distorts both views.
