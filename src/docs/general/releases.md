# Platforms & Releases

ClyTrade ships as one app in three forms: an installable **PWA**, a **Windows**
desktop app (`.exe`) and an **Android** app (`.apk`). All three run the same
code, the same calculations and the same local database layer.

## Why native builds exist

The PWA is the default and the source of truth: install it from the browser and
it keeps working offline. The Windows and Android builds exist for the places
where a browser install is awkward — a desktop window that always opens as an
app, or a launcher icon that survives without a browser profile. They wrap the
same web app in the operating system's own webview (WebView2 on Windows, the
Android System WebView on Android). There is no second codebase and no server.

## Version numbers

Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.
While ClyTrade is `0.x`, expect breaking changes between minor versions;
`1.0.0` is the first stable release. Test builds may carry a suffix such as
`0.1.0-rc.1`.

**Settings → Preferences** shows the exact build you are running at the bottom
of the page, followed by the platform (`Web`, `Windows`, `Android`). The same
version appears in the Windows file properties and in the Android app info, so
"which build do I have?" is always answerable without opening the app.

## Where builds come from

The PWA needs no download: it updates itself in the background. Windows and
Android builds are attached to
[GitHub Releases](https://github.com/benyamin-git/ClyTrade/releases) as:

- `ClyTrade-<version>-windows-x64.exe` — portable, no installation
- `ClyTrade-<version>-windows-x64-setup.exe` — installer
- `ClyTrade-<version>-android-universal.apk` — install on Android

These are test builds and are not code-signed. Windows SmartScreen warns about
the unknown publisher the first time (choose **More info → Run anyway**), and
Android asks you to allow installing apps from your browser or file manager.

## Data is per install

Every install owns its local database. The browser PWA, the Windows app and the
Android app do **not** share data, because the operating system gives each one
its own storage sandbox. This is intentional: an app that cannot reach across
sandboxes cannot leak your trades to another one.

To move data, use **Export backup** in Settings → Data Controls on the source
install and **Import** on the target. The backup includes your trades, assets
and settings, with a schema version so a restore can tell you if the file came
from a newer build than the one importing it.

## Updates

- **PWA** — updates silently when a new version is deployed.
- **Windows / Android** — download the newer release and install it over the
  old one; your data is kept.

Export a backup before updating if you want a safety net, especially before
switching between major versions.
