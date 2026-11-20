import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const logo = readFileSync(join(root, 'public', 'logo.svg'), 'utf8')
const source = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`

const targets = [
  { file: 'icon-192.png', size: 192, rounded: true },
  { file: 'icon-512.png', size: 512, rounded: true },
  { file: 'maskable-512.png', size: 512, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, rounded: false },
]

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

for (const target of targets) {
  const radius = target.rounded ? Math.round(target.size * 0.22) : 0
  const mark = Math.round(target.size * 0.8)
  await page.setViewportSize({ width: target.size, height: target.size })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}.tile{display:flex;align-items:center;justify-content:center;width:${target.size}px;height:${target.size}px;background:#000;border-radius:${radius}px}img{display:block;width:${mark}px;height:${mark}px}</style><div class="tile"><img src="${source}"></div>`,
  )
  writeFileSync(join(outDir, target.file), await page.screenshot({ omitBackground: true }))
  console.log(`generated ${target.file}`)
}

await browser.close()
