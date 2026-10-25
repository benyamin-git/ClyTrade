/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
declare const __APP_PLATFORM__: string

interface ClyTradeNativeBridge {
  setDarkTheme(dark: boolean): void
  writeBackgroundSnapshot?: (json: string) => void
  readBackgroundEvents?: () => string
  clearBackgroundEvents?: () => void
}

interface Window {
  ClyTradeNative?: ClyTradeNativeBridge
}
