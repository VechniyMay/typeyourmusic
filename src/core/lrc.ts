/**
 * LRC parser. Pure: string in, data out. No DOM, no timers.
 * Format: [mm:ss.xx]lyric text, plus optional [ti:]/[ar:]/[offset:] metadata tags.
 */

export type LrcLine = { time: number; text: string }

export type LrcMetadata = {
	title?: string
	artist?: string
	album?: string
	/** Global shift in ms. Positive means lyrics should appear earlier. */
	offset?: number
}

export type ParsedLrc = {
	metadata: LrcMetadata
	/** Sorted by time. Empty-text entries are kept: they act as end markers. */
	lines: LrcLine[]
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g
const META_TAG = /^\[(ti|ar|al|by|offset|length|re|ve):([^\]]*)\]$/i
const SECTION_ONLY = /^[\[(](chorus|verse|bridge|intro|outro|hook|refrain|pre-chorus)[^\])]*[\])]$/i

/** [01:23.4] -> 83400ms. Two-digit fractions are centiseconds, three are ms. */
function tagToMs(minutes: string, seconds: string, fraction?: string): number {
	const mm = Number(minutes)
	const ss = Number(seconds)
	let ms = 0
	if (fraction) {
		if (fraction.length === 1) ms = Number(fraction) * 100
		else if (fraction.length === 2) ms = Number(fraction) * 10
		else ms = Number(fraction)
	}
	return mm * 60_000 + ss * 1000 + ms
}

/** Strips karaoke noise so the player never has to type [Chorus] or (x2). */
export function cleanLyricText(raw: string): string {
	const text = raw.replace(/\s+/g, " ").trim()
	if (SECTION_ONLY.test(text)) return ""
	return text
		.replace(/[\u266a\u266b\u2669\u25ba]/g, "")
		.replace(/\((?:x\d+|\d+x)\)/gi, "")
		.replace(/\s+/g, " ")
		.trim()
}

function applyMeta(meta: LrcMetadata, key: string, value: string): void {
	switch (key) {
		case "ti":
			meta.title = value
			break
		case "ar":
			meta.artist = value
			break
		case "al":
			meta.album = value
			break
		case "offset": {
			const parsed = Number(value)
			if (Number.isFinite(parsed)) meta.offset = parsed
			break
		}
		default:
			break
	}
}

export function parseLrc(raw: string): ParsedLrc {
	const metadata: LrcMetadata = {}
	const lines: LrcLine[] = []

	for (const rawLine of raw.split(/\r?\n/)) {
		const line = rawLine.trim()
		if (!line) continue

		const meta = META_TAG.exec(line)
		if (meta?.[1] && meta[2] !== undefined) {
			applyMeta(metadata, meta[1].toLowerCase(), meta[2].trim())
			continue
		}

		// One text can carry several timestamps (repeated choruses).
		const times: number[] = []
		TIME_TAG.lastIndex = 0
		let match: RegExpExecArray | null
		while ((match = TIME_TAG.exec(line)) !== null) {
			times.push(tagToMs(match[1]!, match[2]!, match[3]))
		}
		if (times.length === 0) continue

		const text = cleanLyricText(line.replace(TIME_TAG, ""))
		for (const time of times) lines.push({ time, text })
	}

	// Spec: positive offset means the lyrics should show up earlier.
	const offset = metadata.offset ?? 0
	const shifted = lines.map((line) => ({
		...line,
		time: Math.max(0, line.time - offset),
	}))
	shifted.sort((a, b) => a.time - b.time)

	return { metadata, lines: shifted }
}
