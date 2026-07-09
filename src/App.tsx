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
import EntryDialog from './components/EntryDialog'
import type { DriveLogEntry } from './types'
import { validateChain, suggestNextStartOdo } from './utils/validation'
import { exportDriveLogCsv, downloadCsv, makeId } from './utils/csv'
import { loadEntries, saveEntries } from './utils/storage'

export default function App() {
  const [entries, setEntries] = useState<DriveLogEntry[]>(() => loadEntries())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DriveLogEntry | undefined>(undefined)
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'warning' | 'error' } | null>(
    null,
  )

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const issues = useMemo(() => validateChain(entries), [entries])
  const errorCount = useMemo(
    () => Array.from(issues.values()).flat().filter((i) => i.severity === 'error').length,
    [issues],
  )

  const handleAddClick = () => {
    setEditingEntry(undefined)
    setDialogOpen(true)
  }

  const handleEditClick = (entry: DriveLogEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleSave = (entry: DriveLogEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id)
      return exists ? prev.map((e) => (e.id === entry.id ? entry : e)) : [...prev, entry]
    })
  }

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const handleImported = (imported: DriveLogEntry[], warnings: string[]) => {
    setEntries((prev) => [...prev, ...imported])
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
    const csv = exportDriveLogCsv(entries)
    downloadCsv(`korjournal-${new Date().toISOString().slice(0, 10)}.csv`, csv)
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
            <Typography variant="body2" color="text.secondary" maxWidth={520}>
              Registrera varje tjänsteresa med datum, mätarställning och anledning. Start ODO för en
              resa måste stämma med föregående resas Stop ODO.
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <CsvImportButton onImported={handleImported} />
              <Button variant="outlined" color="inherit" startIcon={<DownloadIcon />} onClick={handleExport} disabled={entries.length === 0}>
                Exportera CSV
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>
                Lägg till resa
              </Button>
            </Stack>
          </Stack>

          <SummaryStats entries={entries} errorCount={errorCount} />

          <DriveLogTable entries={entries} issues={issues} onEdit={handleEditClick} onDelete={handleDelete} />
        </Stack>
      </Container>

      <EntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        initial={editingEntry}
        expectedStartOdo={suggestNextStartOdo(entries)}
        makeId={makeId}
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
