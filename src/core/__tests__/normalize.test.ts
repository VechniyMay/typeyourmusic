import { describe, expect, it } from "vitest"
import { normalizeLyric } from "../normalize"

describe("normalizeLyric", () => {
	it("lowercases and drops punctuation", () => {
		expect(normalizeLyric("Hello, World! Are you there?")).toBe("hello world are you there")
	})

	it("removes brackets together with what is inside them", () => {
		expect(normalizeLyric("keep this (drop that) and this")).toBe("keep this and this")
		expect(normalizeLyric("[Verse 1] the line")).toBe("the line")
		expect(normalizeLyric("a {b} c")).toBe("a c")
	})

	it("handles nested brackets", () => {
		expect(normalizeLyric("start ((inner) outer) end")).toBe("start end")
	})

	it("turns joiners into spaces so words never fuse", () => {
		expect(normalizeLyric("well-known song—right now")).toBe("well known song right now")
	})

	it("drops apostrophes without splitting the word", () => {
		expect(normalizeLyric("don't stop")).toBe("dont stop")
	})
})
