import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2]

if (!version) {
  console.error('Usage: npm run version:set -- <x.y.z[-prerelease]>')
  process.exit(1)
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Not a valid semver version: ${version}`)
  process.exit(1)
}

execFileSync('npm', ['version', '--no-git-tag-version', version], {
  cwd: root,
  stdio: 'inherit',
})

const cargoPath = join(root, 'src-tauri', 'Cargo.toml')
const cargo = readFileSync(cargoPath, 'utf8')
writeFileSync(cargoPath, cargo.replace(/^version = "[^"]*"/m, `version = "${version}"`))

const lockPath = join(root, 'src-tauri', 'Cargo.lock')
if (existsSync(lockPath)) {
  const lock = readFileSync(lockPath, 'utf8')
  writeFileSync(
    lockPath,
    lock.replace(/(\[\[package\]\]\nname = "clytrade"\nversion = ")[^"]*(")/, `$1${version}$2`),
  )
}

console.log(`Version set to ${version}.`)
console.log(`Next: git commit, then git tag v${version} and push to trigger the release workflow.`)
