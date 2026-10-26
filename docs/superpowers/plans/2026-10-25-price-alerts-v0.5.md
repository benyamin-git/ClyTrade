# Price Alerts & Auto-Close — Implementation Plan (v0.5.0)

**Spec:** [`docs/superpowers/specs/2026-10-25-price-alerts-v0.5-design.md`](../specs/2026-10-25-price-alerts-v0.5-design.md)
**Status:** Approved
**Date:** 2026-10-25

## Global constraints

Copied from the approved spec; every task must respect these.

- Version is `0.5.0`. No server, no account, no new port and no dashboard entry.
- Live prices cover **crypto only**. Forex, stocks, futures, commodities, indices and
  options stay manual.
- `src/calculations/**` is untouched. Calculations stay pure and never import React,
  DOM, Dexie or i18n.
- Dexie schema v3 is additive. Backup schema v3 imports v1/v2 files.
- The CoinGecko key, price cache, symbol lists and native queue are excluded from
  backups.
- Provider budgets: Binance 60 requests/min and 1,200 weight/min; CoinGecko keyless
  6 requests/min; keyed 30 requests/min and 10k/month.
- Refresh rules: list 5 minutes, detail 30 seconds, foreground timer 5 minutes,
  manual cooldown 60 seconds.
- Stale threshold is 15 minutes. Stale prices never alert or close.
- Alert history keeps the last 500 events.
- Background monitoring is off by default.
- Android polls with WorkManager every 15 minutes. Windows polls with a Rust timer
  every 5 minutes while tray-resident.
- All user-facing text is added to both `src/i18n/en.ts` and `src/i18n/fa.ts`.
- Documentation bodies are added in both `src/docs/en/` and `src/docs/fa/`.
- TypeScript strict, `noUncheckedIndexedAccess`, semantic Tailwind utilities,
  logical direction utilities, no raw hex.
- Do not add code comments unless asked. Do not hand-edit generated files except
  the documented native customizations.
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and
  `npm run format:check` before the release task.

## Task index

| #   | Phase         | Task                                              | Commit                                                     |
| --- | ------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| 1   | Data          | Models, Dexie v3 and sample data                  | `feat(data): add price and alert models with Dexie v3`     |
| 2   | Data          | Price and alert repositories                      | `feat(data): add price and alert repositories`             |
| 3   | Data          | Backup v3                                         | `feat(data): include alerts in backup schema v3`           |
| 4   | Market        | Provider contract and Binance adapter             | `feat(market): add the Binance price adapter`              |
| 5   | Market        | CoinGecko adapter                                 | `feat(market): add the CoinGecko price adapter`            |
| 6   | Market        | Symbol cache, resolution and picker               | `feat(market): resolve symbols with a cached provider list` |
| 7   | Market        | Budgets and shared scheduler                      | `feat(market): add the shared price scheduler`             |
| 8   | Settings      | Market preferences and optional key               | `feat(settings): add market data preferences`              |
| 9   | Portfolio     | Price hook and automatic portfolio prices         | `feat(portfolio): track crypto prices automatically`       |
| 10  | Portfolio     | Asset auto-price toggle, picker and prefill       | `feat(portfolio): add auto-price and symbol mapping`       |
| 11  | Journal       | Entry prefill, auto-close toggle and picker       | `feat(journal): prefill entry price and add auto-close`    |
| 12  | Alerts        | Pure evaluator                                   | `feat(market): evaluate price alerts and auto-close`       |
| 13  | Alerts        | Engine, auto-close and review items               | `feat(market): run alerts and apply auto-close`            |
| 14  | Alerts        | Alerts tab, routing and badge                     | `feat(alerts): add the Alerts tab`                         |
| 15  | Alerts        | Rule form and CRUD                                | `feat(alerts): create and edit alert rules`                |
| 16  | Alerts        | Lists, status strip, history and review           | `feat(alerts): show rules, history and review items`       |
| 17  | Alerts        | Grouped notifications                             | `feat(alerts): send grouped notifications`                 |
| 18  | Background    | Snapshot, queue and import bridge                 | `feat(market): sync background snapshots and queued hits`  |
| 19  | Native        | Windows tray and first-close prompt               | `feat(native): add the Windows tray and close prompt`      |
| 20  | Native        | Windows Rust timer and notifications              | `feat(native): poll prices from the Windows tray`          |
| 21  | Native        | Android WorkManager polling                      | `feat(android): poll prices with WorkManager`              |
| 22  | Native        | Android notifications, permission and tap         | `feat(android): notify from background and open Alerts`    |
| 23  | Background    | Background controls UI                            | `feat(alerts): add background monitoring controls`         |
| 24  | Localization  | English and Persian keys                          | `feat(i18n): translate price alerts`                       |
| 25  | Docs          | Documentation, README, AGENTS and changelog       | `docs: document price alerts and auto-close`               |
| 26  | Verification  | Tests, a11y and screenshots                       | `test(alerts): cover alerts, background and a11y`          |
| 27  | Release       | Version 0.5.0 and release notes                   | `chore(release): 0.5.0`                                    |

---

## Phase 1 — Data

### Task 1 — Models, Dexie v3 and sample data

**Goal:** add the new fields and tables with safe defaults and a v2→v3 migration.

**Files**

- Create `src/data/models/price.ts`
- Modify `src/data/models/trade.ts`
- Modify `src/data/models/asset.ts`
- Modify `src/data/models/settings.ts`
- Modify `src/data/db.ts`
- Modify `src/data/sampleData.ts`
- Modify `src/data/sampleData.test.ts`
- Modify `src/data/db.test.ts`
- Modify `src/data/models/settings.test.ts`
- Create `src/data/models/price.test.ts`

**Interfaces**

