var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { useCallback, useEffect, useState } from "react";
import { StateManager } from "@rstate/core";
export function useRemoteState(key, initialValue) {
    var stateManager = StateManager.getInstance();
    var _a = __read(useState(true), 2), isValidating = _a[0], setIsValidating = _a[1];
    var _b = __read(useState(initialValue), 2), state = _b[0], setState = _b[1];
    useEffect(function () {
        if (typeof window === 'undefined')
            return;
        return stateManager.bind(key, function (newState) {
            setIsValidating(false);
            setState(newState);
        }, initialValue);
    }, []);
    var saveState = useCallback(function (value) {
        if (isValidating)
            return;
        if (stateManager) {
            stateManager.set(key, value);
            setIsValidating(true);
        }
    }, [stateManager]);
    return [state, saveState, isValidating];
}
export default useRemoteState;
