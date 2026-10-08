import { useState } from 'react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/ui/components/Button'
import { CollapsibleSection } from '@/ui/components/CollapsibleSection'
import { Sheet } from '@/ui/components/Sheet'

export interface FilterSectionSpec {
  id: string
  title: string
  count: number
  children: ReactNode
}

export interface FilterSheetProps {
  open: boolean
  onClose: () => void
  sections: readonly FilterSectionSpec[]
  onClearAll: () => void
}

function activeSectionState(sections: readonly FilterSectionSpec[]): Record<string, boolean> {
  const initial: Record<string, boolean> = {}
  for (const section of sections) {
    if (section.count > 0) initial[section.id] = true
  }
  return initial
}

export function FilterSheet({ open, onClose, sections, onClearAll }: FilterSheetProps) {
  const { t } = useI18n()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [seeded, setSeeded] = useState(false)
  const [prevOpen, setPrevOpen] = useState(false)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open && !seeded) {
      setSeeded(true)
      setOpenSections(activeSectionState(sections))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('filters.title')}
      footer={
        <>
          <Button variant="text" onClick={onClearAll}>
            {t('filters.clearAll')}
          </Button>
          <Button onClick={onClose}>{t('filters.done')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            title={section.title}
            count={section.count}
            open={openSections[section.id] ?? false}
            onOpenChange={(next) =>
              setOpenSections((current) => ({ ...current, [section.id]: next }))
            }
          >
            <div className="px-2 pt-1 pb-3">{section.children}</div>
          </CollapsibleSection>
        ))}
      </div>
    </Sheet>
  )
}
