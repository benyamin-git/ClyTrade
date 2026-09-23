import { useRef, useState } from 'react'
import { Download, FlaskConical, MonitorDown, RotateCcw, Upload } from 'lucide-react'
import {
  clearAllData,
  downloadBackup,
  exportBackup,
  importBackup,
  parseBackup,
  type ImportMode,
} from '@/data/backup'
import { loadSampleData } from '@/data/sampleData'
import { useInstallPrompt } from '@/features/settings/logic/useInstallPrompt'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'

type Message = { tone: 'ok' | 'error'; text: string } | null

export function DataControlsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [message, setMessage] = useState<Message>(null)
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSample, setConfirmSample] = useState(false)
  const { canInstall, installed, promptInstall } = useInstallPrompt()

  async function handleExport() {
    setBusy(true)
    try {
      const backup = await exportBackup()
      downloadBackup(backup)
      setMessage({ tone: 'ok', text: 'Backup downloaded.' })
    } catch {
      setMessage({ tone: 'error', text: 'Export failed.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(file: File) {
    setBusy(true)
    setMessage(null)
    try {
      const text = await file.text()
      const backup = parseBackup(text)
      await importBackup(backup, mode)
      setMessage({
        tone: 'ok',
        text: `Imported ${backup.data.trades.length} trades and ${backup.data.assets.length} assets (${mode}).`,
      })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Import failed.',
      })
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleLoadSample() {
    setBusy(true)
    try {
      await loadSampleData()
      setConfirmSample(false)
      setMessage({ tone: 'ok', text: 'Sample data loaded.' })
    } catch {
      setMessage({ tone: 'error', text: 'Could not load sample data.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        {canInstall || installed ? (
          <Card title="Install">
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-on-surface-variant">
                {installed
                  ? 'ClyTrade is installed on this device and works offline.'
                  : 'Install ClyTrade as a standalone app. It keeps working without a network connection.'}
              </p>
              {canInstall ? (
                <div>
                  <Button
                    size="sm"
                    icon={<MonitorDown />}
                    onClick={() => void promptInstall()}
                    disabled={busy}
                  >
                    Install app
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card title="Export">
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">
              Download a single JSON file with all trades, assets and settings.
            </p>
            <div>
              <Button
                size="sm"
                icon={<Download />}
                onClick={() => void handleExport()}
                disabled={busy}
              >
                Export backup
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Import">
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">
              Restore a ClyTrade backup. Merge keeps existing records and overwrites matching ids;
              replace clears the database first.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                value={mode}
                options={[
                  { value: 'merge', label: 'Merge' },
                  { value: 'replace', label: 'Replace' },
                ]}
                onChange={setMode}
                size="sm"
              />
              <Button
                size="sm"
                variant="tonal"
                icon={<Upload />}
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleFile(file)
                }}
              />
            </div>
          </div>
        </Card>

        <Card title="Sample data">
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">
              Add a set of example trades and assets to explore the journal, stats and portfolio.
              Your own records are kept; loading again refreshes the samples. Reset removes them.
            </p>
            <div>
              <Button
                size="sm"
                variant="tonal"
                icon={<FlaskConical />}
                onClick={() => setConfirmSample(true)}
                disabled={busy}
              >
                Load sample data
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Reset">
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">
              Delete all trades, assets and settings on this device. Export first — there is no
              undo.
            </p>
            <div>
              <Button
                size="sm"
                variant="danger"
                icon={<RotateCcw />}
                onClick={() => setConfirmReset(true)}
                disabled={busy}
              >
                Reset all data
              </Button>
            </div>
          </div>
        </Card>

        {message ? (
          <p
            role="status"
            className={message.tone === 'ok' ? 'text-xs text-profit' : 'text-xs text-error'}
          >
            {message.text}
          </p>
        ) : null}

        <Sheet
          open={confirmSample}
          onClose={() => setConfirmSample(false)}
          title="Load sample data"
          footer={
            <>
              <Button variant="text" onClick={() => setConfirmSample(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleLoadSample()} disabled={busy}>
                Load samples
              </Button>
            </>
          }
        >
          <p className="text-sm">
            This adds example trades and assets to the journal and portfolio. Records you created
            yourself are not touched, and the samples can be removed with Reset all data.
          </p>
        </Sheet>

        <Sheet
          open={confirmReset}
          onClose={() => setConfirmReset(false)}
          title="Reset all data"
          footer={
            <>
              <Button variant="text" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  void clearAllData().then(() => {
                    setConfirmReset(false)
                    setMessage({ tone: 'ok', text: 'All data cleared.' })
                  })
                }}
              >
                Delete everything
              </Button>
            </>
          }
        >
          <p className="text-sm">
            This deletes every trade, asset and setting stored by ClyTrade on this device. The
            action cannot be undone.
          </p>
        </Sheet>
      </div>
    </ViewportPage>
  )
}
