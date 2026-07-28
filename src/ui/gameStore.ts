/**
 * Bridge between the pure core and the browser.
 *
 * Owns the three impure things the engine refuses to know about: the Clock,
 * requestAnimationFrame, and the subscriber list React plugs into. The engine
 * itself still only ever sees (state, event).
 */
import { Clock, type TimeSource } from "../core/clock"
import { DIFFICULTIES, type DifficultyId } from "../core/difficulty"
import {
	createInitialState,
	reduce,
	type EngineContext,
	type GameEvent,
	type GameState,
} from "../core/engine"
import type { Track } from "../core/track"

export class GameStore {
	private state: GameState
	private readonly listeners = new Set<() => void>()
	private readonly source: TimeSource
	private readonly ctx: EngineContext
	private frame = 0
	/** Every input event, in order: replaying this list reproduces the run. */
	private readonly recording: GameEvent[] = []

	/** No source given = silent run on a plain Clock, exactly as before. */
	constructor(track: Track, difficultyId: DifficultyId, source: TimeSource = new Clock()) {
		this.source = source
		this.ctx = { track, difficulty: DIFFICULTIES[difficultyId] }
		this.state = createInitialState(track)
		this.source.setRate(this.ctx.difficulty.rate)
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	/** Identity only changes when the reducer actually produced a new state. */
	getSnapshot = (): GameState => this.state

	get track(): Track {
		return this.ctx.track
	}

	get replay(): readonly GameEvent[] {
		return this.recording
	}

	get running(): boolean {
		return this.source.playing
	}

	/** False for a silent run, so the UI knows to hide the slider. */
	get hasAudio(): boolean {
		return typeof this.source.setVolume === "function"
	}

	getVolume(): number {
		return this.source.getVolume?.() ?? 0
	}

	setVolume(value: number): void {
		this.source.setVolume?.(value)
	}

	private emit(): void {
		for (const listener of this.listeners) listener()
	}

	private dispatch(event: GameEvent): void {
		const next = reduce(this.state, event, this.ctx)
		if (next === this.state) return
		this.state = next
		this.emit()
	}

	private loop = (): void => {
		this.dispatch({ type: "tick", time: this.source.now() })
		if (this.state.status === "finished") {
			this.source.pause()
			this.frame = 0
			return
		}
		this.frame = requestAnimationFrame(this.loop)
	}

	start(): void {
		this.source.reset()
		this.source.setRate(this.ctx.difficulty.rate)
		this.state = createInitialState(this.ctx.track)
		this.recording.length = 0
		this.source.play()
		this.emit()
		this.frame = requestAnimationFrame(this.loop)
	}

	pause(): void {
		if (!this.source.playing) return
		this.source.pause()
		if (this.frame) cancelAnimationFrame(this.frame)
		this.frame = 0
		this.emit()
	}

	resume(): void {
		if (this.source.playing || this.state.status === "finished") return
		this.source.play()
		this.frame = requestAnimationFrame(this.loop)
		this.emit()
	}

	key(char: string): void {
		if (!this.source.playing) return
		const event: GameEvent = { type: "key", char, time: this.source.now() }
		this.recording.push(event)
		this.dispatch(event)
	}

	backspace(): void {
		if (!this.source.playing) return
		const event: GameEvent = { type: "backspace", time: this.source.now() }
		this.recording.push(event)
		this.dispatch(event)
	}

	dispose(): void {
		this.source.pause()
		this.source.dispose?.()
		if (this.frame) cancelAnimationFrame(this.frame)
		this.frame = 0
		this.listeners.clear()
	}
}
