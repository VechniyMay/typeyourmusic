/**
 * Audio is the master clock, not a decoration.
 *
 * If the timeline kept running on performance.now() while the song played
 * separately, the two would drift apart within a minute and every line would
 * land late. So position comes from `audio.currentTime`, and Clock is demoted
 * to an interpolator: currentTime only updates a few times per second, and
 * reading it raw would make the cursor stutter at 60fps.
 */
import { Clock, type TimeSource } from "../core/clock"

/** Below this, a correction is felt as jitter rather than as a fix. */
const RESYNC_THRESHOLD_MS = 45

export type AudioSourceOptions = {
	/** Positive = lyrics wait longer. Compensates output latency. */
	offsetMs?: number
	volume?: number
	/** Revoke the object URL on dispose (true for dropped files). */
	ownsUrl?: boolean
}

export class AudioSource implements TimeSource {
	private readonly clock = new Clock()
	private readonly element: HTMLAudioElement
	private readonly url: string
	private readonly ownsUrl: boolean
	private readonly offsetMs: number
	private lastSample = -1

	constructor(url: string, options: AudioSourceOptions = {}) {
		this.url = url
		this.ownsUrl = options.ownsUrl ?? false
		this.offsetMs = options.offsetMs ?? 0
		this.element = new Audio(url)
		this.element.preload = "auto"
		this.element.volume = options.volume ?? 0.8
		// Rate changes are a difficulty setting, so keep the singer in tune.
		this.element.preservesPitch = true
	}

	get playing(): boolean {
		return this.clock.playing
	}

	get rate(): number {
		return this.element.playbackRate
	}

	get audio(): HTMLAudioElement {
		return this.element
	}

	getVolume(): number {
		return this.element.volume
	}

	setVolume(value: number): void {
		// The element throws outside 0..1, and a slider can always send garbage.
		this.element.volume = Math.min(1, Math.max(0, value))
	}

	/** Resolves once the browser can actually play it, rejects on a bad file. */
	load(): Promise<void> {
		if (this.element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
			return Promise.resolve()
		}
		return new Promise<void>((resolve, reject) => {
			const cleanup = (): void => {
				this.element.removeEventListener("canplay", onReady)
				this.element.removeEventListener("error", onError)
			}
			const onReady = (): void => {
				cleanup()
				resolve()
			}
			const onError = (): void => {
				cleanup()
				reject(new Error("That audio file could not be decoded"))
			}
			this.element.addEventListener("canplay", onReady)
			this.element.addEventListener("error", onError)
			this.element.load()
		})
	}

	/**
	 * Nudge the interpolator toward the audio, but only when a genuinely new
	 * currentTime sample has arrived and the gap is big enough to matter.
	 */
	private sync(): void {
		const sample = this.element.currentTime * 1000 - this.offsetMs
		if (sample === this.lastSample) return
		this.lastSample = sample
		if (Math.abs(sample - this.clock.now()) > RESYNC_THRESHOLD_MS) {
			this.clock.seek(sample)
		}
	}

	now(): number {
		this.sync()
		return this.clock.now()
	}

	play(): void {
		// Autoplay policy: this must originate from a user gesture.
		void this.element.play().catch(() => undefined)
		this.clock.play()
	}

	pause(): void {
		this.element.pause()
		this.clock.pause()
	}

	setRate(rate: number): void {
		this.element.playbackRate = rate
		this.clock.setRate(rate)
	}

	seek(trackMs: number): void {
		this.element.currentTime = Math.max(0, trackMs) / 1000
		this.clock.seek(trackMs)
		this.lastSample = -1
	}

	reset(): void {
		this.element.pause()
		this.element.currentTime = 0
		this.clock.reset()
		this.lastSample = -1
	}

	dispose(): void {
		this.element.pause()
		this.element.removeAttribute("src")
		this.element.load()
		if (this.ownsUrl) URL.revokeObjectURL(this.url)
	}
}
