// ─── SOCIAL: SOUNDS AND GOING LIVE ─────────────────────────────────────────
// Clip runs on sounds: the records everybody is making videos to. Use one and
// your clip rides the trend (and the artist notices). Going live is an hour
// with your fans — viewers, gifts, and sometimes a guest who drops in.

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { Button } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import { isSongReleased } from '../../sim/release';
import type { LiveSession } from '../../sim/socialLive';
import type { ChartEntry } from '../../types/game';
import { Avatar } from './shared';

export interface Sound { songId: string; title: string; artist: string; mine: boolean; uses: number; position?: number }

export function useSounds(): Sound[] {
  const charts = useGameStore((s) => s.charts);
  const player = useGameStore((s) => s.player);
  const songs = useGameStore((s) => s.songs);
  const posts = useGameStore((s) => s.socialPosts);
  return useMemo(() => {
    if (!player) return [];
    const usage = new Map<string, number>();
    for (const p of posts) if (p.soundSongId) usage.set(p.soundSongId, (usage.get(p.soundSongId) ?? 0) + 1);
    const out: Sound[] = [];
    const home = ((charts?.[player.country] ?? []) as ChartEntry[]).slice(0, 12);
    for (const e of home) {
      out.push({ songId: e.songId, title: e.songTitle, artist: e.artistName, mine: e.artistId === player.id, position: e.position, uses: Math.round(4000 / Math.max(1, e.position) + (usage.get(e.songId) ?? 0) * 900 + (e.weeksOnChart ?? 1) * 120) });
    }
    for (const s of songs.filter((x) => isSongReleased(x)).slice(-4)) {
      if (out.some((o) => o.songId === s.id)) continue;
      out.push({ songId: s.id, title: s.title, artist: player.artistName, mine: true, uses: Math.round((s.weeklyStreams ?? 0) / 60 + (usage.get(s.id) ?? 0) * 400 + 12) });
    }
    return out.sort((a, b) => b.uses - a.uses);
  }, [charts, player, songs, posts]);
}

export function SoundsList({ onUse }: { onUse: (s: Sound) => void }) {
  const sounds = useSounds();
  return (
    <div className="p-3 space-y-2">
      <div className="text-[12px] text-ink3 px-1">What everyone is making videos to. Use a trending sound and your clip travels further — and the artist notices.</div>
      {sounds.length === 0 && <div className="p-6 text-center text-[13px] text-ink3">No sounds yet — the charts fill this up.</div>}
      {sounds.map((s, i) => (
        <div key={s.songId} className="flex items-center gap-3 rounded-[14px] border border-line bg-card p-3">
          <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-[#12A594] to-[#7B61FF] flex items-center justify-center text-[18px] shrink-0">{i < 3 ? ['🥇', '🥈', '🥉'][i] : '♫'}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink truncate">{s.title}</div>
            <div className="text-[11px] text-ink3 truncate">{s.artist}{s.mine ? ' (you)' : ''} · {compact(s.uses)} videos{s.position ? ` · #${s.position} on the chart` : ''}</div>
          </div>
          <Button size="sm" variant="accent" accent="#12A594" onClick={() => onUse(s)}>Use sound</Button>
        </div>
      ))}
    </div>
  );
}

function CountUp({ to, ms = 1400 }: { to: number; ms?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{v.toLocaleString()}</>;
}

export function GoLivePanel({ app, onClose }: { app: 'clip' | 'snapgram'; onClose: () => void }) {
  const goLive = useGameStore((s) => s.goLive);
  const player = useGameStore((s) => s.player);
  const [res, setRes] = useState<{ ok: boolean; message: string; session?: LiveSession } | null>(null);
  const color = app === 'clip' ? '#FE2C55' : '#E93D82';
  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-[400px] rounded-[20px] border border-line bg-[#0C0D12] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5" style={{ background: `linear-gradient(140deg, ${color}33, transparent 70%)` }}>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full rl-live-dot" style={{ background: color }} /><span className="text-[12px] font-bold tracking-wider text-ink">LIVE</span><button onClick={onClose} className="ml-auto text-ink3 hover:text-ink" aria-label="Close">✕</button></div>
          <div className="flex items-center gap-3 mt-4">
            <Avatar name={player?.artistName ?? 'You'} seed="player" size={52} ring={color} />
            <div>
              <div className="text-[17px] font-bold text-ink">{player?.artistName}</div>
              <div className="text-[12px] text-ink3">An hour live on {app === 'clip' ? 'Clip' : 'Snapgram'} · once a day · ⚡12</div>
            </div>
          </div>
        </div>
        <div className="p-5">
          {!res ? (
            <>
              <ul className="text-[12px] text-ink2 space-y-1.5 mb-4">
                <li>• Viewers come from your followers, momentum and charisma.</li>
                <li>• Your loyal fans send gifts — real money.</li>
                <li>• A friend might drop in. A troll raid might too.</li>
              </ul>
              <Button className="w-full" variant="accent" accent={color} onClick={() => setRes(goLive(app))}>Go live now</Button>
            </>
          ) : !res.ok || !res.session ? (
            <div className="text-[13px] text-fall">{res.message}</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[12px] bg-white/[0.04] py-3"><div className="text-[18px] font-bold text-ink num"><CountUp to={res.session.peak} /></div><div className="text-[10px] uppercase tracking-wider text-ink3">Peak viewers</div></div>
                <div className="rounded-[12px] bg-white/[0.04] py-3"><div className="text-[18px] font-bold text-rise num">$<CountUp to={res.session.gifts} /></div><div className="text-[10px] uppercase tracking-wider text-ink3">Gifts</div></div>
                <div className="rounded-[12px] bg-white/[0.04] py-3"><div className="text-[18px] font-bold text-ink num">+<CountUp to={res.session.follows} /></div><div className="text-[10px] uppercase tracking-wider text-ink3">Followers</div></div>
              </div>
              {res.session.joinedBy && <div className="rounded-[12px] border border-rise/30 bg-rise/[0.06] px-3 py-2 text-[12px] text-ink2">🎉 {res.session.joinedBy.name} joined your live.</div>}
              <ul className="space-y-1">{res.session.lines.slice(1).map((l, i) => <li key={i} className={cn('text-[12px]', res.session!.trolls && l.includes('troll') ? 'text-fall' : 'text-ink2')}>{l}</li>)}</ul>
              <Button className="w-full" variant="secondary" onClick={onClose}>End live</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
