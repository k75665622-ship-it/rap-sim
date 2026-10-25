// ─── THE BOOTH ─────────────────────────────────────────────────────────────
// Put your headphones on, the beat drops, and you rap into the mic — for
// real, up to 1:30. Two ways in:
//   · a NEW SONG: pick any beat (yours, or a free house beat), hit record,
//     and the take you keep becomes the song. Writing is optional — there's a
//     notepad if you want one, and a freestyle is scored on your freestyle.
//   · an existing record in the vault: re-cut its vocal.
// How much you rapped, how tight you were on the beat and how steady your
// energy was all show in the song.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { BeatPlayer, beatSpecFor, STYLE_LABEL, LEAD_LABEL, type BeatSpec } from '../../audio/beat';
import { saveTake, loadTake, scoreTake } from '../../audio/take';
import { stopPreview } from '../../audio/preview';
import { houseBeats, beatGrade, type OwnedBeat } from '../../sim/beats';
import { MOODS } from '../../sim/studio';
import { dateToSerial } from '../../sim/gameClock';
import type { SongMood } from '../../types/game';
import { cn } from '@/utils/cn';

const MAX_SECONDS = 90;
const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
type Take = { id: number; blob: Blob; url: string; seconds: number };

function pickMime(): string {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const m of opts) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m;
  return '';
}
const specOf = (b: OwnedBeat) => beatSpecFor(String(b.genre), b.bpm, b.id, b.quality, b.producerId ?? b.producerName, b.mood);
const keyOf = (sp: BeatSpec) => `${KEYS[sp.root]}${sp.major ? '' : 'm'}`;

