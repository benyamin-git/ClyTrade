import type { Locale } from '@/i18n/locales'
import type { Translator } from '@/i18n/translate'
import type { TranslationKey } from '@/i18n/types'

const enBodies = import.meta.glob('./en/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const localizedBodies = import.meta.glob('./fa/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function slugFromPath(path: string): string {
  const parts = path.split('/')
  const file = (parts.pop() ?? path).replace(/\.md$/, '')
  const folder = parts.pop()
  return folder === 'calculators' ? `calculator-${file}` : file
}

function indexBodies(modules: Record<string, string>): Record<string, string> {
  const index: Record<string, string> = {}
  for (const [path, body] of Object.entries(modules)) {
    index[slugFromPath(path)] = body
  }
  return index
}

const EN_BODIES = indexBodies(enBodies)
const FA_BODIES = indexBodies(localizedBodies)

export interface DocMeta {
  slug: string
  groupKey: TranslationKey
  titleKey: TranslationKey
  summaryKey: TranslationKey
}

export interface DocEntry {
  slug: string
  group: string
  title: string
  summary: string
  body: string
}

export interface DocGroup {
  name: string
  docs: DocEntry[]
}

export const DOCS: readonly DocMeta[] = [
  {
    slug: 'getting-started',
    groupKey: 'docs.groups.basics',
    titleKey: 'docs.items.getting-started.title',
    summaryKey: 'docs.items.getting-started.summary',
  },
  {
    slug: 'design-philosophy',
    groupKey: 'docs.groups.basics',
    titleKey: 'docs.items.design-philosophy.title',
    summaryKey: 'docs.items.design-philosophy.summary',
  },
  {
    slug: 'ai-usage',
    groupKey: 'docs.groups.basics',
    titleKey: 'docs.items.ai-usage.title',
    summaryKey: 'docs.items.ai-usage.summary',
  },
  {
    slug: 'releases',
    groupKey: 'docs.groups.basics',
    titleKey: 'docs.items.releases.title',
    summaryKey: 'docs.items.releases.summary',
  },
  {
    slug: 'journal',
    groupKey: 'docs.groups.features',
    titleKey: 'docs.items.journal.title',
    summaryKey: 'docs.items.journal.summary',
  },
  {
    slug: 'portfolio',
    groupKey: 'docs.groups.features',
    titleKey: 'docs.items.portfolio.title',
    summaryKey: 'docs.items.portfolio.summary',
  },
  {
    slug: 'data-and-backups',
    groupKey: 'docs.groups.features',
    titleKey: 'docs.items.data-and-backups.title',
    summaryKey: 'docs.items.data-and-backups.summary',
  },
  {
    slug: 'themes',
    groupKey: 'docs.groups.features',
    titleKey: 'docs.items.themes.title',
    summaryKey: 'docs.items.themes.summary',
  },
  {
    slug: 'language',
    groupKey: 'docs.groups.features',
    titleKey: 'docs.items.language.title',
    summaryKey: 'docs.items.language.summary',
  },
  {
    slug: 'calculator-position-size',
    groupKey: 'docs.groups.calculators',
    titleKey: 'docs.items.calculator-position-size.title',
    summaryKey: 'docs.items.calculator-position-size.summary',
  },
  {
    slug: 'calculator-margin-leverage',
    groupKey: 'docs.groups.calculators',
    titleKey: 'docs.items.calculator-margin-leverage.title',
    summaryKey: 'docs.items.calculator-margin-leverage.summary',
  },
  {
    slug: 'calculator-liquidation-price',
    groupKey: 'docs.groups.calculators',
    titleKey: 'docs.items.calculator-liquidation-price.title',
    summaryKey: 'docs.items.calculator-liquidation-price.summary',
  },
  {
    slug: 'calculator-risk-reward',
    groupKey: 'docs.groups.calculators',
    titleKey: 'docs.items.calculator-risk-reward.title',
    summaryKey: 'docs.items.calculator-risk-reward.summary',
  },
  {
    slug: 'calculator-fees-pnl',
    groupKey: 'docs.groups.calculators',
    titleKey: 'docs.items.calculator-fees-pnl.title',
    summaryKey: 'docs.items.calculator-fees-pnl.summary',
  },
  {
    slug: 'calculator-average-entry',
    groupKey: 'docs.groups.calculators',
    titleKey: 'docs.items.calculator-average-entry.title',
    summaryKey: 'docs.items.calculator-average-entry.summary',
  },
  {
    slug: 'calculator-spot-futures',
    groupKey: 'docs.groups.calculators',
    titleKey: 'docs.items.calculator-spot-futures.title',
    summaryKey: 'docs.items.calculator-spot-futures.summary',
  },
]

function resolveDoc(meta: DocMeta, locale: Locale, t: Translator): DocEntry {
  return {
    slug: meta.slug,
    group: t(meta.groupKey),
    title: t(meta.titleKey),
    summary: t(meta.summaryKey),
    body:
      (locale === 'fa' ? FA_BODIES[meta.slug] : EN_BODIES[meta.slug]) ?? EN_BODIES[meta.slug] ?? '',
  }
}

export function getDocGroups(locale: Locale, t: Translator): DocGroup[] {
  const groups: DocGroup[] = []
  for (const meta of DOCS) {
    const entry = resolveDoc(meta, locale, t)
    const existing = groups.find((group) => group.name === entry.group)
    if (existing) {
      existing.docs.push(entry)
    } else {
      groups.push({ name: entry.group, docs: [entry] })
    }
  }
  return groups
}

export function getDoc(slug: string, locale: Locale, t: Translator): DocEntry | undefined {
  const meta = DOCS.find((doc) => doc.slug === slug)
  return meta ? resolveDoc(meta, locale, t) : undefined
}
