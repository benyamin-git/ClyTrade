export type Direction = 'long' | 'short'

export interface PositionCalculatorInput {
  risk: number | null
  entryPrice: number | null
  targetPrice: number | null
  stopPrice: number | null
  feePercent: number | null
  leverage: number | null
  maintenanceMarginPercent: number | null
  winRatePercent: number | null
}

export interface PositionCalculatorResult {
  direction: Direction | null
  requiredMargin: number | null
  rr: number | null
  pnl: number | null
  notional: number | null
  unitSize: number | null
  stopDistance: number | null
  stopDistancePercent: number | null
  targetDistance: number | null
  targetDistancePercent: number | null
  liquidationDistance: number | null
  liquidationDistancePercent: number | null
  liquidationPrice: number | null
  breakEvenWinRatePercent: number | null
  expectancyR: number | null
  recommendedRiskPercent: number | null
}

const KELLY_FRACTION = 1 / 8

function isPositive(value: number | null): boolean {
  return value === null || (Number.isFinite(value) && value > 0)
}

function inferDirection(
  entryPrice: number,
  stopPrice: number | null,
  targetPrice: number | null,
): Direction | null {
  if (stopPrice !== null && stopPrice !== entryPrice) {
    return stopPrice < entryPrice ? 'long' : 'short'
  }
  if (targetPrice !== null && targetPrice !== entryPrice) {
    return targetPrice > entryPrice ? 'long' : 'short'
  }
  return null
}

export function calculatePosition(input: PositionCalculatorInput): PositionCalculatorResult | null {
  const {
    risk,
    entryPrice,
    targetPrice,
    stopPrice,
    feePercent,
    leverage,
    maintenanceMarginPercent,
    winRatePercent,
  } = input

  if (entryPrice === null || !Number.isFinite(entryPrice) || entryPrice <= 0) return null
  if (![targetPrice, stopPrice].every(isPositive)) return null
  if (risk !== null && (!Number.isFinite(risk) || risk < 0)) return null
  if (feePercent !== null && (!Number.isFinite(feePercent) || feePercent < 0)) return null
  if (leverage !== null && (!Number.isFinite(leverage) || leverage < 1)) return null
  if (
    maintenanceMarginPercent !== null &&
    (!Number.isFinite(maintenanceMarginPercent) || maintenanceMarginPercent < 0)
  ) {
    return null
  }
  if (
    winRatePercent !== null &&
    (!Number.isFinite(winRatePercent) || winRatePercent < 0 || winRatePercent > 100)
  ) {
    return null
  }

  const direction = inferDirection(entryPrice, stopPrice, targetPrice)
  const feePerSide = (feePercent ?? 0) / 100
  const stopDistance = stopPrice === null ? null : Math.abs(entryPrice - stopPrice)
  const targetDistance = targetPrice === null ? null : Math.abs(targetPrice - entryPrice)

  const stopSide =
    stopPrice !== null && direction !== null
      ? direction === 'long'
        ? entryPrice - stopPrice
        : stopPrice - entryPrice
      : null
  const lossPerUnit =
    stopSide !== null && stopSide > 0 && stopPrice !== null
      ? stopSide + (entryPrice + stopPrice) * feePerSide
      : null

  const unitSize = risk !== null && risk > 0 && lossPerUnit !== null ? risk / lossPerUnit : null
  const notional = unitSize === null ? null : unitSize * entryPrice
  const requiredMargin = notional !== null && leverage !== null ? notional / leverage : null

  const targetSide =
    targetPrice !== null && direction !== null
      ? direction === 'long'
        ? targetPrice - entryPrice
        : entryPrice - targetPrice
      : null
  const netRewardPerUnit =
    targetSide !== null && targetSide > 0 && targetPrice !== null
      ? targetSide - (entryPrice + targetPrice) * feePerSide
      : null
  const rr =
    netRewardPerUnit !== null && lossPerUnit !== null ? netRewardPerUnit / lossPerUnit : null
  const pnl = netRewardPerUnit !== null && unitSize !== null ? netRewardPerUnit * unitSize : null

  const liquidationDistancePercent =
    leverage !== null && maintenanceMarginPercent !== null
      ? 100 / leverage - maintenanceMarginPercent
      : null
  const validLiquidationDistance =
    liquidationDistancePercent !== null && liquidationDistancePercent > 0
      ? liquidationDistancePercent
      : null
  const liquidationDistance =
    validLiquidationDistance === null ? null : (entryPrice * validLiquidationDistance) / 100
  const liquidationPrice =
    validLiquidationDistance !== null && direction !== null
      ? direction === 'long'
        ? entryPrice * (1 - validLiquidationDistance / 100)
        : entryPrice * (1 + validLiquidationDistance / 100)
      : null

  const breakEvenWinRatePercent = rr !== null && 1 + rr > 0 ? (1 / (1 + rr)) * 100 : null
  const expectancyR =
    rr !== null && winRatePercent !== null
      ? (winRatePercent / 100) * rr - (1 - winRatePercent / 100)
      : null
  let recommendedRiskPercent: number | null = null
  if (rr !== null && rr > 0 && winRatePercent !== null) {
    const kellyFraction = winRatePercent / 100 - (1 - winRatePercent / 100) / rr
    recommendedRiskPercent = Math.max(0, kellyFraction) * KELLY_FRACTION * 100
  }

  return {
    direction,
    requiredMargin,
    rr,
    pnl,
    notional,
    unitSize,
    stopDistance,
    stopDistancePercent: stopDistance === null ? null : (stopDistance / entryPrice) * 100,
    targetDistance,
    targetDistancePercent: targetDistance === null ? null : (targetDistance / entryPrice) * 100,
    liquidationDistance,
    liquidationDistancePercent: validLiquidationDistance,
    liquidationPrice: liquidationPrice !== null && liquidationPrice >= 0 ? liquidationPrice : null,
    breakEvenWinRatePercent,
    expectancyR,
    recommendedRiskPercent,
  }
}
