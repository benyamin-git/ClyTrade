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

## Filtering

- A **Filters** button above the table opens the sheet, which holds search,
  markets, direction, status, tags, strategies, dates, price & size,
  performance, outcome and presence (has stop / target / notes / tags)
  conditions. Changes apply live.
- On the list the button shows a badge with the number of active groups; the
  sheet's section headers show where those groups are. Sections start collapsed
  and a section with an active filter opens on first view.
- Stats keeps its time-range control (7D / 30D / 90D / YTD / All) inline next to
  the Filters button; the same control also appears in the Stats sheet.
  **Clear all** restores it to the preference default.
- Filters are per page and are dropped when you leave the tab, so returning
  always shows every trade. Totals, win rate and charts follow the filtered set.
- See **Filtering** under Features for how conditions combine, the Min/Max number
  ranges and the filtered-empty state.

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
