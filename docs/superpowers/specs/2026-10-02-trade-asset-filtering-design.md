# Trade & Asset Filtering — Design Spec

**Status:** Draft
**Date:** 2026-10-02

## Objective / why

The Journal and Portfolio can currently be narrowed only by market (and, on
Journal, by open/closed). Every other stored attribute — symbol, tags,
strategy, direction, prices, size, leverage, fees, derived PnL and R, hold
duration, asset value and return — is invisible to filtering, so a book with
more than a handful of records can only be sliced by re-reading the table by
eye. This feature adds full, consistent filtering to all four surfaces
(Journal Overview, Journal Stats, Portfolio Overview, Portfolio Stats) so the
user can scope the table, charts, statistics and totals to exactly the records
they care about, without leaving the device or changing the data.

## Success criteria / definition of done

1. Journal Overview, Journal Stats, Portfolio Overview and Portfolio Stats each
   expose a quick bar (combined search + market multi-select; Journal also
   status and direction) and a Filters button that opens an advanced sheet.
2. The advanced sheet offers every field listed in **Filter dimensions**, with
   grouped collapsible sections and live application.
3. Active filters appear as removable chips beneath the quick bar, and the
   Filters button shows a badge counting active filter groups.
4. When any filter is active, the table, charts, headline statistics and
   summary/total cards all recompute from the filtered set.
5. Selecting values that match no record shows a distinct filtered-empty state
   with a Clear all action, separate from the first-run empty state.
6. Filters are independent per page and reset when the page is left; nothing is
   written to the URL or local storage.
7. All new UI text exists in both `en.ts` and `fa.ts` with identical keys.
8. New primitives and predicate modules have tests; each page has an
   integration test covering a representative filter flow.
9. `npm run typecheck`, `npm run lint` and `npm test` pass; screenshots are
   regenerated.

## Scope

### In scope

- Full filtering on Journal Overview, Journal Stats, Portfolio Overview and
  Portfolio Stats.
- New reusable UI primitives: Checkbox, MultiSelectField, RangeField,
  FilterChip, CollapsibleSection.
- Feature-local pure filter predicate modules for trades and assets.
- A shared filter-state hook plus helpers (defaults, dirty check, active-chip
  descriptions, change/reset).
- i18n keys (English + Persian), documentation updates and one new doc page,
  regenerated screenshots, README/AGENTS.md wording.

### Non-goals (explicitly out)

- No schema, Dexie, backup-format or repository changes. Filtering is
  read-only over existing records.
- No changes to `src/calculations/**` (protected). Filters call the existing
  exports to obtain derived metrics.
- No persistence, sharing or URL encoding of filter state.
- No new data fields; nothing in the create/edit forms changes.
- No server, sync, live data or account work.
- No changes to the allocated dev/live port (`0.0.0.0:7401`) or dashboard
  registration.
- No sorting, grouping, saved presets or export of the filtered view.

## Decision log

