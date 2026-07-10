import Papa from 'papaparse'
import type { ComputedEntry, DriveLog, DriveLogEntry } from '../types'
import { computeChain } from './chain'

let idCounter = 0
/** Generates a reasonably unique id without pulling in a uuid dependency. */
export function makeId(): string {
  idCounter += 1
  return `${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`
}

export interface CsvImportResult {
  /** Start ODO of the first imported row — only meaningful if importing
   *  into an empty log; ignored otherwise (the import just continues the
   *  existing chain). */
  baselineOdo: number
  entries: DriveLogEntry[]
  warnings: string[]
}

function parseNumber(raw: string, field: string, rowNum: number, warnings: string[]): number {
  const cleaned = raw.trim().replace(',', '.').replace(/\s/g, '')
  const value = Number(cleaned)
  if (Number.isNaN(value)) {
    warnings.push(`Rad ${rowNum}: kunde inte tolka "${field}" ("${raw}") som ett tal, satte 0.`)
    return 0
  }
  return value
}

function parseDate(raw: string, rowNum: number, warnings: string[]): string {
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const asDate = new Date(trimmed)
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().slice(0, 10)
  }
  warnings.push(`Rad ${rowNum}: kunde inte tolka datumet "${raw}", behöll originalvärdet.`)
  return trimmed
}

/**
 * Parses a CSV with columns: Date, Start ODO, Distance, Stop ODO, Reason.
 *
 * Each row's own distance is recomputed as Stop ODO - Start ODO (the file's
 * Distance column is only used to sanity-check, with a warning on
 * mismatch). The file's Start ODO column is otherwise only trusted for row
 * 1, which becomes the log's baseline — from row 2 onward, Start ODO is
 * expected to equal the previous row's Stop ODO, and a warning is raised
 * if it doesn't (that row's own distance is still kept correct; only the
 * *gap* between rows is being flagged, not silently trusted).
 */
export function parseDriveLogCsv(csvText: string): CsvImportResult {
  const warnings: string[] = []
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      warnings.push(`CSV-tolkningsfel på rad ${err.row ?? '?'}: ${err.message}`)
    }
  }

  let previousRawStop: number | null = null
  const entries: DriveLogEntry[] = result.data.map((row, idx) => {
    const rowNum = idx + 2 // account for header row, 1-indexed
    const date = parseDate(row['Date'] ?? '', rowNum, warnings)
    const startOdo = parseNumber(row['Start ODO'] ?? '', 'Start ODO', rowNum, warnings)
    const stopOdo = parseNumber(row['Stop ODO'] ?? '', 'Stop ODO', rowNum, warnings)
    const declaredDistance =
      row['Distance'] !== undefined && row['Distance'] !== ''
        ? parseNumber(row['Distance'], 'Distance', rowNum, warnings)
        : null
    const distance = stopOdo - startOdo

    if (declaredDistance !== null && Math.abs(declaredDistance - distance) > 0.01) {
      warnings.push(
        `Rad ${rowNum}: angiven Distance (${declaredDistance}) matchar inte Stop ODO - Start ODO (${distance}). Beräknat värde används.`,
      )
    }
    if (previousRawStop !== null && startOdo !== previousRawStop) {
      warnings.push(
        `Rad ${rowNum}: Start ODO (${startOdo}) matchade inte föregående rads Stop ODO (${previousRawStop}) i filen. Resans egen distans (${distance} km) importerades ändå; kedjan byggs om automatiskt.`,
      )
    }
    previousRawStop = stopOdo

    return {
      id: makeId(),
      date,
      distance,
      reason: (row['Reason'] ?? '').trim(),
    }
  })

  const baselineOdo =
    result.data.length > 0
      ? parseNumber(result.data[0]['Start ODO'] ?? '0', 'Start ODO', 2, [])
      : 0

  return { baselineOdo, entries, warnings }
}

/**
 * Finds where a date belongs in an (assumed date-ordered) list of
 * entries: the position right after the last entry whose date is <=
 * the given date. Ties resolve to "after" — so a new row sharing a
 * date with an existing row is inserted below it, never above.
 */
function insertionIndexByDate(ordered: DriveLogEntry[], date: string): number {
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].date <= date) return i + 1
  }
  return 0
}

/**
 * Merges freshly-imported rows into the existing log in date order.
 * The incoming batch is stable-sorted by date first (preserving the
 * file's own row order for same-dated trips), then each row is
 * inserted right after the last existing/already-inserted row sharing
 * or preceding its date — so ties land below existing rows, and
 * multiple new rows for the same date keep their file order among
 * themselves. Only order changes; every row's own `distance` is
 * untouched, so the odometer chain (derived from `baselineOdo` +
 * order) simply recomputes for the new sequence — nothing about the
 * validation rules changes.
 */
export function mergeEntriesByDate(existing: DriveLogEntry[], imported: DriveLogEntry[]): DriveLogEntry[] {
  const incoming = [...imported].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const merged = [...existing]
  for (const entry of incoming) {
    merged.splice(insertionIndexByDate(merged, entry.date), 0, entry)
  }
  return merged
}
/** Serializes the log back into the required CSV shape, deriving
 *  Start ODO / Stop ODO from the baseline + each row's distance. */
export function exportDriveLogCsv(log: DriveLog): string {
  const computed: ComputedEntry[] = computeChain(log.baselineOdo, log.entries)
  const rows = computed.map((e) => ({
    Date: e.date,
    'Start ODO': e.startOdo,
    Distance: e.distance,
    'Stop ODO': e.stopOdo,
    Reason: e.reason,
  }))
  return Papa.unparse(rows, { columns: ['Date', 'Start ODO', 'Distance', 'Stop ODO', 'Reason'] })
}

export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