```ts
// src/data/models/price.ts
export const priceProviderSchema = z.enum(['binance', 'coingecko'])
export type PriceProviderId = z.infer<typeof priceProviderSchema>

export const priceProviderChoiceSchema = z.enum(['auto', 'binance', 'coingecko'])
export type PriceProviderChoice = z.infer<typeof priceProviderChoiceSchema>

export const priceCacheEntrySchema = z.object({
  key: z.string(), // `${provider}:${priceId}`
  symbol: z.string(),
  provider: priceProviderSchema,
  price: z.number().positive(),
  fetchedAt: z.number(),
  sourceTimestamp: z.number().nullable(),
})
export type PriceCacheEntry = z.infer<typeof priceCacheEntrySchema>

export const marketSymbolSchema = z.object({
  id: z.string(), // `${provider}:${symbol}`
  provider: priceProviderSchema,
  symbol: z.string(),
  name: z.string().nullable(),
  quote: z.string().nullable(),
  rank: z.number().int().nullable(),
  updatedAt: z.number(),
})
export type MarketSymbol = z.infer<typeof marketSymbolSchema>

export const alertRepeatSchema = z.enum(['once', 'cross-back', 'cooldown'])
export type AlertRepeat = z.infer<typeof alertRepeatSchema>

export const alertPriceModeSchema = z.enum(['above', 'below', 'crossing', 'range'])
export type AlertPriceMode = z.infer<typeof alertPriceModeSchema>

export const alertPercentDirectionSchema = z.enum(['up', 'down', 'both'])
export type AlertPercentDirection = z.infer<typeof alertPercentDirectionSchema>

export const priceAlertSchema = z.object({
  id: z.string(),
  kind: z.enum(['price', 'percent']),
  symbol: z.string().min(1),
  binanceSymbol: z.string().nullable(),
  coingeckoId: z.string().nullable(),
  priceMode: alertPriceModeSchema.nullable(),
  level: z.number().positive().nullable(),
  rangeLow: z.number().positive().nullable(),
  rangeHigh: z.number().positive().nullable(),
  percent: z.number().positive().nullable(),
  percentDirection: alertPercentDirectionSchema.nullable(),
  repeat: alertRepeatSchema,
  cooldownMinutes: z.number().int().min(15).max(1440),
  referencePrice: z.number().positive().nullable(),
  lastPrice: z.number().positive().nullable(),
  armed: z.boolean(),
  enabled: z.boolean(),
  note: z.string().nullable(),
  lastFiredAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type PriceAlert = z.infer<typeof priceAlertSchema>
export type PriceAlertDraft = Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'>

export const alertEventKindSchema = z.enum([
  'target',
  'stop',
  'level',
  'percent',
  'gap',
  'stale',
  'conflict',
])
export type AlertEventKind = z.infer<typeof alertEventKindSchema>

export const alertEventStatusSchema = z.enum(['unread', 'read', 'resolved', 'dismissed'])
export type AlertEventStatus = z.infer<typeof alertEventStatusSchema>

export const alertResolutionSchema = z.enum(['target', 'stop', 'edit', 'dismiss'])
export type AlertResolution = z.infer<typeof alertResolutionSchema>

export const alertEventSchema = z.object({
  id: z.string(),
  kind: alertEventKindSchema,
  tradeId: z.string().nullable(),
  ruleId: z.string().nullable(),
  symbol: z.string(),
  price: z.number().positive(),
  level: z.number().positive().nullable(),
  at: z.number(),
  provider: priceProviderSchema.nullable(),
  status: alertEventStatusSchema,
  resolution: alertResolutionSchema.nullable(),
  readAt: z.number().nullable(),
  createdAt: z.number(),
})
export type AlertEvent = z.infer<typeof alertEventSchema>
export type AlertEventDraft = Omit<AlertEvent, 'id' | 'createdAt'>
```

`Trade` gains:

```ts
autoClose: z.boolean().default(false),
binanceSymbol: z.string().nullable().default(null),
coingeckoId: z.string().nullable().default(null),
```

`Asset` gains:

```ts
autoPrice: z.boolean().default(false),
binanceSymbol: z.string().nullable().default(null),
coingeckoId: z.string().nullable().default(null),
```

`Preferences` gains:

```ts
priceProvider: priceProviderChoiceSchema.default('auto'),
autoCloseByDefault: z.boolean().default(false),
notificationsEnabled: z.boolean().default(false),
backgroundMonitoring: z.boolean().default(false),
windowsCloseBehavior: z.enum(['unset', 'tray', 'quit']).default('unset'),
```

`DEFAULT_PREFERENCES` gets `priceProvider: 'auto'`, `autoCloseByDefault: false`,
`notificationsEnabled: false`, `backgroundMonitoring: false`,
`windowsCloseBehavior: 'unset'`. `parsePreferences` repairs each new field.

Dexie v3 stores:

```ts
this.version(3).stores({
  trades: 'id, symbol, direction, status, openedAt, closedAt, updatedAt',
  assets: 'id, symbol, updatedAt',
  settings: 'key, updatedAt',
  priceCache: 'key, symbol, provider, fetchedAt',
  marketSymbols: 'id, provider, symbol, rank, updatedAt',
  priceAlerts: 'id, symbol, updatedAt, lastFiredAt',
  alertEvents: 'id, kind, tradeId, ruleId, symbol, at, status, readAt',
})
```

The v3 upgrade backfills existing trades with `autoClose: false`, `binanceSymbol:
null`, `coingeckoId: null`; existing assets with `autoPrice` true only when
`market === 'crypto'`, and null provider ids; existing preferences with the new
defaults.

`buildSampleData` adds the new fields to its `satisfies Trade` and `satisfies
Asset` objects. Sample crypto assets get `autoPrice: true`; sample trades get
`autoClose: false`.

**Verification**

```bash
npm run typecheck
npm test -- src/data/db.test.ts src/data/models/price.test.ts src/data/models/settings.test.ts src/data/sampleData.test.ts
npm run lint
```

Expected: all pass. `db.test.ts` opens a v2 database with a trade, asset and
preferences row, opens the v3 database, and asserts the defaults. `price.test.ts`
asserts schema defaults and rejects invalid percentages/cooldowns.

**Commit:** `feat(data): add price and alert models with Dexie v3`

---

### Task 2 — Price and alert repositories

**Goal:** typed Dexie access for the four new tables.

**Files**

- Create `src/data/repositories/prices.repo.ts`
- Create `src/data/repositories/alerts.repo.ts`
- Create `src/data/repositories/prices.repo.test.ts`
- Create `src/data/repositories/alerts.repo.test.ts`

**Interfaces**

```ts
// prices.repo.ts
export async function getPriceCache(key: string): Promise<PriceCacheEntry | undefined>
export async function listPriceCache(): Promise<PriceCacheEntry[]>
export async function putPriceCache(entries: PriceCacheEntry[]): Promise<void>
export async function clearPriceCache(): Promise<void>
export async function listMarketSymbols(provider: PriceProviderId): Promise<MarketSymbol[]>
export async function replaceMarketSymbols(
  provider: PriceProviderId,
  rows: MarketSymbol[],
): Promise<void>
export async function clearMarketSymbols(): Promise<void>

// alerts.repo.ts
export async function listAlerts(): Promise<PriceAlert[]>
export async function getAlert(id: string): Promise<PriceAlert | undefined>
export async function createAlert(draft: PriceAlertDraft): Promise<PriceAlert>
export async function updateAlert(id: string, patch: Partial<PriceAlertDraft>): Promise<void>
export async function deleteAlert(id: string): Promise<void>
export async function listAlertEvents(limit = 500): Promise<AlertEvent[]>
export async function createAlertEvent(draft: AlertEventDraft): Promise<AlertEvent>
export async function markAlertEventRead(id: string): Promise<void>
export async function markAllAlertEventsRead(): Promise<void>
export async function resolveAlertEvent(id: string, resolution: AlertResolution): Promise<void>
export async function pruneAlertEvents(keep = 500): Promise<void>
export async function clearAlertEvents(): Promise<void>
```

`createAlert` and `createAlertEvent` use `newId()` and `Date.now()`. `updateAlert`
rejects `undefined` values and re-parses with `priceAlertSchema`. `listAlertEvents`
orders by `at` descending and limits. `pruneAlertEvents` deletes everything older
than the newest `keep` rows. `resolveAlertEvent` sets `status: 'resolved'`,
`resolution`, and `readAt` if null.

**Verification**

```bash
npm run typecheck
npm test -- src/data/repositories/prices.repo.test.ts src/data/repositories/alerts.repo.test.ts
npm run lint
```

Expected: CRUD, ordering, 500-row pruning, and undefined-patch rejection pass.

**Commit:** `feat(data): add price and alert repositories`

---

### Task 3 — Backup v3

**Goal:** export and import alert rules and history, exclude secrets and caches,
and keep v1/v2 imports working.

**Files**

- Modify `src/data/backup.ts`
- Modify `src/data/models/backup-schemas.ts`
- Modify `src/data/backup.test.ts`
- Modify `src/features/settings/pages/DataControlsPage.tsx`
- Modify `src/features/settings/pages/DataControlsPage.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export const BACKUP_SCHEMA_VERSION = 3
export const MARKET_API_KEY = 'marketApiKey'
```

