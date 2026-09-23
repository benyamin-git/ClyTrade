export const APP_VERSION = __APP_VERSION__
export const APP_PLATFORM = __APP_PLATFORM__

const PLATFORM_LABELS: Record<string, string> = {
  web: 'Web',
  windows: 'Windows',
  linux: 'Linux',
  darwin: 'macOS',
  android: 'Android',
  ios: 'iOS',
}

export const PLATFORM_LABEL = PLATFORM_LABELS[APP_PLATFORM] ?? APP_PLATFORM
