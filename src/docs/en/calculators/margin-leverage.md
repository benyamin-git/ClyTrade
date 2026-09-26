# Margin & Leverage

## What it does

Shows what a position costs to open: required margin, how much of the account it
locks, buying power at your leverage, and the adverse move that would consume
your margin buffer.

## How to use it

1. Enter **Account size** and the **Position notional** you plan to trade.
2. Set **Leverage**.
3. Set **Maintenance margin %** (0.5% is a common starting point; check your
   exchange).
4. Read required margin, margin usage, max notional and effective leverage.

## Why it works this way

- **Effective leverage is the honest number.** A 5,000 position on a 1,000
  account is 5x effective leverage regardless of the 10x setting. The calculator
  shows both so you always know which one you are actually running.
- **Margin usage is a percentage of the account.** Anything above 100% means you
  cannot open the position at that leverage.
- **The liquidation move is a planning tool.** It is the distance to pain, not a
  precise exchange quote.

## Formula

```
requiredMargin         = positionNotional / leverage
marginPercentOfAccount = requiredMargin / accountSize × 100
maxPositionNotional    = accountSize × leverage
effectiveLeverage      = positionNotional / accountSize
liquidationMovePercent = 100 / leverage − maintenanceMarginPercent
```

## Assumptions

- Isolated margin, no unrealized PnL, no funding payments.
- The full initial margin is posted for the position.
