# Design Philosophy

**Fast and sleek. Opinionated but customizable.**

## Speed first

- The app opens on Calculations, not a dashboard.
- Calculators compute as you type; there is no Calculate button.
- Numeric inputs select their content on focus so the first keystroke replaces them.
- Layouts stay compact: 40px controls, 36px table rows, 64px top bar. Pages scroll
  when they need to; long lists and tables scroll inside their own region so the
  surrounding controls stay put.

## Opinionated defaults, honest numbers

- Every default (account size, risk %, fees) comes from Preferences and can be
  changed once instead of per calculation.
- Costs are shown next to profits. ROI on margin is shown next to account
  return. Liquidation distance is shown next to liquidation price.
- Fields that have more than one meaning accept more than one unit: risk and
  fees can be a percentage or an absolute amount, and the `%` / currency toggle
  sits inside the field. The currency list is display-only — no exchange rates,
  no surprises.
- Calculations live in dedicated, tested modules. They never guess, never throw
  and never hide an assumption — the formula and its limits are documented in
  the app.

## Local-first

- No account, no server, no network requirement.
- Data is yours, stored on your device, exportable at any time.

## Documented reasoning

Every feature has in-app documentation explaining not only how it works, but
why it was designed that way. Opinion without reasoning is just noise.