`backupSchema.data` gains `priceAlerts: z.array(priceAlertSchema).default([])` and
`alertEvents: z.array(alertEventSchema).default([])`. `exportBackup` reads
`listAlerts()` and `listAlertEvents()` and filters `settings` rows whose key is
`MARKET_API_KEY`. `parseBackup` strips any `marketApiKey` row from imported
settings, checks duplicate alert/event ids, and keeps the future-version check.
`importBackup` and `clearAllData` include `db.priceAlerts` and `db.alertEvents`.
The import success message adds the alert count.

**Verification**

```bash
npm run typecheck
npm test -- src/data/backup.test.ts src/features/settings/pages/DataControlsPage.test.tsx
npm run lint
```

Expected: v3 round-trip includes rules/history; v1/v2 still parse with empty
arrays; the key never appears in exported JSON; a v3 file with a key row imports
without restoring the key.

**Commit:** `feat(data): include alerts in backup schema v3`

---

## Phase 2 — Market infrastructure

### Task 4 — Provider contract and Binance adapter

**Goal:** one provider interface and the Binance implementation.

**Files**

- Create `src/market/types.ts`
- Create `src/market/providers/errors.ts`
- Create `src/market/providers/binance.ts`
- Create `src/market/providers/binance.test.ts`

**Interfaces**

```ts
// src/market/types.ts
export interface MarketRef {
  symbol: string
  binanceSymbol: string | null
  coingeckoId: string | null
}

export interface ProviderPrice {
  symbol: string
  provider: PriceProviderId
  price: number
  fetchedAt: number
  sourceTimestamp: number | null
}

export interface ProviderSymbol {
  provider: PriceProviderId
  symbol: string
  name: string | null
  quote: string | null
  rank: number | null
}

export interface MarketProvider {
  id: PriceProviderId
  fetchPrices(refs: MarketRef[], signal?: AbortSignal): Promise<ProviderPrice[]>
  fetchSymbols(): Promise<ProviderSymbol[]>
}
```

```ts
// src/market/providers/errors.ts
export type ProviderErrorKind = 'rate-limit' | 'blocked' | 'network' | 'invalid'
export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly provider: PriceProviderId
  constructor(kind: ProviderErrorKind, provider: PriceProviderId, message: string)
}
```

`binance.fetchPrices` keeps only refs with `binanceSymbol`, calls
`https://api.binance.com/api/v3/ticker/price?symbols=[...]`, validates each price
is finite and positive, and maps back to the canonical `symbol`. `fetchSymbols`
calls `/api/v3/exchangeInfo`, keeps `status === 'TRADING'` spot symbols, prefers
USDT quotes, and returns `ProviderSymbol[]` with `rank: null`.

**Verification**

```bash
npm run typecheck
npm test -- src/market/providers/binance.test.ts
npm run lint
```

Expected: batching, symbol mapping, invalid prices, 429/451/network errors and
abort signals are covered with a mocked `fetch`.

**Commit:** `feat(market): add the Binance price adapter`

---

### Task 5 — CoinGecko adapter

**Goal:** keyless and keyed CoinGecko support behind the same interface.

**Files**

- Create `src/market/providers/coingecko.ts`
- Create `src/market/providers/coingecko.test.ts`

**Interfaces**

```ts
export interface CoinGeckoOptions {
  apiKey?: string | null
  fetchImpl?: typeof fetch
}
export function createCoinGeckoProvider(options?: CoinGeckoOptions): MarketProvider
```

`fetchPrices` uses `/simple/price?ids=...&vs_currencies=usd`, adds the
`x-cg-demo-api-key` header only when a key is present, and validates prices.
`fetchSymbols` calls `/coins/list` and `/coins/markets?vs_currency=usd&per_page=250&page=1`
and merges the top-250 ranks into the list. A 429 maps to `rate-limit`; 401/403 to
`blocked`; malformed JSON to `invalid`.

**Verification**

```bash
npm run typecheck
npm test -- src/market/providers/coingecko.test.ts
npm run lint
```

Expected: keyless/keyed headers, batching, rank merge, invalid responses and
error mapping pass.

**Commit:** `feat(market): add the CoinGecko price adapter`

---

### Task 6 — Symbol cache, resolution and picker

**Goal:** resolve `BTC` to provider ids and let the user pick when ambiguous.

**Files**

- Create `src/market/symbols.ts`
- Create `src/market/symbols.test.ts`
- Create `src/market/useSymbolCandidates.ts`
- Create `src/ui/components/SymbolPicker.tsx`
- Create `src/ui/components/SymbolPicker.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export interface SymbolCandidate {
  provider: PriceProviderId
  symbol: string
  name: string | null
  quote: string | null
  rank: number | null
}

export async function refreshSymbolLists(
  providers: readonly MarketProvider[],
  now?: number,
): Promise<void>
export async function resolveSymbol(
  input: string,
  providers: readonly MarketProvider[],
  now?: number,
): Promise<SymbolCandidate[]>
export function pickPreferredCandidate(
  candidates: readonly SymbolCandidate[],
): SymbolCandidate | null
```

`refreshSymbolLists` skips a provider whose `marketSymbols` rows are under seven
days old, otherwise calls `fetchSymbols()` and replaces that provider's rows.
`resolveSymbol` uppercases and trims the input, reads cached rows, and returns
exact symbol matches first, then USDT-quoted Binance matches, then ranked
CoinGecko matches. `pickPreferredCandidate` returns the first candidate only when
there is exactly one plausible match or one clearly ranked winner; otherwise the
caller shows the picker.

`SymbolPicker` is a controlled component:

```ts
export interface SymbolPickerProps {
  label: string
  candidates: readonly SymbolCandidate[]
  value: SymbolCandidate | null
  onChange: (candidate: SymbolCandidate | null) => void
  disabled?: boolean
}
```

It uses the existing `SelectField`/`Field` primitives, displays `symbol — name`
and provider, and has an accessible label.

**Verification**

```bash
npm run typecheck
npm test -- src/market/symbols.test.ts src/ui/components/SymbolPicker.test.tsx
npm run lint
```

Expected: seven-day cache, ambiguity detection, preferred USDT match, picker
keyboard and label behavior pass.

**Commit:** `feat(market): resolve symbols with a cached provider list`

---

### Task 7 — Budgets and shared scheduler

**Goal:** one scheduler that deduplicates requests, enforces budgets and exposes
status.

**Files**

- Create `src/market/budget.ts`
- Create `src/market/scheduler.ts`
- Create `src/market/budget.test.ts`
- Create `src/market/scheduler.test.ts`

**Interfaces**

```ts
export interface BudgetConfig {
  maxRequestsPerMinute: number
  maxWeightPerMinute: number
  minSpacingMs: number
}
export interface TokenBucket {
  canSpend(weight: number, now: number): boolean
  spend(weight: number, now: number): void
  nextAvailableAt(weight: number, now: number): number
}
export function createTokenBucket(config: BudgetConfig): TokenBucket

export type PriceRequestReason =
  | 'portfolio'
  | 'journal'
  | 'detail'
  | 'timer'
  | 'manual'
  | 'alerts'

export interface SchedulerStatus {
  provider: PriceProviderChoice
  activeProvider: PriceProviderId | null
  lastSuccessAt: number | null
  nextAllowedAt: number | null
  error: string | null
}

export interface PriceScheduler {
  request(refs: readonly MarketRef[], reason: PriceRequestReason): Promise<ProviderPrice[]>
  refreshNow(refs: readonly MarketRef[]): Promise<ProviderPrice[]>
  getStatus(): SchedulerStatus
  subscribe(listener: (status: SchedulerStatus) => void): () => void
  dispose(): void
}

export interface SchedulerOptions {
  providers: readonly MarketProvider[]
  providerChoice: PriceProviderChoice
  coingeckoKey?: string | null
  now?: () => number
  readCache?: (key: string) => Promise<PriceCacheEntry | undefined>
  writeCache?: (entries: readonly PriceCacheEntry[]) => Promise<void>
}
export function createPriceScheduler(options: SchedulerOptions): PriceScheduler
```

