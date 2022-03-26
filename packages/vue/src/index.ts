import { StateManager } from "@rstate/core"
import{ customRef, reactive, ref, watch } from 'vue'

export function useRemoteState<T>(key: string, initialValue: T) {
  const rawValue = ref<T>()
  const validating = ref<boolean>(false)
  const stateManager = StateManager.getInstance()

  const state = customRef<T>((track, trigger) => {
    stateManager.bind(key, (newState: T) => {
      rawValue.value = newState
      validating.value = false
      trigger()
    }, initialValue)

    return {
      get() {
        track()
        return rawValue.value!
      },

      set(newValue) {
        if (validating.value) return
        if (stateManager) {
          stateManager.set(key, newValue)
          validating.value = false
        }
      }
    }
  })

  return [
    reactive(state),
    reactive(validating),
  ] as const
}
