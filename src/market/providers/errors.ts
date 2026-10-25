import type { PriceProviderId } from '@/data/models/price'

export type ProviderErrorKind = 'rate-limit' | 'blocked' | 'network' | 'invalid'

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly provider: PriceProviderId

  constructor(kind: ProviderErrorKind, provider: PriceProviderId, message: string) {
    super(message)
    this.name = 'ProviderError'
    this.kind = kind
    this.provider = provider
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

export function errorFromResponse(provider: PriceProviderId, status: number): ProviderError {
  if (status === 429) {
    return new ProviderError('rate-limit', provider, `HTTP ${status}`)
  }
  if (status === 403 || status === 451) {
    return new ProviderError('blocked', provider, `HTTP ${status}`)
  }
  if (status >= 400 && status < 500) {
    return new ProviderError('invalid', provider, `HTTP ${status}`)
  }
  return new ProviderError('network', provider, `HTTP ${status}`)
}
