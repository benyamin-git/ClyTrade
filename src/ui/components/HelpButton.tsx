import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { getDoc } from '@/docs/registry'
import { Markdown } from './Markdown'
import { Sheet } from './Sheet'
import { IconButton } from './IconButton'

export function HelpButton({ docSlug, className }: { docSlug: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const doc = getDoc(docSlug)
  if (!doc) return null

  return (
    <>
      <IconButton
        label={`About ${doc.title}`}
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
