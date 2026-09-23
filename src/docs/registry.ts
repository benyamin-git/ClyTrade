import gettingStarted from './general/getting-started.md?raw'
import journal from './general/journal.md?raw'
import portfolio from './general/portfolio.md?raw'
import dataAndBackups from './general/data-and-backups.md?raw'
import themes from './general/themes.md?raw'
import designPhilosophy from './general/design-philosophy.md?raw'
import aiUsage from './general/ai-usage.md?raw'
import releases from './general/releases.md?raw'
import positionSize from './calculators/position-size.md?raw'
import marginLeverage from './calculators/margin-leverage.md?raw'
import liquidationPrice from './calculators/liquidation-price.md?raw'
import riskReward from './calculators/risk-reward.md?raw'
import feesPnl from './calculators/fees-pnl.md?raw'
import averageEntry from './calculators/average-entry.md?raw'
import spotFutures from './calculators/spot-futures.md?raw'

export interface DocEntry {
  slug: string
  title: string
  group: string
  summary: string
  body: string
}

export const DOCS: readonly DocEntry[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    group: 'Basics',
    summary: 'What ClyTrade is, how a typical session flows, and how to move around.',
    body: gettingStarted,
  },
  {
    slug: 'design-philosophy',
    title: 'Design Philosophy',
    group: 'Basics',
    summary: 'Why the app is fast, dense, opinionated and local-first.',
    body: designPhilosophy,
  },
  {
    slug: 'ai-usage',
    title: 'AI Usage',
    group: 'Basics',
    summary: 'ClyTrade is written by AI. Here is how it is directed, reviewed and verified.',
    body: aiUsage,
  },
  {
    slug: 'releases',
    title: 'Platforms & Releases',
    group: 'Basics',
    summary: 'PWA, Windows and Android builds, version numbering and moving data between them.',
    body: releases,
  },
  {
    slug: 'journal',
    title: 'Journal',
    group: 'Features',
    summary: 'Track futures and perp trades with derived metrics and stats.',
    body: journal,
  },
  {
    slug: 'portfolio',
    title: 'Portfolio',
    group: 'Features',
    summary: 'Track spot holdings, cost basis and allocation.',
    body: portfolio,
  },
  {
    slug: 'data-and-backups',
    title: 'Data & Backups',
    group: 'Features',
    summary: 'Where data lives, how to export, import, reset and load sample data.',
    body: dataAndBackups,
  },
  {
    slug: 'themes',
    title: 'Themes',
    group: 'Features',
    summary: 'Material Light, Material Dark and Black Night, plus preset accents.',
    body: themes,
  },
  {
    slug: 'calculator-position-size',
    title: 'Position Size',
    group: 'Calculators',
    summary: 'Size a position from a fixed account risk.',
    body: positionSize,
  },
  {
    slug: 'calculator-margin-leverage',
    title: 'Margin & Leverage',
    group: 'Calculators',
    summary: 'Required margin, buying power and effective leverage.',
    body: marginLeverage,
  },
  {
    slug: 'calculator-liquidation-price',
    title: 'Liquidation Price',
    group: 'Calculators',
    summary: 'Estimated isolated-margin liquidation price and distance.',
    body: liquidationPrice,
  },
  {
    slug: 'calculator-risk-reward',
    title: 'Risk / Reward',
    group: 'Calculators',
    summary: 'R multiples, break-even win rate and expectancy.',
    body: riskReward,
  },
  {
    slug: 'calculator-fees-pnl',
    title: 'Fees & PnL',
    group: 'Calculators',
    summary: 'Gross and net PnL after fees and funding.',
    body: feesPnl,
  },
  {
    slug: 'calculator-average-entry',
    title: 'Average Entry / DCA',
    group: 'Calculators',
    summary: 'Blended entry price when scaling in.',
    body: averageEntry,
  },
  {
    slug: 'calculator-spot-futures',
    title: 'Spot ↔ Futures',
    group: 'Calculators',
    summary: 'Compare spot and leveraged exposure for the same capital.',
    body: spotFutures,
  },
]

export function getDoc(slug: string): DocEntry | undefined {
  return DOCS.find((doc) => doc.slug === slug)
}

export const DOC_GROUPS: readonly string[] = [...new Set(DOCS.map((doc) => doc.group))]
