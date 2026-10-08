import { describe, expect, it, vi } from 'vitest'
import { getIntlContext, resetIntlContext, setIntlContext, subscribeIntlContext } from './intl'

describe('intl context store', () => {
  it('notifies subscribers when the context changes', () => {
    const listener = vi.fn()
    subscribeIntlContext(listener)

    setIntlContext({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getIntlContext()).toEqual({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })
  })

  it('does not notify when the context is unchanged', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })
    const listener = vi.fn()
    subscribeIntlContext(listener)

    setIntlContext({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })

    expect(listener).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeIntlContext(listener)
    unsubscribe()

    setIntlContext({ locale: 'fa-IR-u-nu-latn' })

    expect(listener).not.toHaveBeenCalled()
  })

  it('resets to the default context and notifies', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })
    const listener = vi.fn()
    subscribeIntlContext(listener)

    resetIntlContext()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getIntlContext()).toEqual({ locale: 'en-US' })
  })
})
