import { describe, expect, it } from "vitest"
import { parseLrc } from "../lrc"
import { buildTrack, lineIndexAt } from "../track"

const RAW = ["[00:00.00]one", "[00:02.00]two", "[00:06.00]"].join("\n")
const track = () => buildTrack(parseLrc(RAW))

describe("buildTrack", () => {
	it("ends every line where the next one starts", () => {
		expect(track().lines.map((line) => [line.start, line.end])).toEqual([
			[0, 2000],
			[2000, 6000],
		])
	})

	it("drops empty entries but still uses them as boundaries", () => {
		const built = track()
		expect(built.lines).toHaveLength(2)
		expect(built.totalChars).toBe(6)
		expect(built.duration).toBe(6000)
	})

	it("spreads ideal character times across the line span", () => {
		expect(track().lines[0]!.idealTimes).toEqual([0, 2000 / 3, 4000 / 3])
	})
})

describe("lineIndexAt", () => {
	it("reports -1 during the lead-in", () => {
		const late = buildTrack(parseLrc(["[00:05.00]late", "[00:07.00]"].join("\n")))
		expect(lineIndexAt(late, 0)).toBe(-1)
		expect(lineIndexAt(late, 4999)).toBe(-1)
		expect(lineIndexAt(late, 5000)).toBe(0)
	})

	it("switches exactly on the boundary and clamps at the end", () => {
		const built = track()
		expect(lineIndexAt(built, 1999)).toBe(0)
		expect(lineIndexAt(built, 2000)).toBe(1)
		expect(lineIndexAt(built, 999_999)).toBe(1)
	})
})
