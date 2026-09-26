import { z } from 'zod'
import { assetSchema } from './models/asset'
import { settingRowSchema } from './models/backup-schemas'
import { tradeSchema } from './models/trade'
import { listAssets, mergeAssets, replaceAllAssets } from './repositories/assets.repo'
import { listSettings, mergeSettings, replaceAllSettings } from './repositories/settings.repo'
import { listTrades, mergeTrades, replaceAllTrades } from './repositories/trades.repo'

export const BACKUP_APP_ID = 'clytrade'
export const BACKUP_SCHEMA_VERSION = 1

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.number().int().positive(),
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

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFilename()
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type BackupErrorCode = 'invalid-json' | 'invalid-backup' | 'future-version'

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
  const result = backupSchema.safeParse(json)
  if (!result.success) {
    throw new BackupError('invalid-backup')
  }
  if (result.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupError('future-version')
  }
  return result.data
}

export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<void> {
  const { trades, assets, settings } = backup.data
  if (mode === 'replace') {
    await Promise.all([
      replaceAllTrades(trades),
      replaceAllAssets(assets),
      replaceAllSettings(settings),
    ])
    return
  }
  await Promise.all([mergeTrades(trades), mergeAssets(assets), mergeSettings(settings)])
}

export async function clearAllData(): Promise<void> {
  await Promise.all([replaceAllTrades([]), replaceAllAssets([]), replaceAllSettings([])])
}
