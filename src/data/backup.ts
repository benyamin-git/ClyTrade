import { z } from 'zod'
import { isIos } from '@/lib/platform'
import { db } from './db'
import { assetSchema } from './models/asset'
import { settingRowSchema } from './models/backup-schemas'
import { tradeSchema } from './models/trade'
import { listAssets, mergeAssets, replaceAllAssets } from './repositories/assets.repo'
import { listSettings, mergeSettings, replaceAllSettings } from './repositories/settings.repo'
import { listTrades, mergeTrades, replaceAllTrades } from './repositories/trades.repo'

export const BACKUP_APP_ID = 'clytrade'
export const BACKUP_SCHEMA_VERSION = 2

export const backupEnvelopeSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.number().int().positive(),
})

export const backupSchema = backupEnvelopeSchema.extend({
  exportedAt: z.string(),
  data: z.object({
    trades: z.array(tradeSchema),
    assets: z.array(assetSchema),
    settings: z.array(settingRowSchema),
  }),
})

export type BackupFile = z.infer<typeof backupSchema>
export type ImportMode = 'replace' | 'merge'

export async function exportBackup(): Promise<BackupFile> {
  const [trades, assets, settings] = await Promise.all([listTrades(), listAssets(), listSettings()])
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { trades, assets, settings },
  }
}

export function backupFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `clytrade-backup-${stamp}.json`
}

export type BackupExportResult = 'shared' | 'downloaded' | 'cancelled'

export async function downloadBackup(backup: BackupFile): Promise<BackupExportResult> {
  const json = JSON.stringify(backup, null, 2)
  const filename = backupFilename()
  if (
    isIos() &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    const file = new File([json], filename, { type: 'application/json' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      }
    }
  }
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

export type BackupErrorCode = 'invalid-json' | 'invalid-backup' | 'future-version' | 'duplicate-id'

export class BackupError extends Error {
  readonly code: BackupErrorCode

  constructor(code: BackupErrorCode) {
    super(code)
    this.name = 'BackupError'
    this.code = code
  }
}

export function parseBackup(text: string): BackupFile {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError('invalid-json')
  }
  const envelope = backupEnvelopeSchema.safeParse(json)
  if (!envelope.success) {
    throw new BackupError('invalid-backup')
  }
  if (envelope.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupError('future-version')
  }
  const result = backupSchema.safeParse(json)
  if (!result.success) {
    throw new BackupError('invalid-backup')
  }
  const { trades, assets, settings } = result.data.data
  const tradeIds = new Set<string>()
  for (const trade of trades) {
    if (tradeIds.has(trade.id)) throw new BackupError('duplicate-id')
    tradeIds.add(trade.id)
  }
  const assetIds = new Set<string>()
  for (const asset of assets) {
    if (assetIds.has(asset.id)) throw new BackupError('duplicate-id')
    assetIds.add(asset.id)
  }
  const settingKeys = new Set<string>()
  for (const row of settings) {
    if (settingKeys.has(row.key)) throw new BackupError('duplicate-id')
    settingKeys.add(row.key)
  }
  return result.data
}

export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<void> {
  const { trades, assets, settings } = backup.data
  if (mode === 'replace') {
    await db.transaction('rw', db.trades, db.assets, db.settings, async () => {
      await replaceAllTrades(trades)
      await replaceAllAssets(assets)
      await replaceAllSettings(settings)
    })
    return
  }
  await Promise.all([mergeTrades(trades), mergeAssets(assets), mergeSettings(settings)])
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.trades, db.assets, db.settings, async () => {
    await replaceAllTrades([])
    await replaceAllAssets([])
    await replaceAllSettings([])
  })
}
