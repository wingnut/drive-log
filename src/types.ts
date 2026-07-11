/**
 * A single trip entry in the drive log (körjournal).
 *
 * Design: `distance` is the one piece of odometer data a row actually
 * "owns" — it's what really happened on that trip, and it stays fixed
 * across edits elsewhere in the log. Start ODO and Stop ODO are never
 * stored; they're always derived by walking the whole sequence from a
 * single baseline odometer reading, so a row's Start ODO is
 * *structurally* equal to the previous row's Stop ODO — it can't drift
 * out of sync. Inserting, deleting, or reordering a trip, or editing an
 * earlier trip's distance, automatically shifts every later trip's
 * Start/Stop ODO — without changing their own recorded distances.
 */
export interface DriveLogEntry {
  /** Stable client-side id, not persisted to CSV. */
  id: string
  /** ISO date string (yyyy-mm-dd). */
  date: string
  /** Distance travelled (km) on this trip. The source of truth —
   *  Start ODO / Stop ODO are derived from this plus the log baseline. */
  distance: number
  /** Free-text business reason for the trip (from a dropdown of
   *  common reasons, but editable). */
  reason: string
}

/** A DriveLogEntry with its Start/Stop ODO filled in, derived from the
 *  log's baseline odometer and the cumulative distance of every entry
 *  before it in sequence. */
export interface ComputedEntry extends DriveLogEntry {
  startOdo: number
  stopOdo: number
}

/** The whole persisted state: where the odometer chain starts, plus
 *  the ordered list of trips. Order in `entries` *is* chronological/
 *  chain order — it's what "insert a row here" inserts into. */
export interface DriveLog {
  baselineOdo: number
  entries: DriveLogEntry[]
}

/** A validation problem attached to a specific entry. */
export interface EntryIssue {
  id: string
  severity: 'error' | 'warning'
  message: string
}

export const REQUIRED_CSV_COLUMNS = [
  'Date',
  'Start ODO',
  'Distance',
  'Stop ODO',
  'Reason',
] as const
