import type { Asset } from './models/asset'
import type { Trade } from './models/trade'
import { mergeAssets } from './repositories/assets.repo'
import { mergeTrades } from './repositories/trades.repo'

const DAY = 86_400_000
const HOUR = 3_600_000

interface SampleTradeSpec {
  symbol: string
  direction: Trade['direction']
  entryPrice: number
  exitPrice: number | null
  size: number
  leverage: number
  stopPrice: number | null
  targetPrice: number | null
  fees: number
  openedDaysAgo: number
  holdHours: number
  strategy: string | null
  notes: string | null
  tags: readonly string[]
}

const TRADE_SPECS: readonly SampleTradeSpec[] = [
  {
    symbol: 'BTCUSDT',
    direction: 'long',
    entryPrice: 61200,
    exitPrice: 63800,
    size: 0.08,
    leverage: 10,
    stopPrice: 60200,
    targetPrice: 64500,
    fees: 4.9,
    openedDaysAgo: 118,
    holdHours: 52,
    strategy: 'Breakout',
    notes: 'Daily close above the range high.',
    tags: ['swing', 'btc'],
  },
  {
    symbol: 'ETHUSDT',
    direction: 'short',
    entryPrice: 3420,
    exitPrice: 3180,
    size: 1.6,
    leverage: 10,
    stopPrice: 3560,
    targetPrice: 3100,
    fees: 5.47,
    openedDaysAgo: 112,
    holdHours: 30,
    strategy: 'Mean reversion',
    notes: null,
    tags: ['eth', 'fade'],
  },
  {
    symbol: 'SOLUSDT',
    direction: 'long',
    entryPrice: 178.5,
    exitPrice: 165.2,
    size: 30,
    leverage: 5,
    stopPrice: 164,
    targetPrice: 205,
    fees: 5.36,
    openedDaysAgo: 104,
    holdHours: 78,
    strategy: 'Trend',
    notes: 'Stopped near the low of the range.',
    tags: ['sol'],
  },
  {
    symbol: 'BTCUSDT',
    direction: 'long',
    entryPrice: 58500,
    exitPrice: 62400,
    size: 0.06,
    leverage: 10,
    stopPrice: 57200,
    targetPrice: 63000,
    fees: 3.51,
    openedDaysAgo: 96,
    holdHours: 120,
    strategy: 'Breakout',
    notes: null,
    tags: ['btc', 'swing'],
  },
  {
    symbol: 'XRPUSDT',
    direction: 'long',
    entryPrice: 0.52,
    exitPrice: 0.495,
    size: 9000,
    leverage: 5,
    stopPrice: 0.485,
    targetPrice: 0.62,
    fees: 4.68,
    openedDaysAgo: 89,
    holdHours: 42,
    strategy: 'Mean reversion',
    notes: null,
    tags: ['xrp'],
  },
  {
    symbol: 'ETHUSDT',
    direction: 'long',
    entryPrice: 2980,
    exitPrice: 3260,
    size: 1.4,
    leverage: 10,
    stopPrice: 2890,
    targetPrice: 3300,
    fees: 4.17,
    openedDaysAgo: 81,
    holdHours: 96,
    strategy: 'Trend',
    notes: null,
    tags: ['eth'],
  },
  {
    symbol: 'BNBUSDT',
    direction: 'short',
    entryPrice: 612,
    exitPrice: 566,
    size: 7,
    leverage: 5,
    stopPrice: 632,
    targetPrice: 550,
    fees: 4.28,
    openedDaysAgo: 74,
    holdHours: 64,
    strategy: 'Mean reversion',
    notes: null,
    tags: ['bnb', 'fade'],
  },
  {
    symbol: 'BTCUSDT',
    direction: 'short',
    entryPrice: 66900,
    exitPrice: 68200,
    size: 0.05,
    leverage: 10,
    stopPrice: 68000,
    targetPrice: 64000,
    fees: 3.35,
    openedDaysAgo: 66,
    holdHours: 26,
    strategy: 'Breakout',
    notes: 'Failed breakdown, cut quickly.',
    tags: ['btc'],
  },
  {
    symbol: 'SOLUSDT',
    direction: 'long',
    entryPrice: 142.3,
    exitPrice: 158.9,
    size: 28,
    leverage: 5,
    stopPrice: 135,
    targetPrice: 165,
    fees: 3.98,
    openedDaysAgo: 58,
    holdHours: 150,
    strategy: 'Trend',
    notes: null,
    tags: ['sol', 'swing'],
  },
  {
    symbol: 'LINKUSDT',
    direction: 'long',
    entryPrice: 15.8,
    exitPrice: 18.4,
    size: 260,
    leverage: 5,
    stopPrice: 14.9,
    targetPrice: 19,
    fees: 4.11,
    openedDaysAgo: 51,
    holdHours: 88,
    strategy: 'Breakout',
    notes: null,
    tags: ['link'],
  },
  {
    symbol: 'ETHUSDT',
    direction: 'short',
    entryPrice: 3520,
    exitPrice: 3640,
    size: 1.2,
    leverage: 10,
    stopPrice: 3610,
    targetPrice: 3300,
    fees: 4.22,
    openedDaysAgo: 44,
    holdHours: 20,
    strategy: 'Mean reversion',
    notes: 'News spike against the position.',
    tags: ['eth'],
  },
  {
    symbol: 'BTCUSDT',
    direction: 'long',
    entryPrice: 64100,
    exitPrice: 67800,
    size: 0.045,
    leverage: 10,
    stopPrice: 63000,
    targetPrice: 68000,
    fees: 2.88,
    openedDaysAgo: 36,
    holdHours: 140,
    strategy: 'Trend',
    notes: null,
    tags: ['btc', 'swing'],
  },
  {
    symbol: 'SOLUSDT',
    direction: 'short',
    entryPrice: 192.4,
    exitPrice: 174.1,
    size: 22,
    leverage: 5,
    stopPrice: 200,
    targetPrice: 170,
    fees: 4.23,
    openedDaysAgo: 27,
    holdHours: 72,
    strategy: 'Mean reversion',
    notes: null,
    tags: ['sol'],
  },
  {
    symbol: 'XRPUSDT',
    direction: 'short',
    entryPrice: 0.61,
    exitPrice: 0.655,
    size: 7500,
    leverage: 5,
    stopPrice: 0.64,
    targetPrice: 0.55,
    fees: 4.58,
    openedDaysAgo: 19,
    holdHours: 34,
    strategy: 'Breakout',
    notes: 'Stop run before the move.',
    tags: ['xrp'],
  },
  {
    symbol: 'BNBUSDT',
    direction: 'long',
    entryPrice: 548,
    exitPrice: 601,
    size: 6.5,
    leverage: 5,
    stopPrice: 530,
    targetPrice: 610,
    fees: 3.56,
    openedDaysAgo: 12,
    holdHours: 110,
    strategy: 'Trend',
    notes: null,
    tags: ['bnb'],
  },
  {
    symbol: 'ETHUSDT',
    direction: 'long',
    entryPrice: 3310,
    exitPrice: 3480,
    size: 1.3,
    leverage: 10,
    stopPrice: 3220,
    targetPrice: 3550,
    fees: 4.3,
    openedDaysAgo: 6,
    holdHours: 58,
    strategy: 'Breakout',
    notes: null,
    tags: ['eth', 'swing'],
  },
  {
    symbol: 'BTCUSDT',
    direction: 'long',
    entryPrice: 68200,
    exitPrice: null,
    size: 0.04,
    leverage: 10,
    stopPrice: 66800,
    targetPrice: 72000,
    fees: 2.73,
    openedDaysAgo: 3,
    holdHours: 0,
    strategy: 'Trend',
    notes: 'Still holding above the breakout level.',
    tags: ['btc'],
  },
  {
    symbol: 'SOLUSDT',
    direction: 'long',
    entryPrice: 181.2,
    exitPrice: null,
    size: 20,
    leverage: 5,
    stopPrice: 172,
    targetPrice: 205,
    fees: 3.62,
    openedDaysAgo: 1,
    holdHours: 0,
    strategy: 'Mean reversion',
    notes: null,
    tags: ['sol'],
  },
]

