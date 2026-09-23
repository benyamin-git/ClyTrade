import { readFileSync, writeFileSync } from 'node:fs'

const ACCENTS = [
  { id: 'teal', hue: 195, chroma: 0.1 },
  { id: 'blue', hue: 255, chroma: 0.15 },
  { id: 'green', hue: 145, chroma: 0.13 },
  { id: 'lime', hue: 115, chroma: 0.14 },
  { id: 'amber', hue: 80, chroma: 0.13 },
  { id: 'orange', hue: 45, chroma: 0.15 },
  { id: 'rose', hue: 15, chroma: 0.15 },
  { id: 'violet', hue: 300, chroma: 0.14 },
]

const SECONDARY_RATIO = 0.28
const TERTIARY_RATIO = 0.46
const TERTIARY_HUE_SHIFT = 60

const PRIMARY_TONES = {
  light: [
    ['primary', 0.4955, 1],
    ['on-primary', 1, 0],
    ['primary-container', 0.918, 0.36],
    ['on-primary-container', 0.24, 1.05],
    ['surface-tint', 0.4955, 1],
    ['inverse-primary', 0.835, 0.72],
  ],
  dark: [
    ['primary', 0.835, 0.72],
    ['on-primary', 0.325, 1.04],
    ['primary-container', 0.41, 1.02],
    ['on-primary-container', 0.918, 0.36],
    ['surface-tint', 0.835, 0.72],
    ['inverse-primary', 0.4955, 1],
  ],
}

const SECONDARY_TONES = {
  light: [
    ['secondary', 0.4859, 1],
    ['on-secondary', 1, 0],
    ['secondary-container', 0.9163, 1.02],
    ['on-secondary-container', 0.2272, 0.97],
  ],
  dark: [
    ['secondary', 0.8303, 1.04],
    ['on-secondary', 0.3124, 1.01],
    ['secondary-container', 0.4005, 0.95],
    ['on-secondary-container', 0.9163, 1.02],
  ],
}

const TERTIARY_TONES = {
  light: [
    ['tertiary', 0.4904, 1],
    ['on-tertiary', 1, 0],
    ['tertiary-container', 0.9184, 0.76],
    ['on-tertiary-container', 0.2323, 0.9],
  ],
  dark: [
    ['tertiary', 0.8367, 1.1],
    ['on-tertiary', 0.3171, 0.94],
    ['tertiary-container', 0.4044, 0.98],
    ['on-tertiary-container', 0.9184, 0.76],
  ],
}

const NEUTRAL_ROLES = [
  'background',
  'on-background',
  'surface',
  'on-surface',
  'surface-variant',
  'on-surface-variant',
  'outline',
  'outline-variant',
  'inverse-surface',
  'inverse-on-surface',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
]

function srgbFromLinear(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

function linearFromSrgb(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function oklchToLinear(L, C, H) {
  const hRad = (H * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function inGamut(rgb) {
  return rgb.every((c) => c >= -0.0001 && c <= 1.0001)
}

function toHex(rgb) {
  return `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, srgbFromLinear(c))) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function oklchToHex(L, C, H) {
  let chroma = C
  let rgb = oklchToLinear(L, chroma, H)
  let low = 0
  let high = C
  for (let i = 0; i < 40 && !inGamut(rgb); i += 1) {
    high = chroma
    chroma = (low + high) / 2
    rgb = oklchToLinear(L, chroma, H)
  }
  return toHex(rgb)
}

function hexToOklch(hex) {
  const r = linearFromSrgb(parseInt(hex.slice(1, 3), 16) / 255)
  const g = linearFromSrgb(parseInt(hex.slice(3, 5), 16) / 255)
  const b = linearFromSrgb(parseInt(hex.slice(5, 7), 16) / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(a, bb) }
}

function readThemeColors(url) {
  const css = readFileSync(url, 'utf8')
  const colors = new Map()
  const pattern = /--md-sys-color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g
  let match
  while ((match = pattern.exec(css)) !== null) {
    colors.set(match[1], match[2])
  }
  return colors
}

function familyDeclarations(tones, hue, chroma) {
  return tones
    .map(([role, L, scale]) => `  --md-sys-color-${role}: ${oklchToHex(L, chroma * scale, hue)};`)
    .join('\n')
}

function neutralDeclarations(colors, hue) {
  return NEUTRAL_ROLES.map((role) => {
    const hex = colors.get(role)
    if (!hex) throw new Error(`Theme is missing --md-sys-color-${role}`)
    const { L, C } = hexToOklch(hex)
    return `  --md-sys-color-${role}: ${oklchToHex(L, C, hue)};`
  }).join('\n')
}

function palette(tones, hue, chroma) {
  return [
    familyDeclarations(tones.primary, hue, chroma),
    familyDeclarations(tones.secondary, hue, chroma * SECONDARY_RATIO),
    familyDeclarations(tones.tertiary, hue + TERTIARY_HUE_SHIFT, chroma * TERTIARY_RATIO),
  ]
}

const lightColors = readThemeColors(new URL('../src/theme/themes/md3-light.css', import.meta.url))
const darkColors = readThemeColors(new URL('../src/theme/themes/md3-dark.css', import.meta.url))

const blocks = ACCENTS.map((accent) => {
  const light = [
    ...palette(
      {
        primary: PRIMARY_TONES.light,
        secondary: SECONDARY_TONES.light,
        tertiary: TERTIARY_TONES.light,
      },
      accent.hue,
      accent.chroma,
    ),
    neutralDeclarations(lightColors, accent.hue),
  ].join('\n\n')

  const dark = [
    ...palette(
      {
        primary: PRIMARY_TONES.dark,
        secondary: SECONDARY_TONES.dark,
        tertiary: TERTIARY_TONES.dark,
      },
      accent.hue,
      accent.chroma,
    ),
    neutralDeclarations(darkColors, accent.hue),
  ].join('\n\n')

  const blackNight = palette(
    {
      primary: PRIMARY_TONES.dark,
      secondary: SECONDARY_TONES.dark,
      tertiary: TERTIARY_TONES.dark,
    },
    accent.hue,
    accent.chroma,
  ).join('\n\n')

  return [
    `[data-theme='md3-light'][data-accent='${accent.id}'] {\n${light}\n}`,
    `[data-theme='md3-dark'][data-accent='${accent.id}'] {\n${dark}\n}`,
    `[data-theme='black-night'][data-accent='${accent.id}'] {\n${blackNight}\n}`,
  ].join('\n\n')
})

const output = `${blocks.join('\n\n')}\n`
writeFileSync(new URL('../src/theme/accents.css', import.meta.url), output)
console.log(`Generated ${ACCENTS.length} accent palettes into src/theme/accents.css`)
