export type AccentId =
  'purple' | 'teal' | 'blue' | 'green' | 'lime' | 'amber' | 'orange' | 'rose' | 'violet'

export interface AccentDef {
  id: AccentId
  label: string
}

export const ACCENTS: readonly AccentDef[] = [
  { id: 'blue', label: 'Blue' },
  { id: 'teal', label: 'Teal' },
  { id: 'green', label: 'Green' },
  { id: 'lime', label: 'Lime' },
  { id: 'amber', label: 'Amber' },
  { id: 'orange', label: 'Orange' },
  { id: 'rose', label: 'Rose' },
  { id: 'violet', label: 'Violet' },
  { id: 'purple', label: 'Purple' },
]

export const DEFAULT_ACCENT: AccentId = 'blue'

export const THEME_NATIVE_ACCENT: AccentId = 'purple'

const ACCENT_STORAGE_KEY = 'clytrade.accent'

const ACCENT_IDS = new Set<string>(ACCENTS.map((accent) => accent.id))

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
