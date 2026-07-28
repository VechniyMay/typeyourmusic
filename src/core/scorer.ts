/**
 * Turns a finished GameState into result-screen numbers.
 *
 * Kept apart from the engine so the scoring formula can change without
 * touching game logic. Everything here is derived, never stored.
 */
import type { GameState } from "./engine"
import type { Track } from "./track"

export type Deviation = {
	/** Position in the track, ms. */
	time: number
	/** Negative means rushing, positive means dragging. */
	delta: number
}

export type Summary = {
	wpm: number
	rawWpm: number
	/** Correct keystrokes over all keystrokes. */
	accuracy: number
	/** Share of the track's characters actually typed correctly. */
	completion: number
	keystrokes: number
	correct: number
	wrong: number
	missed: number
	maxCombo: number
	/** Mean absolute timing error in ms. */
	rhythmAccuracy: number
	/** Signed mean timing error: negative = ahead of the beat. */
	bias: number
	deviations: Deviation[]
}

/**
 * Because the cursor advances on every keystroke, slot index == keystroke
 * number, so a hit maps to its ideal time by index. No matching needed.
 */
export function collectDeviations(track: Track, state: GameState): Deviation[] {
	const deviations: Deviation[] = []

	for (let i = 0; i < track.lines.length; i++) {
		const line = track.lines[i]
		const lineState = state.lines[i]
		if (!line || !lineState) continue

		for (let c = 0; c < lineState.hitTimes.length; c++) {
			if (lineState.statuses[c] !== "correct") continue
			const hit = lineState.hitTimes[c]
			const ideal = line.idealTimes[c]
			if (hit == null || ideal == null) continue
			deviations.push({ time: ideal, delta: hit - ideal })
		}
	}

	return deviations
}

function mean(values: number[]): number {
	if (values.length === 0) return 0
	let sum = 0
	for (const value of values) sum += value
	return sum / values.length
}

/** Playable window: from the first lyric to wherever the run stopped. */
function elapsedMinutes(track: Track, state: GameState): number {
	const first = track.lines[0]
	if (!first) return 0
	const end = Math.min(state.time, track.duration)
	const span = end - first.start
	return span > 0 ? span / 60_000 : 0
}

export function summarize(track: Track, state: GameState): Summary {
	const { stats } = state
	const deviations = collectDeviations(track, state)
	const minutes = elapsedMinutes(track, state)

	return {
		wpm: minutes > 0 ? stats.correct / 5 / minutes : 0,
		rawWpm: minutes > 0 ? stats.keystrokes / 5 / minutes : 0,
		accuracy: stats.keystrokes > 0 ? stats.correct / stats.keystrokes : 0,
		completion: track.totalChars > 0 ? stats.correct / track.totalChars : 0,
		keystrokes: stats.keystrokes,
		correct: stats.correct,
		wrong: stats.wrong,
		missed: stats.missed,
		maxCombo: stats.maxCombo,
		rhythmAccuracy: mean(deviations.map((d) => Math.abs(d.delta))),
		bias: mean(deviations.map((d) => d.delta)),
		deviations,
	}
}
