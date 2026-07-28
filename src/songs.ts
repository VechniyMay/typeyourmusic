/** Bundled tracks. Adding a song = dropping an .lrc in public/songs and listing it here. */
export type SongEntry = {
	id: string
	file: string
}

export const BUILT_IN_SONGS: SongEntry[] = [
	{ id: "demo-metronome", file: "songs/demo-metronome.lrc" },
]

export async function fetchSongFile(file: string): Promise<string> {
	const response = await fetch(`${import.meta.env.BASE_URL}${file}`)
	if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`)
	return response.text()
}
