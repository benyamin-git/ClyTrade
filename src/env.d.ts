/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __APP_PLATFORM__: string

interface ClyTradeNativeBridge {
  setDarkTheme(dark: boolean): void
}

interface Window {
  ClyTradeNative?: ClyTradeNativeBridge
}
