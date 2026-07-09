import type { ComputedEntry, DriveLogEntry, EntryIssue } from '../types'

/**
 * Walks the log in order, deriving each entry's Start/Stop ODO from the
 * baseline plus every preceding entry's distance. This is the only place
 * Start/Stop ODO ever get computed — nothing else in the app stores them,
 * so a broken chain simply isn't representable.
 */
export function computeChain(baselineOdo: number, entries: DriveLogEntry[]): ComputedEntry[] {
  let running = baselineOdo
  return entries.map((entry) => {
    const startOdo = running
    const stopOdo = startOdo + entry.distance
    running = stopOdo
    return { ...entry, startOdo, stopOdo }
  })
}

/**
 * Flags rows with a negative distance (Stop ODO would be below Start
 * ODO), a missing reason, or a date that's earlier than the previous
 * row's date (a soft warning — logs are usually chronological, but
 * order in the list is what actually drives the odometer chain, not
 * the date field, so this never blocks anything).
 */
export function validateEntries(computed: ComputedEntry[]): Map<string, EntryIssue[]> {
  const issues = new Map<string, EntryIssue[]>()
  const push = (id: string, issue: EntryIssue) => {
    const list = issues.get(id) ?? []
    list.push(issue)
    issues.set(id, list)
  }

  computed.forEach((entry, idx) => {
    if (entry.distance < 0) {
      push(entry.id, {
        id: entry.id,
        severity: 'error',
        message: 'Negativ distans: Stop ODO skulle hamna under Start ODO.',
      })
    }
    if (!entry.reason.trim()) {
      push(entry.id, {
        id: entry.id,
        severity: 'warning',
        message: 'Anledning saknas.',
      })
    }
    if (idx > 0 && entry.date < computed[idx - 1].date) {
      push(entry.id, {
        id: entry.id,
        severity: 'warning',
        message: 'Datumet är tidigare än föregående resas datum i listan.',
      })
    }
  })

  return issues
}
