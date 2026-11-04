import { useCallback, useEffect, useRef, useState } from 'react'
import { isAndroid, openNotificationSettings } from '@/lib/native'
import { APP_PLATFORM } from '@/lib/version'

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface NotificationPermissionHook {
  permission: NotificationPermissionState
  request: () => Promise<boolean>
  openSettings: (() => void) | null
}

function webPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

async function nativePermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  try {
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification')
    return (await isPermissionGranted()) ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

function applyNative(
  next: 'granted' | 'denied' | 'unsupported',
  current: NotificationPermissionState,
): NotificationPermissionState {
  if (next === 'unsupported') return 'unsupported'
  if (next === 'granted') return 'granted'
  return current === 'default' ? 'default' : 'denied'
}

export function useNotificationPermission(): NotificationPermissionHook {
  const native = APP_PLATFORM !== 'web'
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    native ? 'default' : webPermission(),
  )
  const requestVersion = useRef(0)

  useEffect(() => {
    if (!native) return

    let active = true
    const version = requestVersion.current
    void (async () => {
      const next = await nativePermission()
      if (active && version === requestVersion.current) {
        setPermission((current) => applyNative(next, current))
      }
    })()

    return () => {
      active = false
    }
  }, [native])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (!native) {
        setPermission(webPermission())
        return
      }

      const version = requestVersion.current
      void (async () => {
        const next = await nativePermission()
        if (version === requestVersion.current) {
          setPermission((current) => applyNative(next, current))
        }
      })()
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [native])

  const request = useCallback(async (): Promise<boolean> => {
    if (permission === 'granted') return true

    requestVersion.current += 1

    if (native) {
      try {
        const { isPermissionGranted, requestPermission } =
          await import('@tauri-apps/plugin-notification')
        if (await isPermissionGranted()) {
          setPermission('granted')
          return true
        }
        const result = await requestPermission()
        const next: NotificationPermissionState =
          result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'default'
        setPermission(next)
        return next === 'granted'
      } catch {
        setPermission('unsupported')
        return false
      }
    }

    if (typeof Notification === 'undefined') {
      setPermission('unsupported')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch {
      return false
    }
  }, [native, permission])

  const canOpenSettings = isAndroid() || APP_PLATFORM === 'ios'

  return {
    permission,
    request,
    openSettings: canOpenSettings ? openNotificationSettings : null,
  }
}
