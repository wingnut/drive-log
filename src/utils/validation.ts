import type { DriveLogEntry, EntryIssue } from '../types'

/** Sorts entries chronologically; ties broken by starting odometer so the
 *  chain check below has a stable, meaningful order to walk through. */
export function sortEntries(entries: DriveLogEntry[]): DriveLogEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return a.startOdo - b.startOdo
  })
}

/**
 * Walks the chronological log and flags:
 *  - a trip whose Start ODO doesn't match the previous trip's Stop ODO
 *  - a trip whose Stop ODO is lower than its Start ODO
 *  - a trip with no reason filled in
 * Returns issues keyed by entry id so the table can highlight the exact row.
 */
export function validateChain(entries: DriveLogEntry[]): Map<string, EntryIssue[]> {
  const sorted = sortEntries(entries)
  const issues = new Map<string, EntryIssue[]>()

  const pushIssue = (id: string, issue: EntryIssue) => {
    const list = issues.get(id) ?? []
    list.push(issue)
    issues.set(id, list)
  }

  sorted.forEach((entry, idx) => {
    if (entry.stopOdo < entry.startOdo) {
      pushIssue(entry.id, {
        id: entry.id,
        severity: 'error',
        message: 'Stop ODO är lägre än Start ODO.',
      })
    }
    if (!entry.reason.trim()) {
      pushIssue(entry.id, {
        id: entry.id,
        severity: 'warning',
        message: 'Anledning saknas.',
      })
    }
    if (idx > 0) {
      const prev = sorted[idx - 1]
      if (entry.startOdo !== prev.stopOdo) {
        pushIssue(entry.id, {
          id: entry.id,
          severity: 'error',
          message: `Start ODO (${entry.startOdo}) matchar inte föregående resas Stop ODO (${prev.stopOdo}).`,
        })
      }
    }
  })

  return issues
}

/** The Stop ODO of the chronologically last trip, used to prefill the
 *  Start ODO of a new entry. */
export function suggestNextStartOdo(entries: DriveLogEntry[]): number | null {
  if (entries.length === 0) return null
  const sorted = sortEntries(entries)
  return sorted[sorted.length - 1].stopOdo
}
