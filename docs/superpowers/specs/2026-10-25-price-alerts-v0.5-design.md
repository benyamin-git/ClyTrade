# Price Alerts & Auto-Close — Design Spec (v0.5.0)

**Status:** Approved
**Date:** 2026-10-25

## Objective / why

ClyTrade currently records trades and holdings with manually entered prices. v0.5
adds a serverless market-data layer for crypto, a top-level Alerts tab for custom
price and percent-move rules, target/stop alerts for open trades, optional
automatic trade closing, and live portfolio prices. The same price layer also
prefills new journal and portfolio entries, removing the most repetitive manual
input without giving up the app's local-first, no-account, no-server promise.

The feature has to be honest about platform limits: a PWA cannot poll or notify
while closed. Android and Windows can do useful background work, but neither can
write the IndexedDB database while the WebView is gone. Background mode therefore
detects and notifies, queues a close, and the app applies it on the next open.

## Success criteria / definition of done

1. Preferences offers provider Auto/Binance/CoinGecko, an optional CoinGecko Demo
   key, and an auto-close default. Auto tries Binance then CoinGecko; a pinned
   provider never silently falls back.
2. Crypto assets with auto-price enabled update `currentPrice` from a fresh price.
   Manual assets, and all non-crypto assets, never update automatically.
3. A new trade form prefills `entryPrice` from a fresh price when a mapping
   exists. Existing trades never have `entryPrice` overwritten.
4. Symbol resolution caches Binance and CoinGecko lists for seven days, asks the
   user to pick when a symbol is ambiguous, and stores the chosen provider IDs on
   the entry. Those IDs travel in backups.
5. The shared scheduler never exceeds its request budget, shares one in-flight
   request per symbol across tabs, honours the 5-minute list / 30-second detail /
   5-minute foreground timer, and enforces the manual-refresh cooldown.
6. The Alerts tab shows a status strip, active rules, a review queue, history and
   an unread badge. It is complete in English and Persian, including RTL layout.
7. Custom rules support above/below, crossing and range price rules, plus percent
   rules watching up, down or both. Repeat modes are Once, Cross-back and
   Cooldown, defaulting to Once.
8. Target/stop alerts fire for every open trade with a level, using
   direction-aware comparisons for longs and shorts.
9. With the per-trade toggle on, a single fresh level hit closes the trade at the
   exact level, sets `exitPrice`, `closedAt` and `status`, and adds an
   `auto-closed` tag and a localized note. Journal stats and the equity curve
   reflect the close.
10. If both target and stop are crossed in one poll, the trade stays open and a
    review item offers close at target, close at stop, edit and dismiss.
11. A price older than 15 minutes never fires an alert or closes a trade. It shows
    a stale badge and, if a level was crossed, a review item.
12. Background monitoring is off by default. Enabling it requests notification
    permission. Android runs WorkManager every 15 minutes; Windows runs a Rust
    timer while tray-resident. Both use the same JSON snapshot and event queue.
13. A queued close applies only when the hit is under 24 hours old and the trade
    has not changed. Otherwise it becomes a review item.
14. Multiple hits in one poll produce one grouped OS notification. Tapping it
    opens the Alerts tab on Android and in the PWA; Windows has no notification
    click action through the Tauri plugin (see Platform specifics). Denied
    notification permission leaves the in-app inbox and badge fully functional.
15. Backups include alert rules and history, exclude the key, price cache, symbol
    lists and native queue, and still import v1/v2 backups.
16. History is capped at the last 500 events.
17. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and
    `npm run format:check` pass. New tests cover providers, symbol resolution,
    scheduling, evaluation, auto-close, queue import, migration and backup.
18. `npm run a11y` reports zero serious/critical violations on the Alerts tab and
    the new forms, in all three themes and both viewport classes.
19. English and Persian documentation is updated, including a new Alerts page;
    `README.md`, `AGENTS.md` and `CHANGELOG.md` describe the release.
20. `src/calculations/**` is untouched, no server is introduced, and no new port
    or dashboard entry is needed.

## Scope

### In scope

