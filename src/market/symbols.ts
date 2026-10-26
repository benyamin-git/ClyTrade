import type { MarketSymbol } from '@/data/models/price'
import { listMarketSymbols, replaceMarketSymbols } from '@/data/repositories/prices.repo'
import type { MarketProvider } from './types'

const SEVEN_DAYS = 7 * 86_400_000

export interface SymbolCandidate {
  provider: MarketProvider['id']
  priceId: string
  symbol: string
  name: string | null
  quote: string | null
  rank: number | null
  binanceSymbol: string | null
  coingeckoId: string | null
}

export async function refreshSymbolLists(
  providers: readonly MarketProvider[],
  now = Date.now(),
): Promise<void> {
  for (const provider of providers) {
    try {
      const cached = await listMarketSymbols(provider.id)
      const newest = cached.reduce((latest, row) => Math.max(latest, row.updatedAt), 0)
      if (cached.length > 0 && now - newest < SEVEN_DAYS) continue

      const fetched = await provider.fetchSymbols()
      const rows: MarketSymbol[] = fetched.map((row) => ({
        id: `${provider.id}:${row.priceId}`,
        provider: provider.id,
        priceId: row.priceId,
        symbol: row.symbol,
        name: row.name,
        quote: row.quote,
        rank: row.rank,
        updatedAt: now,
      }))
      await replaceMarketSymbols(provider.id, rows)
    } catch {
      continue
    }
  }
}

export async function resolveSymbol(
  input: string,
  providers: readonly MarketProvider[],
  now = Date.now(),
): Promise<SymbolCandidate[]> {
  const normalized = input.trim().toUpperCase()
  if (!normalized) return []

  try {
    await refreshSymbolLists(providers, now)
  } catch {
    // A provider that cannot refresh must not hide a usable cached list.
  }

  const [binance, coingecko] = await Promise.all([
    listMarketSymbols('binance'),
    listMarketSymbols('coingecko'),
  ])
  const candidates: SymbolCandidate[] = []

  for (const row of binance) {
    const base = baseSymbol(row.symbol, row.quote)
    if (!matches(row.symbol, base, normalized)) continue
    const coin = coingecko.find((entry) => entry.symbol === base)
    candidates.push({
      provider: 'binance',
      priceId: row.priceId,
      symbol: row.symbol,
      name: row.name,
      quote: row.quote,
      rank: row.rank,
      binanceSymbol: row.priceId,
      coingeckoId: coin?.priceId ?? null,
    })
  }

  for (const row of coingecko) {
    const nameMatches = row.name !== null && row.name.toUpperCase().startsWith(normalized)
    if (!matches(row.symbol, row.symbol, normalized) && !nameMatches) continue
    const binanceMatch =
      binance.find(
        (entry) => baseSymbol(entry.symbol, entry.quote) === row.symbol && entry.quote === 'USDT',
      ) ?? binance.find((entry) => baseSymbol(entry.symbol, entry.quote) === row.symbol)
    candidates.push({
      provider: 'coingecko',
      priceId: row.priceId,
      symbol: row.symbol,
      name: row.name,
      quote: row.quote,
      rank: row.rank,
      binanceSymbol: binanceMatch?.priceId ?? null,
      coingeckoId: row.priceId,
    })
  }

  const seen = new Set<string>()
  return candidates
    .filter((candidate) => {
      const key = `${candidate.provider}:${candidate.priceId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => compareCandidates(left, right, normalized))
}

export function pickPreferredCandidate(
  candidates: readonly SymbolCandidate[],
): SymbolCandidate | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0] ?? null

  const providers = new Set(candidates.map((candidate) => candidate.provider))
  if (providers.size > 1) return null

  if (candidates[0]?.provider === 'binance') {
    const usdt = candidates.filter((candidate) => candidate.quote === 'USDT')
    return usdt.length === 1 ? (usdt[0] ?? null) : null
  }

  const rankOne = candidates.filter((candidate) => candidate.rank === 1)
  if (rankOne.length === 1) return rankOne[0] ?? null

  const ranked = candidates.filter((candidate) => candidate.rank !== null)
  if (
    ranked.length === 1 &&
    candidates.every((candidate) => candidate.rank === null || candidate === ranked[0])
  ) {
    return ranked[0] ?? null
  }
  return null
}

function matches(symbol: string, base: string, normalized: string): boolean {
  return (
    symbol.toUpperCase() === normalized ||
    base.toUpperCase() === normalized ||
    symbol.toUpperCase().startsWith(normalized)
  )
}

function baseSymbol(symbol: string, quote: string | null): string {
  if (quote && symbol.endsWith(quote)) {
    return symbol.slice(0, -quote.length)
  }
  return symbol
}

function compareCandidates(
  left: SymbolCandidate,
  right: SymbolCandidate,
  normalized: string,
): number {
  return (
    exactRank(left, normalized) - exactRank(right, normalized) ||
    categoryRank(left) - categoryRank(right) ||
    (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY) ||
    left.symbol.localeCompare(right.symbol) ||
    left.priceId.localeCompare(right.priceId)
  )
}

function exactRank(candidate: SymbolCandidate, normalized: string): number {
  const base = baseSymbol(candidate.symbol, candidate.quote)
  return candidate.symbol.toUpperCase() === normalized ||
    base.toUpperCase() === normalized ||
    candidate.priceId.toUpperCase() === normalized
    ? 0
    : 1
}

function categoryRank(candidate: SymbolCandidate): number {
  if (candidate.provider === 'binance' && candidate.quote === 'USDT') return 0
  if (candidate.provider === 'coingecko' && candidate.rank !== null) return 1
  if (candidate.provider === 'binance') return 2
  return 3
}
