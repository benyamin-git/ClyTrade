# Position Size

## What it does

Turns a fixed account risk into an exact position size. You pick how much of the
account you are willing to lose, where the stop goes, and ClyTrade tells you how
many units to buy or sell.

## How to use it

1. Set **Account size** and **Risk** (these come from Settings → Preferences).
   Risk can be a percentage of the account or an absolute amount — switch with
   the `%` / currency toggle inside the field.
2. Enter **Entry** and **Stop** prices.
3. Set **Leverage** and your **Fee per side**, as a percentage or an absolute
   cost per side.
4. Read the size, notional, required margin and estimated fees on the right.

Results update as you type — there is no Calculate button by design.

## Why it works this way

- **Risk-first sizing.** Most traders size by gut and then place a stop. This
  calculator inverts that: the stop defines the size. The maximum loss is fixed
  before the trade exists.
- **Fees count toward risk by default.** A trade that risks 1 and pays 0.5 in
  fees risks 1.5. With the default on, the position is shrunk so that the stop
  loss plus the round-trip fee equals the risk you typed; turn it off in
  Settings → Preferences if you define risk as the stop distance alone.
- **Fees are visible, not hidden.** The fee estimate uses a round trip (entry
  and exit) so the number is never optimistic.
- **Leverage is a margin number, not a risk number.** Changing leverage does not
  change the position size here; it only changes how much margin is locked.

## Formula

```
riskAmount       = accountSize × riskPercent / 100   (or the absolute amount you typed)
stopDistance     = |entry − stop|
positionSize     = riskAmount / stopDistance                                   (fees excluded)
                 = riskAmount / (stopDistance + 2 × entry × feePercent / 100)   (fees included, percent fee)
                 = (riskAmount − 2 × feeAmount) / stopDistance                  (fees included, absolute fee)
positionNotional = positionSize × entry
requiredMargin   = positionNotional / leverage
feeEstimate      = positionNotional × feePercent / 100 × 2   (or feeAmount × 2)
```

## Assumptions

- Fees are charged on notional at entry and exit; an absolute fee is per side.
- With fees included in risk, a risk budget that cannot cover the round-trip fee
  produces no result instead of a negative size.
- The stop is assumed to fill at the stop price (no slippage).
