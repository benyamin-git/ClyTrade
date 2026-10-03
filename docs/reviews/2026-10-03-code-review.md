# ClyTrade — Full Project Code Review

**Source ref:** `b8939eb` (clean worktree at review start)
**Date:** 2026-10-03
**Method:** baseline checks (typecheck/lint/test), a full-mode security audit
(`~/security-audit-skill/clytrade/run-1/`), and 16 per-area review passes
(B1–B16) across the dimensions of correctness, security, architecture,
performance, accessibility, i18n/RTL and tests.

## 1. Baseline results

| Check                  | Result                                                 |
| ---------------------- | ------------------------------------------------------ |
| `npm run typecheck`    | pass (exit 0)                                          |
| `npm run lint`         | pass (exit 0)                                          |
| `npm test`             | pass — 482 tests across 51 files                       |
| `npm run format:check` | **fail — 8 files** (release workflow gate; see CR-026) |

## 2. Executive summary

The app is in good shape for its stage: strict TypeScript, a pure tested
calculation layer, no injection sinks, no secrets, a constrained Tauri
capability set, and 482 passing tests. The review found **no Critical issues**,
**6 High**, **25 Medium**, and roughly **60 Low/Nit** items.

The high-value themes are:

1. **State-source inconsistencies** that silently mislead the user — the
   open/closed trade split (CR-001), the Stats open count (CR-007), the
   portfolio asset count (CR-009), and the never-firing filter auto-open
   (CR-010).
2. **Validation gaps that overwrite or corrupt user data silently** — invalid
   preference input reverting all preferences to defaults (CR-002), unparsed
   repository partial updates (CR-003), the missing Dexie v2 preferences
   backfill (CR-004), and the non-atomic replace import (security NV-1).
3. **Release/tooling hazards** — `format:check` currently fails and blocks the
   release workflow (CR-026), the tag is not checked against the package
   version (CR-020), Pages can publish an unverified build (CR-022), and the
   accent generator under-saturates every palette (CR-025).
4. **Accessibility debt concentrated in shared primitives** — the Sheet has no
   focus management (CR-006), SegmentedControl uses tab semantics it does not
   implement (CR-013), clickable table rows are not keyboard reachable
   (CR-012), and the nav drawer keeps closed content focusable (CR-014).
5. **Documentation drift** including a user-data-risk contradiction about
   Android updates (CR-005).

## 3. Severity-ranked findings

Severity: **High / Medium / Low / Nit**. "NV" marks the unvalidated security
lead. Details follow per area in §4.

