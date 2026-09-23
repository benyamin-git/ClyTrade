export interface PortfolioAssetInput {
  quantity: number
  averageCost: number
  currentPrice: number | null
}

export interface AssetMetrics {
  cost: number
  value: number
  pnl: number
  pnlPercent: number | null
  price: number
  hasCurrentPrice: boolean
}

export interface PortfolioTotals {
  assets: number
  cost: number
  value: number
  pnl: number
  pnlPercent: number | null
}

export interface AllocationSlice {
  index: number
  value: number
  sharePercent: number
}

/**
 * Value, cost and unrealized PnL for one spot holding.
 *
 * value = quantity * (currentPrice ?? averageCost)
 * cost  = quantity * averageCost
 *
 * Without a current price the asset is valued at cost, so `pnl` is 0 and
 * `hasCurrentPrice` is false. This keeps totals honest instead of guessing.
 */
export function calculateAssetMetrics(asset: PortfolioAssetInput): AssetMetrics | null {
  const { quantity, averageCost, currentPrice } = asset
  if (!Number.isFinite(quantity) || !Number.isFinite(averageCost)) return null
  if (quantity < 0 || averageCost < 0) return null
  if (currentPrice !== null && (!Number.isFinite(currentPrice) || currentPrice <= 0)) return null

  const price = currentPrice ?? averageCost
  const cost = quantity * averageCost
  const value = quantity * price
  const pnl = value - cost

  return {
    cost,
    value,
    pnl,
    pnlPercent: cost === 0 ? null : (pnl / cost) * 100,
    price,
    hasCurrentPrice: currentPrice !== null,
  }
}

export function calculatePortfolioTotals(assets: readonly PortfolioAssetInput[]): PortfolioTotals {
  let cost = 0
  let value = 0
  for (const asset of assets) {
    const metrics = calculateAssetMetrics(asset)
    if (!metrics) continue
    cost += metrics.cost
    value += metrics.value
  }
  const pnl = value - cost
  return {
    assets: assets.length,
    cost,
    value,
    pnl,
    pnlPercent: cost === 0 ? null : (pnl / cost) * 100,
  }
}

/**
 * Value share per asset, in input order. Assets with a non-positive value are
 * skipped. Shares are percentages of the total value and may not sum to exactly
 * 100 due to rounding.
 */
export function buildAllocation(assets: readonly PortfolioAssetInput[]): AllocationSlice[] {
  const slices: AllocationSlice[] = []
  let total = 0
  assets.forEach((asset, index) => {
    const metrics = calculateAssetMetrics(asset)
    if (!metrics || metrics.value <= 0) return
    slices.push({ index, value: metrics.value, sharePercent: 0 })
    total += metrics.value
  })
  if (total <= 0) return []
  return slices.map((slice) => ({ ...slice, sharePercent: (slice.value / total) * 100 }))
}
