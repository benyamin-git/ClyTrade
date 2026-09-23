# Themes

## What ships in V1

- **Material Light** — Material Design 3 light.
- **Material Dark** — Material Design 3 dark.
- **Black Night** — pure-black OLED theme for night sessions.

Pick one in Settings → Themes. The theme is stored locally and applied before
the first paint, so there is no flash of the wrong theme when the app opens.

## Why it works this way

- **Color roles, not hex values.** Every component uses Material Design 3 roles
  (`surface-container`, `on-surface-variant`, `outline`, …). Adding a new theme
  means writing one small CSS file, not touching components.
- **Density is part of the theme contract.** Spacing and control sizes are
  tokens too, so a future compact or comfortable mode can change sizing without
  a redesign.