| ID     | Sev    | Area            | Dim             | Title                                                                     |
| ------ | ------ | --------------- | --------------- | ------------------------------------------------------------------------- |
| CR-001 | High   | B2 journal      | correctness     | Open/closed source of truth split (exitPrice vs closedAt)                 |
| CR-002 | High   | B5 settings     | correctness     | Out-of-range preference input wipes all preferences to defaults           |
| CR-003 | High   | B8 data         | correctness     | `updateTrade`/`updateAsset` bypass schema parsing                         |
| CR-004 | High   | B8 data         | correctness     | Dexie v2 migration does not backfill preferences `defaultMarket`          |
| CR-005 | High   | B16 docs        | correctness     | Releases doc contradicts Android update data-loss limitation              |
| CR-006 | High   | B9/B5 UI        | a11y            | Sheet modal has no focus trap, initial focus, or restore                  |
| CR-007 | Medium | B2 journal      | correctness     | Stats header open count is always ~0                                      |
| CR-008 | Medium | B2 journal      | i18n            | Tags split on ASCII comma only (Persian comma ignored)                    |
| CR-009 | Medium | B3/B7 portfolio | correctness     | Portfolio totals asset count includes excluded holdings                   |
| CR-010 | Medium | B6 filters      | correctness     | FilterSheet auto-open uses mount-time snapshot (documented behavior dead) |
| CR-011 | Medium | B9/12 UI/lib    | correctness     | NumberField leaves unparseable/Infinity text; ignores external value      |
| CR-012 | Medium | B2/B9 table     | a11y            | Clickable table rows are not keyboard accessible                          |
| CR-013 | Medium | B5/6/9 UI       | a11y            | SegmentedControl uses tablist/tab without the tab contract                |
| CR-014 | Medium | B1 app          | a11y            | Closed nav drawer keeps focusable links; no focus management              |
| CR-015 | Medium | B4 calcs        | correctness     | Fee unit toggle clears a required prefilled value                         |
| CR-016 | Medium | B12 lib         | correctness     | `fromDateInputValue` accepts invalid calendar dates                       |
| CR-017 | Medium | B12 lib         | i18n            | `formatCurrency` hardcodes 2 fraction digits                              |
| CR-018 | Medium | B11 i18n        | correctness     | `setIntlContext` mutates shared state during render                       |
| CR-019 | Medium | B4/B9 perf      | performance     | Eager imports put all calculators + react-markdown in the initial bundle  |
| CR-020 | Medium | B15 CI          | correctness     | Release tag not validated against package version                         |
| CR-021 | Medium | B15 CI          | architecture    | No CI on branch pushes or pull requests                                   |
| CR-022 | Medium | B15 CI          | correctness     | Pages deploy not gated on the checks job                                  |
| CR-023 | Medium | B14 native      | correctness     | Android launcher icons are stale template art                             |
| CR-024 | Medium | B14 native      | security        | Android `allowBackup` not disabled (data eligible for cloud backup)       |
| CR-025 | Medium | B13 scripts     | correctness     | Accent gamut mapping under-saturates every palette                        |
| CR-026 | Medium | B9/B13          | correctness     | `format:check` fails and blocks the release workflow                      |
| CR-027 | Medium | B5 settings     | correctness     | Reset confirmation has no error handling or busy guard                    |
| CR-028 | Medium | B5 settings     | correctness     | `useInstallPrompt` retains a spent `beforeinstallprompt` event            |
| CR-029 | Medium | B16 docs        | correctness     | Data & Backups example shows `schemaVersion: 1`                           |
| CR-030 | Medium | B7/B4 calcs     | correctness     | `marginLeverage` can return a negative liquidation move                   |
| CR-031 | Medium | B8 data         | tests           | Migration/round-trip tests missing (explicit market, preferences)         |
| CR-032 | Low    | B1 app          | correctness     | Tab-root redirect can self-loop with no subtabs                           |
| CR-033 | Low    | B1 app          | a11y            | Drawer never highlights the current non-first subtab                      |
| CR-034 | Low    | B2 journal      | correctness     | No `closed >= opened` validation; duration silently clamps                |
| CR-035 | Low    | B2 journal      | correctness     | Only 4 fields validated; 0 for exit/stop/target gives a generic error     |
| CR-036 | Low    | B2 journal      | a11y            | 36px row action buttons below the touch target                            |
| CR-037 | Low    | B2 journal      | tests           | TradeFormSheet invariants untested                                        |
| CR-038 | Low    | B2 journal      | i18n            | Stats avg/best-worst use `formatCompact` without currency                 |
| CR-039 | Low    | B3 portfolio    | correctness     | Duplicate React keys for same-symbol assets                               |
| CR-040 | Low    | B4 calcs        | a11y            | Liquidation Price direction control has no accessible name                |
| CR-041 | Low    | B4 calcs        | architecture    | `CalculatorDef.docSlug` is dead data                                      |
| CR-042 | Low    | B4 calcs        | a11y            | Calculator results are not announced (no live region)                     |
| CR-043 | Low    | B4 calcs        | a11y            | Inline unit toggle uses a 24px target                                     |
| CR-044 | Low    | B4 calcs        | tests           | Six of seven calculator pages have no test                                |
| CR-045 | Low    | B5 settings     | a11y            | Import-mode SegmentedControl has no accessible name                       |
| CR-046 | Low    | B5 settings     | correctness     | PreferencesGate loads forever if the query errors                         |
| CR-047 | Low    | B5 settings     | tests           | DataControls destructive flows untested                                   |
| CR-048 | Low    | B6 filters      | tests           | FilterSheet auto-open lifecycle untested                                  |
| CR-049 | Low    | B6 filters      | a11y            | Filter toggles render below the control/touch tokens                      |
| CR-050 | Low    | B6 filters      | architecture    | Journal Stats inline time-range conflicts with the sheet-only rule        |
| CR-051 | Low    | B7 calcs        | correctness     | `riskReward` accepts `winRatePercent > 100`                               |
| CR-052 | Low    | B7 calcs        | correctness     | Liquidation price null for a 1x long at price 0                           |
| CR-053 | Low    | B7 calcs        | tests           | Closed predicate diverges between stats and equity curve                  |
| CR-054 | Low    | B7 calcs        | correctness     | `Math.max(...pnls)` can throw on very large journals                      |
| CR-055 | Low    | B8 data         | correctness     | `updatePreferences` silently resets on a corrupt row                      |
| CR-056 | Low    | B8 data         | performance     | `listTrades`/`listAssets` scan and sort the full table                    |
| CR-057 | Nit    | B8 data         | architecture    | `listSettings` is dead code                                               |
| CR-058 | Low    | B9 UI           | correctness     | NumberField is not a controlled component (stale display)                 |
| CR-059 | Low    | B9 UI           | a11y            | Field error text is not associated with its control                       |
| CR-060 | Low    | B9 UI           | a11y            | RangeField group label is not associated                                  |
| CR-061 | Low    | B9 UI           | a11y            | Sheet does not lock background scrolling                                  |
| CR-062 | Low    | B9 UI           | architecture    | Button/IconButton below the 48px touch target                             |
| CR-063 | Low    | B9 UI           | tests           | No tests for Sheet/DataTable                                              |
| CR-064 | Low    | B10 theme       | correctness     | System color-scheme read once and persisted with no change listener       |
| CR-065 | Low    | B10 theme       | correctness     | Pre-paint script does not sync the `theme-color` meta                     |
| CR-066 | Low    | B10 theme       | architecture    | Accent id list duplicated in `index.html`                                 |
| CR-067 | Low    | B10 theme       | a11y            | No `prefers-reduced-motion` / `forced-colors` handling                    |
| CR-068 | Low    | B10 theme       | tests           | Generated accents tested structurally, not by value                       |
| CR-069 | Nit    | B10 theme       | performance     | `applyTheme` forces a synchronous style flush                             |
| CR-070 | Low    | B11 i18n        | architecture    | Global Intl context is not reactive and outlives the provider             |
| CR-071 | Low    | B11 i18n        | i18n            | Currency label untranslated in `src/lib`                                  |
| CR-072 | Nit    | B11 i18n        | correctness     | `detectLocale` uses `startsWith('fa')`                                    |
| CR-073 | Low    | B12 lib         | tests           | Date/range/format helpers largely untested                                |
| CR-074 | Low    | B12 lib         | correctness     | `parseNumberInput` strips all commas                                      |
| CR-075 | Low    | B12 lib         | i18n            | `formatPercent` appends ASCII `%`                                         |
| CR-076 | Low    | B12 lib         | correctness     | `isPlatformId` misses `androideabi`                                       |
| CR-077 | Low    | B12 lib         | tests           | Intl formatter caches not reset between tests                             |
| CR-078 | Nit    | B12 lib         | correctness     | `cn` drops a numeric `0` class                                            |
| CR-079 | Low    | B13 scripts     | architecture    | ESLint does not lint scripts/config files                                 |
| CR-080 | Low    | B13 scripts     | correctness     | `live.sh` prints success without verifying the port                       |
| CR-081 | Low    | B13 scripts     | correctness     | `bump-version.mjs` fails on Windows via `execFileSync('npm')`             |
| CR-082 | Low    | B14 native      | maintainability | `index.html` duplicates the dark-theme mapping                            |
| CR-083 | Low    | B14 native      | a11y            | Android system-bar contrast unset until the bridge call                   |
| CR-084 | Low    | B14 native      | security        | Unused FileProvider declares broad external/cache roots                   |
| CR-085 | Nit    | B14 native      | tests           | Dead template layout and unused native test dependencies                  |
| CR-086 | Low    | B15 CI          | correctness     | Pages concurrency uses `cancel-in-progress: true`                         |
| CR-087 | Low    | B15 CI          | correctness     | Native builds use the floating `stable` Rust channel                      |
| CR-088 | Low    | B15 CI          | performance     | Node setup + `npm ci` duplicated across three jobs                        |
| CR-089 | Low    | B16 docs        | i18n            | Filtering summary advertises the removed quick bar                        |
| CR-090 | Low    | B16 docs        | correctness     | Filtering doc understates search fields                                   |
| CR-091 | Low    | B16 docs        | architecture    | CONTRIBUTING new-locale guide omits the docs registry                     |
| CR-092 | Nit    | B16 docs        | correctness     | AGENTS screenshot output directory is wrong                               |
| CR-093 | Nit    | B16 docs        | correctness     | CONTRIBUTING references a nonexistent `index.html` language list          |

