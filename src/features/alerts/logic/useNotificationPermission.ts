import { useCallback, useEffect, useState } from 'react'
import { APP_PLATFORM } from '@/lib/version'

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface NotificationPermissionHook {
  permission: NotificationPermissionState
  request: () => Promise<boolean>
}

function webPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export function useNotificationPermission(): NotificationPermissionHook {
  const native = APP_PLATFORM !== 'web'
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    native ? 'default' : webPermission(),
  )

  useEffect(() => {
    if (!native) return

    let active = true
    void (async () => {
      try {
        const { isPermissionGranted } = await import('@tauri-apps/plugin-notification')
        const granted = await isPermissionGranted()
        if (active) setPermission(granted ? 'granted' : 'default')
      } catch {
        if (active) setPermission('unsupported')
      }
    })()

    return () => {
      active = false
    }
  }, [native])

  const request = useCallback(async (): Promise<boolean> => {
    if (native) {
      try {
        const { requestPermission } = await import('@tauri-apps/plugin-notification')
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
  }, [native])

  return { permission, request }
}
