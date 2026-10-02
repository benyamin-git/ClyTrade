# Trade & Asset Filtering — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-02-trade-asset-filtering-design.md`
**Status:** Draft
**Date:** 2026-10-02

## Global constraints (from the spec)

- **Never modify `src/calculations/**`.** Filters call the existing exports
  (`calculateTradeMetrics`, `calculateAssetMetrics`) but do not change them.
- No schema, Dexie, backup-format or repository changes. Filtering is read-only
  over existing records.
- No persistence, sharing or URL encoding of filter state. Filters are
  independent per page and reset when the page unmounts.
- The dev/live port stays `0.0.0.0:7401`; no dashboard registration change.
- Every new UI string is added to **both** `src/i18n/en.ts` and `src/i18n/fa.ts`
  with identical keys (TypeScript enforces parity, `dictionaries.test.ts` too).
- TypeScript strict with `noUncheckedIndexedAccess`. Tailwind v4 semantic
  utilities only; logical direction utilities (`ms-`, `me-`, `text-end`) and
  `rtl:` variants, never physical `left`/`right`. Base CSS only inside
  `@layer base`.
- Naming: `TradeFilters`, `AssetFilters`, `useTradeFilters`, `useAssetFilters`,
  and shared controls `FilterSheet`, `FilterChip`, `MultiSelectField`,
  `RangeField`, `Checkbox`, `CollapsibleSection`.
- Reuse existing i18n keys where they exist: `fields.*`, `markets.*`,
  `direction.*`, `status.*`, `timeRange.*`, `common.cancel/close`.
- Run `npm run typecheck`, `npm run lint` and `npm test` before finishing. Do
  not commit unless asked; each task below is its own commit.

## Deliverable module map

```
src/lib/range.ts                                   (new, pure scale math)
src/ui/components/Checkbox.tsx                     (new)
src/ui/components/CollapsibleSection.tsx           (new)
src/ui/components/FilterChip.tsx                   (new)
src/ui/components/MultiSelectField.tsx             (new)
src/ui/components/RangeField.tsx                   (new)
src/features/filters/filterTypes.ts                (new, shared types)
src/features/filters/filterUtils.ts                (new, pure helpers)
src/features/filters/useFilterState.ts             (new, shared hook)
src/features/filters/FilterSheet.tsx               (new, shared chrome)
src/features/filters/FilterBar.tsx                 (new, shared chrome)
src/features/journal/logic/tradeFilters.ts         (new)
src/features/portfolio/logic/assetFilters.ts       (new)
src/features/journal/components/JournalFilterSheet.tsx    (new)
src/features/portfolio/components/PortfolioFilterSheet.tsx (new)
src/features/journal/pages/JournalOverviewPage.tsx (modify)
src/features/journal/pages/JournalStatsPage.tsx    (modify)
src/features/portfolio/pages/PortfolioOverviewPage.tsx   (modify)
src/features/portfolio/pages/PortfolioStatsPage.tsx      (modify)
src/i18n/en.ts, src/i18n/fa.ts                     (modify, per task)
src/docs/en/general/filtering.md                   (new)
src/docs/en/general/journal.md, portfolio.md, markets.md (modify)
src/docs/registry.ts                               (modify)
README.md, AGENTS.md                               (modify)
screenshots/desktop/*.png                          (regenerated)
```

## Tasks

### Task 1 — `Checkbox` and `CollapsibleSection` primitives

**Files created:** `src/ui/components/Checkbox.tsx`,
`src/ui/components/Checkbox.test.tsx`,
`src/ui/components/CollapsibleSection.tsx`,
`src/ui/components/CollapsibleSection.test.tsx`.

**Interfaces**

```ts
export interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export interface CollapsibleSectionProps {
  title: string
  count?: number
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}
```

`Checkbox` renders a labelled native `<input type="checkbox">` with the 40px
control density and `useId`. `CollapsibleSection` renders a full-width toggle
button (`aria-expanded`) with an optional count badge and a chevron, hiding
children when collapsed; `defaultOpen` defaults to `true`.

**i18n:** none.

