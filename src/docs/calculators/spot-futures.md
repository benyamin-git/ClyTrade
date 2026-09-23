# Spot ↔ Futures

## What it does

Compares the same capital deployed in spot versus futures: quantity, notional,
fees and the liquidation distance at your leverage. It also converts quantity to
contracts using a contract size.

## How to use it

1. Enter **Capital** and the asset **Price**.
2. Set **Leverage** and **Contract size** (use 1 if one contract equals one
   unit; use 0.001 for typical BTC perpetuals).
3. Set **Fee %** per side.
4. Compare the spot and futures rows on the right.

## Why it works this way

- **Futures multiplies both sides.** The same capital buys `leverage` times the
  exposure and sits `leverage` times closer to liquidation. Both numbers are
  shown side by side on purpose.
- **Contract size prevents costly mistakes.** Order forms take contracts, not
  coins. Converting quantity to contracts here avoids a 1000x typo.
- **Fees scale with notional, not capital.** Futures fees are charged on the
  leveraged notional, so they grow with leverage.

## Formula

```
spotQuantity           = capital / price
futuresQuantity        = capital × leverage / price
futuresContracts       = futuresQuantity / contractSize
fee                    = notional × feePercent / 100
liquidationMovePercent = 100 / leverage
```

## Assumptions

- Spot uses the full capital with no fee deduction from size.
- Futures uses the full capital as isolated margin.
- Maintenance margin is ignored; use the Liquidation Price calculator for a
  precise estimate.
