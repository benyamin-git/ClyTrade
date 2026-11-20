import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'splash')
const screens = JSON.parse(readFileSync(join(root, 'src', 'pwa', 'splash-screens.json'), 'utf8'))
mkdirSync(outDir, { recursive: true })

const logo = readFileSync(join(root, 'public', 'logo.svg'), 'utf8')
const source = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

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

    const mark = Math.round(Math.min(width, height) * 0.34)
    await page.setViewportSize({ width, height })
    await page.setContent(
      `<style>html,body{margin:0;height:100%;background:#000;display:flex;align-items:center;justify-content:center}img{display:block;width:${mark}px;height:${mark}px}</style><img src="${source}">`,
    )
    writeFileSync(join(outDir, file), await page.screenshot())
  }
}

console.log(`generated ${seen.size} splash screens`)
await browser.close()
