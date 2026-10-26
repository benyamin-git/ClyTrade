import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  BackupError,
  backupFilename,
  clearAllData,
  downloadBackup,
  exportBackup,
  importBackup,
  parseBackup,
  type BackupFile,
} from './backup'
import type { Asset } from './models/asset'
import type { AlertEvent, AlertEventDraft, PriceAlert, PriceAlertDraft } from './models/price'
import { MARKET_API_KEY } from './models/settings'
import { listAssets } from './repositories/assets.repo'
import {
  createAlert,
  createAlertEvent,
  listAlertEvents,
  listAlerts,
} from './repositories/alerts.repo'
import { setSetting } from './repositories/settings.repo'
import { listTrades } from './repositories/trades.repo'
import type { Trade } from './models/trade'

const validBackup: BackupFile = {
  app: BACKUP_APP_ID,
  schemaVersion: BACKUP_SCHEMA_VERSION,
  exportedAt: '2026-01-01T00:00:00.000Z',
  data: { trades: [], assets: [], settings: [], priceAlerts: [], alertEvents: [] },
}

function codeOf(text: string): string {
  try {
    parseBackup(text)
    return 'no-error'
  } catch (error) {
    return error instanceof BackupError ? error.code : 'unexpected'
  }
}

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    expect(parseBackup(JSON.stringify(validBackup)).app).toBe(BACKUP_APP_ID)
  })

  it('accepts v1 and v2 backups with empty alert collections', () => {
    expect(BACKUP_SCHEMA_VERSION).toBe(3)

    const v2 = parseBackup(JSON.stringify({ ...validBackup, schemaVersion: 2 }))
    expect(v2.schemaVersion).toBe(2)
    expect(v2.data.priceAlerts).toEqual([])
    expect(v2.data.alertEvents).toEqual([])

    const legacyTrade = {
      id: 'legacy',
      symbol: 'BTCUSDT',
      direction: 'long',
      status: 'closed',
      entryPrice: 61200,
      exitPrice: 63800,
      size: 0.08,
      leverage: 10,
      stopPrice: 60200,
      targetPrice: 64500,
      fees: 4.9,
      openedAt: 1,
      closedAt: 2,
      strategy: null,
      notes: null,
      tags: [],
      createdAt: 1,
      updatedAt: 2,
    }
    const legacy = parseBackup(
      JSON.stringify({
        ...validBackup,
        schemaVersion: 1,
        data: { ...validBackup.data, trades: [legacyTrade] },
      }),
    )
    expect(legacy.data.trades[0]?.market).toBe('unspecified')
  })

  it('turns automatic pricing on for crypto assets from v1 and v2 backups', () => {
    const legacyAssets = [
      {
        id: 'legacy-crypto',
        symbol: 'BTC',
        market: 'crypto',
        name: null,
        quantity: 1,
        averageCost: 100,
        currentPrice: null,
        notes: null,
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: 'legacy-forex',
        symbol: 'EURUSD',
        market: 'forex',
        name: null,
        quantity: 1,
        averageCost: 1.1,
        currentPrice: null,
        notes: null,
        createdAt: 1,
        updatedAt: 2,
      },
    ]

    for (const schemaVersion of [1, 2]) {
      const parsed = parseBackup(
        JSON.stringify({
          ...validBackup,
          schemaVersion,
          data: { ...validBackup.data, assets: legacyAssets },
        }),
      )
      const crypto = parsed.data.assets.find((asset) => asset.id === 'legacy-crypto')
      const forex = parsed.data.assets.find((asset) => asset.id === 'legacy-forex')

      expect(crypto?.autoPrice).toBe(true)
      expect(forex?.autoPrice).toBe(false)
    }
  })

  it('keeps explicit automatic pricing in v3 backups', () => {
    const parsed = parseBackup(
      JSON.stringify({
        ...validBackup,
        data: {
          ...validBackup.data,
          assets: [
            { ...makeAsset('v3-crypto-off'), autoPrice: false },
            { ...makeAsset('v3-crypto-on'), autoPrice: true },
          ],
        },
      }),
    )

    expect(parsed.data.assets.find((asset) => asset.id === 'v3-crypto-off')?.autoPrice).toBe(false)
    expect(parsed.data.assets.find((asset) => asset.id === 'v3-crypto-on')?.autoPrice).toBe(true)
  })

  it('accepts v3 alert rules and history', () => {
    const backup = parseBackup(
      JSON.stringify({
        ...validBackup,
        data: {
          ...validBackup.data,
          priceAlerts: [makeAlert('alert-1')],
          alertEvents: [makeAlertEvent('event-1')],
        },
      }),
    )

    expect(backup.data.priceAlerts).toHaveLength(1)
    expect(backup.data.alertEvents).toHaveLength(1)
  })

  it('rejects duplicate alert rule ids', () => {
    const alert = makeAlert('dup')
    expect(
      codeOf(
        JSON.stringify({
          ...validBackup,
          data: { ...validBackup.data, priceAlerts: [alert, { ...alert, level: 71000 }] },
        }),
      ),
    ).toBe('duplicate-id')
  })

  it('rejects duplicate alert event ids', () => {
    const event = makeAlertEvent('dup')
    expect(
      codeOf(
        JSON.stringify({
          ...validBackup,
          data: { ...validBackup.data, alertEvents: [event, { ...event, price: 71000 }] },
        }),
      ),
    ).toBe('duplicate-id')
  })

  it('strips the market API key from imported settings', () => {
    const backup = parseBackup(
      JSON.stringify({
        ...validBackup,
        data: {
          ...validBackup.data,
          settings: [
            { key: MARKET_API_KEY, value: 'secret', updatedAt: 1 },
            { key: 'preferences', value: {}, updatedAt: 1 },
          ],
        },
      }),
    )

    expect(backup.data.settings.map((row) => row.key)).toEqual(['preferences'])
  })

  it('reports a future version as future-version even when its data is unreadable', () => {
    const futureTrade = {
      id: 'future',
      symbol: 'SPY',
      market: 'etfs',
      direction: 'long',
      status: 'closed',
      entryPrice: 1,
      exitPrice: 2,
      size: 1,
      leverage: 1,
      stopPrice: null,
      targetPrice: null,
      fees: 0,
      openedAt: 1,
      closedAt: 2,
      strategy: null,
      notes: null,
      tags: [],
      createdAt: 1,
      updatedAt: 2,
    }
    expect(
      codeOf(
        JSON.stringify({
          ...validBackup,
          schemaVersion: BACKUP_SCHEMA_VERSION + 1,
          data: { ...validBackup.data, trades: [futureTrade] },
        }),
      ),
    ).toBe('future-version')
  })

  it.each([
    ['not json', 'invalid-json'],
    [JSON.stringify({ hello: 'world' }), 'invalid-backup'],
    [
      JSON.stringify({ ...validBackup, schemaVersion: BACKUP_SCHEMA_VERSION + 1 }),
      'future-version',
    ],
  ])('reports %s as %s', (text, expected) => {
    expect(codeOf(text)).toBe(expected)
  })

  it('rejects a backup whose trades contain a duplicate id', () => {
    const trade = makeTrade('dup')
    expect(
      codeOf(
        JSON.stringify({
          ...validBackup,
          data: { ...validBackup.data, trades: [trade, { ...trade, symbol: 'ETHUSDT' }] },
        }),
      ),
    ).toBe('duplicate-id')
  })

  it('rejects a backup whose assets contain a duplicate id', () => {
    const asset = {
      id: 'dup',
      symbol: 'BTC',
      market: 'crypto',
      name: null,
      quantity: 1,
      averageCost: 1,
      currentPrice: null,
      notes: null,
      createdAt: 1,
      updatedAt: 2,
    }
    expect(
      codeOf(
        JSON.stringify({
          ...validBackup,
          data: { ...validBackup.data, assets: [asset, { ...asset, symbol: 'ETH' }] },
        }),
      ),
    ).toBe('duplicate-id')
  })

  it('rejects a backup whose settings contain a duplicate key', () => {
    const row = { key: 'preferences', value: {}, updatedAt: 1 }
    expect(
      codeOf(
        JSON.stringify({
          ...validBackup,
          data: { ...validBackup.data, settings: [row, { ...row, updatedAt: 2 }] },
        }),
      ),
    ).toBe('duplicate-id')
  })

  it('accepts a backup with a theme and accent', () => {
    const backup = parseBackup(
      JSON.stringify({
        ...validBackup,
        data: { ...validBackup.data, ui: { theme: 'light', accent: 'rose' } },
      }),
    )

    expect(backup.data.ui).toEqual({ theme: 'light', accent: 'rose' })
  })

  it.each([
    ['theme', { theme: 'sepia', accent: 'rose' }],
    ['accent', { theme: 'light', accent: 'rainbow' }],
  ])('rejects an unknown %s', (_name, ui) => {
    expect(
      codeOf(
        JSON.stringify({
          ...validBackup,
          data: { ...validBackup.data, ui },
        }),
      ),
    ).toBe('invalid-backup')
  })

  it('builds a timestamped filename', () => {
    expect(backupFilename(new Date('2026-01-02T03:04:05.000Z'))).toBe(
      'clytrade-backup-2026-01-02-03-04-05.json',
    )
  })
})

