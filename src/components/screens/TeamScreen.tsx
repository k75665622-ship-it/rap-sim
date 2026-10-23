import { MomentCard } from '../moments/MomentCard';
import { takeTeamFocus } from '../teamFocus';
import { ManagerDesk } from '../moments/ManagerDesk';
// ─── TEAM & MANAGEMENT ─────────────────────────────────────────────────────
//
// One page for the people who work for you and the people who work you.
//
// Three things live here and they are deliberately kept apart:
//
//   • MANAGEMENT — a deal, not a wage. One person at a time, exclusive by
//     nature, paid either a percentage of gross or a flat monthly retainer.
//     Firing them is a real button with a real cost.
//   • THE PAYROLL — the engineer, the publicist, the lawyer, the tour manager.
//     Each one has a named job and a monthly number, and both are shown next
//     to each other so the fee can be judged against what it buys.
//   • YOUR CV — what you have actually done. Everything on it is read back off
//     saved state; nothing here is invented for the page.
//
// The hiring list is deliberately short and sorted by who actually knows you.
// Nobody hands their career to a stranger who found them in a list.

import { useMemo, useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { assignmentsFor, currentAssignment } from '../../sim/assignments';
import { specialSkillOf } from '../../sim/persona';
import { PageTitle, SectionTitle, Panel, Tile, Button, Tag, Stat, SearchInput, EmptyState } from '../ui/kit';
import { cn } from '@/utils/cn';
import { money, moneyCompact, compact } from '@/utils/format';
import type { CrewMember, NPC, NPCRole } from '../../types/game';
import {
  DEPARTMENT_LABEL,
  HIREABLE_ROLES,
  TEAM_SEATS,
  chemistryOf,
  crewBonuses,
  crewWage,
  hireCheck,
  hireUpfrontCost,
  managerEffectLine,
  managerJobLine,
  managerLoyalty,
  managerNetwork,
  moraleFactor,
  npcCV,
  npcCeiling,
  roleSpec,
  severanceFor,
  stillGrowing,
  traitsFor,
  type TeamActionResult,
  type TeamDepartment,
} from '../../sim/roles';
import { VISIBLE_TRAITS } from '../../sim/traits';

/** How many people the hiring list will show at once. */
const SHORTLIST = 24;

export function TeamScreen() {
  const player = useGameStore((s) => s.player);
  const npcs = useGameStore((s) => s.npcs);
  const crew = useGameStore((s) => s.crew);
  const contracts = useGameStore((s) => s.contracts);
  const songs = useGameStore((s) => s.songs);
  const awards = useGameStore((s) => s.awards);
  const globalSongs = useGameStore((s) => s.globalSongs);
  const chartRuns = useGameStore((s) => s.chartRuns);
  const globalCerts = useGameStore((s) => s.globalCerts);
  const gameDate = useGameStore((s) => s.gameDate);
  const hireCrew = useGameStore((s) => s.hireCrew);
  const fireCrew = useGameStore((s) => s.fireCrew);
  const fireManager = useGameStore((s) => s.fireManager);
  const selectNPC = useGameStore((s) => s.selectNPC);
  const setScreen = useGameStore((s) => s.setScreen);
  const openSong = useGameStore((s) => s.openSong);
  const moments = useGameStore((s) => s.moments);

  const [roleFilter, setRoleFilter] = useState<NPCRole | 'all'>(() => takeTeamFocus() ?? 'all');
  const [query, setQuery] = useState('');
  const [flash, setFlash] = useState<TeamActionResult | null>(null);
  const [confirmFire, setConfirmFire] = useState<string | null>(null);
  const [confirmManager, setConfirmManager] = useState(false);

  const bonuses = useMemo(() => crewBonuses(crew), [crew]);

  const managerContract = contracts.find((c) => c.type === 'management' && c.active);
  const manager = managerContract ? npcs.find((n) => n.id === managerContract.npcId) : undefined;
  const managerNet = managerNetwork(manager);

  // Pending management offers, so the page can point at the inbox rather than
  // leaving the player wondering why nothing is happening. Selected raw and
  // filtered in a memo — a selector that builds a new array every call makes
  // zustand re-render forever.
  const mailbox = useGameStore((s) => s.mailbox);
  const pendingOffers = useMemo(
    () => mailbox.filter((m) => !m.read && (m.type === 'offer' || m.type === 'contract') && m.offerData),
    [mailbox],
  );

  /**
   * Who is worth showing.
   *
   * Only roles that can actually be hired, only people who will talk to you,
   * and the player's own country first — a publicist in Lagos is not going to
   * run your Accra press. Sorted by relationship because that is what decides
   * whether the hire lands at all.
   */
  const shortlist = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hiredIds = new Set(crew.map((c) => c.npcId));
    const money = player?.career.money ?? 0;

    const pool = npcs.filter((n) => {
      if (!roleSpec(n.role).hireable) return false;
      if (hiredIds.has(n.id)) return false;
      if (roleFilter !== 'all' && n.role !== roleFilter) return false;
      if (q && !n.name.toLowerCase().includes(q)) return false;
      return true;
    });

    // People you can actually hire right now come first, then the ones who
    // know you, then your own city's scene. A list of twenty-four people who
    // will all say no is not a hiring screen, it is a wall.
    pool.sort((a, b) => {
      const canA = hireCheck(a, crew, money).ok ? 1 : 0;
      const canB = hireCheck(b, crew, money).ok ? 1 : 0;
      if (canA !== canB) return canB - canA;

      const homeA = a.country === player?.country ? 1 : 0;
      const homeB = b.country === player?.country ? 1 : 0;
      if (homeA !== homeB) return homeB - homeA;

      if (b.relationshipScore !== a.relationshipScore) return b.relationshipScore - a.relationshipScore;
      return b.fame - a.fame;
    });

    return pool.slice(0, SHORTLIST);
  }, [npcs, crew, roleFilter, query, player?.country, player?.career.money]);

  /** What the player has actually done. Every line is read off saved state. */
  const cv = useMemo(() => {
    if (!player) return [];
    const rows: Array<{ label: string; value: string; note?: string }> = [];

    // Player records carry no `ownerId` — that is the whole distinction
    // between the player's catalogue and the 11,000 records around them.
    const released = songs.filter((s) => !s.ownerId && isSongReleased(s));
    const peak = globalSongs?.find((r) => r.isPlayer);
    const bestRun = Object.entries(chartRuns ?? {})
      .filter(([k]) => k.startsWith('songs|'))
      .map(([, run]) => (run.positions.length ? Math.min(...run.positions.filter((p) => p > 0)) : 0))
      .filter((p) => p > 0);

    rows.push({
      label: 'Records released',
      value: `${released.length}`,
      note: released.length === 0 ? 'Nothing out yet.' : `${compact(player.career.totalStreams)} lifetime streams.`,
    });

    rows.push({
      label: 'Best global chart peak',
      value: bestRun.length ? `#${Math.min(...bestRun)}` : peak ? `#${peak.peak}` : '—',
      note: bestRun.length || peak ? 'BillBoard Global Top 100.' : 'Never charted globally.',
    });

    const won = awards.filter((a) => a.winner === player.id);
    rows.push({
      label: 'Awards won',
      value: `${won.length}`,
      note: won.length ? won.slice(0, 2).map((a) => a.name).join(' · ') : 'None yet.',
    });

    rows.push({
      label: 'Certifications',
      value: `${(globalCerts ?? []).filter((c) => c.artistId === player.id).length}`,
      note: 'Global certifications earned.',
    });

    rows.push({
      label: 'Career earnings',
      value: moneyCompact(player.career.totalEarnings),
      note: `Local fame ${Math.round(player.career.localFame)} · national ${Math.round(player.career.nationalFame)} · international ${Math.round(player.career.internationalFame)}.`,
    });

    return rows;
  }, [player, songs, awards, globalSongs, chartRuns, globalCerts]);

  function report(r: TeamActionResult) {
    setFlash(r);
  }

  if (!player) return null;

  const rosterByRole = HIREABLE_ROLES.filter((r) => crew.some((c) => c.role === r));

  // The org chart, read off the payroll. Twelve seats, grouped by what part of
  // the operation they run, with the one that is empty shown as empty — an
  // uncovered part of your career should be visible as a gap, not as an
  // absence you have to notice for yourself.
  const seatRows = (['representation', 'creative', 'image', 'life'] as TeamDepartment[]).map((dept) => ({
    dept,
    seats: TEAM_SEATS.filter((s) => s.department === dept).map((s) => {
      const filled = s.role === 'manager'
        ? (manager ? [{ name: manager.name, mechanic: 'Loyalty', line: managerEffectLine(manager) }] : [])
        : crew
            .filter((c) => c.role === s.role)
            .map((c) => ({
              name: c.npcName,
              mechanic: roleSpec(s.role).mechanic ?? '',
              line: bonuses.mechanics.find((m) => m.role === s.role)?.line ?? roleSpec(s.role).effect,
            }));
      return { spec: roleSpec(s.role), filled };
    }),
  }));

  const seatsFilled = seatRows.reduce((a, r) => a + r.seats.filter((s) => s.filled.length > 0).length, 0);

  const teamMoments = (moments ?? []).filter((m) => m.channel === 'team');
  const openTeam = teamMoments.filter((m) => m.status === 'open');
  const pastTeam = teamMoments.filter((m) => m.status !== 'open' && m.status !== 'scheduled').slice(0, 4);

  return (
    <div className="space-y-6">
      <PageTitle
        subtitle={
          crew.length === 0
            ? `Nobody works for you yet. ${TEAM_SEATS.length} seats, all of them empty.`
            : `${crew.length} on the payroll · ${seatsFilled} of ${TEAM_SEATS.length} team seats filled · ${money(bonuses.monthlyWage)} a month`
        }
        action={
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-ink3">Monthly cost</div>
            <div className="text-[17px] font-semibold text-ink num">
              {money(bonuses.monthlyWage + (managerContract?.terms.feeKind === 'retainer' ? managerContract.terms.monthlyFee ?? 0 : 0))}
            </div>
            <div className="text-[11px] text-ink3 num">Cash {money(player.career.money)}</div>
          </div>
        }
      >
        Team &amp; Management
      </PageTitle>

      <ManagerDesk />

      {(openTeam.length > 0 || pastTeam.length > 0) && (
        <div className="space-y-2">
          <div className="text-[13px] font-semibold text-ink">{openTeam.length ? `🗣️ Your team needs a decision (${openTeam.length})` : '🗣️ Recent team calls'}</div>
          <div className="grid md:grid-cols-2 gap-3">
            {[...openTeam, ...pastTeam].slice(0, 6).map((m) => <MomentCard key={m.id} moment={m} />)}
          </div>
        </div>
      )}

      {flash ? (
        <div
          className={cn(
            'rounded-[10px] border px-4 py-3 text-[13px] flex items-start justify-between gap-3',
            flash.ok ? 'border-rise/40 bg-rise/10 text-ink' : 'border-fall/40 bg-fall/10 text-ink',
          )}
        >
          <span>{flash.message}</span>
          <button onClick={() => setFlash(null)} className="text-ink3 hover:text-ink text-[12px] shrink-0">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* ── MANAGEMENT ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          action={
            pendingOffers.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setScreen('mailbox')}>
                {pendingOffers.length} offer{pendingOffers.length === 1 ? '' : 's'} waiting →
              </Button>
            ) : null
          }
        >
          Management
        </SectionTitle>

        {managerContract && manager ? (
          <Panel className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <button
                  onClick={() => {
                    selectNPC(manager.id);
                    setScreen('npc_profile');
                  }}
                  className="text-[17px] font-semibold text-ink hover:text-amber transition-colors truncate"
                >
                  💼 {manager.name}
                </button>
                <div className="text-[12px] text-ink3 mt-0.5">
                  {roleSpec('manager').title} · {manager.country} · signed {managerContract.signedAt}
                </div>
              </div>
              <Tag tone="up">Signed</Tag>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <Stat
                label="Structure"
                value={managerContract.terms.feeKind === 'retainer' ? 'Retainer' : 'Commission'}
                sub={
                  managerContract.terms.feeKind === 'retainer'
                    ? `${money(managerContract.terms.monthlyFee ?? 0)} / month`
                    : `${managerContract.terms.percentage}% of gross`
                }
              />

              <Stat
                label="Network"
                value={`${managerNet}/100`}
                sub={`Loyalty ${Math.round(managerLoyalty(manager) * 100)}% — ${managerLoyalty(manager) >= 0.7 ? 'working for you' : managerLoyalty(manager) >= 0.45 ? 'going through the motions' : 'one foot out the door'}`}
              />
              <Stat label="Term" value={`${managerContract.terms.lengthYears ?? 2} years`} sub={`From ${managerContract.signedAt}`} />
              <Stat
                label="Their cut, this week"
                value={
                  managerContract.terms.feeKind === 'retainer'
                    ? '—'
                    : `${managerContract.terms.percentage}%`
                }
                sub={
                  managerContract.terms.feeKind === 'retainer'
                    ? 'Flat fee — nothing off your income'
                    : 'Off everything, before your lawyer'
                }
              />
            </div>

            <p className="text-[12px] text-ink2 mt-4 leading-relaxed">
              {managerEffectLine(manager)}{' '}
              {managerContract.terms.feeKind === 'commission'
                ? 'Because they are on a percentage, a bad week costs you nothing — but a hit costs you a slice of the hit.'
                : 'Because they are on a retainer, they get paid whether you eat or not — but every record you sell stays yours.'}
            </p>
            {/* What the money actually buys, every month, with the odds the
                tick uses. A manager is a service; the panel says what the
                service is rather than leaving the player to infer it. */}
            <p className="text-[12px] text-ink3 mt-2 leading-relaxed">
              {managerJobLine(manager)}
            </p>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {confirmManager ? (
                <>
                  <span className="text-[12px] text-fall">
                    Ending it costs goodwill and possibly a buy-out. Sure?
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      report(fireManager());
                      setConfirmManager(false);
                    }}
                  >
                    Yes, let them go
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmManager(false)}>
                    Keep them
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmManager(true)}>
                    📤 Fire manager
                  </Button>
                  <span className="text-[11px] text-ink3">
                    Only one manager at a time. A rival offer means firing them first.
                  </span>
                </>
              )}
            </div>
          </Panel>
        ) : (
          <Panel className="p-4">
            <EmptyState
              icon={<span className="text-[26px]">🪪</span>}
              title="You represent yourself"
              body="No manager, no cut, no network. Every door is one you have to knock on yourself — which is free, and slower."
              action={
                pendingOffers.length > 0 ? (
                  <Button size="sm" onClick={() => setScreen('mailbox')}>
                    Read the offers waiting →
                  </Button>
                ) : (
                  <span className="text-[12px] text-ink3">
                    Managers start calling once you have a signal worth managing.
                  </span>
                )
              }
            />
          </Panel>
        )}
      </section>

      {/* ── THE TEAM ───────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          action={
            <span className="text-[12px] text-ink3">
              {seatsFilled} of {TEAM_SEATS.length} seats filled
            </span>
          }
        >
          Your team
        </SectionTitle>
        <p className="text-[12px] text-ink3 mb-3 -mt-1">
          Twelve seats, and nobody else in the scene sits in them. A producer&apos;s in-house
          engineer works for the producer — yours works for you. Every seat listed here has one
          named thing it is bought for; a seat you have not filled is a part of the career nobody
          is running.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {seatRows.map(({ dept, seats }) => (
            <Panel key={dept} className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
                {DEPARTMENT_LABEL[dept]}
              </div>
              <div className="space-y-2.5">
                {seats.map(({ spec, filled }) => (
                  <div key={spec.role} className="flex items-start gap-2.5">
                    <span className="text-[15px] leading-6 shrink-0">{spec.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-ink">{spec.title}</span>
                        {filled.length > 0 ? (
                          <Tag tone="up">{filled.map((f) => f.name).join(', ')}</Tag>
                        ) : (
                          <Tag tone="muted">Empty</Tag>
                        )}
                        {spec.mechanic ? (
                          <span className="text-[10px] uppercase tracking-wider text-amber">
                            {spec.mechanic}
                          </span>
                        ) : null}
                      </div>
                      {/* When the seat is filled this is the LIVE line, with the
                          seat's own number in it — not the brochure copy. */}
                      <div className="text-[11px] text-ink3 mt-0.5 leading-snug">
                        {filled.length > 0 ? filled[0].line : spec.effect}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* ── THE PAYROLL ────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>The payroll</SectionTitle>

        {crew.length === 0 ? (
          <Panel className="p-4">
            <EmptyState
              icon={<span className="text-[26px]">👥</span>}
              title="Nobody on the payroll"
              body="Every job you do, you do alone. Hiring below puts a named person on a named job — an engineer who cleans your takes, a publicist who slows the forgetting, a lawyer who reads page three."
            />
          </Panel>
        ) : (
          <div className="space-y-3">
            <Panel className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Monthly wages" value={money(bonuses.monthlyWage)} sub="Charged every game month" />
                <Stat label="Booth bonus" value={`+${bonuses.productionBonus.toFixed(1)}`} sub="Production, every session" />
                <Stat label="Show takings" value={`×${bonuses.showMult.toFixed(2)}`} sub="Tour manager & promoter" />
                <Stat label="Fame bleed" value={`×${bonuses.fameDecayMult.toFixed(2)}`} sub="Below 1.00 is slower" />
              </div>
              {/* The named mechanics, each one showing the number it is worth
                  right now. These are read off the same fold the tick pays on,
                  so the panel cannot promise something the tick does not do. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-line">
                <Stat
                  label="Session time"
                  value={`×${bonuses.sessionSpeed.toFixed(2)}`}
                  sub={bonuses.sessionSpeed < 1 ? 'Shorter than booking cold' : 'No engineer'}
                />
                <Stat
                  label="Admin energy"
                  value={`×${bonuses.adminEnergy.toFixed(2)}`}
                  sub={
                    bonuses.maxEnergyBonus > 0
                      ? `Ceiling ${Math.round(100 + bonuses.maxEnergyBonus)} · nap ×${bonuses.energyRecovery.toFixed(2)}`
                      : bonuses.adminEnergy < 1
                        ? `Nap ×${bonuses.energyRecovery.toFixed(2)}`
                        : 'No assistant'
                  }
                />
                <Stat
                  label="Recovered"
                  value={bonuses.recoveryRate > 0 ? `${(bonuses.recoveryRate * 100).toFixed(1)}%` : '—'}
                  sub="Of income, back from being lost"
                />
                <Stat
                  label="Tax sheltered"
                  value={bonuses.deductionRate > 0 ? `${(bonuses.deductionRate * 100).toFixed(1)}%` : '—'}
                  sub={bonuses.brandRate > 0 ? `Brand work ${(bonuses.brandRate * 100).toFixed(1)}%` : 'No accountant'}
                />
              </div>
              {bonuses.mechanics.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-line space-y-1.5">
                  {bonuses.mechanics.map((m) => (
                    <div key={`${m.role}-${m.npcName}`} className="text-[11px] text-ink2 leading-snug">
                      <span className="text-amber uppercase tracking-wider text-[10px] mr-1.5">
                        {m.mechanic}
                      </span>
                      {m.line}
                    </div>
                  ))}
                </div>
              ) : null}
              {bonuses.stats && Object.keys(bonuses.stats).length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {Object.entries(bonuses.stats).map(([stat, perWeek]) => (
                    <Tag key={stat} tone="up">
                      {stat} +{(perWeek ?? 0).toFixed(1)}/wk
                    </Tag>
                  ))}
                </div>
              ) : null}
            </Panel>

            {rosterByRole.map((role) => {
              const spec = roleSpec(role);
              const people = crew.filter((c) => c.role === role);
              return (
                <Panel key={role} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-semibold text-ink">
                      {spec.emoji} {spec.title}
                      {people.length > 1 ? ` ×${people.length}` : ''}
                    </div>
                    <span className="text-[11px] text-ink3">{spec.effect}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {people.map((m) => (
                      <CrewRow
                        key={m.id}
                        member={m}
                        // The ceiling is derived from the person, so it needs
                        // the roster record — the crew row only stores their id.
                        npc={npcs.find((n) => n.id === m.npcId) ?? null}
                        confirming={confirmFire === m.id}
                        onConfirm={() => setConfirmFire(m.id)}
                        onCancel={() => setConfirmFire(null)}
                        onFire={() => {
                          report(fireCrew(m.id));
                          setConfirmFire(null);
                        }}
                        onOpen={() => {
                          selectNPC(m.npcId);
                          setScreen('npc_profile');
                        }}
                      />
                    ))}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      {/* ── HIRING ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Hire</SectionTitle>
        <Panel className="p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by name…" className="flex-1 min-w-[200px]" />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setRoleFilter('all')}
                className={cn(
                  'px-3 h-10 rounded-[10px] border text-[12px] font-semibold transition',
                  roleFilter === 'all' ? 'bg-amber/15 border-amber text-amber' : 'bg-card border-line text-ink2 hover:text-ink',
                )}
              >
                All roles
              </button>
              {HIREABLE_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    'px-3 h-10 rounded-[10px] border text-[12px] font-semibold transition',
                    roleFilter === r ? 'bg-amber/15 border-amber text-amber' : 'bg-card border-line text-ink2 hover:text-ink',
                  )}
                >
                  {roleSpec(r).emoji} {roleSpec(r).title}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-ink3 mb-3">
            Sorted by who actually knows you — a stranger will not hand you their career, and a
            relationship is what decides whether the hire lands. Two months up front, then a wage.
          </p>

          {shortlist.length === 0 ? (
            <EmptyState
              title="Nobody matches"
              body="Try another role, or clear the search. If the list is empty across every role, nobody in your world is in the business of being hired."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {shortlist.map((npc) => {
                const spec = roleSpec(npc.role);
                const check = hireCheck(npc, crew, player.career.money);
                const wage = crewWage(npc, npc.role);
                const upfront = hireUpfrontCost(npc, npc.role);
                const c = npcCV(npc, gameDate.year);
                return (
                  <Tile key={npc.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          onClick={() => {
                            selectNPC(npc.id);
                            setScreen('npc_profile');
                          }}
                          className="text-[13px] font-semibold text-ink hover:text-amber transition-colors truncate text-left"
                        >
                          {spec.emoji} {npc.name}
                        </button>
                        <div className="text-[11px] text-ink3 mt-0.5">
                          {spec.title} · {npc.city ? `${npc.city}, ` : ''}{npc.country}
                        </div>
                        {/* The seat's named mechanic, and what this person's
                            tier buys inside it. The tier is the reason two
                            accountants at the same wage are not the same
                            hire, so it is stated rather than implied. */}
                        {spec.mechanic ? (
                          <div className="text-[10px] uppercase tracking-wider text-amber mt-1 leading-snug">
                            {spec.mechanic}
                            {spec.tiers
                              ? ` · ${spec.tiers[npc.tier === 'international' ? 2 : npc.tier === 'national' ? 1 : 0]}`
                              : ''}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-semibold text-ink num">{money(wage)}</div>
                        <div className="text-[10px] text-ink3">per month</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Tag tone={c.skill >= 62 ? 'up' : c.skill >= 42 ? 'muted' : 'down'}>
                        Skill {c.skill}
                      </Tag>
                      <Tag tone={npc.relationshipScore >= spec.minRelationship ? 'muted' : 'down'}>
                        Knows you {npc.relationshipScore}
                      </Tag>
                      <Tag tone="muted">{upfront > player.career.money ? `${money(upfront)} up front` : `${money(upfront)} up front`}</Tag>
                    </div>

                    {/* Their characteristics, and what they are worth long term.
                        Two people with the same skill and the same wage are not
                        the same hire — one has room to become somebody. */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {traitsFor(npc).visible.map((t) => (
                        <Tag key={t} tone="muted">{VISIBLE_TRAITS[t]?.label ?? t}</Tag>
                      ))}
                      <Tag tone={stillGrowing(npc) ? 'up' : 'muted'}>
                        {stillGrowing(npc)
                          ? `Room to grow → ${npcCeiling(npc)}`
                          : `Topped out at ${npcCeiling(npc)}`}
                      </Tag>
                    </div>

                    <p className="text-[11px] text-ink2 mt-2 leading-relaxed">{c.verdict}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={check.ok ? 'primary' : 'secondary'}
                        disabled={!check.ok}
                        onClick={() => report(hireCrew(npc.id))}
                      >
                        {check.ok ? `Hire · ${money(upfront)}` : 'Cannot hire yet'}
                      </Button>
                      {!check.ok ? <span className="text-[11px] text-ink3 leading-snug">{check.message}</span> : null}
                    </div>
                  </Tile>
                );
              })}
            </div>
          )}
        </Panel>
      </section>

      {/* ── YOUR CV ────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Your CV</SectionTitle>
        <Panel className="p-4">
          <div className="text-[13px] text-ink2 mb-3">
            {player.artistName} · {player.city}, {player.country} · age {player.age}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cv.map((row) => (
              <Stat key={row.label} label={row.label} value={row.value} sub={row.note} />
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-line">
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">On record</div>
            <div className="flex flex-wrap gap-1.5">
              {contracts.filter((c) => c.active).length === 0 ? (
                <span className="text-[12px] text-ink3">Unsigned. No label, no manager, no distribution deal.</span>
              ) : (
                contracts
                  .filter((c) => c.active)
                  .map((c) => (
                    <Tag key={c.id} tone="amber">
                      {c.type} · {c.npcName}
                    </Tag>
                  ))
              )}
            </div>
          </div>

          {songs.filter((s) => isSongReleased(s)).length > 0 ? (
            <div className="mt-4 pt-4 border-t border-line">
              <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">Discography</div>
              <div className="flex flex-wrap gap-1.5">
                {songs
                  .filter((s) => isSongReleased(s))
                  .slice(0, 12)
                  .map((s) => (
                    <button key={s.id} onClick={() => openSong(s.id)}>
                      <Tag tone={!s.ownerId ? 'amber' : 'muted'}>
                        {s.title}
                        {s.chartPositions && Object.keys(s.chartPositions).length > 0
                          ? ` · #${Math.min(...Object.values(s.chartPositions))}`
                          : ''}
                      </Tag>
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </section>
    </div>
  );
}

// ─── ONE PERSON ON THE PAYROLL ─────────────────────────────────────────────

function CrewRow({
  member,
  npc,
  confirming,
  onConfirm,
  onCancel,
  onFire,
  onOpen,
}: {
  member: CrewMember;
  /** The roster record, for the ceiling and their characteristics. */
  npc: NPC | null;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onFire: () => void;
  onOpen: () => void;
}) {
  const spec = roleSpec(member.role);
  const ceiling = npc ? npcCeiling(npc) : member.skill;
  const growing = npc ? stillGrowing(npc) : false;
  const visible = member.visible ?? [];
  return (
    <div className="rounded-[10px] border border-line bg-cardhover/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <button onClick={onOpen} className="text-[13px] font-semibold text-ink hover:text-amber transition-colors truncate">
            {member.npcName}
          </button>
          <div className="text-[11px] text-ink3">
            {spec.effect} · skill {member.skill} · since {member.hiredAt}
          </div>
          {/* Tenure and morale, because both are multipliers on the work and
              neither is visible anywhere else. A producer who has been quietly
              sulking for three months should look like one. */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {(member.monthsServed ?? 0) > 0 && spec.mechanic ? (
              <Tag tone="muted">
                {spec.mechanic} {Math.round(chemistryOf(member) * 100)}% · {member.monthsServed}mo
              </Tag>
            ) : null}
            <Tag tone={(member.morale ?? 70) < 40 ? 'down' : 'muted'}>
              Morale {Math.round(member.morale ?? 70)} · ×{moraleFactor(member).toFixed(2)}
            </Tag>
          </div>
          {/* Who they are, and whether they are still becoming somebody. A hire
              who has topped out should look like one on the row that bills you
              for them every month. */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {visible.map((t) => (
              <Tag key={t} tone="muted">{VISIBLE_TRAITS[t]?.label ?? t}</Tag>
            ))}
            <Tag tone={growing ? 'up' : 'muted'}>
              {growing ? `Growing · ceiling ${ceiling}` : `Topped out at ${ceiling}`}
            </Tag>
          </div>
          {(() => { const sp = specialSkillOf(member.npcId, member.role, member.skill); return sp ? (
            <div className="mt-1.5 text-[11px] leading-snug"><span className="text-amber font-semibold">{sp.emoji} {sp.label}</span> <span className="text-ink3">— {sp.blurb}</span></div>
          ) : null; })()}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] font-semibold text-ink num">{money(member.monthlyWage)}/mo</span>
          {confirming ? (
            <>
              <Button size="sm" variant="secondary" onClick={onFire}>
                Confirm — {money(severanceFor(member))}
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={onConfirm}>
              Let go
            </Button>
          )}
        </div>
      </div>
      <JobPicker member={member} />
    </div>
  );
}

// ─── WHAT THEY WORK ON ─────────────────────────────────────────────────────

function JobPicker({ member }: { member: CrewMember }) {
  const assignCrew = useGameStore((s) => s.assignCrew);
  const jobs = assignmentsFor(member.role);
  if (!jobs.length) return null;
  const current = currentAssignment(member.role, member.assignment);
  return (
    <div className="mt-2.5 pt-2.5 border-t border-line/70">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink3 mb-1.5">Working on</div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {jobs.map((j) => {
          const on = current?.id === j.id;
          return (
            <button
              key={j.id}
              onClick={() => !on && assignCrew(member.id, j.id)}
              className={`shrink-0 h-8 px-3 rounded-full border text-[12px] font-semibold transition ${on ? 'border-amber bg-amber/15 text-amber' : 'border-line bg-card text-ink2 hover:text-ink hover:bg-cardhover'}`}
            >
              {j.emoji} {j.label}
            </button>
          );
        })}
      </div>
      {current ? <div className="text-[11px] text-ink2 mt-1.5 leading-snug">{current.blurb}</div> : null}
      {member.lastWork ? <div className="text-[11px] text-ink3 mt-1 leading-snug">Last week: {member.lastWork}</div> : null}
    </div>
  );
}
