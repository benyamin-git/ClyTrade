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

Translation and language support is the area where help is most wanted.
Translation is **not implemented yet**, so the first step is to open an Issue or
Discussion describing:

- the language (and locale) you want to add
- whether you can maintain it over time
- any preferences for how translations should be structured

We will agree on an approach before any code or content is written.

## Development setup

Requirements: Node 22+ and npm.

```bash
npm install
npm run dev        # dev server
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
