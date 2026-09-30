# TODO

Open ideas, known bugs and planned work for ClyTrade. This is a living list:
items are deleted as soon as they are implemented or fixed, so anything still
here is still open.

Maintained by the project owner. To report a bug or suggest a feature, please
use GitHub Issues or Discussions instead — see [CONTRIBUTING.md](./CONTRIBUTING.md).

- Include the theme and accent choice in backups. They live in localStorage, so
  they are not part of the backup file and do not follow a restore to another
  device.
- Translate the documentation bodies into Persian. `src/docs/fa/**` currently
  falls back to English; the registry titles and summaries are translated.
- Localize the sample data. Strategies, notes and asset names in
  `src/data/sampleData.ts` are English in both languages.
- Remember the per-field unit choice (percent or currency) between visits. The
  toggles currently reset to percent whenever a calculator is reopened.
- Native iOS support: Tauri can target iOS, but building requires macOS + Xcode
  and installing on someone else's iPhone requires an eligible Apple Developer
  Program account ($99/yr) for TestFlight or ad-hoc distribution. The PWA is the
  supported iOS path for now — see the README.
- Generate Apple touch splash screens (`apple-touch-startup-image` per device
  size) for the installed iOS PWA.
- Request persistent storage (`navigator.storage.persist()`) where supported.
  Installed iOS web apps are exempt from Safari's 7-day storage eviction, but
  data can still be evicted under disk pressure.
- Android in-place updates fail: CI generates a fresh debug keystore on every
  run, so each APK has a different signing certificate and Android rejects the
  update ("App not installed"). Uninstalling first is the only workaround and it
  wipes local data. Before v1.0.0, sign release builds with a stable release
  keystore (kept in repository secrets) instead of the per-run debug key.