TTLs: `portfolio`/`journal`/`timer`/`alerts` 5 minutes, `detail` 30 seconds,
`manual` 60 seconds. The in-flight map is keyed by provider id. Budgets are
per-provider token buckets. On `ProviderError`, the scheduler backs off 30s, 1m,
2m, 5m, 15m with jitter and, in Auto mode, tries the other provider. Pinned
providers do not fall back. Status listeners fire on success, error and budget
exhaustion.

**Verification**

```bash
npm run typecheck
npm test -- src/market/budget.test.ts src/market/scheduler.test.ts
npm run lint
```

Expected: fake-timer tests cover TTLs, in-flight dedupe, budget exhaustion, manual
cooldown, fallback and backoff. No live network.

**Commit:** `feat(market): add the shared price scheduler`

---

### Task 8 — Market preferences and optional key

**Goal:** expose provider, key and auto-close defaults without exporting the key.

**Files**

- Modify `src/data/repositories/settings.repo.ts`
- Modify `src/features/settings/pages/PreferencesPage.tsx`
- Modify `src/features/settings/pages/PreferencesPage.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export const MARKET_API_KEY = 'marketApiKey'
export async function getMarketApiKey(): Promise<string | null>
export async function setMarketApiKey(key: string | null): Promise<void>
```

The Preferences "Market data" card contains:

- `SelectField` for `priceProvider` with `auto`, `binance`, `coingecko`.
- A password-style `TextField` for the CoinGecko key, with show/hide and clear.
- A `SegmentedControl` for `autoCloseByDefault` (included/excluded, matching the
  existing pattern).
- A read-only notification permission status line.
- The existing footer note and version line.

The key field saves on blur/change through `setMarketApiKey`; an empty value
clears the row.

**Verification**

```bash
npm run typecheck
npm test -- src/features/settings/pages/PreferencesPage.test.tsx
npm run lint
```

Expected: provider change persists, key save/clear works, auto-close default
persists, and the key is absent from `exportBackup()`.

**Commit:** `feat(settings): add market data preferences`

---

## Phase 3 — Portfolio and journal

### Task 9 — Price hook and automatic portfolio prices

**Goal:** refresh crypto assets on the Portfolio tab and write fresh prices back.

**Files**

- Create `src/market/usePrices.ts`
- Create `src/features/portfolio/logic/autoPrice.ts`
- Modify `src/features/portfolio/pages/PortfolioOverviewPage.tsx`
- Modify `src/features/portfolio/pages/PortfolioOverviewPage.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export interface UsePricesResult {
  prices: ReadonlyMap<string, ProviderPrice>
  status: SchedulerStatus
  refresh: () => Promise<void>
}
export function usePrices(refs: readonly MarketRef[], reason: PriceRequestReason): UsePricesResult

export function shouldWriteAutoPrice(
  asset: Asset,
  price: ProviderPrice | undefined,
  now: number,
  staleMs: number,
): boolean
```

`usePrices` creates the scheduler once per provider choice, requests on mount and
on ref changes, and subscribes to status. It disposes on unmount. `autoPrice`
writes `updateAsset(id, { currentPrice: price.price })` only when the asset is
crypto, `autoPrice` is true, the price is fresh, the price differs from
`currentPrice`, and the last write was not for the same `fetchedAt`. A ref map
prevents write loops.

Portfolio rows show the price timestamp and a stale badge when the cached price is
older than 15 minutes. The table keeps the manual "at cost" fallback when
`currentPrice` is null.

**Verification**

```bash
npm run typecheck
npm test -- src/features/portfolio/pages/PortfolioOverviewPage.test.tsx src/features/portfolio/logic/autoPrice.test.ts
npm run lint
```

Expected: fresh crypto prices update once, manual assets do not, stale prices do
not write, and the badge appears.

**Commit:** `feat(portfolio): track crypto prices automatically`

---

### Task 10 — Asset auto-price toggle, picker and prefill

**Goal:** let each asset opt into automatic prices and map its provider symbol.

**Files**

- Modify `src/features/portfolio/components/AssetFormSheet.tsx`
- Modify `src/features/portfolio/components/AssetFormSheet.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

`AssetFormSheet` state adds `autoPrice: boolean`, `binanceSymbol: string | null`,
`coingeckoId: string | null`. The draft includes them. New crypto assets default
`autoPrice` to true; non-crypto default false. The form shows a `SymbolPicker`
when `resolveSymbol` returns more than one candidate, and a "price unavailable"
hint when no mapping exists. When a fresh price is available and `currentPrice` is
empty, it prefills `currentPrice`.

**Verification**

```bash
npm run typecheck
npm test -- src/features/portfolio/components/AssetFormSheet.test.tsx
npm run lint
```

Expected: toggle default by market, mapping persists, ambiguous picker, prefill
only when empty, save round-trip.

**Commit:** `feat(portfolio): add auto-price and symbol mapping`

---

### Task 11 — Journal entry prefill, auto-close toggle and picker

**Goal:** prefill new trade entries and expose the per-trade auto-close toggle.

**Files**

- Modify `src/features/journal/components/TradeFormSheet.tsx`
- Modify `src/features/journal/components/TradeFormSheet.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

`TradeFormSheet` state adds `autoClose: boolean`, `binanceSymbol: string | null`,
`coingeckoId: string | null`. New trades default `autoClose` to
`preferences.autoCloseByDefault`; edits keep the stored value. The form shows a
`SymbolPicker` for ambiguous mappings and a current-price hint. For a new trade,
if `entryPrice` is null and a fresh price exists, it sets `entryPrice` once. It
never overwrites a value the user typed.

**Verification**

```bash
npm run typecheck
npm test -- src/features/journal/components/TradeFormSheet.test.tsx
npm run lint
```

Expected: default from preferences, prefill once, manual entry preserved,
mapping persists, save round-trip.

**Commit:** `feat(journal): prefill entry price and add auto-close`

---

## Phase 4 — Alerts engine and UI

### Task 12 — Pure evaluator

**Goal:** a pure, table-driven evaluator for trade levels, custom rules and
percent moves.

**Files**

- Create `src/market/evaluate.ts`
- Create `src/market/evaluate.test.ts`
- Create `src/market/fixtures/evaluation-cases.json`

**Interfaces**

```ts
export interface EvaluationInput {
  now: number
  prices: ReadonlyMap<string, ProviderPrice>
  trades: readonly Trade[]
  rules: readonly PriceAlert[]
  staleMs: number
}
export interface AutoCloseDraft {
  tradeId: string
  level: number
  reason: 'target' | 'stop'
  at: number
  price: number
}
export interface AlertRuleUpdate {
  id: string
  patch: Partial<PriceAlert>
}
export interface EvaluationResult {
  events: AlertEventDraft[]
  closes: AutoCloseDraft[]
  reviews: AlertEventDraft[]
  ruleUpdates: AlertRuleUpdate[]
}
export function evaluatePrices(input: EvaluationInput): EvaluationResult
```

Rules:

