import { StateManager } from "@rstate/core";
import { customRef, reactive, ref, watch } from 'vue';
export function useRemoteState(key, initialValue) {
    var rawValue = ref();
    var validating = ref(false);
    var stateManager = StateManager.getInstance();
    var state = customRef(function (track, trigger) {
        stateManager.bind(key, function (newState) {
            rawValue.value = newState;
            validating.value = false;
            trigger();
        }, initialValue);
        return {
            get: function () {
                track();
                return rawValue.value;
            },
            set: function (newValue) {
                if (validating.value)
                    return;
                if (stateManager) {
                    stateManager.set(key, newValue);
                    validating.value = false;
                }
            }
        };
    });
    return [
        reactive(state),
        reactive(validating),
    ];
}