Security lead (from the separate audit): **NV-1** — replace-mode backup import
is non-atomic and can half-replace the database (`needs_validation`, no severity
assigned; see §5).

## 4. Per-area detail

### B1 — App shell + navigation

- **CR-014 (Medium, a11y).** `src/app/shell/NavDrawer.tsx:27` keeps the closed
  drawer mounted with `aria-hidden` while its `NavLink`s (line 54) stay
  focusable, so keyboard/AT users tab into hidden content; there is also no
  focus-in/trap/restore. Fix: render nothing when closed (as `Sheet` does) or
  mark it `inert`, and manage focus like a modal.
- **CR-032 (Low, correctness).** `src/app/router.tsx:10` redirects a tab root to
  `tab.subtabs[0]?.path ?? tab.path`; a tab with no subtabs self-redirects
  indefinitely.
- **CR-033 (Low, a11y).** `src/app/shell/NavDrawer.tsx:55` links to the first
  subtab, so no drawer entry is active while on a sibling subtab. Link to
  `tab.path` or compute active state from `findTab`.

### B2 — Journal feature

- **CR-001 (High, correctness).** `TradeFormSheet.tsx:69` derives `status` from
  `exitPrice` while `closedAt` is stored independently (`:78`); the table
  (`JournalOverviewPage.tsx:95`), status filter (`tradeFilters.ts:91`) and Stats
  (`journalStats.ts`) key off `closedAt`. An exit price without a close date
  therefore shows as Open and is dropped from Stats. Pick one source of truth.
