import { useCallback, useMemo, useReducer } from 'react'
import type { DriveLog } from '../types'

interface HistoryState {
  past: DriveLog[]
  present: DriveLog
  future: DriveLog[]
}

type HistoryAction =
  | { type: 'SET'; payload: DriveLog }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET':
      if (action.payload === state.present) return state
      // No cap on `past`/`future` — undo/redo is unlimited for the
      // lifetime of the session (every add/edit/delete/reorder/import
      // is one entry).
      return { past: [...state.past, state.present], present: action.payload, future: [] }
    case 'UNDO': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] }
    }
    case 'REDO': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return { past: [...state.past, state.present], present: next, future: state.future.slice(1) }
    }
    default:
      return state
  }
}

/**
 * Wraps a DriveLog in unlimited undo/redo history. `set` behaves like a
 * normal state setter (value or updater function) and records one
 * history entry per call — so every add, edit, delete, reorder, or
 * CSV import/merge becomes a single undoable step.
 */
export function useLogHistory(initial: DriveLog) {
  const [state, dispatch] = useReducer(historyReducer, { past: [], present: initial, future: [] })

  // Updater functions are resolved here against the latest
  // `state.present` before dispatch (reducers can't read outside
  // state). `setLog` is recreated whenever `state.present` changes, so
  // callers always resolve against the current value.
  const setLog = useCallback(
    (updater: DriveLog | ((prev: DriveLog) => DriveLog)) => {
      const payload = updater instanceof Function ? updater(state.present) : updater
      dispatch({ type: 'SET', payload })
    },
    [state.present],
  )

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])

  return useMemo(
    () => ({
      log: state.present,
      setLog,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state, setLog, undo, redo],
  )
}
