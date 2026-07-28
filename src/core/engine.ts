/**
 * Headless game core: a pure reducer over (state, event).
 *
 * No React, no DOM, no timers. Time only enters through events, which makes the
 * whole game deterministic: the same event list always produces the same state.
 * That is what makes both the tests and the replay feature trivial.
 *
 * Casual cursor rule: the cursor advances on every keystroke, right or wrong.
 * A mistake never blocks you, so a typo cannot desync you from the music.
 */
import type { Difficulty } from "./difficulty"
import { lineIndexAt, type Track } from "./track"

export type CharStatus = "pending" | "correct" | "wrong" | "missed"

export type LineState = {
	statuses: CharStatus[]
	/** When each slot was filled, used for the rhythm metric. */
	hitTimes: (number | null)[]
	cursor: number
}

export type GameStatus = "ready" | "running" | "finished"

export type Stats = {
	/** Every keypress ever made. Backspace never lowers this. */
	keystrokes: number
	correct: number
	wrong: number
	missed: number
	combo: number
	maxCombo: number
}

export type GameState = {
	status: GameStatus
	time: number
	/** -1 during the lead-in and once the track is over. */
	activeLine: number
	/** How many lines are already typed out or expired. */
	resolved: number
	lines: LineState[]
	stats: Stats
}

export type GameEvent =
	| { type: "tick"; time: number }
	| { type: "key"; char: string; time: number }
	| { type: "backspace"; time: number }

export type EngineContext = {
	track: Track
	difficulty: Difficulty
}

export function createInitialState(track: Track): GameState {
	return {
		status: "ready",
		time: 0,
		activeLine: -1,
		resolved: 0,
		lines: track.lines.map((line) => ({
			statuses: line.chars.map((): CharStatus => "pending"),
			hitTimes: line.chars.map(() => null),
			cursor: 0,
		})),
		stats: { keystrokes: 0, correct: 0, wrong: 0, missed: 0, combo: 0, maxCombo: 0 },
	}
}

/** Anything still pending when a line expires becomes a miss. */
function expire(lineState: LineState): { line: LineState; missed: number } {
	let missed = 0
	const statuses = lineState.statuses.map((status): CharStatus => {
		if (status !== "pending") return status
		missed++
		return "missed"
	})
	if (missed === 0) return { line: lineState, missed: 0 }
	return { line: { ...lineState, statuses }, missed }
}

function applyTick(state: GameState, time: number, ctx: EngineContext): GameState {
	if (state.status === "finished") return state

	const { lines } = ctx.track
	const last = lines[lines.length - 1]
	const ended = !last || time >= last.end
	// Every line before this index has had its turn and can be sealed.
	const boundary = ended ? lines.length : Math.max(lineIndexAt(ctx.track, time), 0)

	let nextLines = state.lines
	let missed = state.stats.missed
	let combo = state.stats.combo

	for (let i = state.resolved; i < boundary; i++) {
		const expired = expire(nextLines[i]!)
		if (expired.missed === 0) continue
		if (nextLines === state.lines) nextLines = [...state.lines]
		nextLines[i] = expired.line
		missed += expired.missed
		combo = 0
	}

	const statsChanged = missed !== state.stats.missed || combo !== state.stats.combo

	return {
		...state,
		time,
		status: ended ? "finished" : "running",
		activeLine: ended ? -1 : lineIndexAt(ctx.track, time),
		resolved: boundary,
		lines: nextLines,
		stats: statsChanged ? { ...state.stats, missed, combo } : state.stats,
	}
}

function applyKey(state: GameState, char: string, time: number, ctx: EngineContext): GameState {
	if (state.status !== "running" || state.activeLine < 0) return state

	const line = ctx.track.lines[state.activeLine]
	const lineState = state.lines[state.activeLine]
	if (!line || !lineState) return state

	const cursor = lineState.cursor
	// Typing past the end of a line is swallowed: the line is bounded by time,
	// not by input, so there is nothing sensible to append to.
	if (cursor >= line.chars.length) return state

	const correct = char === line.chars[cursor]
	const statuses = [...lineState.statuses]
	statuses[cursor] = correct ? "correct" : "wrong"
	const hitTimes = [...lineState.hitTimes]
	hitTimes[cursor] = time

	const nextLines = [...state.lines]
	nextLines[state.activeLine] = { statuses, hitTimes, cursor: cursor + 1 }
	const combo = correct ? state.stats.combo + 1 : 0

	return {
		...state,
		lines: nextLines,
		stats: {
			...state.stats,
			keystrokes: state.stats.keystrokes + 1,
			correct: state.stats.correct + (correct ? 1 : 0),
			wrong: state.stats.wrong + (correct ? 0 : 1),
			combo,
			maxCombo: Math.max(state.stats.maxCombo, combo),
		},
	}
}

function applyBackspace(state: GameState, ctx: EngineContext): GameState {
	if (!ctx.difficulty.allowBackspace) return state
	if (state.status !== "running" || state.activeLine < 0) return state

	const lineState = state.lines[state.activeLine]
	if (!lineState || lineState.cursor === 0) return state

	const cursor = lineState.cursor - 1
	const statuses = [...lineState.statuses]
	statuses[cursor] = "pending"
	const hitTimes = [...lineState.hitTimes]
	hitTimes[cursor] = null

	const nextLines = [...state.lines]
	nextLines[state.activeLine] = { statuses, hitTimes, cursor }

	// Stats are deliberately untouched: backspace repairs the text, not the
	// record. Otherwise it would be a free path to 100% accuracy.
	return { ...state, lines: nextLines }
}

export function reduce(state: GameState, event: GameEvent, ctx: EngineContext): GameState {
	switch (event.type) {
		case "tick":
			return applyTick(state, event.time, ctx)
		case "key":
			return applyKey(state, event.char, event.time, ctx)
		case "backspace":
			return applyBackspace(state, ctx)
	}
}
