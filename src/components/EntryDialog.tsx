import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import ReasonAutocomplete from './ReasonAutocomplete'
import type { DriveLogEntry } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (entry: DriveLogEntry) => void
  /** Existing entry when editing, undefined when adding a new one. */
  initial?: DriveLogEntry
  /** Stop ODO of the chronologically previous trip, used to prefill /
   *  sanity-check Start ODO for a brand new entry. */
  expectedStartOdo: number | null
  /** id to generate for a brand new entry. */
  makeId: () => string
}

export default function EntryDialog({
  open,
  onClose,
  onSave,
  initial,
  expectedStartOdo,
  makeId,
}: Props) {
  const isEdit = Boolean(initial)

  const [date, setDate] = useState('')
  const [startOdo, setStartOdo] = useState('')
  const [stopOdo, setStopOdo] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setDate(initial.date)
      setStartOdo(String(initial.startOdo))
      setStopOdo(String(initial.stopOdo))
      setReason(initial.reason)
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setDate(today)
      setStartOdo(expectedStartOdo !== null ? String(expectedStartOdo) : '')
      setStopOdo('')
      setReason('')
    }
  }, [open, initial, expectedStartOdo])

  const startOdoNum = Number(startOdo)
  const stopOdoNum = Number(stopOdo)
  const distance = useMemo(() => {
    if (Number.isNaN(startOdoNum) || Number.isNaN(stopOdoNum)) return null
    return stopOdoNum - startOdoNum
  }, [startOdoNum, stopOdoNum])

  const startOdoMismatch =
    !isEdit && expectedStartOdo !== null && startOdo !== '' && startOdoNum !== expectedStartOdo

  const errors = {
    date: !date,
    startOdo: startOdo === '' || Number.isNaN(startOdoNum),
    stopOdo:
      stopOdo === '' || Number.isNaN(stopOdoNum) || (distance !== null && distance < 0),
    reason: !reason.trim(),
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const handleSave = () => {
    if (hasErrors) return
    onSave({
      id: initial?.id ?? makeId(),
      date,
      startOdo: startOdoNum,
      stopOdo: stopOdoNum,
      distance: distance ?? 0,
      reason: reason.trim(),
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
          <Stack direction="row" spacing={2}>
            <TextField
              label="Start ODO"
              type="number"
              value={startOdo}
              onChange={(e) => setStartOdo(e.target.value)}
              error={errors.startOdo}
              helperText={
                startOdoMismatch
                  ? `Föregående resas Stop ODO var ${expectedStartOdo}`
                  : 'Mätarställning vid start'
              }
              InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }}
              fullWidth
            />
            <TextField
              label="Stop ODO"
              type="number"
              value={stopOdo}
              onChange={(e) => setStopOdo(e.target.value)}
              error={errors.stopOdo}
              helperText="Mätarställning vid slut"
              InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }}
              fullWidth
            />
          </Stack>

          {startOdoMismatch && (
            <Alert severity="warning">
              Start ODO stämmer inte med föregående resas Stop ODO ({expectedStartOdo} km).
              Kontrollera att inget saknas i journalen.
            </Alert>
          )}

          <Typography variant="subtitle2" color="text.secondary">
            Beräknad distans: {distance !== null && distance >= 0 ? `${distance} km` : '—'}
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
