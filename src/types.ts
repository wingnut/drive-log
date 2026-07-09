/**
 * A single trip entry in the drive log (körjournal).
 *
 * The Skatteverket requirement this app is built around:
 * for every trip, record the date, the odometer at the start and end
 * of the trip, the resulting distance, and the business reason for
 * the trip. Consecutive trips must chain together: a trip's
 * `startOdo` must equal the previous trip's `stopOdo`, since the car
 * doesn't teleport between trips.
 */
export interface DriveLogEntry {
  /** Stable client-side id, not persisted to CSV. */
  id: string
  /** ISO date string (yyyy-mm-dd). */
  date: string
  /** Odometer reading (km) at the start of the trip. */
  startOdo: number
  /** Odometer reading (km) at the end of the trip. */
  stopOdo: number
  /** Distance travelled (km). Always stopOdo - startOdo; kept as its
   *  own field to mirror the required CSV column and to allow a
   *  mismatch to be surfaced if an imported file disagrees. */
  distance: number
  /** Free-text business reason for the trip (from a dropdown of
   *  common reasons, but editable). */
  reason: string
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

/** Commonly used Skatteverket-style business trip reasons. Presented
 * as a dropdown, but the field always stays free-text/editable. */
export const COMMON_REASONS = [
  'Kundbesök',
  'Möte hos leverantör',
  'Tjänsteärende',
  'Konferens/utbildning',
  'Transport av material/utrustning',
  'Besök på kontor/filial',
  'Upphämtning/leverans',
  'Site-besök',
]
