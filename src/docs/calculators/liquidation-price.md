# Liquidation Price

## What it does

Estimates the price at which an isolated-margin futures position would be
liquidated, and how far away that price is from entry.

## How to use it

1. Enter the **Entry price** and **Leverage**.
2. Pick **Long** or **Short**.
3. Set **Maintenance margin %** from your exchange's contract specs.
4. Read the liquidation price and distance on the right.

## Why it works this way

- **Distance beats price.** The absolute liquidation price matters less than how
  far the market must move to reach it. The distance percentage is the number to
  compare against your stop.
- **Your stop should be well inside the liquidation distance.** If it is not,
  the stop cannot protect you: liquidation happens first.
- **Maintenance margin matters at high leverage.** At 50x, a 0.5% maintenance
  margin cuts the liquidation distance by a visible amount.

## Formula

```
long:  entry × (1 − 1 / leverage + maintenanceMarginPercent / 100)
short: entry × (1 + 1 / leverage − maintenanceMarginPercent / 100)
```

If the maintenance margin consumes the entire initial margin buffer, the result
is left empty because the position would be liquidated at entry.

## Assumptions

- Isolated margin with the full position margin posted.
- No funding, no added collateral, no partial liquidation rules.
- Exchanges differ slightly; treat this as a planning estimate, not a quote.
