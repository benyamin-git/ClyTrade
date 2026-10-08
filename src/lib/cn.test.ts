import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins the truthy class names', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center')
  })

  it('keeps a numeric zero class', () => {
    expect(cn('m-0', 0)).toBe('m-0 0')
  })

  it('drops false, null, undefined and empty strings', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('returns an empty string when nothing is truthy', () => {
    expect(cn(false, null, undefined, '')).toBe('')
  })
})
