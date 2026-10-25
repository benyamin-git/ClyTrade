import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import type { SubTabDef, TabDef } from '@/navigation/types'
import { SubTabBar } from './SubTabBar'

const EmptyPage = () => null

function tab(subtabs: readonly SubTabDef[]): TabDef {
  return {
    id: 'journal',
    labelKey: 'nav.journal',
    path: '/journal',
    icon: EmptyPage,
    subtabs,
  }
}

function renderBar(definition: TabDef, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SubTabBar tab={definition} />
    </MemoryRouter>,
    { wrapper: I18nProvider },
  )
}

const overview: SubTabDef = {
  id: 'overview',
  labelKey: 'nav.overview',
  path: '/journal/overview',
  element: EmptyPage,
}

const stats: SubTabDef = {
  id: 'stats',
  labelKey: 'nav.stats',
  path: '/journal/stats',
  element: EmptyPage,
}

describe('SubTabBar', () => {
  it('renders nothing for a tab with a single subtab', () => {
    const { container } = renderBar(tab([overview]), '/journal/overview')

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the subtabs when a tab has more than one', () => {
    renderBar(tab([overview, stats]), '/journal/overview')

    expect(screen.getByRole('navigation', { name: 'Journal sections' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument()
  })
})
