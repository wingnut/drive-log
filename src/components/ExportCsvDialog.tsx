import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import FolderOpenIcon from '@mui/icons-material/FolderOpenOutlined'
import {
  isFileSystemAccessSupported,
  pickExportDirectory,
  getRememberedDirectory,
  fileExistsInDirectory,
  writeTextFile,
  getRememberedFilename,
  rememberFilename,
  type FSDirectoryHandle,
} from '../utils/fileExport'

interface Props {
  open: boolean
  onClose: () => void
  /** Called at the moment of writing, so the export always reflects
   *  whatever's in the log right now rather than a stale snapshot from
   *  when the dialog was opened. */
  generateCsv: () => string
  /** Browsers without the File System Access API (Safari, Firefox) —
   *  falls back to a normal browser download of `filename`. */
  onDownloadFallback: (filename: string) => void
  onExported: (detail: { filename: string; folderName?: string }) => void
}

function defaultFilename(): string {
  return `korjournal-${new Date().toISOString().slice(0, 10)}.csv`
}

function withCsvExtension(name: string): string {
  const trimmed = name.trim()
  return trimmed.toLowerCase().endsWith('.csv') ? trimmed : `${trimmed}.csv`
}

/** Suggests an alternative filename when the chosen one already
 *  exists — increments a trailing "(n)" if there is one, otherwise
 *  appends "(1)". */
function suggestAlternativeName(name: string): string {
  const withoutExt = name.replace(/\.csv$/i, '')
  const match = withoutExt.match(/^(.*) \((\d+)\)$/)
  if (match) {
    const next = Number(match[2]) + 1
    return `${match[1]} (${next}).csv`
  }
  return `${withoutExt} (1).csv`
}

export default function ExportCsvDialog({ open, onClose, generateCsv, onDownloadFallback, onExported }: Props) {
  const fsSupported = isFileSystemAccessSupported()
  const [step, setStep] = useState<'form' | 'conflict'>('form')
  const [dirHandle, setDirHandle] = useState<FSDirectoryHandle | undefined>(undefined)
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    setStep('form')
    setError(undefined)
    setFilename(getRememberedFilename() ?? defaultFilename())
    if (fsSupported) {
      getRememberedDirectory().then(setDirHandle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleChooseFolder = async () => {
    const handle = await pickExportDirectory()
    if (handle) setDirHandle(handle)
  }

  const finishWrite = async (targetDir: FSDirectoryHandle, targetName: string) => {
    setBusy(true)
    setError(undefined)
    try {
      await writeTextFile(targetDir, targetName, generateCsv())
      rememberFilename(targetName)
      onClose()
      onExported({ filename: targetName, folderName: targetDir.name })
    } catch {
      setError('Det gick inte att spara filen. Kontrollera behörigheten till mappen och försök igen.')
    } finally {
      setBusy(false)
    }
  }

  const handleExportClick = async () => {
    const targetName = withCsvExtension(filename)
    setFilename(targetName)

    if (!fsSupported || !dirHandle) {
      rememberFilename(targetName)
      onDownloadFallback(targetName)
      onClose()
      onExported({ filename: targetName })
      return
    }

    setBusy(true)
    setError(undefined)
    const exists = await fileExistsInDirectory(dirHandle, targetName)
    setBusy(false)
    if (exists) {
      setStep('conflict')
      return
    }
    await finishWrite(dirHandle, targetName)
  }

  const handleOverwrite = () => {
    if (dirHandle) finishWrite(dirHandle, filename)
  }

  const handleRename = () => {
    setFilename(suggestAlternativeName(filename))
    setStep('form')
  }

  const canExport = filename.trim() !== '' && (!fsSupported || Boolean(dirHandle))

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      {step === 'form' ? (
        <>
          <DialogTitle>Exportera CSV</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {fsSupported ? (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Mapp
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography sx={{ flex: 1, fontStyle: dirHandle ? 'normal' : 'italic' }}>
                      {dirHandle ? dirHandle.name : 'Ingen mapp vald ännu'}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FolderOpenIcon />}
                      onClick={handleChooseFolder}
                      disabled={busy}
                    >
                      {dirHandle ? 'Byt mapp' : 'Välj mapp…'}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Alert severity="info">
                  Den här webbläsaren stöder inte val av mapp — filen sparas i din nedladdningsmapp. Om en fil
                  med samma namn redan finns lägger webbläsaren normalt till ett nummer automatiskt.
                </Alert>
              )}

              <TextField
                label="Filnamn"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                helperText="Namnet kommer ihåg till nästa export"
                fullWidth
                disabled={busy}
              />

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} color="inherit" disabled={busy}>
              Avbryt
            </Button>
            <Button onClick={handleExportClick} variant="contained" disabled={!canExport || busy}>
              Exportera
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>Filen finns redan</DialogTitle>
          <DialogContent>
            <DialogContentText>
              En fil med namnet &quot;{filename}&quot; finns redan i mappen &quot;{dirHandle?.name}&quot;. Vill du
              skriva över den, byta namn på den nya filen, eller avbryta exporten?
            </DialogContentText>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} color="inherit" disabled={busy}>
              Avbryt
            </Button>
            <Button onClick={handleRename} disabled={busy}>
              Byt namn
            </Button>
            <Button onClick={handleOverwrite} variant="contained" color="warning" disabled={busy}>
              Skriv över
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
