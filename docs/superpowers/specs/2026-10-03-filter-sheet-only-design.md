# Filter UI Refactor — Sheet-Only Filtering — Design Spec

**Status:** Approved
**Date:** 2026-10-03

## Objective / why

The filtering feature shipped on 2026-10-02 put a persistent quick bar (search,
market multi-select, segmented controls), a row of removable filter chips, and a
Filters button on every page. On the real screens this reads as heavy and
off-brand: it competes with the table and charts for vertical space, the market
checkboxes look like a generic web widget, the sliders are hard to use, the
outcome options wrap, and every section of the sheet opens at once. The feature
works, but its surface is too loud for a dense trading tool.

This change moves **all** filter controls into the filter sheet and removes the
quick bar and chips from the page, then fixes the four concrete defects the user
hit. The result: pages show only a compact Filters button (with an active-count
badge) plus their existing trailing actions, and the sheet is the single, tidy
home for every filter.

This spec **supersedes** parts of
`docs/superpowers/specs/2026-10-02-trade-asset-filtering-design.md`
(see Decision log, D11/D12).

## Success criteria / definition of done

1. No page renders filter controls inline. Each of the four pages
   (Journal Overview, Journal Stats, Portfolio Overview, Portfolio Stats) shows
   only a Filters button with an active-count badge, plus its existing trailing
   content (Journal: trade count + Add trade; Portfolio Overview: Add asset;
   Journal Stats: time-range control + closed/open count; Portfolio Stats:
   nothing extra).
2. The Filters button opens the sheet, which contains every filter control for
   that page (the Journal Stats sheet also contains the time-range section).
3. All sheet sections start collapsed. A section that has an active filter
   auto-opens the first time the sheet is opened after the page mounts; after
   that the user's collapse/expand choices are respected until the page is left.
4. The four reported defects are fixed:
   - outcome options no longer wrap mid-word;
   - range filters are two Min/Max number inputs, with no slider;
   - market selection uses an MD3-styled checkbox, not a raw native one;
   - sections default to collapsed (criterion 3).
5. The Filters badge still counts active filter groups (plus the time range on
   Journal Stats) and the filtered-empty state still offers Clear all.
6. All new/changed UI text exists in both `en.ts` and `fa.ts` with identical
   keys; `npm run typecheck`, `npm run lint` and `npm test` pass.
7. No dormant code remains: the quick bar, chips, the `FilterChip` primitive,
   the chip builders, the slider and the `lib/range.ts` scale math are removed,
   not left unused.
8. Docs, README, AGENTS.md and screenshots reflect the sheet-only UX.

## Scope

### In scope

- Remove the quick bar and chips from all four pages; pages show Filters button
  + badge + trailing only.
- Repurpose `FilterBar` into the slim page header.
- Delete now-unused: `FilterChip`, `buildTradeChips`/`buildAssetChips`,
  `FilterChipDescriptor` (if unused), the slider markup in `RangeField`, and
  `src/lib/range.ts` + its test.
- `RangeField` becomes inputs-only (two `NumberField`s), keeping its name.
- `SegmentedControl`: full-width wrapping pills.
- Shared `Checkbox`: MD3 restyle.
- `CollapsibleSection`/`FilterSheet`: collapsed-by-default + auto-open-when-active
  on first open.
- `FilterSectionSpec.count` semantics: counts active values in the section
  (drives both the badge-per-section and auto-open).
- Tests, i18n, docs, README, AGENTS.md, screenshots.

### Non-goals (explicitly out)

- No change to the filter **predicate** semantics (`filterTrades`,
  `filterAssets`, ranges, OR/AND, tri-state, outcome): a filter that was active
  behaves identically; only where its control lives changes.
- No change to filter state model, page-local reset, or the badge's
  group-count rule.
- No change to `src/calculations/**`, the schema, Dexie, repositories, backup
  format, or ports.
- No saved presets, URL/localStorage persistence, sorting, grouping, or export.
- No redesign of non-filter components beyond the shared `Checkbox` and
  `SegmentedControl` changes explicitly decided here.

