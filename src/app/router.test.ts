import { describe, expect, it, vi } from 'vitest'
import { routes } from './router'

vi.mock('@/navigation/tabs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/navigation/tabs')>()
  return {
    ...actual,
    tabs: [
      ...actual.tabs,
      {
        id: 'journal',
        labelKey: 'nav.journal',
        path: '/empty',
        icon: () => null,
        subtabs: [],
      },
    ],
  }
})

describe('router', () => {
  it('does not self-redirect a tab that has no subtabs', () => {
    const childPaths = routes[0]?.children?.map((route) => route.path) ?? []

    expect(childPaths).not.toContain('empty')
  })

  it('redirects the Alerts tab to its overview', () => {
    const children = routes[0]?.children ?? []
    const redirect = children.find((route) => route.path === 'alerts')

    expect(redirect?.element).toMatchObject({
      props: { to: '/alerts/overview', replace: true },
    })
    expect(children.map((route) => route.path)).toContain('alerts/overview')
  })
})