**Verification:** `npm test -- src/ui/components/Checkbox.test.tsx
src/ui/components/CollapsibleSection.test.tsx` (checkbox toggles and reports;
section collapses/expands and shows its count). Then `npm run typecheck`.

**Commit:** `feat(ui): add checkbox and collapsible section primitives`

---

### Task 2 — `FilterChip` primitive

**Files created:** `src/ui/components/FilterChip.tsx`,
`src/ui/components/FilterChip.test.tsx`.

**Interface**

```ts
export interface FilterChipProps {
  label: string
  onRemove: () => void
  className?: string
}
```

Renders a pill with the label and an `X` `IconButton`; clicking the remove
control calls `onRemove`. Uses `me-`/`ms-` logical spacing.

**i18n:** add `filters.remove` (`Remove {{label}}`) to both dictionaries for the
button's accessible name.

**Verification:** `npm test -- src/ui/components/FilterChip.test.tsx` (label
visible, remove callback fired once).

**Commit:** `feat(ui): add filter chip primitive`

---

### Task 3 — `MultiSelectField` primitive

**Files created:** `src/ui/components/MultiSelectField.tsx`,
`src/ui/components/MultiSelectField.test.tsx`.

**Interface**

```ts
export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectFieldProps {
  label: string
  value: readonly string[]
  options: readonly MultiSelectOption[]
  onChange: (value: string[]) => void
  placeholder?: string
  hint?: string
  disabled?: boolean
  className?: string
}
```

A bordered field (matching `SelectField` height/density) with an inline search
input filtering the option labels case-insensitively, and a scrollable list of
`Checkbox` rows. Selecting/unselecting reports the new array (order follows the
option list). Empty selection is allowed. When `options` is empty the list
shows a disabled "No options" line (i18n `filters.noOptions`).

**i18n:** `filters.noOptions` in both dictionaries.

**Verification:** `npm test -- src/ui/components/MultiSelectField.test.tsx`
(single and multiple toggles, typing filters the list, labels accessible).

**Commit:** `feat(ui): add multi-select field primitive`

---

### Task 4 — `src/lib/range.ts` scale math and `RangeField`

**Files created:** `src/lib/range.ts`, `src/lib/range.test.ts`,
`src/ui/components/RangeField.tsx`, `src/ui/components/RangeField.test.tsx`.

**Interfaces**

```ts
export type RangeScale = 'linear' | 'log'

export function effectiveBounds(min: number, max: number, scale: RangeScale): { min: number; max: number }
export function valueToPosition(value: number, min: number, max: number, scale: RangeScale): number
export function positionToValue(position: number, min: number, max: number, scale: RangeScale): number

export interface RangeFieldProps {
  label: string
  value: { min: number | null; max: number | null }
  onChange: (value: { min: number | null; max: number | null }) => void
  min: number          // data lower bound
  max: number          // data upper bound
  scale?: RangeScale   // default 'linear'
  format?: (value: number) => string
  step?: number
  disabled?: boolean
  hint?: string
  className?: string
}
```

`range.ts` is pure: `log` clamps the positive domain (bounds floor above 0) and
falls back to linear when the domain is non-positive; positions are 0..1. When
`max <= min` the field is disabled and shows `hint` (the caller passes
`filters.degenerateRange`). `RangeField` composes two native
`<input type="range">` handles (min/max, kept ordered) plus two `NumberField`
inputs; blank input means unbounded (`null`). Typed values are not clamped to
slider bounds. Uses `text-start`/`dir` properly so it works in RTL.

**i18n:** `filters.min`, `filters.max`, `filters.degenerateRange` in both
dictionaries.

**Verification:** `npm test -- src/lib/range.test.ts
src/ui/components/RangeField.test.tsx` (round-trip position/value for linear and
log, log fallback on non-positive bounds, typed max below min is not forced,
degenerate domain disables the field). Then `npm run typecheck`.

**Commit:** `feat(ui): add range field with log and linear scales`

---

### Task 5 — Shared filter core

**Files created:** `src/features/filters/filterTypes.ts`,
`src/features/filters/filterUtils.ts`,
`src/features/filters/filterUtils.test.ts`,
`src/features/filters/useFilterState.ts`,
`src/features/filters/useFilterState.test.tsx`.