- Crypto price providers: Binance public API and CoinGecko keyless/Demo key.
- Provider selection, fallback, rate budgets, backoff and status reporting.
- Symbol resolution with cached provider lists and an ambiguity picker.
- Shared price cache and scheduler for navigation, foreground timer and detail.
- Live portfolio prices with a per-asset auto-price toggle.
- New-trade entry-price prefill.
- Custom price rules: above/below, crossing, range; percent rules up/down/both.
- Per-rule repeat modes: Once, Cross-back, Cooldown.
- Target/stop alerts for all open trades.
- Per-trade auto-close toggle with a Preferences default.
- Auto-close at exact levels, tag and note, and gap/stale/conflict review items.
- In-app alert inbox, unread badge and grouped OS notifications.
- Android WorkManager background detection and queued closes.
- Windows tray monitoring with a Rust timer and first-close prompt.
- Dexie v3 migration, backup v3, alert backup and restore.
- English/Persian UI, docs, tests, a11y and release notes.

### Non-goals (explicitly out)

- Forex, stocks, futures, commodities, indices or options prices.
- Background work in the PWA, iOS PWA notifications, or alerts while the browser
  tab is closed.
- True push notifications or any server-side component.
- Historical price charts, OHLC data, candles, or backtesting.
- Multi-device sync of trades, rules or alert history.
- Quiet hours, per-notification sound/vibration settings, or a privacy mode for
  lock-screen notification text.
- Trailing stops, partial closes, scale-outs or automatic order execution.
- Exchange API keys or account connectivity.
- Changing any calculation in `src/calculations/**`.

## Decision log