- **CR-007 (Medium, correctness).** `JournalStatsPage.tsx:65` filters to
  `closedAt !== null` before `calculateJournalStats`, so `stats.open`
  (`journalStats.ts:58`) is always ~0. Count open rows from `allRows`.
- **CR-008 (Medium, i18n).** `TradeFormSheet.tsx:82` splits tags on ASCII `,`
  only, so the Persian `،` (per `fa.ts:391`) produces one malformed tag. Split
  on `[,،]`.
- **CR-034 (Low), CR-035 (Low), CR-036 (Low a11y), CR-037 (Low tests),
  CR-038 (Low i18n).** Missing `closed >= opened` validation (`tradeMetrics.ts:93`
  clamps duration to 0); only 4 fields validated so `exitPrice:0` yields the
  generic save error (`TradeFormSheet.tsx:96`); 36px `IconButton` row actions;
  no test for the exit/close invariant; `formatCompact` money stats lack a
  currency marker (`JournalStatsPage.tsx:186`).

### B3 — Portfolio feature

- **CR-009 (Medium, correctness).** `portfolioMetrics.ts:64-71` skips assets
  whose metrics are null but returns `assets: assets.length`, so the Stats count
  exceeds the holdings included in cost/value.
- **CR-039 (Low, correctness).** `PortfolioStatsPage.tsx:187,252` key chart/legend
  cells by `symbol`, which is not unique (same ticker on different markets).
  Key by asset id.

### B4 — Calculations feature

- **CR-015 (Medium, correctness).** `PositionSizePage.tsx:75` derives the fee
  conversion base from `result?.positionNotional ?? null`; toggling the fee unit
  before a notional exists converts against `null` and clears the prefilled fee,
  leaving the calculator stuck empty.
- **CR-019 (Medium, performance).** `src/features/calculations/registry.ts:3`
  statically imports all seven calculators and `tabs.ts:3` imports the registry,
  so every calculator ships in the initial bundle, inconsistent with the
  `lazyPage` pattern used elsewhere. (Related: `HelpButton.tsx:5` statically
  pulls `react-markdown` into the entry chunk, ~744 KB.)
- **CR-040 (Low a11y)** unnamed direction control (`LiquidationPricePage.tsx:57`);
  **CR-041 (Low)** dead `docSlug` (`registry.ts:15`); **CR-042 (Low a11y)** no
  live region for results (`CalculatorLayout.tsx:50`); **CR-043 (Low a11y)** 24px
  inline unit toggle; **CR-044 (Low tests)** six of seven calculators untested.

### B5 — Settings feature

