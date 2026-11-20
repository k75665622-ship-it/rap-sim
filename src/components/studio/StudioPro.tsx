// ─── STUDIO PRO — the mixing desk ──────────────────────────────────────────
// The hard tool. Channel strips for the vocal and the beat, effect sends, and
// a master — then a real measurement of what you made (loudness, peaks, how
// well it sits for this style). The better the mix measures, the more it
// lifts the record. A sloppy one hurts it; that's what pros are for.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { beatSpecFor } from '../../audio/beat';
import { loadTake } from '../../audio/take';
import { stopPreview } from '../../audio/preview';
import { DEFAULT_FX, playMix, prepareVocal, renderSongBuffer, type Mix, type Prepared } from '../../audio/vocalfx';
import { mixFit } from '../../sim/engineerMix';
import type { VocalFx } from '../../types/game';
import { cn } from '@/utils/cn';

const TARGET_LUFS = -14; // streaming target the meter aims at

interface Report { loudness: number; peak: number; fit: number; grade: number }

/** Gated loudness (dB) and sample peak (dBFS) of a finished mix. */
function measure(buf: AudioBuffer): { loudness: number; peak: number } {
  const ch = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  const block = Math.round(buf.sampleRate * 0.4);
  let peak = 0, sum = 0, n = 0;
  for (let b = 0; b + block <= buf.length; b += block) {
    let p = 0;
    for (const d of ch) for (let i = b; i < b + block; i++) { const v = d[i]; p += v * v; const a = Math.abs(v); if (a > peak) peak = a; }
    p /= block * ch.length;
    if (10 * Math.log10(p + 1e-12) > -50) { sum += p; n++; }
  }
  return { loudness: n ? Math.round(10 * Math.log10(sum / n + 1e-12) * 10) / 10 : -99, peak: Math.round(20 * Math.log10(peak + 1e-9) * 10) / 10 };
}

function gradeOf(fit: number, loudness: number, peak: number): number {
  const loud = Math.max(0, 100 - Math.abs(loudness - TARGET_LUFS) * 9);
  const head = peak <= -0.5 ? 100 : peak <= 0 ? 60 : 25;
  return Math.round(fit * 0.55 + loud * 0.3 + head * 0.15);
}

