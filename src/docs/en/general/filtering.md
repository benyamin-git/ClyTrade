# Filtering

## What it is for

Every list and every stats view in the Journal and the Portfolio can be narrowed
down without leaving the page. The filters are the same idea in both places: a
single **Filters** button that opens a sheet holding every control for that page.

## The Filters button

- Each page shows one compact **Filters** button above its table or charts, never
  a row of controls. The button is the only filter affordance on the page.
- When filters are active the button shows a badge with the number of active
  groups, so you can tell at a glance that the page is narrowed without opening
  anything.
- Clicking the button opens the sheet. **Clear all** in the sheet footer empties
  every filter on the page at once.

## The sheet

- The sheet is the single home for every condition: search, markets, direction,
  status, dates, price & size, performance, outcome, tags, strategies and
  presence (has stop / target / notes / tags). The Journal Stats sheet also
  carries the time range (7D / 30D / 90D / YTD / All).
- Conditions are grouped into collapsible sections. A section header shows how
  many of its fields are set.
- Sections start **collapsed**, so the sheet opens tidy. A section that already
  has an active filter opens automatically the first time you open the sheet
  after arriving on the page; after that your own collapse and expand choices are
  respected until you leave the page.
- Changes apply live. There is no Apply or OK button; closing the sheet with
  **Done** only hides it. The table and the charts update as you type and toggle.
- Journal Stats keeps its time-range control inline next to the Filters button,
  because period is the most frequent cut; it still appears in the sheet as a
  section. **Clear all** restores it to your preferred default rather than to All.

## How conditions combine

- Different sections are combined with **AND**. A trade must satisfy the dates,
  the direction and the outcome at the same time.
- Multiple values inside one section are combined with **OR**. Selecting Crypto
  and Forex shows trades in either market, not only trades that are somehow
  both. The same applies to tags and strategies.
- Numeric fields are ranges, entered as two **Min** and **Max** number inputs.
  Leave an end blank for no bound on that side; leave both blank for no
  constraint. The placeholder shows the smallest and largest value in the data,
  so you can see the domain before you type. Values are taken exactly as typed —
  they are not snapped or clamped to the data.
- Presence filters offer three states: **Any**, **Has** and **Missing**. A
  missing field is a value in its own right, not a value to skip — being able to
  find trades with no stop is as useful as finding trades that have one.
- If a numeric field has no usable range (every value is the same, or there are
  no records), its inputs are disabled with a short note instead of pretending to
  accept a bound.

## Why it works this way

- **One tidy home.** A persistent quick bar and a row of removable chips read as
  heavy on the real screens: they compete with the table and the charts for
  vertical space. Moving every control into the sheet gives the dense trading
  views back their room, and keeps the one piece of always-visible state — the
  badge — that actually matters.
- **Collapsed by default, open when active.** Opening the sheet used to unfold
  every section at once, which was more noise than help. Starting collapsed keeps
  it calm, while auto-opening a section that hides an active filter makes the
  current state visible instead of hidden one level down.
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
- **The badge makes filters visible.** Hidden active filters are the main way
  list views confuse people. The badge on the button is the always-visible signal
  that the page is narrowed, and the per-section counts inside the sheet show
  exactly where.
- **An empty result is explained.** When records exist but none match, the table
  and the stats show "No trades match your filters" or "No assets match your
  filters" with a **Clear all** action, distinct from the message shown when
  there is no data at all. The two situations need different next steps.
