# Contributing

Thanks for wanting to help. Please read this short guide before opening anything.

## Code contributions

ClyTrade is maintained by a single author and **does not accept code
contributions** (pull requests). The project is intentionally opinionated and
kept coherent by one person; declined PRs are not a judgement of your work.

If you want to change the code, you are welcome to fork the project. The
GPL-3.0 requires forks to remain under the same license.

## What is welcome

| Type                | Where                                              |
| ------------------- | -------------------------------------------------- |
| Bug reports         | GitHub Issues — include steps to reproduce         |
| Feature ideas       | GitHub Discussions                                 |
| Translations / i18n | GitHub Issues or Discussions — see below           |
| Forks               | Anywhere; keep the GPL-3.0 license and attribution |

## Translations

ClyTrade ships in English and Persian (فارسی), and more languages are wanted.
Translation is implemented; the structure is small and type-checked:

- **UI strings** live in `src/i18n/`. `en.ts` is the source of truth. A new
  language is a dictionary (for example `src/i18n/de.ts`) implementing the same
  keys, registered in `src/i18n/locales.ts` with its `intlLocale`, text direction
  and calendar, plus the language list in the `index.html` pre-paint script.
- **Documentation** lives in `src/docs/<locale>/`. Copy `src/docs/en/**` and
  translate page by page; a missing file falls back to English. Titles and
  summaries go in the dictionary next to the other `docs.items.*` keys.
- **Tests** for dictionary parity, number parsing and locale detection live next
  to the code. Run `npm test` and `npm run typecheck`.

Persian's opinionated choices (Latin digits, Gregorian dates with Persian
labels, left-to-right charts) are explained in `src/docs/en/general/language.md`.
Open a GitHub Issue or Discussion before starting so the locale list stays
coherent.

## Development setup

Requirements: Node 22+ and npm.

```bash
npm install
npm run dev        # dev server
npm run dev:lan    # dev server reachable on the local network (0.0.0.0:3000)
npm test           # test suite
npm run typecheck  # tsc -b
npm run lint       # eslint
npm run build      # typecheck + production build + service worker
```

Useful conventions for reading the codebase:

- `src/calculations/**` is the protected math layer: pure functions only, no
  React, DOM or database imports. Never change it without permission from the
  project owner.
- Base styles belong inside `@layer base` in `src/styles/global.css`. Unlayered
  CSS rules override Tailwind utilities and silently break the UI.
- User-facing documentation lives in `src/docs/**` and is rendered in the app.
