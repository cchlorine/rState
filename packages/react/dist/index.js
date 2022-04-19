import { useContext, createContext } from "react";
import { StateManager } from "@rstate/client";
import { useStateManager } from "./state";
import { getDefaultNamespace } from "./util";
export var RemoteStateContext = createContext(getDefaultNamespace());
export function useRemoteState(key, initialValue) {
    var namespace = useContext(RemoteStateContext);
    var stateManager = StateManager.getInstance(namespace);
    return useStateManager(stateManager, key, initialValue);
}
export default useRemoteState;
