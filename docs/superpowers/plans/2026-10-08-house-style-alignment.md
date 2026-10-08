# House-Style Alignment — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-08-house-style-alignment-design.md`
**Status:** Draft
**Date:** 2026-10-08

## Global constraints

Copied from the spec and the house style; every task must respect these.

- Accent ids, exactly: `blue` (default), `teal`, `green`, `orange`, `rose`, `violet`.
- Theme ids, exactly: `light`, `dark`, `oled`. English labels: Light, Dark, OLED.
  Persian labels: روشن، تیره، مشکی.
- Legacy migration, exactly: `purple`→`violet`, `lime`→`green`, `amber`→`orange`,
  `md3-light`→`light`, `md3-dark`→`dark`, `black-night`→`oled`.
- Palette rules, exactly: seeds (blue 255/.21, teal 195/.16, green 145/.19,
  orange 45/.21, rose 15/.21, violet 300/.20); light primary L .4955 ×1.0,
  on-primary 1.0 ×0, primary-container .918 ×.36, on-primary-container .24
  ×1.05, surface-tint .4955 ×1.0, inverse-primary .835 ×.72; dark/OLED primary
  L .74 ×1.0, on-primary .325 ×1.04, primary-container .41 ×1.02,
  on-primary-container .918 ×.36, surface-tint .74 ×1.0, inverse-primary .4955
  ×1.0. Secondary seed chroma ×.28, tertiary hue +60° chroma ×.46, both with
  the existing tone tables. Out-of-gamut colors are clipped by halving the
  chroma until the first in-gamut value — never a boundary search. Neutrals keep
  the base theme's lightness and chroma with the accent hue.
- Status colors (`--app-color-profit/loss/warning/neutral`) are fixed and never
  tinted.
- Copy: `common.unitToggle` en `Switch {{label}} unit (currently {{unit}})`,
  fa `تغییر واحد {{label}} (اکنون {{unit}})`. Theme descriptions: en `Light
  theme` / `Dark theme` / `Pure-black OLED theme for night sessions`, fa `تم
  روشن` / `تم تیره` / `تم مشکی خالص OLED برای سشن‌های شبانه`.
- Never edit `src/calculations/**`. Never commit raw hex in components; theme
  files and the generator own values. `en`/`fa` dictionaries stay in parity.
- Density: 40px desktop controls and rows; 48px under `pointer: coarse`.
- Every task ends with `npm run typecheck && npm run lint && npm test` passing
  (run `npm run format` first on files it touched). Never run `git push`.

---

## Task 1 — Rename theme ids to light/dark/oled with migration

**Files**
- `src/theme/theme.ts`: `ThemeId = 'light' | 'dark' | 'oled'`;
  `THEMES = ['light','dark','oled']`; `DEFAULT_LIGHT_THEME = 'light'`,
  `DEFAULT_DARK_THEME = 'dark'`; `THEME_SURFACE_COLORS` keys map to the same
  hexes (`#fffbfe`, `#1c1b1f`, `#000000`); add
  `export const LEGACY_THEME_MIGRATIONS: Readonly<Record<string, ThemeId>> = {
'md3-light': 'light', 'md3-dark': 'dark', 'black-night': 'oled' }`.
  `readExplicitTheme()` migrates a legacy stored value, writes it back via
  `writeStoredTheme`, and returns it; unknown values still return `null`.
- Rename `src/theme/themes/md3-light.css` → `light.css`, `md3-dark.css` →
  `dark.css`, `black-night.css` → `oled.css`, updating each selector to
  `[data-theme='<id>']`. Color values stay byte-identical.
- `src/styles/global.css`: update the three `@import` paths.
- `scripts/generate-accents.mjs`: read `../src/theme/themes/light.css` and
  `dark.css`; emit selectors `[data-theme='light'|'dark'|'oled']`. Seeds,
  tone tables and `oklchToHex` unchanged in this task.
- Run `npm run accents` and commit the regenerated `src/theme/accents.css`
  (selectors only; palette values unchanged).
