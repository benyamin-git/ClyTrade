# Themes

## What ships in V1

- **Material Light** — Material Design 3 light.
- **Material Dark** — Material Design 3 dark.
- **Black Night** — pure-black OLED theme for night sessions.

Pick one in Settings → Themes. The theme is stored locally and applied before
the first paint, so there is no flash of the wrong theme when the app opens.

## Accent colors

**Blue** is the default accent. You can also pick Teal, Green, Lime, Amber,
Orange, Rose or Violet, or **Purple** to go back to the palette the theme ships
with.

An accent is a complete tonal palette, not a single color. It recolors the
primary, secondary and tertiary families, and tints the surfaces, containers,
outlines and text colors to the accent hue. Material Light and Material Dark
get the full treatment; Black Night keeps its pure-black surfaces and only
takes the accent families, so the OLED theme stays OLED.

Like the theme, the accent is stored locally and applied before the first
paint.

## Why it works this way

- **Color roles, not hex values.** Every component uses Material Design 3 roles
  (`surface-container`, `on-surface-variant`, `outline`, …). Adding a new theme
  means writing one small CSS file, not touching components.
- **Accents are a curated palette, not a free color picker.** Each preset ships
  with light and dark tones that keep text and containers readable. A free
  picker can produce a primary that makes `on-primary` text illegible.
- **Palettes are derived, not hand-picked.** Secondary sits at lower chroma,
  tertiary is rotated 60° in hue, and surfaces keep the theme's exact lightness
  with the accent's hue. That is how a single seed stays coherent everywhere
  without hand-tuning hundreds of values.
- **Semantic colors never change.** Profit, loss and error keep their meaning no
  matter which accent is active.
- **Density is part of the theme contract.** Spacing and control sizes are
  tokens too, so a future compact or comfortable mode can change sizing without
  a redesign.