export function RecordingBooth({ onClose, songId: initial, fresh, beatId: initialBeat, onDone, onWrite }: {
  onClose: () => void; songId?: string; fresh?: boolean; beatId?: string; onDone?: (songId: string) => void; onWrite?: (beatId?: string) => void;
}) {
  const songs = useGameStore((s) => s.songs);
  const apply = useGameStore((s) => s.applyBoothTake);
  const create = useGameStore((s) => s.createRecordedSong);
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
  const [made, setMade] = useState<string | null>(null);

  const spec: BeatSpec | null = useMemo(() => {
    if (fresh) return picked ? specOf(picked) : null;
    if (!song) return null;
    const owned = library?.find((b) => b.id === song.beatId || b.usedOnSongId === song.id);
    return owned ? specOf(owned)
      : beatSpecFor(String(song.genre), song.bpm, song.beatId ?? song.id, song.beatQuality ?? song.productionQuality ?? 60, song.producerId ?? song.producerName, song.mood);
  }, [fresh, picked, song, library]);
  const [mode, setMode] = useState<'idle' | 'preview' | 'count' | 'rec' | 'play'>('idle');
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [voiceVol, setVoiceVol] = useState(1);
  const [beatVol, setBeatVol] = useState(0.7);
  const [echo, setEcho] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<Blob | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const beatRef = useRef<BeatPlayer | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const tickRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => { let on = true; if (!fresh && songId) loadTake(songId).then((b) => { if (on) setSaved(b); }); return () => { on = false; }; }, [songId, fresh]);
  useEffect(() => () => { stopAll(); takes.forEach((t) => URL.revokeObjectURL(t.url)); ctxRef.current?.close().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function ctx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }
  function stopAll() {
    beatRef.current?.stop(); beatRef.current = null;
    try { srcRef.current?.stop(); } catch { /* already stopped */ }
    srcRef.current = null;
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    if (tickRef.current !== null) cancelAnimationFrame(tickRef.current); tickRef.current = null;
    setLevel(0);
    setPreviewing(null);
  }
  function startBeat(at: number, sp: BeatSpec = spec!) {
    stopPreview();
    const c = ctx();
    const b = new BeatPlayer(c, sp, c.destination, beatVol);
    b.start(at);
    beatRef.current = b;
  }
  function preview(b?: OwnedBeat) {
    const key = b?.id ?? 'current';
    if (mode !== 'idle') { const was = previewing; stopAll(); setMode('idle'); if (was === key || mode !== 'preview') return; }
    startBeat(ctx().currentTime + 0.05, b ? specOf(b) : spec!);
    setPreviewing(key);
    setMode('preview');
  }
  function choose(b: OwnedBeat) {
    if (mode === 'rec' || mode === 'count') return;
    if (b.id === beatKey) return;
    stopAll(); setMode('idle');
    takes.forEach((t) => URL.revokeObjectURL(t.url));
    setTakes([]); setMsg(null); setMade(null);
    setBeatKey(b.id);
  }
  async function record() {
    if (!spec) return;
    if (takes.length >= 3) { setMsg('Three takes max — delete one first.'); return; }
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
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      const seconds = Math.min(MAX_SECONDS, Math.round((performance.now() - startRef.current) / 1000));
      if (seconds >= 3) setTakes((t) => [...t, { id: Date.now(), blob, url: URL.createObjectURL(blob), seconds }]);
      else setMsg('Too short — rap for at least a few seconds.');
    };
    recRef.current = rec;
    // One bar of beat to find the pocket, then you're on.
    const at = c.currentTime + 0.05;
    startBeat(at);
    const bar = (60 / spec.bpm) * 4;
    setMode('count');
    window.setTimeout(() => { if (recRef.current !== rec) return; rec.start(); startRef.current = performance.now(); setMode('rec'); }, bar * 1000);
    const loop = () => {
      an.getByteTimeDomainData(buf);
      let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 90));
      if (recRef.current?.state === 'recording') {
        const s = (performance.now() - startRef.current) / 1000;
        setElapsed(s);
        if (s >= MAX_SECONDS) { stopAll(); setMode('idle'); return; }
      }
      tickRef.current = requestAnimationFrame(loop);
    };
    tickRef.current = requestAnimationFrame(loop);
  }
  function stop() { stopAll(); setMode('idle'); }
  async function play(blob: Blob) {
    if (mode !== 'idle') { stopAll(); setMode('idle'); return; }
    const c = ctx();
    const voice = await c.decodeAudioData(await blob.arrayBuffer());
    const at = c.currentTime + 0.08;
    startBeat(at);
    const src = c.createBufferSource(); src.buffer = voice;
    const g = c.createGain(); g.gain.value = voiceVol;
    src.connect(g).connect(c.destination);
    if (echo) { const d = c.createDelay(); d.delayTime.value = 60 / (spec?.bpm ?? 90) / 2; const fb = c.createGain(); fb.gain.value = 0.22; const wet = c.createGain(); wet.gain.value = 0.25; g.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(c.destination); }
    // The beat had a one-bar count-in when you recorded.
    src.start(at + (60 / (spec?.bpm ?? 90)) * 4);
    src.onended = () => { stopAll(); setMode('idle'); };
    srcRef.current = src;
    setMode('play');
  }
  async function useTake(t: Take) {
    if (!spec) return;
    setMsg('Listening back…');
    try {
      const c = ctx();
      const buf = await c.decodeAudioData(await t.blob.arrayBuffer());
      const sc = await scoreTake(c, buf, spec.bpm);
      if (fresh) {
        if (!picked) return;
        const r = create({ beat: { kind: library?.some((b) => b.id === picked.id) ? 'owned' : 'house', id: picked.id }, title, mood: mood || undefined, lyrics, take: sc });
        if (r.ok && r.songId) { await saveTake(r.songId, t.blob); setMade(r.songId); }
        setMsg(r.message);
        return;
      }
      if (!song) return;
      // A take worse than the vocal you already have needs a second tap.
      const have = song.vocalPerformance ?? 50;
      if (sc.score + 5 < have && confirmId !== t.id) { setConfirmId(t.id); setMsg(`That take scores ${sc.score}/100 (on-beat ${sc.timing}) — weaker than the vocal you already have (${have}). Tap "Use it" again to use it anyway, or record another.`); return; }
      setConfirmId(null);
      const r = apply(song.id, { ...sc });
      if (r.ok) { await saveTake(song.id, t.blob); setSaved(t.blob); }
      setMsg(r.message);
    } catch {
      setMsg('Could not read that take. Try recording it again.');
    }
  }
  function another() {
    takes.forEach((t) => URL.revokeObjectURL(t.url));
    setTakes([]); setMade(null); setMsg(null); setTitle(''); setLyrics('');
    const next = [...mine, ...house].find((b) => b.id !== beatKey && !(library ?? []).some((x) => x.id === b.id && x.usedOnSongId));
    if (next) setBeatKey(next.id);
  }

  const busy = mode !== 'idle';
  const live = mode === 'rec' || mode === 'count';
  const close = () => { stopAll(); onClose(); };

  const beatCard = (b: OwnedBeat, free: boolean) => {
    const sp = specOf(b);
    const on = b.id === beatKey;
    return (
      <div key={b.id} onClick={() => choose(b)} role="button" tabIndex={0} className={cn('shrink-0 w-[150px] rounded-[14px] border p-3 cursor-pointer transition text-left', on ? 'border-amber bg-amber/10' : 'border-line bg-black/30 hover:border-amber/50')}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0"><div className="text-[12px] font-semibold text-ink truncate">{b.name}</div><div className="text-[10px] text-ink3 truncate">{free ? 'Free · house beat' : `Prod. ${b.producerName}`}</div></div>
          <button onClick={(e) => { e.stopPropagation(); preview(b); }} disabled={live} aria-label={previewing === b.id ? 'Stop' : 'Play beat'} className={cn('w-8 h-8 rounded-full border text-[11px] shrink-0', previewing === b.id ? 'bg-amber text-black border-amber' : 'border-line text-ink2')}>{previewing === b.id ? '■' : '▶'}</button>
        </div>
        <div className="mt-2 text-[11px] text-ink2">{STYLE_LABEL[sp.style]} · {sp.bpm}</div>
        <div className="text-[10px] text-ink3">{keyOf(sp)} · {LEAD_LABEL[sp.lead]} · {beatGrade(b.quality)}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80" onClick={close} />
      <div className={cn('relative w-full max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-line p-5 space-y-4', fresh ? 'sm:max-w-[580px]' : 'sm:max-w-[480px]')} style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,72,72,0.22), rgba(10,11,16,0) 60%), #0c0d12' }}>
        <div className="flex items-center justify-between">
          <div><div className="text-[18px] font-bold text-ink">🎙️ {fresh ? 'New song' : 'Recording booth'}</div><div className="text-[11px] text-ink3">{fresh ? 'Pick a beat, hit record, keep your best take. Writing is optional.' : 'Rap over the beat for real — up to 1:30.'}</div></div>
          <button onClick={close} className="w-9 h-9 rounded-full border border-line text-ink2" aria-label="Close">✕</button>
        </div>

        {fresh ? (
          made ? (
            <div className="rounded-[16px] border border-rise/40 bg-rise/10 p-4 space-y-3">
              <div className="text-[15px] font-bold text-ink">✅ It's a song</div>
              <div className="text-[13px] text-ink2 leading-snug">{msg}</div>
              <div className="flex gap-2">
                <button onClick={() => { stopAll(); onDone?.(made); }} className="flex-1 h-11 rounded-[12px] bg-amber text-black font-bold text-[13px]">🎚️ Mix & master it →</button>
                <button onClick={another} className="flex-1 h-11 rounded-[12px] border border-line text-ink2 text-[13px]">🎙️ Record another</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">1 · Pick a beat</div>
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
        ) : !vault.length ? <div className="text-[13px] text-ink2">Nothing in your vault yet. Close this and use 🎙️ Record a song on the Studio home.</div> : (
          <select value={songId} disabled={busy} onChange={(e) => { setSongId(e.target.value); setTakes([]); setMsg(null); }} className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink">
            {vault.map((x) => <option key={x.id} value={x.id}>{x.title}{x.boothTake ? ` · take ${x.boothTake.score}` : ''}</option>)}
          </select>
        )}

        {spec && !made && (
          <>
            {!fresh && (
              <div className="rounded-[12px] border border-line bg-black/30 p-3 flex items-center justify-between gap-3">
                <div className="text-[12px] text-ink2"><div className="font-semibold text-ink">{STYLE_LABEL[spec.style]} · {spec.bpm} bpm · {keyOf(spec)}</div><div className="text-ink3">{song?.producerName ? `Prod. ${song.producerName}` : 'House beat'} · 🎧 use headphones</div></div>
                <button onClick={() => preview()} disabled={busy && mode !== 'preview'} className="h-9 px-3 rounded-full border border-amber/60 text-amber text-[12px] font-semibold disabled:opacity-40">{mode === 'preview' ? '■ Stop' : '▶ Beat'}</button>
              </div>
            )}
            <div className="rounded-[18px] border border-line bg-black/40 p-4 text-center space-y-3">
              {fresh && <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider text-left">2 · Record {picked ? <span className="normal-case font-normal">— {picked.name} · {STYLE_LABEL[spec.style]} · {spec.bpm} bpm · 🎧 headphones</span> : null}</div>}
              <div className="text-[38px] font-black text-ink num">{mode === 'rec' ? `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}` : mode === 'count' ? '…' : '0:00'}<span className="text-[13px] text-ink3 font-normal"> / 1:30</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className={cn('h-full rounded-full transition-[width] duration-75', level > 0.85 ? 'bg-fall' : 'bg-rise')} style={{ width: `${Math.round(level * 100)}%` }} /></div>
              {mode === 'count' && <div className="text-[13px] text-amber font-semibold">Find the pocket… you're on after this bar</div>}
              {live
                ? <button onClick={stop} className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-fall text-white font-bold text-[13px] shadow-[0_0_0_6px_rgba(255,72,72,0.25)] animate-pulse">■ Stop</button>
                : <button onClick={record} disabled={busy && mode !== 'preview'} aria-label="Record a take" className="mx-auto flex flex-col items-center justify-center w-20 h-20 rounded-full bg-fall text-white font-bold disabled:opacity-40 shadow-[0_0_0_6px_rgba(255,72,72,0.18)] hover:scale-105 transition"><span className="text-[22px] leading-none">●</span><span className="text-[11px] mt-1">REC</span></button>}
              <div className="text-[11px] text-ink3">{live ? 'Recording…' : `Take ${Math.min(3, takes.length + 1)} of 3`}</div>
            </div>
            {takes.length > 0 && (
              <div className="space-y-2">
                {takes.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-[12px] border border-line px-3 py-2">
                    <span className="text-[12px] text-ink font-semibold">Take {i + 1}</span><span className="text-[11px] text-ink3">{t.seconds}s</span>
                    <button onClick={() => play(t.blob)} disabled={busy && mode !== 'play'} className="ml-auto h-8 px-3 rounded-full border border-line text-[12px] text-ink2 disabled:opacity-40">{mode === 'play' ? '■' : '▶ Play'}</button>
                    <button onClick={() => useTake(t)} disabled={busy} className="h-8 px-3 rounded-full bg-amber text-black text-[12px] font-bold disabled:opacity-40">{fresh ? '✓ Make it a song' : 'Use it'}</button>
                    <button onClick={() => { URL.revokeObjectURL(t.url); setTakes((x) => x.filter((y) => y.id !== t.id)); }} disabled={busy} className="h-8 w-8 rounded-full border border-line text-ink3 text-[12px]" aria-label="Delete take">✕</button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 text-[11px] text-ink3">
                  <label>Voice <input type="range" min={0} max={1.5} step={0.05} value={voiceVol} onChange={(e) => setVoiceVol(Number(e.target.value))} className="w-full" /></label>
                  <label>Beat <input type="range" min={0} max={1} step={0.05} value={beatVol} onChange={(e) => { setBeatVol(Number(e.target.value)); beatRef.current?.setVolume(Number(e.target.value)); }} className="w-full" /></label>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-ink2"><input type="checkbox" checked={echo} onChange={(e) => setEcho(e.target.checked)} /> Echo on the vocal</label>
              </div>
            )}
            {!fresh && saved && takes.length === 0 && <button onClick={() => play(saved)} className="w-full h-10 rounded-[12px] border border-line text-[13px] text-ink2">{mode === 'play' ? '■ Stop' : `▶ Your saved take on "${song?.title}"`}</button>}
          </>
        )}
        {msg && !made && <div className="text-[12px] text-ink2 leading-snug">{msg}</div>}
        {fresh && !made && onWrite && <button onClick={() => { stopAll(); onWrite(picked && library?.some((b) => b.id === picked.id) ? picked.id : undefined); }} className="text-[12px] text-ink3 hover:text-ink2">✍️ Rather write it out and book a full session? →</button>}
        <div className="text-[10px] text-ink3">Your recordings stay on this device. {fresh ? 'Making a song costs ⚡15 — no studio fee in your own booth.' : 'Using a take costs ⚡10 and changes how the song\'s vocal reads.'}</div>
      </div>
    </div>
  );
}
