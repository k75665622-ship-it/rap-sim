// ─── STORY HOST ────────────────────────────────────────────────────────────
// Where the story reaches you: an incoming call, a text, someone waiting at a
// place, a letter. Plus the scene player and the "people & choices" book.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { storyBus } from '../../story/bus';
import { useGameStore, storyCtx } from '../../store/gameStore';
import { NODES, arcTitle, check } from '../../story/engine';
import { CAST, BOND_CAST } from '../../story/cast';
import type { Channel, Delivery, Place, StoryNode, Path } from '../../story/types';
import { cn } from '@/utils/cn';
import type { GameScreen } from '../../types/game';

const PLACE: Record<Place, { screen: GameScreen; name: string }> = {
  kitchen: { screen: 'kitchen', name: "Mama's Kitchen" }, studio: { screen: 'studio', name: 'Studio 9' }, shows: { screen: 'shows', name: 'The Stage' }, bank: { screen: 'investments', name: 'First Capital' }, city: { screen: 'city', name: 'the street' },
};
const ICON: Record<Channel, string> = { call: '📞', text: '💬', encounter: '📍', letter: '✉️', scene: '🎬' };
const PATHS: { id: Path; label: string; blurb: string }[] = [
  { id: 'rapper', label: '🎤 Rapper — Two Rooms', blurb: 'You and Static grew up one flat apart.' },
  { id: 'producer', label: '🎛️ Producer — Reel 9', blurb: "Ankh needs hands. Nobody tells you what's in the tape room." },
  { id: 'manager', label: '📋 Manager — Hands', blurb: 'You hold their contracts and their secrets.' },
  { id: 'singer', label: '🎶 Singer-songwriter — The Key', blurb: 'Your best hook is on someone else\'s record.' },
  { id: 'director', label: '🎬 Director — Frame', blurb: 'Turn music into images people remember.' },
  { id: 'dj', label: '🎧 DJ — The Room', blurb: 'Control the room. Hear everything first.' },
];

function useTokens() {
  const name = useGameStore((s) => s.player?.artistName ?? 'you');
  const city = useGameStore((s) => s.player?.city ?? 'the city');
  return (t: string) => t.replace(/\{name\}/g, name).replace(/\{city\}/g, city);
}

export function StoryHost() {
  const story = useGameStore((s) => s.story);
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const open = useGameStore((s) => s.storyOpen);
  const decline = useGameStore((s) => s.storyDecline);
  const [scene, setScene] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const autoDone = useRef<string>('');

  const pending = useMemo(() => (story?.inbox ?? []).filter((d) => d.status === 'new' || d.status === 'open'), [story?.inbox]);
  const calls = pending.filter((d) => NODES[d.node]?.channel === 'call');
  const others = pending.filter((d) => NODES[d.node]?.channel !== 'call');

  // Walking up to someone in the world opens their scene.
  useEffect(() => {
    storyBus.handler = (id) => { open(id); setScene(id); };
    return () => { storyBus.handler = null; };
  }, [open]);

  // Someone is waiting where you just walked in.
  useEffect(() => {
    if (scene) return;
    for (const d of pending) {
      const n = NODES[d.node];
      if (n?.channel === 'encounter' && n.where && n.where !== 'kitchen' && PLACE[n.where].screen === screen && autoDone.current !== `${d.id}|${screen}`) {
        autoDone.current = `${d.id}|${screen}`;
        open(d.node); setScene(d.node); return;
      }
    }
  }, [screen, pending, scene, open]);

  if (!story) return null;
  const body = (
    <>
      {scene && <Scene nodeId={scene} onClose={() => setScene(null)} />}
      {!scene && calls[0] && <Ringing d={calls[0]} onAnswer={() => { open(calls[0].node); setScene(calls[0].node); }} onDecline={() => decline(calls[0].node)} />}
      {!scene && !calls[0] && (
        <button onClick={() => setSheet(true)} className={`fixed z-[300] px-3 rounded-full ${screen === 'city' ? 'left-[126px] top-[104px] h-9' : 'right-3 bottom-20 md:bottom-4 h-11'} bg-card border border-line shadow-lg text-[13px] font-bold flex items-center gap-1.5`} data-testid="story-chip">
          📖{others.length > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-amber text-black text-[11px] flex items-center justify-center" data-testid="story-count">{others.length}</span>}
        </button>
      )}
      {sheet && !scene && <Sheet onClose={() => setSheet(false)} pending={others} onOpen={(d) => { const n = NODES[d.node]; if (n.channel === 'encounter' && n.where && PLACE[n.where].screen !== screen) { setSheet(false); setScreen(PLACE[n.where].screen); return; } open(d.node); setSheet(false); setScene(d.node); }} />}
    </>
  );
  return createPortal(body, document.body);
}

function Ringing({ d, onAnswer, onDecline }: { d: Delivery; onAnswer: () => void; onDecline: () => void }) {
  const n = NODES[d.node]; const c = CAST[n.from];
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[500] w-[min(92vw,420px)] rounded-2xl bg-black/90 border border-white/15 backdrop-blur p-3 shadow-2xl" data-testid="story-call">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-[24px] animate-pulse" style={{ background: c.color + '33', border: `2px solid ${c.color}` }}>{c.emoji}</div>
        <div className="min-w-0 flex-1"><div className="text-[11px] text-white/50">Incoming call</div><div className="text-[16px] font-bold text-white truncate">{c.name}</div></div>
        <button onClick={onDecline} className="w-11 h-11 rounded-full bg-red-600 text-white text-[18px]" aria-label="Decline" data-testid="story-decline">✕</button>
        <button onClick={onAnswer} className="w-11 h-11 rounded-full bg-green-500 text-black text-[18px]" aria-label="Answer" data-testid="story-answer">📞</button>
      </div>
    </div>
  );
}

