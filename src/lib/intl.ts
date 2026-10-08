export interface IntlContext {
  locale: string
  calendar?: string
}

const defaultContext: IntlContext = { locale: 'en-US' }

let current: IntlContext = { ...defaultContext }
const listeners = new Set<() => void>()

export function setIntlContext(next: IntlContext): void {
  if (current.locale === next.locale && current.calendar === next.calendar) return
  current = next
  for (const listener of listeners) listener()
}

export function subscribeIntlContext(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getIntlContext(): IntlContext {
  return current
}

export function resetIntlContext(): void {
  setIntlContext({ ...defaultContext })
}