| #   | Decision | Rationale | Status | Source |
| --- | --- | --- | --- | --- |
| D1  | Filtering lands on all four pages: Journal Overview/Stats, Portfolio Overview/Stats. | One consistent system across both tabs, as requested. | decided | user |
| D2  | Active filters recompute tables, charts, statistics and summary/total cards from the filtered set. | The view should always describe exactly what is shown. | decided | user |
| D3  | UX is a quick bar plus an advanced sheet plus active-filter chips with Clear all. | Many fields cannot all stay inline without crowding. | decided | user |
| D4  | Filter state is independent per page and resets on leaving the page; no URL or localStorage persistence. | Predictable, matches the existing market-filter behavior. | decided | user |
| D5  | Write and commit a spec and an implementation plan under `docs/superpowers/`. | Requested planning artifact. | decided | user |
| D6  | Journal filters cover the full proposed field list: search; market/direction/status; tags/strategy; opened/closed ranges; entry, exit, size, leverage, fees, net PnL, R and duration ranges; outcome and presence. | "Every field that makes sense", as requested. | decided | user |
| D7  | Multi-value fields (markets, tags, strategies) combine with OR ("match any"). | Expected narrowing behavior; keeps selection permissive. | decided | user |
| D8  | Tag and strategy pick-lists are the distinct values already present in all records. | Keeps spelling consistent and the list stable. | decided | user |
| D9  | Journal Stats keeps its 7D/30D/90D/YTD/All control and adds optional opened/closed date ranges as additional AND filters. | Time range is a familiar quick control; explicit ranges add precision. | decided | user |
| D10 | Journal has an outcome filter (win/loss/break-even) and presence filters (has stop, has target, has notes, has tags). | Derived and presence splits are useful for pattern finding. | decided | user |
| D11 | Portfolio filters cover the full proposed field list: search; market; quantity, average cost, current price, value, unrealized PnL and return % ranges; outcome and presence. | Same completeness as Journal. | decided | user |
| D12 | Portfolio has a gain/loss/break-even outcome filter. | Splits winners from losers, valued-at-cost counts as break-even. | decided | user |
| D13 | Portfolio has presence filters for "has current price vs valued at cost" and "has notes". | Distinguishes marked-to-market from carried-at-cost holdings. | decided | user |
| D14 | Record metadata dates (`createdAt`, `updatedAt`) are not filterable. | Low value for analysis; keeps the sheet smaller. | decided | user |
| D15 | Quick bar holds combined search, the market multi-select, and (Journal) status and direction; everything else lives in the sheet. | Keeps the common cases one tap away. | decided | user |
| D16 | Numeric range filters use a dual slider plus min/max number inputs. | Fast coarse selection with typed precision. | decided | user |
| D17 | Build reusable primitives in `src/ui`: Checkbox, MultiSelectField, RangeField, FilterChip, CollapsibleSection, each tested. | No such primitives exist; reuse across both tabs. | decided | user |
| D18 | Active filters show as removable chips under the quick bar, and the Filters button shows a badge. | Makes active state legible without opening the sheet. | decided | user |
| D19 | One combined, case-insensitive substring search box per page over symbol/strategy/notes/tags (trades) and symbol/name/notes (assets). | Fewest controls for the common lookup. | decided | user |
| D20 | The sheet applies changes live; its footer offers Clear all and Done. | Matches the existing live market filter; no lost edits. | decided | user |
| D21 | Predicate functions and filter types live in `src/features/journal/logic/tradeFilters.ts` and `src/features/portfolio/logic/assetFilters.ts`, pure and colocated with tests; they call the protected calculations for derived metrics. | Keeps filtering testable and feature-scoped. | decided | user |
| D22 | A shared hook/helpers provide defaults, dirty check, active-chip descriptions and reset, with each page owning its own state. | Avoids duplicating four near-identical pages. | decided | user |
| D23 | The inline market control is a multi-select, matching the sheet. | One mental model for the market filter. | decided | user |
| D24 | The sheet is grouped into labelled collapsible sections with a per-section active count. | Many fields need structure to stay scannable. | decided | user |
| D25 | Slider bounds are data-driven; positive-only fields use a log scale, signed fields use a linear scale. | Wide positive ranges stay usable; signed fields cannot be logged. | decided | user |
| D26 | A distinct filtered-empty state with Clear all appears when records exist but none match; the first-run empty state is unchanged. | Distinguishes "no data" from "over-filtered". | decided | user |
| D27 | Journal Stats uses every control except status and always analyzes closed trades. | Stats performance needs closed trades; an open-only selection would be meaningless. | decided | user |
| D28 | Tag and strategy pick-lists are built from all records, not only currently matching ones. | Options stay stable while filtering. | decided | user |
| D29 | The Filters badge counts active filter groups, not selected values. | Signals breadth, not verbosity. | decided | user |
| D30 | Supporting work includes en+fa keys, updating journal/portfolio/markets docs, a new Filtering doc page, regenerated screenshots and README/AGENTS.md wording. | Keeps product docs and committed assets in sync. | decided | user |
| D31 | Tests: table-driven predicate unit tests, one page integration test per feature, and tests for every new primitive. | Balances confidence with effort. | decided | user |
| D32 | The advanced sheet includes the inline quick-bar filters too; the quick bar is a shortcut, the sheet is canonical. | One place lists every filter. | decided | user |
| D33 | Naming: `TradeFilters`/`AssetFilters`, `useTradeFilters`/`useAssetFilters`, and `FilterSheet`, `FilterChip`, `MultiSelectField`, `RangeField`, `Checkbox`, `CollapsibleSection`. | House conventions, no feature prefixes on shared controls. | decided | user |
| D34 | Spec and plan filenames use the `trade-asset-filtering` topic. | Descriptive and stable. | decided | user |
| D35 | New doc: slug `filtering`, group Features, title "Filtering". | Discoverable beside Journal and Portfolio. | decided | user |
| D36 | Presence filters are tri-state (Any / Has / Missing). | Allows isolating records that lack a field. | decided | user |
| D37 | The Stats time-range control also appears as a group in the sheet. | The sheet is the canonical list of every filter. | decided | user |
| D38 | Clear all resets every filter on the page, including the Stats time range (back to the preference default). | One unambiguous reset. | decided | user |

