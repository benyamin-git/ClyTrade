import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fa } from './fa'

function leaves(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix === '' ? key : `${prefix}.${key}`),
  )
}

function keyPaths(value: unknown): string[] {
  return leaves(value).map(([key]) => key)
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? '').sort()
}

describe('dictionaries', () => {
  it('fa covers every en key and nothing more', () => {
    expect(keyPaths(fa).sort()).toEqual(keyPaths(en).sort())
  })

  it('keeps placeholders aligned between locales', () => {
    const faValues = new Map(leaves(fa))
    for (const [key, value] of leaves(en)) {
      expect(placeholders(faValues.get(key) ?? ''), key).toEqual(placeholders(value))
    }
  })

  it('does not advertise the removed filtering quick bar', () => {
    expect(en.docs.items.filtering.summary).not.toMatch(/quick bar/i)
    expect(fa.docs.items.filtering.summary).not.toMatch(/نوار سریع/)
  })
})
