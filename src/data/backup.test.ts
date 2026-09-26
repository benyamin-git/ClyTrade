import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  BackupError,
  backupFilename,
  parseBackup,
} from './backup'

const validBackup = {
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
