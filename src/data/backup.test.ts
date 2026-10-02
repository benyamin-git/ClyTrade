import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  BackupError,
  backupFilename,
  downloadBackup,
  parseBackup,
  type BackupFile,
} from './backup'

const validBackup: BackupFile = {
  app: BACKUP_APP_ID,
  schemaVersion: BACKUP_SCHEMA_VERSION,
  exportedAt: '2026-01-01T00:00:00.000Z',
  data: { trades: [], assets: [], settings: [] },
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

  it('accepts schema version 2 and imports a v1 trade with a default market', () => {
    expect(BACKUP_SCHEMA_VERSION).toBe(2)

    const v2 = parseBackup(JSON.stringify({ ...validBackup, schemaVersion: 2 }))
    expect(v2.schemaVersion).toBe(2)

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

  it('builds a timestamped filename', () => {
    expect(backupFilename(new Date('2026-01-02T03:04:05.000Z'))).toBe(
      'clytrade-backup-2026-01-02-03-04-05.json',
    )
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
