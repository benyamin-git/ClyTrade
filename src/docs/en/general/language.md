# Language & Direction

ClyTrade ships in English and Persian (فارسی). The interface language sits in
**Settings → Preferences → Interface** and applies immediately — no reload.

## What changes

- Every label, hint, validation message and chart annotation switches language.
- Persian turns the whole interface right-to-left: the navigation drawer opens
  from the right, tables align to the reading direction and list indentation
  flips.
- Dates keep the Gregorian calendar but use Persian month names, so the date
  picker used when editing a trade always matches the dates shown in tables.
- Numbers keep Latin digits (`1234.5`) even in Persian text.
- Charts stay left-to-right. Time series are read against exchange charts,
  screeners and TradingView, which are left-to-right in every region. Mirroring
  the layout while keeping the curve intact avoids re-learning a familiar shape.
- A Persian-capable font (Vazirmatn) is bundled and used automatically for
  Persian, so the app never depends on fonts installed on the device.

## Why these choices

- **Latin digits** keep prices, sizes and PnL copy-pasteable into exchange
  order forms, and avoid a parser that has to guess between numeral systems.
  Persian numerals are still accepted if you type or paste them into a field.
- **Gregorian dates** are what the native date picker edits. Displaying Jalali
  dates next to a Gregorian picker would mean the same trade reads differently
  in the table and in the form. A Jalali picker is a possible future addition.
- **Left-to-right charts** are the financial convention. Traders read the same
  price axis regardless of language.

## Backups

The language is stored with your other preferences and travels in JSON backups,
so restoring on another device keeps the interface as you left it.

## Adding a language

Translations live in code, not in a service. `src/i18n/en.ts` is the source of
truth; `src/i18n/fa.ts` must define the same keys, and both TypeScript and a
test fail if they drift. Documentation is split into `src/docs/en/` and
`src/docs/fa/`; a missing file falls back to English, so docs can be translated
a page at a time.
