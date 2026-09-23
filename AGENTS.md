# ClyTrade — Agent Notes

Local-first trading PWA. See `masterplan.md` for product direction.

## Commands

Node 22 is required (installed via nvm). Prefix commands in non-interactive shells:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
```

| Command             | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Vite dev server                                         |
| `npm run build`     | Typecheck + production build + PWA service worker       |
| `npm run preview`   | Serve the production build                              |
| `npm run typecheck` | `tsc -b` across app and node configs                    |
| `npm run lint`      | ESLint (flat config)                                    |
| `npm test`          | Vitest run (jsdom, fake-indexeddb)                      |
| `npm run format`    | Prettier write                                          |
| `npm run icons`     | Regenerate PWA icons into `public/icons/`               |
| `npm run accents`   | Regenerate accent palettes into `src/theme/accents.css` |

Always run `npm run typecheck`, `npm run lint` and `npm test` before finishing work.

## Hard rules

- **Never modify `src/calculations/**` without explicit permission from the project
  owner** (`masterplan.md` §5). This includes adding imports of React, DOM, Dexie or
  anything else non-pure to those files.
- Calculations are pure functions. Invalid input returns `null`; they never throw.
- Every calculation module has a colocated `*.test.ts` with known values and invalid
  inputs. Keep the table-driven style.
- Do not add comments to code unless asked.
- Do not commit unless asked.
- Never hand-edit generated files (`public/icons/`, `src/theme/accents.css`).
  Regenerate them with `npm run icons` / `npm run accents`. Accent ids and labels
  live in `src/theme/accents.ts` and must stay in sync with the seed table in
  `scripts/generate-accents.mjs`; a test fails if the generated CSS drifts.

## Architecture

| Layer         | Location            | Notes                                                                               |
| ------------- | ------------------- | ----------------------------------------------------------------------------------- |
| App shell     | `src/app/`          | Router (hash), providers, top bar, drawer, subtab bar                               |
| Features      | `src/features/`     | UI + application logic per tab (`journal`, `portfolio`, `calculations`, `settings`) |
| Calculations  | `src/calculations/` | Pure, protected math layer                                                          |
| Data          | `src/data/`         | Dexie schema, models (zod), repositories, backup                                    |
| Design system | `src/ui/`           | Primitives and layout components                                                    |
| Theme         | `src/theme/`        | MD3 CSS-variable tokens, theme switching and generated accent palettes              |
| Docs          | `src/docs/`         | Markdown + registry rendered in Settings → Documentation                            |

Rules of dependency: features may import `ui`, `data`, `lib`, `theme`, `calculations`.
`calculations` imports nothing except its own `types.ts` and `src/lib` helpers.
`ui` imports nothing from `features`.

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`, no `exactOptionalPropertyTypes`
  (React props friction).
- Tailwind v4 with MD3 color roles mapped in `src/theme/tokens.css`. Use semantic
  utilities (`bg-surface-container`, `text-on-surface-variant`) — never raw hex.
- Density: 40px controls (`h-control`), 48px touch targets (`h-control-touch`),
  36px table rows (`h-row`), 64px top bar, 48px subtab bar. Sizes live as tokens
  in `src/theme/tokens.css` and are exposed as Tailwind spacing aliases.
- Pages scroll vertically when content needs it; long lists and tables scroll
  inside their own region so surrounding controls stay put.
- Base styles belong inside `@layer base` in `src/styles/global.css`. Never add
  unlayered CSS rules: unlayered rules beat every Tailwind utility and silently
  break padding, button backgrounds and link colors.
- Navigation is registry-driven: adding a calculator means adding a page, a registry
  entry in `src/features/calculations/registry.ts`, and a doc entry in
  `src/docs/registry.ts`.
- Data changes go through `src/data/repositories/*`; components read with
  `useLiveQuery`.
- User-facing documentation lives in `src/docs/**` and must explain the _why_ behind
  opinionated decisions, not just the how.
