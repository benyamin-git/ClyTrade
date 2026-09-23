import { Check } from 'lucide-react'
import { ACCENTS, THEME_NATIVE_ACCENT } from '@/theme/accents'
import { useTheme } from '@/theme/ThemeContext'
import { THEMES } from '@/theme/theme'
import { cn } from '@/lib/cn'
import { ViewportPage } from '@/ui/layout/ViewportPage'

export function ThemesPage() {
  const { theme, setTheme, accent, setAccent } = useTheme()

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((option) => {
            const active = option.id === theme
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col gap-3 rounded-app-md border p-3 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant/60 hover:border-outline',
                )}
              >
                <span
                  data-theme={option.id}
                  className="flex h-24 flex-col justify-between rounded-app-sm border border-outline-variant/40 bg-background p-3"
                >
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full bg-primary" />
                    <span className="size-2.5 rounded-full bg-secondary" />
                    <span className="size-2.5 rounded-full bg-tertiary" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="h-1.5 w-3/4 rounded-full bg-surface-container-high" />
                    <span className="h-1.5 w-1/2 rounded-full bg-surface-container" />
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{option.label}</span>
                    <span className="block truncate text-2xs text-on-surface-variant">
                      {option.description}
                    </span>
                  </span>
                  {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-app-md border border-outline-variant/60 p-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-medium">Accent</h2>
            <p className="text-xs text-on-surface-variant">
              Recolors the primary, secondary and tertiary families and tints the surfaces of the
              active theme. Blue is the default; Purple restores the palette the theme ships with.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((option) => {
              const active = option.id === accent
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAccent(option.id)}
                  aria-pressed={active}
                  aria-label={option.label}
                  title={option.label}
                  className={cn(
                    'flex w-20 flex-col items-center gap-2 rounded-app-md border p-2 transition-colors',
                    active
                      ? 'border-primary bg-primary-container/30'
                      : 'border-outline-variant/60 hover:border-outline',
                  )}
                >
                  <span
                    data-theme={theme}
                    data-accent={option.id === THEME_NATIVE_ACCENT ? undefined : option.id}
                    className="size-10 rounded-app-full border border-outline-variant/40 bg-primary"
                  />
                  <span className="w-full text-center text-2xs leading-tight text-on-surface-variant">
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-on-surface-variant">
          Themes use Material Design 3 color roles, so every screen follows your choice.
        </p>
      </div>
    </ViewportPage>
  )
}
