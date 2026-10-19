# Xelavi Song Writing Machine

Write a simple song on an A4 page, hear it, print it, save it.

- **Click to place.** Pick a note length, click the staff. Drag a note up or down to change the pitch — as far above or below the staff as you like, ledger lines are drawn for you.
- **Dot = longer.** Select a note and hit Dot: a dot after the note makes it half again as long (a dotted quarter lasts three eighths).
- **Treble (sol) and bass (fa) clefs**, one staff per band member.
- **Piano and cello panels** to find the right note by ear. In **Write** mode a click plays the note and writes it down; in **Just play** mode it only sounds, so you can try things out without touching the score.
- **Print / PDF** gives a clean A4 page, 1:1, engraved with the Bravura music font.
- **Save file / Open file** writes and reads plain `.xelavi.json`, so songs live on your own disk.
- Work in progress is also kept in the browser's local storage.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/
```

## Deploy to Vercel

It is a static Vite + React site — no server, no database, no environment variables.

```bash
npx vercel        # preview
npx vercel --prod # production
```

Or import the repository in the Vercel dashboard; the Vite preset (`npm run build` → `dist`) is detected automatically.

## Keyboard

| Key | Action |
| --- | --- |
| `1`–`5` | whole · half · quarter · eighth · sixteenth |
| `.` | dotted note |
| `R` | rest mode |
| `↑` `↓` | move the selected note by a step (`⇧` = an octave) |
| `←` `→` | select the previous / next note |
| `⌫` | delete the selected note |
| `space` | play / stop |
| `⌘Z` / `⇧⌘Z` | undo / redo |

## How it is put together

| Path | What it does |
| --- | --- |
| `src/music/model.js` | pitches, durations, keys, the score document |
| `src/music/layout.js` | page layout in millimetres: systems, bars, note positions |
| `src/components/Sheet.jsx` | SVG engraving — staves, clefs, beams, stems, rests |
| `src/audio/engine.js` | small Web Audio synth and the playback scheduler |
| `src/App.jsx` | editing, files, transport, toolbars |