interface SampleAssetSpec {
  symbol: string
  name: string
  quantity: number
  averageCost: number
  currentPrice: number | null
  notes: string | null
}

const ASSET_SPECS: readonly SampleAssetSpec[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: 0.15,
    averageCost: 52000,
    currentPrice: 68200,
    notes: 'Core holding, added on dips.',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    quantity: 2.5,
    averageCost: 2800,
    currentPrice: 3410,
    notes: null,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    quantity: 40,
    averageCost: 120,
    currentPrice: 181.2,
    notes: null,
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    quantity: 150,
    averageCost: 14.5,
    currentPrice: 19.2,
    notes: null,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    quantity: 500,
    averageCost: 1,
    currentPrice: 1,
    notes: 'Dry powder.',
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    quantity: 800,
    averageCost: 1.2,
    currentPrice: null,
    notes: 'No price set — valued at cost.',
  },
]

export function buildSampleData(now: number): { trades: Trade[]; assets: Asset[] } {
  const trades = TRADE_SPECS.map((spec, index) => {
    const openedAt = now - spec.openedDaysAgo * DAY
    const closedAt = spec.exitPrice === null ? null : openedAt + spec.holdHours * HOUR
    return {
      id: `sample-trade-${String(index + 1).padStart(2, '0')}`,
      symbol: spec.symbol,
      direction: spec.direction,
      status: spec.exitPrice === null ? 'open' : 'closed',
      entryPrice: spec.entryPrice,
      exitPrice: spec.exitPrice,
      size: spec.size,
      leverage: spec.leverage,
      stopPrice: spec.stopPrice,
      targetPrice: spec.targetPrice,
      fees: spec.fees,
      openedAt,
      closedAt,
      strategy: spec.strategy,
      notes: spec.notes,
      tags: [...spec.tags],
      createdAt: openedAt,
      updatedAt: closedAt ?? openedAt,
    } satisfies Trade
  })

  const assets = ASSET_SPECS.map(
    (spec, index) =>
      ({
        id: `sample-asset-${String(index + 1).padStart(2, '0')}`,
        symbol: spec.symbol,
        name: spec.name,
        quantity: spec.quantity,
        averageCost: spec.averageCost,
        currentPrice: spec.currentPrice,
        notes: spec.notes,
        createdAt: now,
        updatedAt: now,
      }) satisfies Asset,
  )

  return { trades, assets }
}

export async function loadSampleData(now = Date.now()): Promise<void> {
  const { trades, assets } = buildSampleData(now)
  await mergeTrades(trades)
  await mergeAssets(assets)
}
