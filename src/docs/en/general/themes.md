# Themes

## What ships

- **Light** — soft neutral surfaces for bright environments.
- **Dark** — the default dark palette for low-light use.
- **OLED** — pure-black surfaces for night sessions.

Pick one in Settings → Themes. Until you pick one, the app follows the
operating system's light or dark setting and reacts when it changes while the
app is open. OLED is never chosen automatically; pick it yourself. Once you
pick a theme it is stored locally and always wins. Either way the theme is
applied before the first paint, so there is no flash of the wrong theme when
the app opens.

Older installs migrate automatically: Material Light, Material Dark and Black
Night become Light, Dark and OLED.

## Accent colors

**Blue** is the default. You can also pick Teal, Green, Orange, Rose or
Violet. An accent is a complete tonal palette, not a single color: it recolors
the primary, secondary and tertiary families and tints the surfaces,
containers, outlines and text with the accent's hue. Light and Dark get the
full treatment; OLED keeps its pure-black surfaces and only takes the accent
families, so the OLED theme stays OLED.

Like the theme, the accent is stored locally and applied before the first
paint. Removed accents migrate: Purple becomes Violet, Lime becomes Green and
Amber becomes Orange.

## Why it works this way

- **Color roles, not hex values.** Every component uses Material Design 3 roles
  (`surface-container`, `on-surface-variant`, `outline`, …). Adding a new theme
  means writing one small CSS file, not touching components.
- **Accents are a curated palette, not a free color picker.** Each preset ships
  tones that keep text and containers readable across light, dark and OLED. A
  free picker can produce a primary that makes `on-primary` text illegible.
- **Palettes are derived, not hand-picked.** Each accent is one seed hue and
  chroma in OKLCH. Secondary sits at 28% of the seed chroma, tertiary is
  rotated 60 degrees, and every role is generated at a fixed lightness. If the
  result leaves the sRGB gamut the chroma is halved until it fits. Surfaces
  keep the theme's exact lightness and chroma with the accent's hue, which is
  how a single seed stays coherent everywhere without hand-tuning hundreds of
  values.
- **Semantic colors never change.** Profit, loss and error keep their meaning
  no matter which accent is active.
- **Density is part of the theme contract.** Spacing and control sizes are
  tokens too, so the 40px controls grow to 48px targets on touch devices
  without a redesign.
