import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const res = join(root, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res')

writeFileSync(
  join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <foreground android:drawable="@drawable/ic_launcher_foreground_inset"/>
  <background android:drawable="@color/ic_launcher_background"/>
</adaptive-icon>
`,
)

writeFileSync(
  join(res, 'drawable', 'ic_launcher_foreground_inset.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@mipmap/ic_launcher_foreground"
    android:inset="25.2dp" />
`,
)

writeFileSync(
  join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#000000</color>
</resources>
`,
)