function makeAlertDraft(): PriceAlertDraft {
  return {
    kind: 'price',
    symbol: 'BTC',
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    priceMode: 'above',
    level: 70000,
    rangeLow: null,
    rangeHigh: null,
    percent: null,
    percentDirection: null,
    repeat: 'once',
    cooldownMinutes: 60,
    referencePrice: null,
    lastPrice: 68000,
    armed: true,
    enabled: true,
    note: null,
    lastFiredAt: null,
  }
}

function makeAlert(id: string): PriceAlert {
  return { ...makeAlertDraft(), id, createdAt: 1, updatedAt: 1 }
}

function makeAlertEventDraft(): AlertEventDraft {
  return {
    kind: 'level',
    tradeId: null,
    ruleId: 'alert-1',
    symbol: 'BTC',
    price: 70000,
    level: 70000,
    targetPrice: null,
    stopPrice: null,
    at: 1,
    provider: 'binance',
    status: 'unread',
    resolution: null,
    readAt: null,
  }
}

function makeAlertEvent(id: string): AlertEvent {
  return { ...makeAlertEventDraft(), id, createdAt: 1 }
}

function makeTrade(id: string): Trade {
  return {
    id,
    symbol: 'BTCUSDT',
    market: 'crypto',
    direction: 'long',
    status: 'closed',
    entryPrice: 100,
    exitPrice: 110,
    size: 1,
    leverage: 1,
    stopPrice: null,
    targetPrice: null,
    fees: 0,
    openedAt: 1,
    closedAt: 2,
    strategy: null,
    notes: null,
    tags: [],
    autoClose: false,
    binanceSymbol: null,
    coingeckoId: null,
    createdAt: 1,
    updatedAt: 2,
  }
}

