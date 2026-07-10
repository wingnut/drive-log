import { useEffect, useMemo, useState } from 'react'
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
import { COMMON_REASONS } from '../types'

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
  /** Date to prefill for a brand new row — the neighboring trip's date
   *  it's being inserted next to, so the new row keeps the log's date
   *  order instead of defaulting to today. Ignored when editing.
   *  Undefined only for a genuinely empty log, where today is the only
   *  sensible fallback. */
  defaultDate?: string
  /** The rest of the log, used to (a) grow the Reason dropdown with
   *  values already in use and (b) guess a new row's reason from
   *  whichever existing trip has the closest matching distance —
   *  round trips to the same place tend to log the same distance. */
  existingEntries: DriveLogEntry[]
}

/** Distance (km) within which a match is considered close enough to
 *  suggest — beyond this it's more likely a coincidence than the same
 *  round trip. */
const DISTANCE_MATCH_TOLERANCE = 2

export default function EntryDialog({
  open,
  onClose,
  onSave,
  initial,
  startOdo,
  isFirst,
  defaultDate,
  existingEntries,
}: Props) {
  const isEdit = Boolean(initial)

  const [date, setDate] = useState('')
  const [startOdoStr, setStartOdoStr] = useState('')
  const [distanceStr, setDistanceStr] = useState('')
  const [stopOdoStr, setStopOdoStr] = useState('')
  const [reason, setReason] = useState('')
  // Tracks whether the current reason came from our own closest-distance
  // guess, so a subsequent distance edit can replace it — but the
  // moment the person types their own reason, we stop touching it.
  const [reasonWasGuessed, setReasonWasGuessed] = useState(false)

  useEffect(() => {
    if (!open) return
    const initialDistance = initial?.distance ?? 0
    setDate(initial?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10))
    setStartOdoStr(String(startOdo))
    setDistanceStr(initial ? String(initialDistance) : '')
    setStopOdoStr(initial ? String(startOdo + initialDistance) : String(startOdo))
    setReason(initial?.reason ?? '')
    setReasonWasGuessed(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, startOdo, defaultDate])

  // Reason dropdown: every reason already used in the log, plus the
  // built-in seed list for a log that's still empty/sparse — deduped
  // and alphabetised. Grows on its own as new reasons get saved,
  // nothing extra to persist.
  const reasonOptions = useMemo(() => {
    const used = existingEntries.map((e) => e.reason.trim()).filter(Boolean)
    return Array.from(new Set([...COMMON_REASONS, ...used])).sort((a, b) => a.localeCompare(b, 'sv'))
  }, [existingEntries])

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

    // Only guess on brand new rows, and only while the reason field is
    // either empty or still holding our own previous guess — the
    // moment the person edits it themselves we back off for good.
    if (isEdit || (!reasonWasGuessed && reason.trim() !== '')) return
    if (Number.isNaN(distance) || value.trim() === '') return

    let closest: DriveLogEntry | undefined
    let closestDiff = Infinity
    for (const entry of existingEntries) {
      const diff = Math.abs(entry.distance - distance)
      if (diff < closestDiff) {
        closestDiff = diff
        closest = entry
      }
    }
    if (closest && closestDiff <= DISTANCE_MATCH_TOLERANCE && closest.reason.trim()) {
      setReason(closest.reason)
      setReasonWasGuessed(true)
    }
  }

  const handleStopOdoChange = (value: string) => {
    setStopOdoStr(value)
    const stop = Number(value)
    if (!Number.isNaN(stop) && startOdoValid) {
      setDistanceStr(String(stop - effectiveStartOdo))
    }
  }

  const handleReasonChange = (value: string) => {
    setReason(value)
    setReasonWasGuessed(false)
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
            onChange={handleReasonChange}
            options={reasonOptions}
            error={errors.reason}
            helperText={
              errors.reason
                ? 'Ange en anledning för resan'
                : reasonWasGuessed
                ? 'Föreslagen utifrån en tidigare resa med liknande distans — ändra om det inte stämmer.'
                : undefined
            }
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