| #   | Decision                                                                                                                       | Rationale                                                                                       | Status  | Source         |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------- | -------------- |
| D1  | Keep the serverless, local-first core; add native background only on Android and Windows                                        | Preserves the product promise while making alerts useful on the two native targets              | decided | user           |
| D2  | Deliver alerts in-app (inbox + badge) and as OS notifications; background uses native code                                      | Covers all platforms and gives the best available delivery without a server                     | decided | user           |
| D3  | Triggers: target hit, stop hit, custom price level, percent move; new top-level Alerts tab                                     | Matches the requested feature set and keeps alerts discoverable                                 | decided | user           |
| D4  | Auto-close may trigger on target and stop                                                                                      | More complete than target-only; the user chose both                                             | decided | user           |
| D5  | Live prices cover crypto only in v0.5                                                                                          | Free, reliable APIs and clean symbol mapping exist for crypto; other markets do not             | decided | user           |
| D6  | One phased spec and implementation plan under `docs/superpowers/`                                                              | Keeps design and execution together and reviewable                                             | decided | user           |
| D7  | Provider is user-selectable: Auto, Binance or CoinGecko                                                                        | Lets the user adapt to VPN/geo conditions without a new build                                   | decided | user           |
| D8  | Both providers are reachable; Binance may need a VPN, CoinGecko always works                                                   | Confirmed by the user and by endpoint checks                                                    | decided | user           |
| D9  | Ship Android WorkManager and Windows tray monitoring in v0.5                                                                   | The user explicitly asked for background notifications                                          | decided | user           |
| D10 | One shared price cache; lists every 5 min, detail every 30s                                                                    | Deduplicates tab refreshes and protects the per-IP budget                                       | decided | user           |
| D11 | Alerts is a fifth top-level tab                                                                                                | The user asked for a dedicated tab for custom levels and percent rules                          | decided | user           |
| D12 | Rules attach to coins (custom/percent) and to trades (target/stop)                                                             | Covers both standalone watchlists and trade-driven alerts                                       | decided | user           |
| D13 | Background mode notifies and queues closes; the app applies them on next open                                                   | Native code cannot write IndexedDB while the WebView is gone                                    | decided | user           |
| D14 | Android uses WorkManager at a fixed 15-minute interval                                                                         | The only all-day option; avoids the Android 15 six-hour foreground-service cap                  | decided | user           |
| D15 | Windows uses close-to-tray plus a Rust-side timer                                                                              | Avoids WebView2 throttling and keeps notifications native                                       | decided | user           |
| D16 | Auto-close records the exact target/stop level; the user may edit it later                                                     | Predictable statistics and a simple audit trail                                                 | decided | user           |
| D17 | If one poll sees both levels crossed, the trade is not closed                                                                  | Avoids guessing in a gap                                                                        | decided | user           |
| D18 | Portfolio prices update live; new trade forms prefill entry; existing trades are never overwritten                             | Removes manual input without rewriting history                                                  | decided | user           |
| D19 | Provider picker is Auto with a manual override                                                                                 | Best default plus an escape hatch                                                               | decided | user           |
| D20 | CoinGecko defaults to keyless with an optional Demo key, stored locally and excluded from backups                              | No setup for most users, with a path to higher limits                                           | decided | user           |
| D21 | Symbol resolution uses cached provider lists and a picker; provider IDs are stored on the entry                                | Handles ambiguous tickers and avoids repeated search calls                                      | decided | user           |
| D22 | Custom price rules support above/below, crossing and range                                                                     | The user chose all three types                                                                  | decided | user           |
| D23 | Percent rules measure from creation and reset the reference after firing                                                       | Measures a fresh move each time instead of noise                                                | decided | user           |
| D24 | An ambiguous gap creates a review item instead of a close                                                                      | Leaves the decision to the user                                                                 | decided | user           |
| D25 | Repeat modes: Once, Cross-back, Cooldown; default Once; cooldown 15 min–24 h, default 1 h                                      | Per-rule control without a noisy default                                                        | decided | user           |
| D26 | Preferences holds provider, key, auto-close default and notification permission; Alerts holds background, rules and review    | Keeps app-wide settings separate from feature controls                                          | decided | user           |
| D27 | Foreground evaluation runs on a 5-minute timer plus navigation; detail stays at 30s                                            | Alerts work while a page is idle without exceeding keyless limits                               | decided | user           |
| D28 | Every open trade with a target or stop generates alerts, regardless of auto-close                                              | Users expect to hear about a hit even when they did not opt into auto-close                     | decided | user           |
| D29 | Background engines are Kotlin on Android and Rust on Windows, sharing a JSON contract                                          | Idiomatic, debuggable per platform; one shared contract keeps behavior aligned                  | decided | user           |
| D30 | Alerts shows a status strip; stale prices get badges                                                                           | Makes provider health and stale data visible instead of silent failure                          | decided | user           |
| D31 | A manual Refresh button exists with a cooldown                                                                                 | Gives the user a recovery path without bypassing budgets                                        | decided | user           |
| D32 | Windows asks once what the close button should do                                                                              | Avoids surprising users who expect close to quit                                                | decided | user           |
| D33 | Fired history keeps the last 500 events                                                                                        | Bounds database and backup size                                                                 | decided | user           |
| D34 | Existing data migrates safely: auto-close off, crypto auto-price on, mappings resolve on first refresh                         | No silent behavior change for existing trades                                                   | decided | user           |
| D35 | Percent rules watch up, down or both, chosen per rule                                                                          | Covers breakouts and crashes                                                                     | decided | user           |
| D36 | Gap review offers close at target, close at stop, edit and dismiss                                                             | Four explicit outcomes, no hidden default                                                       | decided | user           |
| D37 | Notification permission is requested when background monitoring is enabled                                                     | The request arrives with context                                                                | decided | user           |
| D38 | Multiple hits in one poll produce one grouped notification                                                                     | Avoids notification bursts in volatile markets                                                  | decided | user           |
| D39 | Backups include alert rules and history                                                                                        | A restore should keep the user's alert setup                                                     | decided | user           |
| D40 | Auto-close is blocked when the price is older than 15 minutes                                                                  | Prevents closing on stale information                                                           | decided | user           |
| D41 | One per-trade toggle covers target and stop; auto-closes add an `auto-closed` tag and a note                                   | Simple form and an auditable result                                                             | decided | user           |
| D42 | Background monitoring is off by default                                                                                        | No surprise battery use or permission prompt                                                     | decided | user           |
| D43 | A queued close applies only if the hit is under 24 hours old; otherwise it becomes a review item                               | Prevents a week-old target from silently closing a live trade                                   | decided | user           |
| D44 | If the trade changed after the hit, discard the queued close and create a review item                                          | The hit no longer describes the current trade                                                   | decided | user           |
| D45 | Tapping a notification opens the Alerts tab                                                                                    | One predictable destination for every alert type                                                | decided | user           |
| D46 | The per-trade auto-close default comes from Preferences                                                                        | Matches the original request and keeps new trades consistent                                    | decided | user note      |
| D47 | The single toggle covers both target and stop                                                                                  | One control per trade, as requested                                                             | decided | user note      |
| D48 | Version is `0.5.0`, with changelog and release notes                                                                           | Semver minor for a feature release                                                              | assumed | recommendation |
| D49 | Dexie schema v3 is additive; backup schema v3; v1/v2 backups still import                                                      | Additive tables/fields are the least disruptive migration                                       | assumed | recommendation |
| D50 | Price cache, symbol lists, native queue and the CoinGecko key are excluded from backups                                        | They are device-local, reproducible or secret                                                   | assumed | recommendation |
| D51 | New code lives in `src/market/`, `src/features/alerts/`, data models/repositories and native background files                 | Keeps market infrastructure out of features and mirrors the existing layer boundaries           | assumed | recommendation |
| D52 | The native contract is a JSON rule snapshot plus a JSON event queue in the app data directory                                 | Both platforms can read it without a bridge while the WebView is gone                           | assumed | recommendation |
| D53 | Budgets: Binance 60 req/min and 1,200 weight/min; CoinGecko keyless 6 req/min, keyed 30 req/min and 10k/month                  | Conservative fractions of the published limits                                                  | assumed | recommendation |
| D54 | Stale data never fires an alert or close; it creates a review item instead                                                    | Consistent with the 15-minute guard                                                             | assumed | recommendation |
| D55 | Native notification text is localized from templates in the snapshot                                                          | Avoids duplicating the i18n dictionaries in Kotlin and Rust                                     | assumed | recommendation |
| D56 | Tests use mocked fetch and fake timers; native background is verified manually                                                | Keeps CI deterministic and offline                                                              | assumed | recommendation |
| D57 | Docs and i18n are updated in English and Persian, including a new Alerts page                                                 | Matches the repository's documentation and localization rules                                  | assumed | recommendation |
| D58 | Non-goals: non-crypto markets, PWA background, price history charts, multi-device sync, quiet hours, partial closes           | Keeps v0.5 focused and shippable                                                                | assumed | recommendation |
| D59 | Rollback requires restoring a pre-v0.5 backup because Dexie does not downgrade                                                | The schema version is a one-way door in the app                                                 | assumed | recommendation |
| D60 | Android uses POST_NOTIFICATIONS and a WorkManager worker; Windows uses an in-app first-close prompt                            | Smallest native surface that satisfies the chosen behavior                                      | assumed | recommendation |

