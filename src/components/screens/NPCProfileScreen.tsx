import { useMemo, useState } from 'react';
import { REACH_OUT_COOLDOWN_DAYS, useGameStore } from '../../store/gameStore';
import { Card, Button, Badge, StatBar } from '../ui/Card';
import { cn } from '@/utils/cn';
import { getCountryNameList } from '../../data/locations';
import { ENERGY_COSTS } from '../../sim/energy';
import { dateToSerial } from '../../sim/gameClock';
import {
  crewWage,
  hireCheck,
  hireUpfrontCost,
  managerEffectLine,
  managerNetwork,
  npcCV,
  roleSpec,
  traitsFor,
} from '../../sim/roles';
import type { TeamActionResult } from '../../sim/roles';
import { HIDDEN_TRAITS, VISIBLE_TRAITS } from '../../sim/traits';

/**
 * How well you have to know somebody before you find out what they are really
 * like. Below this the profile tells you it does not know yet, rather than
 * hiding the section entirely — a missing card reads as "nothing here", and
 * the whole point is that there is something you have not earned yet.
 */
const REVEAL_HIDDEN_AT = 55;

// Rendering 11,000+ NPC rows at once would lock the browser, so the list is
// windowed: we render a slice and page through it.
const PAGE_SIZE = 40;

function getRelLabel(score: number) {
  if (score >= 60) return { label: 'Close', color: 'green', emoji: '💚' };
  if (score >= 20) return { label: 'Cool', color: 'blue', emoji: '🤝' };
  if (score >= -20) return { label: 'Neutral', color: 'gray', emoji: '😐' };
  if (score >= -60) return { label: 'Cold', color: 'orange', emoji: '❄️' };
  return { label: 'Hostile', color: 'red', emoji: '💢' };
}

function tierColor(tier: string) {
  if (tier === 'international') return 'yellow';
  if (tier === 'national') return 'blue';
  return 'gray';
}

const ROLE_INFO: Record<string, { emoji: string; label: string }> = {
  artist: { emoji: '🎤', label: 'Artist' },
  manager: { emoji: '💼', label: 'Manager' },
  rival_manager: { emoji: '🎯', label: 'Rival Manager' },
  lawyer: { emoji: '⚖️', label: 'Lawyer' },
  label_ceo: { emoji: '🏢', label: 'Label CEO' },
  media: { emoji: '📰', label: 'Media' },
  producer: { emoji: '🎛️', label: 'Producer' },
  radio_owner: { emoji: '📻', label: 'Radio Owner' },
  ar: { emoji: '🔍', label: 'A&R' },
  a_and_r_scout: { emoji: '🔍', label: 'Scout' },
  publicist: { emoji: '📣', label: 'Publicist' },
  engineer: { emoji: '🎚️', label: 'Engineer' },
  dj: { emoji: '🎧', label: 'DJ' },
  blogger: { emoji: '✍️', label: 'Blogger' },
  promoter: { emoji: '🎪', label: 'Promoter' },
  stylist: { emoji: '👗', label: 'Stylist' },
  photographer: { emoji: '📷', label: 'Photographer' },
  songwriter: { emoji: '📝', label: 'Songwriter' },
  session_musician: { emoji: '🎸', label: 'Session Player' },
  distributor: { emoji: '📦', label: 'Distributor' },
  investor: { emoji: '💰', label: 'Investor' },
  venue_owner: { emoji: '🏟️', label: 'Venue Owner' },
  choreographer: { emoji: '💃', label: 'Choreographer' },
  tour_manager: { emoji: '🚌', label: 'Tour Manager' },
};

function roleEmoji(role: string) {
  return ROLE_INFO[role]?.emoji ?? '👤';
}

function roleLabel(role: string) {
  return ROLE_INFO[role]?.label ?? role.replace(/_/g, ' ');
}

/** Only these roles belong under the "Industry" filter group. */
const INDUSTRY_ROLES = Object.keys(ROLE_INFO).filter((r) => r !== 'artist');

