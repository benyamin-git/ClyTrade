# Position Calculator

## What it does

One calculator replaces the old separate position-size, margin, liquidation,
risk/reward, fees and PnL pages. Enter the numbers you already know in the
**Inputs** card; the **Results** card underneath shows every answer those numbers
can support.

## How to use it

1. Open **Calculations** and fill in whatever you have. Nothing is required
   except an entry price.
2. Leave the fields you do not know blank. A blank input only hides the results
   that depend on it — the rest still calculate.
3. Read the answers in **Results** as you type; there is no Calculate button.
4. Use **Clear** to start again.

## Why it works this way

- **One set of inputs.** Position size, margin, R multiples, PnL and
  liquidation share the same prices. Typing them once removes the old
  copy-and-paste between calculators.
- **Partial answers beat empty pages.** If you only know entry, stop and risk,
  you still get size and notional. Add a target and R/R, P&L and expectancy
  appear.
- **Risk includes fees.** The position is sized so that the stop loss plus the
  fees on both sides equals the risk amount. The maximum loss you typed stays the
  maximum loss.
- **Direction is inferred.** A stop below entry means long; a stop above entry
  means short. Without a stop, the target decides. Direction-dependent results
  stay hidden until the prices make the direction clear.
- **The fee is per side.** The percentage you enter is charged on entry and
  again on the exit, so the R/R is never flattered by counting only one fee.
- **Recommended risk uses an eighth of Kelly.** Full Kelly is the
  growth-optimal fraction: `win rate − (1 − win rate) / R/R`. An eighth of it
  keeps sizing conservative when the win rate or R/R estimate is off.

## Formula

```
feePerSide      = feePercent / 100
winRate         = winRatePercent / 100
stopMove        = direction is long ? entry − stop : stop − entry
targetMove      = direction is long ? target − entry : entry − target
lossPerUnit     = stopMove + (entry + stop) × feePerSide
unitSize        = risk / lossPerUnit
notional        = unitSize × entry
requiredMargin  = notional / leverage

rr              = (targetMove − (entry + target) × feePerSide) / lossPerUnit
pnl             = unitSize × (targetMove − (entry + target) × feePerSide)

liquidationDistancePercent = 100 / leverage − maintenanceMarginPercent
liquidationDistance = entry × liquidationDistancePercent / 100
breakEvenWinRate = 1 / (1 + rr) × 100
expectancyR     = winRate × rr − (1 − winRate)

kellyFraction   = winRate − (1 − winRate) / rr
recommendedRisk = max(0, kellyFraction) / 8 × 100
```

## Assumptions

- Fees are charged on notional at entry and at the stop or target.
- The stop and target are assumed to fill at their exact prices — no slippage,
  no funding.
- Liquidation uses isolated margin with the full position margin posted and no
  added collateral. Exchange formulas differ slightly, so treat it as a planning
  estimate.
- Distances and percentages are measured against the entry price.
- R/R and P&L need a target.
- Recommended risk assumes the win rate and R/R are stable estimates; Kelly is
  sensitive to both.
