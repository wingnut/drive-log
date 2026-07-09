import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import ReasonAutocomplete from './ReasonAutocomplete'
import type { DriveLogEntry } from '../types'

export interface EntrySavePayload {
  date: string
  distance: number
  reason: string
  /** Only meaningful when `isFirst` — a new baseline odometer value. */
  startOdoOverride?: number
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: EntrySavePayload) => void
  /** Existing entry when editing, undefined when adding a new one. */
  initial?: DriveLogEntry
  /** This row's Start ODO as derived from the current chain — fixed and
   *  read-only unless `isFirst` is true. */
  startOdo: number
  /** True when this row sits at position 0 in the sequence, i.e. it has
   *  no predecessor, so its Start ODO is the log's editable baseline. */
  isFirst: boolean
}

export default function EntryDialog({ open, onClose, onSave, initial, startOdo, isFirst }: Props) {
  const isEdit = Boolean(initial)

  const [date, setDate] = useState('')
  const [startOdoStr, setStartOdoStr] = useState('')
  const [distanceStr, setDistanceStr] = useState('')
  const [stopOdoStr, setStopOdoStr] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    const initialDistance = initial?.distance ?? 0
    setDate(initial?.date ?? new Date().toISOString().slice(0, 10))
    setStartOdoStr(String(startOdo))
    setDistanceStr(initial ? String(initialDistance) : '')
    setStopOdoStr(initial ? String(startOdo + initialDistance) : String(startOdo))
    setReason(initial?.reason ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, startOdo])

  const effectiveStartOdo = isFirst ? Number(startOdoStr) : startOdo
  const startOdoValid = !Number.isNaN(effectiveStartOdo)

  const handleStartOdoChange = (value: string) => {
    setStartOdoStr(value)
    const newStart = Number(value)
    const distance = Number(distanceStr)
    if (!Number.isNaN(newStart) && !Number.isNaN(distance)) {
      // Keep this row's own distance fixed; Stop ODO follows the new start.
      setStopOdoStr(String(newStart + distance))
    }
  }

  const handleDistanceChange = (value: string) => {
    setDistanceStr(value)
    const distance = Number(value)
    if (!Number.isNaN(distance) && startOdoValid) {
      setStopOdoStr(String(effectiveStartOdo + distance))
    }
  }

  const handleStopOdoChange = (value: string) => {
    setStopOdoStr(value)
    const stop = Number(value)
    if (!Number.isNaN(stop) && startOdoValid) {
      setDistanceStr(String(stop - effectiveStartOdo))
    }
  }

  const distanceNum = Number(distanceStr)
  const errors = {
    date: !date,
    startOdo: isFirst && (startOdoStr === '' || Number.isNaN(effectiveStartOdo)),
    distance: distanceStr === '' || Number.isNaN(distanceNum) || distanceNum < 0,
    reason: !reason.trim(),
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const handleSave = () => {
    if (hasErrors) return
    onSave({
      date,
      distance: distanceNum,
      reason: reason.trim(),
      startOdoOverride: isFirst ? effectiveStartOdo : undefined,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Redigera resa' : 'Lägg till resa'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Datum"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Start ODO"
            type="number"
            value={startOdoStr}
            onChange={(e) => handleStartOdoChange(e.target.value)}
            error={errors.startOdo}
            disabled={!isFirst}
            helperText={
              isFirst
                ? 'Ingen föregående resa — detta blir loggens startvärde.'
                : 'Länkad till föregående resas Stop ODO, kan inte redigeras direkt.'
            }
            InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Distans"
              type="number"
              value={distanceStr}
              onChange={(e) => handleDistanceChange(e.target.value)}
              error={errors.distance}
              helperText="Ange distans eller Stop ODO — de hänger ihop"
              InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }}
              fullWidth
            />
            <TextField
              label="Stop ODO"
              type="number"
              value={stopOdoStr}
              onChange={(e) => handleStopOdoChange(e.target.value)}
              error={errors.distance}
              helperText="Mätarställning vid slut"
              InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }}
              fullWidth
            />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Alla resor efter denna i listan flyttas automatiskt så att deras Start ODO fortsätter
            följa denna resas Stop ODO — deras egna distanser ändras inte.
          </Typography>

          <ReasonAutocomplete
            value={reason}
            onChange={setReason}
            error={errors.reason}
            helperText={errors.reason ? 'Ange en anledning för resan' : undefined}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Avbryt
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={hasErrors}>
          Spara
        </Button>
      </DialogActions>
    </Dialog>
  )
}
