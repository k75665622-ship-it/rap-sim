// ─── THE MIX IS BACK ───────────────────────────────────────────────────────
// Your rough against their mix, one tap each. Tell them where the hook is,
// send notes ("vocal louder, more echo, bigger hook") and get a new version
// tomorrow — a couple of rounds are part of the job, after that it costs. Or
// sign it off, or keep your own sound.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { beatSpecFor } from '../../audio/beat';
import { loadTake } from '../../audio/take';
import { stopPreview } from '../../audio/preview';
import { DEFAULT_FX, playMix, prepareVocal, renderSong, downloadBlob, type Mix } from '../../audio/vocalfx';
import { ASK_LABEL, revisionFee } from '../../sim/engineerMix';
import { producerFee } from '../../sim/studio';
import type { MixAsk, VocalFx } from '../../types/game';
import { BarStrip } from './BarStrip';
import { cn } from '@/utils/cn';

const ASKS = Object.keys(ASK_LABEL) as MixAsk[];
const skillWord = (s: number) => (s >= 80 ? 'elite ear' : s >= 65 ? 'seasoned' : s >= 45 ? 'solid' : s >= 25 ? 'still learning' : 'beginner');

export function MixReview({ songId, onClose }: { songId: string; onClose: () => void }) {
  const song = useGameStore((s) => s.songs.find((x) => x.id === songId));
  const library = useGameStore((s) => s.beats?.library);
  const player = useGameStore((s) => s.player);
  const approve = useGameStore((s) => s.approveMix);
  const keep = useGameStore((s) => s.keepRoughMix);
  const ask = useGameStore((s) => s.askMixChanges);
  const setHook = useGameStore((s) => s.setHookBars);
  const [take, setTake] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState<'rough' | 'mix' | null>(null);
  const [asks, setAsks] = useState<MixAsk[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [playBar, setPlayBar] = useState<number | null>(null);
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
  useEffect(() => {
    if (!playing || !spec) { setPlayBar(null); return; }
    const bar = (60 / spec.bpm) * 4;
    const id = window.setInterval(() => { const m = mixRef.current; const c = ctxRef.current; if (m && c) setPlayBar(Math.floor((c.currentTime - m.startedAt) / bar) - 1); }, 150);
    return () => window.clearInterval(id);
  }, [playing, spec]);

  if (!song || !song.engineerMix) return null;
  const m = song.engineerMix;
  const first = m.by.split(' ')[0];
  const rough = m.rough ?? song.vocalFx ?? DEFAULT_FX;
  const bar = spec ? (60 / spec.bpm) * 4 : 2;
  const lead = song.boothTake?.lead ?? bar;
  const hook = song.hookBars ?? [];
  const bars = Math.min(60, Math.ceil(Math.max(8, song.boothTake?.seconds ?? 30) / bar));
  const fee = revisionFee(m.skill, m.round, m.freeRounds, producerFee(m.skill));
  const left = Math.max(0, m.freeRounds - m.round + 1);
  const latest = m.history.length ? m.history[m.history.length - 1].reply : null;

  function ctx() {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }
  async function voice(fx: VocalFx) {
    const c = ctx();
    if (!bufRef.current) bufRef.current = await c.decodeAudioData(await take!.arrayBuffer());
    return prepareVocal(c, bufRef.current, fx, { root: spec!.root, major: spec!.major }, hook);
  }
  async function play(kind: 'rough' | 'mix') {
    mixRef.current?.stop(); mixRef.current = null;
    if (playing === kind) { setPlaying(null); return; }
    if (!take || !spec) return;
    stopPreview();
    const fx = kind === 'mix' ? m.fx : rough;
    setBusy('tune');
    try {
      const v = await voice(fx);
      mixRef.current = playMix(ctx(), spec, v, fx, lead, hook, () => { mixRef.current = null; setPlaying(null); });
      setPlaying(kind);
    } catch { setMsg('Could not play the take on this device.'); }
    setBusy(null);
  }
  async function download() {
    if (!take || !spec) return;
    setBusy('render');
    try { downloadBlob(await renderSong(spec, await voice(m.fx), m.fx, lead, hook), `${song!.title} (mix v${m.round})${player?.artistName ? ` - ${player.artistName}` : ''}.wav`); }
    catch { setMsg('Could not render the mix on this device.'); }
    setBusy(null);
  }
  const close = () => { mixRef.current?.stop(); onClose(); };
  const open = m.status === 'review';

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80" onClick={close} />
      <div className="relative w-full sm:max-w-[540px] max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-line p-5 space-y-4" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(245,179,1,0.16), rgba(10,11,16,0) 60%), #0c0d12' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-bold text-ink">🎚️ {first}'s mix of “{song.title}”</div>
            <div className="text-[11px] text-ink3">{m.role === 'engineer' ? 'Engineer' : 'Producer'} · skill {m.skill} — {skillWord(m.skill)} · version {m.round}</div>
          </div>
          <button onClick={close} className="w-9 h-9 rounded-full border border-line text-ink2 shrink-0" aria-label="Close">✕</button>
        </div>

        <div className={cn('rounded-[12px] border px-3 py-2 text-[12px]', m.status === 'revising' ? 'border-amber/40 text-amber' : m.status === 'approved' ? 'border-rise/40 text-rise' : m.status === 'rough' ? 'border-line text-ink3' : 'border-line text-ink2')}>
          {m.status === 'revising' ? `⏳ ${first} is working on your notes — the new version lands tomorrow.` : m.status === 'approved' ? '✅ You approved this mix. It\'s what people will hear.' : m.status === 'rough' ? 'You kept your own rough mix on this one.' : 'Listen to both, then approve it or send notes.'}
        </div>

        <div className="rounded-[14px] border border-line bg-black/30 p-3 space-y-1.5">
          <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider">{first} says</div>
          {latest ? <div className="text-[13px] text-ink2 leading-snug">“{latest}”</div> : m.notes.map((n, i) => <div key={i} className="text-[13px] text-ink2 leading-snug">• {n}</div>)}
        </div>

        {!take ? <div className="text-[12px] text-ink3">The take for this song isn't on this device, so it can't be played here.</div> : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => play('rough')} disabled={busy === 'tune'} className={cn('h-14 rounded-[14px] border text-[13px] font-semibold', playing === 'rough' ? 'border-ink bg-ink text-black' : 'border-line text-ink2')}>{playing === 'rough' ? '■ Stop' : '▶ Your rough'}</button>
            <button onClick={() => play('mix')} disabled={busy === 'tune'} className={cn('h-14 rounded-[14px] border text-[13px] font-bold', playing === 'mix' ? 'border-amber bg-amber text-black' : 'border-amber/60 text-amber')}>{playing === 'mix' ? '■ Stop' : `▶ ${first}'s mix v${m.round}`}</button>
          </div>
        )}
        {busy === 'tune' && <div className="text-[11px] text-amber">🎶 Tuning the vocal…</div>}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-ink">📣 Where's the hook?</span><span className="text-ink3">{hook.length ? `${hook.length} bars marked` : 'tap the bars — they\'ll stack it'}</span></div>
          <BarStrip bars={bars} hook={hook} now={playBar} onToggle={open || m.status === 'revising' ? (b) => setHook(song.id, hook.includes(b) ? hook.filter((x) => x !== b) : [...hook, b]) : undefined} />
        </div>

        {open && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-ink">Notes for {first} <span className="text-ink3 font-normal">(up to 3)</span></span><span className={fee ? 'text-fall' : 'text-ink3'}>{fee ? `This round: $${fee.toLocaleString()} — and they'll feel it` : `${left} free round${left === 1 ? '' : 's'} left`}</span></div>
            <div className="flex flex-wrap gap-1.5">
              {ASKS.map((a) => {
                const on = asks.includes(a);
                return <button key={a} onClick={() => setAsks((x) => (on ? x.filter((y) => y !== a) : x.length >= 3 ? x : [...x, a]))} className={cn('h-8 px-2.5 rounded-full border text-[11px]', on ? 'border-amber bg-amber text-black font-semibold' : 'border-line text-ink2 hover:text-ink')}>{ASK_LABEL[a]}</button>;
              })}
            </div>
            <button onClick={() => { const r = ask(song.id, asks); setMsg(r.message); if (r.ok) { setAsks([]); mixRef.current?.stop(); setPlaying(null); } }} disabled={!asks.length} className="w-full h-11 rounded-[12px] border border-amber/60 text-amber font-semibold text-[13px] disabled:opacity-40">📝 Send notes{asks.length ? ` (${asks.length})` : ''}</button>
          </div>
        )}

        <div className="flex gap-2">
          {open && <button onClick={() => { const r = approve(song.id); setMsg(r.message); }} className="flex-1 h-11 rounded-[12px] bg-amber text-black font-bold text-[13px]">✅ Approve the mix</button>}
          {(open || m.status === 'approved') && <button onClick={() => { const r = keep(song.id); setMsg(r.message); }} className="flex-1 h-11 rounded-[12px] border border-line text-ink2 text-[13px]">Keep my rough</button>}
        </div>
        {take && <button onClick={download} disabled={!!busy} className="w-full h-10 rounded-[12px] border border-line text-[12px] text-ink2 disabled:opacity-40">{busy === 'render' ? 'Rendering…' : `⬇ Download ${first}'s mix (WAV)`}</button>}
        {msg && <div className="text-[12px] text-ink2 leading-snug">{msg}</div>}
        {m.history.length > 0 && (
          <details className="text-[11px] text-ink3">
            <summary className="cursor-pointer">Earlier rounds ({m.history.length})</summary>
            <div className="mt-2 space-y-1.5">{m.history.map((h) => <div key={h.round}><span className="text-ink2">v{h.round}</span> — you asked: {h.asks.map((a) => ASK_LABEL[a]).join(', ')}. <span className="text-ink2">“{h.reply}”</span></div>)}</div>
          </details>
        )}
      </div>
    </div>
  );
}
