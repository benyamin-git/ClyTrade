import { describe, expect, it } from 'vitest'
import { isPlatformId, type PlatformId } from './version'

describe('isPlatformId', () => {
  it.each<PlatformId>(['web', 'windows', 'linux', 'darwin', 'android', 'androideabi', 'ios'])(
    'accepts %s',
    (value) => {
      expect(isPlatformId(value)).toBe(true)
    },
  )

  it.each(['macos', 'unknown', '', 'ANDROID'])('rejects %s', (value) => {
    expect(isPlatformId(value)).toBe(false)
  })
})
