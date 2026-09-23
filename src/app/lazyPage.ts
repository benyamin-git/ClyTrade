import { lazy, type ComponentType } from 'react'

export function lazyPage<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  name: TKey,
): ComponentType {
  return lazy(async () => {
    const module = await loader()
    return { default: module[name] as ComponentType }
  })
}
