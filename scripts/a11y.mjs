import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { chromium, devices } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOST = '127.0.0.1'
const PORT = Number(process.env.A11Y_PORT ?? 5198)
const BASE_URL = `http://${HOST}:${PORT}`
const SETTLE_MS = 600
const THEMES = ['light', 'dark', 'oled']

const ROUTES = [
  {
    route: '/calculations/position-size',
    ready: (page) => page.getByRole('heading', { name: 'Position Size' }),
  },
  {
    route: '/journal/overview',
    ready: (page) => page.getByText('BTCUSDT').first(),
  },
  {
    route: '/journal/stats',
    ready: (page) => page.getByText('Equity curve'),
  },
  {
    route: '/portfolio/overview',
    ready: (page) => page.getByText('Bitcoin'),
  },
  {
    route: '/portfolio/stats',
    ready: (page) => page.getByText('Unrealized PnL by asset'),
  },
  {
    route: '/settings/themes',
    ready: (page) => page.getByRole('heading', { name: 'Accent' }),
  },
]

const CONTEXTS = [
  {
    name: 'desktop',
    options: {
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    },
  },
  { name: 'mobile', options: devices['Pixel 7'] },
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

async function audit(page, contextName, theme, totals) {
  for (const spec of ROUTES) {
    await page.goto(`${BASE_URL}/#${spec.route}`, { waitUntil: 'load' })
    await spec.ready(page).first().waitFor({ timeout: 15_000 })
    await page.waitForTimeout(SETTLE_MS)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const violations = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    const label = `[${contextName} ${theme}] ${spec.route}`
    if (violations.length === 0) {
      console.log(`${label}: 0 serious/critical violations`)
      continue
    }
    totals.violations += violations.length
    console.log(`${label}: ${violations.length} serious/critical violations`)
    for (const violation of violations) {
      for (const node of violation.nodes) {
        console.log(`  ${violation.impact} ${violation.id} → ${node.target.join(' ')}`)
      }
    }
  }
}

async function runContext(browser, spec, totals) {
  const context = await browser.newContext(spec.options)
  try {
    const page = await context.newPage()
    if (spec.name === 'mobile') {
      const coarse = await page.evaluate(() => globalThis.matchMedia('(pointer: coarse)').matches)
      if (!coarse) throw new Error('Mobile context did not report a coarse pointer')
    }
    await seedSampleData(page)
    for (const theme of THEMES) {
      await page.evaluate((value) => {
        localStorage.setItem('clytrade.theme', value)
      }, theme)
      await page.reload()
      await page.waitForFunction(
        (value) => globalThis.document.documentElement.dataset.theme === value,
        theme,
      )
      await audit(page, spec.name, theme, totals)
    }
  } finally {
    await context.close()
  }
}

async function main() {
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
    const totals = { violations: 0 }
    for (const spec of CONTEXTS) {
      console.log(`Auditing ${spec.name} (${THEMES.length} themes × ${ROUTES.length} routes)`)
      await runContext(browser, spec, totals)
    }
    if (totals.violations === 0) {
      console.log('0 serious/critical violations')
    } else {
      console.error(`${totals.violations} serious/critical violations`)
      process.exitCode = 1
    }
  } finally {
    if (browser) await browser.close()
    shutdown()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
