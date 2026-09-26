import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOST = '127.0.0.1'
const PORT = Number(process.env.SCREENSHOTS_PORT ?? 5199)
const BASE_URL = `http://${HOST}:${PORT}`
const OUT_DIR = path.join(ROOT, 'screenshots', 'desktop')
const VIEWPORT = { width: 1440, height: 900 }
const SETTLE_MS = 900

const PAGES = [
  {
    slug: 'journal-stats',
    route: '/journal/stats',
    ready: (page) => page.getByText('Equity curve'),
    prepare: async (page) => {
      await page.getByRole('tab', { name: 'All' }).click()
    },
  },
  {
    slug: 'portfolio-stats',
    route: '/portfolio/stats',
    ready: (page) => page.getByText('Unrealized PnL by asset'),
  },
  {
    slug: 'journal-overview',
    route: '/journal/overview',
    ready: (page) => page.getByText('BTCUSDT').first(),
  },
  {
    slug: 'position-size',
    route: '/calculations/position-size',
    ready: (page) => page.getByRole('heading', { name: 'Position Size' }),
    prepare: async (page) => {
      await page.getByLabel('Account size').fill('25000')
      await page.getByLabel('Entry price').fill('68200')
      await page.getByLabel('Stop price').fill('66800')
    },
  },
  {
    slug: 'settings-themes',
    route: '/settings/themes',
    ready: (page) => page.getByText('Material Light'),
  },
]

function startServer() {
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  const output = []
  const child = spawn(
    process.execPath,
    [viteBin, '--host', HOST, '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
      output.push(chunk)
      if (output.length > 50) output.shift()
    })
  }
  return { child, output: () => output.join('') }
}

async function waitForServer(server, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`Vite exited early:\n${server.output()}`)
    }
    try {
      const response = await fetch(BASE_URL)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Vite did not start at ${BASE_URL} within ${timeoutMs / 1000}s`)
}

async function seedSampleData(page) {
  await page.goto(`${BASE_URL}/#/settings/data`, { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Load sample data' }).click()
  await page.getByRole('button', { name: 'Load samples' }).click()
  await page.getByText('Sample data loaded.').waitFor({ timeout: 10_000 })
}

async function capture(page, spec) {
  const pageErrors = []
  const onPageError = (error) => pageErrors.push(error)
  page.on('pageerror', onPageError)
  try {
    await page.goto(`${BASE_URL}/#${spec.route}`, { waitUntil: 'load' })
    await spec.ready(page).first().waitFor({ timeout: 15_000 })
    if (spec.prepare) await spec.prepare(page)
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await page.waitForTimeout(SETTLE_MS)
    if (pageErrors.length > 0) {
      throw new Error(`Page error on ${spec.route}: ${pageErrors[0].message}`)
    }
    const file = path.join(OUT_DIR, `${spec.slug}.png`)
    await page.screenshot({ path: file, animations: 'disabled' })
    console.log(`  saved ${path.relative(ROOT, file)}`)
  } finally {
    page.off('pageerror', onPageError)
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  console.log(`Starting Vite on ${BASE_URL}`)
  const server = startServer()
  const shutdown = () => {
    if (server.child.exitCode === null) server.child.kill('SIGTERM')
  }
  process.on('exit', shutdown)
  process.on('SIGINT', () => {
    shutdown()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    shutdown()
    process.exit(143)
  })

  let browser
  try {
    await waitForServer(server)
    browser = await chromium.launch()
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    })
    await context.addInitScript(() => {
      try {
        localStorage.setItem('clytrade.theme', 'md3-dark')
      } catch {
        // storage unavailable
      }
    })

    const page = await context.newPage()
    console.log('Loading sample data')
    await seedSampleData(page)

    console.log('Capturing pages')
    for (const spec of PAGES) {
      await capture(page, spec)
    }
    console.log(`Done: ${PAGES.length} screenshots in ${path.relative(ROOT, OUT_DIR)}`)
  } finally {
    if (browser) await browser.close()
    shutdown()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
