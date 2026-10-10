# TODO

Open ideas, known bugs and planned work for ClyTrade. This is a living list:
items are deleted as soon as they are implemented or fixed, so anything still
here is still open.

Maintained by the project owner. To report a bug or suggest a feature, please
use GitHub Issues or Discussions instead — see [CONTRIBUTING.md](./CONTRIBUTING.md).

- Include the theme and accent choice in backups. They live in localStorage, so
  they are not part of the backup file and do not follow a restore to another
  device.
- Localize the sample data. Strategies, notes and asset names in
  `src/data/sampleData.ts` are English in both languages.
- Remember the per-field unit choice (percent or currency) between visits. The
  toggles currently reset to percent whenever a calculator is reopened.
- Disable in-app zoom. Pinch and double-tap zoom work in the Android wrapper
  and likely in the iOS PWA; zooming has no use in this interface and an
  accidental zoom during a trade is an annoyance. Lock the viewport scale and
  block gesture zooming without breaking normal scrolling.
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
- GitHub Actions still warn that `actions/checkout`, `setup-node`,
  `configure-pages`, `upload-artifact` and `deploy-pages` target Node 20 and are
  forced onto Node 24. Harmless today; bump the action majors in both workflows
  when convenient.
- Work through the Low/Nit findings from the 2026-10-03 full code review in
  `docs/reviews/2026-10-03-code-review.md`. The High and Medium findings were
  fixed on 2026-10-03; see the completion log in
  `docs/superpowers/plans/2026-10-03-code-review-fixes.md` for the commit per
  task.
