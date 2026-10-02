import { describe, expect, it } from 'vitest'
import { DEFAULT_MARKET, MARKET_IDS, marketSchema } from './market'

describe('market', () => {
  it('lists the nine markets in order', () => {
    expect(MARKET_IDS).toEqual([
      'unspecified',
      'crypto',
      'forex',
      'stocks',
      'futures',
      'commodities',
      'indices',
      'bonds',
      'options',
    ])
  })

  it('accepts every listed market', () => {
    for (const id of MARKET_IDS) {
      expect(marketSchema.safeParse(id).success).toBe(true)
    }
  })

  it('rejects an unknown market', () => {
    expect(marketSchema.safeParse('bogus').success).toBe(false)
  })

  it('defaults to unspecified', () => {
    expect(DEFAULT_MARKET).toBe('unspecified')
  })
})
