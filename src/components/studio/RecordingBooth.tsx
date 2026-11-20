// ─── THE BOOTH ─────────────────────────────────────────────────────────────
// Put your headphones on, the beat drops, and you rap into the mic — for
// real, up to 1:30. Two ways in:
//   · a NEW SONG: pick any beat (yours, or a free house beat), hit record,
//     and the take you keep becomes the song. Writing is optional — there's a
//     notepad if you want one, and a freestyle is scored on your freestyle.
//   · an existing record in the vault: re-cut its vocal.
// Then make it sound like you: levels, presets and effects that move live
// while it plays, a timing nudge, and a download of the finished song.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { BeatPlayer, beatSpecFor, STYLE_LABEL, LEAD_LABEL, type BeatSpec } from '../../audio/beat';
import { saveTake, loadTake, scoreTake, type TakeScore } from '../../audio/take';
import { calibrationNudge, setupSeen, type Calibration } from '../../audio/calibrate';
import { BoothSetup } from './BoothSetup';
import { splice, alignLayer, bake, toWav, LAYER_KINDS, type LayerKind } from '../../audio/takeedit';
import { stopPreview } from '../../audio/preview';
import { levelFor, DEFAULT_FX, FX_PRESETS, withPreset, suggestedPreset, playMix, renderSong, downloadBlob, createBus, prepareVocal, type Mix, type Prepared } from '../../audio/vocalfx';
import { BarStrip } from './BarStrip';
import { houseBeats, beatGrade, type OwnedBeat } from '../../sim/beats';
import { MOODS } from '../../sim/studio';
import { dateToSerial } from '../../sim/gameClock';
import type { SongMood, VocalFx } from '../../types/game';
import { cn } from '@/utils/cn';

const MAX_SECONDS = 90;
const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
type Take = { id: number; blob: Blob; url: string; seconds: number; lead: number; sc?: TakeScore; layers?: { kind: LayerKind; blob: Blob }[] };
type Pass = { kind: 'take' | 'punch' | LayerKind; target?: Take; bar?: number };
const tier = (n: number) => (n >= 80 ? 'Studio ready' : n >= 60 ? 'Solid' : n >= 40 ? 'Rough' : 'Redo');
const MODE_KEY = 'rl_vox_mode';

function pickMime(): string {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const m of opts) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m;
  return '';
}
const specOf = (b: OwnedBeat) => beatSpecFor(String(b.genre), b.bpm, b.id, b.quality, b.producerId ?? b.producerName, b.mood);
const keyOf = (sp: BeatSpec) => `${KEYS[sp.root]}${sp.major ? '' : 'm'}`;
const barOf = (sp: BeatSpec | null) => (60 / (sp?.bpm ?? 90)) * 4;

