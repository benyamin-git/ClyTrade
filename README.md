# ClyTrade

A fast, opinionated, local-first trading PWA: a trade journal, a spot portfolio
tracker and a growing set of calculators that open in one tap and compute as you
type.

No account. No server. No subscription. Your data stays on your device.

> **Status:** early development. V1 is feature-complete for personal use, but
> expect rough edges and breaking changes before a stable release.

---

## Why ClyTrade exists

Trading tools are scattered across paid apps, browser tabs and spreadsheets.
Most of them are simple calculators charging rent, and most of them are slow
exactly when you need speed — in the seconds before a trade.

ClyTrade is an opinionated answer to that:

- **Calculations first.** The app opens on the calculator you need, not a
  dashboard. Results update as you type; there is no Calculate button.
- **Fast and honest.** Costs are shown next to profits, ROI on margin next to
  account return, liquidation distance next to liquidation price.
- **Local-first.** Everything runs and persists on your device using IndexedDB.
  It works offline, with no account and no backend.
- **Documented reasoning.** Every feature ships with in-app documentation that
  explains the _why_ behind the design, not just the how.
- **Compact by design.** 40px controls, 36px table rows and dense data tables —
  built for a trading session, not a marketing page.

## Screenshots

Screenshots are coming with the first tagged release. The README will show the
calculators, journal and themes once the UI polish pass is done.

## What is in V1

| Area             | What it does                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Journal**      | Track futures and perp trades with derived net PnL, R multiples and per-trade stats. Filterable equity curve and PnL charts.            |
| **Portfolio**    | Track spot holdings with blended cost basis, manual prices, unrealized PnL and allocation charts.                                       |
| **Calculations** | Seven calculators: Position Size, Margin & Leverage, Liquidation Price, Risk / Reward, Fees & PnL, Average Entry / DCA, Spot ↔ Futures. |
| **Settings**     | Default inputs, three themes (Material Light, Material Dark, Black Night), data export/import/reset and the full documentation.         |

## Tech

- **React 19 + TypeScript + Vite**, installable PWA via `vite-plugin-pwa`
- **Tailwind CSS v4** with Material Design 3 color roles exposed as CSS variables
- **Dexie / IndexedDB** for local persistence, with versioned schema and JSON
  export/import
- **react-router** (hash routing), **Recharts** for charts, **zod** for validation
- Pure, dependency-free calculation modules in `src/calculations/`, each with a
  table-driven test suite

## Getting started

Requires **Node 22+** and npm.

```bash
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # typecheck + production build + service worker
npm run preview    # serve the production build
npm test           # run the test suite
npm run lint       # eslint
npm run typecheck  # tsc -b
npm run icons      # regenerate PWA icons
```

To test installability and offline mode, use `npm run build && npm run preview`.
The service worker is disabled in the dev server.

## Project layout

| Path                | Contents                                                                              |
| ------------------- | ------------------------------------------------------------------------------------- |
| `src/app/`          | App shell: router, providers, top bar, navigation drawer, subtab bar                  |
| `src/features/`     | Feature UI and application logic (`journal`, `portfolio`, `calculations`, `settings`) |
| `src/calculations/` | Pure, tested math layer — the protected core of the app                               |
| `src/data/`         | Dexie schema, zod models, repositories, backup/restore                                |
| `src/ui/`           | Design-system primitives and layout components                                        |
| `src/theme/`        | MD3 design tokens and the three themes                                                |
| `src/docs/`         | Markdown documentation rendered inside the app                                        |
| `masterplan.md`     | Product direction and design decisions                                                |

## Documentation

The full user documentation lives inside the app under **Settings →
Documentation**, and its source is `src/docs/**`. Product direction, scope and
the reasoning behind major decisions live in [`masterplan.md`](./masterplan.md).

## Roadmap

V1 covers the offline core. Planned next:

- Optional live market data integrations (explicitly opt-in)
- Optional sync between devices
- Translations and language support (see below)
- More calculators, more stats, import from exchange CSVs
- Accent color customization on top of the three themes
- A preference for whether fees count toward risk in the calculators
- Per-input unit selection (currency or percentage) for fields that accept both
- Sample data for demos, screenshots and testing

Open ideas and known bugs are tracked in [`TODO.md`](./TODO.md).

## Contributing

### Forks: yes, please

ClyTrade is licensed under the GPL-3.0, so you are free to fork it, rename it
and build your own thing with it — as long as your fork stays under the same
license. If you outgrow this project's opinions, fork it and make it yours.

### Translations: yes, please

Translation and language support is one of the things I would genuinely love
help with. If you want to translate ClyTrade into your language, open a GitHub
Issue or Discussion with the language you have in mind. Translation support is
not implemented yet, so this is also a chance to shape how it is built.

### Code contributions: no, thank you

Honest reason: I am a bit of a control freak about this codebase. It is my
project, I want to keep it coherent, and reviewing and merging someone else's
architecture decisions is not something I enjoy. So I am not accepting pull
requests — please do not take it personally.

That said, everything else is welcome:

- **Bug reports** — open an issue with steps to reproduce.
- **Feature ideas** — open a Discussion; I read all of them.
- **Forks** — genuinely encouraged, and the GPL-3.0 makes it official.

## AI-assisted development

ClyTrade is written almost entirely by AI. The maintainer directs the work,
makes the product decisions, reviews every change and runs the tests — but the
code and documentation are AI-generated. If AI-written software is a dealbreaker
for you, this project is probably not for you, and that is completely fine.

The same statement, with more detail, is included in the app under **Settings →
Documentation → AI Usage**.

## Disclaimer

**Not financial advice.** ClyTrade is a calculator and record-keeping tool. It
does not execute trades, connect to your exchange, or tell you what to buy or
sell.

Trading involves substantial risk, including the loss of your entire account.
All calculations are estimates based on the inputs and assumptions documented in
the in-app documentation; exchange formulas, fees and funding rates can differ.
Always verify numbers against your exchange before acting on them.

The software is provided "as is", without warranty of any kind, as stated in the
license below.

## License

Copyright (C) 2026 benyamin-git

ClyTrade is free software: you can redistribute it and/or modify it under the
terms of the **GNU General Public License v3.0** as published by the Free
Software Foundation. See [`LICENSE`](./LICENSE) for the full text.

ClyTrade is distributed in the hope that it will be useful, but **without any
warranty**; without even the implied warranty of merchantability or fitness for
a particular purpose.
