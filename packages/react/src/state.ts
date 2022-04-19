import type { StateManager } from "@rstate/client"
import { useRef, useState, useEffect, useCallback } from "react"

function useStateRef<T>(state: T) {
  const ref = useRef(state)

  useEffect(() => {
    ref.current = state
  }, [state])

  return ref
}

export function useStateManager<T>(stateManager: StateManager, key: string, initialValue: T) {
  const [isValidating, setIsValidating] = useState(true)
  const validatingRef = useStateRef(isValidating)
  const [state, setState] = useState<T>(initialValue)

  useEffect(() => {
    if (typeof window === 'undefined') return
    return stateManager.bind(key, (newState: T) => {
      setIsValidating(false)
      setState(newState)
    }, initialValue)
  }, [])

  const saveState = useCallback((value: T) => {
    if (validatingRef.current) return
    if (stateManager) {
      stateManager.set(key, value)
      setIsValidating(true)
    }
  }, [stateManager])

  return [state, saveState, isValidating] as const
}

