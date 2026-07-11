// Thin wrapper around the browser File System Access API. Kept as local
// structural types (rather than augmenting the global `Window`/lib.dom
// types) so this compiles regardless of the project's configured DOM
// lib version — we only rely on the shapes we actually use.

interface FSWritableStream {
  write(data: string): Promise<void>
  close(): Promise<void>
}

interface FSFileHandle {
  readonly name: string
  createWritable(): Promise<FSWritableStream>
}

type FSPermissionMode = { mode?: 'read' | 'readwrite' }

interface FSDirectoryHandle {
  readonly name: string
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FSFileHandle>
  queryPermission?(options?: FSPermissionMode): Promise<PermissionState>
  requestPermission?(options?: FSPermissionMode): Promise<PermissionState>
}

type ShowDirectoryPicker = (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FSDirectoryHandle>

function getDirectoryPicker(): ShowDirectoryPicker | undefined {
  return (window as unknown as { showDirectoryPicker?: ShowDirectoryPicker }).showDirectoryPicker
}

/** True in Chromium-based browsers (Chrome, Edge, Opera); false in
 *  Safari and Firefox, which don't implement the File System Access
 *  API — callers should fall back to a plain download in that case. */
export function isFileSystemAccessSupported(): boolean {
  return typeof getDirectoryPicker() === 'function'
}

// --- Remembering the chosen folder across sessions -------------------
// Directory handles aren't JSON-serializable, so localStorage won't do —
// they need IndexedDB, which supports storing them directly.

const DB_NAME = 'korjournal-fs-access'
const STORE_NAME = 'handles'
const DIR_HANDLE_KEY = 'exportDirectory'

function openHandleStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<FSDirectoryHandle | undefined> {
  const db = await openHandleStore()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as FSDirectoryHandle | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: FSDirectoryHandle): Promise<void> {
  const db = await openHandleStore()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Browsers require re-confirming access to a remembered folder handle
 *  each session (a security measure, not something we can bypass) —
 *  this silently checks first and only prompts if actually needed. */
async function ensureReadWritePermission(handle: FSDirectoryHandle): Promise<boolean> {
  const opts: FSPermissionMode = { mode: 'readwrite' }
  if (handle.queryPermission) {
    const status = await handle.queryPermission(opts)
    if (status === 'granted') return true
  }
  if (handle.requestPermission) {
    return (await handle.requestPermission(opts)) === 'granted'
  }
  // No permission API at all on this handle — assume it's fine, since
  // getFileHandle()/createWritable() will fail loudly later if not.
  return true
}

/** Opens the native "choose a folder" dialog and remembers the choice
 *  for next time. Returns undefined if the user cancels or the API
 *  isn't supported. */
export async function pickExportDirectory(): Promise<FSDirectoryHandle | undefined> {
  const picker = getDirectoryPicker()
  if (!picker) return undefined
  try {
    const handle = await picker({ id: 'korjournal-export', mode: 'readwrite' })
    await idbSet(DIR_HANDLE_KEY, handle)
    return handle
  } catch {
    // AbortError when the user cancels the picker — not an error worth
    // surfacing.
    return undefined
  }
}

/** The previously-chosen folder, if any, re-verified for permission.
 *  Returns undefined if nothing's been chosen yet, or access was
 *  revoked/denied. */
export async function getRememberedDirectory(): Promise<FSDirectoryHandle | undefined> {
  try {
    const handle = await idbGet(DIR_HANDLE_KEY)
    if (!handle) return undefined
    const ok = await ensureReadWritePermission(handle)
    return ok ? handle : undefined
  } catch {
    return undefined
  }
}

/** Whether a file with this name already exists in the folder. */
export async function fileExistsInDirectory(dir: FSDirectoryHandle, filename: string): Promise<boolean> {
  try {
    await dir.getFileHandle(filename, { create: false })
    return true
  } catch {
    return false
  }
}

/** Writes (creating or overwriting) a text file in the given folder. */
export async function writeTextFile(dir: FSDirectoryHandle, filename: string, contents: string): Promise<void> {
  const fileHandle = await dir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(contents)
  await writable.close()
}

// --- Remembering the filename (works in every browser) ---------------

const FILENAME_STORAGE_KEY = 'korjournal.exportFilename'

export function getRememberedFilename(): string | undefined {
  try {
    return localStorage.getItem(FILENAME_STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function rememberFilename(filename: string): void {
  try {
    localStorage.setItem(FILENAME_STORAGE_KEY, filename)
  } catch {
    // Non-fatal — just means the name won't be remembered next time.
  }
}

export type { FSDirectoryHandle }
