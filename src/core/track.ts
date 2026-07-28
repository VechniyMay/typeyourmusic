/**
 * Playable model built once at load time. Everything the game loop might need
 * per frame is precomputed here so the render path stays arithmetic-free.
 */
import type { ParsedLrc } from "./lrc"
import { normalizeLyric } from "./normalize"

export type Line = {
	index: number
	text: string
	/** ms, inclusive */
	start: number
	/** ms, exclusive: the moment the line expires */
	end: number
	chars: string[]
	/** Characters per second required to keep up with this line. */
	cps: number
	/** Perfect timestamp for each character, used for the rhythm metric. */
	idealTimes: number[]
}

export type Track = {
	title: string
	artist: string
	lines: Line[]
	duration: number
	totalChars: number
	peakCps: number
	/** 1-5, derived from peak typing speed. */
	stars: number
}

/** Fallback length for the very last line when the file has no [length:] tag. */
const TAIL_MS = 4000
/** Guards against division by zero on malformed timestamps. */
const MIN_LINE_MS = 250
/** Short interjections skew the peak, so ignore them when rating difficulty. */
const MIN_CHARS_FOR_PEAK = 8

export type BuildTrackOptions = {
	title?: string
	artist?: string
	/** Strip case, punctuation and bracketed asides. On by default. */
	normalize?: boolean
}

function starsFor(peakCps: number): number {
	if (peakCps < 4) return 1
	if (peakCps < 7) return 2
	if (peakCps < 10) return 3
	if (peakCps < 14) return 4
	return 5
}

export function buildTrack(parsed: ParsedLrc, options: BuildTrackOptions = {}): Track {
	const raw = parsed.lines
	const normalize = options.normalize ?? true
	const lines: Line[] = []

	for (let i = 0; i < raw.length; i++) {
		const entry = raw[i]!
		// Empty entries are kept by the parser only to bound the previous line.
		if (!entry.text) continue

		// A line that was nothing but an aside, e.g. "(instrumental)", is now empty.
		// It still bounds the previous line: `next` is read from the raw list.
		const text = normalize ? normalizeLyric(entry.text) : entry.text
		if (!text) continue

		const next = raw[i + 1]
		const start = entry.time
		const end = Math.max(start + MIN_LINE_MS, next ? next.time : start + TAIL_MS)
		const chars = [...text]
		const span = end - start
		const idealTimes = chars.map((_, ci) => start + (span * ci) / chars.length)

		lines.push({
			index: lines.length,
			text,
			start,
			end,
			chars,
			cps: chars.length / (span / 1000),
			idealTimes,
		})
	}

	const totalChars = lines.reduce((sum, line) => sum + line.chars.length, 0)
	const peakCps = lines
		.filter((line) => line.chars.length >= MIN_CHARS_FOR_PEAK)
		.reduce((max, line) => Math.max(max, line.cps), 0)
	const duration = lines.length ? lines[lines.length - 1]!.end : 0

	return {
		title: options.title ?? parsed.metadata.title ?? "Unknown title",
		artist: options.artist ?? parsed.metadata.artist ?? "Unknown artist",
		lines,
		duration,
		totalChars,
		peakCps,
		stars: starsFor(peakCps),
	}
}

/** Index of the line active at `time`, or -1 before the first line starts. */
export function lineIndexAt(track: Track, time: number): number {
	const { lines } = track
	if (!lines.length || time < lines[0]!.start) return -1
	let lo = 0
	let hi = lines.length - 1
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1
		if (lines[mid]!.start <= time) lo = mid
		else hi = mid - 1
	}
	return lo
}
