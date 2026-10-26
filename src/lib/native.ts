import { invoke } from '@tauri-apps/api/core'
import { APP_PLATFORM } from './version'

function isAndroid(): boolean {
  return APP_PLATFORM === 'android' || APP_PLATFORM === 'androideabi'
}

export function isBackgroundPlatform(): boolean {
  return APP_PLATFORM === 'windows' || isAndroid()
}

export function setNativeBackgroundMonitoring(enabled: boolean): void {
  if (!isAndroid()) return
  window.ClyTradeNative?.setBackgroundMonitoring?.(enabled)
}

export async function writeNativeSnapshot(json: string): Promise<void> {
  if (APP_PLATFORM === 'windows') {
    await invoke('write_background_snapshot', { json })
    return
  }
  if (isAndroid()) {
    window.ClyTradeNative?.writeBackgroundSnapshot?.(json)
  }
}

export async function readNativeEvents(): Promise<string> {
  if (APP_PLATFORM === 'windows') {
    const result = await invoke<string>('read_background_events')
    return typeof result === 'string' ? result : ''
  }
  if (isAndroid()) {
    return window.ClyTradeNative?.readBackgroundEvents?.() ?? ''
  }
  return ''
}

export async function clearNativeEvents(): Promise<void> {
  if (APP_PLATFORM === 'windows') {
    await invoke('clear_background_events')
    return
  }
  if (isAndroid()) {
    window.ClyTradeNative?.clearBackgroundEvents?.()
  }
}

export function consumeNativePendingRoute(): string | null {
  if (!isAndroid()) return null
  const route = window.ClyTradeNative?.consumePendingRoute?.()
  return typeof route === 'string' && route.length > 0 ? route : null
}