- `src/theme/themeInit.ts`: config gains `themeMigrations:
LEGACY_THEME_MIGRATIONS` (import from `./theme.ts`).
- `index.html` pre-paint script: before validation map the stored theme
  through `config.themeMigrations`; the `catch` fallback becomes
  `'dark'`.
- `src/i18n/en.ts` / `src/i18n/fa.ts`: replace the `theme` block with keys
  `light`/`dark`/`oled` and the labels/descriptions from Global constraints.
- Tests: `src/theme/theme.test.ts` (new ids in both `it.each` tables and the
  `THEME_CSS` map, new css paths, migration cases: stored `'md3-dark'` returns
  `'dark'` and is written back), `src/theme/themeInit.test.ts` (stored
  `'black-night'` resolves to `oled`, unknown theme falls back to `dark` under
  a dark OS scheme), `src/theme/ThemeProvider.test.tsx` (default light/dark
  ids), `src/theme/accents.test.ts` (block selectors use `light`/`dark`/`oled`).

**Verification**
- `npm run accents` — second run produces no diff.
- `npm run typecheck && npm run lint && npm test` — all pass.
- `npm run dev` loads; document element gets `data-theme="light"`, `"dark"` or
  `"oled"` (check via devtools).
- `git grep -n "md3-light\|md3-dark\|black-night" -- src index.html` returns
  only the migration maps in `theme.ts` and tests.

**Commit** `refactor(theme): rename themes to light, dark and oled`

---

## Task 2 — Six house accents and house palette generation

**Files**
- `src/theme/accents.ts`:
  `AccentId = 'blue' | 'teal' | 'green' | 'orange' | 'rose' | 'violet'`;
  `ACCENTS` in that order; `DEFAULT_ACCENT = 'blue'`; remove
  `THEME_NATIVE_ACCENT`; add
  `export const LEGACY_ACCENT_MIGRATIONS: Readonly<Record<string, AccentId>> = {
purple: 'violet', lime: 'green', amber: 'orange' }`; `readStoredAccent()`
  migrates legacy stored values, writes them back, and otherwise behaves as
  today (document dataset fallback, then `DEFAULT_ACCENT`).
- `scripts/generate-accents.mjs`: seeds become the six with house chromas;
  `PRIMARY_TONES.dark` becomes `primary .74 1`, `on-primary .325 1.04`,
  `primary-container .41 1.02`, `on-primary-container .918 .36`, `surface-tint
.74 1`, `inverse-primary .4955 1`; `oklchToHex` replaces the binary search
  with `let c = chroma; while (c > 0 && !inGamut(oklchToLinear(L, c, H))) c /= 2`
  (bounded loop) and returns `toHex` of the first in-gamut value. Secondary,
  tertiary and neutral handling stay as they are.
- Run `npm run accents`; `src/theme/accents.css` now has 18 blocks.
- `src/theme/themeInit.ts`: drop `nativeAccent`, add
  `accentMigrations: LEGACY_ACCENT_MIGRATIONS`.
- `index.html`: drop the `nativeAccent` branch; resolve
  `accent = config.accentMigrations[stored] ?? stored`; always set
  `document.documentElement.dataset.accent` (invalid values fall back to
  `config.defaultAccent`); `catch` fallback sets `data-accent="blue"`.
- `src/theme/ThemeProvider.tsx`: `applyTheme` always sets
  `root.dataset.accent = accent`; remove the native-accent import.
- `src/features/settings/pages/ThemesPage.tsx`: remove the native-accent
  import and the conditional `data-accent`; the theme-card preview becomes a
  single `bg-primary` dot (delete the secondary/tertiary dots).
- `src/i18n/en.ts` / `fa.ts`: `accent` keeps only blue/green/orange/rose/teal/
  violet; `themes.accentDescription` drops the Purple sentence and keeps the
  rest (en: `...Blue is the default.`).
