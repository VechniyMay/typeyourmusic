## What makes it different from a typing test

A normal typing test measures how fast you go. This one decides *when* you go.
Each line lives for exactly as long as the singer takes to sing it: miss the
window and the remaining characters are marked missed and the line moves on
without you. Accuracy and completion are therefore two different numbers, and
the gap between them is the interesting one.

The cursor never blocks. A wrong key is recorded as wrong and the cursor still
advances — stopping to fix mistakes costs more than the mistakes themselves.

## Quick start

```bash
git clone https://github.com/your-username/typeyourmusic.git
cd typeyourmusic
npm install
npm run dev
```

Open `http://localhost:5173`, pick a difficulty, and either start the bundled
demo track or drag in your own files.

> **Drag the `.lrc` and the audio file in together.** Dropping only the `.lrc`
> is valid too — you get a silent run against the original timings.

### Controls

| Key | Action |
| --- | --- |
| any printable key | type the current line |
| `Backspace` | erase (disabled on Hard and Extreme) |
| `Esc` | pause |

## Where to get lyrics

Spotify has no lyrics API, so `.lrc` files come from elsewhere:

- **[LRCLIB](https://lrclib.net)** — free, open, no key required
- **[LRCGET](https://github.com/tranxuanthang/lrcget)** — desktop app, bulk
  downloads for a local library
- **syncedlyrics** — `pipx install syncedlyrics`, queries several providers

Lyrics are copyrighted. This repository ships only a metronome-style demo file;
your own tracks stay on your machine and are never uploaded anywhere.

## Difficulties

| Mode | Speed | Backspace | Preview lines |
| --- | --- | --- | --- |
| Practice | 0.6x | yes | 2 |
| Easy | 0.85x | yes | 2 |
| Normal | 1.0x | yes | 1 |
| Hard | 1.0x | no | 1 |
| Extreme | 1.25x | no | 0 |

Speed drives `playbackRate` on the audio element with `preservesPitch` on, so
slowing a song down does not detune the vocals.

## What the results screen tells you

- **WPM / raw** — correct characters per five, and the same before mistakes are
  subtracted
- **Accuracy** — correct keys divided by keys pressed: how clean your typing was
- **Completion** — correct characters divided by characters in the song: how
  much of it you actually kept up with
- **Rhythm** — mean absolute distance between each keystroke and the moment that
  character was "due"
- **Bias** — the signed version of the same number, reported as rushing or
  dragging

The timing chart plots that deviation across the whole track, so a drift that
builds up during a chorus is visible as a slope rather than hidden in an average.

## How the synchronisation works

This is the part of the project worth reading the source for. Three decisions
carry the whole thing.

**Audio is the clock, not a passenger.** The obvious design plays the song and
runs the timeline on `performance.now()`. Those two run off different
oscillators and drift apart within a minute, so every line starts landing late.
Instead, position is read from `audio.currentTime`.

**A clock interpolates between audio samples.** `currentTime` only updates a few
times per second, tied to the audio callback, so reading it every frame makes
the cursor stair-step. An internal `Clock` free-runs at 60fps and is nudged
toward the audio whenever a fresh sample arrives — but only when the gap exceeds
45ms, below which a correction reads as jitter rather than as a fix.

**Position is derived from an anchor, never accumulated.** Adding a delta each
frame adds a rounding error each frame. Instead the clock stores one
`(real time, track time)` pair and computes the rest:

```
now = anchorTrack + (realNow() - anchorReal) * rate
```

Error stays constant no matter how long the session runs. There is a test that
drives 10,000 samples through it and asserts the result is exact.

Everything impure lives at the edges: `requestAnimationFrame`, the audio
element, and the subscriber list React plugs into all sit in `GameStore`. The
engine only ever sees `reduce(state, event, context)`.

## Text normalisation

Lyrics are stripped before they ever reach the game: lowercased, punctuation
removed, and bracketed asides deleted along with their contents.

| Raw line | What you type |
| --- | --- |
| `Hello, World! Are you there?` | `hello world are you there` |
| `keep this (drop that) and this` | `keep this and this` |
| `[Verse 1] the line` | `the line` |

Reaching for Shift and a comma at 8 characters per second produces mistakes that
say nothing about whether you kept up with the song. Two details matter here:
hyphens become spaces rather than vanishing, so `well-known` never fuses into
one word, and a line that was nothing but an aside is dropped **without**
shifting its neighbours — line boundaries are read from the original file, so
removing an instrumental break does not stretch the line before it.

Disable it with `buildTrack(parsed, { normalize: false })`.

## Project layout

```
src/
  core/     pure logic: parser, clock, engine, scorer. no React, no DOM
  audio/    AudioSource — the audio element behind a TimeSource interface
  ui/       React layer: store bridge, playfield, results
  songs.ts  bundled track manifest
```

The `core/` directory has no browser imports at all, which is why it can be
tested as plain functions and why the engine is deterministic: feed it the same
events and you get the same state, byte for byte.

## Importing your own music

### 1. Get the audio

Any format the browser can play: `mp3`, `ogg`, `wav`, `m4a`, `flac`, `opus`.
The file is read locally through an object URL — nothing is uploaded.

### 2. Get a *synced* `.lrc` for that exact recording

```bash
# single track
curl "https://lrclib.net/api/get?artist_name=Artist&track_name=Title"

# or search first
curl "https://lrclib.net/api/search?q=title+artist"
```

Take the `syncedLyrics` field and save it as `track.lrc`. For a whole library,
[LRCGET](https://github.com/tranxuanthang/lrcget) does this in bulk and writes
the `.lrc` next to each audio file.

Make sure it is the **synced** variant — a plain lyrics file has no timestamps
and the game will reject it with *"No timestamped lines found"*.

### 3. Drop both files in together

Select the audio and the `.lrc`, drag them onto the drop zone as one selection.
They are matched by type, not by filename, so the names do not have to agree.

### The `.lrc` format, in case you write one by hand

```lrc
[ti:Track title]
[ar:Artist name]
[offset:0]

[00:12.30]first line
[00:16.85]second line
[00:21.00]
```

One timestamp per line, `[mm:ss.xx]`. A one-digit fraction is tenths, two is
centiseconds, three is milliseconds. A line may carry several timestamps if it
repeats.

The **empty timestamp at the end matters**: a line lasts until the next one
begins, so without a final marker the last line falls back to a flat four
seconds.

### If the lyrics run ahead of or behind the music

Use the `offset` tag, in milliseconds. Per the LRC spec a **positive value makes
the lyrics appear earlier**:

```lrc
[offset:250]
```

That is the right fix for a bad transcription. For a constant lag caused by your
own hardware — bluetooth headphones are the usual suspect — the fix belongs in
the player instead: `new AudioSource(url, { offsetMs: 150 })` in `src/App.tsx`.

### Bundling a track into the build

Drop the file into `public/songs/` and register it:

```ts
// src/songs.ts
export const BUILT_IN_SONGS: SongEntry[] = [
	{ id: "demo-metronome", file: "songs/demo-metronome.lrc" },
	{ id: "my-track", file: "songs/my-track.lrc" },
]
```

It then appears in the menu and starts with one click. Keep in mind that
anything committed here is published with the site — bundle lyrics you have the
right to distribute, and leave everything else to the drop zone.

### Troubleshooting

| Symptom | Cause |
| --- | --- |
| *No timestamped lines found* | plain lyrics, not a synced `.lrc` |
| *That audio file could not be decoded* | codec the browser cannot play — try mp3 |
| Text runs ahead or behind the whole song | wrong `offset`, see above |
| Drift that grows over minutes | audio and lyrics are different releases |
| Track starts silent | dropped the `.lrc` alone; add the audio file |

The last row is a feature, not a bug: a silent run against real timings is a
perfectly good way to practise a song you cannot play out loud.

## Development

```bash
npm run dev         # dev server on :5173
npm test            # 34 unit tests
npm run test:watch  # same, in watch mode
npx tsc --noEmit    # type check
npm run build       # production bundle into dist/
npm run preview     # serve the built bundle
```

Tests cover the parts where a bug would stay invisible until it ruined a run:
timestamp parsing down to the centisecond, clock drift across 10,000 samples,
cursor behaviour after a mistake, line expiry, and the scoring maths.

## Deploying to GitHub Pages

```bash
GITHUB_PAGES=1 npm run build
```

The env var switches the Vite `base` to `/typeyourmusic/`; without it the build
assumes it is served from the domain root. The output in `dist/` is fully
static — any file host will do.

## Tech

React 19 · TypeScript 5.7 (strict, `noUncheckedIndexedAccess`) · Vite 6 ·
Tailwind 4 · Vitest. No backend, no state library, no audio library — one long
track needs streaming, not a sprite engine.

## License

MIT
