// ─── BEAT MAKER ────────────────────────────────────────────────────────────
// Build a beat from real drum hits and instrument notes: a step sequencer for
// the drums, a piano roll for the 808 and the melody, a chord helper, and an
// arrangement (intro → verse → hook → outro). It plays as you edit. Save it
// to your library, rap on it in the booth, or export it (and its stems).

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';
import { BeatPlayer, beatSpecFor, registerPattern, DRUM_LANES, LEAD_LABEL, type CustomPattern, type DrumLane, type Lead, type PatNote, type Section, type LayerMask } from '../../audio/beat';
import { loadKit } from '../../audio/kit';
import { stopPreview } from '../../audio/preview';
import { downloadBlob, wav, createBus } from '../../audio/vocalfx';
import { TEMPLATES, progressionsFor, rollRows, scorePattern, ALL_SECTIONS, STYLE_FOR_GENRE } from '../../sim/beatMaker';
import { MOODS } from '../../sim/studio';
import type { Genre, SongMood } from '../../types/game';
import { cn } from '@/utils/cn';

const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const GENRES: { id: Genre; label: string }[] = [{ id: 'trap', label: 'Trap' }, { id: 'drill', label: 'Drill' }, { id: 'hip_hop', label: 'Hip-hop / boom bap' }, { id: 'afrobeats', label: 'Afrobeats' }, { id: 'amapiano', label: 'Amapiano' }, { id: 'dancehall', label: 'Dancehall' }, { id: 'rnb', label: 'R&B' }];
const SEC_EMOJI: Record<Section, string> = { intro: '🌅', verse: '🎤', hook: '🔥', bridge: '🌉', outro: '🌙' };
const midiName = (semis: number, root: number) => KEYS[(root + semis) % 12];

type Tab = 'drums' | 'bass' | 'melody' | 'chords' | 'arrange' | 'sound';