## Architecture

### Data flow

`useLiveQuery(listTrades/listAssets)` → `toTradeRows`/asset row mapping (derived
metrics via the protected calculations) → predicate module (`filterTrades` /
`filterAssets`) → page consumers (table rows, stats inputs, totals, charts).
Filter state lives in the page component and is passed to the predicate and the
filter UI.

### Filter dimensions

**Trades** (`TradeFilters`): `search`, `markets: Market[]`, `direction`,
`status` (Overview only; Stats ignores it), `tags: string[]`,
`strategies: string[]`, `openedFrom/openedTo`, `closedFrom/closedTo`,
`entryMin/Max`, `exitMin/Max`, `sizeMin/Max`, `leverageMin/Max`,
`feesMin/Max`, `netPnlMin/Max`, `rMultipleMin/Max`, `durationMin/Max`,
`outcome`, and tri-state `hasStop` / `hasTarget` / `hasNotes` / `hasTags`.

**Assets** (`AssetFilters`): `search`, `markets: Market[]`,
`quantityMin/Max`, `avgCostMin/Max`, `currentPriceMin/Max`,
`valueMin/Max`, `pnlMin/Max`, `pnlPercentMin/Max`, `outcome`, and tri-state
`hasPrice` / `hasNotes`.

Each range is inclusive, and a blank bound means unbounded. A blank/`null`
filter is inactive. `isDefaultTradeFilters` / `isDefaultAssetFilters` identify
the all-empty state, driving the badge, chips and Clear all.

### Components and modules

- `src/features/journal/logic/tradeFilters.ts` — `TradeFilters` type,
  `DEFAULT_TRADE_FILTERS`, `filterTrades`, active-group/`describeFilters`
  helpers. Pure (no React/DOM beyond types), calls `calculateTradeMetrics`.
  Colocated `tradeFilters.test.ts`.
- `src/features/portfolio/logic/assetFilters.ts` — the asset equivalent,
  calling `calculateAssetMetrics`. Colocated test.
- A shared hook/helper module (e.g.
  `src/features/filters/useFilters.ts` and small helpers) providing generic
  update/reset/dirty logic consumed by both features.
- `src/ui/components/`: `Checkbox`, `MultiSelectField`, `RangeField`,
  `FilterChip`, `CollapsibleSection` (new); existing `Sheet`, `SelectField`,
  `SegmentedControl`, `TextField`, `NumberField`, `Card` reused.
- `src/features/journal/components/JournalFilterSheet.tsx` and
  `src/features/portfolio/components/PortfolioFilterSheet.tsx` compose the
  shared primitives with each feature's field metadata; a shared
  `FilterSheet`/quick-bar layout wrapper keeps the four pages consistent.

### Slider scale

`RangeField` receives data-driven bounds. Positive-only fields use a log scale;
signed fields use a linear scale. Typed inputs are not clamped by the slider
bounds. Degenerate ranges (min === max across all records) render the field
disabled with a note rather than a broken slider.

## Risks + rollback

- **Sheet complexity on mobile.** A long grouped sheet can feel heavy. Mitigated
  by collapsible sections, live apply and Done, and by keeping the common
  filters in the quick bar.
- **Existing page tests.** The quick-bar market control changes from a
  single-select `SelectField` to a multi-select, which will break the current
  `getByLabelText('Market')` assertions; those tests are updated as part of the
  work.
- **Slider usability with outliers.** Data-driven bounds can be skewed by a
  single extreme record; the typed inputs remain the escape hatch.
- **Derived-metric coupling.** Filters import the protected calculations; no
  changes to those files are made, so the protected layer is untouched.
- **Rollback.** The change is additive UI plus new modules. Reverting the
  feature branch restores the current market-only behavior with no data
  migration.

## Dependencies / ordering

1. UI primitives first (no feature dependencies), with tests.
2. Predicate modules and shared filter hook next, with tests.
3. Quick bar, chips and sheet components.
4. Wire the four pages, update existing page tests.
5. i18n keys (en + fa) alongside each UI addition.
6. Docs (journal, portfolio, markets, new Filtering page), README/AGENTS.md.
7. Regenerate screenshots.

No external dependencies; nothing blocks on another team or service.

## Open questions

None.
