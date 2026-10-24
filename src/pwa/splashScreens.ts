import screens from './splash-screens.json' with { type: 'json' }

export interface SplashScreen {
  width: number
  height: number
  ratio: number
}

export interface SplashLink {
  file: string
  media: string
}

export type SplashOrientation = 'portrait' | 'landscape'

export const SPLASH_SCREENS: readonly SplashScreen[] = screens

function pixelSize(value: number, ratio: number): number {
  return Math.round(value * ratio)
}

function splashLink(device: SplashScreen, orientation: SplashOrientation): SplashLink {
  const portrait = orientation === 'portrait'
  const width = portrait ? device.width : device.height
  const height = portrait ? device.height : device.width
  const pixelsWide = pixelSize(width, device.ratio)
  const pixelsHigh = pixelSize(height, device.ratio)
  return {
    file: `splash/splash-${pixelsWide}x${pixelsHigh}.png`,
    media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${device.ratio}) and (orientation: ${orientation})`,
  }
}

export function splashLinks(): SplashLink[] {
  return SPLASH_SCREENS.flatMap((device) => [
    splashLink(device, 'portrait'),
    splashLink(device, 'landscape'),
  ])
}

export function injectSplashLinks(html: string, base = '/'): string {
  const normalized = base.endsWith('/') ? base : `${base}/`
  const tags = splashLinks()
    .map(
      ({ file, media }) =>
        `    <link rel="apple-touch-startup-image" href="${normalized}${file}" media="${media}" />`,
    )
    .join('\n')
  return html.replace('</head>', `${tags}\n  </head>`)
}