function makeAsset(id: string): Asset {
  return {
    id,
    symbol: id.toUpperCase(),
    market: 'crypto',
    name: null,
    quantity: 1,
    averageCost: 1,
    currentPrice: null,
    notes: null,
    autoPrice: false,
    binanceSymbol: null,
    coingeckoId: null,
    createdAt: 1,
    updatedAt: 2,
  }
}

describe('exportBackup', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  afterEach(async () => {
    await clearAllData()
  })

  it('includes the stored theme and accent', async () => {
    localStorage.setItem('clytrade.theme', 'light')
    localStorage.setItem('clytrade.accent', 'rose')

    const backup = await exportBackup()

    expect(backup.data.ui).toEqual({ theme: 'light', accent: 'rose' })
  })

  it('includes alert rules and history but excludes the market API key', async () => {
    await createAlert(makeAlertDraft())
    await createAlertEvent(makeAlertEventDraft())
    await setSetting(MARKET_API_KEY, 'secret')

    const backup = await exportBackup()

    expect(backup.data.priceAlerts).toHaveLength(1)
    expect(backup.data.alertEvents).toHaveLength(1)
    expect(backup.data.settings.some((row) => row.key === MARKET_API_KEY)).toBe(false)
  })
})

describe('importBackup', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  afterEach(async () => {
    await clearAllData()
  })

  it('rolls back every store when a replace fails midway', async () => {
    await importBackup(
      {
        ...validBackup,
        data: {
          trades: [makeTrade('seed-trade')],
          assets: [makeAsset('seed-asset')],
          settings: [],
          priceAlerts: [],
          alertEvents: [],
        },
      },
      'replace',
    )
    expect((await listTrades()).map((trade) => trade.id)).toEqual(['seed-trade'])
    expect((await listAssets()).map((asset) => asset.id)).toEqual(['seed-asset'])

    const duplicate = makeTrade('duplicate')
    const conflicting: BackupFile = {
      ...validBackup,
      data: {
        trades: [duplicate, { ...duplicate, symbol: 'ETHUSDT' }],
        assets: [makeAsset('new-asset')],
        settings: [],
        priceAlerts: [],
        alertEvents: [],
      },
    }

    await expect(importBackup(conflicting, 'replace')).rejects.toThrow()

    expect((await listTrades()).map((trade) => trade.id)).toEqual(['seed-trade'])
    expect((await listAssets()).map((asset) => asset.id)).toEqual(['seed-asset'])
  })

  it.each([1, 2])('imports a v%s crypto asset with automatic pricing on', async (schemaVersion) => {
    const legacyCrypto = {
      id: 'legacy-crypto',
      symbol: 'BTC',
      market: 'crypto',
      name: null,
      quantity: 1,
      averageCost: 100,
      currentPrice: null,
      notes: null,
      createdAt: 1,
      updatedAt: 2,
    }
    const parsed = parseBackup(
      JSON.stringify({
        ...validBackup,
        schemaVersion,
        data: { ...validBackup.data, assets: [legacyCrypto] },
      }),
    )

    await importBackup(parsed, 'replace')

    const imported = (await listAssets()).find((asset) => asset.id === 'legacy-crypto')
    expect(imported?.autoPrice).toBe(true)
  })

  it('round-trips alert rules and history through export and import', async () => {
    const alert = await createAlert(makeAlertDraft())
    const event = await createAlertEvent(makeAlertEventDraft())

    const parsed = parseBackup(JSON.stringify(await exportBackup()))
    await clearAllData()
    await importBackup(parsed, 'replace')

    expect(await listAlerts()).toEqual([alert])
    expect(await listAlertEvents()).toEqual([event])
  })

  it('imports alert rules and history and clears them with all data', async () => {
    await importBackup(
      {
        ...validBackup,
        data: {
          ...validBackup.data,
          priceAlerts: [makeAlert('backup-alert')],
          alertEvents: [makeAlertEvent('backup-event')],
        },
      },
      'replace',
    )

    expect((await listAlerts()).map((alert) => alert.id)).toEqual(['backup-alert'])
    expect((await listAlertEvents()).map((event) => event.id)).toEqual(['backup-event'])

    await clearAllData()

    expect(await listAlerts()).toEqual([])
    expect(await listAlertEvents()).toEqual([])
  })
})

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function override(key: string, value: unknown): void {
  Object.defineProperty(window.navigator, key, { value, configurable: true })
}