- Tests:
  - `src/theme/accents.test.ts`: ids/order/default; migration cases
    (`purple`→`violet`, `lime`→`green`, `amber`→`orange`, unknown→`blue`,
    storage write-back); generator seed ids equal `ACCENTS`; golden primaries
    for all six accents from the house table — light blue `#35639c`, teal
    `#127070`, green `#3c703f`, orange `#924c2b`, rose `#94464e`, violet
    `#7638c0`; dark blue `#7daeec`, teal `#69bbba`, green `#4bc957`, orange
    `#e29572`, rose `#e58f95`, violet `#b49ce1`; every accent has light, dark
    and OLED blocks and OLED keeps pure-black surfaces.
  - `src/theme/themeInit.test.ts`: remove the native-accent test; add legacy
    accent migration before paint.
  - `src/theme/ThemeProvider.test.tsx`: replace the native-accent test with a
    purple→violet migration assertion.

**Verification**
- `npm test -- accents` — golden tests pass. If a documented hex does not
  match, fix the generator until it does; the house table is the spec.
- `npm run accents` — second run produces no diff.
- `npm run typecheck && npm run lint && npm test` — all pass.
- Settings → Themes shows exactly six accent buttons; picking each repaints
  primary/secondary/tertiary and surfaces.

**Commit** `feat(theme): ship the six house accents and derivation rules`

---

## Task 3 — Rebrand the app mark with blue

**Files**
- `scripts/generate-icons.mjs`: `ACCENT = [125, 174, 236, 255]` (`#7daeec`).
- `public/favicon.svg`: stroke and circle fill `#1c1b1f` background with
  `#7daeec` mark (replace the two `#d0bcff` values).
- Run `npm run icons` (regenerates the four PNGs in `public/icons/`).
- Run `npm run icons:native` (regenerates `src-tauri/icons/**`).

**Verification**
- `npm run icons` — second run produces no diff.
- `git status` shows the four `public/icons/*.png` files and the native icon
  set updated.
- Load the dev server; the favicon mark is blue. Native icons are committed.

**Commit** `chore(theme): rebrand the app mark with the blue accent`

---

## Task 4 — 40px desktop floor, 48px coarse-pointer sizing

**Files**
- `src/theme/tokens.css`: `--app-row-h: 2.5rem`; add
  ```css
  @media (pointer: coarse) {
    :root {
      --app-control-h: 3rem;
      --app-row-h: 3rem;
    }
  }
  ```
- `src/ui/components/IconButton.tsx`: the `sm` size uses `size-control
[&>svg]:size-4` (no more `size-9`).
- `src/ui/components/Button.tsx`: `sm` becomes `h-control gap-2 px-4 text-xs`
  (no more `h-9`).

**Verification**
- `git grep -n "h-9\|size-9" -- src/ui` returns nothing.
- `npm run typecheck && npm run lint && npm test` — all pass.
- Dev server at a desktop viewport: rows and buttons measure 40px; using a
  touch emulation (`hasTouch: true`) they measure 48px.

**Commit** `fix(ui): meet the 40px control floor and size for coarse pointers`

---

## Task 5 — Radio-group semantics for segmented pickers

**Files**
- `src/ui/components/SegmentedControl.tsx`:
  - `size` type drops `'xs'`; `variant` type drops `'inline'` (delete both
    class entries).
  - Pill variant container becomes `role="radiogroup"` with the existing
    `aria-label`; buttons become `role="radio"` with `aria-checked={active}`
    (drop `aria-selected`); roving tabindex and arrow/Home/End handling stay.
  - Separated variant: container `role="radiogroup"`; buttons `role="radio"`
    with `aria-checked`; add the same roving tabindex and `onKeyDown` handler
    used by the pill variant (its buttons currently have no arrow support).
- Tests `src/ui/components/SegmentedControl.test.tsx`: query by
  `radiogroup`/`radio`; assert `aria-checked`; delete the `xs`/`inline`
  tests; assert every size class is `h-control`; separated test asserts radio
  roles and arrow-key selection.

