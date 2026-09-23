# Risk / Reward

## What it does

Measures a trade's geometry: how much you risk, how much you stand to gain, the
R multiple, the break-even win rate, and the expectancy at a given win rate.

## How to use it

1. Enter **Entry**, **Stop** and **Target** prices.
2. Optionally enter your historical **Win rate %** to see expectancy in R.
3. Read the ratio, break-even win rate and expectancy on the right.

## Why it works this way

- **R multiples make trades comparable.** A 0.5R scalp and a 3R swing are only
  comparable once expressed in R, not in currency.
- **Break-even win rate is the real hurdle.** A 3R trade only needs a 25% win
  rate to break even. Knowing the hurdle stops you from over-trading high-R
  setups that rarely trigger.
- **Expectancy decides if a strategy is worth running.** Positive expectancy at
  your actual win rate is the only reason to take a setup repeatedly.

## Formula

```
risk              = |entry − stop|
reward            = |target − entry|
riskRewardRatio   = reward / risk
breakEvenWinRate  = 1 / (1 + riskRewardRatio) × 100
expectancyR       = winRate/100 × riskRewardRatio − (1 − winRate/100)
```

## Assumptions

- Distances are absolute; direction does not change the ratio.
- Fees and slippage are excluded.
- One target, one stop, no scaling out.
