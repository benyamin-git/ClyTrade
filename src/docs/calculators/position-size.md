# Position Size

## What it does

Turns a fixed account risk into an exact position size. You pick how much of the
account you are willing to lose, where the stop goes, and ClyTrade tells you how
many units to buy or sell.

## How to use it

1. Set **Account size** and **Risk %** (these come from Settings → Preferences).
2. Enter **Entry** and **Stop** prices.
3. Set **Leverage** and your **Fee %** per side.
4. Read the size, notional, required margin and estimated fees on the right.

Results update as you type — there is no Calculate button by design.

## Why it works this way

- **Risk-first sizing.** Most traders size by gut and then place a stop. This
  calculator inverts that: the stop defines the size. The maximum loss is fixed
  before the trade exists.
- **Fees are visible, not hidden.** The fee estimate uses a round trip (entry
  and exit) so the number is never optimistic.
- **Leverage is a margin number, not a risk number.** Changing leverage does not
  change the position size here; it only changes how much margin is locked.

## Formula

```
riskAmount       = accountSize × riskPercent / 100
stopDistance     = |entry − stop|
positionSize     = riskAmount / stopDistance
positionNotional = positionSize × entry
requiredMargin   = positionNotional / leverage
feeEstimate      = positionNotional × feePercent / 100 × 2
```

## Assumptions

- Fees are charged on notional at entry and exit.
- Risk ignores fees; check Fees & PnL for net numbers.
- The stop is assumed to fill at the stop price (no slippage).
