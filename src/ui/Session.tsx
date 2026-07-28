import type { DifficultyId } from "../core/difficulty"
import type { GameStore } from "./gameStore"
import { ResultScreen } from "./ResultScreen"
import { Stage } from "./Stage"
import { useGameState } from "./useGame"

type Props = {
	store: GameStore
	difficultyId: DifficultyId
	onExit: () => void
}

/** Swaps between the playfield and the results for a single run. */
export function Session({ store, difficultyId, onExit }: Props) {
	const state = useGameState(store)

	if (state.status === "finished") {
		return (
			<ResultScreen
				track={store.track}
				state={state}
				onRestart={() => store.start()}
				onExit={onExit}
			/>
		)
	}

	return <Stage store={store} difficultyId={difficultyId} onExit={onExit} />
}
