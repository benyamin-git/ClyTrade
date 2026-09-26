import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { getDoc } from '@/docs/registry'
import { useI18n } from '@/i18n/I18nContext'
import { Markdown } from './Markdown'
import { Sheet } from './Sheet'
import { IconButton } from './IconButton'

export function HelpButton({ docSlug, className }: { docSlug: string; className?: string }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const doc = getDoc(docSlug, locale, t)
  if (!doc) return null

  return (
    <>
      <IconButton
        label={t('common.about', { title: doc.title })}
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <CircleHelp />
      </IconButton>
      <Sheet open={open} onClose={() => setOpen(false)} title={doc.title}>
        <Markdown>{doc.body}</Markdown>
      </Sheet>
    </>
  )
}
