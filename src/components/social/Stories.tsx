// ─── SOCIAL: STORIES ───────────────────────────────────────────────────────
// The circles across the top of Snapgram. Tap one and it plays full screen,
// frame by frame; reply and it lands in their DMs. Post your own: a studio
// clip, a teaser of a song, the flex.

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { gradientFor, SlidePanel, Button } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import { STORY_KINDS, minutesAgo, type Story, type StoryKind } from '../../sim/socialLive';
import { isSongReleased } from '../../sim/release';
import { Avatar } from './shared';

export function StoriesBar({ stories, now, onOpen, onAdd, myName }: { stories: Story[]; now: number; onOpen: (i: number) => void; onAdd: () => void; myName: string }) {
  const mine = stories.find((s) => s.authorId === 'player');
  return (
    <div className="flex gap-3.5 overflow-x-auto px-3 py-3 border-b border-line">
      <button onClick={mine ? () => onOpen(stories.indexOf(mine)) : onAdd} className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
        <div className="relative">
          <Avatar name={myName} seed="player" size={58} story={mine ? 'new' : undefined} />
          {!mine && <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#4DA3FF] border-2 border-[#0C0D12] text-white text-[13px] leading-[16px] text-center font-bold">+</span>}
        </div>
        <span className="text-[11px] text-ink2 truncate w-full text-center">Your story</span>
      </button>
      {stories.filter((s) => s.authorId !== 'player').map((s) => (
        <button key={s.id} onClick={() => onOpen(stories.indexOf(s))} className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
          <Avatar name={s.authorName} seed={s.authorId} size={58} story={s.seen ? 'seen' : 'new'} />
          <span className={cn('text-[11px] truncate w-full text-center', s.seen ? 'text-ink3' : 'text-ink')}>{s.authorName.split(' ')[0]}</span>
        </button>
      ))}
      {stories.length === 0 && <div className="text-[12px] text-ink3 self-center">No stories right now — they show up through the day.</div>}
      <span className="sr-only">{now}</span>
    </div>
  );
}

export function StoryViewer({ stories, start, now, onClose }: { stories: Story[]; start: number; now: number; onClose: () => void }) {
  const viewStory = useGameStore((s) => s.viewStory);
  const sendDM = useGameStore((s) => s.sendDM);
  const [i, setI] = useState(start);
  const [frame, setFrame] = useState(0);
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const story = stories[i];

  useEffect(() => { if (story) viewStory(story.id); }, [story, viewStory]);
  useEffect(() => {
    if (!story) return;
    const t = window.setTimeout(() => next(), 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, frame]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  function next() {
    if (!story) return;
    if (frame < story.frames.length - 1) { setFrame(frame + 1); return; }
    if (i < stories.length - 1) { setI(i + 1); setFrame(0); setSent(null); return; }
    onClose();
  }
  function prev() {
    if (frame > 0) { setFrame(frame - 1); return; }
    if (i > 0) { setI(i - 1); setFrame(0); }
  }
  if (!story) return null;
  const f = story.frames[frame];
  const [a, b] = gradientFor(f.bg);
  const mine = story.authorId === 'player';

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="relative w-full h-full sm:w-[420px] sm:h-[min(88vh,760px)] sm:rounded-[20px] overflow-hidden" style={{ background: `linear-gradient(160deg, ${a}, ${b})` }}>
        <div className="absolute inset-0 rl-clip-pan opacity-40" style={{ background: `radial-gradient(circle at 70% 30%, ${a}, transparent 60%)` }} />
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {story.frames.map((_, k) => (
            <div key={k} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div key={`${i}-${frame}-${k}`} className={cn('h-full bg-white', k < frame ? 'w-full' : k === frame ? 'rl-story-bar' : 'w-0')} />
            </div>
          ))}
        </div>
        <div className="absolute top-5 left-3 right-3 flex items-center gap-2 z-10 text-white">
          <Avatar name={story.authorName} seed={story.authorId} size={32} />
          <span className="text-[13px] font-semibold">{mine ? 'Your story' : story.authorName}</span>
          <span className="text-[12px] opacity-70">{minutesAgo(now, story.postedMinute)}</span>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white text-xl" aria-label="Close">✕</button>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white rl-pop" key={`${i}-${frame}`}>
          <div className="text-[120px] drop-shadow-lg">{f.emoji}</div>
          {f.text && <div className="mt-4 px-4 py-2 rounded-xl bg-black/35 text-[18px] font-semibold">{f.text}</div>}
          {f.songTitle && <div className="mt-3 px-3 py-1.5 rounded-full bg-white text-black text-[13px] font-semibold">♫ {f.songTitle}</div>}
        </div>
        <button onClick={prev} className="absolute left-0 top-16 bottom-20 w-1/3" aria-label="Previous" />
        <button onClick={next} className="absolute right-0 top-16 bottom-20 w-2/3" aria-label="Next" />
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          {mine ? (
            <div className="text-white text-[13px] text-center">👁 {compact(story.views)} views</div>
          ) : sent ? (
            <div className="text-white text-[13px] text-center">{sent}</div>
          ) : (
            <div className="flex gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${story.authorName.split(' ')[0]}…`} className="flex-1 h-11 rounded-full bg-black/30 border border-white/40 px-4 text-[14px] text-white placeholder:text-white/70 outline-none" />
              <button
                onClick={() => { if (!reply.trim()) return; sendDM(story.authorId, `Replied to your story: ${reply.trim()}`); setSent('Sent — it\'s in your PingChat.'); setReply(''); }}
                className="h-11 px-4 rounded-full bg-white text-black text-[13px] font-semibold"
              >Send</button>
              {['🔥', '😂', '😍'].map((e) => (
                <button key={e} onClick={() => { sendDM(story.authorId, `Reacted ${e} to your story`); setSent(`Reacted ${e}`); }} className="h-11 w-11 rounded-full bg-black/30 text-[20px]">{e}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StoryComposer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (r: { ok: boolean; message: string }) => void }) {
  const songs = useGameStore((s) => s.songs);
  const player = useGameStore((s) => s.player);
  const postStory = useGameStore((s) => s.postStory);
  const [kind, setKind] = useState<StoryKind>('studio');
  const [songId, setSongId] = useState('');
  const released = useMemo(() => songs.filter((s) => isSongReleased(s)).slice().reverse(), [songs]);
  const k = STORY_KINDS.find((x) => x.id === kind)!;
  const needsSong = 'needsSong' in k && k.needsSong;
  return (
    <SlidePanel open={open} onClose={onClose} title="New story" subtitle="Up for 24 hours" width={440}
      footer={<div className="flex items-center justify-between gap-3"><span className="text-[11px] text-ink3">⚡ {k.energy} energy</span><Button variant="accent" accent="#E93D82" disabled={(needsSong && !songId) || (player?.energy ?? 0) < k.energy} onClick={() => { const r = postStory(kind, songId || undefined); onDone(r); if (r.ok) onClose(); }}>Share story</Button></div>}
    >
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {STORY_KINDS.map((s) => (
            <button key={s.id} onClick={() => setKind(s.id)} className={cn('rounded-[12px] border p-3 text-left transition', kind === s.id ? 'border-[#E93D82] bg-[#E93D82]/10' : 'border-line hover:bg-cardhover')}>
              <div className="text-[22px]">{s.emoji}</div>
              <div className="text-[13px] font-semibold text-ink mt-1">{s.label}</div>
              <div className="text-[11px] text-ink3 leading-snug mt-0.5">{s.blurb}</div>
            </button>
          ))}
        </div>
        {needsSong && (
          <select value={songId} onChange={(e) => setSongId(e.target.value)} className="w-full h-10 rounded-[10px] bg-card border border-line px-3 text-[13px] text-ink">
            <option value="">Pick a released song…</option>
            {released.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
      </div>
    </SlidePanel>
  );
}
