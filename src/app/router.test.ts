import { describe, expect, it, vi } from 'vitest'
import { routes } from './router'

vi.mock('@/navigation/tabs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/navigation/tabs')>()
  return {
    ...actual,
    tabs: [
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
})
