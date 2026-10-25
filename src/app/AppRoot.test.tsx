import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoot } from './AppRoot'

const calls = vi.hoisted(() => ({
  background: 0,
  foreground: 0,
  persistent: 0,
}))

vi.mock('@/lib/storage', () => ({
  requestPersistentStorage: async () => {
    calls.persistent += 1
    return true
  },
}))

vi.mock('./router', async () => {
  const { createElement } = await import('react')
  const { createMemoryRouter } = await import('react-router')
  return {
    router: createMemoryRouter([
      { path: '/', element: createElement('div', null, 'route content') },
    ]),
  }
})

vi.mock('./UpdateBanner', () => ({
  UpdateBanner: () => null,
}))

vi.mock('@/features/settings/SettingsContext', async () => {
  const { DEFAULT_PREFERENCES } = await import('@/data/models/settings')
  return {
    usePreferences: () => ({
      preferences: DEFAULT_PREFERENCES,
      setPreferences: () => undefined,
      updatePreferences: () => undefined,
      ready: true,
      error: null,
    }),
  }
})

vi.mock('@/features/alerts/logic/useBackgroundSync', async () => {
  const { useI18n } = await import('@/i18n/I18nContext')
  return {
    useBackgroundSync: () => {
      useI18n()
      calls.background += 1
    },
  }
})

vi.mock('@/features/alerts/logic/useForegroundAlerts', async () => {
  const { useI18n } = await import('@/i18n/I18nContext')
  return {
    useForegroundAlerts: () => {
      useI18n()
      calls.foreground += 1
    },
  }
})

beforeEach(() => {
  calls.background = 0
  calls.foreground = 0
  calls.persistent = 0
})

afterEach(() => {
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

describe('AppRoot', () => {
  it('mounts the background and foreground alert hooks inside the i18n provider', async () => {
    render(<AppRoot />)

    await waitFor(() => expect(calls.background).toBe(1))
    expect(calls.foreground).toBe(1)
    expect(calls.persistent).toBe(1)
  })
})