export function BeatMaker({ beatId, onClose, onUse }: { beatId?: string; onClose: () => void; onUse?: (id: string) => void }) {
  const library = useGameStore((s) => s.beats?.library);
  const player = useGameStore((s) => s.player);
  const makeBeat = useGameStore((s) => s.makeBeat);
  const existing = beatId ? library?.find((b) => b.id === beatId && b.pattern) : undefined;
  const [pat, setPat] = useState<CustomPattern>(() => existing?.pattern ?? TEMPLATES[1].make());
  const [name, setName] = useState(existing?.name ?? '');
  const [genre, setGenre] = useState<Genre>(existing?.genre ?? 'trap');
  const [mood, setMood] = useState<SongMood>(existing?.mood ?? 'defiant');
  const [tab, setTab] = useState<Tab>('drums');
  const [bar, setBar] = useState(0);
  const [noteLen, setNoteLen] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState<{ step: number; sec: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>(existing?.id);
  const ctxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<BeatPlayer | null>(null);
  const atRef = useRef(0);

  const skill = player?.stats.productionKnowledge ?? 0;
  const grade = useMemo(() => scorePattern(pat, skill), [pat, skill]);
  const rows = useMemo(() => ({ bass: rollRows(pat.major, 1, 0), melody: rollRows(pat.major, 2, 12) }), [pat.major]);
  const stepDur = 60 / pat.bpm / 4;

  useEffect(() => { void loadKit(); return () => { stop(); ctxRef.current?.close().catch(() => {}); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { playerRef.current?.setPattern(pat); }, [pat]);
  useEffect(() => {
    if (!playing) { setHead(null); return; }
    const id = window.setInterval(() => {
      const c = ctxRef.current; if (!c) return;
      const st = Math.floor((c.currentTime - atRef.current) / stepDur);
      if (st < 0) return;
      const totalBars = pat.arrangement.length * pat.sectionBars;
      const b = Math.floor(st / 16) % totalBars;
      setHead({ step: (b % pat.bars) * 16 + (st % 16), sec: Math.floor(b / pat.sectionBars) });
    }, 50);
    return () => window.clearInterval(id);
  }, [playing, stepDur, pat.arrangement.length, pat.sectionBars, pat.bars]);

  const spec = () => { registerPattern('__editor__', pat); return beatSpecFor(genre, pat.bpm, '__editor__', 70, undefined, mood); };
  function ctx() {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }
  function play() {
    stopPreview(); stop();
    const c = ctx(); const bus = createBus(c, c.destination);
    const p = new BeatPlayer(c, spec(), bus, 0.9);
    atRef.current = c.currentTime + 0.08; p.start(atRef.current);
    playerRef.current = p; setPlaying(true);
  }
  function stop() { playerRef.current?.stop(); playerRef.current = null; setPlaying(false); }

  const upd = (patch: Partial<CustomPattern>) => { setPat((p) => ({ ...p, ...patch })); setSavedId((s) => s); };
  const toggleStep = (lane: DrumLane, st: number) => setPat((p) => { const cur = p.drums[lane]; return { ...p, drums: { ...p.drums, [lane]: cur.includes(st) ? cur.filter((x) => x !== st) : [...cur, st] } }; });
  function toggleNote(kind: 'bass' | 'melody', st: number, semis: number) {
    setPat((p) => {
      const list = p[kind];
      const hit = list.find((n) => n.step <= st && st < n.step + n.len && n.semis === semis);
      if (hit) return { ...p, [kind]: list.filter((n) => n !== hit) };
      // One voice at a time on the 808.
      const rest = kind === 'bass' ? list.filter((n) => !(n.step < st + noteLen && st < n.step + n.len)) : list;
      const note: PatNote = { step: st, len: noteLen, semis };
      return { ...p, [kind]: [...rest, note] };
    });
  }
  const toggleSlide = (n: PatNote) => setPat((p) => ({ ...p, bass: p.bass.map((x) => (x === n ? { ...x, slide: !x.slide } : x)) }));
  function setBars(n: number) {
    setBar(0);
    setPat((p) => ({
      ...p, bars: n,
      drums: Object.fromEntries(Object.entries(p.drums).map(([k, v]) => [k, v.filter((s) => s < n * 16)])) as CustomPattern['drums'],
      bass: p.bass.filter((x) => x.step < n * 16), melody: p.melody.filter((x) => x.step < n * 16),
      chords: Array.from({ length: n }, (_, i) => p.chords[i] ?? p.chords[i % p.chords.length] ?? 0),
    }));
  }
  function loadTemplate(id: string) { const t = TEMPLATES.find((x) => x.id === id)!.make(); setPat(t); setBar(0); setGenre(({ trap: 'trap', boom: 'hip_hop', afro: 'afrobeats', blank: genre } as Record<string, Genre>)[id] ?? genre); setMsg(null); }

  function save(asNew = false) {
    const r = makeBeat({ id: asNew ? undefined : savedId, name: name || 'Untitled beat', genre, mood, pattern: { ...pat, style: STYLE_FOR_GENRE[genre] ?? pat.style } });
    setMsg(r.message);
    if (r.ok && r.beatId) { setSavedId(r.beatId); registerPattern(r.beatId, pat); }
  }
  async function render(mask: LayerMask): Promise<Blob> {
    const sr = 44100;
    const secs = pat.arrangement.length * pat.sectionBars * 16 * stepDur;
    const oc = new OfflineAudioContext(2, Math.ceil(sr * (secs + 2)), sr);
    const bus = createBus(oc, oc.destination);
    const p = new BeatPlayer(oc, spec(), bus, 0.9); p.mask = mask; p.scheduleAll(0.05, secs);
    return wav(await oc.startRendering());
  }
  async function exportAll(stems: boolean) {
    setMsg('Rendering…');
    const base = (name || 'beat').replace(/[^\w -]+/g, '');
    try {
      if (!stems) downloadBlob(await render({ drums: true, bass: true, melody: true, chords: true }), `${base}.wav`);
      else for (const k of ['drums', 'bass', 'melody', 'chords'] as const) downloadBlob(await render({ drums: false, bass: false, melody: false, chords: false, [k]: true }), `${base} - stem ${k}.wav`);
      setMsg(stems ? 'Stems exported: drums, 808, melody, chords.' : 'Beat exported.');
    } catch { setMsg('Could not render the beat on this device.'); }
  }

  const colOf = (st: number) => st % 16;
  const Cell = ({ on, now, beat, onClick, label }: { on: boolean; now: boolean; beat: boolean; onClick: () => void; label: string }) => (
    <button onClick={onClick} aria-label={label} aria-pressed={on} className={cn('h-8 flex-1 min-w-0 rounded-[5px] border transition', on ? 'bg-amber border-amber' : beat ? 'bg-white/[0.07] border-line' : 'bg-white/[0.025] border-line/60', now && 'ring-2 ring-fall/70')} />
  );
  const barOffset = bar * 16;
  const headHere = (st: number) => head !== null && head.step === st;

  const roll = (kind: 'bass' | 'melody') => {
    const rs = rows[kind];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] text-ink3">
          <span>Tap a square to place a note. Length:</span>
          {[1, 2, 4, 8].map((n) => <button key={n} onClick={() => setNoteLen(n)} className={cn('h-6 px-2 rounded-full border', noteLen === n ? 'border-amber text-amber' : 'border-line text-ink2')}>{n} step{n > 1 ? 's' : ''}</button>)}
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[560px] space-y-[3px]">
            {[...rs].reverse().map((semis) => (
              <div key={semis} className="flex items-center gap-1">
                <span className="w-9 shrink-0 text-[9px] text-ink3 text-right num">{midiName(semis, pat.root)}</span>
                <div className="flex flex-1 gap-[3px]">
                  {Array.from({ length: 16 }, (_, i) => {
                    const st = barOffset + i;
                    const note = pat[kind].find((n) => n.step <= st && st < n.step + n.len && n.semis === semis);
                    return <button key={i} onClick={() => toggleNote(kind, st, semis)} aria-label={`${midiName(semis, pat.root)} step ${i + 1}`} className={cn('h-5 flex-1 min-w-0 rounded-[3px] border', note ? (note.step === st ? 'bg-amber border-amber' : 'bg-amber/60 border-amber/60') : i % 4 === 0 ? 'bg-white/[0.07] border-line' : 'bg-white/[0.025] border-line/60', headHere(st) && 'ring-1 ring-fall')} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        {kind === 'bass' && pat.bass.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[11px]"><span className="text-ink3">808 slides:</span>{pat.bass.filter((n) => n.step >= barOffset && n.step < barOffset + 16).map((n, i) => <button key={i} onClick={() => toggleSlide(n)} className={cn('h-6 px-2 rounded-full border', n.slide ? 'border-amber text-amber' : 'border-line text-ink2')}>step {n.step - barOffset + 1} {n.slide ? '↗ slide' : 'plain'}</button>)}</div>
        )}
      </div>
    );
  };

  return createPortal(
    <div className="studio-cinematic fixed inset-0 z-[85] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Beat maker">
      <div className="absolute inset-0 bg-black/80" onClick={() => { stop(); onClose(); }} />
      <div className="studio-booth-panel relative w-full sm:max-w-[980px] max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] p-5 space-y-3">
        <button onClick={() => { stop(); onClose(); }} className="sticky top-0 z-20 h-10 px-4 rounded-full bg-black/70 backdrop-blur border border-white/15 text-[13px] font-semibold text-ink">← Back to studio</button>
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[18px] font-bold text-ink">🎹 Beat maker</div><div className="text-[11px] text-ink3">Real drum hits and instruments. Build it, hear it, rap on it. Making a beat costs ⚡12 and teaches you production.</div></div>
          <button onClick={() => { stop(); onClose(); }} className="w-9 h-9 rounded-full border border-line text-ink2" aria-label="Close">✕</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => (playing ? stop() : play())} className="h-10 px-5 rounded-full bg-amber text-black font-bold text-[13px]">{playing ? '■ Stop' : '▶ Play'}</button>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Name your beat" className="h-10 flex-1 min-w-[140px] rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink" aria-label="Beat name" />
          <div className="text-[11px] text-ink3 text-right"><div><span className="text-ink font-bold num text-[16px]">{grade.quality}</span> grade</div><div>{pat.bpm} bpm · {KEYS[pat.root]}{pat.major ? '' : 'm'}</div></div>
        </div>

        <div className="flex gap-1 overflow-x-auto text-[12px]" role="tablist">
          {([['drums', '🥁 Drums'], ['bass', '🔊 808'], ['melody', '🎹 Melody'], ['chords', '🎼 Chords'], ['arrange', '🧩 Arrange'], ['sound', '⚙️ Sound']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('h-8 px-3 rounded-full border shrink-0', tab === id ? 'bg-amber text-black font-semibold border-amber' : 'border-line text-ink2')}>{label}</button>
          ))}
        </div>

        {(tab === 'drums' || tab === 'bass' || tab === 'melody') && pat.bars > 1 && (
          <div className="flex items-center gap-1.5 text-[11px] text-ink3">Bar: {Array.from({ length: pat.bars }, (_, i) => <button key={i} onClick={() => setBar(i)} className={cn('h-6 w-7 rounded-full border', bar === i ? 'border-amber text-amber' : 'border-line text-ink2')}>{i + 1}</button>)}</div>
        )}

        {tab === 'drums' && (
          <div className="space-y-1.5 overflow-x-auto"><div className="min-w-[560px] space-y-1.5">
            {DRUM_LANES.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5">
                <span className="w-16 shrink-0 text-[11px] text-ink2">{l.label}</span>
                <div className="flex flex-1 gap-[3px]">
                  {Array.from({ length: 16 }, (_, i) => { const st = barOffset + i; return <Cell key={i} on={pat.drums[l.id].includes(st)} now={headHere(st)} beat={colOf(i) % 4 === 0} onClick={() => toggleStep(l.id, st)} label={`${l.label} step ${i + 1}`} />; })}
                </div>
              </div>
            ))}
          </div></div>
        )}
        {tab === 'bass' && roll('bass')}
        {tab === 'melody' && roll('melody')}

        {tab === 'chords' && (
          <div className="space-y-3">
            <div className="text-[12px] text-ink2">Chord helper — pick a progression that works in {pat.major ? 'a major' : 'a minor'} key, then fine-tune each bar.</div>
            <div className="flex flex-wrap gap-1.5">{progressionsFor(pat.major).map((pr) => <button key={pr.label} onClick={() => upd({ chords: Array.from({ length: pat.bars }, (_, i) => pr.chords[i % pr.chords.length]) })} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink2 hover:text-ink">{pr.label}</button>)}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: pat.bars }, (_, i) => (
                <label key={i} className="text-[11px] text-ink3">Bar {i + 1}
                  <select value={pat.chords[i] ?? 0} onChange={(e) => upd({ chords: Array.from({ length: pat.bars }, (_, j) => (j === i ? Number(e.target.value) : pat.chords[j] ?? 0)) })} className="mt-1 w-full h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">
                    {(pat.major ? [0, 2, 4, 5, 7, 9] : [0, 2, 3, 5, 7, 8, 10]).map((s) => <option key={s} value={s}>{KEYS[(pat.root + s) % 12]}{pat.major ? ([0, 5, 7].includes(s) ? '' : 'm') : ([3, 8, 10].includes(s) ? '' : 'm')}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'arrange' && (
          <div className="space-y-3">
            <div className="text-[12px] text-ink2">Your song's shape. Each part plays {pat.sectionBars} bars. Intro = chords + melody · Verse = drums, 808, chords · Hook = everything · Bridge = no drums · Outro = chords.</div>
            <div className="flex flex-wrap gap-1.5">
              {pat.arrangement.map((s, i) => (
                <span key={i} className={cn('inline-flex items-center gap-1 h-9 pl-3 pr-1 rounded-full border text-[12px]', head?.sec === i ? 'border-fall bg-fall/15 text-ink' : 'border-line text-ink2')}>
                  {SEC_EMOJI[s]} {s}
                  <button onClick={() => upd({ arrangement: pat.arrangement.filter((_, j) => j !== i) })} className="w-6 h-6 rounded-full text-ink3 hover:text-ink" aria-label={`Remove ${s}`}>✕</button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink3">Add: {ALL_SECTIONS.map((s) => <button key={s} onClick={() => pat.arrangement.length < 12 && upd({ arrangement: [...pat.arrangement, s] })} className="h-8 px-3 rounded-full border border-line text-ink2">{SEC_EMOJI[s]} {s}</button>)}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-ink3">Bars per part: {[2, 4, 8].map((n) => <button key={n} onClick={() => upd({ sectionBars: n })} className={cn('h-7 w-9 rounded-full border', pat.sectionBars === n ? 'border-amber text-amber' : 'border-line text-ink2')}>{n}</button>)}</div>
          </div>
        )}

        {tab === 'sound' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-ink3">
            <div className="sm:col-span-2 flex flex-wrap gap-1.5">Start from: {TEMPLATES.map((t) => <button key={t.id} onClick={() => loadTemplate(t.id)} title={t.blurb} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink2 hover:text-ink">{t.label}</button>)}</div>
            <label>Tempo <span className="text-ink2 num">{pat.bpm} bpm</span><input type="range" min={60} max={180} value={pat.bpm} onChange={(e) => upd({ bpm: Number(e.target.value) })} className="w-full accent-amber" aria-label="Tempo" /></label>
            <label>Swing <span className="text-ink2 num">{Math.round(pat.swing * 100)}%</span><input type="range" min={0} max={50} value={Math.round(pat.swing * 100)} onChange={(e) => upd({ swing: Number(e.target.value) / 100 })} className="w-full accent-amber" aria-label="Swing" /></label>
            <label>Key<select value={pat.root} onChange={(e) => upd({ root: Number(e.target.value) })} className="mt-1 w-full h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">{KEYS.map((k, i) => <option key={k} value={i}>{k}</option>)}</select></label>
            <label>Mode<select value={pat.major ? 'maj' : 'min'} onChange={(e) => { const major = e.target.value === 'maj'; upd({ major, bass: [], melody: [], chords: pat.chords.map((c) => (major ? [0, 7, 9, 5][c % 4] : [0, 8, 3, 10][c % 4])) }); setMsg('Mode changed — the 808 and melody were cleared so they stay in key.'); }} className="mt-1 w-full h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink"><option value="min">Minor (dark)</option><option value="maj">Major (bright)</option></select></label>
            <label>Melody sound<select value={pat.lead} onChange={(e) => upd({ lead: e.target.value as Lead })} className="mt-1 w-full h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">{(Object.keys(LEAD_LABEL) as Lead[]).map((l) => <option key={l} value={l}>{LEAD_LABEL[l]}{['keys', 'bell', 'pluck', 'pad', 'choir'].includes(l) ? ' (real sample)' : ''}</option>)}</select></label>
            <label>Pattern length<select value={pat.bars} onChange={(e) => setBars(Number(e.target.value))} className="mt-1 w-full h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} bar{n > 1 ? 's' : ''}</option>)}</select></label>
            <label>Genre<select value={genre} onChange={(e) => { const g = e.target.value as Genre; setGenre(g); upd({ style: STYLE_FOR_GENRE[g] ?? pat.style }); }} className="mt-1 w-full h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">{GENRES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
            <label>Mood<select value={mood} onChange={(e) => setMood(e.target.value as SongMood)} className="mt-1 w-full h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">{MOODS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>)}</select></label>
          </div>
        )}

        {grade.notes.length > 0 && <div className="text-[11px] text-ink3 leading-snug">💡 {grade.notes.join(' ')}</div>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button onClick={() => save(false)} className="h-10 px-5 rounded-full bg-fall text-white font-bold text-[13px]">💾 {savedId ? 'Update beat' : 'Save to my beats'}</button>
          {savedId && onUse && <button onClick={() => { stop(); onUse(savedId); }} className="h-10 px-4 rounded-full border border-amber/60 text-amber text-[13px] font-semibold">🎙️ Rap on it</button>}
          {savedId && <button onClick={() => save(true)} className="h-10 px-4 rounded-full border border-line text-ink2 text-[12px]">Save as new</button>}
          <button onClick={() => exportAll(false)} className="h-10 px-4 rounded-full border border-line text-ink2 text-[12px]">⬇ Export WAV</button>
          <button onClick={() => exportAll(true)} className="h-10 px-4 rounded-full border border-line text-ink2 text-[12px]">⬇ Stems</button>
        </div>
        {msg && <div className="text-[12px] text-ink2 leading-snug">{msg}</div>}
      </div>
    </div>,
    document.body,
  );
}
