import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fa } from './fa'

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix === '' ? key : `${prefix}.${key}`),
  )
}

describe('dictionaries', () => {
  it('fa covers every en key and nothing more', () => {
    expect(keyPaths(fa).sort()).toEqual(keyPaths(en).sort())
  })

  it('does not advertise the removed filtering quick bar', () => {
    expect(en.docs.items.filtering.summary).not.toMatch(/quick bar/i)
    expect(fa.docs.items.filtering.summary).not.toMatch(/نوار سریع/)
  })
})
