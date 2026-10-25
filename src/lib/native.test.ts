import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  clearNativeEvents,
  isBackgroundPlatform,
  readNativeEvents,
  writeNativeSnapshot,
} from './native'

const platform = vi.hoisted(() => ({ current: 'web' as string }))

vi.mock('@/lib/version', () => ({
  get APP_PLATFORM() {
    return platform.current
  },
}))

const tauri = vi.hoisted(() => ({
  invoke: vi.fn<(command: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauri.invoke,
}))

interface FakeBridge {
  setDarkTheme: Mock<(dark: boolean) => void>
  writeBackgroundSnapshot: Mock<(json: string) => void>
  readBackgroundEvents: Mock<() => string>
  clearBackgroundEvents: Mock<() => void>
}

function installBridge(overrides: Partial<FakeBridge> = {}): FakeBridge {
  const bridge: FakeBridge = {
    setDarkTheme: vi.fn<(dark: boolean) => void>(),
    writeBackgroundSnapshot: vi.fn<(json: string) => void>(),
    readBackgroundEvents: vi.fn<() => string>(() => '[]'),
    clearBackgroundEvents: vi.fn<() => void>(),
    ...overrides,
  }
  window.ClyTradeNative = bridge
  return bridge
}

beforeEach(() => {
  platform.current = 'web'
  tauri.invoke.mockReset()
  tauri.invoke.mockResolvedValue(undefined)
  delete window.ClyTradeNative
})

afterEach(() => {
  delete window.ClyTradeNative
})

describe('background native bridge', () => {
  it('reports the platforms that support background monitoring', () => {
    expect(isBackgroundPlatform()).toBe(false)

    platform.current = 'windows'
    expect(isBackgroundPlatform()).toBe(true)

    platform.current = 'android'
    expect(isBackgroundPlatform()).toBe(true)

    platform.current = 'linux'
    expect(isBackgroundPlatform()).toBe(false)
  })

  it('is a no-op on the web', async () => {
    const bridge = installBridge()

    await writeNativeSnapshot('{"version":1}')
    expect(await readNativeEvents()).toBe('')
    await clearNativeEvents()

    expect(tauri.invoke).not.toHaveBeenCalled()
    expect(bridge.writeBackgroundSnapshot).not.toHaveBeenCalled()
    expect(bridge.readBackgroundEvents).not.toHaveBeenCalled()
    expect(bridge.clearBackgroundEvents).not.toHaveBeenCalled()
  })

  it('uses the Tauri commands on Windows', async () => {
    platform.current = 'windows'

    await writeNativeSnapshot('{"version":1}')
    tauri.invoke.mockResolvedValueOnce('{"events":[]}')
    expect(await readNativeEvents()).toBe('{"events":[]}')
    await clearNativeEvents()

    expect(tauri.invoke.mock.calls).toEqual([
      ['write_background_snapshot', { json: '{"version":1}' }],
      ['read_background_events'],
      ['clear_background_events'],
    ])
  })

  it('uses the Android bridge', async () => {
    platform.current = 'android'
    const bridge = installBridge({
      readBackgroundEvents: vi.fn(() => '{"events":[1]}'),
    })

    await writeNativeSnapshot('{"version":1}')
    expect(await readNativeEvents()).toBe('{"events":[1]}')
    await clearNativeEvents()

    expect(bridge.writeBackgroundSnapshot).toHaveBeenCalledWith('{"version":1}')
    expect(bridge.readBackgroundEvents).toHaveBeenCalledOnce()
    expect(bridge.clearBackgroundEvents).toHaveBeenCalledOnce()
    expect(tauri.invoke).not.toHaveBeenCalled()
  })

  it('treats the Android eabi platform as Android', async () => {
    platform.current = 'androideabi'
    const bridge = installBridge()

    await writeNativeSnapshot('{}')
    await readNativeEvents()
    await clearNativeEvents()

    expect(bridge.writeBackgroundSnapshot).toHaveBeenCalledWith('{}')
    expect(bridge.readBackgroundEvents).toHaveBeenCalledOnce()
    expect(bridge.clearBackgroundEvents).toHaveBeenCalledOnce()
  })

  it('does not throw when the Android bridge is missing', async () => {
    platform.current = 'android'

    await expect(writeNativeSnapshot('{}')).resolves.toBeUndefined()
    expect(await readNativeEvents()).toBe('')
    await expect(clearNativeEvents()).resolves.toBeUndefined()
  })
})