- **CR-002 (High, correctness).** `PreferencesPage.tsx:74` writes `NumberField`
  output on every keystroke (unclamped until blur, `NumberField.tsx:91`); an
  out-of-range intermediate (e.g. leverage `0`) is stored and
  `parsePreferences` (`settings.ts:46`) then returns `DEFAULT_PREFERENCES`,
  silently resetting **all** preferences. Repair fields individually and clamp
  before persisting.
- **CR-027 (Medium, correctness).** `DataControlsPage.tsx:244-247` resets with no
  try/catch and no busy guard.
- **CR-028 (Medium, correctness).** `useInstallPrompt.ts:39-42` keeps the spent
  `beforeinstallprompt` event on dismissal, so a second prompt throws.
- **CR-045 (Low a11y)** unnamed import-mode control (`DataControlsPage.tsx:142`);
  **CR-046 (Low)** PreferencesGate hangs on query error (`SettingsProvider.tsx:28`);
  **CR-047 (Low tests)** no DataControls test.

### B6 — Filters feature

- **CR-010 (Medium, correctness).** `FilterSheet.tsx:24-27` seeds `openSections`
  in a `useState` initializer that runs once at mount (counts are 0 then) and
  never reruns on open, so the documented "active section auto-opens on first
  open" never happens in the app. Seed on the first `false → true` transition.
- **CR-048 (Low tests)** lifecycle auto-open untested; **CR-049 (Low a11y)** filter
  toggles are 36/32px below tokens (`SegmentedControl.tsx:22`,
  `MultiSelectField.tsx:66`); **CR-050 (Low architecture)** the inline
  time-range on Journal Stats conflicts with the AGENTS sheet-only rule
  (`JournalStatsPage.tsx:107`).

### B7 — Calculations core (read-only, no edits made)

- **CR-030 (Medium, correctness).** `marginLeverage.ts:44` returns
  `100 / leverage - maintenanceMarginPercent` with no buffer guard, so a
  maintenance margin above the buffer yields a negative move; the sibling
  `liquidationPrice.ts:36-37` rejects the same condition. Fix requires owner
  permission.
- **CR-051 (Low)** `riskReward.ts:60` accepts `winRatePercent > 100`;
  **CR-052 (Low)** `liquidationPrice.ts:40` returns null for the legitimate 1x
  long at price 0; **CR-053 (Low tests)** closed prediction differs between
  `journalStats.ts:43` (netPnl) and `:95` (closedAt); **CR-054 (Low)**
  `journalStats.ts:80-81` spreads all PnLs into `Math.max/min`, which can throw
  `RangeError` and violates the never-throw rule.

### B8 — Data layer

- **CR-003 (High, correctness).** `trades.repo.ts:21-22` and `assets.repo.ts:21-22`
  write `Partial<Draft>` patches without schema parsing, so `market: undefined`
  (or a `0` currentPrice) persists and bypasses zod defaults. Parse the merged
  patch.
- **CR-004 (High, correctness).** `db.ts:25-29` backfills `market` on trades and
  assets but never rewrites the stored `preferences` row, so a v2 backup can
  omit `defaultMarket`. Backfill the row in the v2 upgrade.
- **CR-031 (Medium, tests)** no test for preserving an explicit v1 `market` or
  the preferences backfill; **CR-055 (Low)** `updatePreferences`
  (`settings.repo.ts:30-32`) can silently reset all prefs on a corrupt row;
  **CR-056 (Low, performance)** full-table scan/sort in `listTrades`/`listAssets`
  (`trades.repo.ts:6`); **CR-057 (Nit)** dead `listSettings`.

### B9 — UI design system

- **CR-006 (High, a11y).** `Sheet.tsx:19,31` declares `aria-modal` but only
  handles Escape: no initial focus, no Tab trap, no focus restore, and the
  background is not inert.
- **CR-011 (Medium, correctness).** `NumberField.tsx:61` returns early on an
  unparseable blur, leaving invalid text displayed (`:56` only resyncs on unit
  change); `format.ts` passes non-finite values through, so blur can render
  `Infinity`.
- **CR-012 (Medium, a11y).** `DataTable.tsx:57` makes rows clickable but not
  keyboard reachable/focusable.
- **CR-013 (Medium, a11y).** `SegmentedControl.tsx:68,84` uses `role=tablist`/
  `role=tab` with no tabpanel, no roving tabindex and no arrow keys.
