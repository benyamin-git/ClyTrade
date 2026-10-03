# Filter UI Refactor — Sheet-Only Filtering — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-03-filter-sheet-only-design.md`
**Status:** Draft
**Date:** 2026-10-03

## Global constraints (from the spec)

- **No change to filter predicate semantics** (`filterTrades`, `filterAssets`,
  ranges, OR/AND, tri-state, outcome). Only where controls live changes.
- Never modify `src/calculations/**`, the schema, Dexie, repositories, backup
  format, or ports.
- No persistence/URL/localStorage of filter state; filters stay page-local and
  reset when the page unmounts.
- **No dormant code**: removed features are deleted, not left unused.
- Every UI string lives in **both** `src/i18n/en.ts` and `src/i18n/fa.ts` with
  identical keys; delete keys that become orphaned.
- TypeScript strict with `noUncheckedIndexedAccess`. Tailwind v4 semantic
  utilities only; logical direction utilities (`ms-`, `me-`, `ps-`, `pe-`,
  `start-`, `end-`) and `rtl:` variants, never physical `left`/`right`. Base CSS
  only inside `@layer base`. No code comments.
- TDD: each task writes/updates the failing test first, watches it fail, then
  implements. Run `npm run typecheck`, `npm run lint`, `npm test` before the
  final task; each task is its own commit.