**Interfaces**

```ts
// filterTypes.ts
export type TriState = 'any' | 'has' | 'missing'
export interface Range { min: number | null; max: number | null }
export interface FilterGroupDescriptor<F> {
  id: string
  labelKey: TranslationKey
  isActive: (filters: F) => boolean
  clear: (filters: F) => F
}
export interface FilterChipDescriptor<F> {
  id: string
  label: string
  clear: (filters: F) => F
}

// filterUtils.ts
export const EMPTY_RANGE: Range
export function isRangeActive(range: Range): boolean
export function inRange(value: number, range: Range): boolean
export function matchesText(values: readonly (string | null | undefined)[], needle: string): boolean
export function matchesTriState(present: boolean, state: TriState): boolean
export function toggleInArray<T>(values: readonly T[], value: T): T[]
export function withRangeBound(range: Range, bound: 'min' | 'max', value: number | null): Range
export function describeRange(range: Range, format: (value: number) => string): string | null
export function activeGroupCount<F>(filters: F, groups: readonly FilterGroupDescriptor<F>[]): number

// useFilterState.ts
export function useFilterState<F>(defaults: F): {
  filters: F
  patch: (partial: Partial<F>) => void
  reset: () => void
}
```

All `filterUtils` functions are pure. `matchesText` trims and lowercases the
needle and returns true when it is empty. `inRange` is inclusive and treats a
`null` bound as unbounded. `useFilterState` holds state in `useState`, `patch`
merges, `reset` restores a fresh copy of `defaults`.

**i18n:** none.

**Verification:** `npm test -- src/features/filters/filterUtils.test.ts
src/features/filters/useFilterState.test.tsx` (table-driven: empty needle
matches, inclusive bounds, null bounds, tri-state, toggle add/remove, group
count, reset restores defaults).

**Commit:** `feat(filters): add shared filter types, helpers and state hook`

---

### Task 6 — Shared `FilterSheet` and `FilterBar` chrome

**Files created:** `src/features/filters/FilterSheet.tsx`,
`src/features/filters/FilterSheet.test.tsx`,
`src/features/filters/FilterBar.tsx`,
`src/features/filters/FilterBar.test.tsx`.

**Interfaces**

```ts
export interface FilterSectionSpec {
  id: string
  title: string
  count: number
  children: ReactNode
}

export interface FilterSheetProps {
  open: boolean
  onClose: () => void
  sections: readonly FilterSectionSpec[]
  onClearAll: () => void
}

export interface FilterBarChip {
  id: string
  label: string
  onClear: () => void
}

export interface FilterBarProps {
  children: ReactNode          // quick-bar controls
  chips: readonly FilterBarChip[]
  activeCount: number
  onOpenFilters: () => void
  onClearAll: () => void
  trailing?: ReactNode         // e.g. the Add trade/asset button
}
```

`FilterSheet` renders `Sheet` with title `filters.title`, one
`CollapsibleSection` per spec (showing `count`), and a footer with a text
"Clear all" button and a primary "Done" button that calls `onClose`.
`FilterBar` renders its children, then a horizontally scrollable chips row
(each with `onClear`, plus a trailing "Clear all" text button when
`activeCount > 0`), and a Filters button with a badge showing `activeCount`
when non-zero. `trailing` is pushed to the far end.

**i18n:** `filters.title`, `filters.open`, `filters.clearAll`, `filters.done`,
`filters.activeCount` (`{{count}} active`, plural forms) in both dictionaries.

**Verification:** `npm test -- src/features/filters/FilterSheet.test.tsx
src/features/filters/FilterBar.test.tsx` (sections render and collapse; badge
hidden at 0 and shows the count; chip remove and Clear all callbacks fire).

**Commit:** `feat(filters): add shared filter bar and sheet`

---

### Task 7 — Journal filter module

**Files created:** `src/features/journal/logic/tradeFilters.ts`,
`src/features/journal/logic/tradeFilters.test.ts`.

**Interfaces**

