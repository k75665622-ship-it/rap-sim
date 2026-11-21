// ─── DIRECTOR'S CUT ────────────────────────────────────────────────────────
// Edit the footage you shot in the city: four camera angles, cut on the beat,
// with filters, text and transitions. Auto-edit does a decent job in one tap;
// the Timeline lets you do it by hand, and a careful hand grades higher.
// The game renders the finished video, and a good cut lifts your music video.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';
import { beatSpecFor } from '../../audio/beat';
import { loadTake } from '../../audio/take';
import { soundOf, downloadBlob } from '../../audio/vocalfx';
import { stopPreview } from '../../audio/preview';
import { loadShoot, listShoots, type Shoot } from '../../video/clipstore';
import { autoEdit, gradeEdit, totalSec, startBeat, cutId, BEAT_CHOICES, FILTERS, TRANSITIONS, type Cut, type Edit, type Move } from '../../video/edl';
import { FrameBank, runEdit, stillAt, videoAudio, type Run } from '../../video/render';
import { ANGLES, ANGLE_SEC } from '../../world/shootcam';
import { cn } from '@/utils/cn';

const chip = (on: boolean) => cn('h-8 px-3 rounded-full border text-[12px] font-semibold whitespace-nowrap', on ? 'border-amber bg-amber text-black' : 'border-white/15 text-white/70');

