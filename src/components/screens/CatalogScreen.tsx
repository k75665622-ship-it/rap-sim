// ─── YOUR CATALOG ──────────────────────────────────────────────────────────
// Everything you've put out, and everything you're on. Tap a record for the
// live numbers and how it is doing on every platform.

import { useMemo, useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { trackTotals } from '../../store/musicSelectors';
import { PageTitle, Panel, Tag } from '../ui/kit';
import { Avatar } from '../social/shared';
import { cn } from '@/utils/cn';
import { compact, money } from '@/utils/format';
import type { Song } from '../../types/game';

type Tab = 'mine' | 'featured' | 'projects';

export function CatalogScreen() {
  const state = useGameStore();
  const openSong = useGameStore((s) => s.openSong);
  const openArtist = useGameStore((s) => s.openArtist);
  const [tab, setTab] = useState<Tab>('mine');
  const p = state.player;
  const pid = p?.id ?? 'player';

  const rows = useMemo(() => {
    const mine = state.songs.filter((x) => isSongReleased(x));
    const featured = state.npcSongs.filter((x) => (x.featuredArtists ?? []).includes(pid));
    const read = (x: Song) => {
      const t = trackTotals(state, x.id);
      const best = Object.values(x.chartPositions ?? {}).length ? Math.min(...Object.values(x.chartPositions)) : undefined;
      return { song: x, week: Math.round(t?.week ?? x.weeklyStreams ?? 0), total: Math.round(t?.lifetime ?? x.totalStreams ?? 0), growth: t?.growth ?? 0, best };
    };
    return { mine: mine.map(read).sort((a, b) => b.week - a.week), featured: featured.map(read).sort((a, b) => b.week - a.week) };
  }, [state, pid]);

  const list = tab === 'featured' ? rows.featured : rows.mine;
  const top = Math.max(1, ...list.map((r) => r.week));
  const weekAll = rows.mine.reduce((a, r) => a + r.week, 0) + rows.featured.reduce((a, r) => a + r.week, 0);
  const lifeAll = rows.mine.reduce((a, r) => a + r.total, 0);
  const earned = state.songs.filter((x) => isSongReleased(x)).reduce((a, x) => a + (x.totalEarnings ?? 0), 0);
  const projects = (state.albums ?? []).filter((a) => (a.ownerId ?? pid) === pid);

  return (
    <div className="max-w-[860px] mx-auto space-y-4">
      <PageTitle subtitle="Everything you've released, and every record you're on.">Catalog</PageTitle>
      <div className="grid grid-cols-3 gap-2">
        {[['This week', compact(weekAll)], ['Lifetime streams', compact(lifeAll)], ['Earned', money(earned)]].map(([k, v]) => (
          <Panel key={k} className="p-3"><div className="text-[11px] text-ink3">{k}</div><div className="text-[18px] font-bold text-ink num">{v}</div></Panel>
        ))}
      </div>
      <div className="flex gap-1.5">
        {([['mine', `Your releases (${rows.mine.length})`], ['featured', `Featured on (${rows.featured.length})`], ['projects', `Projects (${projects.length})`]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={cn('h-9 px-3.5 rounded-full border text-[12px] font-semibold', tab === id ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink2 hover:text-ink')}>{label}</button>
        ))}
      </div>
      {tab === 'projects' ? (
        <Panel className="divide-y divide-line">
          {projects.length === 0 && <div className="p-6 text-center text-[13px] text-ink3">No projects out yet. Build one in Studio → Album and save it in the album vault.</div>}
          {projects.map((a) => {
            const songs = a.songs.map((id) => state.songs.find((x) => x.id === id)).filter((x): x is Song => !!x);
            const week = songs.reduce((t, x) => t + Math.round(trackTotals(state, x.id)?.week ?? x.weeklyStreams ?? 0), 0);
            const avg = songs.length ? Math.round(songs.reduce((t, x) => t + x.quality, 0) / songs.length) : 0;
            return (
              <div key={a.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><div className="text-[14px] font-semibold text-ink truncate">💿 {a.title}</div><div className="text-[11px] text-ink3">{a.type ?? 'album'} · {songs.length} tracks · average {avg}</div></div>
                  <div className="text-right shrink-0"><div className="text-[13px] font-semibold text-ink num">{compact(week)}</div><div className="text-[10px] text-ink3">this week</div></div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">{songs.map((x) => <button key={x.id} onClick={() => openSong(x.id)} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-ink2 hover:text-amber">{x.title}</button>)}</div>
              </div>
            );
          })}
        </Panel>
      ) : (
        <Panel className="divide-y divide-line">
          {list.length === 0 && <div className="p-6 text-center text-[13px] text-ink3">{tab === 'featured' ? 'No records with your verse on them yet. When someone releases one, it lands here.' : 'Nothing released yet. Your first single lands here the day it comes out.'}</div>}
          {list.map((r) => {
            const owner = tab === 'featured' && r.song.ownerId ? state.npcs.find((n) => n.id === r.song.ownerId) : undefined;
            return (
              <div key={r.song.id} className="p-3 hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  {owner && <button onClick={() => openArtist(owner.id)} className="shrink-0"><Avatar name={owner.name} seed={owner.id} size={36} /></button>}
                  <button onClick={() => openSong(r.song.id)} className="min-w-0 flex-1 text-left">
                    <div className="text-[14px] font-semibold text-ink truncate">{r.song.title}{owner ? <span className="text-ink3 font-normal"> · {owner.name} ft. you</span> : (r.song.featureArtistNames?.length ? <span className="text-ink3 font-normal"> ft. {r.song.featureArtistNames.join(', ')}</span> : null)}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-amber" style={{ width: `${Math.max(3, (r.week / top) * 100)}%` }} /></div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-ink3 flex-wrap">
                      <span>Out {r.song.releaseDate}</span>
                      <span>· {compact(r.total)} total</span>
                      {r.best !== undefined && <Tag tone="up">Peak #{r.best}</Tag>}
                      {r.growth > 0.05 && <span className="text-rise">▲ {Math.round(r.growth * 100)}%</span>}
                      {r.growth < -0.05 && <span className="text-fall">▼ {Math.round(-r.growth * 100)}%</span>}
                    </div>
                  </button>
                  <div className="text-right shrink-0"><div className="text-[14px] font-bold text-ink num">{compact(r.week)}</div><div className="text-[10px] text-ink3">this week</div></div>
                </div>
                {owner && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-ink3">
                    <span>Chemistry with {owner.name.split(' ')[0]}: <b className={owner.relationshipScore >= 40 ? 'text-rise' : owner.relationshipScore >= 0 ? 'text-ink2' : 'text-fall'}>{owner.relationshipScore >= 60 ? 'tight' : owner.relationshipScore >= 30 ? 'good' : owner.relationshipScore >= 0 ? 'getting there' : 'cold'}</b></span>
                    <button onClick={() => openArtist(owner.id)} className="ml-auto text-amber hover:underline">Work together again →</button>
                  </div>
                )}
              </div>
            );
          })}
        </Panel>
      )}
      <div className="text-[11px] text-ink3 text-center">Tap a record for live numbers, every platform, and where it's being played.</div>
    </div>
  );
}