## Decision log

| # | Decision | Rationale | Status | Source |
| --- | --- | --- | --- | --- |
| D1 | Remove the quick bar from all four pages; the page shows only Filters button + active-count badge + existing trailing content. | User wants uncluttered pages; every filter lives in the sheet. | decided | user |
| D2 | Remove active-filter chips from the page. Active state is the Filters badge only; the sheet shows per-section counts. | User chose badge-only feedback. | decided | user |
| D3 | Keep the Clear all action in the filtered-empty state. | Unchanged, still useful. | decided | user |
| D4 | Delete `src/lib/range.ts` + test; strip sliders from `RangeField`; keep the name `RangeField` and render two Min/Max `NumberField`s side by side. | No other consumer of the scale math; typed inputs are enough. | decided | user |
| D5 | All sheet sections start collapsed. A section with an active filter auto-opens the first time the sheet opens after mount; the user's collapse/expand is respected thereafter until the page is left. | Sections were opening all at once; auto-open surfaces active filters once. | decided | user |
| D6 | Fix outcome wrapping by making `SegmentedControl` full-width with `flex-wrap` and pill options, so options flow to a second row without mid-word breaks. | Four outcome labels cannot fit one row at sheet width. | decided | user |
| D7 | Restyle the shared `Checkbox` primitive to MD3 (rounded square, primary fill when checked, hover state-layer, comfortable row). | The raw native checkbox looked generic. | decided | user |
| D8 | Repurpose `FilterBar` into the slim page header (Filters button + badge + `trailing`); drop `children`, `chips`, `onClearAll`. | One consistent header for all four pages. | decided | user |
| D9 | Journal Stats keeps its 7D/30D/90D/YTD/All time-range control inline next to the Filters button; all other Journal filters move to the sheet. Portfolio Stats shows only Filters + badge. | Time range is a frequent control, and it already appears in the Stats sheet. | decided | user |
| D10 | Full supporting work: tests, i18n (en+fa), docs, README, AGENTS.md, regenerated screenshots. | Keeps product docs and committed assets in sync. | decided | user |
| D11 | Write a new spec (this file) that explicitly supersedes the 2026-10-02 spec's D3/D15/D32. | Auditable trail for reversing shipped decisions. | decided | user |
| D12 | Superseded: the 2026-10-02 spec's **D3** (quick bar + sheet + chips), **D15** (quick bar holds search/market/status/direction), **D32** (quick bar is a shortcut; sheet canonical), and success criteria **1** and **3**. Surviving and unchanged: D2 (filters drive totals/charts), D4 (page-local reset), D16 (range filters), D19 (combined search), D20 (live apply; footer Clear all/Done), D24 (grouped collapsible sections with a count), D29 (badge counts groups), D37/D38 (Stats time-range in sheet and reset). | Only the quick-bar/chip decisions conflict with the new UX. | decided | user |
| D13 | Delete, rather than keep dormant: `FilterChip` primitive + test, `buildTradeChips`/`buildAssetChips`, `FilterChipDescriptor` if unused, the slider code, and `lib/range.ts`. | User: "no useless dormant code shall remain." | decided | user |
| D14 | The Filters button keeps its accessible name from `filters.open` and includes the active count in its `aria-label` when non-zero; `filters.remove` and any key used only by removed code are deleted from both dictionaries. | No orphaned i18n keys. | decided | user |
| D15 | `FilterSectionSpec.count` means "number of active values in this section" (a tri-state that is not `any` counts 1; each selected market/tag/strategy counts 1; each bounded range end counts 1). It drives the per-section badge and the auto-open test (`count > 0`). | One number serves both the badge and auto-open. | assumed | recommendation |
| D16 | Keep `activeGroupCount` for the page-level badge (unchanged rule: one per active group; +1 on Journal Stats for a non-default time range). | Preserves the approved badge semantics (D29). | assumed | recommendation |

