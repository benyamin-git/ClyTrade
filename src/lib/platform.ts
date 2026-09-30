type IosNavigator = Navigator & { standalone?: boolean }

const IOS_UA = /iPad|iPhone|iPod/

export function isIos(): boolean {
  const ua = navigator.userAgent
  if (IOS_UA.test(ua)) return true
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
}

export function isStandalone(): boolean {
  if ((navigator as IosNavigator).standalone === true) return true
  return window.matchMedia('(display-mode: standalone)').matches
}
