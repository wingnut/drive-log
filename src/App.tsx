import { useEffect, useMemo, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCarFilledOutlined'
import AddIcon from '@mui/icons-material/Add'
import DownloadIcon from '@mui/icons-material/DownloadOutlined'

import DriveLogTable from './components/DriveLogTable'
import SummaryStats from './components/SummaryStats'
import CsvImportButton from './components/CsvImportButton'
import EntryDialog, { type EntrySavePayload } from './components/EntryDialog'
import type { ComputedEntry, DriveLogEntry } from './types'
import { computeChain, validateEntries } from './utils/chain'
import { exportDriveLogCsv, downloadCsv, makeId } from './utils/csv'
import { loadLog, saveLog } from './utils/storage'

/** Which entry the dialog is currently open for: inserting a brand new
 *  row at a given position, or editing an existing one by id. */
type DialogState = { mode: 'add'; index: number } | { mode: 'edit'; id: string } | null

export default function App() {
  const initialLog = useMemo(() => loadLog(), [])
  const [baselineOdo, setBaselineOdo] = useState<number>(initialLog.baselineOdo)
  const [entries, setEntries] = useState<DriveLogEntry[]>(initialLog.entries)
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'warning' | 'error' } | null>(
    null,
  )

  useEffect(() => {
    saveLog({ baselineOdo, entries })
  }, [baselineOdo, entries])

  // The single place Start ODO / Stop ODO get derived. Everything below
  // — the table, the summary, validation, the dialog's starting point —
  // reads from this instead of trusting any stored odometer value.
  const computed = useMemo(() => computeChain(baselineOdo, entries), [baselineOdo, entries])
  const issues = useMemo(() => validateEntries(computed), [computed])
  const errorCount = useMemo(
    () => Array.from(issues.values()).flat().filter((i) => i.severity === 'error').length,
    [issues],
  )

  const handleAppend = () => setDialogState({ mode: 'add', index: entries.length })
  const handleInsertAt = (index: number) => setDialogState({ mode: 'add', index })
  const handleEditClick = (entry: ComputedEntry) => setDialogState({ mode: 'edit', id: entry.id })
  const handleDialogClose = () => setDialogState(null)

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
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
      setEntries((prev) => [
        ...prev.slice(0, dialogState.index),
        newEntry,
        ...prev.slice(dialogState.index),
      ])
      if (dialogState.index === 0 && payload.startOdoOverride !== undefined) {
        setBaselineOdo(payload.startOdoOverride)
      }
    } else {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === dialogState.id
            ? { ...e, date: payload.date, distance: payload.distance, reason: payload.reason }
            : e,
        ),
      )
      const idx = entries.findIndex((e) => e.id === dialogState.id)
      if (idx === 0 && payload.startOdoOverride !== undefined) {
        setBaselineOdo(payload.startOdoOverride)
      }
    }
  }

  const handleImported = (imported: DriveLogEntry[], importedBaseline: number, warnings: string[]) => {
    if (entries.length === 0) {
      setBaselineOdo(importedBaseline)
      setEntries(imported)
    } else {
      // Log already has rows: the imported trips are appended, and the
      // chain simply continues from the current last Stop ODO — the
      // CSV's own baseline is only meaningful for an empty log.
      setEntries((prev) => [...prev, ...imported])
    }
    if (warnings.length > 0) {
      setSnackbar({
        message: `Importerade ${imported.length} resor med ${warnings.length} varning(ar): ${warnings[0]}${
          warnings.length > 1 ? ` (+${warnings.length - 1} till)` : ''
        }`,
        severity: 'warning',
      })
    } else {
      setSnackbar({ message: `Importerade ${imported.length} resor.`, severity: 'success' })
    }
  }

  const handleExport = () => {
    const csv = exportDriveLogCsv({ baselineOdo, entries })
    downloadCsv(`korjournal-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  // Figure out what the dialog should show: the Start ODO this row has
  // (or will have), whether it's editable (only true for position 0),
  // and the existing entry data when editing.
  let dialogStartOdo = 0
  let dialogIsFirst = false
  let dialogInitial: DriveLogEntry | undefined

  if (dialogState?.mode === 'add') {
    dialogIsFirst = dialogState.index === 0
    dialogStartOdo = dialogState.index === 0 ? baselineOdo : computed[dialogState.index - 1].stopOdo
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
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Underlag för Skatteverket
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Typography variant="body2" color="text.secondary" maxWidth={560}>
              Registrera varje tjänsteresa med datum, mätarställning och anledning. Start ODO
              härleds alltid från föregående resas Stop ODO — infoga en resa var som helst i
              listan så flyttas alla senare resor automatiskt, utan att deras distanser ändras.
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <CsvImportButton onImported={handleImported} />
              <Button variant="outlined" color="inherit" startIcon={<DownloadIcon />} onClick={handleExport} disabled={entries.length === 0}>
                Exportera CSV
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAppend}>
                Lägg till resa
              </Button>
            </Stack>
          </Stack>

          <SummaryStats entries={computed} errorCount={errorCount} />

          <DriveLogTable
            entries={computed}
            issues={issues}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onInsertAt={handleInsertAt}
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
      />

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
