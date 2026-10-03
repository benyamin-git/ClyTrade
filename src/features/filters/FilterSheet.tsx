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

export function FilterSheet({ open, onClose, sections, onClearAll }: FilterSheetProps) {
  const { t } = useI18n()

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
            defaultOpen={false}
            autoOpen={section.count > 0}
          >
            {section.children}
          </CollapsibleSection>
        ))}
      </div>
    </Sheet>
  )
}
