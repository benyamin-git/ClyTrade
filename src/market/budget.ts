const WINDOW_MS = 60_000

export interface BudgetConfig {
  maxRequestsPerMinute: number
  maxWeightPerMinute: number
  minSpacingMs: number
}

export interface TokenBucket {
  canSpend(weight: number, now: number): boolean
  spend(weight: number, now: number): void
  nextAvailableAt(weight: number, now: number): number
}

interface SpendEvent {
  at: number
  weight: number
}

export function createTokenBucket(config: BudgetConfig): TokenBucket {
  const events: SpendEvent[] = []
  let lastSpendAt: number | null = null

  function prune(now: number): void {
    while (events[0] && now - events[0].at >= WINDOW_MS) {
      events.shift()
    }
  }

  function totalWeight(): number {
    return events.reduce((total, event) => total + event.weight, 0)
  }

  function canSpend(weight: number, now: number): boolean {
    prune(now)
    if (events.length >= config.maxRequestsPerMinute) return false
    if (totalWeight() + weight > config.maxWeightPerMinute) return false
    if (lastSpendAt !== null && now - lastSpendAt < config.minSpacingMs) return false
    return true
  }

  return {
    canSpend,

    spend(weight: number, now: number): void {
      prune(now)
      events.push({ at: now, weight })
      lastSpendAt = now
    },

    nextAvailableAt(weight: number, now: number): number {
      if (canSpend(weight, now)) return now

      let next = now
      if (lastSpendAt !== null) {
        next = Math.max(next, lastSpendAt + config.minSpacingMs)
      }

      if (events.length >= config.maxRequestsPerMinute) {
        const event = events[events.length - config.maxRequestsPerMinute]
        if (event) next = Math.max(next, event.at + WINDOW_MS)
      }

      const currentWeight = totalWeight()
      if (currentWeight + weight > config.maxWeightPerMinute) {
        const required = currentWeight + weight - config.maxWeightPerMinute
        let removed = 0
        for (const event of events) {
          removed += event.weight
          if (removed >= required) {
            next = Math.max(next, event.at + WINDOW_MS)
            break
          }
        }
      }

      return next
    },
  }
}