```ts
export type TradeOutcomeFilter = 'all' | 'win' | 'loss' | 'breakeven'
export type TradeDirectionFilter = 'all' | Direction
export type TradeStatusFilter = 'all' | 'open' | 'closed'

export interface TradeFilters {
  search: string
  markets: Market[]
  direction: TradeDirectionFilter
  status: TradeStatusFilter
  tags: string[]
  strategies: string[]
  opened: Range
  closed: Range
  entry: Range
  exit: Range
  size: Range
  leverage: Range
  fees: Range
  netPnl: Range
  rMultiple: Range
  duration: Range            // hold time in ms
  outcome: TradeOutcomeFilter
  hasStop: TriState
  hasTarget: TriState
  hasNotes: TriState
  hasTags: TriState
}

export const DEFAULT_TRADE_FILTERS: TradeFilters
export function filterTrades(rows: readonly TradeRow[], filters: TradeFilters): TradeRow[]
export function tradeTagOptions(trades: readonly Trade[]): string[]
export function tradeStrategyOptions(trades: readonly Trade[]): string[]
export const TRADE_FILTER_GROUPS: readonly FilterGroupDescriptor<TradeFilters>[]
export function buildTradeChips(
  filters: TradeFilters,
  t: Translator,
): FilterChipDescriptor<TradeFilters>[]
```

`filterTrades` applies every active group with AND; within `markets`, `tags` and
`strategies` values combine with OR. Search matches `symbol`, `strategy`,
`notes` and each tag. `closed`/`duration`/`netPnl`/`rMultiple`/`outcome` use
`row.metrics`; a null metric (or null `closedAt`) does not match an active
filter that needs it. `TRADE_FILTER_GROUPS` has one entry per control
(`text`, `market`, `direction`, `status`, `tags`, `strategies`, `dates`,
`priceSize`, `performance`, `outcome`, `presence`). `buildTradeChips` labels
each active value/range using `t` and the shared `describeRange`, reusing
`fields.*`, `markets.*`, `direction.*`, `status.*`.

**i18n:** group labels and chip/value labels reuse existing keys plus
`filters.sections.*`, `filters.outcome.*`, `filters.rMultiple`, `filters.duration`,
`filters.hasStop`, `filters.hasTarget`, `filters.hasNotes`, `filters.hasTags`.

**Verification:** `npm test -- src/features/journal/logic/tradeFilters.test.ts`
(table-driven: each group filters correctly, OR within multi-value, null-metric
exclusion, empty filters pass everything, group count and chips). Protected
`src/calculations/**` untouched.

**Commit:** `feat(journal): add trade filter predicates and groups`

---

### Task 8 — Portfolio filter module

**Files created:** `src/features/portfolio/logic/assetFilters.ts`,
`src/features/portfolio/logic/assetFilters.test.ts`.

**Interfaces**

```ts
export type AssetOutcomeFilter = 'all' | 'gain' | 'loss' | 'breakeven'

export interface AssetRow {
  asset: Asset
  metrics: ReturnType<typeof calculateAssetMetrics>
}

export interface AssetFilters {
  search: string
  markets: Market[]
  quantity: Range
  avgCost: Range
  currentPrice: Range
  value: Range
  pnl: Range
  pnlPercent: Range
  outcome: AssetOutcomeFilter
  hasPrice: TriState
  hasNotes: TriState
}

export const DEFAULT_ASSET_FILTERS: AssetFilters
export function toAssetRows(assets: readonly Asset[]): AssetRow[]
export function filterAssets(rows: readonly AssetRow[], filters: AssetFilters): AssetRow[]
export const ASSET_FILTER_GROUPS: readonly FilterGroupDescriptor<AssetFilters>[]
export function buildAssetChips(
  filters: AssetFilters,
  t: Translator,
): FilterChipDescriptor<AssetFilters>[]
```

`filterAssets` mirrors `filterTrades` semantics. `currentPrice`, `value`, `pnl`,
`pnlPercent` require a non-null value (an asset valued at cost does not match a
`pnl` range unless the range includes 0, and can be isolated with
`hasPrice: 'missing'`). `outcome` uses `metrics.pnl` sign with `gain` > 0,
`loss` < 0, `breakeven` = 0. The Overview page's current local `AssetRow`
interface moves here and is imported by both portfolio pages.

