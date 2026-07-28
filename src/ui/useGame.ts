import { useEffect, useSyncExternalStore } from "react"
import type { GameState } from "../core/engine"
import type { GameStore } from "./gameStore"

/**
 * The store lives outside the React tree, so React only ever reads a snapshot.
 * No game state is duplicated into component state.
 */
export function useGameState(store: GameStore): GameState {
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useKeyboard(store: GameStore, enabled: boolean): void {
	useEffect(() => {
		if (!enabled) return

		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.metaKey || event.ctrlKey || event.altKey) return

			if (event.key === "Backspace") {
				event.preventDefault()
				store.backspace()
				return
			}
			if (event.key === "Escape") {
				event.preventDefault()
				store.pause()
				return
			}
			// Tab would move focus, Space would scroll the page.
			if (event.key === "Tab") {
				event.preventDefault()
				return
			}
			if (event.key.length !== 1) return

			event.preventDefault()
			store.key(event.key)
		}

		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [store, enabled])
}
