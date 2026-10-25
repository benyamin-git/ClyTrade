import { useEffect, useState } from 'react'
import { resolveSymbol, type SymbolCandidate } from './symbols'
import type { MarketProvider } from './types'

export interface UseSymbolCandidatesResult {
  candidates: SymbolCandidate[]
  loading: boolean
  error: string | null
}

export function useSymbolCandidates(
  input: string,
  providers: readonly MarketProvider[],
): UseSymbolCandidatesResult {
  const [state, setState] = useState<UseSymbolCandidatesResult>({
    candidates: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!input.trim()) return

    let cancelled = false
    void resolveSymbol(input, providers)
      .then((candidates) => {
        if (!cancelled) {
          setState({ candidates, loading: false, error: null })
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState({
            candidates: [],
            loading: false,
            error: cause instanceof Error ? cause.message : String(cause),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [input, providers])

  return state
}
