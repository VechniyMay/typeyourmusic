import type { GameState } from "../core/engine"
import { summarize, type Deviation } from "../core/scorer"
import type { Track } from "../core/track"

type Props = {
	track: Track
	state: GameState
	onRestart: () => void
	onExit: () => void
}

/** Timing error over the course of the track: above the line = dragging. */
function TimingChart({ deviations, duration }: { deviations: Deviation[]; duration: number }) {
	if (deviations.length < 2 || duration <= 0) return null

	const width = 640
	const height = 120
	const scale = 400 // ms mapped to half the chart height
	const points = deviations
		.map((d) => {
			const x = (d.time / duration) * width
			const clamped = Math.max(-scale, Math.min(scale, d.delta))
			const y = height / 2 + (clamped / scale) * (height / 2)
			return `${x.toFixed(1)},${y.toFixed(1)}`
		})
		.join(" ")

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Timing deviation">
			<line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#1c1c26" strokeWidth="2" />
			<polyline points={points} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
		</svg>
	)
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs uppercase tracking-widest text-dim">{label}</span>
			<span className="text-3xl text-idle">{value}</span>
			{hint ? <span className="text-xs text-dim">{hint}</span> : null}
		</div>
	)
}

export function ResultScreen({ track, state, onRestart, onExit }: Props) {
	const summary = summarize(track, state)
	const biasLabel =
		Math.abs(summary.bias) < 15
			? "right on the beat"
			: summary.bias < 0
				? `rushing by ${Math.round(-summary.bias)}ms`
				: `dragging by ${Math.round(summary.bias)}ms`

	return (
		<div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-10 px-8">
			<header>
				<p className="text-sm text-dim">run complete</p>
				<h1 className="text-2xl text-idle">
					{track.title} <span className="text-dim">— {track.artist}</span>
				</h1>
			</header>

			<div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
				<Metric label="wpm" value={String(Math.round(summary.wpm))} hint={`raw ${Math.round(summary.rawWpm)}`} />
				<Metric label="accuracy" value={`${Math.round(summary.accuracy * 100)}%`} hint={`${summary.wrong} wrong`} />
				<Metric label="completion" value={`${Math.round(summary.completion * 100)}%`} hint={`${summary.missed} missed`} />
				<Metric label="max combo" value={String(summary.maxCombo)} hint={`${summary.keystrokes} keys`} />
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-baseline justify-between text-xs uppercase tracking-widest text-dim">
					<span>rhythm ±{Math.round(summary.rhythmAccuracy)}ms</span>
					<span className="text-accent">{biasLabel}</span>
				</div>
				<TimingChart deviations={summary.deviations} duration={track.duration} />
			</div>

			<div className="flex gap-4">
				<button
					className="rounded border border-accent px-6 py-3 text-accent hover:bg-accent/10"
					onClick={onRestart}
				>
					play again
				</button>
				<button
					className="rounded border border-dim px-6 py-3 text-dim hover:border-idle hover:text-idle"
					onClick={onExit}
				>
					pick another track
				</button>
			</div>
		</div>
	)
}