**Verification**
- `npm test -- SegmentedControl` — passes.
- `npm run typecheck && npm run lint && npm test` — all pass.
- Journal Stats time range responds to ArrowLeft/ArrowRight and announces
  selection (radio semantics).

**Commit** `fix(ui): use radio-group semantics for segmented pickers`

---

## Task 6 — Single unit toggle in NumberField

**Interfaces**
- New i18n key `common.unitToggle` (en/fa per Global constraints); remove
  `common.unitAria`.
- `NumberField` keeps its props; when exactly two `unitOptions` are given it
  renders a toggle button; with more options it falls back to
  `<SegmentedControl size="sm">`; with none it renders the existing `unit`
  span.

**Files**
- `src/ui/components/NumberField.tsx`:
  - Remove the `SegmentedControl` usage for two options and the
    `variant="inline"`/`size="xs"` call.
  - Field wrapper gets `relative`; the input gets
    `ps-3 pe-[calc(var(--spacing-control)+0.75rem)]` instead of `w-full`
    inside a padded flex row.
  - Toggle button: `absolute inset-y-0 end-0 flex w-control items-center
justify-center rounded-e-app-sm text-xs font-medium text-on-surface-variant
state-layer` with `aria-label` and `title` from
    `t('common.unitToggle', { label, unit: current.label })`, calling
    `onUnitChange(nextOption.value)`; disabled state mirrors the input.
  - Keep the plain `unit` span branch unchanged.
- `src/i18n/en.ts` / `fa.ts`: swap `unitAria` for `unitToggle`.
- `src/i18n/translate.test.ts`: assert the new key in both dictionaries.
- `src/ui/components/NumberField.test.tsx`: replace the tab-click test with a
  click on the toggle button (name `Switch Risk unit (currently %)`) and
  assert `onUnitChange('currency')`; assert the visible button text is `%`.

**Verification**
- `npm test -- NumberField translate` — passes.
- `npm run typecheck && npm run lint && npm test` — all pass.
- Dev server: Position Size fee field shows one trailing unit toggle; tapping
  it switches `%` ↔ currency and clears the value (existing behavior).

**Commit** `feat(ui): replace the unit segmented control with a toggle button`

---

## Task 7 — Table rows are pointer-only

**Files**
- `src/ui/components/DataTable.tsx`: remove `tabIndex` and `onKeyDown` from
  the row; keep `onClick` and the cursor/hover styling; drop
  `focus-visible:bg-on-surface/5`.
- `src/ui/components/DataTable.test.tsx`: delete the Enter/Space and
  in-cell-control keyboard tests; keep the row-click test; assert rows have
  no `tabindex` and that tabbing reaches the row's action button directly.

**Verification**
- `npm test -- DataTable` — passes.
- `npm run typecheck && npm run lint && npm test` — all pass.
- Dev server: clicking a trade row still opens the edit sheet; Tab reaches
  the edit and delete buttons.

**Commit** `fix(ui): make table rows pointer-only with explicit actions`

---

## Task 8 — Contrast fixes and external-link hardening

**Files**
- `src/ui/components/TextField.tsx`, `src/ui/components/TextAreaField.tsx`,
  `src/ui/components/NumberField.tsx`: replace
  `placeholder:text-on-surface-variant/50` with
  `placeholder:text-on-surface-variant`.
- `src/ui/components/MultiSelectField.tsx`: the no-options paragraph keeps
  `text-on-surface-variant` and loses `opacity-50`.
- `src/ui/components/Markdown.tsx`: the anchor renderer adds
  `rel="noopener noreferrer"`.

**Verification**
- `git grep -n "on-surface-variant/50" -- src` returns nothing outside
  intentional cases (none expected).
- `npm run typecheck && npm run lint && npm test` — all pass.
- Dev server: placeholder text is legible in Light, Dark and OLED.

**Commit** `fix(ui): raise placeholder contrast and harden external links`

---

## Task 9 — Chart accessibility and accent-family pie