**i18n:** `filters.sections.*` (asset group labels), `filters.quantity`,
`filters.avgCost`, `filters.currentPrice`, `filters.value`, `filters.pnl`,
`filters.pnlPercent`, `filters.hasPrice`, `filters.hasNotes`,
`filters.assetOutcome.*`.

**Verification:** `npm test -- src/features/portfolio/logic/assetFilters.test.ts`
(same coverage; specifically that a price-less asset is excluded by a pnl range
and isolated by `hasPrice: 'missing'`).

**Commit:** `feat(portfolio): add asset filter predicates and groups`

---

### Task 9 — Journal filter UI

**Files created:** `src/features/journal/components/JournalFilterSheet.tsx`,
`src/features/journal/components/JournalFilterSheet.test.tsx`.

**Interface**

```ts
export interface JournalFilterSheetProps {
  open: boolean
  onClose: () => void
  filters: TradeFilters
  onChange: (partial: Partial<TradeFilters>) => void
  onReset: () => void
  tagOptions: readonly string[]
  strategyOptions: readonly string[]
  /** 'stats' hides the status control and the time-range group, which Stats renders inline. */
  variant: 'overview' | 'stats'
}
```

Composes the shared `FilterSheet` with `FilterSectionSpec[]` built from
`TRADE_FILTER_GROUPS` and the primitives: `TextField` for search,
`MultiSelectField` for markets/tags/strategies, `SegmentedControl` for
direction, status and outcome, `DateField` pairs for opened/closed,
`RangeField` for each numeric range, and `SegmentedControl` (Any/Has/Missing)
for the four presence fields. Numeric bounds are computed from the rows the
caller passes in via a `bounds` prop (added to the props above:
`bounds: TradeNumericBounds`), computed by the page with a small exported
`tradeNumericBounds(rows)` helper in `tradeFilters.ts`. Live apply: each control
calls `onChange`.

**i18n:** the `filters.*` keys from Tasks 6–7 are the source of truth; add
`filters.searchPlaceholder`, `filters.triState.any/has/missing`.

**Verification:** `npm test --
src/features/journal/components/JournalFilterSheet.test.tsx` (renders each
section, editing a range calls `onChange` with the new range, Stats variant
hides status).

**Commit:** `feat(journal): add the trade filter sheet`

---

### Task 10 — Portfolio filter UI

**Files created:** `src/features/portfolio/components/PortfolioFilterSheet.tsx`,
`src/features/portfolio/components/PortfolioFilterSheet.test.tsx`.

**Interface**

```ts
export interface PortfolioFilterSheetProps {
  open: boolean
  onClose: () => void
  filters: AssetFilters
  onChange: (partial: Partial<AssetFilters>) => void
  onReset: () => void
  bounds: AssetNumericBounds
}
```

Portfolio equivalent of Task 9 (`assetNumericBounds(rows)` exported from
`assetFilters.ts`). No variant and no status/time-range controls.

**Verification:** `npm test --
src/features/portfolio/components/PortfolioFilterSheet.test.tsx`.

**Commit:** `feat(portfolio): add the asset filter sheet`

---

### Task 11 — Wire Journal Overview

**Files modified:** `src/features/journal/pages/JournalOverviewPage.tsx`,
`src/features/journal/pages/JournalOverviewPage.test.tsx`.

- Replace the local `TradeFilter` state and single market `SelectField` with
  `useFilterState(DEFAULT_TRADE_FILTERS)` and `filterTrades(rows, filters)`.
- Quick bar: `TextField` search, inline market `MultiSelectField`, direction and
  status `SegmentedControl`s, wrapped in `FilterBar` with chips from
  `buildTradeChips` and `activeCount` from `TRADE_FILTER_GROUPS`.
- Render `JournalFilterSheet` (variant `overview`) and the
  `JournalFilterSheet` open state.
- Empty state: when `rows.length === 0` keep the existing first-run
  `EmptyState`; when `rows.length > 0 && filtered.length === 0` show the new
  filtered-empty `EmptyState` with a "Clear all" action (i18n
  `filters.noMatchTitle`, `filters.noMatchDescription`).
