import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { UpdateBanner } from './UpdateBanner'

const pwa = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.needRefresh, pwa.setNeedRefresh],
    updateServiceWorker: pwa.updateServiceWorker,
  }),
}))

describe('UpdateBanner', () => {
  beforeEach(() => {
    pwa.needRefresh = false
    pwa.setNeedRefresh.mockClear()
    pwa.updateServiceWorker.mockClear()
  })

  it('stays hidden while no update is waiting', () => {
    render(<UpdateBanner />, { wrapper: I18nProvider })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('announces the update and activates the waiting worker on Reload', async () => {
    const user = userEvent.setup()
    pwa.needRefresh = true
    render(<UpdateBanner />, { wrapper: I18nProvider })

    expect(screen.getByRole('status')).toHaveTextContent('New version available.')
    await user.click(screen.getByRole('button', { name: 'Reload' }))

    expect(pwa.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('dismisses the notice without activating the update', async () => {
    const user = userEvent.setup()
    pwa.needRefresh = true
    render(<UpdateBanner />, { wrapper: I18nProvider })

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(pwa.setNeedRefresh).toHaveBeenCalledWith(false)
    expect(pwa.updateServiceWorker).not.toHaveBeenCalled()
  })
})
