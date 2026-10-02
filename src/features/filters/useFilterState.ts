import { useCallback, useState } from 'react'

export function useFilterState<F>(defaults: F): {
  filters: F
  patch: (partial: Partial<F>) => void
  reset: () => void
} {
  const [filters, setFilters] = useState<F>(() => ({ ...defaults }))

  const patch = useCallback((partial: Partial<F>) => {
    setFilters((current) => ({ ...current, ...partial }))
  }, [])

  const reset = useCallback(() => {
    setFilters({ ...defaults })
  }, [defaults])

  return { filters, patch, reset }
}