function Sheet({ onClose, pending, onOpen }: { onClose: () => void; pending: Delivery[]; onOpen: (d: Delivery) => void }) {
  const story = useGameStore((s) => s.story)!;
  const setPath = useGameStore((s) => s.setStoryPath);
  const [tab, setTab] = useState<'inbox' | 'people' | 'story'>('inbox');
  const started = story.log.length > 0;
  return (
    <div className="fixed inset-0 z-[400] bg-black/70 flex items-end md:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-[#12141b] border border-line p-4" data-testid="story-sheet">
        <div className="flex items-center justify-between mb-3"><div className="text-[16px] font-black">📖 Your story</div><button onClick={onClose} className="h-8 px-3 rounded-full border border-line text-[12px]">Close</button></div>
        <div className="flex gap-2 mb-3">{(['inbox', 'people', 'story'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn('h-8 px-3 rounded-full border text-[12px] font-semibold', tab === t ? 'bg-amber text-black border-amber' : 'border-line text-ink2')}>{t === 'inbox' ? 'Waiting' : t === 'people' ? 'People' : 'What you chose'}</button>)}</div>
        {tab === 'inbox' && (
          <div className="space-y-2">
            {pending.length === 0 && <div className="text-[13px] text-ink3 py-6 text-center">Nothing is waiting. Go live your life — the story will find you.</div>}
            {pending.map((d) => { const n = NODES[d.node]; const c = CAST[n.from]; return (
              <button key={d.id} onClick={() => onOpen(d)} className="w-full text-left rounded-xl border border-line px-3 py-2 flex items-center gap-3 hover:border-amber/60" data-testid="story-item">
                <span className="text-[22px]">{ICON[n.channel]}</span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-ink truncate">{n.title}</span><span className="block text-[11px] text-ink3 truncate">{c.name}{n.where ? ` · ${PLACE[n.where].name}` : ''}{d.due !== undefined ? ` · answer by day ${d.due}` : ''}</span></span>
                <span className="text-[12px] text-amber">{n.channel === 'encounter' ? 'Go →' : 'Open →'}</span>
              </button>); })}
            {!started && (
              <div className="pt-3 border-t border-line">
                <div className="text-[12px] text-ink3 mb-2">Your seat in the story (can be changed until your first choice):</div>
                <div className="space-y-1.5">{PATHS.map((p) => <button key={p.id} onClick={() => setPath(p.id)} className={cn('w-full text-left rounded-lg border px-3 py-2', story.path === p.id ? 'border-amber bg-amber/10' : 'border-line')}><div className="text-[13px] font-semibold text-ink">{p.label}</div><div className="text-[11px] text-ink3">{p.blurb}</div></button>)}</div>
              </div>
            )}
          </div>
        )}
        {tab === 'people' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">{(['integrity', 'hustle', 'heart'] as const).map((a) => <div key={a} className="rounded-lg border border-line py-2"><div className="text-[10px] uppercase tracking-wider text-ink3">{a}</div><div className="text-[18px] font-black text-amber">{story.rep[a]}</div></div>)}</div>
            {BOND_CAST.filter((id) => story.bonds[id] !== undefined).map((id) => { const c = CAST[id]; const b = story.bonds[id]; return (
              <div key={id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"><span className="text-[20px]">{c.emoji}</span><div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-ink">{c.name}</div><div className="h-1.5 rounded bg-white/10 mt-1 relative overflow-hidden"><div className={cn('absolute top-0 bottom-0', b >= 0 ? 'bg-green-400 left-1/2' : 'bg-red-400 right-1/2')} style={{ width: `${Math.min(50, Math.abs(b) / 2)}%` }} /></div></div><span className="text-[12px] tabular-nums text-ink2">{b > 0 ? '+' : ''}{b}</span></div>); })}
            {Object.keys(story.bonds).length === 0 && <div className="text-[13px] text-ink3 py-6 text-center">You haven't met anyone yet.</div>}
          </div>
        )}
        {tab === 'story' && (
          <div className="space-y-1.5">
            {story.log.length === 0 && <div className="text-[13px] text-ink3 py-6 text-center">Nothing yet.</div>}
            {[...story.log].reverse().map((l, i) => <div key={i} className="rounded-lg border border-line px-3 py-2"><div className="text-[11px] text-ink3">{arcTitle(NODES[l.node]?.arc ?? '')} · {l.title}</div><div className="text-[13px] text-ink">{l.choice}</div></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Scene({ nodeId: first, onClose }: { nodeId: string; onClose: () => void }) {
  const [nodeId, setNodeId] = useState(first);
  const [shown, setShown] = useState(1);
  const story = useGameStore((s) => s.story)!;
  const choose = useGameStore((s) => s.storyChoose);
  const tok = useTokens();
  const bottom = useRef<HTMLDivElement>(null);
  const n: StoryNode | undefined = NODES[nodeId];
  const x = storyCtx(useGameStore.getState());
  const lines = useMemo(() => (n ? n.lines.filter((l) => check(l.if, story, x)) : []), [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const choices = n ? n.choices.filter((c) => check(c.if, story, x)) : [];
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [shown, nodeId]);
  if (!n) return null;
  const from = CAST[n.from];
  const all = shown >= lines.length;
  const pick = (id: string) => { const next = choose(nodeId, id); if (next) { setNodeId(next); setShown(1); } else onClose(); };
  return (
    <div className="fixed inset-0 z-[450] bg-black/85 flex items-end md:items-center justify-center" data-testid="story-scene">
      <div className="w-full max-w-[560px] h-[88vh] md:h-[80vh] flex flex-col rounded-t-3xl md:rounded-3xl bg-[#0f1118] border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center gap-3" style={{ background: from.color + '14' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[20px]" style={{ border: `2px solid ${from.color}`, background: from.color + '22' }}>{from.emoji}</div>
          <div className="min-w-0 flex-1"><div className="text-[14px] font-bold text-ink truncate">{n.title}</div><div className="text-[11px] text-ink3 truncate">{ICON[n.channel]} {from.name}{n.where ? ` · ${PLACE[n.where].name}` : ''}</div></div>
          <button onClick={onClose} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink2">Later</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={() => !all && setShown((v) => v + 1)} data-testid="story-lines">
          {lines.slice(0, shown).map((l, i) => {
            if (l.who === 'narr') return <p key={i} className="text-[13px] italic text-ink2 leading-relaxed">{tok(l.text)}</p>;
            const c = CAST[l.who] ?? CAST.narr; const me = l.who === 'you';
            return (
              <div key={i} className={cn('flex', me && 'justify-end')}>
                <div className={cn('max-w-[85%] rounded-2xl px-3 py-2', me ? 'bg-amber text-black' : 'bg-white/8 text-ink')} style={me ? undefined : { borderLeft: `3px solid ${c.color}` }}>
                  {!me && c.name && <div className="text-[10px] font-bold mb-0.5" style={{ color: c.color }}>{c.name}</div>}
                  <div className="text-[14px] leading-snug">{tok(l.text)}</div>
                </div>
              </div>
            );
          })}
          {!all && <div className="text-center text-[12px] text-ink3 animate-pulse">tap to continue</div>}
          <div ref={bottom} />
        </div>
        <div className="border-t border-line p-3 space-y-2 max-h-[40%] overflow-y-auto">
          {all ? choices.map((c) => <button key={c.id} onClick={() => pick(c.id)} className="w-full text-left rounded-xl border border-line bg-white/5 hover:border-amber/70 px-3 py-2.5 text-[14px] text-ink" data-testid={`story-choice-${c.id}`}>{tok(c.label)}</button>) : <button onClick={() => setShown((v) => v + 1)} className="w-full h-11 rounded-xl bg-amber text-black font-bold text-[14px]" data-testid="story-next">Continue</button>}
        </div>
      </div>
    </div>
  );
}
