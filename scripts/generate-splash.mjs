import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, drawMark, encodePng, fillRect } from './png.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'splash')
const screens = JSON.parse(readFileSync(join(root, 'src', 'pwa', 'splash-screens.json'), 'utf8'))
mkdirSync(outDir, { recursive: true })

const BACKGROUND = [28, 27, 31, 255]
const ACCENT = [125, 174, 236, 255]

const seen = new Set()
for (const screen of screens) {
  for (const orientation of ['portrait', 'landscape']) {
    const width = Math.round(
      (orientation === 'portrait' ? screen.width : screen.height) * screen.ratio,
    )
    const height = Math.round(
      (orientation === 'portrait' ? screen.height : screen.width) * screen.ratio,
    )
    const file = `splash-${width}x${height}.png`
    if (seen.has(file)) continue
    seen.add(file)

    const canvas = createCanvas(width, height)
    fillRect(canvas, 0, 0, width, height, BACKGROUND)
    const mark = Math.round(Math.min(width, height) * 0.26)
    drawMark(canvas, Math.round((width - mark) / 2), Math.round((height - mark) / 2), mark, ACCENT)
    writeFileSync(join(outDir, file), encodePng(width, height, canvas.pixels))
  }
}

console.log(`generated ${seen.size} splash screens`)