## Architecture

### Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Market infrastructure | `src/market/` | Provider adapters, symbol resolution, scheduler, cache policy, evaluation, native bridge |
| Data | `src/data/` | Dexie v3 schema, zod models, repositories, backup v3 |
| Alerts feature | `src/features/alerts/` | Alerts tab, rule form, review queue, history, status strip |
| Journal/portfolio | existing feature folders | Auto-close toggle, symbol picker, prefill, auto-price toggle |
| Settings | `src/features/settings/` | Provider, key, auto-close default, notification permission |
| Native | `src-tauri/` and `src-tauri/gen/android/` | Windows tray timer, Android WorkManager, notifications, snapshot/queue files |

Dependency rules stay as documented in `AGENTS.md`: `src/market/` may import
`src/data` models/repositories and `src/lib`; features import `src/market` and
`src/data`; `src/data` never imports features or `src/i18n`; `src/calculations/**`
is untouched.

### Market data flow

1. The scheduler receives a demand for one or more symbols from navigation, the
   foreground timer, a detail view or the manual Refresh button.
2. It filters the demand through the per-symbol cache TTL, the in-flight map and
   the global budget.
3. It groups the remaining symbols by provider and issues one batched request.
4. Responses are validated, normalized to `{ symbol, price, fetchedAt, provider,
   sourceTimestamp }` and written to the `priceCache` table.
5. Subscribers (portfolio rows, trade form, alert evaluator) read the cache.
6. The evaluator compares fresh prices with open-trade levels and active rules.
7. Hits become `alertEvents`; eligible hits become auto-closes; ambiguous or stale
   hits become review items.
8. The snapshot writer publishes the current rules/trades to the native background
   engine whenever they change.

### Providers

Two adapters implement one interface:

- `binance`: public spot API, no key. Batched `ticker/price` or `ticker/24hr` for
  the requested symbols, USDT quote preferred. Uses the exchange's weight budget.
- `coingecko`: keyless `/simple/price`, or the same endpoint with a Demo key.
  Batched by CoinGecko coin ids. The optional key is read from a separate settings
  row and never exported.