**Files**
- `src/features/portfolio/pages/PortfolioStatsPage.tsx`:
  - `PIE_COLORS` becomes exactly
    `['var(--md-sys-color-primary)', 'var(--md-sys-color-tertiary)',
'var(--md-sys-color-secondary)', 'var(--md-sys-color-primary-container)',
'var(--md-sys-color-tertiary-container)',
'var(--md-sys-color-secondary-container)']` (profit/warning removed).
  - Each chart wrapper (`div` with `dir="ltr"`) gains `role="img"` and
    `aria-label={t('portfolio.stats.allocation')}` /
    `t('portfolio.stats.pnlByAsset')`.
  - After each chart add a sibling `<table className="sr-only">` inside the
    Card: allocation table caption `portfolio.stats.allocation`, columns
    `portfolio.columns.asset` and `portfolio.columns.value` (formatted
    `formatCurrency`); PnL table caption `portfolio.stats.pnlByAsset`,
    columns `portfolio.columns.asset` and `portfolio.stats.pnl`.
- `src/features/journal/pages/JournalStatsPage.tsx`:
  - Chart wrappers gain `role="img"` and
    `aria-label={t('journal.stats.equityCurve')}` /
    `t('journal.stats.pnlPerTrade')`.
  - Hidden tables: equity caption `journal.stats.equityCurve`, columns
    `journal.columns.opened` (`formatDate(point.t)`) and
    `journal.stats.cumulativePnl` (`formatCurrency(point.equity, currency)`);
    PnL caption `journal.stats.pnlPerTrade`, columns
    `journal.stats.tradeNumber` with `{ index }` and `calc.feesPnl.netPnl`.
  - Hidden tables are siblings of the `role="img"` wrapper, never children.

**Verification**
- `npm run typecheck && npm run lint && npm test` — all pass.
- Dev server: pie colors are accent-family only; placeholder rows are absent
  from the visual layout but present in the accessibility tree (inspect).

**Commit** `fix(a11y): give charts names and hidden data tables`

---

## Task 10 — Docs, design record and changelog

**Files**
- `src/docs/en/general/themes.md`: replace the body with exactly:
  ```markdown
  # Themes

  ## What ships

  - **Light** — soft neutral surfaces for bright environments.
  - **Dark** — the default dark palette for low-light use.
  - **OLED** — pure-black surfaces for night sessions.

  Pick one in Settings → Themes. Until you pick one, the app follows the
  operating system's light or dark setting and reacts when it changes while the
  app is open. OLED is never chosen automatically; pick it yourself. Once you
  pick a theme it is stored locally and always wins. Either way the theme is
  applied before the first paint, so there is no flash of the wrong theme when
  the app opens.

  Older installs migrate automatically: Material Light, Material Dark and Black
  Night become Light, Dark and OLED.

  ## Accent colors

  **Blue** is the default. You can also pick Teal, Green, Orange, Rose or
  Violet. An accent is a complete tonal palette, not a single color: it recolors
  the primary, secondary and tertiary families and tints the surfaces,
  containers, outlines and text with the accent's hue. Light and Dark get the
  full treatment; OLED keeps its pure-black surfaces and only takes the accent
  families, so the OLED theme stays OLED.

  Like the theme, the accent is stored locally and applied before the first
  paint. Removed accents migrate: Purple becomes Violet, Lime becomes Green and
  Amber becomes Orange.

  ## Why it works this way

  - **Color roles, not hex values.** Every component uses Material Design 3 roles
    (`surface-container`, `on-surface-variant`, `outline`, …). Adding a new theme
    means writing one small CSS file, not touching components.
  - **Accents are a curated palette, not a free color picker.** Each preset ships
    tones that keep text and containers readable across light, dark and OLED. A
    free picker can produce a primary that makes `on-primary` text illegible.
  - **Palettes are derived, not hand-picked.** Each accent is one seed hue and
    chroma in OKLCH. Secondary sits at 28% of the seed chroma, tertiary is
    rotated 60 degrees, and every role is generated at a fixed lightness. If the
    result leaves the sRGB gamut the chroma is halved until it fits. Surfaces
    keep the theme's exact lightness and chroma with the accent's hue, which is
    how a single seed stays coherent everywhere without hand-tuning hundreds of
    values.
  - **Semantic colors never change.** Profit, loss and error keep their meaning
    no matter which accent is active.
  - **Density is part of the theme contract.** Spacing and control sizes are
    tokens too, so the 40px controls grow to 48px targets on touch devices
    without a redesign.
  ```
