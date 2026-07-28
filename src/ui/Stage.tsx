import { DIFFICULTIES, type DifficultyId } from "../core/difficulty"
import type { GameStore } from "./gameStore"
import { LyricLine } from "./LyricLine"
import { useGameState, useKeyboard } from "./useGame"
import { VolumeControl } from "./VolumeControl"

type Props = {
	store: GameStore
	difficultyId: DifficultyId
	onExit: () => void
}

export function Stage({ store, difficultyId, onExit }: Props) {
	const state = useGameState(store)
	useKeyboard(store, state.status !== "finished")

	const { track } = store
	const difficulty = DIFFICULTIES[difficultyId]
	const activeIndex = state.activeLine
	const activeLine = activeIndex >= 0 ? track.lines[activeIndex] : undefined
	const previous = activeIndex > 0 ? track.lines[activeIndex - 1] : undefined
	// Before the first lyric there is nothing active yet, so show what is coming.
	const preview =
		activeIndex >= 0
			? track.lines.slice(activeIndex + 1, activeIndex + 1 + difficulty.previewLines)
			: track.lines.slice(0, 1)

	const progress = track.duration > 0 ? Math.min(state.time / track.duration, 1) : 0
	const accuracy = state.stats.keystrokes > 0 ? state.stats.correct / state.stats.keystrokes : 1
	const paused = !store.running && state.status !== "finished"
	const firstLine = track.lines[0]
	const countdown =
		activeIndex < 0 && firstLine ? Math.max(0, Math.ceil((firstLine.start - state.time) / 1000)) : 0

	return (
		<div className="relative flex h-full flex-col">
			<header className="flex items-center justify-between px-8 py-5 text-sm">
				<div>
					<span className="text-idle">{track.title}</span>
					<span className="text-dim"> — {track.artist}</span>
				</div>
				<div className="flex items-center gap-4">
					<span className="text-accent">{difficulty.label}</span>
					<span className="text-dim">{difficulty.rate}×</span>
					{store.hasAudio ? <VolumeControl store={store} /> : null}
					<button className="text-dim hover:text-idle" onClick={onExit}>
						menu
					</button>
				</div>
			</header>

			<div className="h-0.5 w-full bg-surface">
				<div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
			</div>

			<main className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
				{previous ? <LyricLine line={previous} active={false} /> : null}

				{activeLine ? (
					<LyricLine line={activeLine} state={state.lines[activeLine.index]} active />
				) : (
					<p className="text-4xl text-dim">{countdown > 0 ? countdown : "♪"}</p>
				)}

				{preview.map((line) => (
					<LyricLine key={line.index} line={line} active={false} />
				))}
			</main>

			<footer className="flex justify-center gap-8 px-8 py-6 text-sm text-dim">
				<span>
					combo <span className="text-idle">{state.stats.combo}</span>
				</span>
				<span>
					max <span className="text-idle">{state.stats.maxCombo}</span>
				</span>
				<span>
					acc <span className="text-idle">{Math.round(accuracy * 100)}%</span>
				</span>
				<span>
					missed <span className="text-miss">{state.stats.missed}</span>
				</span>
			</footer>

			{paused ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg/85">
					<p className="text-sm text-dim">paused</p>
					<button
						className="rounded border border-dim px-6 py-3 text-idle hover:border-accent hover:text-accent"
						onClick={() => store.resume()}
					>
						resume
					</button>
				</div>
			) : null}
		</div>
	)
}