Auto mode tries Binance first. A 403/451, network error, 429 or invalid response
marks Binance unavailable for a short cooldown and falls back to CoinGecko. A
pinned provider is used alone and surfaces its error in the status strip.

Both adapters reject non-finite, zero or negative prices and ignore responses for
symbols that were not requested.

### Symbol resolution

- Binance `exchangeInfo` and CoinGecko `/coins/list` (plus a top-250 market list
  for ranking) are cached in `marketSymbols` for seven days.
- A symbol such as `BTC` resolves to `BTCUSDT` on Binance and `bitcoin` on
  CoinGecko. Exact matches are preferred; stablecoin quote pairs are preferred for
  Binance.
- If more than one plausible match remains, the trade/asset/rule form shows a
  picker with name, provider and rank. The choice is stored as
  `binanceSymbol`/`coingeckoId` on the entry.
- Entries without a mapping show "price unavailable" and a link to the picker.
  They never block saving.
- Existing entries have no mapping; the first refresh attempts resolution and
  asks only when ambiguous.

### Scheduler and budgets

- List refresh: at most once per 5 minutes per symbol, triggered by Journal or
  Portfolio navigation.
- Detail refresh: at most once per 30 seconds for the open trade/asset, while its
  form or detail sheet is open.
- Foreground timer: every 5 minutes while the document is visible, refreshing all
  watched symbols (crypto assets with auto-price, open trades, active rules).
- Manual refresh: forces a refresh subject to a 60-second cooldown and the budget.
- One in-flight request per provider batch; duplicate demands join it.
- Budgets are token buckets: Binance 60 requests/min and 1,200 weight/min;
  CoinGecko keyless 6 requests/min; keyed 30 requests/min plus a 10k/month
  counter. Exhausted budgets skip the request and show the next allowed time.
- Backoff on 429/5xx/network errors: 30s, 1m, 2m, 5m, 15m, with jitter. A provider
  is marked unavailable for 5 minutes after repeated failures.
- The scheduler pauses when the document is hidden; native background takes over
  where available.
- A manual refresh never bypasses the cooldown or the budget.

### Alert evaluation

- Trade levels are direction-aware: a long hits target when `price >= target` and
  stop when `price <= stop`; a short is the reverse.
- Every open trade with a target or stop is evaluated, whether or not auto-close
  is on.
- Custom price rules:
  - Above: fires when the price is at or above the level.
  - Below: fires when the price is at or below the level.
  - Crossing: fires only when the price moves across the level from the other
    side, using the last observed price.
  - Range: fires when the price leaves the inclusive `[low, high]` band.
- Percent rules: `(current - reference) / reference * 100` compared with the
  configured threshold; up, down or both. The reference is set at creation and
  reset after a fire.
- Repeat modes:
  - Once: disable after firing.
  - Cross-back: fire, then re-arm when the price returns to the non-fired side.
  - Cooldown: fire, then allow the next fire only after the cooldown; the
    condition may still be true.
- A rule that is disabled, has no mapping, or has no fresh price is skipped.
- The evaluator is pure and table-driven; it returns events, never writes data.

### Auto-close

A trade closes automatically only when all of the following are true:

1. The trade is open.
2. The trade's auto-close toggle is on.
3. The price is fresh (under 15 minutes old).
4. Exactly one of target or stop is hit in the evaluation.
5. The trade has not changed since a queued background hit (for background hits).

The close writes `status = 'closed'`, `exitPrice` equal to the exact level,
`closedAt` equal to the hit time, appends the `auto-closed` tag, and appends a
localized note naming the level, price and time. The existing trade edit form can
correct any of these values later.

When both levels are crossed in one poll, nothing closes. A `gap` review item is
created with four actions: close at target, close at stop, edit, dismiss.

When the price is stale, nothing closes. A `stale` review item is created once per
rule/trade per stale window, with refresh, edit and dismiss actions.

Queued background closes are applied on the next open only if the hit is under 24
hours old and the trade's target, stop, direction and status still match the
snapshot. Otherwise the queue entry becomes a `conflict` review item.

### Background bridge

The WebView owns the database. Native code owns only two JSON files in the app
data directory:

- `background-snapshot.json`: provider, optional key, locale, notification
  templates, stale threshold, open trades with levels and auto-close flags, and
  active custom rules with their repeat state.
