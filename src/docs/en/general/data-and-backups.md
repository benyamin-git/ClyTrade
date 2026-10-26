# Data & Backups

## Where data lives

All data is stored in IndexedDB on your device, in a database named `clytrade`.
Nothing is sent anywhere. Where the browser supports it, ClyTrade asks for
persistent storage so the database is less likely to be evicted under disk
pressure. That protection is not a backup — keep exporting files.

## Export

Settings → Data Controls → **Export backup** produces a single JSON file. On
iPhone and iPad it opens the iOS share sheet so you can save it to Files, send
it to yourself or copy it somewhere else; on other platforms it downloads
directly:

```json
{
  "app": "clytrade",
  "schemaVersion": 3,
  "exportedAt": "…",
  "data": {
    "trades": [],
    "assets": [],
    "settings": [],
    "priceAlerts": [],
    "alertEvents": [],
    "ui": { "theme": "dark", "accent": "blue" }
  }
}
```

Keep this file somewhere safe. It is the only copy of your data outside the
browser. The `settings` array includes your defaults and your interface
language; `ui` carries the theme and accent, and importing applies them. Alert
rules live in `priceAlerts` and the last 500 events in `alertEvents`. Older
backups without `ui` still import.

## What is not in a backup

Four categories are deliberately left out:

- The optional **CoinGecko API key**. It is a secret and never exported. A
  replace import clears it with the rest of the settings, so enter it again
  afterwards; a merge keeps the key already on the device.
- The **price cache** and the **symbol lists**. Both are rebuilt from the
  providers on the next refresh, so carrying them would only add stale data and
  weight.
- The **native background queue and snapshot**. They belong to the install that
  wrote them and are only meaningful to its own background engine.

Your journal, portfolio, preferences, alert rules and alert history are what a
backup exists to preserve; everything above is secret, reproducible or specific
to this install.

## Import

Two modes:

- **Merge** adds the file's records and overwrites records with the same id.
- **Replace** clears the database first, then imports. Alert rules and history
  are replaced too, and the stored CoinGecko key is cleared.

Imports are validated before anything is written. A file that is not valid JSON
or not a ClyTrade backup is rejected with a message and no changes.

- **v1 and v2 files still import.** They carry no alert rules or history, and
  fields added in 0.5 fall back to safe defaults: auto-close is off and an
  imported crypto asset starts with Automatic price off until you turn it on.
- **A v3 backup cannot be read by a v2 app (0.4.x).** That build refuses it as a
  file from a newer version instead of restoring half of it. Export a backup
  before upgrading if you may need to roll back.

## Sample data

**Load sample data** adds a fixed set of example trades and assets to the
journal and portfolio so you can explore the stats, charts and calculators
without entering data by hand. Strategies, notes and asset names follow the
interface language when the samples are loaded. Your own records are kept, and
loading again refreshes the samples instead of duplicating them. Reset removes
everything.

## Reset

**Reset all data** clears trades, assets, settings (including the stored
CoinGecko key), alert rules and alert history. The confirmation dialog spells
out exactly what will be deleted. There is no undo — export first.

## Why it works this way

- **One file, one format.** A human-readable JSON export can be inspected,
  diffed and migrated later.
- **Schema versions are explicit.** The backup carries its own version so future
  versions of ClyTrade can migrate old files instead of rejecting them, and an
  older app refuses a newer file rather than restoring half of it.
- **Secrets and caches stay out.** The API key is a secret, and prices and symbol
  lists can be rebuilt from the providers.
- **No cloud sync in V1.** Sync is optional future work; local-first means your
  data works with the network off.
- **Samples are deterministic.** They use `sample-` ids, so importing them is
  idempotent and they can never collide with records you create.
