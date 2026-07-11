import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
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
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import type { ComputedEntry, EntryIssue } from '../types'

const COLUMN_COUNT = 8

interface Props {
  entries: ComputedEntry[]
  issues: Map<string, EntryIssue[]>
  onEdit: (entry: ComputedEntry) => void
  onDelete: (id: string) => void
  /** Insert a new, blank row at `index` in the entries array (index ===
   *  entries.length means "append after the last row"). `anchorDate`
   *  is the neighboring trip's date the new row should be prefilled
   *  with, so it lands in the right place in the date order. */
  onInsertAt: (index: number, anchorDate?: string) => void
  /** Move the row currently at `from` so it ends up immediately before
   *  the row currently at `to` (or, when `to === entries.length`, to
   *  the very end of the log). */
  onReorder: (from: number, to: number) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('sv-SE')
}

/** One half (top or bottom) of a row's Date cell. Hovering it reveals
 *  a thin "insert here" control right above or below the date shown
 *  in that cell — making it obvious both where the new row will go
 *  (above vs. below this trip) and which date it'll default to (this
 *  row's own date, since that's the row you're hovering). */
function InsertZone({
  position,
  index,
  anchorDate,
  onInsertAt,
}: {
  position: 'top' | 'bottom'
  index: number
  anchorDate: string
  onInsertAt: (index: number, anchorDate?: string) => void
}) {
  const label = position === 'top' ? 'Infoga resa ovanför' : 'Infoga resa nedanför'
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: '50%',
        [position]: 0,
        display: 'flex',
        alignItems: position === 'top' ? 'flex-start' : 'flex-end',
        '&:hover .insert-zone-content': { opacity: 1 },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        className="insert-zone-content"
        sx={{
          width: '100%',
          opacity: 0,
          transition: 'opacity 120ms ease',
          pointerEvents: 'none',
        }}
      >
        <Tooltip title={label} placement={position === 'top' ? 'top' : 'bottom'}>
          <IconButton
            size="small"
            onClick={() => onInsertAt(index, anchorDate)}
            aria-label={label}
            sx={{
              pointerEvents: 'auto',
              p: '1px',
              border: '1px solid',
              borderColor: 'primary.main',
              color: 'primary.main',
              backgroundColor: 'background.paper',
              '&:hover': { backgroundColor: 'primary.main', color: 'primary.contrastText' },
            }}
          >
            <AddIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, borderTop: '1px dashed', borderColor: 'primary.main' }} />
      </Stack>
    </Box>
  )
}

