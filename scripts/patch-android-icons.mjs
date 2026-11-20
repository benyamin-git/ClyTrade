import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const res = join(root, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res')

writeFileSync(
  join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#000000</color>
</resources>
`,
)
