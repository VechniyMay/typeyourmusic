/**
 * Difficulty is data, not an enum with branches scattered around the engine.
 * Adding a mode = adding an object here.
 */
export type Difficulty = {
	id: DifficultyId
	label: string
	/** Timeline speed multiplier. */
	rate: number
	allowBackspace: boolean
	/** Can you still finish a line after it expired? (not wired up yet) */
	carryOver: boolean
	/** How many upcoming lines are visible. */
	previewLines: number
}

export type DifficultyId = "practice" | "easy" | "normal" | "hard" | "extreme"

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
	practice: { id: "practice", label: "Practice", rate: 0.6, allowBackspace: true, carryOver: true, previewLines: 2 },
	easy: { id: "easy", label: "Easy", rate: 0.85, allowBackspace: true, carryOver: true, previewLines: 2 },
	normal: { id: "normal", label: "Normal", rate: 1, allowBackspace: true, carryOver: false, previewLines: 1 },
	hard: { id: "hard", label: "Hard", rate: 1, allowBackspace: false, carryOver: false, previewLines: 1 },
	extreme: { id: "extreme", label: "Extreme", rate: 1.25, allowBackspace: false, carryOver: false, previewLines: 0 },
}

export const DEFAULT_DIFFICULTY: DifficultyId = "normal"
