import type { Dictionary, TranslateParams, TranslationKey } from './types'

export type Translator = (key: TranslationKey, params?: TranslateParams) => string

function lookup(dictionary: Dictionary, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part]
    }
    return undefined
  }, dictionary)
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

function isPluralForms(value: unknown): value is { one: string; other: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { one?: unknown }).one === 'string' &&
    typeof (value as { other?: unknown }).other === 'string'
  )
}

export function translate(
  dictionary: Dictionary,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const value = lookup(dictionary, key)
  if (typeof value === 'string') return interpolate(value, params)
  if (isPluralForms(value)) {
    const count = Number(params?.count ?? 0)
    return interpolate(count === 1 ? value.one : value.other, params)
  }
  return key
}

export function createTranslator(dictionary: Dictionary): Translator {
  return (key, params) => translate(dictionary, key, params)
}