- Skip trades that are not open, and trades without a price or with a stale price.
- Long target `price >= target`, long stop `price <= stop`; short reversed.
- If both levels hit in one evaluation, emit one `gap` review and no close.
- If one level hits and `autoClose` is on, emit a close and a `target`/`stop`
  event. If auto-close is off, emit only the event.
- Custom price modes: above, below, crossing (requires `lastPrice` on the other
  side), range exit.
- Percent: `(price - referencePrice) / referencePrice * 100`, direction up/down/
  both.
- Repeat: `once` disables; `cross-back` re-arms when the price returns to the
  other side; `cooldown` allows the next fire after `cooldownMinutes`.
- Stale price at a crossed level emits a `stale` review once; the engine dedupes.
- The evaluator never writes data and never imports React, Dexie or i18n.

`evaluation-cases.json` is a shared fixture with named cases. The web tests load
it; the Kotlin and Rust tests reuse the same values in Task 20/21.

**Verification**

```bash
npm run typecheck
npm test -- src/market/evaluate.test.ts
npm run lint
```

Expected: every fixture case passes, including long/short, gap, stale, all price
modes, percent directions and all repeat modes.

**Commit:** `feat(market): evaluate price alerts and auto-close`

---

### Task 13 — Engine, auto-close and review items

**Goal:** connect the evaluator to Dexie, apply closes, dedupe events and prune
history.

**Files**

- Create `src/market/engine.ts`
- Create `src/market/engine.test.ts`
- Modify `src/data/repositories/trades.repo.ts` if a small `applyAutoClose` helper
  is needed

**Interfaces**

```ts
export interface EngineOptions {
  now?: number
  note: (input: {
    symbol: string
    level: number
    reason: 'target' | 'stop'
    at: number
    price: number
  }) => string
}
export interface EvaluationSummary {
  events: number
  closes: number
  reviews: number
}
export async function runAlertEvaluation(options: EngineOptions): Promise<EvaluationSummary>
```

`runAlertEvaluation` loads open trades, alerts and cached prices, calls
`evaluatePrices`, writes events with `createAlertEvent`, applies each close with
`updateTrade` (`status: 'closed'`, `exitPrice: level`, `closedAt: at`,
`tags` including `auto-closed`, `notes` with the generated note), updates rule
state with `updateAlert`, prunes to 500, and returns the summary. It dedupes a
target/stop event when an unresolved event with the same trade/rule and level
already exists, a gap review by trade and both levels, and a stale review by
owner and stale price; dismissed gap/stale reviews stay suppressed until that
condition changes. Level and percent events are not deduped because the
evaluator's repeat state already controls them.

**Verification**

```bash
npm run typecheck
npm test -- src/market/engine.test.ts
npm run lint
```

Expected: close writes the exact level and note, stats see the closed trade, gap
creates a review with no close, duplicate events are suppressed, history prunes.

**Commit:** `feat(market): run alerts and apply auto-close`

---

### Task 14 — Alerts tab, routing and badge

**Goal:** a fifth top-level tab with an unread badge and a single overview page.

**Files**

- Modify `src/navigation/types.ts`
- Modify `src/navigation/tabs.ts`
- Modify `src/app/shell/SubTabBar.tsx`
- Modify `src/app/shell/NavDrawer.tsx`
- Modify `src/app/shell/TopBar.tsx` (optional unread dot)
- Modify `src/app/shell/NavDrawer.test.tsx`
- Modify `src/app/router.test.ts`
- Create `src/features/alerts/pages/AlertsPage.tsx`
- Create `src/features/alerts/logic/useUnreadAlertCount.ts`
- Create `src/features/alerts/pages/AlertsPage.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export type TabId = 'journal' | 'portfolio' | 'alerts' | 'calculations' | 'settings'
```

The Alerts tab uses the `Bell` icon, path `/alerts`, label `nav.alerts`, and one
subtab `overview` at `/alerts/overview`. `SubTabBar` returns `null` when a tab has
fewer than two subtabs, so the Alerts page has no redundant bar. `NavDrawer` shows
the unread count next to the Alerts item. `TopBar` shows a small unread dot when
the current tab is not Alerts. `useUnreadAlertCount` reads `listAlertEvents()` and
counts `status === 'unread'`.

`AlertsPage` initially renders the status strip, an empty rules section, a review
section and a history section; the content lands in Tasks 15 and 16.

**Verification**

```bash
npm run typecheck
npm test -- src/app/router.test.ts src/app/shell/NavDrawer.test.tsx src/features/alerts/pages/AlertsPage.test.tsx
npm run lint
```

Expected: `/alerts` redirects to `/alerts/overview`, the drawer shows the tab and
badge, the subtab bar is hidden, and the page renders its four regions.

**Commit:** `feat(alerts): add the Alerts tab`

---

### Task 15 — Rule form and CRUD

**Goal:** create, edit, pause and delete custom price and percent rules.

**Files**

- Create `src/features/alerts/components/AlertRuleFormSheet.tsx`
- Create `src/features/alerts/components/AlertRuleFormSheet.test.tsx`
- Create `src/features/alerts/logic/alertForm.ts`
- Create `src/features/alerts/logic/alertForm.test.ts`
- Modify `src/features/alerts/pages/AlertsPage.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export interface AlertFormValues {
  kind: 'price' | 'percent'
  symbol: string
  candidate: SymbolCandidate | null
  priceMode: AlertPriceMode | null
  level: number | null
  rangeLow: number | null
  rangeHigh: number | null
  percent: number | null
  percentDirection: AlertPercentDirection | null
  repeat: AlertRepeat
  cooldownMinutes: number
  note: string
}
export function validateAlertForm(values: AlertFormValues): string | null
export function toAlertDraft(values: AlertFormValues, now: number): PriceAlertDraft
```

The form uses a `SegmentedControl` for price/percent, a `SymbolPicker` for the
coin, a `SelectField` for the price mode or percent direction, `NumberField`s for
levels/range/percent, a repeat selector, a cooldown `NumberField` shown only for
`cooldown`, and a note `TextField`. `toAlertDraft` sets `referencePrice` to the
current cached price for percent rules, `armed: true`, `enabled: true`,
`lastFiredAt: null`, and the selected provider ids. Validation rejects a range
whose low is not below high, a percent over 1000, and a cooldown outside 15–1440.

**Verification**

```bash
npm run typecheck
npm test -- src/features/alerts/components/AlertRuleFormSheet.test.tsx src/features/alerts/logic/alertForm.test.ts
npm run lint
```

Expected: all three price modes, percent up/down/both, repeat modes, validation and
round-trip save pass.

**Commit:** `feat(alerts): create and edit alert rules`

---

### Task 16 — Lists, status strip, history and review

**Goal:** the full Alerts page: active rules, review actions, history and provider
status.

**Files**

- Create `src/features/alerts/components/AlertStatusStrip.tsx`
- Create `src/features/alerts/components/AlertRuleList.tsx`
- Create `src/features/alerts/components/AlertReviewList.tsx`
- Create `src/features/alerts/components/AlertHistory.tsx`
- Modify `src/features/alerts/pages/AlertsPage.tsx`
- Create `src/features/alerts/pages/AlertsPage.test.tsx` (extend)
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

- `AlertStatusStrip` props: `status: SchedulerStatus`, `onRefresh: () => void`,
  `refreshing: boolean`.
- `AlertRuleList` props: `rules: readonly PriceAlert[]`, `trades: readonly Trade[]`,
  `onEdit(rule)`, `onDelete(rule)`, `onToggle(rule)`.
