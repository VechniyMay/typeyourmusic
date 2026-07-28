import { useEffect, useState } from "react"
import type { GameStore } from "./gameStore"

const STORAGE_KEY = "musictype:volume"

function readStoredVolume(fallback: number): number {
	const raw = localStorage.getItem(STORAGE_KEY)
	if (raw === null) return fallback
	const parsed = Number.parseFloat(raw)
	return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback
}

/**
 * Volume lives outside the game state on purpose: it is a device setting, not
 * part of the run, so changing it must not touch the reducer or the replay.
 */
export function VolumeControl({ store }: { store: GameStore }) {
	const [volume, setVolume] = useState(() => readStoredVolume(store.getVolume()))
	const [muted, setMuted] = useState(false)

	// Apply on mount too, so a remembered level survives into a fresh run.
	useEffect(() => {
		store.setVolume(muted ? 0 : volume)
		localStorage.setItem(STORAGE_KEY, String(volume))
	}, [store, volume, muted])

	const level = muted ? 0 : volume
	const icon = level === 0 ? "\u{1F507}" : level < 0.5 ? "\u{1F509}" : "\u{1F50A}"

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={() => setMuted((value) => !value)}
				title={muted ? "Unmute" : "Mute"}
				aria-label={muted ? "Unmute" : "Mute"}
				className="text-dim hover:text-idle"
			>
				{icon}
			</button>
			<input
				type="range"
				min={0}
				max={1}
				step={0.01}
				value={level}
				aria-label="Volume"
				onChange={(event) => {
					setMuted(false)
					setVolume(event.target.valueAsNumber)
				}}
				// Keydown is captured globally for typing, so never let the slider hold focus.
				onMouseUp={(event) => event.currentTarget.blur()}
				className="h-1 w-24 cursor-pointer appearance-none rounded bg-surface accent-accent"
			/>
		</div>
	)
}
