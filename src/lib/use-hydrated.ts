import { useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/**
 * False during SSR and hydration, true afterwards. Uses useSyncExternalStore rather
 * than a setState-in-effect so there's no extra render pass or hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