- `background-events.json`: hits detected while the app was closed, each with
  rule/trade ids, symbol, price, level, time and provider.

The WebView writes the snapshot (debounced) whenever trades, rules, assets or
preferences change, and on startup. Native engines read it before each run. The
WebView reads and clears the event queue on startup and after returning to the
foreground, imports events into `alertEvents`, and applies eligible queued closes.

Android:

- A `CoroutineWorker` scheduled with `WorkManager` every 15 minutes, network
  constraint required, reads the snapshot, polls, evaluates the same rules,
  groups hits into one notification and appends queue entries.
- WorkManager is scheduled only while background monitoring is enabled and is
  cancelled when it is disabled.
- WorkManager survives reboot and does not need a foreground service. The OS may
  delay a run; the status strip shows the last successful run.
- POST_NOTIFICATIONS is requested when background monitoring is enabled. Denial
  leaves in-app alerts working.
- Notification taps open the app on the Alerts tab.

Windows:

- A Rust timer runs every 5 minutes while the app is tray-resident and background
  monitoring is on. It reads the same snapshot, polls, evaluates, notifies and
  appends queue entries.
- The first close with monitoring enabled shows an in-app prompt: hide to tray or
  quit. The choice is stored and can be changed in Preferences.
- The tray menu offers Show and Quit. Closing with monitoring off quits normally.
- `tauri-plugin-notification` does not expose a click action on Windows, so a
  Windows toast tap does not route to the Alerts tab. Tapping the tray icon
  restores the app and its current route. Android and PWA notification taps open
  Alerts.

PWA:

- In-app alerts and the foreground timer work while the tab is open.
- OS notifications use the Notification API where available. There is no
  background mode; the UI says so.

### UI

Alerts tab:

- Status strip: active provider, last successful refresh, next allowed refresh,
  current error, manual Refresh button with cooldown.
- Needs review: gap, stale and conflict items with their actions.
- Active rules: custom rules with enable/pause, edit, delete, last fired, repeat
  mode and reference price; trade-derived target/stop rows are read-only and link
  to the trade.
- History: the last 500 events, with unread state, filter by type and mark-all-read.
- New alert button opens a form with type, coin picker, direction/levels,
  repeat mode, cooldown and note.

Journal:

- Trade form gains an auto-close toggle (default from Preferences), a symbol
  mapping picker, and a current-price hint.
- New trades prefill `entryPrice` when a fresh mapped price exists.
- Auto-closed trades show the tag and note; editing is unchanged.

Portfolio:

- Asset form gains an auto-price toggle (default on for crypto), a symbol mapping
  picker, and a current-price hint.
- Rows show the last price time and a stale badge.
- Manual prices remain possible by turning auto-price off.

Preferences:

- Provider picker, optional CoinGecko key with show/hide and clear, auto-close
  default, notification permission status and background monitoring status.
- No refresh-interval controls in v0.5; the intervals are fixed.

### Data model

Dexie v3 adds:

- `priceCache`: provider + price id, symbol, price, fetchedAt, sourceTimestamp.
  Ephemeral, not backed up.
- `marketSymbols`: provider, symbol, name, quote, rank, updatedAt. Ephemeral.
- `priceAlerts`: id, kind (`price`/`percent`), price mode (`above`/`below`/
  `crossing`/`range`), level, range bounds, percent, percent direction, symbol,
  provider ids, repeat mode, cooldown, reference price, last price, armed flag,
  enabled, note, lastFiredAt, createdAt, updatedAt.
- `alertEvents`: id, kind (`target`/`stop`/`level`/`percent`/`gap`/`stale`/
  `conflict`), tradeId, ruleId, symbol, price, level, at, provider, status,
  resolution, readAt, createdAt.

Existing models gain:

- `Trade`: `autoClose` (default false), `binanceSymbol`, `coingeckoId`.
- `Asset`: `autoPrice` (default true for crypto), `binanceSymbol`, `coingeckoId`.
- `Preferences`: `priceProvider` (default `auto`), `autoCloseByDefault` (default
  false), `notificationsEnabled` (default false), `backgroundMonitoring` (default
  false), `windowsCloseBehavior` (default `unset`).
- A separate `marketApiKey` settings row for the optional CoinGecko key. It is
  never exported and never logged.

### Backup and migration

