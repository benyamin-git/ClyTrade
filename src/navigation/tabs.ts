import { Calculator, NotebookPen, Settings, Wallet } from 'lucide-react'
import { lazyPage } from '@/app/lazyPage'
import { calculators } from '@/features/calculations/registry'
import { JournalOverviewPage } from '@/features/journal/pages/JournalOverviewPage'
import { PortfolioOverviewPage } from '@/features/portfolio/pages/PortfolioOverviewPage'
import type { SubTabDef, TabDef } from './types'

const JournalStatsPage = lazyPage(
  () => import('@/features/journal/pages/JournalStatsPage'),
  'JournalStatsPage',
)
const PortfolioStatsPage = lazyPage(
  () => import('@/features/portfolio/pages/PortfolioStatsPage'),
  'PortfolioStatsPage',
)
const PreferencesPage = lazyPage(
  () => import('@/features/settings/pages/PreferencesPage'),
  'PreferencesPage',
)
const ThemesPage = lazyPage(() => import('@/features/settings/pages/ThemesPage'), 'ThemesPage')
const DataControlsPage = lazyPage(
  () => import('@/features/settings/pages/DataControlsPage'),
  'DataControlsPage',
)
const DocumentationPage = lazyPage(
  () => import('@/features/settings/pages/DocumentationPage'),
  'DocumentationPage',
)

export const tabs: readonly TabDef[] = [
  {
    id: 'journal',
    labelKey: 'nav.journal',
    path: '/journal',
    icon: NotebookPen,
    subtabs: [
      {
        id: 'overview',
        labelKey: 'nav.overview',
        path: '/journal/overview',
        element: JournalOverviewPage,
      },
      { id: 'stats', labelKey: 'nav.stats', path: '/journal/stats', element: JournalStatsPage },
    ],
  },
  {
    id: 'portfolio',
    labelKey: 'nav.portfolio',
    path: '/portfolio',
    icon: Wallet,
    subtabs: [
      {
        id: 'overview',
        labelKey: 'nav.overview',
        path: '/portfolio/overview',
        element: PortfolioOverviewPage,
      },
      { id: 'stats', labelKey: 'nav.stats', path: '/portfolio/stats', element: PortfolioStatsPage },
    ],
  },
  {
    id: 'calculations',
    labelKey: 'nav.calculations',
    path: '/calculations',
    icon: Calculator,
    subtabs: calculators.map((calculator) => ({
      id: calculator.id,
      labelKey: calculator.labelKey,
      path: calculator.path,
      element: calculator.Page,
    })),
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    path: '/settings',
    icon: Settings,
    subtabs: [
      {
        id: 'preferences',
        labelKey: 'nav.preferences',
        path: '/settings/preferences',
        element: PreferencesPage,
      },
      { id: 'themes', labelKey: 'nav.themes', path: '/settings/themes', element: ThemesPage },
      {
        id: 'data',
        labelKey: 'nav.dataControls',
        path: '/settings/data',
        element: DataControlsPage,
      },
      {
        id: 'documentation',
        labelKey: 'nav.documentation',
        path: '/settings/documentation',
        element: DocumentationPage,
      },
    ],
  },
]

export function findTab(pathname: string): TabDef | undefined {
  return tabs.find((tab) => pathname === tab.path || pathname.startsWith(`${tab.path}/`))
}

export function findSubTab(tab: TabDef, pathname: string): SubTabDef | undefined {
  return tab.subtabs.find((subtab) => subtab.path === pathname)
}
