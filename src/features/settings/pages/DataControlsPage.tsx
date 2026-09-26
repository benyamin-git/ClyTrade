import { useRef, useState } from 'react'
import { Download, FlaskConical, MonitorDown, RotateCcw, Upload } from 'lucide-react'
import {
  BackupError,
  clearAllData,
  downloadBackup,
  exportBackup,
  importBackup,
  parseBackup,
  type ImportMode,
} from '@/data/backup'
import { loadSampleData } from '@/data/sampleData'
import { useInstallPrompt } from '@/features/settings/logic/useInstallPrompt'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'

type Message = { tone: 'ok' | 'error'; text: string } | null

export function DataControlsPage() {
  const { t } = useI18n()
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
      setMessage({ tone: 'ok', text: t('data.export.downloaded') })
    } catch {
      setMessage({ tone: 'error', text: t('data.export.failed') })
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
        text: t('data.import.imported', {
          assets: backup.data.assets.length,
          mode: t(`data.import.${mode}`),
          trades: backup.data.trades.length,
        }),
      })
    } catch (error) {
      setMessage({
        tone: 'error',
        text:
          error instanceof BackupError ? t(`data.errors.${error.code}`) : t('data.import.failed'),
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
      setMessage({ tone: 'ok', text: t('data.sample.loaded') })
    } catch {
      setMessage({ tone: 'error', text: t('data.sample.failed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        {canInstall || installed ? (
          <Card title={t('data.install.title')}>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-on-surface-variant">
                {installed ? t('data.install.installed') : t('data.install.description')}
              </p>
              {canInstall ? (
                <div>
                  <Button
                    size="sm"
                    icon={<MonitorDown />}
                    onClick={() => void promptInstall()}
                    disabled={busy}
                  >
                    {t('data.install.button')}
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card title={t('data.export.title')}>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">{t('data.export.description')}</p>
            <div>
              <Button
                size="sm"
                icon={<Download />}
                onClick={() => void handleExport()}
                disabled={busy}
              >
                {t('data.export.button')}
              </Button>
            </div>
          </div>
        </Card>

        <Card title={t('data.import.title')}>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">{t('data.import.description')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                value={mode}
                options={[
                  { value: 'merge', label: t('data.import.merge') },
                  { value: 'replace', label: t('data.import.replace') },
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
                {t('data.import.chooseFile')}
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

        <Card title={t('data.sample.title')}>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">{t('data.sample.description')}</p>
            <div>
              <Button
                size="sm"
                variant="tonal"
                icon={<FlaskConical />}
                onClick={() => setConfirmSample(true)}
                disabled={busy}
              >
                {t('data.sample.button')}
              </Button>
            </div>
          </div>
        </Card>

        <Card title={t('data.reset.title')}>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-on-surface-variant">{t('data.reset.description')}</p>
            <div>
              <Button
                size="sm"
                variant="danger"
                icon={<RotateCcw />}
                onClick={() => setConfirmReset(true)}
                disabled={busy}
              >
                {t('data.reset.button')}
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
          title={t('data.sample.loadTitle')}
          footer={
            <>
              <Button variant="text" onClick={() => setConfirmSample(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void handleLoadSample()} disabled={busy}>
                {t('data.sample.loadSamples')}
              </Button>
            </>
          }
        >
          <p className="text-sm">{t('data.sample.confirm')}</p>
        </Sheet>

        <Sheet
          open={confirmReset}
          onClose={() => setConfirmReset(false)}
          title={t('data.reset.title')}
          footer={
            <>
              <Button variant="text" onClick={() => setConfirmReset(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  void clearAllData().then(() => {
                    setConfirmReset(false)
                    setMessage({ tone: 'ok', text: t('data.reset.cleared') })
                  })
                }}
              >
                {t('data.reset.deleteEverything')}
              </Button>
            </>
          }
        >
          <p className="text-sm">{t('data.reset.confirm')}</p>
        </Sheet>
      </div>
    </ViewportPage>
  )
}