- **CR-058–CR-063 (Low/Nit).** Not-controlled NumberField; unassociated Field
  error (`Field.tsx:27`); unassociated RangeField label (`RangeField.tsx:70`);
  Sheet background scroll not locked; controls below the 48px touch target;
  no Sheet/DataTable tests.

### B10 — Theme + styles

- **CR-025-adjacent** (generator bug lives in B13).
- **CR-064 (Low, correctness).** `theme.ts:25` reads the OS color scheme once and
  `ThemeProvider.tsx:35` persists it; no `prefers-color-scheme` change listener.
- **CR-065 (Low, correctness).** `index.html:10,28` sets `data-theme` pre-paint
  but not the `theme-color` meta, so light users briefly get dark chrome.
- **CR-066 (Low, architecture).** `index.html:42` hardcodes the accent list — a
  third copy that can drift from `accents.ts`/`generate-accents.mjs`.
- **CR-067 (Low a11y)** no reduced-motion/forced-colors handling
  (`global.css:81`); **CR-068 (Low tests)** accents tested structurally only;
  **CR-069 (Nit, performance)** `ThemeProvider.tsx:24` forces a sync style flush.

### B11 — i18n

- **CR-018 (Medium, correctness).** `I18nProvider.tsx:26` calls
  `setIntlContext` during render, mutating module-level formatter state outside
  React's commit; under concurrent rendering text and numbers can use different
  locales. Move it into the effect.
- **CR-070 (Low)** the global Intl singleton is non-reactive (`intl.ts:8`);
  **CR-071 (Low i18n)** currency labels live in `src/lib` and are untranslated
  (`currency.ts:21`); **CR-072 (Nit)** `detectLocale` uses `startsWith('fa')`.
- Key parity between `en.ts` and `fa.ts` is complete and verified.

### B12 — Library + test setup

- **CR-016 (Medium, correctness).** `dates.ts:63` builds `new Date(`${value}T00:00:00`)`
  without calendar validation, so `2026-02-31` rolls over to March.
- **CR-017 (Medium, i18n).** `format.ts:44` forces `maximumFractionDigits: 2`,
  overriding zero-decimal currencies (JPY/KRW).
- **CR-073–CR-078 (Low/Nit).** Date/range/format helpers largely untested;
  `parseNumberInput` strips all commas (`format.ts:87`); `formatPercent` uses
  ASCII `%`; `isPlatformId` misses `androideabi` (`version.ts:6`); formatter
  caches not reset in tests; `cn` drops a numeric `0`.

### B13 — Scripts + build config

- **CR-026 (Medium, correctness).** `npm run format:check` fails on 8 files
  (verified), and `.github/workflows/release.yml:39` runs it in the `checks` job
  that all build jobs depend on, so every `v*` tag currently fails before
  building. Run `npm run format` and consider ignoring `docs/` review artifacts.
- **CR-025 (Medium, correctness).** `scripts/generate-accents.mjs:127-131` never
  advances the lower chroma bound in `oklchToHex`, so out-of-gamut tones return
  as soon as a halved midpoint fits; simulated output loses 27–50% achievable
  chroma across roles, so all committed palettes are washed out. Use a real
  bisection and add a value test.
- **CR-079 (Low)** ESLint only matches `**/*.{ts,tsx}` (`eslint.config.js:11`),
  so scripts/config are unlinted; **CR-080 (Low)** `live.sh:16,24` prints success
  without verifying the port; **CR-081 (Low)** `bump-version.mjs:19` calls
  `execFileSync('npm', …)`, which fails on Windows.

### B14 — Native shell

- **CR-023 (Medium, correctness).** committed `gen/android` mipmaps are the
  default template art, not the ClyTrade icon, and lack the `anydpi-v26`
  adaptive icon; regenerate with `npm run icons:native`.
- **CR-024 (Medium, security).** `AndroidManifest.xml:8` does not set
  `allowBackup="false"` (nor data-extraction rules), so WebView/IndexedDB trade
  data is eligible for Android cloud backup and device transfer, contradicting
  the local-first promise.
- **CR-082 (Low)** `index.html:30` duplicates the dark-theme mapping
  (`theme !== 'md3-light'`) from `theme.ts:43`; **CR-083 (Low a11y)**
  `MainActivity.kt:11,51` leaves `darkTheme` null until the bridge call;
  **CR-084 (Low, security)** unused FileProvider exposes broad
  external/cache roots (`AndroidManifest.xml:27`, `file_paths.xml:3`);
  **CR-085 (Nit)** dead `activity_main.xml` and unused native test deps.

