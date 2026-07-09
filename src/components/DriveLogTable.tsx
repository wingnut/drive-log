import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAddOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import type { ComputedEntry, EntryIssue } from '../types'

interface Props {
  entries: ComputedEntry[]
  issues: Map<string, EntryIssue[]>
  onEdit: (entry: ComputedEntry) => void
  onDelete: (id: string) => void
  /** Insert a new, blank row above the row currently at `index`. */
  onInsertAt: (index: number) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('sv-SE')
}

export default function DriveLogTable({ entries, issues, onEdit, onDelete, onInsertAt }: Props) {
  if (entries.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Ingen körjournal ännu. Importera en CSV-fil eller lägg till en resa för att komma igång.
        </Typography>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Datum</TableCell>
            <TableCell align="right">Start ODO</TableCell>
            <TableCell align="right">Stop ODO</TableCell>
            <TableCell align="right">Distans</TableCell>
            <TableCell>Anledning</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="right">Åtgärder</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry, index) => {
            const entryIssues = issues.get(entry.id) ?? []
            const hasError = entryIssues.some((i) => i.severity === 'error')
            const hasWarning = entryIssues.some((i) => i.severity === 'warning')
            return (
              <TableRow
                key={entry.id}
                sx={{
                  backgroundColor: hasError
                    ? 'rgba(162,59,46,0.06)'
                    : hasWarning
                    ? 'rgba(199,123,30,0.06)'
                    : undefined,
                }}
              >
                <TableCell>{formatDate(entry.date)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                  {entry.startOdo.toLocaleString('sv-SE')}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                  {entry.stopOdo.toLocaleString('sv-SE')}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: '"Roboto Mono", monospace' }}>
                  {entry.distance.toLocaleString('sv-SE')} km
                </TableCell>
                <TableCell>{entry.reason || <em>—</em>}</TableCell>
                <TableCell align="center">
                  {entryIssues.length === 0 ? (
                    <Chip size="small" label="OK" color="success" variant="outlined" />
                  ) : (
                    <Tooltip title={entryIssues.map((i) => i.message).join(' ')}>
                      <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                        {hasError ? (
                          <ErrorOutlineIcon fontSize="small" color="error" />
                        ) : (
                          <WarningAmberIcon fontSize="small" color="warning" />
                        )}
                      </Stack>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Infoga resa ovanför">
                    <IconButton size="small" onClick={() => onInsertAt(index)} aria-label="Infoga resa ovanför">
                      <PlaylistAddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => onEdit(entry)} aria-label="Redigera">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(entry.id)} aria-label="Ta bort">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