- Update the existing market test to drive the new multi-select, and add a test
  that a text/outcome filter narrows the table and that Clear all restores it.

**i18n:** `filters.noMatchTitle`, `filters.noMatchDescription`.

**Verification:** `npm test --
src/features/journal/pages/JournalOverviewPage.test.tsx`.

**Commit:** `feat(journal): filter the overview by every trade field`

---

### Task 12 — Wire Journal Stats

**Files modified:** `src/features/journal/pages/JournalStatsPage.tsx`,
`src/features/journal/pages/JournalStatsPage.test.tsx`.

- Keep the time-range `SegmentedControl` and replace the market `SelectField`
  with the multi-select quick bar wrapped in `FilterBar`.
- Apply `filterTrades(rows, { ...filters, status: 'all' })` before the
  time-range and closed-trade scoping, so filters drive the stats, curve and
  bars (D2). The Stats sheet uses variant `stats` (no status group); the
  time-range control also appears as a sheet section and Clear all resets it to
  `preferences.defaultTimeRange` (D37, D38).
- Update the existing market test for the multi-select; add a test that a
  strategy/outcome filter changes the headline numbers and that Clear all
  restores the default time range.

**Verification:** `npm test --
src/features/journal/pages/JournalStatsPage.test.tsx`.

**Commit:** `feat(journal): filter the stats page by every trade field`

---

### Task 13 — Wire Portfolio Overview

**Files modified:**
`src/features/portfolio/pages/PortfolioOverviewPage.tsx`,
`src/features/portfolio/pages/PortfolioOverviewPage.test.tsx`.

- Import `AssetRow`/`toAssetRows` from `assetFilters.ts`.
- Replace the single market `SelectField` with `useFilterState(DEFAULT_ASSET_FILTERS)`
  + `filterAssets`, wrapped in `FilterBar` with `buildAssetChips`.
- Summary Stat cards (total value, unrealized PnL) recompute from
  `filteredRows` (already the case; keep it).
- Add `PortfolioFilterSheet` and the filtered-empty state.
- Add tests for a value/outcome filter and Clear all.

**Verification:** `npm test --
src/features/portfolio/pages/PortfolioOverviewPage.test.tsx`.

**Commit:** `feat(portfolio): filter the overview by every asset field`

---

### Task 14 — Wire Portfolio Stats

**Files modified:** `src/features/portfolio/pages/PortfolioStatsPage.tsx`,
`src/features/portfolio/pages/PortfolioStatsPage.test.tsx`.

- Replace the market `SelectField` `marketFilter` block with the `FilterBar`
  quick bar and `PortfolioFilterSheet`; feed `filterAssets` output into
  `calculatePortfolioTotals`, `buildAllocation` and the PnL bars.
- Keep the existing empty state when there are no assets; show the
  filtered-empty message when assets exist but none match.
- Add tests for the outcome filter changing totals and for Clear all.

**Verification:** `npm test --
src/features/portfolio/pages/PortfolioStatsPage.test.tsx`.

**Commit:** `feat(portfolio): filter the stats page by every asset field`

---

### Task 15 — Documentation

**Files created:** `src/docs/en/general/filtering.md`.
**Files modified:** `src/docs/en/general/journal.md`,
`src/docs/en/general/portfolio.md`, `src/docs/en/general/markets.md`,
`src/docs/registry.ts`, `src/i18n/en.ts`, `src/i18n/fa.ts`.

- `filtering.md` explains the quick bar vs advanced sheet, live apply, that
  filters are per-page and reset on leave, that filters drive totals/charts,
  multi-value OR, tri-state presence, log vs linear sliders, and the
  filtered-empty state. It explains the _why_ behind those choices.
- `journal.md`, `portfolio.md`, `markets.md` gain a Filtering section (and the
  markets claim that only market can be filtered is corrected).
- Register a new `DOCS` entry: slug `filtering`, `groupKey:
  'docs.groups.features'`, `titleKey: 'docs.items.filtering.title'`,
  `summaryKey: 'docs.items.filtering.summary'`.