### B15 — CI

- **CR-020 (Medium, correctness).** `release.yml:156` names the release from
  `github.ref_name` while artifacts come from `package.json`, so a tag pushed
  without `version:set` produces a mismatched release. Add a preflight equality
  check.
- **CR-021 (Medium, architecture).** The only lint/typecheck/test runs live in
  the tag/dispatch release workflow; pushes and PRs are never validated. Add a
  PR/branch CI workflow.
- **CR-022 (Medium, correctness).** Pages (`pages.yml:36`) builds and deploys
  independently of the `checks` job, so a failing build can go live. Gate it.
- **CR-086 (Low)** `pages.yml:16` cancels in-flight deployments; **CR-087 (Low)**
  native jobs use `dtolnay/rust-toolchain@stable` (non-deterministic); **CR-088
  (Low, performance)** `npm ci` duplicated across three jobs.

### B16 — Docs + prose

- **CR-005 (High, correctness).** `src/docs/en/general/releases.md:70` says
  Android updates install in place and keep data, directly contradicting
  `README.md:198` and `TODO.md:32` (in-place updates fail; uninstalling wipes
  data). This misstatement risks user data loss.
- **CR-029 (Medium, correctness).** `data-and-backups.md:18` shows
  `schemaVersion: 1` while the app exports 2 (`backup.ts:11`).
- **CR-089 (Low i18n)** `en.ts:178`/`fa.ts:180` advertise the removed quick bar;
  **CR-090 (Low)** `filtering.md:52` understates search fields; **CR-091 (Low)**
  `CONTRIBUTING.md:32` omits the hardcoded docs registry; **CR-092 (Nit)** AGENTS
  screenshot path; **CR-093 (Nit)** CONTRIBUTING references a nonexistent
  `index.html` language list.

## 5. Security summary

A full-mode security audit was run separately (profile `standard`, 14/30 agent
budget, artifacts in `~/security-audit-skill/clytrade/run-1/`). Coverage: 14
covered + 1 candidate, no deferred/out-of-scope; both skill validators pass.
Bounded local execution was not possible (no OS sandbox), so no finding reached
`confirmed`.

- **NV-1 — Replace-mode backup import is non-atomic and can half-replace the
  database** (`needs_validation`, fingerprint
  `clytrade-data-import-replace-partial-failure`; corroborated by CR-003/CR-004
  and B8). `parseBackup` enforces no primary-key uniqueness and
  `importBackup`'s replace branch runs three independent Dexie transactions via
  `Promise.all`; a duplicate-id `BulkError` can abort one store while the others
  commit. Resolution is a bounded vitest check (blocked only by the missing
  sandbox) or a DevTools observation; see the audit's `NEEDS-VALIDATION.md`.
- **Hardening (no confirmed boundary violation):** `csp: null`
  (`tauri.conf.json:27`); `target="_blank"` without `rel` in Markdown
  (`Markdown.tsx:22`); unbounded import size/cardinality; `settingRowSchema.value:
z.unknown()`; Android release signed with the debug keystore by design; CI
  least-privilege scoping and floating action refs; `.gitignore` missing
  `*.pem`/`*.key`.
- **Positive patterns:** no injection sinks; markdown HTML inert; storage values
  allowlisted; service worker build-generated/same-origin; lockfile pinned with
  integrity; `bump-version.mjs` argv gated and shell-free.

## 6. Coverage statement

Reviewed areas: B1–B16 as listed, at `b8939eb`. Baseline typecheck/lint/test pass
(482 tests). The security audit covered 15 units with a final-clean critic; the
area passes covered every in-scope directory.

Explicit limitations:

- No target code was executed under a sandbox during the security audit, so
  runtime-dependent security behavior is unvalidated (NV-1).
- `src/calculations/**` was reviewed read-only; its fixes need explicit owner
  permission.
- Hosted/deployment facts (GitHub Pages headers, Android release signing,
  branch protection) are outside source.
- Test-coverage numbers were assessed by reading the 51 test files; no coverage
  tool was added (per plan).

Findings awaiting a decision are consolidated in `TODO.md`; all confirmed
findings are planned for fixes in Plan 2 (`docs/superpowers/plans/`).
