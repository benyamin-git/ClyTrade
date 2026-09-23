import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/cn'
import type { TabDef } from '@/navigation/types'

export function SubTabBar({ tab }: { tab: TabDef }) {
  const { pathname } = useLocation()
  const scrollerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const active = scrollerRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])

  return (
    <div className="shrink-0 border-b border-outline-variant/60 bg-surface">
      <nav
        ref={scrollerRef}
        aria-label={`${tab.label} sections`}
        className="no-scrollbar scroll-fade-x flex h-subtabbar items-stretch gap-1 overflow-x-auto px-3 sm:px-4"
      >
        {tab.subtabs.map((subtab) => (
          <NavLink
            key={subtab.id}
            to={subtab.path}
            data-active={pathname === subtab.path}
            className={({ isActive }) =>
              cn(
                'relative flex items-center px-4 text-sm font-medium whitespace-nowrap transition-colors',
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface',
              )
            }
          >
            {({ isActive }) => (
              <>
                {subtab.label}
                {isActive ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
