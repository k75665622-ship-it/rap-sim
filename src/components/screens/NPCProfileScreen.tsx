// ─── ARTISTS & CONTACTS ────────────────────────────────────────────────────
// The directory of everyone in your world, and a real profile for each: who
// they are, how big they are, what they think of you, who handles them, what
// they've released — and every way to reach them. On a phone the list and the
// profile are separate screens; on a desktop they sit side by side.

import { useMemo, useState } from 'react';
import { REACH_OUT_COOLDOWN_DAYS, useGameStore } from '../../store/gameStore';
import { Button, Segmented } from '../ui/kit';
import { gradientFor } from '../ui/kit';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { audienceOf, liveCounts } from '../../sim/socialLive';
import { getCountryNameList } from '../../data/locations';
import { ENERGY_COSTS } from '../../sim/energy';
import { dateToSerial } from '../../sim/gameClock';
import { crewWage, hireCheck, hireUpfrontCost, managerEffectLine, managerNetwork, npcCV, roleSpec, traitsFor } from '../../sim/roles';
import { specialtyOf, managerReach } from '../../sim/managerStyle';
import type { TeamActionResult } from '../../sim/roles';
import { HIDDEN_TRAITS, VISIBLE_TRAITS } from '../../sim/traits';
import { IconVerified } from '../icons';
import { Avatar } from '../social/shared';
import type { NPC } from '../../types/game';
import { isRealId } from '../../sim/realPeople';
import { personaOf, specialSkillOf } from '../../sim/persona';

const REVEAL_HIDDEN_AT = 55;
const PAGE_SIZE = 40;

function relLabel(score: number) {
  if (score >= 60) return { label: 'Close', cls: 'bg-rise/15 text-rise', emoji: '💚', bar: '#2ECC71' };
  if (score >= 20) return { label: 'Cool', cls: 'bg-[#4DA3FF]/15 text-[#4DA3FF]', emoji: '🤝', bar: '#4DA3FF' };
  if (score >= -20) return { label: 'Neutral', cls: 'bg-white/10 text-ink2', emoji: '😐', bar: '#9AA0AE' };
  if (score >= -60) return { label: 'Cold', cls: 'bg-amber/15 text-amber', emoji: '❄️', bar: '#F5B301' };
  return { label: 'Hostile', cls: 'bg-fall/15 text-fall', emoji: '💢', bar: '#FF5C5C' };
}

const ROLE_INFO: Record<string, { emoji: string; label: string }> = {
  artist: { emoji: '🎤', label: 'Artist' }, manager: { emoji: '💼', label: 'Manager' }, rival_manager: { emoji: '🎯', label: 'Rival Manager' },
  lawyer: { emoji: '⚖️', label: 'Lawyer' }, label_ceo: { emoji: '🏢', label: 'Label CEO' }, media: { emoji: '📰', label: 'Media' },
  producer: { emoji: '🎛️', label: 'Producer' }, radio_owner: { emoji: '📻', label: 'Radio Owner' }, ar: { emoji: '🔍', label: 'A&R' },
  a_and_r_scout: { emoji: '🔍', label: 'Scout' }, publicist: { emoji: '📣', label: 'Publicist' }, engineer: { emoji: '🎚️', label: 'Engineer' },
  dj: { emoji: '🎧', label: 'DJ' }, blogger: { emoji: '✍️', label: 'Blogger' }, promoter: { emoji: '🎪', label: 'Promoter' },
  stylist: { emoji: '👗', label: 'Stylist' }, photographer: { emoji: '📷', label: 'Photographer' }, songwriter: { emoji: '📝', label: 'Songwriter' },
  session_musician: { emoji: '🎸', label: 'Session Player' }, distributor: { emoji: '📦', label: 'Distributor' }, investor: { emoji: '💰', label: 'Investor' },
  venue_owner: { emoji: '🏟️', label: 'Venue Owner' }, choreographer: { emoji: '💃', label: 'Choreographer' }, tour_manager: { emoji: '🚌', label: 'Tour Manager' },
};
const roleLabel = (r: string) => ROLE_INFO[r]?.label ?? r.replace(/_/g, ' ');
const roleEmoji = (r: string) => ROLE_INFO[r]?.emoji ?? '👤';
const isVerified = (n: NPC) => isRealId(n.id) || n.fame >= 50;
const TIER_CLS: Record<string, string> = { international: 'bg-amber/15 text-amber', national: 'bg-[#4DA3FF]/15 text-[#4DA3FF]', local: 'bg-white/10 text-ink3' };

