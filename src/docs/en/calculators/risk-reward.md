# Risk / Reward

## What it does

Measures a trade's geometry: how much you risk, how much you stand to gain, the
R multiple, the break-even win rate, and the expectancy at a given win rate.

## How to use it

1. Enter **Entry**, **Stop** and **Target** prices.
2. Optionally enter your historical **Win rate %** to see expectancy in R.
3. Set **Entry fee** and **Exit fee** (they come from Settings → Preferences).
4. Read the ratio, break-even win rate and expectancy on the right.

## Why it works this way

- **R multiples make trades comparable.** A 0.5R scalp and a 3R swing are only
  comparable once expressed in R, not in currency.
- **Break-even win rate is the real hurdle.** A 3R trade only needs a 25% win
  rate to break even. Knowing the hurdle stops you from over-trading high-R
  setups that rarely trigger.
- **Expectancy decides if a strategy is worth running.** Positive expectancy at
  your actual win rate is the only reason to take a setup repeatedly.
- **Fees are part of the geometry.** A 3R setup with 0.1% fees per side is
  closer to 2.85R in practice. When fees are included, the ratio, break-even win
  rate and expectancy use net numbers; the Risk and Reward cards show the gross
  distance underneath. Turn fees off in Settings → Preferences to see the raw
  geometry.

## Formula

```
risk              = |entry − stop|
reward            = |target − entry|
entryFee          = entry × entryFeePercent / 100
exitFeeAtStop     = stop × exitFeePercent / 100
exitFeeAtTarget   = target × exitFeePercent / 100
netRisk           = risk + entryFee + exitFeeAtStop       (when fees are included)
netReward         = reward − entryFee − exitFeeAtTarget   (when fees are included)
riskRewardRatio   = netReward / netRisk
breakEvenWinRate  = 1 / (1 + riskRewardRatio) × 100
expectancyR       = winRate/100 × riskRewardRatio − (1 − winRate/100)
```

## Assumptions

- Distances are absolute; direction does not change the ratio.
- Fees are percentages of notional. This calculator works per unit and has no
  position size, so an absolute currency fee would have no meaning here.
- One target, one stop, no scaling out. Slippage is excluded.
