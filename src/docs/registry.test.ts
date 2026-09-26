import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n/translate'
import { en } from '@/i18n/en'
import { fa } from '@/i18n/fa'
import { DOCS, getDoc, getDocGroups } from './registry'

const t = createTranslator(en)

describe('docs registry', () => {
  it('keeps the group order stable', () => {
    expect(getDocGroups('en', t).map((group) => group.name)).toEqual([
      'Basics',
      'Features',
      'Calculators',
    ])
  })

  it('resolves every registered doc', () => {
    const docs = getDocGroups('en', t).flatMap((group) => group.docs)
    expect(docs).toHaveLength(DOCS.length)
    for (const doc of docs) {
      expect(doc.title).not.toBe('')
      expect(doc.summary).not.toBe('')
      expect(doc.body).not.toBe('')
    }
  })

  it('translates metadata but falls back to the english body', () => {
    const doc = getDoc('calculator-position-size', 'fa', createTranslator(fa))
    expect(doc?.title).toBe('اندازهٔ موقعیت')
    expect(doc?.body).toBe(getDoc('calculator-position-size', 'en', t)?.body)
  })

  it('returns undefined for unknown slugs', () => {
    expect(getDoc('missing', 'en', t)).toBeUndefined()
  })
})
