# House-Style Alignment — Design Spec

**Status:** Draft
**Date:** 2026-10-08

## Objective / why

ClyTrade's visual system already matches the `design` house style in most places
(density, radii, type family, RTL, status colors, OLED ladder, two of the twelve
bans), but it diverges where it matters most: it ships nine accents instead of
the house six, its generated palettes use different seeds, tone scales and a
gamut-clipping algorithm that the house style explicitly rejects, its themes are
Material-branded rather than Light/Dark/OLED, and several accessibility-floor
items are unmet. This change brings the app fully onto the house style so the
design record in `AGENTS.md` reads true: one system, one palette rulebook, and
no silent exceptions.

## Success criteria / definition of done

1. `ACCENTS` contains exactly blue (default), teal, green, orange, rose, violet;
   `THEME_NATIVE_ACCENT` and the purple/lime/amber entries are gone; Settings →
   Themes offers six accents.
2. `src/theme/accents.css` is regenerated with the house derivation rules and 18
   blocks (6 accents × 3 themes); tests assert the house-documented primaries
   (`blue` light `#35639c`, dark `#7daeec`, etc.) for all six accents.
3. Theme ids are `light`/`dark`/`oled` everywhere (code, CSS, tests, pre-paint
   config); labels read Light/Dark/OLED (en) and روشن/تیره/مشکی (fa); stored
   legacy values migrate before first paint with no wrong-theme flash.
4. `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass,
   and `npm run format:check` stays clean.
5. `npm run a11y` reports zero serious/critical axe violations on the key pages
   in all three themes, desktop and mobile emulation.
6. Touch targets are ≥48px under `pointer: coarse`; desktop controls and table
   rows are 40px; no interactive control is below the floor.
7. Zero ban hits on touched screens: no status colors in the allocation pie, one
   preview dot per theme card, placeholders at full `on-surface-variant`.
8. All four charts expose an accessible name and their numbers in a visually
   hidden table.
9. `themes.md`, `README.md`, `CHANGELOG.md` and the `## Design` record in
   `AGENTS.md` describe the new system; desktop screenshots are regenerated and
   committed.
10. `src/calculations/**` is untouched.

## Scope

### In scope

- House six accents with legacy migration; house palette generation rules.
- Theme rename to `light`/`dark`/`oled` with migration and copy updates.
- Ban-8 fixes (allocation pie, theme preview dot), placeholder contrast.
- Accessibility floor: coarse-pointer sizing, compact-control sizing, DataTable
  row semantics, SegmentedControl picker semantics, chart accessibility, small
  copy/label fixes, `rel="noopener noreferrer"` on external markdown links.
- Favicon and PWA/native icon regeneration with the blue accent.
- The new unit toggle in `NumberField` and removal of the dead `inline`/`xs`
  SegmentedControl surface.
- Documentation, changelog, design record, axe audit script, screenshots.

### Non-goals (explicitly out)

- No layout redesign, new screens, motion work, or interface copy beyond the
  lines listed in the decision log.
- No edits to `masterplan.md` (it records original intent; current behavior is
  documented in `src/docs/en/general/themes.md`).
- No new themes or accents, no free color picker, no theme/accent in backups.
- No type-scale change, no font change, no new i18n locale.
- No CI integration of the axe audit, no mobile screenshots in the README.
- No changes to `src/calculations/**`, the data model, or backup format.

## Decision log

| # | Decision | Rationale | Status | Source |
| --- | --- | --- | --- | --- |
| D1 | Spec + plan written to `docs/superpowers/` and committed | Documents travel with the repo | decided | user |
| D2 | Full alignment across palette, themes, bans, a11y floor, docs, icons, screenshots | The user asked for the design skill's system end to end | decided | user |
| D3 | Accent set is the house six; blue default; lime/amber/purple and `THEME_NATIVE_ACCENT` removed | House style ships exactly six accents | decided | user |
| D4 | Legacy stored values migrate: purple→violet, lime→green, amber→orange, md3-light→light, md3-dark→dark, black-night→oled, applied at read and pre-paint | No user silently loses their choice | decided | user |
| D5 | Palette derivation follows the house rules exactly: seeds (blue 255/.21, teal 195/.16, green 145/.19, orange 45/.21, rose 15/.21, violet 300/.20), house tone factors (dark/OLED primary L .74), clip by halving chroma and keep the first in-gamut value; secondary ×.28, tertiary hue+60° ×.46; neutrals keep base L/C with the accent hue; status colors fixed | The skill states boundary search produces visibly different colors | decided | user |
| D6 | Theme ids `light`/`dark`/`oled`; labels en Light/Dark/OLED, fa روشن/تیره/مشکی; short descriptions; OLED surface ladder unchanged | Coherent with the renamed system; ladder already house-exact | decided | user |
| D7 | Favicon and generated PWA/native icons use the blue primary on the dark surface | Brand matches the default accent | decided | user |
| D8 | `masterplan.md` untouched; `themes.md` rewritten; README caption and CHANGELOG updated; `## Design` record added to `AGENTS.md` | masterplan records original intent; in-app docs describe current behavior | decided | user |
| D9 | `@media (pointer: coarse)` raises control height and row height to 48px; desktop stays 40/40 | Meets the touch floor with one token change | decided | user |
| D10 | IconButton sm becomes 40px; SegmentedControl xs is removed; table rows become 40px desktop / 48px touch | Floor is 40px desktop; a 40px control needs a 40px row | decided | user |
| D11 | The number unit switch becomes one trailing toggle button inside `NumberField` (40/48px, current unit visible, aria "Switch {{label}} unit (currently {{unit}})"); remove the `inline` variant and `xs` size | The 32px segmented cannot reach 40px inside a 40px field | decided | user |
| D12 | DataTable rows drop `tabIndex`/keyboard handling; pointer row-click stays; edit/delete buttons are the accessible path | Clean table semantics without nested-button roles | decided | user |
| D13 | SegmentedControl uses `radiogroup`/`radio` semantics with roving tabindex | It is a single-choice picker, not tabs | decided | user |
| D14 | All four charts get `role="img"`, a summary label, and a visually hidden data table with the same numbers | Nothing is tooltip-only; charts gain accessible names | decided | user |
| D15 | Type scale stays 12/13/14/16/18/20/24 | Existing closed 7-step project system the skill permits; not a departure | decided | user |
| D16 | Allocation pie drops profit/warning and uses accent-family tones (primary/secondary/tertiary + containers) | Ban 8: status colors are not categories | decided | user |
| D17 | Theme cards preview a single primary dot | Ban 8: one accent per screen | decided | user |
| D18 | Placeholder and multi-select empty text use full `on-surface-variant` (no 50% alpha) | 4.5:1 floor | decided | user |
| D19 | `@axe-core/playwright` added; `npm run a11y` runs locally against the existing Playwright Chromium, key pages × three themes, serious/critical | Repeatable floor verification without CI browser cost | decided | user |
| D20 | External markdown links get `rel="noopener noreferrer"` | Small safety fix while touching the component set | decided | user |
| D21 | Regenerate the affected desktop screenshots and update captions; no mobile captures | Committed screenshots must match the UI | decided | user |
| D22 | Preserve first-run OS-follow (Light/Dark only), OLED opt-in only, no first-paint flash, `theme-color` sync, manifest color `#1c1b1f` | House theme rules; existing behavior stays | decided | user |

