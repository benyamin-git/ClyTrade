import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, drawMark, encodePng, fillRoundedRect } from './png.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const BACKGROUND = [28, 27, 31, 255]
const ACCENT = [125, 174, 236, 255]

function drawIcon(size, { rounded, padding }) {
  const canvas = createCanvas(size, size)
  fillRoundedRect(canvas, rounded ? size * 0.22 : 0, BACKGROUND)
  drawMark(canvas, padding, padding, size - padding * 2, ACCENT)
  return canvas
}

const targets = [
  { file: 'icon-192.png', size: 192, rounded: true, padding: 18 },
  { file: 'icon-512.png', size: 512, rounded: true, padding: 48 },
  { file: 'maskable-512.png', size: 512, rounded: false, padding: 118 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, padding: 17 },
]

for (const target of targets) {
  const canvas = drawIcon(target.size, target)
  writeFileSync(join(outDir, target.file), encodePng(target.size, target.size, canvas.pixels))
  console.log(`generated ${target.file}`)
}
