import { useContext, createContext } from "react"
import { StateManager } from "@rstate/client"
import { useStateManager } from "./state"
import { getDefaultNamespace } from "./util"

export const RemoteStateContext = createContext(getDefaultNamespace())

export function useRemoteState<T>(key: string, initialValue: T) {
  const namespace = useContext(RemoteStateContext)
  const stateManager = StateManager.getInstance(namespace)

  return useStateManager(stateManager, key, initialValue)
}

export default useRemoteState