- `BACKUP_SCHEMA_VERSION` becomes 3. The export includes trades, assets,
  preferences, alert rules and alert history.
- The CoinGecko key, price cache, symbol lists and native queue are excluded.
- v1 and v2 backups import with defaults: auto-close off, auto-price on for
  crypto assets, no provider mappings, no rules or history.
- Dexie v3 is additive. Existing rows are backfilled with safe defaults.
- Restoring a v3 backup into a v2 app is not supported; rollback requires a
  pre-v0.5 backup (see Risks).

### Security and privacy

- No server, no account, no analytics, no third-party script.
- Only fixed HTTPS provider hosts are contacted; no user-supplied URLs.
- The optional key is stored locally in IndexedDB, masked in the UI, excluded
  from backups, and never written to logs or the native snapshot if the engine
  does not need it. (It does need it for CoinGecko background polling, so the
  snapshot contains it in the app-private data directory; it is never exported.)
- Provider responses are validated and bounded before use.
- Rate limits and backoff protect both the provider and the user's IP.
- Notifications may reveal position information on a lock screen; v0.5 has no
  privacy mode. This is documented as a known tradeoff.

### Platform specifics

- Android: minSdk stays 24. WorkManager and OkHttp are added to
  `gen/android/app/build.gradle.kts`; POST_NOTIFICATIONS is declared; the worker
  class is kept by R8. `MainActivity.kt` handles the notification tap intent and
  routes to Alerts. The existing edge-to-edge and system-bar bridge stay intact.
- Windows: `tauri-plugin-notification` is added for native notifications; the
  tray icon and close interception live in `src-tauri/src/lib.rs`; the timer lives
  in `src-tauri/src/background.rs`.
- PWA: no new service-worker background behavior. The existing prompt-mode
  update banner is untouched.

## Risks + rollback

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Android WorkManager is delayed by Doze or battery optimization | Alerts can arrive later than 15 minutes | Status strip shows the last run; document the limitation; no promise of exact timing |
| Provider geo-blocking or outage | No prices or alerts | Auto fallback, backoff, status strip, manual provider override |
| Duplicate evaluator logic in web, Kotlin and Rust drifts | Different alert behavior per platform | Shared JSON contract, shared test vectors, webview remains authoritative on import |
| Native snapshot and Dexie drift | Stale or wrong background rules | Snapshot rewritten on every change and on startup; queued hits revalidated against the trade |
| False auto-close on bad data | Wrong trade history | Freshness guard, exact-level close, gap review, tag/note, editable trades |
| Dexie v3 cannot be downgraded | Rolling back the app after upgrade can fail | Require a backup before upgrade; document restore steps; keep the migration additive |
| Notification permission denied | No OS notifications | In-app inbox and badge always work; no repeated prompts |
| WebView2 tray throttling | Windows alerts stop while hidden | Rust-side timer, not the WebView |
| Symbol ambiguity | Wrong coin priced | Picker, stored provider IDs, visible mapping status |
| CoinGecko keyless limit | 429s during heavy use | Shared cache, 6 req/min bucket, fallback, backoff |
| Backup size growth | Slow export/import | History capped at 500 events; cache and symbol lists excluded |

Rollback:

1. Turn off background monitoring and auto-close; alerts remain in-app.
2. Restore a pre-v0.5 backup if the database must go back to v2, then reinstall
   the previous app version. A v3 database is not readable by a v2 build.
3. No server-side state exists to roll back.
4. Android WorkManager is cancelled when monitoring is disabled; the Windows tray
   timer stops when monitoring is off or the app quits.

## Dependencies / ordering

1. Data model, Dexie v3 migration and backup v3.
2. Provider adapters, symbol resolution and the price cache.
3. Scheduler, budgets and status reporting.
4. Portfolio auto-price and new-trade prefill.
5. Alert evaluator and Alerts tab.
6. Auto-close, gap/stale/conflict review and trade annotations.
7. In-app notifications, permission flow and grouped OS notifications.
8. Native snapshot/queue, Android WorkManager and Windows tray.
9. Backup, docs, i18n, a11y, screenshots and release.

The native background work depends on the snapshot contract, which depends on the
final trade/rule models. The Alerts UI depends on the evaluator and repositories.
The release depends on all of the above plus the existing CI gates.

## Open questions

None. Every decision above is `decided` or `assumed`, and the assumed items are
flagged in the log for review.
