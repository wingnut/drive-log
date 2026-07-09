import type { DriveLog } from '../types'

const STORAGE_KEY = 'korjournal.log.v2'

const EMPTY_LOG: DriveLog = { baselineOdo: 0, entries: [] }

export function loadLog(): DriveLog {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_LOG
    const parsed = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.baselineOdo !== 'number' ||
      !Array.isArray(parsed.entries)
    ) {
      return EMPTY_LOG
    }
    return parsed as DriveLog
  } catch {
    return EMPTY_LOG
  }
}

export function saveLog(log: DriveLog): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Storage can fail (quota, private mode) — the in-memory state still
    // works for the current session, so we don't surface this as fatal.
  }
}
