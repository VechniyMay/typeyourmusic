import { useEffect, useRef, useState, type DragEvent } from "react"
import { DEFAULT_DIFFICULTY, DIFFICULTIES, type DifficultyId } from "./core/difficulty"
import { parseLrc } from "./core/lrc"
import { buildTrack, type Track } from "./core/track"
import { AudioSource } from "./audio/audioSource"
import type { TimeSource } from "./core/clock"
import { BUILT_IN_SONGS, fetchSongFile } from "./songs"
import { GameStore } from "./ui/gameStore"
import { Session } from "./ui/Session"

export function App() {
	const [difficultyId, setDifficultyId] = useState<DifficultyId>(DEFAULT_DIFFICULTY)
	const [store, setStore] = useState<GameStore | null>(null)
	const [error, setError] = useState<string | null>(null)
	const storeRef = useRef<GameStore | null>(null)

	useEffect(() => () => storeRef.current?.dispose(), [])

	const launch = async (track: Track, audioUrl?: string): Promise<void> => {
		if (track.lines.length === 0) {
			setError("No timestamped lines found in that file")
			return
		}
		storeRef.current?.dispose()

		let source: TimeSource | undefined
		if (audioUrl) {
			const audio = new AudioSource(audioUrl, { ownsUrl: true })
			try {
				await audio.load()
			} catch (cause) {
				audio.dispose()
				setError(cause instanceof Error ? cause.message : "Could not play that audio")
				return
			}
			source = audio
		}

		const next = new GameStore(track, difficultyId, source)
		storeRef.current = next
		setError(null)
		setStore(next)
		next.start()
	}

	const exit = (): void => {
		storeRef.current?.dispose()
		storeRef.current = null
		setStore(null)
	}

	const openBuiltIn = async (file: string): Promise<void> => {
		try {
			await launch(buildTrack(parseLrc(await fetchSongFile(file))))
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load that track")
		}
	}

	const onDrop = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
		event.preventDefault()
		const files = Array.from(event.dataTransfer.files)
		const lrc = files.find((file) => /\.lrc$/i.test(file.name))
		const audio = files.find((file) => file.type.startsWith("audio/"))

		if (!lrc) {
			setError("Drop a .lrc file, optionally together with its audio")
			return
		}

		const raw = await lrc.text()
		const track = buildTrack(parseLrc(raw), { title: lrc.name.replace(/\.lrc$/i, "") })
		await launch(track, audio ? URL.createObjectURL(audio) : undefined)
	}

	if (store) {
		return <Session store={store} difficultyId={difficultyId} onExit={exit} />
	}

	return (
		<div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-10 px-8">
			<header>
				<h1 className="text-4xl text-idle">
					music<span className="text-accent">type</span>
				</h1>
				<p className="mt-2 text-sm text-dim">
					Type the lyrics in time. Lines expire with the music, so keep up.
				</p>
			</header>

			<section className="flex flex-col gap-3">
				<h2 className="text-xs uppercase tracking-widest text-dim">difficulty</h2>
				<div className="flex flex-wrap gap-2">
					{Object.values(DIFFICULTIES).map((difficulty) => (
						<button
							key={difficulty.id}
							onClick={() => setDifficultyId(difficulty.id)}
							className={`rounded border px-4 py-2 text-sm ${
								difficulty.id === difficultyId
									? "border-accent text-accent"
									: "border-surface text-dim hover:border-dim hover:text-idle"
							}`}
						>
							{difficulty.label} <span className="text-dim">{difficulty.rate}×</span>
						</button>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-xs uppercase tracking-widest text-dim">tracks</h2>
				{BUILT_IN_SONGS.map((song) => (
					<button
						key={song.id}
						onClick={() => void openBuiltIn(song.file)}
						className="rounded border border-surface bg-surface/40 px-5 py-4 text-left text-idle hover:border-accent"
					>
						{song.id}
					</button>
				))}

				<div
					onDragOver={(event) => event.preventDefault()}
					onDrop={(event) => void onDrop(event)}
					className="rounded border border-dashed border-surface px-5 py-8 text-center text-sm text-dim"
				>
					drop an .lrc file here
				</div>

				{error ? <p className="text-sm text-miss">{error}</p> : null}
			</section>
		</div>
	)
}
