import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n/translate'
import { en } from '@/i18n/en'
import { fa } from '@/i18n/fa'
import { DOCS, getDoc, getDocGroups, pickBody } from './registry'

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

  it('translates metadata with the locale dictionary', () => {
    const doc = getDoc('calculator-position-size', 'fa', createTranslator(fa))
    expect(doc?.title).toBe('سایز پوزیشن')
    expect(doc?.summary).not.toBe('')
  })

  describe('pickBody', () => {
    it('prefers the localized body', () => {
      expect(pickBody('a', 'fa', { a: 'fa body' }, { a: 'en body' })).toBe('fa body')
    })

    it('falls back to the english body when the localized one is missing', () => {
      expect(pickBody('a', 'fa', {}, { a: 'en body' })).toBe('en body')
    })

    it('returns an empty string when no body exists', () => {
      expect(pickBody('a', 'fa', {}, {})).toBe('')
    })

    it('uses the english body for the english locale', () => {
      expect(pickBody('a', 'en', { a: 'fa body' }, { a: 'en body' })).toBe('en body')
    })
  })

  it('returns undefined for unknown slugs', () => {
    expect(getDoc('missing', 'en', t)).toBeUndefined()
  })

  it('ships a persian body for every registered doc', () => {
    const faT = createTranslator(fa)
    for (const meta of DOCS) {
      const faDoc = getDoc(meta.slug, 'fa', faT)
      const enDoc = getDoc(meta.slug, 'en', t)
      expect(faDoc?.body, meta.slug).not.toBe('')
      expect(faDoc?.body, meta.slug).not.toBe(enDoc?.body)
    }
  })
})
