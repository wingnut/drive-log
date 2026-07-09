import type { DriveLogEntry } from '../types'

const STORAGE_KEY = 'korjournal.entries.v1'

export function loadEntries(): DriveLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as DriveLogEntry[]
  } catch {
    return []
  }
}

export function saveEntries(entries: DriveLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage can fail (quota, private mode) — the in-memory state still
    // works for the current session, so we don't surface this as fatal.
  }
}
