import { useEffect, useState } from 'react'

export function useCooldownActive(nextAllowedAt: number | null): boolean {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  return nextAllowedAt !== null && nextAllowedAt > now
}