## Architecture

Change is a cross-cutting sweep, grouped into five workstreams:

1. **Theme and accent core** — `src/theme/theme.ts` (`ThemeId`, `THEMES`,
   defaults, `THEME_SURFACE_COLORS`, migration map, `readStoredTheme` write-back),
   `src/theme/accents.ts` (six ids, migration map, remove native accent),
   `scripts/generate-accents.mjs` (new seeds and halving clip, reads
   `light.css`/`dark.css` neutrals, emits `light`/`dark`/`oled` selectors),
   `src/theme/themes/{light,dark,oled}.css` (renamed selectors; base neutrals
   remain the generator's source and the no-accent fallback),
   `src/theme/themeInit.ts` (config gains migration maps, loses `nativeAccent`),
   the pre-paint script in `index.html` (looks up migrations, new
   `dark`/`blue` fallback), `ThemeProvider.tsx` (always sets `data-accent`),
   `ThemesPage.tsx` (six accents, single-dot preview, no native conditional).
2. **Palette and branding** — regenerated `src/theme/accents.css`,
   `public/favicon.svg`, `scripts/generate-icons.mjs` constants, `npm run icons`
   and `npm run icons:native` outputs.
3. **Component and a11y fixes** — `src/theme/tokens.css` (coarse-pointer block,
   row height 40), `IconButton.tsx` (sm = control size), `SegmentedControl.tsx`
   (radio semantics; drop `inline`/`xs`), `NumberField.tsx` (unit toggle),
   `DataTable.tsx` (row semantics), `TextField`/`TextAreaField`/`NumberField`/
   `MultiSelectField` (full-opacity placeholder/empty text),
   `PortfolioStatsPage.tsx` (pie palette + chart a11y), `JournalStatsPage.tsx`
   (chart a11y), `Markdown.tsx` (rel attribute).
4. **Copy and docs** — `src/i18n/{en,fa}.ts` (theme/accent keys, descriptions,
   `common.unitAria` → switch-unit key, chart aria keys), `translate.test.ts`,
   `src/docs/en/general/themes.md` (rewrite), `src/docs/en/general/design-philosophy.md`
   (row height line), README captions, `CHANGELOG.md` Unreleased, `AGENTS.md`
   `## Design` record.
5. **Verification tooling** — `scripts/a11y.mjs` + `npm run a11y` script +
   `@axe-core/playwright` devDependency; `scripts/screenshots.mjs` selector
   updates; regenerated `screenshots/desktop/*.png`.

Dependency rule as always: components reference semantic roles only; the
generator and theme files own the raw values.

## Risks + rollback

- **Every generated accent color changes visibly** (different seeds, dark
  primary L .74, halving clip). Mitigation: golden tests assert the
  house-documented primaries; screenshots regenerate in the same change. Rollback
  = revert the workstream.
- **Migration bugs could paint the wrong theme/accent on first load.**
  Mitigation: migration maps single-sourced in `theme.ts`/`accents.ts`, injected
  into the pre-paint config, covered by unit tests including legacy values.
- **Coarse-pointer token bump can break dense layouts on phones.** Mitigation:
  axe script runs mobile emulation; manual review of the mobile viewport during
  the self-check.
- **Renaming theme ids touches generated CSS, tests and the pre-paint script.**
  Mitigation: do it in one commit-sized task; the app cannot be left half-renamed.
- **Icon regeneration changes committed binaries.** Mitigation: regenerate in
  one task, inspect the favicon and icons in the browser.
- **Row height 40 slightly loosens table density.** Accepted by decision D10;
  docs updated to match.

Rollback for the whole change is reverting the feature commits; no data
migration in IndexedDB is involved (theme/accent live in `localStorage` only).

## Dependencies / ordering

1. Theme + accent core (code cannot compile consistently without ids and
   migration in place).
2. Palette and icon regeneration (depends on core seeds).
3. Component and a11y fixes (independent of 1–2 except shared tests).
4. Copy, docs, design record (after 1–3 settle names).
5. a11y script, screenshots, final verification (after 1–4; screenshots depend
   on all visible changes).

## Open questions

None.
