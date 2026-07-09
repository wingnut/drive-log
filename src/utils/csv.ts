import Papa from 'papaparse'
import type { DriveLogEntry } from '../types'

let idCounter = 0
/** Generates a reasonably unique id without pulling in a uuid dependency. */
export function makeId(): string {
  idCounter += 1
  return `${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`
}

export interface CsvImportResult {
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
  // Accept yyyy-mm-dd directly; otherwise try to coerce via Date, else keep raw.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const asDate = new Date(trimmed)
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().slice(0, 10)
  }
  warnings.push(`Rad ${rowNum}: kunde inte tolka datumet "${raw}", behöll originalvärdet.`)
  return trimmed
}

/**
 * Parses a CSV string with columns: Date, Start ODO, Distance, Stop ODO, Reason.
 * Distance is recomputed from Start/Stop ODO rather than trusted verbatim,
 * and a warning is added if the file's own Distance column disagrees.
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

    return {
      id: makeId(),
      date,
      startOdo,
      stopOdo,
      distance,
      reason: (row['Reason'] ?? '').trim(),
    }
  })

  return { entries, warnings }
}

/** Serializes entries back into the required CSV shape. */
export function exportDriveLogCsv(entries: DriveLogEntry[]): string {
  const rows = entries.map((e) => ({
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
