import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { DOC_GROUPS, DOCS, type DocEntry } from '@/docs/registry'
import { Card } from '@/ui/components/Card'
import { Markdown } from '@/ui/components/Markdown'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'

export function DocumentationPage() {
  const [openDoc, setOpenDoc] = useState<DocEntry | null>(null)

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        {DOC_GROUPS.map((group) => (
          <Card key={group} title={group}>
            <ul className="flex flex-col divide-y divide-outline-variant/40">
              {DOCS.filter((doc) => doc.group === group).map((doc) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => setOpenDoc(doc)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-on-surface/5"
                  >
                    <BookOpen className="size-4 shrink-0 text-on-surface-variant" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{doc.title}</span>
                      <span className="block truncate text-2xs text-on-surface-variant">
                        {doc.summary}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}

        <Sheet
          open={openDoc !== null}
          onClose={() => setOpenDoc(null)}
          title={openDoc?.title ?? ''}
        >
          {openDoc ? <Markdown>{openDoc.body}</Markdown> : null}
        </Sheet>
      </div>
    </ViewportPage>
  )
}
