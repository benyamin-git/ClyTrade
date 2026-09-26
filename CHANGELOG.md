# Changelog

All notable changes to ClyTrade are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `npm run dev:lan` serves the dev build on `0.0.0.0:3000` so it can be opened
  from a phone or another device on the same network.
- `npm run screenshots` captures the journal, portfolio, Position Size and theme
  pages with the sample data, and the README shows the results.
- **Localization** — English and Persian (فارسی) with a language selector in
  Preferences. Persian runs the interface right-to-left, uses a bundled Vazirmatn
  font, formats dates and numbers with Persian labels while keeping Latin digits
  and Gregorian dates, and is saved with preferences so it travels in backups.
  UI text lives in typed `src/i18n/` dictionaries, documentation in
  `src/docs/<locale>/` with an English fallback.

## [0.1.0] - 2026-09-23

First tagged release. Windows and Android builds are unsigned test builds; the
PWA remains the reference platform.

### Added

- **Journal** — futures and perp trades with derived net PnL, R multiples and
  per-trade stats, plus filterable equity curve and PnL charts.
- **Portfolio** — spot holdings with blended cost basis, manual prices,
  unrealized PnL and allocation charts.
- **Calculations** — seven calculators (Position Size, Margin & Leverage,
  Liquidation Price, Risk / Reward, Fees & PnL, Average Entry / DCA,
  Spot ↔ Futures) that compute as you type.
- **Settings** — default inputs, three themes with eight accent colors, JSON
  export/import/reset, sample data and the full documentation.
- **PWA** — installable app with offline caching, standalone display and
  generated icons.
- **Native builds** — Windows (`.exe`) and Android (`.apk`) wrappers built with
  Tauri v2 and published from CI.

[Unreleased]: https://github.com/benyamin-git/ClyTrade/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.1.0
