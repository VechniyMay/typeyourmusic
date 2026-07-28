import { describe, expect, it } from "vitest"
import { DIFFICULTIES } from "../difficulty"
import { createInitialState, reduce, type EngineContext, type GameEvent } from "../engine"
import { parseLrc } from "../lrc"
import { summarize } from "../scorer"
import { buildTrack } from "../track"

const TRACK = buildTrack(parseLrc(["[00:00.00]ab", "[00:02.00]cd", "[00:04.00]"].join("\n")))
const CTX: EngineContext = { track: TRACK, difficulty: DIFFICULTIES.normal }

function play(events: GameEvent[]) {
	const state = events.reduce((acc, event) => reduce(acc, event, CTX), createInitialState(TRACK))
	return summarize(TRACK, state)
}

// Line "ab" spans 0..2000, so the ideal times are 0 and 1000.
describe("rhythm metrics", () => {
	it("measures absolute error and signed bias separately", () => {
		const summary = play([
			{ type: "tick", time: 0 },
			{ type: "key", char: "a", time: 100 },
			{ type: "key", char: "b", time: 900 },
			{ type: "tick", time: 4000 },
		])
		expect(summary.deviations.map((d) => d.delta)).toEqual([100, -100])
		expect(summary.rhythmAccuracy).toBe(100)
		expect(summary.bias).toBe(0)
	})
})

describe("accuracy and completion", () => {
	it("separates accuracy from track completion", () => {
		const summary = play([
			{ type: "tick", time: 0 },
			{ type: "key", char: "a", time: 100 },
			{ type: "key", char: "x", time: 900 },
			{ type: "tick", time: 4000 },
		])
		// One of two keystrokes landed, and one of the track's four characters.
		expect(summary.accuracy).toBe(0.5)
		expect(summary.completion).toBe(0.25)
		expect(summary.missed).toBe(2)
	})

	it("counts a corrected mistake against accuracy but not completion", () => {
		const summary = play([
			{ type: "tick", time: 0 },
			{ type: "key", char: "x", time: 100 },
			{ type: "backspace", time: 150 },
			{ type: "key", char: "a", time: 200 },
			{ type: "key", char: "b", time: 900 },
			{ type: "tick", time: 4000 },
		])
		expect(summary.keystrokes).toBe(3)
		expect(summary.accuracy).toBeCloseTo(2 / 3, 5)
		expect(summary.completion).toBe(0.5)
	})
})
