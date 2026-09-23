import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { findSubTab, findTab, tabs } from '@/navigation/tabs'
import { NavDrawer } from './NavDrawer'
import { SubTabBar } from './SubTabBar'
import { TopBar } from './TopBar'

export function AppShell() {
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const tab = findTab(pathname) ?? tabs[0]
  const subtab = tab ? findSubTab(tab, pathname) : undefined

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-on-surface">
      {tab ? (
        <TopBar title={tab.label} subtitle={subtab?.label} onOpenNav={() => setNavOpen(true)} />
      ) : null}
      {tab ? <SubTabBar tab={tab} /> : null}
      <main className="min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
    </div>
  )
}
