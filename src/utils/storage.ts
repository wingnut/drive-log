import type { DriveLog } from '../types'

const STORAGE_KEY = 'korjournal.log.v2'

/** The log's blank slate — used both as the fallback when nothing is
 * stored yet, and as the target state for "Rensa allt" (Clear all). */
export const EMPTY_LOG: DriveLog = { baselineOdo: 0, entries: [] }

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

/** Removes the persisted log entirely (as opposed to `saveLog(EMPTY_LOG)`,
 * which would still leave a record behind) — used by "Rensa allt" so the
 * reset genuinely matches clearing the app's storage. */
export function clearLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Same as above — non-fatal if storage is unavailable.
  }
}
