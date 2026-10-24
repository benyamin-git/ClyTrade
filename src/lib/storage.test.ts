import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './storage'

function setStorage(value: unknown): void {
  Object.defineProperty(navigator, 'storage', { value, configurable: true })
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).storage
})

describe('requestPersistentStorage', () => {
  it('returns null when the Storage API is unavailable', async () => {
    await expect(requestPersistentStorage()).resolves.toBeNull()
  })

  it('returns true without asking when storage is already persistent', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    setStorage({ persisted: () => Promise.resolve(true), persist })

    await expect(requestPersistentStorage()).resolves.toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('asks the browser for persistent storage', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    setStorage({ persisted: () => Promise.resolve(false), persist })

    await expect(requestPersistentStorage()).resolves.toBe(true)
    expect(persist).toHaveBeenCalledOnce()
  })

  it('reports a denied request', async () => {
    setStorage({ persisted: () => Promise.resolve(false), persist: () => Promise.resolve(false) })

    await expect(requestPersistentStorage()).resolves.toBe(false)
  })

  it('returns null when the browser throws', async () => {
    setStorage({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.reject(new Error('denied')),
    })

    await expect(requestPersistentStorage()).resolves.toBeNull()
  })
})
