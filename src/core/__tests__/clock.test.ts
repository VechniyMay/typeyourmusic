import { describe, expect, it } from "vitest"
import { Clock } from "../clock"

/** Drives the clock by hand instead of relying on real elapsed time. */
function fakeClock() {
	const state = { real: 1000 }
	const clock = new Clock(() => state.real)
	return { clock, advance: (ms: number) => (state.real += ms), state }
}

describe("Clock", () => {
	it("stays at zero until it is played", () => {
		const { clock, advance } = fakeClock()
		advance(5000)
		expect(clock.now()).toBe(0)
	})

	it("advances with real time while playing", () => {
		const { clock, advance } = fakeClock()
		clock.play()
		advance(2500)
		expect(clock.now()).toBe(2500)
	})
})

describe("Clock pausing and rate", () => {
	it("freezes while paused and resumes from the same position", () => {
		const { clock, advance } = fakeClock()
		clock.play()
		advance(1000)
		clock.pause()
		advance(10_000)
		expect(clock.now()).toBe(1000)
		clock.play()
		advance(500)
		expect(clock.now()).toBe(1500)
	})

	it("applies a new rate without discarding past progress", () => {
		const { clock, advance } = fakeClock()
		clock.play()
		advance(1000)
		clock.setRate(2)
		advance(1000)
		expect(clock.now()).toBe(3000)
	})

	it("does not drift after thousands of samples", () => {
		const { clock, advance, state } = fakeClock()
		clock.play()
		for (let i = 0; i < 10_000; i++) {
			advance(16.7)
			clock.now()
		}
		expect(clock.now()).toBe(state.real - 1000)
	})
})
