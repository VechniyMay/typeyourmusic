import { describe, expect, it } from "vitest"
import { DIFFICULTIES } from "../difficulty"
import {
	createInitialState,
	reduce,
	type EngineContext,
	type GameEvent,
	type GameState,
} from "../engine"
import { parseLrc } from "../lrc"
import { buildTrack } from "../track"

// Two lines of two characters: "ab" [0..2000), "cd" [2000..4000).
const TRACK = buildTrack(parseLrc(["[00:00.00]ab", "[00:02.00]cd", "[00:04.00]"].join("\n")))
const CTX: EngineContext = { track: TRACK, difficulty: DIFFICULTIES.normal }

function run(events: GameEvent[], ctx: EngineContext = CTX): GameState {
	return events.reduce((state, event) => reduce(state, event, ctx), createInitialState(TRACK))
}

const start: GameEvent = { type: "tick", time: 0 }

describe("casual cursor", () => {
	it("advances past a wrong character instead of blocking", () => {
		const state = run([
			start,
			{ type: "key", char: "x", time: 100 },
			{ type: "key", char: "b", time: 200 },
		])
		expect(state.lines[0]!.statuses).toEqual(["wrong", "correct"])
		expect(state.lines[0]!.cursor).toBe(2)
		expect(state.stats).toMatchObject({ keystrokes: 2, correct: 1, wrong: 1, combo: 1 })
	})

	it("swallows keystrokes typed past the end of a line", () => {
		const state = run([
			start,
			{ type: "key", char: "a", time: 100 },
			{ type: "key", char: "b", time: 200 },
			{ type: "key", char: "c", time: 300 },
		])
		expect(state.stats.keystrokes).toBe(2)
		expect(state.lines[0]!.cursor).toBe(2)
	})
})

describe("line expiry", () => {
	it("turns leftovers into misses and breaks the combo", () => {
		const state = run([
			start,
			{ type: "key", char: "a", time: 100 },
			{ type: "tick", time: 2100 },
		])
		expect(state.lines[0]!.statuses).toEqual(["correct", "missed"])
		expect(state.stats).toMatchObject({ missed: 1, combo: 0, maxCombo: 1 })
		expect(state.activeLine).toBe(1)
	})

	it("finishes the run once the last line ends", () => {
		const state = run([start, { type: "tick", time: 4000 }])
		expect(state.status).toBe("finished")
		expect(state.activeLine).toBe(-1)
		expect(state.stats.missed).toBe(4)
	})

	it("ignores input after the track is over", () => {
		const state = run([start, { type: "tick", time: 4000 }, { type: "key", char: "a", time: 4100 }])
		expect(state.stats.keystrokes).toBe(0)
	})
})

describe("backspace", () => {
	it("clears the slot but keeps the mistake in the stats", () => {
		const state = run([
			start,
			{ type: "key", char: "x", time: 100 },
			{ type: "backspace", time: 150 },
		])
		expect(state.lines[0]!.statuses[0]).toBe("pending")
		expect(state.lines[0]!.cursor).toBe(0)
		expect(state.stats).toMatchObject({ keystrokes: 1, wrong: 1 })
	})

	it("is a no-op on difficulties that disable it", () => {
		const hard: EngineContext = { track: TRACK, difficulty: DIFFICULTIES.hard }
		const state = run(
			[start, { type: "key", char: "x", time: 100 }, { type: "backspace", time: 150 }],
			hard,
		)
		expect(state.lines[0]!.cursor).toBe(1)
		expect(state.lines[0]!.statuses[0]).toBe("wrong")
	})
})

describe("determinism", () => {
	// This property is what makes replays possible: store the key events, feed
	// them back in, get the exact same run.
	it("produces an identical state for an identical event list", () => {
		const events: GameEvent[] = [
			start,
			{ type: "key", char: "a", time: 120 },
			{ type: "key", char: "z", time: 640 },
			{ type: "tick", time: 2100 },
			{ type: "key", char: "c", time: 2300 },
			{ type: "tick", time: 4000 },
		]
		expect(run(events)).toEqual(run(events))
	})

	it("never mutates the state it is given", () => {
		const before = createInitialState(TRACK)
		const snapshot = structuredClone(before)
		reduce(reduce(before, start, CTX), { type: "key", char: "a", time: 10 }, CTX)
		expect(before).toEqual(snapshot)
	})
})
