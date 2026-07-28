/**
 * Turns lyric text into something you can type without thinking.
 *
 * Shift, punctuation and backing-vocal asides all cost attention that a fast
 * song does not leave spare. Stripping them is not cosmetic: it removes whole
 * classes of mistake that have nothing to do with keeping up with the beat.
 */

/** Innermost bracket pair. Applied repeatedly to handle nesting. */
const BRACKETED = /\([^()]*\)|\[[^\][]*\]|\{[^{}]*\}/gu
/** Unpaired leftovers after the pass above. */
const STRAY_BRACKETS = /[()[\]{}]/gu
/** Word joiners become spaces so two words never fuse into one. */
const JOINERS = /[-\u2010-\u2015_/\\|]+/gu
/** Keep letters, digits and combining marks; drop the rest. */
const NOISE = /[^\p{L}\p{N}\p{M} ]/gu

/**
 * Everything inside brackets goes with the brackets: those are ad-libs and
 * stage directions, not part of the line you are supposed to keep up with.
 */
export function normalizeLyric(raw: string): string {
	let text = raw
	let previous: string
	do {
		previous = text
		text = text.replace(BRACKETED, " ")
	} while (text !== previous)

	return text
		.replace(STRAY_BRACKETS, " ")
		.replace(JOINERS, " ")
		.replace(NOISE, "")
		.replace(/\s+/gu, " ")
		.trim()
		.toLowerCase()
}