function Fader({ label, value, min, max, step = 1, show, onChange }: { label: string; value: number; min: number; max: number; step?: number; show?: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-[11px] text-ink3">
      <span className="flex justify-between"><span>{label}</span><span className="num text-ink2">{show ?? Math.round(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber" aria-label={label} />
    </label>
  );
}
const db = (v: number | undefined) => `${(v ?? 0) > 0 ? '+' : ''}${Math.round(v ?? 0)} dB`;

function Strip({ title, tint, children }: { title: string; tint: string; children: React.ReactNode }) {
  return (
    <div className="studio-window rounded-[14px] border border-line p-3 space-y-2.5">
      <div className="flex items-center gap-2 text-[12px] font-bold text-ink"><span className={cn('w-2 h-2 rounded-full', tint)} />{title}</div>
      {children}
    </div>
  );
}

export function StudioPro({ songId, onClose }: { songId: string; onClose: () => void }) {
  const song = useGameStore((s) => s.songs.find((x) => x.id === songId));
  const library = useGameStore((s) => s.beats?.library);
  const finish = useGameStore((s) => s.finishProMix);
  const [take, setTake] = useState<Blob | null | undefined>(undefined);
  const [fx, setFx] = useState<VocalFx>(() => ({ ...DEFAULT_FX, ...(song?.vocalFx ?? {}) }));
  const original = useRef<VocalFx>(fx);
  const [slot, setSlot] = useState<'A' | 'B'>('B');
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const mixRef = useRef<Mix | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);

  useEffect(() => { let on = true; loadTake(songId).then((b) => { if (on) setTake(b); }); return () => { on = false; }; }, [songId]);
  useEffect(() => () => { mixRef.current?.stop(); ctxRef.current?.close().catch(() => {}); }, []);

  const spec = useMemo(() => {
    if (!song) return null;
    const owned = library?.find((b) => b.id === song.beatId || b.usedOnSongId === song.id);
    return owned ? beatSpecFor(String(owned.genre), owned.bpm, owned.id, owned.quality, owned.producerId ?? owned.producerName, owned.mood)
      : beatSpecFor(String(song.genre), song.bpm, song.beatId ?? song.id, song.beatQuality ?? song.productionQuality ?? 60, song.producerId ?? song.producerName, song.mood);
  }, [song, library]);

  if (!song || !spec) return null;
  const lead = song.boothTake?.lead ?? (60 / spec.bpm) * 4;
  const hook = song.hookBars ?? [];
  const active = slot === 'A' ? original.current : fx;
  const set = (patch: Partial<VocalFx>) => { const next = { ...fx, ...patch, preset: 'custom' }; setFx(next); setReport(null); if (slot === 'B') mixRef.current?.setFx(next); };

  function ctx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }
  async function prepared(f: VocalFx): Promise<Prepared> {
    if (!bufRef.current) bufRef.current = await ctx().decodeAudioData(await take!.arrayBuffer());
    return prepareVocal(ctx(), bufRef.current, f, { root: spec!.root, major: spec!.major }, hook);
  }
  async function play(which: 'A' | 'B' = slot) {
    mixRef.current?.stop(); mixRef.current = null; stopPreview();
    if (!take) return;
    const f = which === 'A' ? original.current : fx;
    setBusy('Preparing…');
    try {
      const v = await prepared(f);
      mixRef.current = playMix(ctx(), spec!, v, f, lead, hook, () => { mixRef.current = null; setPlaying(false); });
      setPlaying(true);
    } catch { setMsg('Could not play this record on this device.'); }
    setBusy(null);
  }
  function stop() { mixRef.current?.stop(); mixRef.current = null; setPlaying(false); }
  async function pickSlot(s: 'A' | 'B') { setSlot(s); if (playing) await play(s); }
  async function analyze() {
    if (!take) return;
    stop(); setBusy('Measuring the mix…'); setMsg(null);
    try {
      const out = await renderSongBuffer(spec!, await prepared(fx), fx, lead, hook);
      const m = measure(out);
      const fit = mixFit(fx, spec!.style);
      setReport({ ...m, fit, grade: gradeOf(fit, m.loudness, m.peak) });
    } catch { setMsg('Could not measure the mix on this device.'); }
    setBusy(null);
  }
  function print() {
    if (!report) return;
    stop();
    const r = finish(songId, fx, { grade: report.grade, loudness: report.loudness, peak: report.peak });
    setMsg(r.message);
    if (r.ok) window.setTimeout(onClose, 1800);
  }

  const gradeWord = (g: number) => (g >= 85 ? 'Radio ready' : g >= 70 ? 'Strong' : g >= 55 ? 'Decent' : g >= 40 ? 'Rough' : 'Muddy');
  const loudHint = report ? (report.loudness > TARGET_LUFS + 3 ? 'Too hot — turn the master down' : report.loudness < TARGET_LUFS - 4 ? 'Too quiet — raise the master or vocal' : 'In the pocket') : '';

  return (
    <div className="studio-cinematic fixed inset-0 z-[85] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="STUDIO PRO">
      <div className="absolute inset-0 bg-black/80" onClick={() => { stop(); onClose(); }} />
      <div className="studio-booth-panel relative w-full sm:max-w-[980px] max-h-[94vh] rounded-t-[24px] sm:rounded-[24px] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-[18px] font-bold text-ink">🎛️ STUDIO PRO <span className="text-[11px] font-normal text-ink3">· "{song.title}" · {spec.bpm} bpm</span></div>
            <div className="text-[11px] text-ink3">The pro desk. Mix it yourself — or send it to an engineer. A bad mix costs the record; a great one lifts it.</div></div>
          <button onClick={() => { stop(); onClose(); }} className="w-9 h-9 rounded-full border border-line text-ink2" aria-label="Close">✕</button>
        </div>

        {take === undefined ? <div className="text-[13px] text-ink3">Loading your vocal…</div> : take === null ? (
          <div className="text-[13px] text-ink2">There's no recorded vocal for this song yet. Record it in the booth first, then bring it here.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => (playing ? stop() : play())} disabled={!!busy} className="h-10 px-5 rounded-full bg-amber text-black font-bold text-[13px] disabled:opacity-40">{playing ? '■ Stop' : '▶ Play'}</button>
              <div className="flex rounded-full border border-line p-0.5 text-[11px]" role="group" aria-label="A/B compare">
                <button onClick={() => pickSlot('A')} aria-pressed={slot === 'A'} className={cn('px-3 h-7 rounded-full', slot === 'A' ? 'bg-amber text-black font-semibold' : 'text-ink2')}>A · where you started</button>
                <button onClick={() => pickSlot('B')} aria-pressed={slot === 'B'} className={cn('px-3 h-7 rounded-full', slot === 'B' ? 'bg-amber text-black font-semibold' : 'text-ink2')}>B · desk mix</button>
              </div>
              {busy && <span className="text-[12px] text-amber">{busy}</span>}
              {slot === 'A' && <span className="text-[11px] text-ink3">Listening to your starting sound — switch to B to keep working.</span>}
            </div>

            <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3', slot === 'A' && 'opacity-50 pointer-events-none')}>
              <Strip title="VOCAL" tint="bg-fall">
                <Fader label="Level" value={active.voice} min={0} max={1.5} step={0.05} show={`${Math.round(active.voice * 100)}%`} onChange={(v) => set({ voice: v })} />
                <Fader label="Pan" value={active.pan ?? 0} min={-1} max={1} step={0.1} show={(active.pan ?? 0) === 0 ? 'C' : `${(active.pan ?? 0) < 0 ? 'L' : 'R'}${Math.round(Math.abs(active.pan ?? 0) * 100)}`} onChange={(v) => set({ pan: v })} />
                <div className="grid grid-cols-3 gap-3">
                  <Fader label="Low" value={active.eqLow ?? 0} min={-12} max={12} show={db(active.eqLow)} onChange={(v) => set({ eqLow: v })} />
                  <Fader label="Mid" value={active.eqMid ?? 0} min={-12} max={12} show={db(active.eqMid)} onChange={(v) => set({ eqMid: v })} />
                  <Fader label="High" value={active.eqHigh ?? 0} min={-12} max={12} show={db(active.eqHigh)} onChange={(v) => set({ eqHigh: v })} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <Fader label="Compressor" value={active.punch} min={0} max={100} onChange={(v) => set({ punch: v })} />
                  <Fader label="Saturation" value={active.grit} min={0} max={100} onChange={(v) => set({ grit: v })} />
                  <Fader label="De-esser" value={active.deess ?? 0} min={0} max={100} onChange={(v) => set({ deess: v })} />
                  <Fader label="Noise cleanup" value={active.denoise ?? 0} min={0} max={100} onChange={(v) => set({ denoise: v })} />
                  <Fader label="Pitch correction" value={active.tune ?? 0} min={0} max={100} onChange={(v) => set({ tune: v })} />
                  <Fader label="Snap" value={active.tuneSpeed ?? 50} min={0} max={100} onChange={(v) => set({ tuneSpeed: v })} />
                </div>
                <label className="flex items-center gap-2 text-[12px] text-ink2"><input type="checkbox" checked={active.double} onChange={(e) => set({ double: e.target.checked })} /> Double the vocal (wide)</label>
              </Strip>

              <div className="space-y-3">
                <Strip title="BEAT" tint="bg-amber">
                  <Fader label="Level" value={active.beat} min={0} max={1.3} step={0.05} show={`${Math.round(active.beat * 100)}%`} onChange={(v) => set({ beat: v })} />
                </Strip>
                <Strip title="SENDS" tint="bg-rise">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Fader label="Reverb send" value={active.reverb} min={0} max={100} onChange={(v) => set({ reverb: v })} />
                    <Fader label="Delay send" value={active.echo} min={0} max={100} onChange={(v) => set({ echo: v })} />
                  </div>
                  <div className="flex gap-1 text-[11px]">{(['1/8', '3/16', '1/4'] as const).map((t) => <button key={t} onClick={() => set({ echoTime: t })} className={cn('flex-1 h-7 rounded-[8px] border', active.echoTime === t ? 'border-amber text-amber' : 'border-line text-ink2')}>Delay {t}</button>)}</div>
                  <Fader label="Hook lift" value={active.hook ?? 0} min={0} max={100} onChange={(v) => set({ hook: v })} />
                </Strip>
                <Strip title="MASTER" tint="bg-white/70">
                  <Fader label="Mastering (loudness, glue, air)" value={active.polish ?? 0} min={0} max={100} onChange={(v) => set({ polish: v })} />
                  <Fader label="Timing nudge" value={active.nudgeMs} min={-300} max={300} step={10} show={`${active.nudgeMs > 0 ? '+' : ''}${active.nudgeMs} ms`} onChange={(v) => set({ nudgeMs: v })} />
                </Strip>
              </div>
            </div>

            <div className="studio-window rounded-[14px] border border-line p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={analyze} disabled={!!busy} className="h-9 px-4 rounded-full border border-amber/60 text-amber text-[12px] font-semibold disabled:opacity-40">📊 Measure my mix</button>
                <span className="text-[11px] text-ink3">Renders the whole song and checks loudness, peaks and how well it sits for {spec.style}.</span>
              </div>
              {report && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="studio-chip rounded-[10px] p-2"><div className="text-[18px] font-black text-ink num">{report.grade}</div><div className="text-[10px] text-ink3">Mix grade · {gradeWord(report.grade)}</div></div>
                  <div className="studio-chip rounded-[10px] p-2"><div className="text-[18px] font-black text-ink num">{report.loudness}</div><div className="text-[10px] text-ink3">Loudness (aim {TARGET_LUFS}) · {loudHint}</div></div>
                  <div className="studio-chip rounded-[10px] p-2"><div className={cn('text-[18px] font-black num', report.peak > -0.3 ? 'text-fall' : 'text-ink')}>{report.peak}</div><div className="text-[10px] text-ink3">Peak dBFS · {report.peak > -0.3 ? 'clipping risk' : 'headroom ok'}</div></div>
                  <div className="studio-chip rounded-[10px] p-2"><div className="text-[18px] font-black text-ink num">{report.fit}</div><div className="text-[10px] text-ink3">Fit for {spec.style}</div></div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={print} disabled={!report || !!busy} className="h-10 px-5 rounded-full bg-fall text-white font-bold text-[13px] disabled:opacity-40">🖨️ Print mix & master</button>
                <span className="text-[11px] text-ink3">{report ? 'This sets the record\'s sound and releases it from rough. Re-printing replaces the old effect.' : 'Measure first — you can\'t print what you haven\'t heard.'}</span>
              </div>
            </div>
          </>
        )}
        {msg && <div className="text-[12px] text-ink2 leading-snug">{msg}</div>}
      </div>
    </div>
  );
}
