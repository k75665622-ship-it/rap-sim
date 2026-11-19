# Real songs for RAP LIFE

Every song in the game plays as the game builds it (a beat made in the browser,
plus the artist's voice when AI voices are on) until a real recording is added
here.

1. Put audio files in this folder (`.mp3`, `.m4a`, `.ogg` or `.wav`), e.g.
   `music/<npc id>/1.mp3`.
2. List them in `manifest.json`:

```json
{
  "artists": { "<npc id>": ["music/<npc id>/1.mp3", "music/<npc id>/2.mp3"] },
  "songs": { "<song id>": "music/some-file.mp3" }
}
```

A song listed under `songs` always plays that file. Otherwise, if its artist
has files, each of their songs gets one of them (always the same one). The
roster is built from a fixed seed, so ids are the same in every career.

To get each artist's id and a description of their sound to give a music
generator, open the game, open the browser console and run:

```js
copy(JSON.stringify(__rapMusicPrompts(), null, 2))
```

Files are only fetched when the game is served (`npm start`, Render, any
static host) — not when `dist/index.html` is opened straight from disk.
Check the licence of whatever made the audio before you publish it.
