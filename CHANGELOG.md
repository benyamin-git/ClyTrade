# Changelog

All notable changes to ClyTrade are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Install on iPhone** — the PWA is deployed to GitHub Pages on every `v*`
  tag, so it can be installed from Safari with Add to Home Screen. The Data
  Controls page explains the Safari-only flow, and backup export opens the iOS
  share sheet so the file can be saved to Files.
- `VITE_BASE` lets the production build run under the `/ClyTrade/` Pages path;
  local and Tauri builds keep the root base.
- **Persian documentation** — every in-app documentation page now has a Persian
  body; English stays the fallback for future locales.

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
- **Persian terminology** — the interface and the docs now say «حد ضرر» for
  stop loss (previously «استاپ»), «تارگت» for the target filter (previously
  «حد سود»), and R / «میانگین R» for R multiples (previously «RR»), plus a few
  Persian spelling and consistency fixes.

### Fixed

- Documentation: fenced code blocks and inline code render left-to-right inside
  the Persian right-to-left layout, so formula alignment is preserved.
- iOS: the status bar style follows the theme (`default` for the light theme,
  translucent dark for the dark themes) instead of staying translucent and
  turning white-on-white in the light theme.

## [0.2.0] - 2026-09-30

### Added

- `npm run dev:lan` serves the dev build on `0.0.0.0:7401` so it can be opened
  from a phone or another device on the same network.
- `./scripts/live.sh` runs that server in the background on `0.0.0.0:7401`, with
  a log in `/tmp/clytrade-liveserver.log`, a pid file to stop it and
  `LIVE_SERVER_PORT` to override the port.
- `npm run screenshots` captures the journal, portfolio, Position Size and theme
  pages with the sample data, and the README shows the results.
- **Localization** — English and Persian (فارسی) with a language selector in
  Preferences. Persian runs the interface right-to-left, uses a bundled Vazirmatn
  font, formats dates and numbers with Persian labels while keeping Latin digits
  and Gregorian dates, and is saved with preferences so it travels in backups.
  UI text lives in typed `src/i18n/` dictionaries, documentation in
  `src/docs/<locale>/` with an English fallback.

### Changed

- **Persian terminology** — financial labels now use the vocabulary traders say
  (مارجین، استاپ/تارگت، سایز پوزیشن، ارزش پوزیشن، لیکویید شدن، RR) instead of
  literal dictionary translations, and names that clashed were disambiguated
  (ژورنال، سبد سرمایه، تنظیمات شخصی، بازیابی / پشتیبان‌گیری).
- **Persian themes page** — «تم» replaces «پوسته», «رنگ اصلی» replaces «رنگ تأکید»,
  the descriptions keep the Latin Material Design 3 name instead of translating it,
  and the black-night theme is called «متریال AMOLED».

### Fixed

- Android: the app no longer bleeds into the status and navigation bars. The
  shell consumes the system safe-area insets (top bar and drawer headers clear
  the status bar, page content and sheets clear the gesture bar) and the status
  bar icon colors follow the in-app theme instead of the system theme.
- Changing one preference (for example the currency) no longer reverts the
  interface language to the value that was stored when Preferences was opened.

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

[Unreleased]: https://github.com/benyamin-git/ClyTrade/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.2.0
[0.1.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.1.0