- Add `docs.items.filtering.title`/`.summary` to both dictionaries.

**Verification:** `npm test -- src/docs/registry.test.ts` and
`npm test -- src/i18n` (dictionary parity); `npm run typecheck`.

**Commit:** `docs: document trade and asset filtering`

---

### Task 16 — README and AGENTS.md wording

**Files modified:** `README.md`, `AGENTS.md`.

- README Journal and Portfolio table rows mention full filtering beyond market;
  the "Data and storage" paragraph about market filtering is updated.
- AGENTS.md conventions note that the Journal and Portfolio filter modules live
  in `src/features/*/logic/*Filters.ts` and that filter state is page-local.

**Verification:** review only; no test.

**Commit:** `docs: note trade and asset filtering in the README and AGENTS`

---

### Task 17 — Regenerate screenshots

**Files modified:** `screenshots/desktop/journal-overview.png`,
`screenshots/desktop/journal-stats.png`,
`screenshots/desktop/portfolio-stats.png` (and any other capture the script
produces).

Run `npm run screenshots`. Do not hand-edit PNGs (AGENTS.md).

**Verification:** the command exits 0 and the diff only touches
`screenshots/desktop/`.

**Commit:** `chore: regenerate screenshots for filtering`

---

### Task 18 — Final verification

Run in order and confirm all exit 0:

```
npm run typecheck
npm run lint
npm test
```

Confirm no file under `src/calculations/**` changed
(`git diff --name-only main...HEAD -- src/calculations` is empty). No commit for
this task unless a fix is needed.

## Dependencies / ordering

- Tasks 1–4 (primitives) have no dependencies and can be done in any order.
- Tasks 5–6 depend on Task 1 (Checkbox/CollapsibleSection) and Task 2
  (FilterChip); Task 4 is independent of 5–6.
- Tasks 7–8 depend on Task 5.
- Tasks 9–10 depend on Tasks 3, 4, 6, 7, 8.
- Tasks 11–14 depend on 7–10.
- Task 15 depends on 11–14 (documents the shipped behavior).
- Tasks 16–18 come last, 17 after the UI is final.

## Risks + rollback

See the spec's Risks section. Additional implementation risks:

- **Existing page tests** assert `getByLabelText('Market')` on a single
  `SelectField`; Tasks 11–14 must update them when the control becomes a
  multi-select.
- **`RangeField` RTL:** native range inputs follow document direction; wrap the
  slider track in a logical container or set `dir="ltr"` on just the track while
  keeping labels `text-start`, mirroring how charts are wrapped.
- **Screen readers:** sliders need `aria-label` per handle
  (`filters.min`/`filters.max`) and the tri-state controls use
  `SegmentedControl` (already accessible).

Rollback: revert the feature branch; the change is additive UI plus new
modules, with no data migration or protected-file edits.

## Open questions

None.

## Self-review

- Every spec success criterion maps to a task: 1→T1/T2, 2→T9/T10, 3→T6,
  4→T11–T14, 5→T11–T14, 6→T5/T11–T14 (`useFilterState` page-local), 7→T7–T15
  i18n, 8→T7–T10/T15 tests, 9→T18.
- Decision log coverage: D1→T11–T14; D2→T12/T13/T14; D3→T6/T11–T14; D4→T5/T11–T14;
  D5→spec+plan commits; D6–D14→T7/T8/T9/T10; D15–D20→T6/T9–T14; D21→T7/T8;
  D22→T5; D23→T11–T14; D24→T6/T9/T10; D25→T4/T9/T10; D26→T11–T14; D27→T9/T12;
  D28→T7/T8; D29→T5/T6; D30→T15–T17; D31→T1–T10/T11–T14; D32→T9/T10;
  D33→all; D34→filenames; D35→T15; D36→T4/T9/T10; D37/T38→T12.
- Names and signatures are consistent across tasks (`TradeFilters`,
  `AssetFilters`, `FilterGroupDescriptor`, `FilterChipDescriptor`, `Range`,
  `TriState`, `FilterSectionSpec`, `FilterBarChip`, `RangeFieldProps`).
- No task modifies `src/calculations/**`, the schema, repositories or ports.