function clearOverride(key: string): void {
  delete (window.navigator as unknown as Record<string, unknown>)[key]
}

describe('downloadBackup', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  let click: MockInstance<() => void>

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    click.mockRestore()
    clearOverride('userAgent')
    clearOverride('share')
    clearOverride('canShare')
  })

  it('shares the backup through the iOS share sheet when available', async () => {
    override('userAgent', IPHONE_UA)
    const share = vi
      .fn<(options: { files: File[] }) => Promise<void>>()
      .mockResolvedValue(undefined)
    override('share', share)
    override(
      'canShare',
      vi.fn(() => true),
    )

    await expect(downloadBackup(validBackup)).resolves.toBe('shared')
    expect(share).toHaveBeenCalledOnce()
    expect(share.mock.calls[0]?.[0].files).toHaveLength(1)
    expect(click).not.toHaveBeenCalled()
  })

  it('reports a cancelled share without downloading', async () => {
    override('userAgent', IPHONE_UA)
    override('share', vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')))
    override(
      'canShare',
      vi.fn(() => true),
    )

    await expect(downloadBackup(validBackup)).resolves.toBe('cancelled')
    expect(click).not.toHaveBeenCalled()
  })

  it('falls back to a download when sharing fails', async () => {
    override('userAgent', IPHONE_UA)
    override('share', vi.fn().mockRejectedValue(new TypeError('share unavailable')))
    override(
      'canShare',
      vi.fn(() => true),
    )

    await expect(downloadBackup(validBackup)).resolves.toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('downloads directly outside iOS', async () => {
    override('userAgent', DESKTOP_UA)
    const share = vi.fn()
    override('share', share)
    override(
      'canShare',
      vi.fn(() => true),
    )

    await expect(downloadBackup(validBackup)).resolves.toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledOnce()
  })
})
