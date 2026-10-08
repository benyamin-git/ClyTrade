import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { resetDateFormatterCache } from '@/lib/dates'
import { resetFormatCaches } from '@/lib/format'
import { resetIntlContext } from '@/lib/intl'

configure({ asyncUtilTimeout: 3000 })

beforeEach(() => {
  resetIntlContext()
  resetDateFormatterCache()
  resetFormatCaches()
  localStorage.clear()
})

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => undefined
}