function Chip({ children, cls }: { children: React.ReactNode; cls?: string }) {
  return <span className={cn('inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap', cls ?? 'bg-white/[0.06] text-ink2')}>{children}</span>;
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-[14px] font-semibold text-ink">{title}</h3>{right}</div>
      {children}
    </section>
  );
}

type Tab = 'overview' | 'music' | 'relationship' | 'team' | 'hire';

export function NPCProfileScreen() {
  const npcs = useGameStore((s) => s.npcs);
  const selectedNPCId = useGameStore((s) => s.selectedNPCId);
  const selectNPC = useGameStore((s) => s.selectNPC);
  const setScreen = useGameStore((s) => s.setScreen);
  const setPendingFeatureNpc = useGameStore((s) => s.setPendingFeatureNpc);
  const openArtist = useGameStore((s) => s.openArtist);
  const player = useGameStore((s) => s.player);
  const crew = useGameStore((s) => s.crew);
  const contracts = useGameStore((s) => s.contracts);
  const gameDate = useGameStore((s) => s.gameDate);
  const npcSongs = useGameStore((s) => s.npcSongs);
  const posts = useGameStore((s) => s.socialPosts);
  const beefs = useGameStore((s) => s.beefs);
  const hireCrew = useGameStore((s) => s.hireCrew);
  const fireCrew = useGameStore((s) => s.fireCrew);
  const reachOutToNpc = useGameStore((s) => s.reachOutToNpc);
  const sendGift = useGameStore((s) => s.sendGift);
  const followingIds = useGameStore((s) => s.following);
  const followedByIds = useGameStore((s) => s.followedBy);
  const blockedIds = useGameStore((s) => s.blocked);
  const followAccount = useGameStore((s) => s.followAccount);
  const unfollowAccount = useGameStore((s) => s.unfollowAccount);
  const blockAccount = useGameStore((s) => s.blockAccount);
  const unblockAccount = useGameStore((s) => s.unblockAccount);
  const clockMinute = useGameStore((s) => s.clockMinute);

  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null);
  const [hireFlash, setHireFlash] = useState<TeamActionResult | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<string>(player?.country ?? 'all');
  const [role, setRole] = useState<string>('all');
  const [tier, setTier] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<Tab>('overview');
  const [mobileProfile, setMobileProfile] = useState(!!selectedNPCId);

  const countries = useMemo(() => getCountryNameList().sort(), []);
  const selected = npcs.find((n) => n.id === selectedNPCId);
  const serial = dateToSerial(gameDate);
  const nowMin = serial * 1440 + (clockMinute ?? 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return npcs.filter((n) => {
      if (n.role === 'fan_account') return false;
      if (country !== 'all' && n.country !== country) return false;
      if (role !== 'all' && n.role !== role) return false;
      if (tier !== 'all' && n.tier !== tier) return false;
      if (q && !n.name.toLowerCase().includes(q) && !(n.realName ?? '').toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.fame - a.fame);
  }, [npcs, query, country, role, tier]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const change = (fn: () => void) => { fn(); setPage(0); };

  function open(id: string) {
    selectNPC(id);
    setTab('overview');
    setFlash(null);
    setHireFlash(null);
    setConfirmRelease(false);
    setMobileProfile(true);
    window.scrollTo?.({ top: 0 });
  }

  // ── Derived for the profile ──
  const daysSinceReach = selected?.lastReachOut !== undefined ? serial - selected.lastReachOut : null;
  const onReachCooldown = daysSinceReach !== null && daysSinceReach < REACH_OUT_COOLDOWN_DAYS;
  const teamManagerId = selected?.team?.managerId ?? selected?.managerId;
  const teamManager = teamManagerId ? npcs.find((n) => n.id === teamManagerId) : undefined;
  const represents = useMemo(() => (selected ? npcs.filter((n) => n.id !== selected.id && (n.managerId === selected.id || n.team?.managerId === selected.id)) : []), [npcs, selected]);
  const cv = useMemo(() => (selected ? npcCV(selected, gameDate.year) : null), [selected, gameDate.year]);
  const traits = useMemo(() => (selected ? traitsFor(selected) : { visible: [], hidden: [] }), [selected]);
  const spec = selected ? roleSpec(selected.role) : null;
  const crewMember = selected ? crew.find((c) => c.npcId === selected.id) : undefined;
  const managesPlayer = !!(selected && contracts.some((c) => c.type === 'management' && c.active && c.npcId === selected.id));
  const hireState = useMemo(() => {
    if (!selected || !player || !spec?.hireable) return null;
    return { check: hireCheck(selected, crew, player.career.money), wage: crewWage(selected, selected.role), upfront: hireUpfrontCost(selected, selected.role) };
  }, [selected, player, spec, crew]);
  const theirSongs = useMemo(() => (selected ? npcSongs.filter((s) => s.ownerId === selected.id).sort((a, b) => (b.totalStreams ?? 0) - (a.totalStreams ?? 0)) : []), [npcSongs, selected]);
  const theirPosts = useMemo(() => (selected ? posts.filter((p) => p.authorId === selected.id && (p.postedMinute ?? 0) <= nowMin).slice(0, 4) : []), [posts, selected, nowMin]);
  const beef = selected ? beefs.find((b) => b.npcId === selected.id && !b.resolution) : undefined;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...(selected?.role === 'artist' ? [{ id: 'music' as Tab, label: 'Music' }] : []),
    { id: 'relationship', label: 'Relationship' },
    { id: 'team', label: represents.length ? 'Roster' : 'Team' },
    ...(spec?.hireable ? [{ id: 'hire' as Tab, label: crewMember ? 'Payroll' : 'Hire' }] : []),
  ];

  const list = (
    <div className={cn('space-y-3', mobileProfile ? 'hidden lg:block' : 'block')}>
      <div className="rounded-[16px] border border-line bg-card p-3 space-y-2">
        <input value={query} onChange={(e) => change(() => setQuery(e.target.value))} placeholder="Search artists, managers, producers…" className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[14px] text-ink placeholder:text-ink3 outline-none focus:border-amber" />
        <div className="grid grid-cols-3 gap-2">
          <select value={country} onChange={(e) => change(() => setCountry(e.target.value))} className="h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink min-w-0">
            <option value="all">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={role} onChange={(e) => change(() => setRole(e.target.value))} className="h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink min-w-0">
            <option value="all">All roles</option>
            {Object.keys(ROLE_INFO).map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
          <select value={tier} onChange={(e) => change(() => setTier(e.target.value))} className="h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink min-w-0">
            <option value="all">All tiers</option><option value="international">International</option><option value="national">National</option><option value="local">Local</option>
          </select>
        </div>
        <div className="text-[11px] text-ink3">{filtered.length.toLocaleString()} people · biggest first</div>
      </div>
      <div className="space-y-1.5 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1">
        {visible.map((n) => {
          const r = relLabel(n.relationshipScore);
          return (
            <button key={n.id} onClick={() => open(n.id)} className={cn('w-full text-left rounded-[14px] border p-3 flex items-center gap-3 transition', selectedNPCId === n.id ? 'border-amber/50 bg-amber/[0.06]' : 'border-line bg-card hover:bg-cardhover')}>
              <Avatar name={n.name} seed={n.id} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0"><span className="text-[14px] font-semibold text-ink truncate">{n.name}</span>{isVerified(n) && <IconVerified size={14} className="text-[#4DA3FF] shrink-0" />}</div>
                <div className="text-[12px] text-ink3 truncate">{roleEmoji(n.role)} {roleLabel(n.role)} · {n.city ? `${n.city}, ` : ''}{n.country}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[14px] font-bold text-ink num">{Math.round(n.fame)}</div>
                <div className="text-[13px]" title={r.label}>{r.emoji}</div>
              </div>
            </button>
          );
        })}
        {visible.length === 0 && <div className="rounded-[14px] border border-dashed border-line p-8 text-center text-[13px] text-ink3">Nobody matches those filters.</div>}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</Button>
          <span className="text-[12px] text-ink3">{safePage + 1} / {totalPages}</span>
          <Button size="sm" variant="secondary" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next →</Button>
        </div>
      )}
    </div>
  );

  const profile = !selected ? (
    <div className="hidden lg:flex rounded-[16px] border border-line bg-card min-h-[420px] items-center justify-center text-center p-6">
      <div><div className="text-5xl mb-3">👥</div><p className="text-ink2 text-sm">Pick someone to see their profile.</p></div>
    </div>
  ) : (() => {
    const r = relLabel(selected.relationshipScore);
    const [ga, gb] = gradientFor(selected.id);
    const isF = (followingIds ?? []).includes(selected.id);
    const isB = (blockedIds ?? []).includes(selected.id);
    const followsYou = (followedByIds ?? []).includes(selected.id);
    const listeners = theirSongs.reduce((a, s) => a + (s.weeklyStreams ?? 0), 0) * 1.6;
    return (
      <div className={cn('space-y-4', mobileProfile ? 'block' : 'hidden lg:block')}>
        <button onClick={() => setMobileProfile(false)} className="lg:hidden text-[13px] text-ink2">← All people</button>
        {/* Hero */}
        <div className="rounded-[18px] border border-line bg-card overflow-hidden">
          <div className="h-28 sm:h-36 relative" style={{ background: `linear-gradient(130deg, ${ga}, ${gb})` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent" />
            {beef && <span className="absolute top-3 right-3 px-2.5 h-[24px] rounded-full bg-fall text-white text-[11px] font-bold flex items-center">⚔️ Beef</span>}
          </div>
          <div className="px-4 sm:px-5 pb-5 -mt-12 relative">
            <div className="flex items-end gap-3">
              <div className="rounded-full p-1 bg-card shrink-0"><Avatar name={selected.name} seed={selected.id} size={92} /></div>
              <div className="flex-1" />
              <div className="text-right pb-1">
                <div className="text-[28px] font-black text-amber leading-none num">{Math.round(selected.fame)}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink3">Fame</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <h1 className="text-[24px] sm:text-[28px] font-bold text-ink leading-tight break-words">{selected.name}</h1>
              {isVerified(selected) && <IconVerified size={22} className="text-[#4DA3FF]" />}
            </div>
            {selected.realName && selected.realName !== selected.name && <div className="text-[13px] text-ink3">{selected.realName}</div>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>{roleEmoji(selected.role)} {roleLabel(selected.role)}</Chip>
              <Chip cls={TIER_CLS[selected.tier]}>{selected.tier}</Chip>
              <Chip>📍 {selected.city ? `${selected.city}, ` : ''}{selected.country}</Chip>
              {selected.genre && <Chip>🎵 {selected.genre.replace(/_/g, '-')}</Chip>}
              <Chip>Age {selected.age}</Chip>
              {managesPlayer && <Chip cls="bg-amber/15 text-amber">💼 Your manager</Chip>}
              {crewMember && <Chip cls="bg-rise/15 text-rise">On your payroll</Chip>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[12px] bg-white/[0.04] px-3 py-2.5"><div className="text-[16px] font-bold text-ink num">{compact(audienceOf(selected))}</div><div className="text-[10px] uppercase tracking-wider text-ink3">Followers</div></div>
              <div className="rounded-[12px] bg-white/[0.04] px-3 py-2.5"><div className="text-[16px] font-bold text-ink num">{selected.role === 'artist' ? compact(Math.round(listeners)) : cv?.skill ?? '—'}</div><div className="text-[10px] uppercase tracking-wider text-ink3">{selected.role === 'artist' ? 'Monthly listeners' : 'Skill'}</div></div>
              <div className="rounded-[12px] bg-white/[0.04] px-3 py-2.5"><div className="text-[16px] font-bold num" style={{ color: r.bar }}>{selected.relationshipScore > 0 ? '+' : ''}{Math.round(selected.relationshipScore)}</div><div className="text-[10px] uppercase tracking-wider text-ink3">{r.emoji} {r.label}</div></div>
            </div>
            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setScreen('pingchat')} disabled={isB}>💬 Message</Button>
              {!isB && <Button size="sm" variant="secondary" onClick={() => setFlash(isF ? unfollowAccount(selected.id) : followAccount(selected.id))}>{isF ? '✓ Following' : followsYou ? 'Follow back' : '+ Follow'}</Button>}
              {selected.role === 'artist' && <Button size="sm" variant="secondary" onClick={() => { setPendingFeatureNpc(selected.id); setScreen('studio'); }}>🤝 Request a feature</Button>}
              <Button size="sm" variant="secondary" disabled={onReachCooldown} onClick={() => setFlash(reachOutToNpc(selected.id))}>🍻 Ask to link up</Button>
              {selected.role === 'artist' && <Button size="sm" variant="ghost" onClick={() => openArtist(selected.id)}>🎧 Artist page</Button>}
              <Button size="sm" variant="ghost" onClick={() => { if (isB) { unblockAccount(selected.id); setFlash({ ok: true, message: `Unblocked ${selected.name}.` }); } else setFlash(blockAccount(selected.id)); }} className={isB ? '' : 'text-fall'}>{isB ? 'Unblock' : 'Block'}</Button>
            </div>
            {followsYou && <div className="mt-2 text-[12px] text-ink3">Follows you.</div>}
            {onReachCooldown && <div className="mt-2 text-[12px] text-ink3">You asked {daysSinceReach === 0 ? 'today' : `${daysSinceReach}d ago`} — give it {REACH_OUT_COOLDOWN_DAYS - (daysSinceReach ?? 0)} more day{REACH_OUT_COOLDOWN_DAYS - (daysSinceReach ?? 0) === 1 ? '' : 's'}.</div>}
            {flash && <div className={cn('mt-3 rounded-[10px] px-3 py-2 text-[12px]', flash.ok ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall')}>{flash.message}</div>}
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1"><Segmented<Tab> value={tab} onChange={setTab} options={tabs} /></div>

        {tab === 'overview' && (
          <>
            <Section title="About">
              <p className="text-[14px] text-ink2 leading-relaxed">{selected.bio ?? 'No write-up on file. Nobody has put this one in a magazine yet.'}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
                <div className="rounded-[10px] bg-white/[0.04] px-3 py-2"><div className="text-ink3">Status</div><div className="text-ink font-medium">{selected.isAvailable ? '🟢 Reachable' : '🔴 Unreachable'}</div></div>
                <div className="rounded-[10px] bg-white/[0.04] px-3 py-2"><div className="text-ink3">You are</div><div className="text-ink font-medium capitalize">{selected.relationshipStage}</div></div>
              </div>
            </Section>
            {!isRealId(selected.id) && (() => {
              const pz = personaOf(selected);
              const special = cv ? specialSkillOf(selected.id, selected.role, cv.skill) : null;
              return (
                <Section title="Personality" right={<span className="text-[12px] font-semibold text-ink2">{pz.temperament}</span>}>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.personality ?? []).map((w) => <Chip key={w} cls="bg-white/[0.06] text-ink2 capitalize">{w.replace(/_/g, ' ')}</Chip>)}
                    {pz.tags.map((t) => <Chip key={t} cls="bg-amber/10 text-amber">{t}</Chip>)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    {[['On time', pz.punctuality], ['Forgiving', pz.forgiveness], ['Ego', pz.ego], ['Warmth', pz.warmth]].map(([l, v]) => (
                      <div key={l as string} className="rounded-[10px] bg-white/[0.04] px-3 py-2">
                        <div className="text-[11px] text-ink3">{l}</div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden"><div className="h-full bg-amber" style={{ width: `${Math.round((v as number) * 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] text-ink3 mt-2 leading-snug">This decides how they text, whether they turn up on time, and how they take it when you bail.</p>
                  {special && (
                    <div className="mt-3 rounded-[12px] border border-amber/30 bg-amber/[0.06] px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-amber font-semibold">Special skill</div>
                      <div className="text-[14px] font-semibold text-ink mt-0.5">{special.emoji} {special.label}</div>
                      <div className="text-[12px] text-ink2 leading-snug mt-0.5">{special.blurb}</div>
                    </div>
                  )}
                </Section>
              );
            })()}
            <Section title="Characteristics" right={<span className="text-[11px] text-ink3">{traits.visible.length} visible</span>}>
              {traits.visible.length === 0 ? <p className="text-[12px] text-ink3">Nothing stands out yet.</p> : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {traits.visible.map((t) => { const s2 = VISIBLE_TRAITS[t]; return <div key={t} className="rounded-[10px] bg-white/[0.04] px-3 py-2"><div className="text-[13px] font-semibold text-ink">{s2.emoji} {s2.label}</div><div className="text-[12px] text-ink3 leading-snug mt-0.5">{s2.blurb}</div></div>; })}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-line">
                <div className="text-[10px] uppercase tracking-wider text-ink3 mb-2">What you've learned about them</div>
                {selected.relationshipScore >= REVEAL_HIDDEN_AT
                  ? <div className="grid sm:grid-cols-2 gap-2">{traits.hidden.map((t) => { const h = HIDDEN_TRAITS[t]; return <div key={t} className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-[13px] font-semibold text-ink">{h.label}</div><div className="text-[12px] text-ink3 leading-snug mt-0.5">{h.tell}</div></div>; })}</div>
                  : <p className="text-[12px] text-ink3">Get the relationship to {REVEAL_HIDDEN_AT} and you'll see how they really work.</p>}
              </div>
            </Section>
            {cv && (
              <Section title="Career" right={<span className="text-[13px] font-bold text-amber">Skill {cv.skill}</span>}>
                <p className="text-[13px] text-ink2 mb-3">{cv.headline}</p>
                <div className="space-y-1.5 mb-3">{cv.credits.map((c, i) => <div key={i} className="flex gap-3 text-[12px]"><span className="text-ink3 num w-10 shrink-0">{c.year}</span><span className="text-ink2">{c.text}</span></div>)}</div>
                <div className="flex flex-wrap gap-1.5">{cv.strengths.map((s2) => <Chip key={s2} cls="bg-[#7B61FF]/15 text-[#A78BFA]">{s2}</Chip>)}</div>
                <p className="text-[12px] text-ink3 mt-3 italic">{cv.verdict}</p>
                {selected.role === 'manager' && <div className="mt-3 rounded-[10px] bg-white/[0.04] px-3 py-2 text-[12px]"><div className="flex justify-between"><span className="text-ink3">Manager network</span><span className="text-ink font-bold">{managerNetwork(selected)}/100</span></div><div className="text-ink3 mt-1">{managerEffectLine(selected)}</div>{(() => { const sp = specialtyOf(selected); return sp ? <div className="mt-2"><div className="text-ink font-semibold">{sp.emoji} {sp.label} <span className="text-ink3 font-normal">· {managerReach(selected).label}</span></div><div className="text-ink3 mt-0.5">{sp.purpose}</div><div className="text-ink3 mt-0.5">Weak spot: {sp.weakness}</div></div> : null; })()}</div>}
              </Section>
            )}
          </>
        )}

        {tab === 'music' && (
          <>
            <Section title="Releases" right={<button onClick={() => openArtist(selected.id)} className="text-[12px] text-amber">Full artist page →</button>}>
              {theirSongs.length === 0 ? <p className="text-[12px] text-ink3">Nothing released in the world yet.</p> : (
                <div className="space-y-1.5">
                  {theirSongs.slice(0, 8).map((s2, i) => (
                    <div key={s2.id} className="flex items-center gap-3 rounded-[10px] bg-white/[0.03] px-3 py-2">
                      <span className="text-[12px] text-ink3 w-4 num">{i + 1}</span>
                      <div className="w-9 h-9 rounded-[8px] shrink-0" style={{ background: `linear-gradient(135deg, ${gradientFor(s2.id)[0]}, ${gradientFor(s2.id)[1]})` }} />
                      <div className="min-w-0 flex-1"><div className="text-[13px] text-ink truncate">{s2.title}</div><div className="text-[11px] text-ink3">{compact(s2.totalStreams)} streams{s2.featureArtistNames?.length ? ` · ft. ${s2.featureArtistNames.join(', ')}` : ''}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Recent posts">
              {theirPosts.length === 0 ? <p className="text-[12px] text-ink3">Quiet lately.</p> : (
                <div className="space-y-2">
                  {theirPosts.map((p) => { const c = liveCounts(p, nowMin); return <div key={p.id} className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-[13px] text-ink">{p.content}</div><div className="text-[11px] text-ink3 mt-1">{p.platform} · ♥ {compact(c.likes)} · 💬 {compact(c.comments)}</div></div>; })}
                </div>
              )}
            </Section>
          </>
        )}

        {tab === 'relationship' && (
          <Section title="You and them">
            <div className="flex items-center justify-between mb-2"><Chip cls={r.cls}>{r.emoji} {r.label}</Chip><span className="text-[14px] font-bold text-ink num">{selected.relationshipScore > 0 ? '+' : ''}{Math.round(selected.relationshipScore)} / 100</span></div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, (selected.relationshipScore + 100) / 2)}%`, background: r.bar }} /></div>
            <div className="text-[12px] text-ink3 mt-2">Stage: <span className="text-ink capitalize">{selected.relationshipStage}</span></div>
            {selected.memoryLog.length > 0 && (
              <div className="mt-3 rounded-[10px] bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase tracking-wider text-ink3 mb-1.5">What they remember</div>
                {selected.memoryLog.slice(-6).reverse().map((e, i) => <p key={i} className="text-[12px] text-ink2 leading-relaxed">• {e}</p>)}
              </div>
            )}
            <div className="mt-3">
              <div className="text-[12px] text-ink3 mb-1.5">Send a gift — a gesture with a price on it</div>
              <div className="grid grid-cols-3 gap-2">
                {([['flowers', '💐 Flowers', 150], ['bottle', '🍾 Bottle', 800], ['chain', '⛓️ Chain', 6000]] as const).map(([t, label, cost]) => (
                  <button key={t} onClick={() => setFlash(sendGift(selected.id, t))} className="rounded-[10px] border border-line bg-white/[0.02] px-2 py-2 text-[12px] text-ink2 hover:text-ink hover:bg-cardhover"><div className="font-semibold">{label}</div><div className="text-[11px] text-ink3">${cost.toLocaleString()}</div></button>
                ))}
              </div>
            </div>
            <div className="mt-3 text-[12px] text-ink3">An evening together costs {ENERGY_COSTS.reachOut} energy — once a week.</div>
            <details className="mt-3 rounded-[10px] border border-line px-3 py-2">
              <summary className="text-[12px] font-semibold text-ink2 cursor-pointer">How a relationship moves</summary>
              <ul className="mt-2 space-y-1 text-[12px] text-ink3 leading-relaxed">
                <li><span className="text-rise">Up:</span> time together, gifts, verses delivered on time, likes, reposts, replies, tagging with love, stage invites, fair pay.</li>
                <li><span className="text-amber">Down:</span> insults, quote-tweets, tagging them in a fight, late verses, lowballs, beef, blocking.</li>
                <li><span className="text-ink2">Drift:</span> friends you never make time for cool off monthly; grudges soften slowly.</li>
              </ul>
            </details>
          </Section>
        )}

        {tab === 'team' && (
          <Section title={represents.length ? `Represents ${represents.length} artist${represents.length === 1 ? '' : 's'}` : 'Their team'}>
            <div className="space-y-2">
              {represents.map((x) => (
                <button key={x.id} onClick={() => open(x.id)} className="w-full flex items-center gap-3 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-left">
                  <Avatar name={x.name} seed={x.id} size={34} /><div className="min-w-0 flex-1"><div className="text-[13px] text-ink truncate">{x.name}</div><div className="text-[11px] text-ink3">Fame {Math.round(x.fame)} · {x.country}</div></div><span className="text-[12px] text-amber">View →</span>
                </button>
              ))}
              {teamManager && (
                <button onClick={() => open(teamManager.id)} className="w-full flex items-center gap-3 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-left">
                  <Avatar name={teamManager.name} seed={teamManager.id} size={34} /><div className="min-w-0 flex-1"><div className="text-[10px] uppercase tracking-wider text-ink3">Management</div><div className="text-[13px] text-ink truncate">{teamManager.name}</div></div><span className="text-[12px] text-amber">View →</span>
                </button>
              )}
              {!teamManager && selected.team?.managerName && <div className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-ink3">Management</div><div className="text-[13px] text-ink">{selected.team.managerName}</div></div>}
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {selected.team?.label && <div className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-ink3">Label</div><div className="text-ink">{selected.team.label}</div></div>}
                {selected.team?.crew && <div className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-ink3">Crew</div><div className="text-ink">{selected.team.crew}</div></div>}
                {selected.team?.producer && <div className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-ink3">Producer</div><div className="text-ink">{selected.team.producer}</div></div>}
              </div>
              {!teamManager && !selected.team?.managerName && !represents.length && !selected.team?.label && <p className="text-[12px] text-ink3">No representation — which means you can actually get to them.</p>}
            </div>
          </Section>
        )}

        {tab === 'hire' && spec?.hireable && hireState && (
          <Section title={`${spec.emoji} ${spec.title}`}>
            <p className="text-[13px] text-ink2">{spec.job}</p>
            <div className="mt-2 rounded-[10px] bg-white/[0.04] px-3 py-2 text-[12px] text-ink">{spec.effect}</div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-[12px]">
              <div className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-ink3">Monthly</div><div className="text-ink num">${hireState.wage.toLocaleString()}</div></div>
              <div className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-ink3">Up front</div><div className="text-ink num">${hireState.upfront.toLocaleString()}</div></div>
              <div className="rounded-[10px] bg-white/[0.03] px-3 py-2"><div className="text-ink3">Skill</div><div className="text-ink num">{cv?.skill ?? 0}</div></div>
            </div>
            {hireFlash && <div className={cn('mt-3 rounded-[10px] px-3 py-2 text-[12px]', hireFlash.ok ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall')}>{hireFlash.message}</div>}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {crewMember ? (
                confirmRelease
                  ? <><Button size="sm" variant="secondary" onClick={() => { setHireFlash(fireCrew(crewMember.id)); setConfirmRelease(false); }}>Confirm — one month's severance</Button><Button size="sm" variant="ghost" onClick={() => setConfirmRelease(false)}>Cancel</Button></>
                  : <><span className="text-[12px] text-ink3">${crewMember.monthlyWage.toLocaleString()}/mo since {crewMember.hiredAt}</span><Button size="sm" variant="secondary" onClick={() => setConfirmRelease(true)}>Let them go</Button><Button size="sm" variant="ghost" onClick={() => setScreen('team')}>Give them work →</Button></>
              ) : (
                <><Button size="sm" disabled={!hireState.check.ok} onClick={() => setHireFlash(hireCrew(selected.id))}>Hire · ${hireState.upfront.toLocaleString()} up front</Button>{!hireState.check.ok && <span className="text-[12px] text-ink3">{hireState.check.message}</span>}</>
              )}
            </div>
          </Section>
        )}
      </div>
    );
  })();

  return (
    <div className="max-w-[1180px] mx-auto">
      <div className={cn('mb-4', mobileProfile && 'hidden lg:block')}>
        <h1 className="text-[26px] font-bold text-ink leading-tight">Artists & Contacts</h1>
        <div className="text-[13px] text-ink3">{npcs.length.toLocaleString()} people in your world</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
        {list}
        {profile}
      </div>
    </div>
  );
}