function Knob({ label, value, min, max, step = 1, show, onChange }: { label: string; value: number; min: number; max: number; step?: number; show?: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-[11px] text-ink3">
      <span className="flex justify-between"><span>{label}</span><span className="text-ink2 num">{show ?? Math.round(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber" />
    </label>
  );
}

export function RecordingBooth({ onClose, songId: initial, fresh, beatId: initialBeat, onDone, onWrite }: {
  onClose: () => void; songId?: string; fresh?: boolean; beatId?: string; onDone?: (songId: string) => void; onWrite?: (beatId?: string) => void;
}) {
  const songs = useGameStore((s) => s.songs);
  const apply = useGameStore((s) => s.applyBoothTake);
  const create = useGameStore((s) => s.createRecordedSong);
  const saveFx = useGameStore((s) => s.setVocalFx);
  const saveHook = useGameStore((s) => s.setHookBars);
  const player = useGameStore((s) => s.player);
  const gameDate = useGameStore((s) => s.gameDate);
  const library = useGameStore((s) => s.beats?.library);
  const vault = useMemo(() => songs.filter((x) => !isSongReleased(x) && !x.archivedAt), [songs]);
  const [songId, setSongId] = useState(initial ?? vault[0]?.id ?? '');
  const song = fresh ? undefined : songs.find((x) => x.id === songId);

  // ── New song: the beats you can rap on ──
  const mine = useMemo(() => (library ?? []).filter((b) => !b.usedOnSongId).sort((a, b) => b.acquiredSerial - a.acquiredSerial).slice(0, 12), [library]);
  const house = useMemo(() => player ? houseBeats(player.genre, Math.floor(dateToSerial(gameDate) / 7), player.stats.productionKnowledge ?? 0).filter((h) => !(library ?? []).some((b) => b.id === h.id)) : [], [player, gameDate, library]);
  const [beatKey, setBeatKey] = useState(initialBeat ?? mine[0]?.id ?? house[0]?.id ?? '');
  const picked = fresh ? [...mine, ...house].find((b) => b.id === beatKey) : undefined;
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<SongMood | ''>('');
  const [lyrics, setLyrics] = useState('');
  const [pad, setPad] = useState(false);
  const [made, setMade] = useState<{ id: string; blob: Blob; lead: number } | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);

  const spec: BeatSpec | null = useMemo(() => {
    if (fresh) return picked ? specOf(picked) : null;
    if (!song) return null;
    const owned = library?.find((b) => b.id === song.beatId || b.usedOnSongId === song.id);
    return owned ? specOf(owned)
      : beatSpecFor(String(song.genre), song.bpm, song.beatId ?? song.id, song.beatQuality ?? song.productionQuality ?? 60, song.producerId ?? song.producerName, song.mood);
  }, [fresh, picked, song, library]);

  // ── The sound ──
  const [fx, setFx] = useState<VocalFx>(() => {
    if (!fresh) return songs.find((x) => x.id === (initial ?? vault[0]?.id))?.vocalFx ?? DEFAULT_FX;
    const b = [...mine, ...house].find((x) => x.id === (initialBeat ?? mine[0]?.id ?? house[0]?.id));
    const base = { ...DEFAULT_FX, nudgeMs: calibrationNudge() };
    return b ? withPreset(base, suggestedPreset(specOf(b).style)) : base;
  });
  const [fxTouched, setFxTouched] = useState(false);
  const [hookBars, setHookBars] = useState<number[]>(() => (fresh ? [] : songs.find((x) => x.id === (initial ?? vault[0]?.id))?.hookBars ?? []));
  const [tuning, setTuning] = useState<number | null>(null);
  const [playBar, setPlayBar] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [engineer, setEngineer] = useState(() => { try { return localStorage.getItem(MODE_KEY) === 'engineer'; } catch { return false; } });
  const [setup, setSetup] = useState(() => fresh && !setupSeen());
  const pickMode = (e: boolean) => { setEngineer(e); try { localStorage.setItem(MODE_KEY, e ? 'engineer' : 'quick'); } catch { /* ignore */ } };
  const suggested = spec ? suggestedPreset(spec.style) : 'clean';

  const [mode, setMode] = useState<'idle' | 'preview' | 'count' | 'rec' | 'play'>('idle');
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [rendering, setRendering] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<Blob | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const busRef = useRef<GainNode | null>(null);
  const beatRef = useRef<BeatPlayer | null>(null);
  const mixRef = useRef<Mix | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const decoded = useRef(new WeakMap<Blob, AudioBuffer>());
  const monitorRef = useRef<AudioBufferSourceNode | null>(null);
  const [recKind, setRecKind] = useState<'take' | 'punch' | LayerKind>('take');
  const [punch, setPunch] = useState<{ id: number; bar: number } | null>(null);

  useEffect(() => { let on = true; if (!fresh && songId) loadTake(songId).then((b) => { if (on) setSaved(b); }); return () => { on = false; }; }, [songId, fresh]);
  useEffect(() => {
    if (mode !== 'play' || !spec) { setPlayBar(null); return; }
    const id = window.setInterval(() => { const m = mixRef.current; const c = ctxRef.current; if (!m || !c) return; setPlayBar(Math.floor((c.currentTime - m.startedAt) / barOf(spec)) - 1); }, 150);
    return () => window.clearInterval(id);
  }, [mode, spec]);
  useEffect(() => () => { stopAll(); takes.forEach((t) => URL.revokeObjectURL(t.url)); ctxRef.current?.close().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function ctx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }
  function bus(): GainNode {
    const c = ctx();
    if (!busRef.current) busRef.current = createBus(c, c.destination);
    return busRef.current;
  }
  async function decode(blob: Blob): Promise<AudioBuffer> {
    const hit = decoded.current.get(blob);
    if (hit) return hit;
    const buf = await ctx().decodeAudioData(await blob.arrayBuffer());
    decoded.current.set(blob, buf);
    return buf;
  }
  /** The take as it should sound: tuned into the beat's key, and a harmony for the hook if asked. */
  async function ready(blob: Blob, layers?: Take['layers']): Promise<Prepared> {
    const buf = await decode(blob);
    const slow = (fx.tune ?? 0) > 0 || ((fx.harmony ?? 0) > 0 && hookBars.length > 0);
    if (slow) setTuning(0);
    try {
      const v = await prepareVocal(ctx(), buf, fx, { root: spec!.root, major: spec!.major }, hookBars, (p) => setTuning(p));
      if (layers?.length) v.layers = await Promise.all(layers.map(async (l) => { const b = await decode(l.blob); return { buf: b, gain: LAYER_KINDS[l.kind].gain * (levelFor(b) / Math.max(1e-6, v.gain)) }; }));
      return v;
    }
    finally { setTuning(null); }
  }
  function stopAll() {
    beatRef.current?.stop(); beatRef.current = null;
    mixRef.current?.stop(); mixRef.current = null;
    try { monitorRef.current?.stop(); } catch { /* ended */ } monitorRef.current = null;
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    if (tickRef.current !== null) cancelAnimationFrame(tickRef.current); tickRef.current = null;
    setLevel(0);
    setPreviewing(null);
    setPlayingId(null);
  }
  function change(next: VocalFx, touched = true) {
    setFx(next);
    if (touched) setFxTouched(true);
    mixRef.current?.setFx(next);
    beatRef.current?.setVolume(next.beat);
  }
  /** One tap: the preset that suits the beat, then levels set from how this take actually sounds. */
  function autoMix() {
    const sc = takes[takes.length - 1]?.sc;
    let next = withPreset(fx, suggested);
    if (sc) {
      next = { ...next, voice: sc.presence < 45 ? 1.25 : sc.presence > 90 ? 0.95 : 1.1, punch: Math.min(100, next.punch + (sc.energy < 55 ? 15 : 0)) };
      if ((sc.clean ?? 100) < 60) next = { ...next, denoise: Math.min(100, 70 + (60 - (sc.clean ?? 0)) / 2) };
      if ((sc.clean ?? 100) < 45) next = { ...next, reverb: Math.max(0, next.reverb - 12), echo: Math.max(0, next.echo - 8), grit: Math.max(0, next.grit - 10) };
    }
    change(next);
    setMsg(sc ? `✨ Auto-mixed for your take — ${FX_PRESETS.find((p) => p.id === next.preset)?.label} sound, levels set from the recording.` : '✨ Auto-mixed — picked the sound that suits this beat.');
  }
  function startBeat(at: number, sp: BeatSpec = spec!) {
    stopPreview();
    const b = new BeatPlayer(ctx(), sp, bus(), fx.beat);
    b.start(at);
    beatRef.current = b;
  }
  /** Pick a beat. With takes already cut on another beat, it asks first. */
  function choose(b: OwnedBeat): boolean {
    if (mode === 'rec' || mode === 'count') return false;
    if (b.id === beatKey) return true;
    if (takes.length && pendingSwitch !== b.id) {
      setPendingSwitch(b.id);
      setMsg(`Your ${takes.length === 1 ? 'take is' : `${takes.length} takes are`} on "${picked?.name}". Switching to "${b.name}" clears ${takes.length === 1 ? 'it' : 'them'} — tap it again to switch.`);
      return false;
    }
    stopAll(); setMode('idle');
    takes.forEach((t) => URL.revokeObjectURL(t.url));
    setTakes([]); setMsg(null); setMade(null); setPendingSwitch(null);
    setBeatKey(b.id);
    if (!fxTouched) change(withPreset(fx, suggestedPreset(specOf(b).style)), false);
    return true;
  }
  function preview(b?: OwnedBeat) {
    const key = b?.id ?? 'current';
    if (mode === 'preview' && previewing === key) { stopAll(); setMode('idle'); return; }
    // The beat you play is the beat you record on.
    if (b && !choose(b)) return;
    stopAll();
    startBeat(ctx().currentTime + 0.05, b ? specOf(b) : spec!);
    setPreviewing(key);
    setMode('preview');
  }
  /** One trip into the booth: a fresh take, a punch-in on part of a take, or an ad-lib / harmony layer over a take. */
  async function record(pass: Pass = { kind: 'take' }) {
    if (!spec) return;
    const target = pass.target;
    if (pass.kind === 'take' && takes.length >= 3) { setMsg('Three takes max — delete one first.'); return; }
    stopAll();
    setMsg(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
    } catch {
      setMsg('The game needs your microphone for this. Allow it in your browser and try again.');
      return;
    }
    streamRef.current = stream;
    const c = ctx();
    const an = c.createAnalyser(); an.fftSize = 512;
    c.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: BlobPart[] = [];
    const at = c.currentTime + 0.05;
    const bar = barOf(spec);
    // When, on the beat's clock, the mic opens: after the count-in bar, or at the bar you punch in.
    const punchAt = pass.kind === 'punch' && target ? target.lead + (pass.bar ?? 0) * bar : null;
    const openAt = punchAt ?? bar;
    let lead = bar;
    rec.onstart = () => {
      const out = (c as AudioContext & { outputLatency?: number }).outputLatency || c.baseLatency || 0;
      const inLat = (stream.getAudioTracks()[0]?.getSettings() as MediaTrackSettings & { latency?: number })?.latency || 0;
      lead = Math.max(0, Math.min(openAt + 0.6, c.currentTime - at - out - inLat));
    };
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      const seconds = Math.min(MAX_SECONDS, Math.round((performance.now() - startRef.current) / 1000));
      if (pass.kind === 'take') {
        if (seconds < 3) { setMsg('Too short — rap for at least a few seconds.'); return; }
        const id = Date.now();
        setTakes((t) => [...t, { id, blob, url: URL.createObjectURL(blob), seconds, lead }]);
        decode(blob).then((b) => scoreTake(ctx(), b, spec.bpm)).then((sc) => setTakes((t) => t.map((x) => (x.id === id ? { ...x, sc } : x)))).catch(() => {});
        return;
      }
      if (!target || seconds < 1) { setMsg('Too short — nothing was changed.'); return; }
      try {
        const old = await decode(target.blob); const neu = await decode(blob);
        const shift = lead - target.lead;
        if (pass.kind === 'punch') {
          const out = toWav(splice(ctx(), old, neu, shift));
          const fresh = { ...target, blob: out, url: URL.createObjectURL(out), seconds: Math.max(target.seconds, Math.round(seconds + Math.max(0, shift))), sc: undefined };
          URL.revokeObjectURL(target.url);
          setTakes((t) => t.map((x) => (x.id === target.id ? fresh : x)));
          decode(out).then((b) => scoreTake(ctx(), b, spec.bpm)).then((sc) => setTakes((t) => t.map((x) => (x.id === target.id ? { ...x, sc } : x)))).catch(() => {});
          setMsg(`↻ Punched in from bar ${(pass.bar ?? 0) + 1}. Play the take to hear it.`);
        } else {
          const kind = pass.kind;
          const lay = toWav(alignLayer(ctx(), neu, shift, old.length));
          setTakes((t) => t.map((x) => (x.id === target.id ? { ...x, layers: [...(x.layers ?? []).filter((l) => l.kind !== kind), { kind, blob: lay }] } : x)));
          setMsg(`${LAYER_KINDS[kind].emoji} ${LAYER_KINDS[kind].label} added. Play the take to hear it with the beat.`);
        }
      } catch { setMsg('Could not add that recording. Try again.'); }
    };
    recRef.current = rec;
    startBeat(at);
    // Hear what you're recording over: the take itself, until the punch-in point.
    if (target) {
      try {
        const src = c.createBufferSource(); src.buffer = await decode(target.blob);
        const g = c.createGain(); g.gain.value = Math.min(1.2, levelFor(src.buffer) * 0.8);
        src.connect(g).connect(bus());
        src.start(at + Math.max(0, target.lead + fx.nudgeMs / 1000));
        if (punchAt !== null) src.stop(at + punchAt);
        monitorRef.current = src;
      } catch { /* no monitor — you still record */ }
    }
    setRecKind(pass.kind);
    setMode('count');
    window.setTimeout(() => { if (recRef.current !== rec) return; rec.start(); startRef.current = performance.now(); setMode('rec'); }, Math.max(0, (at - c.currentTime + openAt) * 1000));
    const cap = pass.kind === 'take' || pass.kind === 'punch' ? MAX_SECONDS : Math.max(3, target?.seconds ?? MAX_SECONDS);
    const loop = () => {
      an.getByteTimeDomainData(buf);
      let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 90));
      if (recRef.current?.state === 'recording') {
        const s = (performance.now() - startRef.current) / 1000;
        setElapsed(s);
        if (s >= cap) { stopAll(); setMode('idle'); return; }
      }
      tickRef.current = requestAnimationFrame(loop);
    };
    tickRef.current = requestAnimationFrame(loop);
  }
  function stop() { stopAll(); setMode('idle'); }
  async function play(id: string, blob: Blob, lead: number, layers?: Take['layers']) {
    if (playingId === id) { stopAll(); setMode('idle'); return; }
    stopAll(); stopPreview();
    if (!spec) return;
    try {
      const voice = await ready(blob, layers);
      mixRef.current = playMix(ctx(), spec, voice, fx, lead, hookBars, () => { mixRef.current = null; setPlayingId(null); setMode('idle'); });
      setPlayingId(id);
      setMode('play');
    } catch {
      setMsg('Could not play that take. Try recording it again.');
    }
  }
  async function download(id: string, blob: Blob, lead: number, name: string, layers?: Take['layers']) {
    if (!spec || rendering) return;
    setRendering(id);
    try {
      const out = await renderSong(spec, await ready(blob, layers), fx, lead, hookBars);
      downloadBlob(out, `${name}${player?.artistName ? ` - ${player.artistName}` : ''}.wav`);
    } catch {
      setMsg('Could not render the song on this device.');
    }
    setRendering(null);
  }
  async function useTake(t0: Take) {
    if (!spec) return;
    let t = t0;
    stopAll(); setMode('idle');
    setMsg('Listening back…');
    try {
      // Ad-libs and harmonies you laid down are folded into the vocal that gets saved.
      if (t0.layers?.length) {
        const main = await decode(t0.blob);
        const folded = toWav(bake(ctx(), main, await Promise.all(t0.layers.map(async (l) => ({ kind: l.kind, buf: await decode(l.blob) })))));
        t = { ...t0, blob: folded };
      }
      const buf = await decode(t.blob);
      const sc = await scoreTake(ctx(), buf, spec.bpm);
      // How far your words sit from the beat's grid — what an engineer uses to line the vocal up.
      const grid = 60 / spec.bpm / 4;
      let off = (sc.phase + t.lead) % grid; if (off > grid / 2) off -= grid;
      const align = sc.R >= 0.3 ? Math.max(-150, Math.min(150, Math.round(-(off - 0.015) * 1000))) : undefined;
      if (fresh) {
        if (!picked) return;
        const r = create({ beat: { kind: library?.some((b) => b.id === picked.id) ? 'owned' : 'house', id: picked.id }, title, mood: mood || undefined, lyrics, fx, hookBars, take: { ...sc, lead: t.lead, align } });
        if (r.ok && r.songId) { await saveTake(r.songId, t.blob); setMade({ id: r.songId, blob: t.blob, lead: t.lead }); }
        setMsg(r.message);
        return;
      }
      if (!song) return;
      // A take worse than the vocal you already have needs a second tap.
      const have = song.vocalPerformance ?? 50;
      if (sc.score + 5 < have && confirmId !== t.id) { setConfirmId(t.id); setMsg(`That take scores ${sc.score}/100 (on-beat ${sc.timing}) — weaker than the vocal you already have (${have}). Tap "Use it" again to use it anyway, or record another.`); return; }
      setConfirmId(null);
      const r = apply(song.id, { ...sc, lead: t.lead, align, fx });
      if (r.ok) { await saveTake(song.id, t.blob); setSaved(t.blob); }
      setMsg(r.message);
    } catch {
      setMsg('Could not read that take. Try recording it again.');
    }
  }
  function another() {
    takes.forEach((t) => URL.revokeObjectURL(t.url));
    setTakes([]); setMade(null); setMsg(null); setTitle(''); setLyrics(''); setHookBars([]);
    const next = [...mine, ...house].find((b) => b.id !== beatKey && !(library ?? []).some((x) => x.id === b.id && x.usedOnSongId));
    if (next) setBeatKey(next.id);
  }

  const busy = mode !== 'idle';
  const live = mode === 'rec' || mode === 'count';
  const close = () => { stopAll(); onClose(); };
  const savedLead = song?.boothTake?.lead ?? barOf(spec);
  const stripBars = Math.min(60, Math.ceil(Math.max(song?.boothTake?.seconds ?? 0, ...takes.map((t) => t.seconds), 8) / barOf(spec)));
  const songName = (fresh ? title.trim() || picked?.name : song?.title) || 'My song';

  // Lyrics prompter: two bars to a line, scrolling with the beat.
  const pLines = lyrics.split('\n').map((l) => l.trim()).filter(Boolean);
  const pIdx = spec ? Math.max(0, Math.floor(elapsed / (barOf(spec) * 2))) : 0;
  const prompter = pLines.length > 0 ? (
    <div className="rounded-[14px] bg-black/50 border border-white/10 px-4 py-3 text-left space-y-1 overflow-hidden" aria-live="off">
      {[-1, 0, 1, 2].map((d) => { const l = pLines[pIdx + d]; return l ? <div key={pIdx + d} className={cn('transition-all duration-300 leading-snug', d === 0 ? 'text-[20px] font-bold text-ink' : d < 0 ? 'text-[12px] text-ink3/60' : 'text-[14px] text-ink2')}>{l}</div> : null; })}
      {pIdx >= pLines.length && <div className="text-[12px] text-ink3">— out of lines, freestyle it —</div>}
    </div>
  ) : null;

  const beatCard = (b: OwnedBeat, free: boolean) => {
    const sp = specOf(b);
    const on = b.id === beatKey;
    return (
      <div key={b.id} onClick={() => choose(b)} role="button" tabIndex={0} aria-pressed={on} className={cn('shrink-0 w-[152px] rounded-[14px] border p-3 cursor-pointer transition text-left', on ? 'border-amber bg-amber/10 ring-1 ring-amber/40' : 'border-line bg-black/30 hover:border-amber/50', pendingSwitch === b.id && 'border-fall/70')}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0"><div className="text-[12px] font-semibold text-ink truncate">{b.name}</div><div className="text-[10px] text-ink3 truncate">{free ? 'Free · house beat' : `Prod. ${b.producerName}`}</div></div>
          <button onClick={(e) => { e.stopPropagation(); preview(b); }} disabled={live} aria-label={previewing === b.id ? 'Stop' : 'Play beat'} className={cn('w-8 h-8 rounded-full border text-[11px] shrink-0', previewing === b.id ? 'bg-amber text-black border-amber' : 'border-line text-ink2')}>{previewing === b.id ? '■' : '▶'}</button>
        </div>
        <div className="mt-2 text-[11px] text-ink2">{STYLE_LABEL[sp.style]} · {sp.bpm}</div>
        <div className="text-[10px] text-ink3">{keyOf(sp)} · {LEAD_LABEL[sp.lead]} · {beatGrade(b.quality)}</div>
        {on && <div className="mt-1.5 text-[10px] font-semibold text-amber">✓ Recording on this</div>}
      </div>
    );
  };

  const soundPanel = (
    <div className="rounded-[14px] border border-line bg-black/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-semibold text-ink">🎛️ Sound</div>
        <div className="flex rounded-full border border-line p-0.5 text-[11px]" role="group" aria-label="Mix mode">
          <button onClick={() => pickMode(false)} aria-pressed={!engineer} className={cn('px-3 h-6 rounded-full', !engineer ? 'bg-amber text-black font-semibold' : 'text-ink2')}>Quick</button>
          <button onClick={() => pickMode(true)} aria-pressed={engineer} className={cn('px-3 h-6 rounded-full', engineer ? 'bg-amber text-black font-semibold' : 'text-ink2')}>Engineer</button>
        </div>
      </div>
      {!engineer && <button onClick={autoMix} className="w-full h-10 rounded-[12px] bg-amber text-black font-bold text-[13px]">✨ Auto-mix — one tap, sounds decent</button>}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {FX_PRESETS.map((p) => (
          <button key={p.id} onClick={() => change(withPreset(fx, p.id))} title={p.blurb} className={cn('shrink-0 h-8 px-2.5 rounded-full border text-[11px] whitespace-nowrap', fx.preset === p.id ? 'border-amber bg-amber text-black font-semibold' : 'border-line text-ink2 hover:text-ink')}>
            {p.emoji} {p.label}{suggested === p.id ? ' ✨' : ''}
          </button>
        ))}
      </div>
      <div className="text-[10px] text-ink3 -mt-1">{FX_PRESETS.find((p) => p.id === fx.preset)?.blurb ?? 'Custom'}{suggested === fx.preset ? ' · ✨ suits this beat' : ''}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Knob label="🎤 Voice" value={fx.voice} min={0} max={1.5} step={0.05} show={`${Math.round(fx.voice * 100)}%`} onChange={(v) => change({ ...fx, voice: v })} />
        <Knob label="🥁 Beat" value={fx.beat} min={0} max={1.3} step={0.05} show={`${Math.round(fx.beat * 100)}%`} onChange={(v) => change({ ...fx, beat: v })} />
      </div>
      {engineer && <div className="rounded-[12px] border border-line/70 p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-ink">🎶 Auto-tune</span><span className="text-ink3">{spec ? `in ${keyOf(spec)} — the beat's key` : ''}</span></div>
        <div className="grid grid-cols-2 gap-x-4">
          <Knob label="Amount" value={fx.tune ?? 0} min={0} max={100} show={(fx.tune ?? 0) === 0 ? 'off' : `${Math.round(fx.tune ?? 0)}`} onChange={(v) => change({ ...fx, tune: v, preset: 'custom' })} />
          <Knob label="Snap" value={fx.tuneSpeed ?? 50} min={0} max={100} show={(fx.tuneSpeed ?? 50) >= 85 ? 'robotic' : (fx.tuneSpeed ?? 50) >= 45 ? 'quick' : 'natural'} onChange={(v) => change({ ...fx, tuneSpeed: v, preset: 'custom' })} />
        </div>
      </div>}
      {engineer && <div className="rounded-[12px] border border-line/70 p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-ink">📣 Hook</span><span className="text-ink3">{hookBars.length ? `${hookBars.length} bar${hookBars.length > 1 ? 's' : ''} marked` : 'tap the bars where your hook is'}</span></div>
        <BarStrip bars={stripBars} hook={hookBars} now={playBar} onToggle={(b) => setHookBars((h) => (h.includes(b) ? h.filter((x) => x !== b) : [...h, b].sort((x, y) => x - y)))} />
        <div className="grid grid-cols-2 gap-x-4">
          <Knob label="Hook lift" value={fx.hook ?? 0} min={0} max={100} show={(fx.hook ?? 0) === 0 ? 'off' : `${Math.round(fx.hook ?? 0)}`} onChange={(v) => change({ ...fx, hook: v, preset: 'custom' })} />
          <Knob label="Harmony" value={fx.harmony ?? 0} min={0} max={100} show={(fx.harmony ?? 0) === 0 ? 'off' : `${Math.round(fx.harmony ?? 0)}`} onChange={(v) => change({ ...fx, harmony: v, preset: 'custom' })} />
        </div>
      </div>}
      {tuning !== null && <div className="text-[11px] text-amber">🎶 Tuning the vocal… {Math.round(tuning * 100)}%</div>}
      <div className="text-[10px] text-ink3 -mt-1">Auto-tune, hook bars and timing apply the next time you press play.</div>
      {engineer && more && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Knob label="Reverb (room)" value={fx.reverb} min={0} max={100} onChange={(v) => change({ ...fx, reverb: v, preset: 'custom' })} />
            <Knob label="Echo" value={fx.echo} min={0} max={100} onChange={(v) => change({ ...fx, echo: v, preset: 'custom' })} />
            <Knob label="Tone" value={fx.tone} min={-50} max={50} show={fx.tone < -5 ? 'darker' : fx.tone > 5 ? 'brighter' : 'natural'} onChange={(v) => change({ ...fx, tone: v, preset: 'custom' })} />
            <Knob label="Punch (compression)" value={fx.punch} min={0} max={100} onChange={(v) => change({ ...fx, punch: v, preset: 'custom' })} />
            <Knob label="Grit (saturation)" value={fx.grit} min={0} max={100} onChange={(v) => change({ ...fx, grit: v, preset: 'custom' })} />
            <div className="text-[11px] text-ink3">Echo timing
              <div className="flex gap-1 mt-1">{(['1/8', '3/16', '1/4'] as const).map((t) => <button key={t} onClick={() => change({ ...fx, echoTime: t, preset: 'custom' })} className={cn('flex-1 h-7 rounded-[8px] border text-[11px]', fx.echoTime === t ? 'border-amber text-amber' : 'border-line text-ink2')}>{t}</button>)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Knob label="De-esser (soften S sounds)" value={fx.deess ?? 0} min={0} max={100} show={(fx.deess ?? 0) === 0 ? 'off' : `${Math.round(fx.deess ?? 0)}`} onChange={(v) => change({ ...fx, deess: v })} />
            <Knob label="Noise cleanup (rumble & hiss)" value={fx.denoise ?? 0} min={0} max={100} show={(fx.denoise ?? 0) === 0 ? 'off' : `${Math.round(fx.denoise ?? 0)}`} onChange={(v) => change({ ...fx, denoise: v })} />
          </div>
          <div className="flex gap-4 text-[12px] text-ink2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={fx.double} onChange={(e) => change({ ...fx, double: e.target.checked, preset: 'custom' })} /> Double (wide)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={fx.lofi} onChange={(e) => change({ ...fx, lofi: e.target.checked, preset: 'custom' })} /> Lo-fi</label>
          </div>
          <Knob label="⏱️ Timing — voice sounds late? slide left" value={fx.nudgeMs} min={-300} max={300} step={10} show={`${fx.nudgeMs > 0 ? '+' : ''}${fx.nudgeMs} ms`} onChange={(v) => change({ ...fx, nudgeMs: v })} />
        </div>
      )}
      <div className="flex items-center justify-between">
        {engineer ? <button onClick={() => setMore((v) => !v)} className="text-[11px] text-ink3 hover:text-ink2">{more ? '▴ Fewer controls' : '▾ Reverb, echo, tone, punch, grit, double, timing'}</button> : <span className="text-[10px] text-ink3">Switch to Engineer for every knob</span>}
        {!fresh && song && <button onClick={() => { saveHook(song.id, hookBars); setMsg(saveFx(song.id, fx).message); }} className="h-7 px-3 rounded-full border border-line text-[11px] text-ink2 hover:text-ink">💾 Save sound</button>}
      </div>
    </div>
  );

  return (
    <div className="studio-cinematic fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80" onClick={close} />
      <div className={cn('studio-booth-panel relative w-full max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-line p-5 space-y-4', fresh ? 'sm:max-w-[920px]' : 'sm:max-w-[860px]')} style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,72,72,0.22), rgba(10,11,16,0) 60%), #0c0d12' }}>
        <div className="flex items-center justify-between">
          <div><div className="text-[18px] font-bold text-ink">🎙️ {fresh ? 'New song' : 'Recording booth'}</div><div className="text-[11px] text-ink3">{fresh ? 'Pick a beat, hit record, keep your best take. Writing is optional.' : 'Rap over the beat for real — up to 1:30.'}</div></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSetup((v) => !v)} className="h-9 px-3 rounded-full border border-line text-ink2 text-[11px]" aria-label="Headphones and timing setup">🎧 Setup</button>
            <button onClick={close} className="w-9 h-9 rounded-full border border-line text-ink2" aria-label="Close">✕</button>
          </div>
        </div>
        {setup && <BoothSetup getCtx={ctx} onChange={(c: Calibration | null) => { const n = c && c.ms >= 60 ? -Math.min(300, Math.round(c.ms / 10) * 10) : 0; change({ ...fx, nudgeMs: n }, false); }} onClose={() => setSetup(false)} />}

        {fresh ? (
          made ? (
            <div className="rounded-[16px] border border-rise/40 bg-rise/10 p-4 space-y-3">
              <div className="text-[15px] font-bold text-ink">✅ It's a song</div>
              <div className="text-[13px] text-ink2 leading-snug">{msg}</div>
              <button onClick={() => download('made', made.blob, made.lead, songName)} disabled={!!rendering || !spec} className="w-full h-10 rounded-[12px] border border-line text-ink2 text-[13px] disabled:opacity-40">{rendering === 'made' ? 'Rendering…' : '⬇ Download the song (WAV)'}</button>
              <div className="flex gap-2">
                <button onClick={() => { stopAll(); onDone?.(made.id); }} className="flex-1 h-11 rounded-[12px] bg-amber text-black font-bold text-[13px]">🎚️ Mix & master it →</button>
                <button onClick={another} className="flex-1 h-11 rounded-[12px] border border-line text-ink2 text-[13px]">🎙️ Record another</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">1 · Pick a beat <span className="normal-case font-normal">— tap ▶ to hear it</span></div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {mine.map((b) => beatCard(b, false))}
                  {house.map((b) => beatCard(b, true))}
                </div>
                {!mine.length && <div className="text-[11px] text-ink3 mt-1">No beats of your own yet — the free house beats are yours to use. Better beats come from producers, your team, or the beat store.</div>}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={picked ? `Title (or "${picked.name}")` : 'Song title'} className="h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink" />
                <select value={mood || picked?.mood || ''} onChange={(e) => setMood(e.target.value as SongMood)} className="h-10 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">
                  {MOODS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>)}
                </select>
              </div>
              <div>
                <button onClick={() => setPad((v) => !v)} className="text-[12px] text-ink2 hover:text-ink">{pad ? '▾' : '▸'} 📝 Notepad {lyrics.trim() ? `(${lyrics.split('\n').filter((l) => l.trim()).length} lines)` : '(optional)'}</button>
                {pad && <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={live ? 8 : 5} placeholder={'Jot your bars here — they stay on screen while you record.\nLeave it empty to freestyle.'} className={cn('mt-2 w-full rounded-[12px] bg-black/40 border border-line p-3 text-ink leading-relaxed', live ? 'text-[16px]' : 'text-[13px]')} />}
              </div>
            </>
          )
        ) : !vault.length ? <div className="text-[13px] text-ink2">Nothing in your vault yet. Close this and use ● Record a song on the Studio home.</div> : (
          <select value={songId} disabled={busy} onChange={(e) => { const id = e.target.value; stopAll(); setMode('idle'); setSongId(id); setTakes([]); setMsg(null); setFx(songs.find((x) => x.id === id)?.vocalFx ?? DEFAULT_FX); setHookBars(songs.find((x) => x.id === id)?.hookBars ?? []); }} className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink">
            {vault.map((x) => <option key={x.id} value={x.id}>{x.title}{x.boothTake ? ` · take ${x.boothTake.score}` : ''}</option>)}
          </select>
        )}

        {spec && !made && (
          <>
            {!fresh && (
              <div className="rounded-[12px] border border-line bg-black/30 p-3 flex items-center justify-between gap-3">
                <div className="text-[12px] text-ink2"><div className="font-semibold text-ink">{STYLE_LABEL[spec.style]} · {spec.bpm} bpm · {keyOf(spec)}</div><div className="text-ink3">{song?.producerName ? `Prod. ${song.producerName}` : 'House beat'} · 🎧 use headphones</div></div>
                <button onClick={() => preview()} disabled={live} className="h-9 px-3 rounded-full border border-amber/60 text-amber text-[12px] font-semibold disabled:opacity-40">{previewing === 'current' ? '■ Stop' : '▶ Beat'}</button>
              </div>
            )}
            <div className="studio-window rounded-[18px] border border-line bg-black/40 p-4 text-center space-y-3">
              {fresh && <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider text-left">2 · Record {picked ? <span className="normal-case font-normal">— on <span className="text-amber">{picked.name}</span> · {STYLE_LABEL[spec.style]} · {spec.bpm} bpm · 🎧 headphones</span> : null}</div>}
              <div className="text-[38px] font-black text-ink num">{mode === 'rec' ? `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}` : mode === 'count' ? '…' : '0:00'}<span className="text-[13px] text-ink3 font-normal"> / 1:30</span></div>
              <div className="studio-level"><span style={{ width: `${Math.round(level * 100)}%`, transition: 'width 75ms' }} /></div>
              {live && <div className="studio-wave text-fall" aria-hidden>{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: `${10 + Math.round(level * 44 * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.7))))}px`, animationDuration: `${700 + (i % 5) * 90}ms` }} />)}</div>}
              {mode === 'rec' && prompter}
              {mode === 'count' && <div className="text-[13px] text-amber font-semibold">{recKind === 'punch' ? 'Beat rolling — your take plays, you take over at the bar…' : recKind === 'take' ? "Find the pocket… you're on after this bar" : 'Listen to your take, then add the layer…'}</div>}
              {live
                ? <button onClick={stop} className="studio-record-button mx-auto text-white font-bold text-[13px]">■ Stop</button>
                : <button onClick={() => record()} aria-label="Record a take" className="studio-record-button mx-auto flex-col text-white font-bold disabled:opacity-40"><span className="text-[22px] leading-none">●</span><span className="text-[11px] mt-1">REC</span></button>}
              <div className="text-[11px] text-ink3">{live ? (recKind === 'punch' ? 'Punching in…' : recKind === 'take' ? 'Recording…' : `Recording ${LAYER_KINDS[recKind].label.toLowerCase()}…`) : `Take ${Math.min(3, takes.length + 1)} of 3`}</div>
            </div>
            {takes.length > 0 && (
              <div className="space-y-2">
                {takes.map((t, i) => (
                  <div key={t.id} className="rounded-[12px] border border-line px-3 py-2 space-y-1.5">
                   <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-ink font-semibold">Take {i + 1}</span><span className="text-[11px] text-ink3">{t.seconds}s</span>
                    <button onClick={() => play(String(t.id), t.blob, t.lead, t.layers)} disabled={live} className={cn('ml-auto h-8 px-3 rounded-full border text-[12px] disabled:opacity-40', playingId === String(t.id) ? 'border-amber bg-amber text-black' : 'border-line text-ink2')}>{playingId === String(t.id) ? '■ Stop' : '▶ Play'}</button>
                    <button onClick={() => download(String(t.id), t.blob, t.lead, `${songName} (take ${i + 1})`, t.layers)} disabled={live || !!rendering} title="Download this take with the beat" aria-label="Download take" className="h-8 w-8 rounded-full border border-line text-ink2 text-[12px] disabled:opacity-40">{rendering === String(t.id) ? '…' : '⬇'}</button>
                    <button onClick={() => useTake(t)} disabled={live} className="h-8 px-3 rounded-full bg-amber text-black text-[12px] font-bold disabled:opacity-40">{fresh ? '✓ Make it a song' : 'Use it'}</button>
                    <button onClick={() => { if (playingId === String(t.id)) stop(); URL.revokeObjectURL(t.url); setTakes((x) => x.filter((y) => y.id !== t.id)); }} disabled={live} className="h-8 w-8 rounded-full border border-line text-ink3 text-[12px]" aria-label="Delete take">✕</button>
                   </div>
                   <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-ink3">
                    {t.sc ? (<>
                      <span className={cn('studio-chip rounded-full px-2 py-0.5 font-bold', t.sc.score >= 60 ? 'text-rise' : t.sc.score >= 40 ? 'text-amber' : 'text-fall')}>Quality {t.sc.score} · {tier(t.sc.score)}</span>
                      <span className="studio-chip rounded-full px-2 py-0.5">Timing {t.sc.timing}</span>
                      <span className="studio-chip rounded-full px-2 py-0.5">Presence {t.sc.presence}</span>
                      <span className="studio-chip rounded-full px-2 py-0.5">Energy {t.sc.energy}</span>
                      {t.sc.clean !== undefined && <span className="studio-chip rounded-full px-2 py-0.5">Room {t.sc.clean >= 60 ? 'quiet' : t.sc.clean >= 35 ? 'some noise' : 'noisy'}</span>}
                    </>) : <span>Listening back…</span>}
                   </div>
                   <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button onClick={() => setPunch(punch?.id === t.id ? null : { id: t.id, bar: 0 })} disabled={live} className={cn('h-7 px-2.5 rounded-full border disabled:opacity-40', punch?.id === t.id ? 'border-amber text-amber' : 'border-line text-ink2')}>↻ Punch in</button>
                    {(['adlib', 'harmony'] as LayerKind[]).map((k) => (
                      <button key={k} onClick={() => record({ kind: k, target: t })} disabled={live} className="h-7 px-2.5 rounded-full border border-line text-ink2 disabled:opacity-40">{LAYER_KINDS[k].emoji} + {LAYER_KINDS[k].label}</button>
                    ))}
                    {(t.layers ?? []).map((l) => <button key={l.kind} onClick={() => setTakes((x) => x.map((y) => (y.id === t.id ? { ...y, layers: (y.layers ?? []).filter((z) => z.kind !== l.kind) } : y)))} disabled={live} className="studio-chip rounded-full px-2 py-0.5 text-[10px] text-ink2" title="Remove this layer">{LAYER_KINDS[l.kind].emoji} {LAYER_KINDS[l.kind].label} ✕</button>)}
                   </div>
                   {punch?.id === t.id && spec && (
                    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-amber/40 bg-amber/5 px-2.5 py-2 text-[11px] text-ink2">
                      <span>Re-record from bar</span>
                      <button onClick={() => setPunch({ id: t.id, bar: Math.max(0, punch.bar - 1) })} className="w-7 h-7 rounded-full border border-line" aria-label="Earlier bar">−</button>
                      <span className="num text-ink font-bold w-6 text-center">{punch.bar + 1}</span>
                      <button onClick={() => setPunch({ id: t.id, bar: Math.min(Math.max(0, Math.ceil(t.seconds / barOf(spec)) - 1), punch.bar + 1) })} className="w-7 h-7 rounded-full border border-line" aria-label="Later bar">+</button>
                      <button onClick={() => { const p = punch; setPunch(null); record({ kind: 'punch', target: t, bar: p.bar }); }} disabled={live} className="ml-auto h-8 px-3 rounded-full bg-fall text-white font-bold">● Record from here</button>
                      <span className="basis-full text-ink3">The beat plays from the top and your take plays until that bar — then you take over. Stop when the line is done; the rest of the take stays.</span>
                    </div>
                   )}
                  </div>
                ))}
              </div>
            )}
            {!fresh && saved && takes.length === 0 && (
              <div className="flex gap-2">
                <button onClick={() => play('saved', saved, savedLead)} className={cn('flex-1 h-10 rounded-[12px] border text-[13px]', playingId === 'saved' ? 'border-amber bg-amber text-black' : 'border-line text-ink2')}>{playingId === 'saved' ? '■ Stop' : `▶ Your take on "${song?.title}"`}</button>
                <button onClick={() => download('saved', saved, savedLead, songName)} disabled={!!rendering} className="h-10 px-3 rounded-[12px] border border-line text-[13px] text-ink2 disabled:opacity-40">{rendering === 'saved' ? 'Rendering…' : '⬇ WAV'}</button>
              </div>
            )}
            {(takes.length > 0 || (!fresh && saved)) && soundPanel}
          </>
        )}
        {msg && !made && <div className="text-[12px] text-ink2 leading-snug">{msg}</div>}
        {fresh && !made && onWrite && <button onClick={() => { stopAll(); onWrite(picked && library?.some((b) => b.id === picked.id) ? picked.id : undefined); }} className="text-[12px] text-ink3 hover:text-ink2">✍️ Rather write it out and book a full session? →</button>}
        <div className="text-[10px] text-ink3">Your recordings stay on this device. {fresh ? 'Making a song costs ⚡15 — no studio fee in your own booth. The sound you set is saved with it.' : 'Using a take costs ⚡10 and changes how the song\'s vocal reads.'}</div>
      </div>
    </div>
  );
}
