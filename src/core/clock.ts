/**
 * The only place that touches wall-clock time.
 *
 * Track position is derived from an anchor pair (real time, track time) instead
 * of being accumulated frame by frame. Accumulating deltas drifts: every frame
 * adds a rounding error and after a few minutes the lyrics are visibly out of
 * sync. Deriving from an anchor keeps the error constant no matter how long the
 * session runs.
 */
export class Clock {
	private anchorReal = 0
	private anchorTrack = 0
	private currentRate = 1
	private running = false
	private readonly realNow: () => number

	/** `realNow` is injectable so tests can drive time by hand. */
	constructor(realNow: () => number = () => performance.now()) {
		this.realNow = realNow
		this.anchorReal = realNow()
	}

	get playing(): boolean {
		return this.running
	}

	get rate(): number {
		return this.currentRate
	}

	/** Current position inside the track, in ms. */
	now(): number {
		if (!this.running) return this.anchorTrack
		return this.anchorTrack + (this.realNow() - this.anchorReal) * this.currentRate
	}

	/** Freeze the current position before mutating rate or play state. */
	private reanchor(): void {
		this.anchorTrack = this.now()
		this.anchorReal = this.realNow()
	}

	play(): void {
		if (this.running) return
		this.anchorReal = this.realNow()
		this.running = true
	}

	pause(): void {
		if (!this.running) return
		this.reanchor()
		this.running = false
	}

	setRate(rate: number): void {
		if (rate <= 0) throw new Error(`Clock rate must be positive, got ${rate}`)
		this.reanchor()
		this.currentRate = rate
	}

	seek(trackMs: number): void {
		this.anchorTrack = Math.max(0, trackMs)
		this.anchorReal = this.realNow()
	}

	reset(): void {
		this.running = false
		this.anchorTrack = 0
		this.anchorReal = this.realNow()
	}
}

/**
 * Anything the game can read its position from. `Clock` is the silent default;
 * `AudioClock` is the same shape backed by a real audio element.
 */
export interface TimeSource {
	readonly playing: boolean
	readonly rate: number
	now(): number
	play(): void
	pause(): void
	setRate(rate: number): void
	seek(trackMs: number): void
	reset(): void
	/** Only sources holding real resources (audio, object URLs) implement this. */
	dispose?(): void
	/** Audible sources only; a silent Clock has nothing to turn down. */
	getVolume?(): number
	setVolume?(value: number): void
}