- `src/docs/en/general/design-philosophy.md`: the layout bullet becomes
  `- Layouts stay compact: 40px controls and table rows on desktop, 48px targets on touch devices, 64px top bar. Pages scroll when they need to; long lists and tables scroll inside their own region so the surrounding controls stay put.`
- `README.md` line 31: `...with the sample data and the Dark theme,`.
- `CHANGELOG.md`: insert under `## [Unreleased]`, between `### Added` and
  `### Fixed`:
  ```markdown
  ### Changed

  - **Design aligned with the house style.** Themes are now Light / Dark / OLED
    (`light`/`dark`/`oled`); stored Material Light, Material Dark and Black Night
    choices migrate before the first paint. Accents are now exactly Blue
    (default), Teal, Green, Orange, Rose and Violet — Lime, Amber and Purple are
    removed and stored picks migrate to the nearest accent. Every accent palette
    was regenerated with the house derivation rules, so accent colors shift
    slightly. The app icon mark now uses the blue accent.
  - **Accessibility.** Desktop controls and table rows are 40px and touch targets
    48px; compact buttons and the unit switch were raised to the floor, segmented
    pickers use radio-group semantics, table rows are pointer-only with explicit
    action buttons, charts expose names and hidden data tables, and placeholder
    text meets contrast.
  ```
- `AGENTS.md`:
  - Update the density bullet under `## Conventions` to: `- Density: 40px controls and 40px table rows on desktop, 48px targets under \`pointer: coarse\`, 64px top bar, 48px subtab bar. Sizes live as tokens in \`src/theme/tokens.css\` and are exposed as Tailwind spacing aliases.`
  - Add after the `## Architecture` section, before `## Conventions`:
    ```markdown
    ## Design

    - Palette: skill `design` — six accents, default blue
    - Themes: Light / Dark / OLED; first run follows prefers-color-scheme; OLED opt-in
    - Type: Roboto Variable (Latin) + Vazirmatn Variable (Persian), system fallbacks
    - Approved: 2026-10-08
    ```
- Do not touch `masterplan.md`.

**Verification**
- `npm run format` then `git diff` shows only intended files.
- `npm run format:check` passes.
- `npm test` passes (`dictionaries.test.ts` enforces en/fa parity).
- `git grep -n "Material Light\|Material Dark\|Black Night" -- README.md src/docs` returns nothing.

**Commit** `docs: document the house-style design system`

---

## Task 11 — Local axe accessibility audit

**Files**
- `package.json`: add devDependency `@axe-core/playwright` (run
  `npm install --save-dev @axe-core/playwright`) and script
  `"a11y": "node scripts/a11y.mjs"`.
- `scripts/a11y.mjs` (new), modeled on `scripts/screenshots.mjs`:
  - Constants: `PORT = Number(process.env.A11Y_PORT ?? 5198)`, host
    `127.0.0.1`, reuse the start-server/wait-for-server helpers.
  - Routes: `/calculations/position-size`, `/journal/overview`,
    `/journal/stats`, `/portfolio/overview`, `/portfolio/stats`,
    `/settings/themes`.
  - Contexts: desktop `{ viewport: { width: 1440, height: 900 }, colorScheme:
'dark', reducedMotion: 'reduce' }`; mobile `devices['Pixel 7']` from
    `playwright`. After creating the mobile context, run
    `await page.evaluate(() => matchMedia('(pointer: coarse)').matches)` and
    throw if false, so the coarse-pointer rule is genuinely exercised.
  - Per context: seed sample data once (same flow as `screenshots.mjs`); then
    for each theme `['light','dark','oled']` set the stored theme with
    `page.evaluate(() => localStorage.setItem('clytrade.theme', theme))`, call
    `page.reload()`, and for each route run
    `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()`.
  - Filter violations to `serious` and `critical`; print id, impact and a
    node target; `process.exitCode = 1` if any remain; print
    `0 serious/critical violations` on success.
