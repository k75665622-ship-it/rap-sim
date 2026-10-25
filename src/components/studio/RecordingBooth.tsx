// ─── THE BOOTH ─────────────────────────────────────────────────────────────
// Put your headphones on, the beat drops, and you rap into the mic — for
// real, up to 1:30. Keep the best of three takes, set the levels, and the
// take goes on the record: how much you rapped, how tight you were on the
// beat and how steady your energy was all show in the song.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { BeatPlayer, beatSpecFor, STYLE_LABEL, type BeatSpec } from '../../audio/beat';
import { saveTake, loadTake, scoreTake } from '../../audio/take';
import { cn } from '@/utils/cn';

const MAX_SECONDS = 90;
type Take = { id: number; blob: Blob; url: string; seconds: number };

function pickMime(): string {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const m of opts) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m;
  return '';
}

export function RecordingBooth({ onClose, songId: initial }: { onClose: () => void; songId?: string }) {
  const songs = useGameStore((s) => s.songs);
  const apply = useGameStore((s) => s.applyBoothTake);
  const vault = useMemo(() => songs.filter((x) => !isSongReleased(x) && !x.archivedAt), [songs]);
  const [songId, setSongId] = useState(initial ?? vault[0]?.id ?? '');
  const song = songs.find((x) => x.id === songId);
  const spec: BeatSpec | null = useMemo(() => (song ? beatSpecFor(String(song.genre), song.bpm, song.beatId ?? song.id, song.beatQuality ?? song.productionQuality ?? 60) : null), [song]);
  const [mode, setMode] = useState<'idle' | 'preview' | 'count' | 'rec' | 'play'>('idle');
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

  useEffect(() => { let on = true; if (songId) loadTake(songId).then((b) => { if (on) setSaved(b); }); return () => { on = false; }; }, [songId]);
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
  }
  function startBeat(at: number) {
    const c = ctx();
    const b = new BeatPlayer(c, spec!, c.destination, beatVol);
    b.start(at);
    beatRef.current = b;
  }
  function preview() {
    if (mode !== 'idle') { stopAll(); setMode('idle'); return; }
    startBeat(ctx().currentTime + 0.05);
    setMode('preview');
  }
  async function record() {
    if (!spec) return;
    if (takes.length >= 3) { setMsg('Three takes max — delete one first.'); return; }
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
    if (!song || !spec) return;
    setMsg('Listening back…');
    try {
      const c = ctx();
      const buf = await c.decodeAudioData(await t.blob.arrayBuffer());
      const sc = await scoreTake(c, buf, spec.bpm);
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

  const busy = mode !== 'idle';
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80" onClick={() => { stopAll(); onClose(); }} />
      <div className="relative w-full sm:max-w-[480px] max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-line p-5 space-y-4" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,72,72,0.22), rgba(10,11,16,0) 60%), #0c0d12' }}>
        <div className="flex items-center justify-between">
          <div><div className="text-[18px] font-bold text-ink">🎙️ Recording booth</div><div className="text-[11px] text-ink3">Rap over the beat for real — up to 1:30.</div></div>
          <button onClick={() => { stopAll(); onClose(); }} className="w-9 h-9 rounded-full border border-line text-ink2" aria-label="Close">✕</button>
        </div>
        {!vault.length ? <div className="text-[13px] text-ink2">Nothing in your vault to record on. Make a song in the Studio first.</div> : (
          <>
            <select value={songId} disabled={busy} onChange={(e) => { setSongId(e.target.value); setTakes([]); setMsg(null); }} className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink">
              {vault.map((x) => <option key={x.id} value={x.id}>{x.title}{x.boothTake ? ` · take ${x.boothTake.score}` : ''}</option>)}
            </select>
            {spec && (
              <div className="rounded-[12px] border border-line bg-black/30 p-3 flex items-center justify-between gap-3">
                <div className="text-[12px] text-ink2"><div className="font-semibold text-ink">{STYLE_LABEL[spec.style]} · {spec.bpm} bpm</div><div className="text-ink3">{song?.producerName ? `Prod. ${song.producerName}` : 'House beat'} · 🎧 use headphones</div></div>
                <button onClick={preview} disabled={busy && mode !== 'preview'} className="h-9 px-3 rounded-full border border-amber/60 text-amber text-[12px] font-semibold disabled:opacity-40">{mode === 'preview' ? '■ Stop' : '▶ Beat'}</button>
              </div>
            )}
            <div className="rounded-[16px] border border-line bg-black/40 p-4 text-center space-y-3">
              <div className="text-[34px] font-black text-ink num">{mode === 'rec' ? `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}` : mode === 'count' ? '…' : '0:00'}<span className="text-[13px] text-ink3 font-normal"> / 1:30</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className={cn('h-full rounded-full transition-[width] duration-75', level > 0.85 ? 'bg-fall' : 'bg-rise')} style={{ width: `${Math.round(level * 100)}%` }} /></div>
              {mode === 'count' && <div className="text-[13px] text-amber font-semibold">Find the pocket… you're on after this bar</div>}
              {mode === 'rec' || mode === 'count'
                ? <button onClick={stop} className="w-full rounded-[14px] bg-fall text-white font-bold text-[15px] py-3.5">■ Stop</button>
                : <button onClick={record} disabled={busy} className="w-full rounded-[14px] bg-amber text-black font-bold text-[15px] py-3.5 disabled:opacity-40">● Record a take ({takes.length}/3)</button>}
            </div>
            {takes.length > 0 && (
              <div className="space-y-2">
                {takes.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-[12px] border border-line px-3 py-2">
                    <span className="text-[12px] text-ink font-semibold">Take {i + 1}</span><span className="text-[11px] text-ink3">{t.seconds}s</span>
                    <button onClick={() => play(t.blob)} disabled={busy && mode !== 'play'} className="ml-auto h-8 px-3 rounded-full border border-line text-[12px] text-ink2 disabled:opacity-40">{mode === 'play' ? '■' : '▶ Play'}</button>
                    <button onClick={() => useTake(t)} disabled={busy} className="h-8 px-3 rounded-full bg-amber text-black text-[12px] font-bold disabled:opacity-40">Use it</button>
                    <button onClick={() => { URL.revokeObjectURL(t.url); setTakes((x) => x.filter((y) => y.id !== t.id)); }} disabled={busy} className="h-8 w-8 rounded-full border border-line text-ink3 text-[12px]">✕</button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 text-[11px] text-ink3">
                  <label>Voice <input type="range" min={0} max={1.5} step={0.05} value={voiceVol} onChange={(e) => setVoiceVol(Number(e.target.value))} className="w-full" /></label>
                  <label>Beat <input type="range" min={0} max={1} step={0.05} value={beatVol} onChange={(e) => { setBeatVol(Number(e.target.value)); beatRef.current?.setVolume(Number(e.target.value)); }} className="w-full" /></label>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-ink2"><input type="checkbox" checked={echo} onChange={(e) => setEcho(e.target.checked)} /> Echo on the vocal</label>
              </div>
            )}
            {saved && takes.length === 0 && <button onClick={() => play(saved)} className="w-full h-10 rounded-[12px] border border-line text-[13px] text-ink2">{mode === 'play' ? '■ Stop' : `▶ Your saved take on "${song?.title}"`}</button>}
            {msg && <div className="text-[12px] text-ink2 leading-snug">{msg}</div>}
            <div className="text-[10px] text-ink3">Your recordings stay on this device. Using a take costs ⚡10 and changes how the song's vocal reads.</div>
          </>
        )}
      </div>
    </div>
  );
}
