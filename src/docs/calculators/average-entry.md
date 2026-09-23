# Average Entry / DCA

## What it does

Blends an existing position with a new fill and shows the resulting average
entry price, total size and how far the average moved from the previous entry.

## How to use it

1. Enter the **Existing size** and **Existing entry** (set size to 0 for a fresh
   entry).
2. Enter the **Add size** and **Add price**.
3. Read the new average entry and the change percentage on the right.

## Why it works this way

- **Averages are not free.** Lowering the average with a bigger add increases
  the position and the total risk. The total notional and size are always shown
  next to the average so the trade stays visible.
- **Zero existing size is allowed.** The same calculator covers first entries
  and DCA adds.
- **Change percentage is signed.** A negative number means the average improved
  (for a long). It is a fact, not a recommendation.

## Formula

```
totalNotional     = existingSize × existingEntry + addSize × addPrice
averageEntryPrice = totalNotional / (existingSize + addSize)
priceChangePercent = (averageEntryPrice / existingEntry − 1) × 100
```

## Assumptions

- `addSize` must be greater than zero.
- Fees are excluded.
- No leverage: this models the blended price of the underlying.
