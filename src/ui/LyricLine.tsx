import type { CharStatus, LineState } from "../core/engine"
import type { Line } from "../core/track"

const CHAR_CLASS: Record<CharStatus, string> = {
	pending: "text-dim",
	correct: "text-hit",
	wrong: "text-miss underline decoration-2 underline-offset-4",
	missed: "text-miss/35",
}

type Props = {
	line: Line
	state?: LineState
	active: boolean
}

export function LyricLine({ line, state, active }: Props) {
	if (!active || !state) {
		return <p className="truncate text-xl text-dim/45">{line.text}</p>
	}

	return (
		<p className="text-4xl leading-snug tracking-tight">
			{line.chars.map((char, index) => (
				<span
					key={index}
					className={`${CHAR_CLASS[state.statuses[index] ?? "pending"]} ${
						index === state.cursor ? "-ml-px border-l-2 border-accent" : ""
					}`}
				>
					{char === " " ? "\u00a0" : char}
				</span>
			))}
		</p>
	)
}
