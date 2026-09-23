import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.argv[2]
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const outDir = join(root, 'release')

if (platform !== 'windows' && platform !== 'android') {
  console.error('Usage: node scripts/collect-artifacts.mjs <windows|android>')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

function collect(from, name) {
  if (!existsSync(from)) {
    console.error(`collect-artifacts: missing ${from}`)
    process.exit(1)
  }
  copyFileSync(from, join(outDir, name))
  console.log(`collected release/${name}`)
}

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

if (platform === 'windows') {
  collect(
    join(root, 'src-tauri', 'target', 'release', 'ClyTrade.exe'),
    `ClyTrade-${version}-windows-x64.exe`,
  )

  const setup = walk(join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis')).find((path) =>
    path.endsWith('-setup.exe'),
  )
  if (!setup) {
    console.error('collect-artifacts: no NSIS setup executable found')
    process.exit(1)
  }
  collect(setup, `ClyTrade-${version}-windows-x64-setup.exe`)
}

if (platform === 'android') {
  const apks = walk(join(root, 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk'))
    .filter((path) => path.endsWith('.apk'))
    .sort()

  if (apks.length === 0) {
    console.error('collect-artifacts: no APK found')
    process.exit(1)
  }

  for (const apk of apks) {
    const universal = apk.includes('universal')
    const abi = apk.match(/app-(.+?)-release\.apk$/)?.[1]
    const suffix = universal ? 'universal' : (abi ?? 'release')
    collect(apk, `ClyTrade-${version}-android-${suffix}.apk`)
  }
}