export function DirectorsCut({ shootId, onClose }: { shootId?: string; onClose: () => void }) {
  const songs = useGameStore((s) => s.songs);
  const selected = useGameStore((s) => s.selectedSongId);
  const library = useGameStore((s) => s.beats?.library);
  const attach = useGameStore((s) => s.attachDirectorCut);
  const mine = useMemo(() => songs.filter((s) => !s.ownerId && !s.archivedAt), [songs]);
  const [songId, setSongId] = useState<string>(mine.find((s) => s.id === selected)?.id ?? mine[0]?.id ?? '');
  const song = mine.find((s) => s.id === songId);
  const spec = useMemo(() => {
    if (!song) return beatSpecFor('hip_hop', 90, 'director-demo', 70);
    const owned = library?.find((b) => b.id === song.beatId || b.usedOnSongId === song.id);
    return owned ? beatSpecFor(String(owned.genre), owned.bpm, owned.id, owned.quality, owned.producerId ?? owned.producerName, owned.mood)
      : beatSpecFor(String(song.genre), song.bpm, song.beatId ?? song.id, song.beatQuality ?? song.productionQuality ?? song.quality, song.producerId ?? song.producerName ?? song.ownerId, song.mood);
  }, [song, library]);

  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [none, setNone] = useState(false);
  const [mode, setMode] = useState<'auto' | 'timeline'>('auto');
  const [secs, setSecs] = useState(20);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [auto, setAuto] = useState(true);
  const [sel, setSel] = useState(0);
  const [take, setTake] = useState<Blob | null>(null);
  const [useVocal, setUseVocal] = useState(true);
  const [startBar, setStartBar] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [prep, setPrep] = useState(false);
  const [time, setTime] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [out, setOut] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bank = useRef<FrameBank | null>(null);
  const run = useRef<Run | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const id = shootId ?? (await listShoots())[0]?.id;
      const sh = id ? await loadShoot(id) : null;
      if (!on) return;
      if (!sh) { setNone(true); return; }
      bank.current = new FrameBank(sh);
      setShoot(sh);
    })();
    stopPreview();
    return () => { on = false; run.current?.stop(); bank.current?.close(); };
  }, [shootId]);
  useEffect(() => { let on = true; setTake(null); if (songId) loadTake(songId).then((b) => { if (on) setTake(b); }); return () => { on = false; }; }, [songId]);

  const bpm = Math.round(spec.bpm);
  const build = (seconds = secs) => {
    const e = autoEdit({ bpm, seconds, genre: String(song?.genre ?? 'hip_hop'), title: song ? `${song.title} — ${useGameStore.getState().player?.artistName ?? ''}` : '', seed: Date.now() & 0xffff });
    setEdit(e); setAuto(true); setSel(0); setOut(null);
  };
  useEffect(() => { if (shoot && !edit) build(); /* eslint-disable-next-line */ }, [shoot]);
  // a new song means a new tempo: rebuild so cuts stay on its beat
  useEffect(() => { if (edit && edit.bpm !== bpm) setEdit({ ...edit, bpm }); /* eslint-disable-next-line */ }, [bpm]);
  useEffect(() => { if (edit && shoot && canvas.current && !playing) stillAt(canvas.current, edit, bank.current!, Math.min(Math.max(time, 0.7), Math.max(0, totalSec(edit) - 0.01))); /* eslint-disable-next-line */ }, [edit, shoot, sel]);

  const grade = useMemo(() => (edit ? gradeEdit(edit) : null), [edit]);
  const total = edit ? totalSec(edit) : 0;
  const change = (f: (e: Edit) => Edit) => { setEdit((e) => (e ? f(e) : e)); setAuto(false); setOut(null); };
  const patchCut = (i: number, p: Partial<Cut>) => change((e) => ({ ...e, cuts: e.cuts.map((c, k) => (k === i ? { ...c, ...p } : c)) }));

  const audio = async (seconds: number) =>
    videoAudio(spec, seconds + startBar * (240 / bpm) + 1, take && useVocal && song ? { blob: take, lead: song.boothTake?.lead ?? 0, fx: soundOf(song), hookBars: song.hookBars } : null);

  const play = async (record: boolean) => {
    if (!edit || !canvas.current || !bank.current) return;
    run.current?.stop();
    setMsg(record ? 'Rendering — keep this open until it finishes…' : null);
    if (record) setRendering(true);
    setPrep(true);
    let buf: AudioBuffer;
    try { buf = await audio(total); } catch (err) { console.error('dc-audio', err); setPrep(false); setRendering(false); setMsg('Could not prepare the audio: ' + String((err as Error)?.message ?? err)); return; }
    setPrep(false);
    setPlaying(true);
    const r = runEdit({ canvas: canvas.current, edit, bank: bank.current, audio: buf, record, offset: startBar * (240 / bpm), onTime: setTime, onEnd: () => setPlaying(false) });
    run.current = r;
    const blob = await r.done;
    setPlaying(false); setRendering(false);
    window.setTimeout(() => redraw(0), 100);
    if (record) {
      if (blob && blob.size > 1000) { setOut({ url: URL.createObjectURL(blob), blob, ext: blob.type.includes('mp4') ? 'mp4' : 'webm' }); setMsg('Done. Your video is rendered.'); }
      else setMsg("This browser can't record video. Try Chrome or Edge, or play it back and screen-record.");
    }
  };
  const redraw = (t: number) => { if (edit && canvas.current && bank.current) stillAt(canvas.current, edit, bank.current, Math.min(Math.max(t, 0.7), Math.max(0, total - 0.01))); };
  const stop = () => { run.current?.stop(); setPlaying(false); window.setTimeout(() => redraw(time), 150); };

  const cut = edit?.cuts[sel];
  const w = shoot?.meta.w ?? 640, h = shoot?.meta.h ?? 360;
  const move = (d: number) => change((e) => { const a = [...e.cuts]; const j = sel + d; if (j < 0 || j >= a.length) return e; [a[sel], a[j]] = [a[j], a[sel]]; setSel(j); return { ...e, cuts: a }; });

  return createPortal(
    <div className="fixed inset-0 z-[400] bg-black/90 overflow-y-auto" data-testid="directors-cut">
      <div className="mx-auto max-w-[560px] p-3 pb-24 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[17px] font-black tracking-wide">🎬 DIRECTOR'S CUT</div>
          <button onClick={() => { run.current?.stop(); onClose(); }} className="h-8 px-3 rounded-full border border-white/20 text-[12px]">Close</button>
        </div>
        {none ? (
          <div className="rounded-2xl border border-white/10 p-4 text-[14px]">No footage yet. Walk the city, press <b>🎬 Shoot a clip</b> (or V), and come back. The shoot films four camera angles for you to cut between.</div>
        ) : !shoot || !edit ? <div className="text-white/60 p-6">Loading footage…</div> : (
          <>
            <div className="flex gap-2 mb-2 items-center">
              <select value={songId} onChange={(e) => setSongId(e.target.value)} className="flex-1 h-9 rounded-lg bg-white/10 border border-white/15 px-2 text-[13px]">
                {mine.length === 0 ? <option value="">Demo beat (no record yet)</option> : mine.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <span className="text-[12px] text-white/60">{bpm} BPM</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black mb-2" style={{ aspectRatio: `${w} / ${h}`, maxHeight: '48vh', margin: '0 auto' }}>
              <canvas ref={canvas} width={w} height={h} className="w-full h-full" data-testid="dc-canvas" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              {playing && !rendering ? <button onClick={stop} className="h-9 px-4 rounded-full bg-white text-black text-[13px] font-bold">■ Stop</button> : <button disabled={rendering || prep} onClick={() => play(false)} className="h-9 px-4 rounded-full bg-amber text-black text-[13px] font-bold disabled:opacity-40" data-testid="dc-play">{prep ? 'Preparing…' : '▶ Play'}</button>}
              <div className="flex-1 h-1.5 rounded bg-white/15 overflow-hidden"><div className="h-full bg-amber" style={{ width: `${total ? Math.min(100, (time / total) * 100) : 0}%` }} /></div>
              <span className="text-[12px] text-white/60 tabular-nums">{time.toFixed(1)} / {total.toFixed(1)}s</span>
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode('auto')} className={chip(mode === 'auto')}>⚡ Auto-edit</button>
              <button onClick={() => setMode('timeline')} className={chip(mode === 'timeline')}>🎞️ Timeline</button>
            </div>

            {mode === 'auto' ? (
              <div className="rounded-2xl border border-white/10 p-3 mb-3">
                <div className="text-[13px] text-white/70 mb-2">One tap: the game cuts your four angles to the beat, picks a look for your genre and adds your title. Fine for a quick post. For a top grade, polish it in the Timeline.</div>
                <div className="flex gap-2 flex-wrap mb-2">
                  {[12, 20, 30].map((n) => <button key={n} onClick={() => setSecs(n)} className={chip(secs === n)}>{n}s</button>)}
                  <button onClick={() => build(secs)} className="h-8 px-4 rounded-full bg-fall text-white text-[12px] font-bold" data-testid="dc-auto">⚡ Auto-edit</button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 p-3 mb-3">
                <div className="flex gap-1 overflow-x-auto pb-2" data-testid="dc-strip">
                  {edit.cuts.map((c, i) => (
                    <button key={c.id} onClick={() => { setSel(i); stop(); setTime(0); }} style={{ minWidth: 28 + c.beats * 12 }} className={cn('h-14 rounded-lg border text-[10px] px-1 flex flex-col justify-between', i === sel ? 'border-amber bg-amber/20' : 'border-white/15 bg-white/5')}>
                      <span>{ANGLES[c.angle].emoji}{c.trans !== 'cut' ? ' ✦' : ''}</span><span className="text-white/60">{c.beats}b{startBeat(edit, i) % 4 === 0 ? ' |' : ''}</span>
                    </button>
                  ))}
                  <button onClick={() => { change((e) => ({ ...e, cuts: [...e.cuts, { id: cutId(), angle: (e.cuts[e.cuts.length - 1]?.angle ?? 0) + 1 & 3, from: 0, beats: 2, trans: 'cut', move: 'none' }] })); setSel(edit.cuts.length); }} className="min-w-10 h-14 rounded-lg border border-dashed border-white/25 text-[18px]" data-testid="dc-add">＋</button>
                </div>
                {cut && (
                  <div className="space-y-2 text-[12px]">
                    <div className="flex gap-1 flex-wrap">{ANGLES.map((a) => <button key={a.id} onClick={() => patchCut(sel, { angle: a.id })} className={chip(cut.angle === a.id)}>{a.emoji} {a.name}</button>)}</div>
                    <div className="flex items-center gap-2"><span className="w-16 text-white/60">Length</span><div className="flex gap-1 flex-wrap">{BEAT_CHOICES.map((b) => <button key={b} onClick={() => patchCut(sel, { beats: b })} className={chip(cut.beats === b)}>{b} beat{b > 1 ? 's' : ''}</button>)}</div></div>
                    <div className="flex items-center gap-2"><span className="w-16 text-white/60">Start</span><input type="range" min={0} max={ANGLE_SEC * 10 - 5} value={Math.round(cut.from * 10)} onChange={(e) => patchCut(sel, { from: +e.target.value / 10 })} className="flex-1" /><span className="w-8 tabular-nums">{cut.from.toFixed(1)}s</span></div>
                    <div className="flex items-center gap-2"><span className="w-16 text-white/60">Into it</span><div className="flex gap-1 flex-wrap">{TRANSITIONS.map((t) => <button key={t.id} onClick={() => patchCut(sel, { trans: t.id })} className={chip(cut.trans === t.id)}>{t.name}</button>)}</div></div>
                    <div className="flex items-center gap-2"><span className="w-16 text-white/60">Camera</span><div className="flex gap-1">{(['none', 'in', 'out'] as Move[]).map((m) => <button key={m} onClick={() => patchCut(sel, { move: m })} className={chip(cut.move === m)}>{m === 'none' ? 'Still' : m === 'in' ? 'Push in' : 'Pull out'}</button>)}</div></div>
                    <input value={cut.text ?? ''} onChange={(e) => patchCut(sel, { text: e.target.value.slice(0, 28) })} placeholder="Text on this cut (optional)" className="w-full h-9 rounded-lg bg-white/10 border border-white/15 px-2" />
                    <div className="flex gap-2">
                      <button onClick={() => move(-1)} className={chip(false)}>← Earlier</button><button onClick={() => move(1)} className={chip(false)}>Later →</button>
                      <button onClick={() => change((e) => ({ ...e, cuts: [...e.cuts.slice(0, sel + 1), { ...cut, id: cutId() }, ...e.cuts.slice(sel + 1)] }))} className={chip(false)}>Copy</button>
                      <button onClick={() => { if (edit.cuts.length > 1) { change((e) => ({ ...e, cuts: e.cuts.filter((_, k) => k !== sel) })); setSel(Math.max(0, sel - 1)); } }} className={chip(false)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 p-3 mb-3 space-y-2 text-[12px]">
              <div className="font-bold text-[13px]">Look &amp; text</div>
              <div className="flex gap-1 flex-wrap">{FILTERS.map((f) => <button key={f.id} onClick={() => change((e) => ({ ...e, filter: f.id }))} className={chip(edit.filter === f.id)}>{f.name}</button>)}</div>
              <div className="flex gap-3"><label className="flex items-center gap-1"><input type="checkbox" checked={edit.grain} onChange={(e) => change((x) => ({ ...x, grain: e.target.checked }))} />Grain</label><label className="flex items-center gap-1"><input type="checkbox" checked={edit.bars} onChange={(e) => change((x) => ({ ...x, bars: e.target.checked }))} />Cinema bars</label></div>
              <input value={edit.title} onChange={(e) => change((x) => ({ ...x, title: e.target.value.slice(0, 40) }))} placeholder="Title (shows for the first 3 seconds)" className="w-full h-9 rounded-lg bg-white/10 border border-white/15 px-2" />
              <input value={edit.endCard} onChange={(e) => change((x) => ({ ...x, endCard: e.target.value.slice(0, 28) }))} placeholder="End card, e.g. OUT NOW" className="w-full h-9 rounded-lg bg-white/10 border border-white/15 px-2" />
              <div className="flex items-center gap-2 flex-wrap">
                {take ? <label className="flex items-center gap-1"><input type="checkbox" checked={useVocal} onChange={(e) => setUseVocal(e.target.checked)} />Use my vocal</label> : <span className="text-white/50">Beat only (record a take in the booth to add your voice)</span>}
                <span className="text-white/60 ml-auto">Start at bar</span>
                <button onClick={() => setStartBar(Math.max(0, startBar - 1))} className={chip(false)}>−</button><span>{startBar + 1}</span><button onClick={() => setStartBar(Math.min(24, startBar + 1))} className={chip(false)}>＋</button>
              </div>
            </div>

            {grade && (
              <div className="rounded-2xl border border-white/10 p-3 mb-3" data-testid="dc-grade">
                <div className="flex items-baseline gap-2"><span className="text-[28px] font-black text-amber">{grade.score}</span><span className="text-[12px] text-white/60">director's grade{auto ? ' · auto-edit' : ' · hand-cut'}</span></div>
                <ul className="text-[12px] text-white/70 list-disc pl-4 mt-1 space-y-0.5">{grade.notes.length ? grade.notes.slice(0, 5).map((n) => <li key={n}>{n}</li>) : <li>Nothing to fix. That is a tight cut.</li>}</ul>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button disabled={rendering} onClick={() => play(true)} className="h-10 px-4 rounded-full bg-fall text-white text-[13px] font-bold disabled:opacity-50" data-testid="dc-render">{rendering ? `Rendering… ${time.toFixed(0)}/${total.toFixed(0)}s` : '🎞️ Render video'}</button>
              {out && <button onClick={() => downloadBlob(out.blob, `rap-life-cut.${out.ext}`)} className="h-10 px-4 rounded-full border border-white/25 text-[13px] font-semibold">⬇ Save video</button>}
              {out && song && grade && <button onClick={() => { const r = attach(song.id, grade.score, total, auto); setMsg(r.message); }} className="h-10 px-4 rounded-full bg-amber text-black text-[13px] font-bold" data-testid="dc-attach">Use for "{song.title}"</button>}
            </div>
            {msg && <div className="mt-2 text-[12px] text-amber" data-testid="dc-msg">{msg}</div>}
            {out && <video src={out.url} controls playsInline className="w-full rounded-xl mt-3 bg-black" data-testid="dc-video" />}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
