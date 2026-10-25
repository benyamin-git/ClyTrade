import { act } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSettings, getPreferences } from '@/data/repositories/settings.repo'
import { I18nProvider } from '@/i18n/I18nProvider'
import { WindowsClosePrompt } from './WindowsClosePrompt'

const platform = vi.hoisted(() => ({ current: 'windows' as string }))

vi.mock('@/lib/version', () => ({
  get APP_PLATFORM() {
    return platform.current
  },
}))

const tauri = vi.hoisted(() => ({
  invoke: vi.fn<(command: string, args?: Record<string, unknown>) => Promise<unknown>>(),
  listen:
    vi.fn<(event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>>(),
  handlers: new Map<string, (event: { payload: unknown }) => void>(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauri.invoke,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: tauri.listen,
}))

function renderPrompt() {
  render(
    <I18nProvider>
      <WindowsClosePrompt />
    </I18nProvider>,
  )
}

async function openPrompt() {
  renderPrompt()
  await waitFor(() => expect(tauri.handlers.has('windows-close-prompt')).toBe(true))
  await act(async () => {
    tauri.handlers.get('windows-close-prompt')?.({ payload: null })
  })
  return screen.getByRole('dialog', { name: 'Close ClyTrade?' })
}

describe('WindowsClosePrompt', () => {
  beforeEach(async () => {
    platform.current = 'windows'
    tauri.invoke.mockReset()
    tauri.invoke.mockResolvedValue(undefined)
    tauri.handlers.clear()
    tauri.listen.mockReset()
    tauri.listen.mockImplementation(async (event, handler) => {
      tauri.handlers.set(event, handler)
      return () => tauri.handlers.delete(event)
    })
    await clearSettings()
  })

  it('does not listen for the close prompt off Windows', async () => {
    platform.current = 'web'
    renderPrompt()

    await act(async () => undefined)

    expect(tauri.listen).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the sheet when the native close event arrives', async () => {
    const dialog = await openPrompt()

    expect(dialog).toHaveTextContent('Hide to tray')
    expect(dialog).toHaveTextContent('Quit')
    expect(tauri.invoke).not.toHaveBeenCalled()
  })

  it('persists tray before asking native code to hide the window', async () => {
    const user = userEvent.setup()
    let behaviorAtInvoke: string | null = null
    tauri.invoke.mockImplementation(async () => {
      behaviorAtInvoke = (await getPreferences()).windowsCloseBehavior
      return undefined
    })
    await openPrompt()

    await user.click(screen.getByRole('button', { name: 'Hide to tray' }))

    await waitFor(() => {
      expect(tauri.invoke).toHaveBeenCalledWith('resolve_windows_close', { behavior: 'tray' })
    })
    await waitFor(async () => {
      expect((await getPreferences()).windowsCloseBehavior).toBe('tray')
    })
    expect(behaviorAtInvoke).toBe('tray')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('persists quit before asking native code to exit', async () => {
    const user = userEvent.setup()
    let behaviorAtInvoke: string | null = null
    tauri.invoke.mockImplementation(async () => {
      behaviorAtInvoke = (await getPreferences()).windowsCloseBehavior
      return undefined
    })
    await openPrompt()

    await user.click(screen.getByRole('button', { name: 'Quit' }))

    await waitFor(() => {
      expect(tauri.invoke).toHaveBeenCalledWith('resolve_windows_close', { behavior: 'quit' })
    })
    await waitFor(async () => {
      expect((await getPreferences()).windowsCloseBehavior).toBe('quit')
    })
    expect(behaviorAtInvoke).toBe('quit')
  })
})
