import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationPermission } from './useNotificationPermission'

const platform = vi.hoisted(() => ({ current: 'web' as string }))

vi.mock('@/lib/version', () => ({
  get APP_PLATFORM() {
    return platform.current
  },
}))

const plugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => 'granted' as NotificationPermission),
}))

vi.mock('@tauri-apps/plugin-notification', () => plugin)

class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
}

function stubNotification(permission: NotificationPermission): typeof FakeNotification {
  FakeNotification.permission = permission
  FakeNotification.requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
  vi.stubGlobal('Notification', FakeNotification)
  return FakeNotification
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  platform.current = 'web'
  plugin.isPermissionGranted.mockReset()
  plugin.isPermissionGranted.mockResolvedValue(true)
  plugin.requestPermission.mockReset()
  plugin.requestPermission.mockResolvedValue('granted')
  FakeNotification.permission = 'default'
  FakeNotification.requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
})

describe('useNotificationPermission on the web', () => {
  it('reports unsupported when the API is missing', () => {
    const { result } = renderHook(() => useNotificationPermission())

    expect(result.current.permission).toBe('unsupported')
  })

  it('reads the default state without prompting', () => {
    const fake = stubNotification('default')
    const { result } = renderHook(() => useNotificationPermission())

    expect(result.current.permission).toBe('default')
    expect(fake.requestPermission).not.toHaveBeenCalled()
  })

  it('reads the granted and denied states', () => {
    stubNotification('granted')
    const granted = renderHook(() => useNotificationPermission())
    expect(granted.result.current.permission).toBe('granted')

    stubNotification('denied')
    const denied = renderHook(() => useNotificationPermission())
    expect(denied.result.current.permission).toBe('denied')
  })

  it('requests permission and updates the state', async () => {
    const fake = stubNotification('default')
    const { result } = renderHook(() => useNotificationPermission())

    await act(async () => {
      await expect(result.current.request()).resolves.toBe(true)
    })

    expect(fake.requestPermission).toHaveBeenCalledOnce()
    expect(result.current.permission).toBe('granted')
  })

  it('returns false when the request is denied', async () => {
    const fake = stubNotification('default')
    fake.requestPermission.mockResolvedValueOnce('denied')
    const { result } = renderHook(() => useNotificationPermission())

    await act(async () => {
      await expect(result.current.request()).resolves.toBe(false)
    })

    expect(result.current.permission).toBe('denied')
  })

  it('returns false and reports unsupported when the API disappears', async () => {
    stubNotification('default')
    const { result } = renderHook(() => useNotificationPermission())
    vi.stubGlobal('Notification', undefined)

    await act(async () => {
      await expect(result.current.request()).resolves.toBe(false)
    })

    expect(result.current.permission).toBe('unsupported')
  })
})

describe('useNotificationPermission on native', () => {
  it('reads a granted plugin permission without prompting', async () => {
    platform.current = 'android'
    const { result } = renderHook(() => useNotificationPermission())

    await waitFor(() => expect(result.current.permission).toBe('granted'))
    expect(plugin.isPermissionGranted).toHaveBeenCalledOnce()
    expect(plugin.requestPermission).not.toHaveBeenCalled()
  })

  it('starts at default when the plugin permission is not granted', async () => {
    platform.current = 'android'
    plugin.isPermissionGranted.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useNotificationPermission())

    await waitFor(() => expect(plugin.isPermissionGranted).toHaveBeenCalledOnce())
    expect(result.current.permission).toBe('default')
    expect(plugin.requestPermission).not.toHaveBeenCalled()
  })

  it('requests permission through the plugin', async () => {
    platform.current = 'android'
    plugin.isPermissionGranted.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useNotificationPermission())
    await waitFor(() => expect(plugin.isPermissionGranted).toHaveBeenCalledOnce())

    await act(async () => {
      await expect(result.current.request()).resolves.toBe(true)
    })

    expect(plugin.requestPermission).toHaveBeenCalledOnce()
    expect(result.current.permission).toBe('granted')
  })

  it('reports a denied plugin request', async () => {
    platform.current = 'android'
    plugin.isPermissionGranted.mockResolvedValueOnce(false)
    plugin.requestPermission.mockResolvedValueOnce('denied')
    const { result } = renderHook(() => useNotificationPermission())
    await waitFor(() => expect(plugin.isPermissionGranted).toHaveBeenCalledOnce())

    await act(async () => {
      await expect(result.current.request()).resolves.toBe(false)
    })

    expect(result.current.permission).toBe('denied')
  })

  it('reports unsupported when the plugin is unavailable', async () => {
    platform.current = 'android'
    plugin.isPermissionGranted.mockRejectedValueOnce(new Error('missing plugin'))
    const { result } = renderHook(() => useNotificationPermission())

    await waitFor(() => expect(result.current.permission).toBe('unsupported'))
  })

  it('returns false when the plugin request fails', async () => {
    platform.current = 'android'
    plugin.isPermissionGranted.mockResolvedValueOnce(false)
    plugin.requestPermission.mockRejectedValueOnce(new Error('missing plugin'))
    const { result } = renderHook(() => useNotificationPermission())
    await waitFor(() => expect(plugin.isPermissionGranted).toHaveBeenCalledOnce())

    await act(async () => {
      await expect(result.current.request()).resolves.toBe(false)
    })

    expect(result.current.permission).toBe('unsupported')
  })
})
