export const APP_VERSION = __APP_VERSION__
export const APP_PLATFORM = __APP_PLATFORM__

export type PlatformId = 'web' | 'windows' | 'linux' | 'darwin' | 'android' | 'ios'

const PLATFORM_IDS = new Set<string>(['web', 'windows', 'linux', 'darwin', 'android', 'ios'])

export function isPlatformId(value: string): value is PlatformId {
  return PLATFORM_IDS.has(value)
}
