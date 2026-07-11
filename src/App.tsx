import { useEffect, useMemo, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCarFilledOutlined'
import DownloadIcon from '@mui/icons-material/DownloadOutlined'
import UndoIcon from '@mui/icons-material/UndoOutlined'
import RedoIcon from '@mui/icons-material/RedoOutlined'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'

import DriveLogTable from './components/DriveLogTable'
import SummaryStats from './components/SummaryStats'
import CsvImportButton from './components/CsvImportButton'
import EntryDialog, { type EntrySavePayload } from './components/EntryDialog'
import ExportCsvDialog from './components/ExportCsvDialog'
import type { ComputedEntry, DriveLog, DriveLogEntry } from './types'
import { computeChain, validateEntries } from './utils/chain'
import { exportDriveLogCsv, downloadCsv, makeId, mergeEntriesByDate } from './utils/csv'
import { loadLog, saveLog, clearLog, EMPTY_LOG } from './utils/storage'
import { useLogHistory } from './utils/history'

/** Which entry the dialog is currently open for: inserting a brand new
 *  row at a given position (optionally prefilled with a neighboring
 *  trip's date), or editing an existing one by id. */
type DialogState =
  | { mode: 'add'; index: number; anchorDate?: string }
  | { mode: 'edit'; id: string }
  | null

export default function App() {
  const initialLog = useMemo(() => loadLog(), [])
  const { log, setLog, undo, redo, resetTo, canUndo, canRedo } = useLogHistory(initialLog)
  const { baselineOdo, entries } = log
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'warning' | 'error' } | null>(
    null,
  )

  // Persist on every change to the log itself — undo/redo included, so
  // reloading the page keeps whatever point in history you're at.
  useEffect(() => {
    saveLog(log)
  }, [log])

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y to redo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey
      if (!meta) return
      const key = e.key.toLowerCase()
      if (key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (key === 'z') {
        e.preventDefault()
        undo()
      } else if (key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // The single place Start ODO / Stop ODO get derived. Everything below
  // — the table, the summary, validation, the dialog's starting point —
  // reads from this instead of trusting any stored odometer value.
  const computed = useMemo(() => computeChain(baselineOdo, entries), [baselineOdo, entries])
  const issues = useMemo(() => validateEntries(computed), [computed])

  const handleInsertAt = (index: number, anchorDate?: string) => setDialogState({ mode: 'add', index, anchorDate })
  const handleEditClick = (entry: ComputedEntry) => setDialogState({ mode: 'edit', id: entry.id })
  const handleDialogClose = () => setDialogState(null)

  const handleDelete = (id: string) => {
    setLog((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }))
  }

  /** Reorders `entries` so the dragged row (currently at `from`) ends
   *  up immediately before the row currently at `to` — this rule holds
   *  regardless of drag direction, so dropping onto a row always reads
   *  as "put it right here, above this one". Only order changes; every
   *  row keeps its own recorded distance, so the odometer chain (and
   *  all its validation) simply recomputes for the new sequence. */
  const handleReorder = (from: number, to: number) => {
    if (from === to) return
    setLog((prev) => {
      const arr = [...prev.entries]
      const [moved] = arr.splice(from, 1)
      const insertIndex = from < to ? to - 1 : to
      arr.splice(insertIndex, 0, moved)
      return { ...prev, entries: arr }
    })
  }

  const handleSave = (payload: EntrySavePayload) => {
    if (!dialogState) return
    if (dialogState.mode === 'add') {
      const newEntry: DriveLogEntry = {
        id: makeId(),
        date: payload.date,
        distance: payload.distance,
        reason: payload.reason,
      }
      setLog((prev) => ({
        baselineOdo:
          dialogState.index === 0 && payload.startOdoOverride !== undefined
            ? payload.startOdoOverride
            : prev.baselineOdo,
        entries: [...prev.entries.slice(0, dialogState.index), newEntry, ...prev.entries.slice(dialogState.index)],
      }))
    } else {
      const idx = entries.findIndex((e) => e.id === dialogState.id)
      setLog((prev) => ({
        baselineOdo:
          idx === 0 && payload.startOdoOverride !== undefined ? payload.startOdoOverride : prev.baselineOdo,
        entries: prev.entries.map((e) =>
          e.id === dialogState.id
            ? { ...e, date: payload.date, distance: payload.distance, reason: payload.reason }
            : e,
        ),
      }))
    }
  }

  const handleImported = (imported: DriveLogEntry[], importedBaseline: number, warnings: string[]) => {
    setLog((prev): DriveLog => {
      if (prev.entries.length === 0) {
        // Nothing to merge with yet — the CSV's own baseline becomes
        // the log's, and its rows still go through the same date-order
        // merge (against an empty list) so ties/ordering behave
        // identically to merging into a non-empty log.
        return { baselineOdo: importedBaseline, entries: mergeEntriesByDate([], imported) }
      }
      // Log already has rows: keep the existing baseline (the CSV's is
      // only meaningful for a from-scratch import) and weave the new
      // trips into the existing ones by date — a new row lands below
      // any existing row that shares its date, never above.
      return { ...prev, entries: mergeEntriesByDate(prev.entries, imported) }
    })
    if (warnings.length > 0) {
      setSnackbar({
        message: `Importerade och sammanfogade ${imported.length} resor med ${warnings.length} varning(ar): ${warnings[0]}${
          warnings.length > 1 ? ` (+${warnings.length - 1} till)` : ''
        }`,
        severity: 'warning',
      })
    } else {
      setSnackbar({
        message: `Importerade och sammanfogade ${imported.length} resor efter datum.`,
        severity: 'success',
      })
    }
  }

  const handleDownloadFallback = (filename: string) => {
    const csv = exportDriveLogCsv({ baselineOdo, entries })
    downloadCsv(filename, csv)
  }

  const handleExported = ({ filename, folderName }: { filename: string; folderName?: string }) => {
    setSnackbar({
      message: folderName ? `Sparade ${filename} i mappen "${folderName}".` : `${filename} laddades ner.`,
      severity: 'success',
    })
  }

  const handleClearAll = () => {
    resetTo(EMPTY_LOG)
    clearLog()
    setClearConfirmOpen(false)
    setSnackbar({ message: 'Körjournalen har rensats.', severity: 'success' })
  }

  // Figure out what the dialog should show: the Start ODO this row has
  // (or will have), whether it's editable (only true for position 0),
  // and the existing entry data when editing.
  let dialogStartOdo = 0
  let dialogIsFirst = false
  let dialogInitial: DriveLogEntry | undefined
  // Default date for a brand new row: the date of the row whose cell
  // the insert control was hovered in (passed through as anchorDate),
  // so it's obvious which date the new row will default to and where
  // it'll land. Falls back to a neighboring row, then to nothing
  // (today) only for a genuinely empty log.
  let dialogDefaultDate: string | undefined

  if (dialogState?.mode === 'add') {
    dialogIsFirst = dialogState.index === 0
    dialogStartOdo = dialogState.index === 0 ? baselineOdo : computed[dialogState.index - 1].stopOdo
    dialogDefaultDate =
      dialogState.anchorDate ?? entries[dialogState.index - 1]?.date ?? entries[dialogState.index]?.date
  } else if (dialogState?.mode === 'edit') {
    const idx = computed.findIndex((e) => e.id === dialogState.id)
    if (idx >= 0) {
      dialogIsFirst = idx === 0
      dialogStartOdo = computed[idx].startOdo
      dialogInitial = entries[idx]
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <DirectionsCarIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Körjournal – Tjänstebil
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mr: 2 }}>
            <Tooltip title="Ångra (Ctrl+Z)">
              <span>
                <IconButton color="inherit" size="small" onClick={undo} disabled={!canUndo}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Gör om (Ctrl+Shift+Z)">
              <span>
                <IconButton color="inherit" size="small" onClick={redo} disabled={!canRedo}>
                  <RedoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.75, mr: 2 }}>
            Underlag för Skatteverket
          </Typography>
          <Tooltip title="Rensa allt — tar bort alla resor och historik">
            <IconButton color="inherit" size="small" onClick={() => setClearConfirmOpen(true)}>
              <DeleteSweepOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Typography variant="body2" color="text.secondary" maxWidth={560}>
              Registrera varje tjänsteresa med datum, mätarställning och anledning. Start ODO
              härleds alltid från föregående resas Stop ODO — infoga eller dra om resor var som
              helst i listan så flyttas alla senare resor automatiskt, utan att deras distanser
              ändras.{' '}
              <Typography component="span" variant="body2" fontWeight="bold" color="text.primary">
                Alla resor antas vara tur-och-retur med start från kontoret.
              </Typography>
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <CsvImportButton onImported={handleImported} />
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialogOpen(true)}
                disabled={entries.length === 0}
              >
                Exportera CSV
              </Button>
            </Stack>
          </Stack>

          <SummaryStats entries={computed} />

          <DriveLogTable
            entries={computed}
            issues={issues}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onInsertAt={handleInsertAt}
            onReorder={handleReorder}
          />
        </Stack>
      </Container>

      <EntryDialog
        open={dialogState !== null}
        onClose={handleDialogClose}
        onSave={handleSave}
        initial={dialogInitial}
        startOdo={dialogStartOdo}
        isFirst={dialogIsFirst}
        defaultDate={dialogDefaultDate}
        existingEntries={entries}
      />

      <ExportCsvDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        generateCsv={() => exportDriveLogCsv({ baselineOdo, entries })}
        onDownloadFallback={handleDownloadFallback}
        onExported={handleExported}
      />

      <Dialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rensa hela körjournalen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Alla resor, den registrerade mätarställningen och hela historiken för ångra/gör om tas bort. Det
            här går inte att ångra.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setClearConfirmOpen(false)} color="inherit">
            Avbryt
          </Button>
          <Button onClick={handleClearAll} variant="contained" color="error">
            Rensa allt
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
