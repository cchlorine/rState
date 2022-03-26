import { useCallback, useEffect, useState } from "react"
import { StateManager } from "."

export function useRemoteState<T>(key: string, initialValue: T) {
  const stateManager = StateManager.getInstance()
  const [isValidating, setIsValidating] = useState(true)
  const [state, setState] = useState<T>(initialValue)

  useEffect(() => {
    if (typeof window === 'undefined')  return
    return stateManager.bind(key, (newState: T) => {
      setIsValidating(false)
      setState(newState)
    }, initialValue)
  }, [])

  const saveState = useCallback((value: T) => {
    if (isValidating) return
    if (stateManager) {
      stateManager.set(key, value)
      setIsValidating(true)
    }
  }, [stateManager])

  return [state, saveState, isValidating] as const
}

export default useRemoteState
