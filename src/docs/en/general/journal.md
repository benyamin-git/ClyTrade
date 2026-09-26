# Journal

## What it is for

The journal tracks futures and perp trades: entries, exits, stops, targets,
fees, notes and tags. It calculates per-trade metrics and aggregates them in
Stats.

## Overview

- **Add trade** opens a form with the same inputs you would use on an exchange.
- **Open** trades are marked until an exit price is filled in.
- Row metrics (net PnL, R multiple) are derived, never entered by hand.
- **Edit** reopens the same form; **Delete** asks for confirmation.

## Stats

- Filters by time range (7D / 30D / 90D / YTD / All).
- Headline numbers: net PnL, win rate, average R, profit factor, best/worst.
- Equity curve and per-trade PnL charts.

## Why it works this way

- **Derived data stays out of the form.** You enter what happened; ClyTrade
  computes what it means. This keeps entries fast and consistent.
- **Every metric has one definition.** The same calculation module is used in
  the row, in Stats and in the in-app documentation.
- **R depends on your risk definition.** By default the R denominator is the
  stop risk plus the trade's fees, so a trade that risks 1 and pays 0.5 in fees
  needs +1.5 to be 1R. Switch it off in Settings → Preferences to divide by the
  stop risk alone.
- **Notes and tags are optional but first-class.** Patterns only become visible
  when trades are labelled.
