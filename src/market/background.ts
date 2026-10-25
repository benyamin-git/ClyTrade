import type {
  AlertEventKind,
  AlertPercentDirection,
  AlertPriceMode,
  AlertRepeat,
  PriceAlert,
  PriceProviderChoice,
  PriceProviderId,
} from '@/data/models/price'
import type { Preferences } from '@/data/models/settings'
import type { Trade } from '@/data/models/trade'
import { clearNativeEvents, readNativeEvents, writeNativeSnapshot } from '@/lib/native'
import { priceKeyFor, STALE_MS } from './types'

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
  priceKey: string
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
  priceKey: string
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
  targetPrice: number | null
  stopPrice: number | null
  direction: 'long' | 'short'
  at: number
  provider: PriceProviderId
}

export interface BackgroundSnapshotInput {
  now: number
  locale: 'en' | 'fa'
  preferences: Preferences
  coingeckoKey: string | null
  notification: { title: string; body: string }
  trades: readonly Trade[]
  rules: readonly PriceAlert[]
}

export function buildBackgroundSnapshot(input: BackgroundSnapshotInput): BackgroundSnapshot {
  const trades = input.trades
    .filter(
      (trade) =>
        trade.status === 'open' && (trade.targetPrice !== null || trade.stopPrice !== null),
    )
    .map((trade): BackgroundTrade => ({
      id: trade.id,
      symbol: trade.symbol,
      direction: trade.direction,
      targetPrice: trade.targetPrice,
      stopPrice: trade.stopPrice,
      autoClose: trade.autoClose,
      binanceSymbol: trade.binanceSymbol,
      coingeckoId: trade.coingeckoId,
      updatedAt: trade.updatedAt,
      priceKey: priceKeyFor(trade),
    }))

  const rules = input.rules
    .filter((rule) => rule.enabled && (rule.binanceSymbol !== null || rule.coingeckoId !== null))
    .map((rule): BackgroundRule => ({
      id: rule.id,
      symbol: rule.symbol,
      kind: rule.kind,
      priceMode: rule.priceMode,
      level: rule.level,
      rangeLow: rule.rangeLow,
      rangeHigh: rule.rangeHigh,
      percent: rule.percent,
      percentDirection: rule.percentDirection,
      repeat: rule.repeat,
      cooldownMinutes: rule.cooldownMinutes,
      referencePrice: rule.referencePrice,
      lastPrice: rule.lastPrice,
      armed: rule.armed,
      lastFiredAt: rule.lastFiredAt,
      binanceSymbol: rule.binanceSymbol,
      coingeckoId: rule.coingeckoId,
      updatedAt: rule.updatedAt,
      priceKey: priceKeyFor(rule),
    }))

  return {
    version: 1,
    generatedAt: input.now,
    locale: input.locale,
    provider: input.preferences.priceProvider,
    coingeckoKey: input.coingeckoKey,
    backgroundMonitoring: input.preferences.backgroundMonitoring,
    windowsCloseBehavior: input.preferences.windowsCloseBehavior,
    staleMs: STALE_MS,
    notification: input.notification,
    trades,
    rules,
  }
}

export async function writeBackgroundSnapshot(snapshot: BackgroundSnapshot): Promise<void> {
  await writeNativeSnapshot(JSON.stringify(snapshot))
}

export async function readBackgroundEvents(): Promise<BackgroundEvent[]> {
  const raw = await readNativeEvents()
  if (!raw.trim()) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as BackgroundEvent[]) : []
  } catch {
    return []
  }
}

export async function clearBackgroundEvents(): Promise<void> {
  await clearNativeEvents()
}
