import { describe, expect, it } from "vitest"
import { cleanLyricText, parseLrc } from "../lrc"

describe("parseLrc timestamps", () => {
	it("converts a timestamp to milliseconds", () => {
		expect(parseLrc("[01:23.45]hello").lines).toEqual([{ time: 83450, text: "hello" }])
	})

	it("reads one fraction digit as tenths and three as milliseconds", () => {
		expect(parseLrc("[00:01.5]a").lines[0]!.time).toBe(1500)
		expect(parseLrc("[00:01.005]a").lines[0]!.time).toBe(1005)
	})

	it("expands repeated timestamps and sorts the result", () => {
		const { lines } = parseLrc("[00:30.00][00:10.00]chorus")
		expect(lines.map((line) => line.time)).toEqual([10_000, 30_000])
		expect(lines.every((line) => line.text === "chorus")).toBe(true)
	})
})

describe("parseLrc metadata", () => {
	it("reads tags and shifts every line by the offset", () => {
		const raw = ["[ti:Song]", "[ar:Band]", "[offset:+500]", "[00:10.00]line"].join("\n")
		const { metadata, lines } = parseLrc(raw)
		expect(metadata).toEqual({ title: "Song", artist: "Band", offset: 500 })
		expect(lines[0]!.time).toBe(9500)
	})

	it("keeps empty timed entries but ignores untimed text", () => {
		const { lines } = parseLrc("[00:01.00]sing\n[00:03.00]\nno timestamp here")
		expect(lines).toEqual([
			{ time: 1000, text: "sing" },
			{ time: 3000, text: "" },
		])
	})
})

describe("cleanLyricText", () => {
	it("drops section headers entirely", () => {
		expect(cleanLyricText("[Chorus]")).toBe("")
		expect(cleanLyricText("(Verse 2)")).toBe("")
	})

	it("collapses whitespace and strips repeat markers", () => {
		expect(cleanLyricText("  la   la  (x2) ")).toBe("la la")
	})
})