- `.gitignore` unchanged (`@axe-core/playwright` lands in the lockfile).

**Verification**
- `npm run a11y` — prints `0 serious/critical violations` for all
  route × theme × form-factor combinations.
- `npm run format:check` passes.
- `git status` shows `package.json`, `package-lock.json`,
  `scripts/a11y.mjs` only.

**Commit** `test(a11y): add a local axe audit script`

---

## Task 12 — Regenerate screenshots

**Files**
- `scripts/screenshots.mjs`:
  - init script sets `localStorage.setItem('clytrade.theme', 'dark')`.
  - `journal-stats` prepare clicks `getByRole('radio', { name: 'All' })`.
  - `settings-themes` ready waits for `getByText('Light', { exact: true })`.
- Run `npm run screenshots` (run `npm run screenshots:install` first if
  Chromium is missing); commit the regenerated
  `screenshots/desktop/*.png`.

**Verification**
- Script completes with `Done: 5 screenshots`.
- `git status` shows only the five PNGs and the script changed.
- `npm run format:check` passes.

**Commit** `chore(docs): regenerate screenshots after the design sweep`

---

## Task 13 — Final verification and design self-check

No files unless fixes are needed.

- `npm run typecheck && npm run lint && npm test && npm run format:check && npm run build`
  — all pass.
- `npm run a11y` — zero serious/critical violations.
- `git diff --stat 5978cbe..HEAD -- src/calculations` — empty (5978cbe is the
  approved spec commit that precedes implementation).
- Design self-check against the spec and the house-style list: Bans 1–12 on
  touched screens (pie accent-family, single preview dot, no raw hex, logical
  properties, one family); themes switch without a first-paint flash; no
  `localStorage`-less OLED auto-selection; accessibility floor item by item in
  Light, Dark and OLED; both form factors via the axe run; compare the
  `AGENTS.md` Design record against `src/theme/accents.ts` and
  `src/theme/theme.ts`.
- Present the regenerated screenshots to the user for the visual review (the
  agent cannot render images). Record any visual objections and fix them
  before declaring done.

---

## Dependencies / ordering

1. Task 1 must precede Task 2 (generated selectors and ids).
2. Task 2 must precede Task 3 (icon color) and Task 10 (naming/copy).
3. Task 4 must precede Task 6 (control tokens) and Task 10 (density text).
4. Task 5 must precede Task 6 (NumberField drops `size="xs"`).
5. Tasks 7, 8 and 9 are independent of each other and of 1–6.
6. Task 11 runs after Tasks 4–9 (it audits the final UI); Task 12 runs last
   among the implementation tasks; Task 13 closes the series.

## Risks + rollback

- **Golden palette mismatch:** if the halving clip does not reproduce the
  house hexes, the generator (not the test) must change. Fix in Task 2 before
  proceeding.
- **Pre-paint regression:** a wrong migration map paints the wrong theme
  before hydration. Covered by `themeInit.test.ts` and by running the built
  app with legacy `localStorage` values.
- **Coarse-pointer layout surprise:** 48px controls can overflow dense
  calculator grids; Task 11's mobile pass surfaces it and the fix is a
  layout tweak inside the offending screen.
- **Axe false positives** (for example contrast on chart SVGs): fix genuine
  ones; if an intentional exception is unavoidable it must be recorded in the
  spec's decision log before ignoring it.
- **Rollback:** revert the task commits in reverse order. No IndexedDB
  migration is involved — theme and accent live in `localStorage`, and the
  legacy values remain readable forever.

## Open questions

None.