- Run tests with Node 22 via nvm: prefix shell commands with
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`.

## Deliverable module map

```
src/ui/components/Checkbox.tsx                 (modify, MD3 restyle)
src/ui/components/Checkbox.test.tsx            (modify)
src/ui/components/SegmentedControl.tsx         (modify, fullWidth + wrap)
src/ui/components/SegmentedControl.test.tsx    (modify/add)
src/ui/components/CollapsibleSection.tsx       (modify, autoOpen + count rule)
src/ui/components/CollapsibleSection.test.tsx  (modify)
src/ui/components/RangeField.tsx               (modify, inputs-only)
src/ui/components/RangeField.test.tsx          (modify)
src/ui/components/FilterChip.tsx               (delete)
src/ui/components/FilterChip.test.tsx          (delete)
src/lib/range.ts                               (delete)
src/lib/range.test.ts                          (delete)
src/features/filters/FilterBar.tsx             (modify, slim header)
src/features/filters/FilterBar.test.tsx        (modify)
src/features/filters/FilterSheet.tsx           (modify, collapsed default)
src/features/filters/FilterSheet.test.tsx      (modify)
src/features/filters/filterTypes.ts            (modify, drop FilterChipDescriptor)
src/features/journal/logic/tradeFilters.ts     (modify, drop chip builder)
src/features/journal/logic/tradeFilters.test.ts(modify)
src/features/portfolio/logic/assetFilters.ts   (modify, drop chip builder)
src/features/portfolio/logic/assetFilters.test.ts (modify)
src/features/journal/components/JournalFilterSheet.tsx    (modify: fullWidth, count badges)
src/features/journal/components/JournalFilterSheet.test.tsx (modify)
src/features/portfolio/components/PortfolioFilterSheet.tsx  (modify)
src/features/portfolio/components/PortfolioFilterSheet.test.tsx (modify)
src/features/journal/pages/JournalOverviewPage.tsx (modify)
src/features/journal/pages/JournalStatsPage.tsx    (modify)
src/features/portfolio/pages/PortfolioOverviewPage.tsx (modify)
src/features/portfolio/pages/PortfolioStatsPage.tsx    (modify)
src/features/*/pages/*.test.tsx                    (modify: open sheet first)
src/i18n/en.ts, src/i18n/fa.ts                     (modify, delete orphan keys)
src/docs/en/general/filtering.md, journal.md, portfolio.md, markets.md (modify)
docs/superpowers/specs/2026-10-03-filter-sheet-only-design.md (done)
README.md, AGENTS.md                               (modify)
screenshots/desktop/*.png                          (regenerate)
```

## Tasks

### Task 1 — `Checkbox` MD3 restyle

**Files modified:** `src/ui/components/Checkbox.tsx`,
`src/ui/components/Checkbox.test.tsx`.

Restyle the shared checkbox into the app's MD3 pattern while **keeping the
existing props, the native `checkbox` role, and the accessible label** (so
consumers and tests that select `getByRole('checkbox', { name })` keep working).
Render a visually-hidden native `<input type="checkbox">` plus a 20px rounded
square (`rounded-app-xs`, border `border-outline` when unchecked, `bg-primary`
with a check icon when checked), a `state-layer` hover on the row, and a
comfortable row height. Disabled stays `opacity-50`/`cursor-not-allowed`.

**Verification:** `npm test -- src/ui/components/Checkbox.test.tsx` (toggles and
reports; disabled does not fire; label association by role+name). Then
`npm run typecheck`.

**Commit:** `refactor(ui): restyle checkbox to the app's MD3 pattern`

---

### Task 2 — `SegmentedControl` full-width wrapping

**Files modified:** `src/ui/components/SegmentedControl.tsx`,
`src/ui/components/SegmentedControl.test.tsx`.

Add an optional `fullWidth?: boolean` prop (default `false`). When true, the
`tablist` container becomes `w-full` with `flex-wrap` and each option grows so
options flow onto multiple rows instead of breaking mid-word; pill shape and
sizes are unchanged. Default behavior is unchanged.

**Verification:** `npm test -- src/ui/components/SegmentedControl.test.tsx`
(options render, selection works; fullWidth container gets the wrap classes).
Then `npm run typecheck`.

**Commit:** `refactor(ui): let segmented control wrap when full width`

---

### Task 3 — `CollapsibleSection` auto-open + count badge rule

**Files modified:** `src/ui/components/CollapsibleSection.tsx`,
`src/ui/components/CollapsibleSection.test.tsx`.

Keep `defaultOpen` (default stays `true` so the primitive is not silently
flipped for future callers), and add `autoOpen?: boolean` (default `false`).
When `autoOpen` is true the section starts open; the user's toggle is respected
afterwards for the component's lifetime. Additionally, render the count badge
**only when `count !== undefined && count > 0`** (currently renders `0` too).

**Verification:** `npm test -- src/ui/components/CollapsibleSection.test.tsx`
(collapsed by default when `defaultOpen={false}`; autoOpen starts open;
toggling works; count badge hidden at 0 and shown when > 0). Then
`npm run typecheck`.

**Commit:** `refactor(ui): add section auto-open and hide empty count badge`

---

### Task 4 — `RangeField` inputs-only; delete `lib/range.ts`

**Files modified:** `src/ui/components/RangeField.tsx`,
`src/ui/components/RangeField.test.tsx`.
**Files deleted:** `src/lib/range.ts`, `src/lib/range.test.ts`.

Remove the dual slider track/handles, the domain/position math, the min/max
positional readout, the `scale` prop, the `RangeScale` import, and the
remount-key (`minKey`/`maxKey`/`emittedMin`/`emittedMax`) workaround. Render the
field label plus two `NumberField`s (Min/Max) side by side; blank = `null`
(unbounded); typed values not clamped. Keep the `hint` behavior and the
degenerate-disabled+note behavior (disable inputs when `max <= min`, show
`hint`). Delete `src/lib/range.ts` and its test (no other consumer).

**Verification:** `npm test -- src/ui/components/RangeField.test.tsx
src/lib` — the RangeField tests must assert two number inputs, blank→null,
typed values preserved, and degenerate disabled; confirm `src/lib/range.test.ts`
is gone and nothing imports `lib/range`. Then `npm run typecheck` and
`npm run lint`.

**Commit:** `refactor(ui): make range field two number inputs and drop scale math`

---

### Task 5 — `FilterSheet` collapsed default + count semantics

**Files modified:** `src/features/filters/FilterSheet.tsx`,
`src/features/filters/FilterSheet.test.tsx`.

`FilterSheet` passes `defaultOpen={false}` and `autoOpen={section.count > 0}` to
each `CollapsibleSection`. `FilterSectionSpec.count` keeps its name but is
documented as "active values in this section" (feature sheets already compute a
per-section active count; Task 9 centralizes it). Ensure the section count badge
now reflects the Task 3 rule (only > 0).

**Verification:** `npm test -- src/features/filters/FilterSheet.test.tsx`
(sections render collapsed by default; a section with count > 0 starts open;
count badge hidden at 0). Then `npm run typecheck`.

**Commit:** `refactor(filters): collapse sheet sections by default`

---

### Task 6 — `FilterBar` slim page header

**Files modified:** `src/features/filters/FilterBar.tsx`,
`src/features/filters/FilterBar.test.tsx`.
**Files deleted:** `src/ui/components/FilterChip.tsx`,
`src/ui/components/FilterChip.test.tsx`.

Change `FilterBarProps` to `{ activeCount, onOpenFilters, trailing?, leading? }`
(drop `children`, `chips`, `onClearAll`). Render one row: optional `leading`,
the outlined `SlidersHorizontal` Filters button (label `filters.open`, badge and
`aria-label` count when `activeCount > 0`), a flex spacer, then `trailing`. Add
`leading` so Journal Stats can place its inline time-range control before the
button (D9). Delete `FilterChip` and its test.

**Verification:** `npm test -- src/features/filters/FilterBar.test.tsx` (button
renders; badge hidden at 0, shows count; `onOpenFilters` fires; `trailing` and
`leading` render). Confirm no imports of `FilterChip` remain. Then
`npm run typecheck`.

**Commit:** `refactor(filters): turn filter bar into a slim page header`

---

### Task 7 — Remove chip builders and chip types

**Files modified:** `src/features/journal/logic/tradeFilters.ts`,
`src/features/journal/logic/tradeFilters.test.ts`,
`src/features/portfolio/logic/assetFilters.ts`,
`src/features/portfolio/logic/assetFilters.test.ts`,
`src/features/filters/filterTypes.ts`.

Remove `buildTradeChips`, `buildAssetChips`, their private helpers used only by
them (`presenceChip`, etc. — keep any still used by other functions), and the
`FilterChipDescriptor` type (if now unused). `Translator` imports that were only
needed by the builders are removed. Update the tests to drop chip coverage.
Predicate behavior (`filterTrades`/`filterAssets`, `TRADE_FILTER_GROUPS`,
`ASSET_FILTER_GROUPS`, `activeGroupCount`) is untouched.

**Verification:** `npm test -- src/features/journal/logic/tradeFilters.test.ts
src/features/portfolio/logic/assetFilters.test.ts` (all predicate/group tests
pass; no `buildTradeChips`/`buildAssetChips`/`FilterChipDescriptor` references).
Then `npm run typecheck`.

**Commit:** `refactor(filters): remove chip builders and chip type`

---

### Task 8 — Feature sheets use full-width segmented controls

**Files modified:** `src/features/journal/components/JournalFilterSheet.tsx`,
`src/features/journal/components/JournalFilterSheet.test.tsx`,
`src/features/portfolio/components/PortfolioFilterSheet.tsx`,
`src/features/portfolio/components/PortfolioFilterSheet.test.tsx`.

Pass `fullWidth` to the outcome (and direction/status/time-range) segmented
controls so the four outcome labels wrap onto rows without mid-word breaks. Swap
each `RangeField` call to the inputs-only form (remove `scale` props and the now
unused imports). Keep section ids/labels from the group descriptors and keep the
per-section active count. No predicate change.

**Verification:** `npm test --
src/features/journal/components/JournalFilterSheet.test.tsx
src/features/portfolio/components/PortfolioFilterSheet.test.tsx` (each section
renders collapsed by default; an active section starts open; outcome segmented
gets full width; a typed range reports through `onChange`). Then
`npm run typecheck`.

**Commit:** `refactor(filters): full-width segmented controls and input ranges in sheets`

---

### Task 9 — Centralize per-section active count

**Files modified:** `src/features/filters/filterUtils.ts`,
`src/features/filters/filterUtils.test.ts`,
`src/features/journal/components/JournalFilterSheet.tsx`,
`src/features/portfolio/components/PortfolioFilterSheet.tsx`.

Extract the duplicated `countRange`/`countTriState` helpers and a generic
`sectionCount` mechanism into `src/features/filters/filterUtils.ts` so both
feature sheets share it. `FilterSectionSpec.count` is produced from
`FilterGroupDescriptor` activity via this shared helper. Behavior identical;
this removes the verbatim duplication noted in earlier reviews.

**Verification:** `npm test -- src/features/filters/filterUtils.test.ts
src/features/journal/components/JournalFilterSheet.test.tsx
src/features/portfolio/components/PortfolioFilterSheet.test.tsx`. Then
`npm run typecheck` and `npm run lint`.

**Commit:** `refactor(filters): share the per-section active count`

---

### Task 10 — Wire Journal Overview

**Files modified:** `src/features/journal/pages/JournalOverviewPage.tsx`,
`src/features/journal/pages/JournalOverviewPage.test.tsx`.

Remove the inline search `TextField`, market `MultiSelectField`, and the
direction/status `SegmentedControl`s from the page. Render `FilterBar` with
`activeCount` (unchanged `activeGroupCount` + time-range rule only where
applicable — none here), `onOpenFilters`, and `trailing` = trade count + Add
trade. Drop the `chips`/`buildTradeChips` memo. Keep `useFilterState`,
`filterTrades`, the sheet, and the filtered-empty state (with Clear all).
Update the test to open the sheet (`getByRole('button', { name: 'Filters' })`)
before driving search/market; keep the narrowing + Clear all assertions.

**Verification:** `npm test --
src/features/journal/pages/JournalOverviewPage.test.tsx`. Then
`npm run typecheck`.

**Commit:** `refactor(journal): move overview filters into the sheet`

---

### Task 11 — Wire Journal Stats

**Files modified:** `src/features/journal/pages/JournalStatsPage.tsx`,
`src/features/journal/pages/JournalStatsPage.test.tsx`.

Remove the market `MultiSelectField` from the page; keep the inline time-range
`SegmentedControl` as `FilterBar`'s `leading`. Render `FilterBar` with
`activeCount` (`activeGroupCount` + 1 when the range is non-default),
`onOpenFilters`, and `trailing` = closed/open count. Drop the `chips` memo. The
sheet (variant `stats`, with the time-range section) is unchanged in behavior.
Update the test to open the sheet before driving the market/outcome filters;
keep the headline-change and Clear-all assertions.

**Verification:** `npm test --
src/features/journal/pages/JournalStatsPage.test.tsx`. Then
`npm run typecheck`.

**Commit:** `refactor(journal): move stats filters into the sheet`

---

### Task 12 — Wire Portfolio Overview

**Files modified:**
`src/features/portfolio/pages/PortfolioOverviewPage.tsx`,
`src/features/portfolio/pages/PortfolioOverviewPage.test.tsx`.

Remove the inline search and market `MultiSelectField`; render `FilterBar` with
`activeCount`, `onOpenFilters`, and `trailing` = Add asset. Drop the `chips`
memo. Keep `useFilterState`, `filterAssets`, summary Stat cards from
`filteredRows`, the sheet, and the filtered-empty state. Update the test to open
the sheet before driving search/market/outcome; keep the market scoping, totals,
and Clear-all assertions.

**Verification:** `npm test --
src/features/portfolio/pages/PortfolioOverviewPage.test.tsx`. Then
`npm run typecheck`.

**Commit:** `refactor(portfolio): move overview filters into the sheet`

---

### Task 13 — Wire Portfolio Stats

**Files modified:**
`src/features/portfolio/pages/PortfolioStatsPage.tsx`,
`src/features/portfolio/pages/PortfolioStatsPage.test.tsx`.

Remove the inline search and market `MultiSelectField`; render `FilterBar` with
`activeCount` and `onOpenFilters` (no trailing). Drop the `chips` memo. Keep
`filterAssets` feeding totals/allocation/PnL bars, the no-assets empty state,
the filtered-empty state, and the sheet. Update the test to open the sheet
before driving filters; keep the outcome-totals and Clear-all assertions.

**Verification:** `npm test --
src/features/portfolio/pages/PortfolioStatsPage.test.tsx`. Then
`npm run typecheck`.

**Commit:** `refactor(portfolio): move stats filters into the sheet`

---

### Task 14 — i18n cleanup

**Files modified:** `src/i18n/en.ts`, `src/i18n/fa.ts`.

Delete keys orphaned by the refactor (`filters.remove` once `FilterChip` is
gone; any others confirmed unused by grep), keeping both dictionaries in
lockstep. Keep `filters.open`, `filters.title`, `filters.done`,
`filters.clearAll`, `filters.activeCount`, the section/outcome/tri-state keys,
and the range keys. Confirm `activeCount` plural keys remain used by the header.

**Verification:** `npm test -- src/i18n` (dictionary parity) and a grep proving
no deleted key is referenced. Then `npm run typecheck`.

**Commit:** `chore(i18n): drop filter keys orphaned by the sheet-only refactor`

---

### Task 15 — Documentation

**Files modified:** `src/docs/en/general/filtering.md`,
`src/docs/en/general/journal.md`, `src/docs/en/general/portfolio.md`,
`src/docs/en/general/markets.md`.

Rewrite the filtering docs to describe the sheet-only UX: filters live in the
sheet opened from the Filters button; the button badge shows the number of
active filter groups; sections start collapsed and auto-open when active;
filters drive tables/charts/totals; page-local reset; OR-within/AND-across;
tri-state presence; number-input ranges (no sliders); the filtered-empty state —
with the _why_. Correct any remaining quick-bar/chips references. Registry
title/summary keys stay as-is.

**Verification:** `npm test -- src/docs/registry.test.ts` and `npm test --
src/i18n`; `npm run typecheck`.

**Commit:** `docs: describe the sheet-only filtering UX`

---

### Task 16 — README and AGENTS.md wording

**Files modified:** `README.md`, `AGENTS.md`.

Update README Journal/Portfolio rows and the filtering paragraph to describe the
sheet-only UX (Filters button + badge; all controls in the sheet). Update the
AGENTS.md filtering convention note accordingly (page shows a Filters button;
filter state page-local; chips/quick bar removed).

**Verification:** review only; run `npm run typecheck` and `npm run lint`;
confirm `git diff --stat` touches only `README.md` and `AGENTS.md`.

**Commit:** `docs: note the sheet-only filter UX in the README and AGENTS`

---

### Task 17 — Regenerate screenshots

**Files modified:** `screenshots/desktop/*.png`.

Run `npm run screenshots`. Do not hand-edit PNGs. The script exits 0 and the
diff only touches `screenshots/`.

**Verification:** command exits 0; `git status` shows changes only under
`screenshots/`.

**Commit:** `chore: regenerate screenshots for the sheet-only filters`

---

### Task 18 — Final verification

Run in order and confirm all exit 0:

```
npm run typecheck
npm run lint
npm test
```

Confirm no file under `src/calculations/**` changed
(`git diff --name-only <baseline>...HEAD -- src/calculations` is empty) and that
the deleted files (`src/lib/range.ts`, `src/ui/components/FilterChip.tsx` and
their tests) no longer exist and are unreferenced. No commit unless a fix is
needed.

## Dependencies / ordering

- Tasks 1–4 (primitives) are independent of each other and of 5–9.
- Task 5 depends on Task 3 (auto-open + count rule).
- Task 6 depends on Task 2 (fullWidth is used by Task 8, not 6) and is
  independent of 1–5.
- Task 7 depends on Task 6 (FilterChip deleted there).
- Task 8 depends on Tasks 2 and 4.
- Task 9 depends on Task 5.
- Tasks 10–13 depend on 5–9.
- Tasks 14–17 come last; 15 depends on 10–13 (documents shipped behavior); 17
  after the UI is final.

## Risks + rollback

See the spec's Risks + rollback. Additional implementation risks:

- **Page tests** drive inline controls today; Tasks 10–13 must open the sheet
  first (`getByRole('button', { name: 'Filters' })`). A test that still queries
  the removed inline control fails fast, which is the intended signal.
- **`RangeField` `scale` removal** touches every call site; the plan removes the
  prop at all sites in the same task it changes the component contract is used
  (Task 4 changes the component; Task 8 updates feature sheets — if typecheck
  fails between them, Task 8 is the fix).
- **`CollapsibleSection.defaultOpen`** stays `true` so no unrelated future use
  flips; only `FilterSheet` opts into collapsed.

Rollback: revert the refactor commits; predicates and state are untouched, so
the previous quick-bar UX returns with no data migration.

## Open questions

None.

## Self-review

- Every spec success criterion maps to a task: 1→T6/T10–13; 2→T5/T8/T10–13;
  3→T3/T5/T8; 4→T1/T2/T3/T4 (single task each); 5→T6/T7/T14 (badge keeps
  group count) + T9; 6→T14 (i18n) + T18; 7→T4/T6/T7 (deletions); 8→T15–T17.
- Decisions map: D1/D2→T6/T10–13; D3→T10–13 (kept); D4→T4/T8; D5→T3/T5;
  D6→T2/T8; D7→T1; D8→T6; D9→T6/T11; D10→T14–17; D11/D12→spec; D13→T4/T6/T7;
  D14→T14; D15→T3/T5/T9; D16→T10–13 (badge rule unchanged).
- No task modifies `src/calculations/**`, schema, repositories or ports.
- Names consistent across tasks: `FilterBarProps`, `FilterSectionSpec.count`,
  `fullWidth`, `autoOpen`, `RangeField` (name kept).