## Architecture

### Page header

`FilterBar` loses `children`, `chips`, `onClearAll` and becomes:

```ts
export interface FilterBarProps {
  activeCount: number
  onOpenFilters: () => void
  trailing?: ReactNode
}
```

It renders one row: a `Button` (outlined, `SlidersHorizontal` icon) labelled
`filters.open`, with the count badge when `activeCount > 0` and an `aria-label`
that appends the count, then a flex spacer, then `trailing`. Pages pass:

- Journal Overview: `trailing` = trade count + Add trade.
- Journal Stats: inline `SegmentedControl` (time range) as the first child of
  the row — i.e. the page composes the time-range control and the `FilterBar`
  in one flex row, or `FilterBar` gains a small `leading?: ReactNode`; the plan
  fixes the exact shape.
- Portfolio Overview: `trailing` = Add asset.
- Portfolio Stats: no `trailing`.

### Sheet

`FilterSheet` passes `defaultOpen={false}` and an `autoOpen` flag to each
`CollapsibleSection`. `CollapsibleSection` gains an `autoOpen` behavior: on the
first time it becomes visible (sheet open → mount), it starts open if
`autoOpen`; afterwards user toggles are respected for the mount's lifetime.

`FilterSectionSpec.count` is produced by the feature sheets' `sectionCount`
(kept, now central to the UX). The count badge renders only when `count > 0`
(change from rendering `0`), so collapsed sections show a badge only when they
hide an active filter.

### RangeField (inputs-only)

`RangeField` drops the slider track/handles, `effectiveBounds`,
`valueToPosition`/`positionToValue`, the min/max positional readout, and the
remount-key workaround. It renders the field label plus two `NumberField`s
(Min/Max) side by side, blank = unbounded, typed values not clamped. No call
site changes besides the removed slider removing the `scale` prop (and its
imports). `src/lib/range.ts` and `range.test.ts` are deleted.

### Checkbox (MD3)

The shared `Checkbox` keeps its props/role/label (so tests that select by
`checkbox` role and label still work) but renders a custom box: a 20px rounded
square (border when unchecked, `primary` fill with a check icon when checked),
a `state-layer` hover, and a comfortable row height. The native `<input>` stays
for accessibility, visually hidden, with the styled box as its label target.

### SegmentedControl (full-width wrap)

The container gains `flex-wrap` and full-width behavior when a `fullWidth` prop
is set (used by the filter sheet's outcome/status/direction/time-range
controls); options keep pill shape and flow onto additional rows instead of
squeezing labels.

## Risks + rollback

- **Tests coupled to the quick bar.** Page tests currently drive the search box,
  market checkboxes, and time-range on the page. They must first open the sheet.
  Mitigation: each page test opens the sheet and drives the same controls; the
  predicate tests are unchanged.
- **Badge semantics vs chips removal.** Removing chips changes what "active"
  looks like; the badge and per-section counts must agree. Mitigation:
  `activeCount` stays `activeGroupCount(...)`; per-section `count` drives the
  section badges.
- **RangeField removal of `scale`.** Call sites pass `scale="log"`; that prop
  disappears. Mitigation: remove the prop and imports in the same task; no
  behavioral change to typed bounds.
- **Rollback.** Revert the change's commits; predicates and state are untouched,
  so reverting restores the quick-bar UX with no data migration.

## Dependencies / ordering

1. Shared primitives first (`Checkbox` restyle, `SegmentedControl` full-width,
   `CollapsibleSection` auto-open, `RangeField` inputs-only + delete
   `lib/range.ts`), each with tests.
2. `FilterSheet`/`FilterSectionSpec` count/badge changes.
3. `FilterBar` repurpose + delete `FilterChip`/chip builders.
4. Wire the four pages (remove quick bar/chips; keep trailing; open-sheet tests).
5. i18n cleanup (delete orphaned keys) alongside each UI change.
6. Docs, README, AGENTS.md.
7. Regenerate screenshots.

## Open questions

None.