- `AlertReviewList` props: `events: readonly AlertEvent[]`, `onCloseAt(event,
  'target' | 'stop')`, `onEdit(event)`, `onDismiss(event)`.
- `AlertHistory` props: `events: readonly AlertEvent[]`, `onMarkAllRead()`,
  `onFilter(kind)`.

Trade-derived target/stop rows are read-only and link to the trade edit sheet.
Review actions call `resolveAlertEvent` and, for closes, `updateTrade` with the
chosen level. Dismiss sets `status: 'dismissed'`. History shows the last 500,
supports an "all/unread" filter and a mark-all-read action. The manual Refresh
button calls `scheduler.refreshNow` and is disabled while the cooldown is active.

**Verification**

```bash
npm run typecheck
npm test -- src/features/alerts/pages/AlertsPage.test.tsx
npm run lint
```

Expected: rules render, toggle/delete work, review actions close or dismiss, history
marks read, refresh cooldown disables the button.

**Commit:** `feat(alerts): show rules, history and review items`

---

### Task 17 — Grouped notifications

**Goal:** one grouped OS notification per evaluation, plus in-app events.

**Files**

- Create `src/features/alerts/logic/notifications.ts`
- Create `src/features/alerts/logic/notifications.test.ts`
- Create `src/features/alerts/logic/useNotificationPermission.ts`
- Create `src/features/alerts/logic/useNotificationPermission.test.ts`
- Modify `src/features/alerts/pages/AlertsPage.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export interface NotificationPayload {
  title: string
  body: string
  tag: string
}
export function buildGroupedNotification(
  events: readonly AlertEvent[],
  t: Translator,
): NotificationPayload | null
export async function showNotification(payload: NotificationPayload): Promise<void>
export function useNotificationPermission(): {
  permission: 'default' | 'granted' | 'denied' | 'unsupported'
  request: () => Promise<boolean>
}
```

`buildGroupedNotification` returns null for no events, otherwise a title
("ClyTrade alerts") and a body listing up to five symbols/levels with a "+N more"
suffix. `showNotification` uses the web `Notification` API on the PWA and
`@tauri-apps/plugin-notification` on native builds, imported dynamically. The
permission hook uses the plugin on native and `Notification.requestPermission` on
web. The PWA notification `onclick` focuses the window and navigates to
`/alerts/overview`; native routing is handled in Tasks 20 and 22.

**Verification**

```bash
npm run typecheck
npm test -- src/features/alerts/logic/notifications.test.ts src/features/alerts/logic/useNotificationPermission.test.ts
npm run lint
```

Expected: grouping, empty input, permission states and web/native branching pass
with mocks.

**Commit:** `feat(alerts): send grouped notifications`

---

## Phase 5 — Background

### Task 18 — Snapshot, queue and import bridge

**Goal:** publish rules to native code and import background hits on launch.

**Files**

- Create `src/market/background.ts`
- Create `src/market/background.test.ts`
- Create `src/market/backgroundImport.ts`
- Create `src/market/backgroundImport.test.ts`
- Create `src/features/alerts/logic/useBackgroundSync.ts`
- Create `src/features/alerts/logic/useBackgroundSync.test.tsx`
- Create `src/lib/native.ts`
- Create `src/lib/native.test.ts`
- Modify `src/app/AppRoot.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

```ts
export interface BackgroundTrade {
  id: string
  symbol: string
  direction: 'long' | 'short'
  targetPrice: number | null
  stopPrice: number | null
  autoClose: boolean
  binanceSymbol: string | null
  coingeckoId: string | null
  updatedAt: number
}
export interface BackgroundRule {
  id: string
  symbol: string
  kind: 'price' | 'percent'
  priceMode: AlertPriceMode | null
  level: number | null
  rangeLow: number | null
  rangeHigh: number | null
  percent: number | null
  percentDirection: AlertPercentDirection | null
  repeat: AlertRepeat
  cooldownMinutes: number
  referencePrice: number | null
  lastPrice: number | null
  armed: boolean
  lastFiredAt: number | null
  binanceSymbol: string | null
  coingeckoId: string | null
  updatedAt: number
}
export interface BackgroundSnapshot {
  version: 1
  generatedAt: number
  locale: 'en' | 'fa'
  provider: PriceProviderChoice
  coingeckoKey: string | null
  backgroundMonitoring: boolean
  windowsCloseBehavior: 'unset' | 'tray' | 'quit'
  staleMs: number
  notification: { title: string; body: string }
  trades: BackgroundTrade[]
  rules: BackgroundRule[]
}
export interface BackgroundEvent {
  id: string
  kind: AlertEventKind
  tradeId: string | null
  ruleId: string | null
  symbol: string
  price: number
  level: number | null
  at: number
  provider: PriceProviderId
}
export async function writeBackgroundSnapshot(snapshot: BackgroundSnapshot): Promise<void>
export async function readBackgroundEvents(): Promise<BackgroundEvent[]>
export async function clearBackgroundEvents(): Promise<void>
export async function importBackgroundEvents(
  events: readonly BackgroundEvent[],
  now: number,
): Promise<{ imported: number; closed: number; reviews: number }>
```

`writeBackgroundSnapshot` invokes `write_background_snapshot` on Windows and calls
`ClyTradeNative.writeBackgroundSnapshot(JSON.stringify(snapshot))` on Android; it
is a no-op on the PWA. `readBackgroundEvents`/`clearBackgroundEvents` mirror that
split. `importBackgroundEvents` creates `alertEvents`, applies a queued close only
when the hit is under 24 hours old and the trade's target, stop, direction and
status still match, and otherwise creates a `conflict` review. `useBackgroundSync`
mounts in `AppRoot`, writes the snapshot on trade/rule/preference changes
(debounced 500 ms), imports events on mount and on visibility resume, then clears
the queue.

**Verification**

```bash
npm run typecheck
npm test -- src/market/background.test.ts src/market/backgroundImport.test.ts src/features/alerts/logic/useBackgroundSync.test.tsx src/lib/native.test.ts
npm run lint
```

Expected: snapshot shape, native/web branching, 24-hour rule, changed-trade
conflict, dedupe and queue clearing pass.

**Commit:** `feat(market): sync background snapshots and queued hits`

---

### Task 19 — Windows tray and first-close prompt

**Goal:** keep the Windows process alive in the tray and ask once what close does.

**Files**

- Modify `src-tauri/Cargo.toml`
- Modify `src-tauri/src/lib.rs`
- Create `src-tauri/src/tray.rs`
- Modify `src-tauri/capabilities/default.json`
- Create `src/app/shell/WindowsClosePrompt.tsx`
- Create `src/app/shell/WindowsClosePrompt.test.tsx`
- Modify `src/app/AppRoot.tsx`
- Modify `src/features/settings/pages/PreferencesPage.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

Rust commands:

```rust
#[tauri::command]
fn resolve_windows_close(behavior: String) -> Result<(), String>
```

Tauri config/features: `tauri` feature `tray-icon`; `@tauri-apps/api` for events
and invoke. The tray menu has Show and Quit. On `WindowEvent::CloseRequested`:

- If `windowsCloseBehavior == 'tray'`, prevent close and hide the window.
- If `'quit'`, allow the close.
- If `'unset'`, prevent close and emit `windows-close-prompt` to the webview.

`WindowsClosePrompt` listens for the event, shows a `Sheet` with "Hide to tray"
and "Quit", persists `windowsCloseBehavior`, and calls `resolve_windows_close`.
The Preferences page adds a Windows-only select for the behavior.

**Verification**

