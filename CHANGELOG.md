# Changelog

All notable changes to ClyTrade are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-11-02

### Fixed

- Rounded cards clip their contents, so the journal and portfolio table headers
  no longer paint over the card's top corners when rows are present.

## [0.5.1] - 2026-11-01

### Added

- Choosing a **Market symbol** while the market is Unspecified now records the
  symbol's market (Crypto) and turns automatic pricing on in the asset form; the
  journal trade form uses the same picker and can prefill the entry price.

### Changed

- New assets default to automatic pricing when the market is Crypto or
  Unspecified, and new journal trades prefill the entry price from the live
  quote once their symbol is mapped.
- Sample data ships explicit market mappings for its crypto holdings and open
  crypto trades, so live prices appear immediately; the forex and stocks
  examples remain manual.

### Fixed

- Automatic price mapping no longer stops at a cross-provider tie. It picks the
  exact-base Binance USDT pair, or the best-ranked CoinGecko coin when no USDT
  pair exists, so BTC, ETH, SOL, LINK and similar symbols resolve without a
  manual pick. Choosing a symbol in the form still overrides it.
- The portfolio price cell shows a short **No live price** label instead of the
  full save-and-enter-manually sentence; the full hint remains in the form and
  as a tooltip.

## [0.5.0] - 2026-10-26

### Added

- **Price alerts** — a top-level Alerts tab with custom price rules (above,
  below, crossing, range) and percent rules (up, down, either direction),
  Once / Cross-back / Cooldown repeats, a status strip, a review queue, a
  500-event history and an unread badge in the drawer and top bar.
- **Trade target and stop alerts** — every open journal trade with a level is
  watched with direction-aware comparisons, whether or not auto-close is on.
- **Auto-close** — an optional per-trade switch (with a Preferences default)
  closes a trade at the exact target or stop when one fresh level is hit, adds
  the `auto-closed` tag and a localized note, and leaves the trade editable.
  Gaps, stale quotes and changed background hits go to review instead of
  closing.
- **Live crypto prices** — Binance and CoinGecko providers behind one shared
  cache and scheduler: 5-minute list refresh, 30-second detail refresh,
  5-minute foreground timer and a 60-second manual cooldown. A 15-minute stale
  guard blocks alerts and closes on old data.
- **Automatic portfolio prices** — a per-asset switch, on for new crypto
  assets, writes fresh prices into Current price and shows a Stale badge for old
  quotes. Manual and non-crypto assets stay manual.
- **Background monitoring** — opt-in grouped OS notifications on Android
  (WorkManager, about every 15 minutes) and Windows (tray timer, every 5
  minutes); queued hits are revalidated and applied on the next open. The PWA
  has no background mode.
- **Market data settings** — provider choice (Auto / Binance / CoinGecko), an
  optional CoinGecko Demo key, notification permission status, auto-close
  default and the Windows close behavior.
- **Backup schema v3** — backups include alert rules and history and exclude the
  CoinGecko key, price cache, symbol lists and native queue. v1 and v2 files
  still import.

### Changed

- Dexie v3 adds `priceCache`, `marketSymbols`, `priceAlerts` and `alertEvents`;
  existing trades get auto-close off and existing crypto assets get automatic
  pricing on.
- New journal entries prefill the entry price and new portfolio entries the
  current price; ambiguous symbols resolve through a provider picker.
- Documentation, README and AGENTS describe the price layer, alerts and platform
  limits.
- The Tauri JS and Rust dependencies are pinned to matching versions for the
  Android release build.

### Security

- The CoinGecko key is stored locally, masked in the UI, excluded from backups
  and never written to logs.

## [0.4.1] - 2026-10-25

### Changed

- Android: release-signing verification release. No functional changes; 0.4.1
  confirms that release-key APKs update in place after the one-time 0.3.0
  migration.

## [0.4.0] - 2026-10-24

### Added

- **Theme and accent in backups** — exports include the current theme and accent
  under `data.ui`, and imports apply them, so a restore looks the same on another
  device. Backups stay schema version 2; older files without `ui` still import.
- **Apple splash screens** — generated `apple-touch-startup-image` links cover
  current iPhone and iPad sizes in both orientations.
- The app asks the browser for persistent storage (`navigator.storage.persist()`)
  where supported, reducing the chance that the local database is evicted.

### Changed

- Sample strategies, notes and asset names follow the interface language.
- Calculator unit toggles (percent or currency) are remembered per field between
  visits.
- Pinch and double-tap zoom are disabled and the viewport scale is locked, so an
  accidental gesture cannot zoom the interface.
- GitHub Actions were updated to Node 24-compatible majors, clearing the runner
  deprecation warnings.

### Fixed

- **Android in-place updates** — release APKs are signed with a stable project
  keystore from CI secrets, so newer release-key APKs install over each other
  without uninstalling the app or losing local data. Builds up to 0.3.0 used
  per-run debug keys, so the first release-key install from one of those needs a
  one-time backup, uninstall and restore. `./scripts/android-signing.sh --setup`
  provisions the keystore and the four repository secrets.

## [0.3.0] - 2026-10-10

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

[Unreleased]: https://github.com/benyamin-git/ClyTrade/compare/v0.5.2...HEAD
[0.5.2]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.5.2
[0.5.1]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.5.1
[0.5.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.5.0
[0.4.1]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.4.1
[0.4.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.4.0
[0.3.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.3.0
[0.2.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.2.0
[0.1.0]: https://github.com/benyamin-git/ClyTrade/releases/tag/v0.1.0
