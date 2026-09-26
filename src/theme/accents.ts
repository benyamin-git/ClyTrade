export type AccentId =
  'purple' | 'teal' | 'blue' | 'green' | 'lime' | 'amber' | 'orange' | 'rose' | 'violet'

export const ACCENTS: readonly AccentId[] = [
  'blue',
  'teal',
  'green',
  'lime',
  'amber',
  'orange',
  'rose',
  'violet',
  'purple',
]

export const DEFAULT_ACCENT: AccentId = 'blue'

export const THEME_NATIVE_ACCENT: AccentId = 'purple'

const ACCENT_STORAGE_KEY = 'clytrade.accent'

const ACCENT_IDS = new Set<string>(ACCENTS)

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === 'string' && ACCENT_IDS.has(value)
}

export function readStoredAccent(): AccentId {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
    if (isAccentId(stored)) return stored
  } catch {
    // storage unavailable
  }
  const fromDocument = document.documentElement.dataset.accent
  if (isAccentId(fromDocument)) return fromDocument
  return DEFAULT_ACCENT
}

export function writeStoredAccent(accent: AccentId): void {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent)
  } catch {
    // storage unavailable
  }
}