```bash
cargo check --manifest-path src-tauri/Cargo.toml
npm run typecheck
npm test -- src/app/shell/WindowsClosePrompt.test.tsx
npm run lint
```

Expected: `cargo check` passes; the prompt persists the choice and invokes the
command; tray show/quit wiring is reviewed manually on Windows 11.

**Commit:** `feat(native): add the Windows tray and close prompt`

---

### Task 20 — Windows Rust timer and notifications

**Goal:** poll and notify from the tray without the WebView.

**Files**

- Create `src-tauri/src/background.rs`
- Modify `src-tauri/src/lib.rs`
- Modify `src-tauri/Cargo.toml`
- Create `src-tauri/src/background_tests.rs` or `#[cfg(test)]` module in
  `background.rs`
- Modify `src-tauri/capabilities/default.json`

**Interfaces**

Rust dependencies: `serde`, `serde_json`, `reqwest` with `json` + `rustls-tls`,
`tauri-plugin-notification`. The timer runs every five minutes with
`tauri::async_runtime::spawn`; it reads `background-snapshot.json`, returns when
`backgroundMonitoring` is false, fetches Binance/CoinGecko, evaluates the shared
cases, sends one grouped notification with `app.notification().builder()`, and
appends `background-events.json`. The queue is capped at 200 entries and deduped
by rule/trade/level within the cooldown.

**Verification**

```bash
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: pure evaluation, snapshot parsing and queue append tests pass. Manual
Windows 11 check: tray-resident app polls, one grouped toast appears, events
import on next open.

**Commit:** `feat(native): poll prices from the Windows tray`

---

### Task 21 — Android WorkManager polling

**Goal:** a 15-minute WorkManager that polls and queues hits without the WebView.

**Files**

- Modify `src-tauri/gen/android/app/build.gradle.kts`
- Modify `src-tauri/gen/android/app/src/main/AndroidManifest.xml`
- Modify `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MainActivity.kt`
- Create `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MarketWorker.kt`
- Create `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MarketSnapshot.kt`
- Create `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MarketApi.kt`
- Create `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MarketEvaluator.kt`
- Create `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MarketQueue.kt`
- Modify `src-tauri/gen/android/app/proguard-rules.pro`
- Modify `src/lib/native.ts`
- Modify `src/lib/native.test.ts`

**Interfaces**

Dependencies: `androidx.work:work-runtime-ktx:2.10.5` and
`com.squareup.okhttp3:okhttp:4.12.0`. `MarketWorker` is a `CoroutineWorker` with a
network constraint, scheduled as unique periodic work every 15 minutes with
`ExistingPeriodicWorkPolicy.UPDATE`. It reads
`filesDir/background-snapshot.json`, returns `Result.success()` when monitoring is
off, fetches via OkHttp, evaluates, appends `filesDir/background-events.json`, and
returns `Result.retry()` on transient errors.

`MainActivity` adds JS bridge methods:

```kotlin
@JavascriptInterface fun setBackgroundMonitoring(enabled: Boolean)
@JavascriptInterface fun writeBackgroundSnapshot(json: String)
@JavascriptInterface fun readBackgroundEvents(): String
@JavascriptInterface fun clearBackgroundEvents()
```

`proguard-rules.pro` keeps `com.clytrade.app.MarketWorker`.

**Verification**

```bash
npm run typecheck
npm test -- src/lib/native.test.ts
npm run android:apk:debug
```

Expected: the debug APK builds; on an Android 13+ device with monitoring on,
WorkManager runs at the 15-minute cadence, the snapshot is read, and a queue entry
appears. Monitoring off cancels the unique work.

**Commit:** `feat(android): poll prices with WorkManager`

---

### Task 22 — Android notifications, permission and tap

**Goal:** grouped notifications from the worker and tap-to-Alerts routing.

**Files**

- Create `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MarketNotifications.kt`
- Modify `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MarketWorker.kt`
- Modify `src-tauri/gen/android/app/src/main/java/com/clytrade/app/MainActivity.kt`
- Modify `src-tauri/gen/android/app/src/main/AndroidManifest.xml`
- Modify `src/lib/native.ts`
- Modify `src/lib/native.test.ts`
- Modify `src/features/alerts/logic/useNotificationPermission.ts`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

`MarketNotifications` creates the `clytrade_alerts` channel and shows one grouped
notification per poll. The `PendingIntent` targets `MainActivity` with
`open_alerts=true` and `FLAG_ACTIVITY_SINGLE_TOP | FLAG_ACTIVITY_CLEAR_TOP`.
`MainActivity` stores the pending route in `onNewIntent` and exposes:

```kotlin
@JavascriptInterface fun consumePendingRoute(): String
```

`useNotificationPermission` calls the Tauri notification plugin's
`requestPermission()` on Android and reads `getNotificationPermission()`; denied
permission leaves in-app events intact. `src/lib/native.ts` exposes a typed
`consumePendingRoute()` used by `AppRoot` to navigate to `/alerts/overview`.

`AndroidManifest.xml` adds `android.permission.POST_NOTIFICATIONS`.

**Verification**

```bash
npm run typecheck
npm test -- src/lib/native.test.ts src/features/alerts/logic/useNotificationPermission.test.ts
npm run android:apk:debug
```

Expected: permission prompt appears on Android 13+, a grouped notification is
shown, tapping opens Alerts, and denial does not break the app.

**Commit:** `feat(android): notify from background and open Alerts`

---

### Task 23 — Background controls UI

**Goal:** let the user enable background monitoring and choose Windows close
behavior.

**Files**

- Modify `src/features/alerts/pages/AlertsPage.tsx`
- Modify `src/features/alerts/components/AlertStatusStrip.tsx`
- Modify `src/features/alerts/logic/useBackgroundSync.ts`
- Modify `src/features/settings/pages/PreferencesPage.tsx`
- Modify `src/features/settings/pages/PreferencesPage.test.tsx`
- Modify `src/features/alerts/pages/AlertsPage.test.tsx`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`

**Interfaces**

The Alerts page adds a "Background monitoring" card with a toggle, a permission
status line, and an explanation of the Android 15-minute / Windows 5-minute
cadence. Enabling calls `requestPermission()` and
`setBackgroundMonitoring(true)`; disabling calls `setBackgroundMonitoring(false)`.
The toggle reads `preferences.backgroundMonitoring` and persists it through
`updatePreferences`. Preferences adds the Windows-only close-behavior select.

**Verification**

```bash
npm run typecheck
npm test -- src/features/alerts/pages/AlertsPage.test.tsx src/features/settings/pages/PreferencesPage.test.tsx
npm run lint
```

Expected: enabling requests permission, persists, schedules; disabling cancels;
denied permission keeps the toggle off with an explanatory message.

**Commit:** `feat(alerts): add background monitoring controls`

---

## Phase 6 — Localization, docs and release

### Task 24 — English and Persian keys

**Goal:** every new string exists in both dictionaries.

**Files**

- Modify `src/i18n/en.ts`
- Modify `src/i18n/fa.ts`
- Modify `src/i18n/dictionaries.test.ts` only if a new section needs an assertion

**Interfaces**

Add sections for `alerts.*`, `market.*`, `background.*`, `notifications.*`,
`preferences.market*`, `journal.autoClose*`, `portfolio.autoPrice*` and
`symbolPicker.*`. Persian copy follows the existing terminology: ژورنال، سبد
سرمایه، تارگت، استاپ، لوریج/مارجین, and keeps Latin digits, Gregorian dates and
LTR prices.

**Verification**

```bash
npm run typecheck
npm test -- src/i18n
npm run lint
```

