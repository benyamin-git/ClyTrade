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
    label: 'Journal',
    path: '/journal',
    icon: NotebookPen,
    subtabs: [
      {
        id: 'overview',
        label: 'Overview',
        path: '/journal/overview',
        element: JournalOverviewPage,
      },
      { id: 'stats', label: 'Stats', path: '/journal/stats', element: JournalStatsPage },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    path: '/portfolio',
    icon: Wallet,
    subtabs: [
      {
        id: 'overview',
        label: 'Overview',
        path: '/portfolio/overview',
        element: PortfolioOverviewPage,
      },
      { id: 'stats', label: 'Stats', path: '/portfolio/stats', element: PortfolioStatsPage },
    ],
  },
  {
    id: 'calculations',
    label: 'Calculations',
    path: '/calculations',
    icon: Calculator,
    subtabs: calculators.map((calculator) => ({
      id: calculator.id,
      label: calculator.label,
      path: calculator.path,
      element: calculator.Page,
    })),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    subtabs: [
      {
        id: 'preferences',
        label: 'Preferences',
        path: '/settings/preferences',
        element: PreferencesPage,
      },
      { id: 'themes', label: 'Themes', path: '/settings/themes', element: ThemesPage },
      {
        id: 'data',
        label: 'Data Controls',
        path: '/settings/data',
        element: DataControlsPage,
      },
      {
        id: 'documentation',
        label: 'Documentation',
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
