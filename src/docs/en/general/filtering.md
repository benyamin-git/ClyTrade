# Filtering

## What it is for

Every list and every stats view in the Journal and the Portfolio can be narrowed
down without leaving the page. The filters are the same idea in both places: a
quick bar that stays visible for the common cuts, and an advanced sheet that
holds the rest.

## The quick bar

- The bar sits above the table or the charts and never scrolls away.
- It carries a free-text search, the market picker and the two most-used
  segmented controls (direction and status for trades; the same search and
  market picker for assets).
- Every active filter appears as a removable chip below the bar, so you can see
  at a glance why the list is short and undo one condition at a time.
- The **Filters** button opens the advanced sheet; when filters are active it
  shows a count of how many groups are set. **Clear all** empties everything,
  from either the bar or the sheet.

## The advanced sheet

- The sheet groups the remaining conditions into collapsible sections — dates,
  price & size, performance, outcome, presence, and so on. Each section header
  shows how many of its fields are set.
- Changes apply live. There is no Apply or OK button; closing the sheet with
  **Done** only hides it. The table and the charts update as you drag sliders
  and toggle values.
- The Journal Stats sheet also carries the time range (7D / 30D / 90D / YTD /
  All). **Clear all** restores it to your preferred default rather than to All.

## How conditions combine

- Different sections are combined with **AND**. A trade must satisfy the dates,
  the direction and the outcome at the same time.
- Multiple values inside one section are combined with **OR**. Selecting Crypto
  and Forex shows trades in either market, not only trades that are somehow
  both. The same applies to tags and strategies.
- Numeric fields are ranges. A range with only a minimum reads `≥ min`, only a
  maximum reads `≤ max`, and both read `min – max`. Leaving both ends empty
  means no constraint.
- Presence filters offer three states: **Any**, **Has** and **Missing**. A
  missing field is a value in its own right, not a value to skip — being able to
  find trades with no stop is as useful as finding trades that have one.

## Sliders: log vs linear

- Fields that span orders of magnitude — entry and exit price, size, leverage,
  fees, value, duration — use a **logarithmic** slider. Price goes from a cent
  to six figures; on a linear track every realistic value would pile up at the
  far left and be impossible to pick.
- Fields that are already bounded and comparable across records — net PnL, R
  multiple, PnL percent — use a **linear** slider. These can be negative and
  their range is narrow, so an even track is the honest one.
- Sliders and the min/max number inputs are two views of the same range. Type a
  value when you need an exact bound, drag when you are exploring.
- If a field has no usable range (every value is the same, or there are no
  records), the control is disabled instead of pretending to move.

## Why it works this way

- **Per page, not global.** The trade list, the trade stats, the asset list and
  the asset stats each keep their own filters. Narrowing the Journal should not
  quietly change the Portfolio, and exploring stats should not disturb the list
  you were working in.
- **Reset when you leave.** Filters are held in memory while the page is open
  and dropped when you navigate away. A filter you set last week should not
  surprise you by hiding today's data — coming back to a tab always shows the
  full picture. This is also why the market filter starts on All markets rather
  than on your default market: a preference for new records must not hide
  existing ones.
- **Filtered totals are real totals.** The headline numbers and every chart are
  computed from the filtered rows, not from the whole table. If you filter to
  one strategy, the PnL, win rate and equity curve describe that strategy. A
  total that ignored the filter would be a different, and misleading, number.
- **Chips make filters visible.** Hidden active filters are the main way list
  views confuse people. The bar keeps every condition in sight and removable.
- **An empty result is explained.** When records exist but none match, the table
  and the stats show "No trades match your filters" or "No assets match your
  filters" with a **Clear all** action, distinct from the message shown when
  there is no data at all. The two situations need different next steps.