Expected: dictionary parity, placeholder parity and existing locale tests pass.

**Commit:** `feat(i18n): translate price alerts`

---

### Task 25 — Documentation, README, AGENTS and changelog

**Goal:** explain the feature and its platform limits in both languages.

**Files**

- Create `src/docs/en/general/alerts.md`
- Create `src/docs/fa/general/alerts.md`
- Modify `src/docs/registry.ts`
- Modify `src/docs/en/general/journal.md`
- Modify `src/docs/fa/general/journal.md`
- Modify `src/docs/en/general/portfolio.md`
- Modify `src/docs/fa/general/portfolio.md`
- Modify `src/docs/en/general/data-and-backups.md`
- Modify `src/docs/fa/general/data-and-backups.md`
- Modify `src/docs/en/general/releases.md`
- Modify `src/docs/fa/general/releases.md`
- Modify `README.md`
- Modify `AGENTS.md`
- Modify `CHANGELOG.md`

**Content requirements**

- `alerts.md` explains the why: serverless, provider limits, shared cache, 5-minute
  lists, 30-second detail, 15-minute stale guard, exact-level closes, gap review,
  background limits (Android 15 minutes, Windows 5 minutes, PWA none), and the
  CoinGecko key tradeoff.
- `journal.md` documents the auto-close toggle, tag/note and editing a close.
- `portfolio.md` documents auto-price, the per-asset toggle and stale badges.
- `data-and-backups.md` documents what is and is not in a backup.
- `releases.md` gets the 0.5.0 entry.
- `README.md` adds Alerts to the feature table and notes the provider setup.
- `AGENTS.md` adds `src/market/`, the new Dexie tables, the background contract,
  the Android WorkManager customization and the Windows tray timer.
- `CHANGELOG.md` gets a 0.5.0 section.

**Verification**

```bash
npm run typecheck
npm test -- src/docs/registry.test.ts src/i18n
npm run lint
```

Expected: registry has the new slug, both locales have distinct bodies, and the
dictionary tests pass.

**Commit:** `docs: document price alerts and auto-close`

---

### Task 26 — Tests, a11y and screenshots

**Goal:** prove the feature end to end and keep the repository's quality gates.

**Files**

- Modify `scripts/a11y.mjs`
- Modify `scripts/screenshots.mjs`
- Modify `src/features/journal/pages/JournalOverviewPage.test.tsx`
- Modify `src/features/portfolio/pages/PortfolioOverviewPage.test.tsx`
- Modify `src/data/backup.test.ts`
- Modify `src/data/db.test.ts`
- Add tests where Tasks 1–23 left gaps
- Add `screenshots/desktop/alerts.png`
- Modify `README.md` if the screenshot is referenced

**Verification**

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
npm run a11y
npm run screenshots
```

Expected: all pass; `a11y` reports zero serious/critical on the Alerts page in all
three themes and both viewports; the screenshot is regenerated and committed.

**Commit:** `test(alerts): cover alerts, background and a11y`

---

### Task 27 — Release 0.5.0

**Goal:** bump, document and tag the release.

**Files**

- Modify `package.json`
- Modify `package-lock.json`
- Modify `src-tauri/Cargo.toml`
- Modify `src-tauri/Cargo.lock`
- Modify `CHANGELOG.md`
- Modify `src/docs/en/general/releases.md`
- Modify `src/docs/fa/general/releases.md`

**Steps**

1. Run `npm run version:set -- 0.5.0`.
2. Add the 0.5.0 changelog entry and release notes.
3. Run the full gate.
4. Tag `v0.5.0` and push only after the user asks.

**Verification**

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
git diff --check
```

Expected: all pass, the version is 0.5.0 in `package.json`, both lockfiles and
`Cargo.toml`, and the tag matches `package.json` for the release workflow.

**Commit:** `chore(release): 0.5.0`

---

## Dependencies / ordering

- Task 1 blocks every task that touches `Trade`, `Asset`, `Preferences` or Dexie.
- Tasks 2 and 3 depend on Task 1.
- Tasks 4 and 5 depend on Task 1's price types.
- Task 6 depends on Tasks 4 and 5.
- Task 7 depends on Tasks 4–6.
- Task 8 depends on Tasks 1 and 7.
- Tasks 9–11 depend on Tasks 6–8.
- Task 12 depends on Task 1 and the price types.
- Task 13 depends on Tasks 2 and 12.
- Task 14 depends on Task 13 for the unread count and event shape.
- Tasks 15 and 16 depend on Tasks 2, 7, 13 and 14.
- Task 17 depends on Task 13 and the notification permission hook.
- Task 18 depends on Tasks 1, 2 and 13.
- Task 19 depends on Task 1's `windowsCloseBehavior` and the native bridge.
- Task 20 depends on Tasks 18 and 19.
- Task 21 depends on Task 18.
- Task 22 depends on Tasks 17 and 21.
- Task 23 depends on Tasks 18, 19, 21 and 22.
- Tasks 24–26 depend on all UI and native tasks.
- Task 27 depends on Task 26.

Tasks 4–7 can run in parallel with Tasks 19–22 only after Task 1 lands; the native
tasks need the snapshot contract from Task 18.

## Risks + rollback

| Risk | Mitigation |
| --- | --- |
| Android WorkManager is delayed by Doze | Status strip shows the last run; docs state the 15-minute best effort |
| Provider geo-blocking or outage | Auto fallback, backoff, pinned override, status strip |
| Kotlin/Rust/web evaluator drift | Shared `evaluation-cases.json`, webview re-validates queued hits |
| Snapshot/Dexie drift | Snapshot rewritten on every change and startup; queued hits revalidated |
| False auto-close | 15-minute freshness guard, exact-level close, gap review, editable trades |
| Dexie v3 downgrade | Back up before upgrading; rollback requires a pre-v0.5 backup |
| Notification permission denied | In-app inbox and badge always work; no repeated prompts |
| WebView2 throttling | Rust-side timer, not the WebView |
| Symbol ambiguity | Picker and stored provider ids |
| CoinGecko keyless limits | Shared cache, 6 req/min bucket, fallback, backoff |
| Backup growth | 500-event cap; cache and symbol lists excluded |

Rollback for the implementation:

1. Disable background monitoring and auto-close; alerts remain in-app.
2. If the database must return to v2, restore a pre-v0.5 backup and reinstall the
   previous build. A v3 database is not readable by a v2 build.
3. Cancel Android WorkManager by disabling monitoring; quit the Windows tray app.
4. No server state exists to roll back.

## Open questions

None.

## Self-review

- [x] Every spec section maps to at least one task: data (1–3), providers (4–7),
      preferences (8), portfolio (9–10), journal (11), evaluator/engine (12–13),
      Alerts UI (14–16), notifications (17), background bridge (18), Windows
      (19–20), Android (21–22), controls (23), i18n (24), docs (25), verification
      (26), release (27).
- [x] Names and signatures are consistent across tasks: `MarketRef`,
      `ProviderPrice`, `PriceAlert`, `AlertEvent`, `SchedulerStatus`,
      `BackgroundSnapshot`, `BackgroundEvent`, `runAlertEvaluation`,
      `writeBackgroundSnapshot`, `readBackgroundEvents`, `clearBackgroundEvents`.
- [x] Every task states exact files, interfaces, verification and a commit.
- [x] No task touches `src/calculations/**`.
- [x] No task adds a server, port or dashboard entry.
- [x] Every UI task adds English and Persian keys in the same commit.
- [x] Native tasks state their manual verification where CI cannot run the target.
- [x] Open questions are empty.
