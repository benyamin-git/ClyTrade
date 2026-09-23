# Data & Backups

## Where data lives

All data is stored in IndexedDB on your device, in a database named `clytrade`.
Nothing is sent anywhere.

## Export

Settings → Data Controls → **Export backup** downloads a single JSON file:

```json
{
  "app": "clytrade",
  "schemaVersion": 1,
  "exportedAt": "…",
  "data": { "trades": [], "assets": [], "settings": [] }
}
```

Keep this file somewhere safe. It is the only copy of your data outside the
browser.

## Import

Two modes:

- **Merge** adds the file's records and overwrites records with the same id.
- **Replace** clears the database first, then imports.

Imports are validated before anything is written. A file that is not valid JSON
or not a ClyTrade backup is rejected with a message and no changes.

## Sample data

**Load sample data** adds a fixed set of example trades and assets to the
journal and portfolio so you can explore the stats, charts and calculators
without entering data by hand. Your own records are kept, and loading again
refreshes the samples instead of duplicating them. Reset removes everything.

## Reset

**Reset all data** clears trades, assets and settings. The confirmation dialog
spells out exactly what will be deleted. There is no undo — export first.

## Why it works this way

- **One file, one format.** A human-readable JSON export can be inspected,
  diffed and migrated later.
- **Schema versions are explicit.** The backup carries its own version so future
  versions of ClyTrade can migrate old files instead of rejecting them.
- **No cloud sync in V1.** Sync is optional future work; local-first means your
  data works with the network off.
- **Samples are deterministic.** They use `sample-` ids, so importing them is
  idempotent and they can never collide with records you create.
