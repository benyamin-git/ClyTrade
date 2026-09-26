export interface IntlContext {
  locale: string
  calendar?: string
}

const defaultContext: IntlContext = { locale: 'en-US' }

let current: IntlContext = { ...defaultContext }

export function setIntlContext(next: IntlContext): void {
  current = next
}

export function getIntlContext(): IntlContext {
  return current
}

export function resetIntlContext(): void {
  current = { ...defaultContext }
}
