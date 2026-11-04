/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
declare const __APP_PLATFORM__: string

interface ClyTradeNativeBridge {
  setDarkTheme(dark: boolean): void
  setBackgroundMonitoring?: (enabled: boolean) => void
  writeBackgroundSnapshot?: (json: string) => void
  readBackgroundEvents?: () => string
  clearBackgroundEvents?: () => void
  consumePendingRoute?: () => string
  openNotificationSettings?: () => void
}

interface Window {
  ClyTradeNative?: ClyTradeNativeBridge
}