export default function DriveLogTable({ entries, issues, onEdit, onDelete, onInsertAt, onReorder }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; entry: ComputedEntry } | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  if (entries.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Typography color="text.secondary">
            Ingen körjournal ännu. Importera en CSV-fil eller lägg till en resa för att komma igång.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => onInsertAt(0)}>
            Lägg till resa
          </Button>
        </Stack>
      </Paper>
    )
  }

  // Group consecutive rows that share the same date so it's visually
  // obvious they belong together: alternate a subtle background tint
  // per date (like banded rows, but keyed to the date rather than the
  // row index), and drop the border between rows within the same
  // group so they read as one block, with the divider reserved for
  // where the date actually changes.
  const groupParities: number[] = []
  {
    let parity = 0
    let previousDate: string | null = null
    for (const entry of entries) {
      if (previousDate !== null && entry.date !== previousDate) {
        parity = parity === 0 ? 1 : 0
      }
      groupParities.push(parity)
      previousDate = entry.date
    }
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number, id: string) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    const rowEl = rowRefs.current[id]
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect()
      e.dataTransfer.setDragImage(rowEl, e.clientX - rect.left, e.clientY - rect.top)
    }
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragOverRow = (e: DragEvent<HTMLTableRowElement>, index: number) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overIndex !== index) setOverIndex(index)
  }

  const handleDropRow = (e: DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault()
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) onReorder(from, index)
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragOverEnd = (e: DragEvent<HTMLTableRowElement>) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overIndex !== entries.length) setOverIndex(entries.length)
  }

  const handleDropEnd = (e: DragEvent<HTMLTableRowElement>) => {
    e.preventDefault()
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) onReorder(from, entries.length)
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table
        size="small"
        sx={{
          '& .log-row:hover .row-hover-only': { opacity: 1 },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 36, p: 0 }} />
            <TableCell>Datum</TableCell>
            <TableCell align="right">Start ODO</TableCell>
            <TableCell align="right">Stop ODO</TableCell>
            <TableCell align="right">Distans</TableCell>
            <TableCell>Anledning</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="right" sx={{ width: 44 }}>
              Åtgärder
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry, index) => {
            const entryIssues = issues.get(entry.id) ?? []
            const hasError = entryIssues.some((i) => i.severity === 'error')
            const hasWarning = entryIssues.some((i) => i.severity === 'warning')
            const isMenuOpenForRow = menuState?.entry.id === entry.id
            const isDropTarget = overIndex === index && dragIndex !== null && dragIndex !== index
            const isLastInGroup = index === entries.length - 1 || entries[index + 1].date !== entry.date
            const groupBg = groupParities[index] === 1 ? 'rgba(31,58,82,0.05)' : 'transparent'
            // Cells within a same-date group share this border override
            // so the divider only shows where the date actually changes.
            // Always a plain object (never undefined) — MUI's `sx` type
            // only accepts undefined/boolean as *array* elements, not as
            // a bare value, and this gets used both ways below.
            const groupBorderSx = isLastInGroup ? {} : { borderBottom: 'none' }

            return (
              <TableRow
                key={entry.id}
                ref={(el) => {
                  rowRefs.current[entry.id] = el
                }}
                className="log-row"
                onDragOver={(e) => handleDragOverRow(e, index)}
                onDrop={(e) => handleDropRow(e, index)}
                sx={[
                  {
                    backgroundColor: hasError
                      ? 'rgba(162,59,46,0.06)'
                      : hasWarning
                      ? 'rgba(199,123,30,0.06)'
                      : groupBg,
                    opacity: dragIndex === index ? 0.4 : 1,
                  },
                  isDropTarget &&
                    ((theme) => ({ boxShadow: `inset 0 2px 0 0 ${theme.palette.primary.main}` })),
                ]}
              >
                <TableCell sx={[{ width: 36, p: 0 }, groupBorderSx]}>
                  <Tooltip title="Dra för att ändra ordning" placement="top">
                    <Box
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, entry.id)}
                      onDragEnd={handleDragEnd}
                      className="row-hover-only"
                      aria-label="Dra för att ändra ordning"
                      sx={{
                        opacity: 0,
                        transition: 'opacity 120ms ease',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                        '&:active': { cursor: 'grabbing' },
                      }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell sx={[{ position: 'relative' }, groupBorderSx]}>
                  <InsertZone position="top" index={index} anchorDate={entry.date} onInsertAt={onInsertAt} />
                  <Box sx={{ minHeight: 26, display: 'flex', alignItems: 'center' }}>{formatDate(entry.date)}</Box>
                  <InsertZone position="bottom" index={index + 1} anchorDate={entry.date} onInsertAt={onInsertAt} />
                </TableCell>
                <TableCell align="right" sx={[{ fontFamily: '"Roboto Mono", monospace' }, groupBorderSx]}>
                  {entry.startOdo.toLocaleString('sv-SE')}
                </TableCell>
                <TableCell align="right" sx={[{ fontFamily: '"Roboto Mono", monospace' }, groupBorderSx]}>
                  {entry.stopOdo.toLocaleString('sv-SE')}
                </TableCell>
                <TableCell align="right" sx={[{ fontFamily: '"Roboto Mono", monospace' }, groupBorderSx]}>
                  {entry.distance.toLocaleString('sv-SE')} km
                </TableCell>
                <TableCell sx={groupBorderSx}>{entry.reason || <em>—</em>}</TableCell>
                <TableCell align="center" sx={groupBorderSx}>
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
                <TableCell align="right" sx={groupBorderSx}>
                  <IconButton
                    size="small"
                    className="row-hover-only"
                    aria-label="Fler åtgärder"
                    onClick={(e) => setMenuState({ anchorEl: e.currentTarget, entry })}
                    sx={[{ opacity: 0, transition: 'opacity 120ms ease' }, isMenuOpenForRow && { opacity: 1 }]}
                  >
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
          {dragIndex !== null && (
            <TableRow onDragOver={handleDragOverEnd} onDrop={handleDropEnd}>
              <TableCell
                colSpan={COLUMN_COUNT}
                sx={[
                  {
                    height: 24,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 12,
                    borderTop: '1px dashed',
                    borderTopColor: 'primary.main',
                  },
                  overIndex === entries.length &&
                    ((theme) => ({ boxShadow: `inset 0 2px 0 0 ${theme.palette.primary.main}` })),
                ]}
              >
                Släpp här för att flytta resan sist
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Menu anchorEl={menuState?.anchorEl ?? null} open={Boolean(menuState)} onClose={() => setMenuState(null)}>
        <MenuItem
          onClick={() => {
            if (menuState) onEdit(menuState.entry)
            setMenuState(null)
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Redigera</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuState) onDelete(menuState.entry.id)
            setMenuState(null)
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ta bort</ListItemText>
        </MenuItem>
      </Menu>
    </TableContainer>
  )
}
