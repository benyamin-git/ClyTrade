import type { en } from './en'

export type Dictionary = typeof en

export type TranslateParams = Record<string, string | number>

type KeyOf<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends { one: string; other: string }
      ? K
      : `${K}.${KeyOf<T[K]>}`
}[keyof T & string]

export type TranslationKey = KeyOf<Dictionary>