export function NPCProfileScreen() {
  const { npcs, selectedNPCId, selectNPC, setScreen, setPendingFeatureNpc } = useGameStore();

  const player = useGameStore((s) => s.player);
  const crew = useGameStore((s) => s.crew);
  const contracts = useGameStore((s) => s.contracts);
  const gameDate = useGameStore((s) => s.gameDate);
  const hireCrew = useGameStore((s) => s.hireCrew);
  const fireCrew = useGameStore((s) => s.fireCrew);
  const reachOutToNpc = useGameStore((s) => s.reachOutToNpc);
  const sendGift = useGameStore((s) => s.sendGift);

  const [hireFlash, setHireFlash] = useState<TeamActionResult | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [reachFlash, setReachFlash] = useState<{ ok: boolean; message: string } | null>(null);

  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<string>('all');
  const [role, setRole] = useState<string>('all');
  const [tier, setTier] = useState<string>('all');
  const [page, setPage] = useState(0);

  const countries = useMemo(() => getCountryNameList().sort(), []);

  const selected = npcs.find((n) => n.id === selectedNPCId);

  // The cooldown is a rule of the store, not of this screen. Read the same
  // constant the action reads, so the button can never disagree with it about
  // how long "give it a week" is.
  const daysSinceReach =
    selected?.lastReachOut !== undefined ? dateToSerial(gameDate) - selected.lastReachOut : null;
  const onReachCooldown =
    daysSinceReach !== null && daysSinceReach < REACH_OUT_COOLDOWN_DAYS;

  // The team panel resolves the manager to a real roster entry where it can,
  // so their name is a link rather than a dead string.
  const teamManagerId = selected?.team?.managerId ?? selected?.managerId;
  const teamManager = teamManagerId ? npcs.find((n) => n.id === teamManagerId) : undefined;

  /**
   * Who this person *represents*.
   *
   * `hasTeam` below answers "does somebody handle them?" — which is the wrong
   * question for a manager, and made Angel Town's own page claim he had no
   * representation while he was handling Sarkodie. A manager's roster is a
   * real fact about them, so it is derived from the artists pointing at them
   * rather than from their own (empty) team record.
   */
  const represents = useMemo(() => {
    if (!selected) return [];
    return npcs.filter(
      (n) =>
        n.id !== selected.id &&
        (n.managerId === selected.id || n.team?.managerId === selected.id),
    );
  }, [npcs, selected]);

  /** Does this person have any representation at all? Most of the scene does not. */
  const hasTeam = !!(
    selected &&
    (teamManager ||
      represents.length > 0 ||
      selected.team?.label ||
      selected.team?.crew ||
      selected.team?.producer ||
      selected.team?.extras?.length)
  );

  /**
   * Only an artist can be asked for a verse. The button used to render on
   * every profile — a lawyer, a radio owner, a photographer — and dropped the
   * player into a Studio tab with nothing to do there.
   */
  const canRequestFeature = selected?.role === 'artist';

  // ── Roles, CV and hiring ───────────────────────────────────────────────
  // The CV is derived, never saved, so it costs nothing and can never drift
  // from the person it describes.
  const cv = useMemo(() => (selected ? npcCV(selected, gameDate.year) : null), [selected, gameDate.year]);
  // Both layers of who they are. Deterministic from the id, so this is a pure
  // read — it never changes under the player.
  const traits = useMemo(
    () => (selected ? traitsFor(selected) : { visible: [], hidden: [] }),
    [selected],
  );
  const spec = selected ? roleSpec(selected.role) : null;

  /** Already on the payroll? Then the card offers to let them go, not to hire. */
  const crewMember = selected ? crew.find((c) => c.npcId === selected.id) : undefined;

  /** Already managing the player? A second deal is impossible, and the page says so. */
  const managesPlayer = !!(selected && contracts.some((c) => c.type === 'management' && c.active && c.npcId === selected.id));

  const hireState = useMemo(() => {
    if (!selected || !player || !spec?.hireable) return null;
    return {
      check: hireCheck(selected, crew, player.career.money),
      wage: crewWage(selected, selected.role),
      upfront: hireUpfrontCost(selected, selected.role),
    };
  }, [selected, player, spec, crew]);

  function handleDM() {
    if (selected) setScreen('pingchat');
  }

  function handleRequestFeature() {
    if (!selected) return;
    setPendingFeatureNpc(selected.id);
    setScreen('studio');
  }

  function openNPC(id: string) {
    selectNPC(id);
  }

  // Counts for the header, so the player can see the scale of the scene.
  const stats = useMemo(() => {
    const byCountry = new Map<string, number>();
    const byRole = new Map<string, number>();
    for (const n of npcs) {
      if (n.role === 'fan_account') continue;
      byCountry.set(n.country, (byCountry.get(n.country) ?? 0) + 1);
      byRole.set(n.role, (byRole.get(n.role) ?? 0) + 1);
    }
    return { byCountry, byRole };
  }, [npcs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return npcs.filter((n) => {
      if (n.role === 'fan_account') return false;
      if (country !== 'all' && n.country !== country) return false;
      if (role !== 'all' && n.role !== role) return false;
      if (tier !== 'all' && n.tier !== tier) return false;
      if (q && !n.name.toLowerCase().includes(q) && !(n.realName ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [npcs, query, country, role, tier]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function changeFilter(fn: () => void) {
    fn();
    setPage(0);
  }

  // Count of the currently-scoped scene, for a reassuring "there are hundreds here" read.
  const scopedCount = country === 'all' ? npcs.length : (stats.byCountry.get(country) ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            👥 Artists & Contacts
          </h1>
          <p className="text-gray-500 text-sm">
            {npcs.length.toLocaleString()} people in your world
            {country !== 'all' && ` · ${scopedCount.toLocaleString()} in ${country}`}
          </p>
        </div>
        <div className="flex gap-2 text-right">
          <div className="rounded-xl bg-gray-900 border border-gray-800 px-3 py-2">
            <div className="text-lg font-black text-yellow-400">{stats.byRole.get('artist') ?? 0}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Artists</div>
          </div>
          <div className="rounded-xl bg-gray-900 border border-gray-800 px-3 py-2">
            <div className="text-lg font-black text-white">
              {INDUSTRY_ROLES.reduce((s, r) => s + (stats.byRole.get(r) ?? 0), 0)}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Industry</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <input
            value={query}
            onChange={(e) => changeFilter(() => setQuery(e.target.value))}
            placeholder="Search by name…"
            className="flex-1 min-w-[180px] bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-yellow-500"
          />
          <select
            value={country}
            onChange={(e) => changeFilter(() => setCountry(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
          >
            <option value="all">All countries ({npcs.length.toLocaleString()})</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c} ({stats.byCountry.get(c) ?? 0})
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => changeFilter(() => setRole(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
          >
            <option value="all">All roles</option>
            {INDUSTRY_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <select
            value={tier}
            onChange={(e) => changeFilter(() => setTier(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
          >
            <option value="all">All tiers</option>
            <option value="international">International</option>
            <option value="national">National</option>
            <option value="local">Local</option>
          </select>
          {(query || country !== 'all' || role !== 'all' || tier !== 'all') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                changeFilter(() => {
                  setQuery('');
                  setCountry('all');
                  setRole('all');
                  setTier('all');
                })
              }
            >
              Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Showing <span className="text-white font-bold">{filtered.length.toLocaleString()}</span> matching
          {filtered.length > PAGE_SIZE && ` · page ${safePage + 1} of ${totalPages}`}
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: NPC list */}
        <div className="space-y-3">
          <div className="max-h-[560px] overflow-y-auto pr-1 space-y-2">
            {visible.map((npc) => {
              const rel = getRelLabel(npc.relationshipScore);
              return (
                <button
                  key={npc.id}
                  onClick={() => selectNPC(npc.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl transition-all',
                    selectedNPCId === npc.id
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : 'bg-gray-900 border border-gray-800 hover:bg-gray-800',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                      {npc.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{npc.name}</div>
                      <div className="text-gray-600 text-[11px] truncate">
                        {npc.city ? `${npc.city}, ` : ''}
                        {npc.country}
                      </div>
                    </div>
                    <span className="text-sm shrink-0">{rel.emoji}</span>
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    <Badge color={tierColor(npc.tier) as never}>{npc.tier}</Badge>
                    {npc.role !== 'artist' && (
                      <Badge color="gray">
                        {roleEmoji(npc.role)} {roleLabel(npc.role)}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-gray-500 text-sm">Nobody matches those filters.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </Button>
              <span className="text-xs text-gray-500">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next →
              </Button>
            </div>
          )}
        </div>

        {/* Right: NPC Profile */}
        <div className="col-span-2">
          {!selected ? (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-gray-500 text-sm">Select an artist or contact to view their profile</p>
                <p className="text-gray-600 text-xs mt-2">
                  Search or filter to find someone specific.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* ── Profile header ─────────────────────────────────────── */}
              <Card>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-2xl font-black text-black shrink-0">
                    {selected.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-white">{selected.name}</h2>
                      <Badge color={tierColor(selected.tier) as never}>{selected.tier}</Badge>
                      <Badge color="gray">
                        {roleEmoji(selected.role)} {roleLabel(selected.role)}
                      </Badge>
                    </div>
                    {selected.realName && (
                      <p className="text-gray-400 text-sm mt-0.5">Real name: {selected.realName}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Age {selected.age} · {selected.city ? `${selected.city}, ` : ''}{selected.country}
                      {selected.genre ? ` · ${selected.genre.replace(/_/g, '-')}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black text-yellow-400">{selected.fame}</div>
                    <div className="text-xs text-gray-500">Fame</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 flex-wrap items-center">
                  <Button variant="gold" size="sm" onClick={handleDM}>
                    💬 Send DM
                  </Button>
                  {canRequestFeature ? (
                    <Button variant="secondary" size="sm" onClick={handleRequestFeature}>
                      🤝 Request a feature
                    </Button>
                  ) : (
                    <span className="self-center text-xs text-gray-600">
                      {selected.role === 'manager'
                        ? 'Managers do not cut verses — talk to their artist.'
                        : 'Only artists cut features.'}
                    </span>
                  )}
                  {managesPlayer && (
                    <Button variant="secondary" size="sm" onClick={() => setScreen('team')}>
                      💼 Manages you — open Team
                    </Button>
                  )}
                </div>
              </Card>

              {/* ── About ──────────────────────────────────────────────── */}
              <Card>
                <h3 className="font-bold text-white text-sm mb-3">📖 About</h3>
                {selected.bio ? (
                  <p className="text-sm text-gray-400 leading-relaxed">{selected.bio}</p>
                ) : (
                  <p className="text-sm text-gray-600 italic">
                    No write-up on file. Nobody has put this one in a magazine yet.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                    <div className="text-gray-500">Based in</div>
                    <div className="text-white font-medium">
                      {selected.city ? `${selected.city}, ` : ''}{selected.country}
                    </div>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                    <div className="text-gray-500">Sound</div>
                    <div className="text-white font-medium">
                      {selected.genre ? selected.genre.replace(/_/g, '-') : '—'}
                    </div>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                    <div className="text-gray-500">Status</div>
                    <div className="text-white font-medium">
                      {selected.isAvailable ? '🟢 Reachable' : '🔴 Unreachable'}
                    </div>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                    <div className="text-gray-500">Working relationship</div>
                    <div className="text-white font-medium capitalize">{selected.relationshipStage}</div>
                  </div>
                </div>
              </Card>

              {/* ── Characteristics ────────────────────────────────────── */}
              {/* What they are like, as opposed to what they are called. The
                  visible ones are what they lead with and what they say when
                  they pitch. The hidden ones are only shown once you have
                  earned enough of their trust to have seen them. */}
              <Card>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-white text-sm">🧬 Characteristics</h3>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider pt-1">
                    {traits.visible.length} visible
                  </span>
                </div>

                {traits.visible.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    Nothing stands out about {selected.name} yet. What you see is
                    what they are — a pair of hands, no angle.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {traits.visible.map((t) => {
                      const spec2 = VISIBLE_TRAITS[t];
                      return (
                        <div key={t} className="bg-gray-800/60 rounded-xl px-3 py-2">
                          <div className="text-xs font-bold text-white">
                            {spec2.emoji} {spec2.label}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                            {spec2.blurb}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* The part you have to earn. */}
                <div className="mt-3 pt-3 border-t border-gray-700/60">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                    What you have learned about them
                  </div>
                  {selected.relationshipScore >= REVEAL_HIDDEN_AT ? (
                    <div className="space-y-2">
                      {traits.hidden.map((t) => {
                        const h = HIDDEN_TRAITS[t];
                        return (
                          <div key={t} className="bg-gray-800/40 rounded-xl px-3 py-2">
                            <div className="text-xs font-semibold text-gray-200">{h.label}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                              {h.tell}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic leading-relaxed">
                      You do not know {selected.name} well enough yet to see how they
                      really work. Get the relationship to {REVEAL_HIDDEN_AT} and it
                      will show.
                    </p>
                  )}
                </div>
              </Card>

              {/* ── CV ─────────────────────────────────────────────────── */}
              {/* What they had done before you met them. Hiring is a judgement
                  about a person, and a stat block is not a person. */}
              {cv && (
                <Card>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-white text-sm">📄 CV</h3>
                    <div className="text-right">
                      <div className="text-lg font-black text-yellow-400 leading-none">{cv.skill}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Skill</div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-3">{cv.headline}</p>

                  <div className="space-y-2 mb-3">
                    {cv.credits.map((c, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="text-gray-600 num shrink-0 w-10">{c.year}</span>
                        <span className="text-gray-300 leading-relaxed">{c.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {cv.strengths.map((s) => (
                      <Badge key={s} color="purple">{s}</Badge>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 italic leading-relaxed">{cv.verdict}</p>

                  {selected.role === 'manager' && (
                    <div className="mt-3 bg-gray-800/60 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Manager network</span>
                        <span className="text-white font-bold num">{managerNetwork(selected)}/100</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{managerEffectLine(selected)}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* ── Hiring ─────────────────────────────────────────────── */}
              {spec?.hireable && hireState && (
                <Card>
                  <h3 className="font-bold text-white text-sm mb-1">
                    {spec.emoji} Put them on the payroll
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">{spec.job}</p>

                  <div className="bg-gray-800/60 rounded-xl px-3 py-2.5 mb-3">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                      What they do for you
                    </div>
                    <div className="text-white text-xs leading-relaxed">{spec.effect}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                    <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                      <div className="text-gray-500">Monthly</div>
                      <div className="text-white font-medium num">${hireState.wage.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                      <div className="text-gray-500">Up front</div>
                      <div className="text-white font-medium num">${hireState.upfront.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                      <div className="text-gray-500">Their skill</div>
                      <div className="text-white font-medium num">{cv?.skill ?? 0}/100</div>
                    </div>
                  </div>

                  {hireFlash && (
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2.5 mb-3 text-xs leading-relaxed border',
                        hireFlash.ok
                          ? 'bg-green-500/10 border-green-500/30 text-green-200'
                          : 'bg-red-500/10 border-red-500/30 text-red-200',
                      )}
                    >
                      {hireFlash.message}
                    </div>
                  )}

                  {crewMember ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge color="green">On your payroll</Badge>
                      <span className="text-xs text-gray-500">
                        ${crewMember.monthlyWage.toLocaleString()}/mo · since {crewMember.hiredAt}
                      </span>
                      {confirmRelease ? (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setHireFlash(fireCrew(crewMember.id));
                              setConfirmRelease(false);
                            }}
                          >
                            Confirm — one month's severance
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setConfirmRelease(false)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => setConfirmRelease(true)}>
                          Let them go
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button
                        variant="gold"
                        size="sm"
                        disabled={!hireState.check.ok}
                        onClick={() => setHireFlash(hireCrew(selected.id))}
                      >
                        🤝 Hire · ${hireState.upfront.toLocaleString()} up front
                      </Button>
                      {!hireState.check.ok && (
                        <span className="text-xs text-gray-500 leading-snug max-w-md">
                          {hireState.check.message}
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* ── Team ───────────────────────────────────────────────── */}
              <Card>
                <h3 className="font-bold text-white text-sm mb-3">
                  {represents.length > 0 ? '🏢 Roster' : '🏢 Their Team'}
                </h3>

                {!hasTeam ? (
                  <div className="bg-gray-800/50 rounded-xl px-4 py-4 text-center">
                    <p className="text-gray-400 text-sm">No representation on record.</p>
                    <p className="text-gray-600 text-xs mt-1">
                      They move independent — which means you can actually get to them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Who they handle. This is the block a manager's page was
                        missing: a manager is defined by their clients. */}
                    {represents.length > 0 && (
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                          {represents.length === 1
                            ? 'Represents 1 artist'
                            : `Represents ${represents.length} artists`}
                        </div>
                        <div className="space-y-1.5">
                          {represents.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => openNPC(r.id)}
                              className="w-full text-left bg-gray-800/60 hover:bg-gray-800 rounded-xl px-3 py-2 transition-all"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-white text-sm font-medium truncate">
                                    🎤 {r.name}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    Fame {r.fame} · {r.country}
                                    {r.genre ? ` · ${r.genre.replace(/_/g, '-')}` : ''}
                                  </div>
                                </div>
                                <span className="text-xs text-yellow-500 shrink-0">View →</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {teamManager && (
                      <button
                        onClick={() => openNPC(teamManager.id)}
                        className="w-full text-left bg-gray-800/60 hover:bg-gray-800 rounded-xl px-3 py-2.5 transition-all"
                      >
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                          Management
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium truncate">
                              💼 {teamManager.name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Fame {teamManager.fame} · {teamManager.country}
                            </div>
                          </div>
                          <span className="text-xs text-yellow-500 shrink-0">View →</span>
                        </div>
                      </button>
                    )}

                    {!teamManager && selected.team?.managerName && (
                      <div className="bg-gray-800/60 rounded-xl px-3 py-2.5">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                          Management
                        </div>
                        <div className="text-white text-sm font-medium">
                          💼 {selected.team.managerName}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {selected.team?.label && (
                        <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                          <div className="text-gray-500">Label</div>
                          <div className="text-white font-medium">{selected.team.label}</div>
                        </div>
                      )}
                      {selected.team?.crew && (
                        <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                          <div className="text-gray-500">Crew</div>
                          <div className="text-white font-medium">{selected.team.crew}</div>
                        </div>
                      )}
                      {selected.team?.producer && (
                        <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                          <div className="text-gray-500">Main producer</div>
                          <div className="text-white font-medium">{selected.team.producer}</div>
                        </div>
                      )}
                    </div>

                    {!!selected.team?.extras?.length && (
                      <div className="bg-gray-800/40 rounded-xl px-3 py-2 text-xs">
                        <div className="text-gray-500 mb-1">Also on the payroll</div>
                        <div className="flex flex-wrap gap-1">
                          {selected.team.extras.map((x) => (
                            <Badge key={x} color="gray">{x}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-600">
                      {represents.length > 0
                        ? 'Every request for one of these artists crosses this desk first.'
                        : 'Everything goes through the team first. A strong manager is the difference between a request being read and a request being ignored.'}
                    </p>
                  </div>
                )}
              </Card>

              {/* ── Relationship ───────────────────────────────────────── */}
              <Card>
                <h3 className="font-bold text-white text-sm mb-3">💫 Your Relationship</h3>
                {(() => {
                  const rel = getRelLabel(selected.relationshipScore);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge color={rel.color as never}>
                          {rel.emoji} {rel.label}
                        </Badge>
                        <span className="text-white font-bold text-sm">
                          {selected.relationshipScore > 0 ? '+' : ''}
                          {selected.relationshipScore}/100
                        </span>
                      </div>
                      <div className="bg-gray-800 rounded-full h-3 mb-3">
                        <div
                          className={cn(
                            'h-3 rounded-full transition-all',
                            selected.relationshipScore >= 20
                              ? 'bg-green-500'
                              : selected.relationshipScore >= -20
                                ? 'bg-gray-500'
                                : 'bg-red-500',
                          )}
                          style={{ width: `${Math.max(5, (selected.relationshipScore + 100) / 2)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Stage: <span className="text-white capitalize">{selected.relationshipStage}</span>
                        {' · '}
                        {selected.isAvailable ? '🟢 Available' : '🔴 Not Available'}
                      </p>

                      {selected.memoryLog.length > 0 && (
                        <div className="bg-gray-900 rounded-xl p-3 mb-3">
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">
                            Interaction History
                          </p>
                          {selected.memoryLog.slice(-5).map((entry, i) => (
                            <p key={i} className="text-xs text-gray-500 leading-relaxed">
                              {entry}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {selected.personality.map((trait) => (
                          <Badge key={trait} color="purple">
                            {trait.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>

                      {/*
                        One real gesture, with a cost and a cooldown.

                        There used to be a free "+5" button here that only
                        appeared once the relationship had gone negative — a
                        slider, not a decision, and one the player could not use
                        to build anything. This is the deliberate version: it
                        costs an evening, it is worth less the closer you already
                        are, who they are changes what it buys, and occasionally
                        it simply does not land.
                      */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={onReachCooldown}
                          onClick={() => setReachFlash(reachOutToNpc(selected.id))}
                        >
                          🤝 Spend an evening together
                        </Button>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          {onReachCooldown
                            ? `You were with them ${daysSinceReach === 0 ? 'today' : `${daysSinceReach} day${daysSinceReach === 1 ? '' : 's'} ago`}. Give it ${REACH_OUT_COOLDOWN_DAYS - (daysSinceReach ?? 0)} more day${REACH_OUT_COOLDOWN_DAYS - (daysSinceReach ?? 0) === 1 ? '' : 's'}.`
                            : `Costs ${ENERGY_COSTS.reachOut} energy and an evening. One a week — a relationship is not a button.`}
                        </p>
                        {reachFlash && (
                          <p
                            className={cn(
                              'text-[11px] leading-relaxed',
                              reachFlash.ok ? 'text-green-400' : 'text-orange-300',
                            )}
                          >
                            {reachFlash.message}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-600">
                          What it is worth depends on them, and on how far above you they are.
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          {([
                            ['flowers', '💐 Flowers', 150],
                            ['bottle', '🍾 Bottle', 800],
                            ['chain', '⛓️ Chain', 6000],
                          ] as const).map(([tier, label, cost]) => (
                            <button
                              key={tier}
                              onClick={() => setReachFlash(sendGift(selected.id, tier))}
                              className="rounded-lg border border-line bg-card px-2 py-1.5 text-[11px] text-ink2 hover:text-ink hover:bg-cardhover"
                            >
                              <div className="font-semibold">{label}</div>
                              <div className="text-[10px] text-ink3">${cost.toLocaleString()}</div>
                            </button>
                          ))}
                        </div>
                        <details className="mt-1 rounded-lg border border-line bg-black/20 px-3 py-2">
                          <summary className="text-[11px] font-semibold text-ink2 cursor-pointer">How a relationship moves</summary>
                          <ul className="mt-2 space-y-1 text-[11px] text-gray-500 leading-relaxed">
                            <li><span className="text-green-400">Up:</span> time together (weekly), gifts, a verse delivered on time, liking, reposting and replying to their posts, tagging them with love, inviting them on your stage, paying fair.</li>
                            <li><span className="text-orange-300">Down:</span> insults in DMs or comments, quote-tweeting them, tagging them in a fight, a late verse, a lowball, beef, dropping them from a bill.</li>
                            <li><span className="text-gray-400">Drift:</span> close friends you never make time for cool off a little every month; grudges soften slowly.</li>
                            <li><span className="text-gray-400">Limits:</span> social touches count three times a day per person, and a second gift in a week reads as trying too hard.</li>
                          </ul>
                        </details>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* Fame bar */}
              <Card>
                <h3 className="font-bold text-white text-sm mb-3">📊 Their Stats</h3>
                <div className="space-y-2">
                  <StatBar label="Fame" value={selected.fame} />
                  <StatBar
                    label="Relationship"
                    value={Math.max(0, selected.relationshipScore + 100) / 2}
                    color="green"
                  />
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
