# Fees & PnL

## What it does

Computes gross PnL, every cost involved, and the net result: net PnL, ROI on
margin, PnL as a percentage of the account, and the break-even price move.

## How to use it

1. Enter **Entry** and **Exit** prices, **Size** and **Long/Short**.
2. Set **Leverage** and the **Entry/Exit fee %** from your exchange's tier.
3. Enter **Funding %** as the total funding paid over the hold (positive = cost).
4. Read net PnL and the break-even move on the right.

## Why it works this way

- **Fees decide small trades.** A 0.1% round trip on a 1% target is 10% of the
  reward. Showing costs separately makes that impossible to ignore.
- **ROI on margin is not account return.** The calculator shows both so a 100%
  ROI on margin is not mistaken for doubling the account.
- **Break-even move is the honest entry check.** If the market must move 0.11%
  just to cover costs, a 0.1% scalp is a losing trade before it starts.

## Formula

```
grossPnl      = (exit − entry) × size × (long ? 1 : −1)
entryFee      = entry × size × entryFeePercent / 100
exitFee       = exit × size × exitFeePercent / 100
fundingCost   = entry × size × fundingPercent / 100
netPnl        = grossPnl − totalCosts
margin        = entry × size / leverage
roiOnMargin   = netPnl / margin × 100
breakEvenMove = totalCosts / (size × entry) × 100
```

## Assumptions

- Fees are taker-style, charged on notional.
- `fundingPercent` is the total funding paid over the holding period.
- No slippage, no partial fills, no rebates.
