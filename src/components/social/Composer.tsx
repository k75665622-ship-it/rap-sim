// ─── SOCIAL: THE COMPOSER ──────────────────────────────────────────────────
// One post, out to as many apps as you want. Pick the kind of post, attach a
// record, tag up to five people — artists, managers, producers, blogs — and
// see what it costs before you send it.

import { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { SlidePanel, Button } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import { isSongReleased } from '../../sim/release';
import { APP_META, SOCIAL_APPS, kindsFor, kindDef, seedFollowers, type PostKind, type SocialApp } from '../../sim/social';
import type { NPC, NPCRole } from '../../types/game';
import { AppMark, Avatar } from './shared';

const TAGGABLE: Partial<Record<NPCRole, string>> = {
  artist: 'Artist', manager: 'Manager', producer: 'Producer', media: 'Media', blogger: 'Blogger', label_ceo: 'Label boss',
  dj: 'DJ', engineer: 'Engineer', promoter: 'Promoter', publicist: 'Publicist', ar: 'A&R', rival_manager: 'Manager',
  songwriter: 'Songwriter', radio_owner: 'Radio', fan_account: 'Fan page', photographer: 'Photographer', stylist: 'Stylist', choreographer: 'Choreographer',
};

function relTone(r: number): string {
  if (r >= 40) return 'text-rise';
  if (r <= -20) return 'text-fall';
  return 'text-ink3';
}

export function Composer({ open, onClose, app, onPosted, preset }: { open: boolean; onClose: () => void; app: SocialApp; onPosted: (msg: { ok: boolean; message: string; viral?: boolean }) => void; preset?: { kind?: PostKind; soundSongId?: string; soundTitle?: string; soundMine?: boolean } }) {
  const player = useGameStore((s) => s.player);
  const songs = useGameStore((s) => s.songs);
  const npcs = useGameStore((s) => s.npcs);
  const crew = useGameStore((s) => s.crew);
  const beefs = useGameStore((s) => s.beefs);
  const stats = useGameStore((s) => s.socialStats);
  const publishPost = useGameStore((s) => s.publishPost);
  const postAsLabel = useGameStore((s) => s.postAsLabel);
  const label = useGameStore((s) => s.label);
  const [asLabel, setAsLabel] = useState(false);

  const [apps, setApps] = useState<SocialApp[]>([app]);
  const [kind, setKind] = useState<PostKind>(preset?.kind ?? kindsFor(app)[0].id);
  const [sound, setSound] = useState(preset?.soundSongId ? { id: preset.soundSongId, title: preset.soundTitle ?? 'Sound', mine: !!preset.soundMine } : null);
  const [text, setText] = useState('');
  const [songId, setSongId] = useState<string>(preset?.soundMine && preset.soundSongId ? preset.soundSongId : '');
  const [tags, setTags] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Reset to this app whenever the composer opens on a different one.
  const [lastApp, setLastApp] = useState(app);
  if (lastApp !== app) {
    setLastApp(app);
    setApps([app]);
    setKind(kindsFor(app)[0].id);
  }

  const released = useMemo(() => songs.filter((s) => isSongReleased(s)).slice().reverse(), [songs]);
  const k = kindDef(kind);
  const fanbase = player?.career.fanbase ?? 0;
  const followers = (a: SocialApp) => stats?.[a]?.followers ?? seedFollowers(a, fanbase);
  const limit = Math.min(...apps.map((a) => APP_META[a].limit));
  const energy = k.energy + (apps.length - 1);

  const byId = useMemo(() => new Map(npcs.map((n) => [n.id, n])), [npcs]);
  const suggestions = useMemo(() => {
    const out: { n: NPC; why: string }[] = [];
    const seen = new Set<string>();
    const add = (n: NPC | undefined, why: string) => { if (n && !seen.has(n.id) && TAGGABLE[n.role]) { seen.add(n.id); out.push({ n, why }); } };
    for (const c of crew) add(byId.get(c.npcId), 'Your team');
    for (const s of released.slice(0, 6)) for (const id of s.featuredArtists ?? []) add(byId.get(id), `On "${s.title}"`);
    for (const b of beefs) if (!b.resolution) add(byId.get(b.npcId), 'Beef');
    const friends = npcs.filter((n) => n.relationshipScore >= 35 && TAGGABLE[n.role]).sort((a, b) => b.relationshipScore - a.relationshipScore).slice(0, 6);
    for (const f of friends) add(f, 'Close');
    return out.slice(0, 10);
  }, [crew, released, beefs, npcs, byId]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [] as NPC[];
    const out: NPC[] = [];
    for (const n of npcs) {
      if (!TAGGABLE[n.role]) continue;
      if (n.name.toLowerCase().includes(t)) out.push(n);
      if (out.length >= 40) break;
    }
    return out.sort((a, b) => b.fame - a.fame).slice(0, 8);
  }, [q, npcs]);

  const beefIds = new Set(beefs.filter((b) => !b.resolution).map((b) => b.npcId));
  const controversial = tags.some((id) => beefIds.has(id));

  function toggleApp(a: SocialApp) {
    setApps((cur) => (cur.includes(a) ? (cur.length > 1 ? cur.filter((x) => x !== a) : cur) : [...cur, a]));
  }
  function toggleTag(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id]));
    setQ('');
  }
  function insertMention(n: NPC) {
    const h = '@' + n.name.replace(/\s+/g, '');
    if (!text.includes(h)) setText((t) => (t ? `${t} ${h}` : h).slice(0, limit));
  }

  function post() {
    const r = asLabel && label
      ? postAsLabel({ apps, kind, content: text, songId: songId || undefined })
      : publishPost({ apps, kind, content: text, tags, songId: songId || undefined, soundSongId: sound && !sound.mine ? sound.id : undefined });
    setResult(r);
    if (r.ok) {
      onPosted(r);
      setText(''); setTags([]); setSongId(''); setResult(null);
      onClose();
    }
  }

  const ordered: SocialApp[] = [app, ...SOCIAL_APPS.filter((a) => a !== app)];

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      width={520}
      title="New post"
      subtitle={`Posting as ${asLabel && label ? label.name : player?.artistName ?? ''}`}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1 text-[11px] text-ink3 leading-snug">
            ⚡ {energy} energy{apps.length > 1 ? ` · ${apps.length} apps` : ''}{controversial ? ' · 🔥 controversial: more reach, more heat' : ''}
            {result && !result.ok && <div className="text-fall mt-0.5">{result.message}</div>}
          </div>
          <Button onClick={post} disabled={(!text.trim() && !songId && !sound) || (k.needsSong && !songId && !sound) || (player?.energy ?? 0) < energy} accent={APP_META[app].color} variant="accent">
            Post
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-5">
        {label && (
          <section>
            <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">Post as</div>
            <div className="grid grid-cols-2 gap-2">
              {[{ on: !asLabel, label: player?.artistName ?? 'You', sub: 'Your page', set: false }, { on: asLabel, label: label.name, sub: 'The label\'s page', set: true }].map((o) => (
                <button key={o.sub} onClick={() => setAsLabel(o.set)} className={cn('rounded-[12px] border px-3 py-2 text-left transition', o.on ? 'border-amber bg-amber/10' : 'border-line opacity-70 hover:opacity-100')}>
                  <div className="text-[13px] font-semibold text-ink truncate">{o.label}</div>
                  <div className="text-[11px] text-ink3">{o.sub}</div>
                </button>
              ))}
            </div>
          </section>
        )}
        <section>
          <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">Post to</div>
          <div className="grid grid-cols-2 gap-2">
            {ordered.map((a) => {
              const on = apps.includes(a);
              return (
                <button key={a} onClick={() => toggleApp(a)} className={cn('flex items-center gap-2.5 rounded-[12px] border px-3 py-2 text-left transition', on ? 'bg-white/[0.04]' : 'border-line opacity-60 hover:opacity-100')} style={on ? { borderColor: APP_META[a].color } : undefined}>
                  <AppMark app={a} size={24} />
                  <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-ink">{APP_META[a].name}</div><div className="text-[10px] text-ink3">{compact(followers(a))} followers</div></div>
                  <span className={cn('w-4 h-4 rounded-full border flex items-center justify-center text-[10px]', on ? 'text-black' : 'border-line')} style={on ? { background: APP_META[a].color, borderColor: APP_META[a].color } : undefined}>{on ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
          {apps.length > 1 && <div className="text-[11px] text-ink3 mt-1.5">Each app gets its own version — a challenge on Clip becomes a cover post on Snapgram and an announcement on Chirp.</div>}
        </section>

        <section>
          <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">What kind of post</div>
          <div className="grid grid-cols-2 gap-2">
            {kindsFor(app).map((d) => (
              <button key={d.id} onClick={() => setKind(d.id)} className={cn('rounded-[12px] border p-2.5 text-left transition', kind === d.id ? 'bg-white/[0.04]' : 'border-line hover:bg-cardhover')} style={kind === d.id ? { borderColor: APP_META[app].color } : undefined}>
                <div className="text-[13px] font-semibold text-ink">{d.emoji} {d.label}</div>
                <div className="text-[11px] text-ink3 leading-snug mt-0.5">{d.blurb}</div>
                <div className="text-[10px] text-ink3 mt-1">⚡ {d.energy}{d.needsSong ? ' · needs a song' : ''}{d.virality >= 0.04 ? ' · can go viral' : ''}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, limit))}
            rows={4}
            placeholder={app === 'chirp' ? 'What\'s happening?' : app === 'snapgram' ? 'Write a caption…' : app === 'clip' ? 'Describe your clip…' : 'Talk to your day ones…'}
            className="w-full rounded-[12px] bg-card border border-line p-3 text-[14px] text-ink outline-none focus:border-amber resize-none"
          />
          <div className="flex items-center justify-between text-[11px] text-ink3 mt-1"><span>Use @ to mention. Insults and rivals get reach — and consequences.</span><span className="num">{text.length}/{limit}</span></div>
        </section>

        {sound && (
          <div className="flex items-center gap-2 rounded-[12px] border border-[#12A594]/50 bg-[#12A594]/10 px-3 py-2">
            <span className="text-[16px]">♫</span>
            <div className="min-w-0 flex-1 text-[12px] text-ink"><b>Sound:</b> {sound.title}{sound.mine ? ' (yours)' : ' — riding the trend'}</div>
            <button onClick={() => setSound(null)} className="text-ink3 hover:text-ink text-[12px]">Remove</button>
          </div>
        )}

        <section>
          <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">Attach a song {k.needsSong && !sound && <span className="text-amber normal-case tracking-normal">· required</span>}</div>
          <select value={songId} onChange={(e) => setSongId(e.target.value)} className="w-full h-10 rounded-[10px] bg-card border border-line px-3 text-[13px] text-ink outline-none">
            <option value="">No song</option>
            {released.map((s) => <option key={s.id} value={s.id}>{s.title} · Q{Math.round(s.quality)}</option>)}
          </select>
          {released.length === 0 && <div className="text-[11px] text-ink3 mt-1">Release a song first to run challenges and cover reveals.</div>}
        </section>

        <section>
          <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">Tag people <span className="normal-case tracking-normal">· {tags.length}/5</span></div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((id) => { const n = byId.get(id); return n ? <button key={id} onClick={() => toggleTag(id)} className="px-2 h-7 rounded-full bg-[#4DA3FF]/15 text-[#4DA3FF] text-[12px] font-semibold">@{n.name} ✕</button> : null; })}
            </div>
          )}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artists, managers, producers, blogs…" className="w-full h-10 rounded-[10px] bg-card border border-line px-3 text-[13px] text-ink outline-none focus:border-amber" />
          <div className="mt-2 space-y-1">
            {(q.trim().length >= 2 ? results.map((n) => ({ n, why: '' })) : suggestions).map(({ n, why }) => (
              <div key={n.id} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-white/[0.03]">
                <Avatar name={n.name} seed={n.id} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-ink truncate">{n.name} <span className="text-[11px] text-ink3">· {TAGGABLE[n.role]}{why ? ` · ${why}` : ''}</span></div>
                  <div className={cn('text-[10px]', relTone(n.relationshipScore))}>Relationship {n.relationshipScore > 0 ? '+' : ''}{Math.round(n.relationshipScore)} · fame {Math.round(n.fame)}</div>
                </div>
                <button onClick={() => insertMention(n)} className="text-[11px] text-ink3 hover:text-ink px-1.5">@</button>
                <button onClick={() => toggleTag(n.id)} className={cn('px-2.5 h-7 rounded-full text-[11px] font-semibold border', tags.includes(n.id) ? 'bg-[#4DA3FF] text-black border-[#4DA3FF]' : 'border-line text-ink2 hover:text-ink')}>{tags.includes(n.id) ? 'Tagged' : 'Tag'}</button>
              </div>
            ))}
            {q.trim().length >= 2 && results.length === 0 && <div className="text-[12px] text-ink3 px-2">Nobody by that name.</div>}
          </div>
          <div className="text-[11px] text-ink3 mt-2 leading-snug">Tagged people see it. Friends reply or repost (their followers find you); bigger names often ignore you; a rival will clap back.</div>
        </section>
      </div>
    </SlidePanel>
  );
}
