// ─── MY LABEL ──────────────────────────────────────────────────────────────
//
// Found a label, scout artists, negotiate, fund records, keep the roster happy
// and live off what the catalogue earns. The engine is `sim/label.ts`; every
// number shown here is read from the store, never recomputed in the page.

import { useMemo, useState, type ReactNode } from 'react';
import { useGameStore, blendedFame } from '../../store/gameStore';
import { Panel, PageTitle, Segmented, Button, Tag, Stat, EmptyState, Artwork, Select } from '../ui/kit';
import type {
  Genre,
  LabelDealType,
  LabelPitch,
  LabelReleaseTier,
  LabelSignee,
  LabelStaffRole,
  LabelTerms,
  NPC,
  PlayerLabel,
  Song,
} from '../../types/game';
import {
  DEAL_INFO,
  DEAL_ORDER,
  FOUNDING_COST,
  FOUNDING_MIN_FAME,
  LABEL_COLORS,
  PROSPECT_REFRESH_DAYS,
  RELEASE_TIERS,
  STAFF_INFO,
  STAFF_ORDER,
  fameCap,
  money,
  moodWord,
  overheadFor,
  potentialEstimate,
  rosterLimit,
  settlementCost,
  signeeLabel,
  staffSkill,
} from '../../sim/label';
import { MOOD_INFO, ARCHETYPE_LABEL, archetypeOf } from '../../sim/offers';
import { GENRE_LIST, genreLabel } from '../../data/genres';
import { dateToSerial, serialToDate, formatMedium } from '../../sim/gameClock';
import { cn } from '@/utils/cn';

type Tab = 'overview' | 'roster' | 'scouting' | 'deals' | 'staff' | 'money';

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function Logo({ label, size = 56 }: { label: Pick<PlayerLabel, 'name' | 'color'>; size?: number }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center font-black text-black select-none"
      style={{ width: size, height: size, borderRadius: size * 0.22, background: label.color, fontSize: size * 0.36, letterSpacing: '-0.04em' }}
      aria-hidden="true"
    >
      {initials(label.name)}
    </div>
  );
}

function Meter({ value, color, label, right }: { value: number; color: string; label: string; right?: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-ink3 mb-1">
        <span>{label}</span>
        <span className="num text-ink2">{right ?? Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} />
      </div>
    </div>
  );
}

function Flash({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div
      className={cn(
        'rounded-[10px] px-3 py-2 text-[12px] border',
        msg.ok ? 'bg-rise/10 border-rise/30 text-rise' : 'bg-fall/10 border-fall/30 text-fall',
      )}
    >
      {msg.text}
    </div>
  );
}

function moodColor(m: number): string {
  if (m >= 60) return '#2ED573';
  if (m >= 40) return '#FFB800';
  return '#FF4757';
}

// ─── FOUNDING ──────────────────────────────────────────────────────────────

function FoundLabel() {
  const { player, businesses, foundLabel, setScreen } = useGameStore();
  const [name, setName] = useState(player ? `${player.artistName} Records` : '');
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const [genre, setGenre] = useState<Genre | 'any'>('any');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!player) return null;
  const fame = blendedFame(player);
  const existing = businesses.find((b) => b.type === 'record_label');
  const canFame = !!existing || fame >= FOUNDING_MIN_FAME;
  const canMoney = !!existing || player.career.money >= FOUNDING_COST;

  return (
    <div className="max-w-3xl">
      <PageTitle subtitle="Sign artists. Fund their records. Own the masters.">Start your own label</PageTitle>
      <div className="grid md:grid-cols-5 gap-4">
        <Panel className="md:col-span-3 p-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Label name</div>
            <input
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-[10px] bg-sidebar border border-line text-ink text-[14px] focus:outline-none focus:border-amber"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Colour</div>
            <div className="flex gap-2 flex-wrap">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Colour ${c}`}
                  onClick={() => setColor(c)}
                  className={cn('w-8 h-8 rounded-[9px] border-2 transition', color === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Sound</div>
            <Select
              value={genre}
              onChange={(v) => setGenre(v as Genre | 'any')}
              options={[{ value: 'any', label: 'Any genre' }, ...GENRE_LIST.map((g) => ({ value: g.id, label: g.label }))]}
            />
            <div className="text-[11px] text-ink3 mt-1.5">Scouts look for this sound first. "Any" keeps it open.</div>
          </div>
          <Flash msg={msg} />
          <Button
            disabled={!canFame || !canMoney || name.trim().length < 2}
            onClick={() => {
              const r = foundLabel({ name, color, genreFocus: genre });
              setMsg({ ok: r.ok, text: r.message });
            }}
            className="w-full"
          >
            {existing ? 'Turn my Record Label business into a real label' : `Found ${name.trim() || 'the label'} · ${money(FOUNDING_COST)}`}
          </Button>
          <button onClick={() => setScreen('investments')} className="text-[12px] text-ink3 hover:text-ink">← Back to Investments</button>
        </Panel>

        <Panel className="md:col-span-2 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Logo label={{ name: name || '?', color }} />
            <div className="min-w-0">
              <div className="text-[16px] font-bold text-ink truncate">{name || 'Your label'}</div>
              <div className="text-[12px] text-ink3">{player.country} · {genre === 'any' ? 'All sounds' : genreLabel(genre)}</div>
            </div>
          </div>
          <ul className="text-[12px] text-ink2 space-y-2 leading-relaxed">
            <li>🏦 The label has <b className="text-ink">its own bank account</b>. You put money in and take dividends out.</li>
            <li>🔍 Scouts bring you unsigned artists. Small labels can only reach small names.</li>
            <li>📝 Negotiate advance, royalty, term and creative control. Every artist wants something different.</li>
            <li>💿 Fund their records. The catalogue earns from real streams for as long as it lives.</li>
            <li>🦈 Keep them happy, or rival labels will take them.</li>
          </ul>
          <div className="border-t border-line pt-3 text-[12px] space-y-1">
            {existing ? (
              <div className="text-rise">You own a Record Label business. It becomes this label for free, with its value as starting cash.</div>
            ) : (
              <>
                <div className={canMoney ? 'text-ink2' : 'text-fall'}>Costs {money(FOUNDING_COST)} (60% becomes the label's first cash) · you have {money(player.career.money)}</div>
                <div className={canFame ? 'text-ink2' : 'text-fall'}>Needs {FOUNDING_MIN_FAME}+ fame · you have {fame.toFixed(0)}</div>
              </>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── OVERVIEW ──────────────────────────────────────────────────────────────

function Overview({ label, go }: { label: PlayerLabel; go: (t: Tab) => void }) {
  const { npcSongs, openSong, gameDate, player } = useGameStore();
  const today = dateToSerial(gameDate);
  const alerts: { text: string; tone: 'amber' | 'down' | 'up'; tab: Tab }[] = [];
  for (const s of label.roster) {
    if (s.requestSerial !== undefined && !s.inStudio) alerts.push({ text: `${s.name} has new music and wants a release.`, tone: 'amber', tab: 'roster' });
    if (s.demand) alerts.push({ text: `${s.name} wants to renegotiate.`, tone: 'amber', tab: 'roster' });
    if (s.rivalOffer) alerts.push({ text: `${s.rivalOffer.labelName} is trying to take ${s.name}.`, tone: 'down', tab: 'roster' });
    if (s.status === 'dispute') alerts.push({ text: `${s.name} is in dispute and refusing to record.`, tone: 'down', tab: 'roster' });
  }
  for (const p of label.pitches) if (p.status === 'open') alerts.push({ text: `${p.renewal ? 'Renewal' : 'Talks'} with ${p.name} — ${Math.max(0, p.expiresSerial - today)} days left.`, tone: 'up', tab: 'deals' });
  if (label.cash < 0) alerts.unshift({ text: `The label is overdrawn (${money(label.cash)}). Put money in from the Money tab.`, tone: 'down', tab: 'money' });

  const catalog = useMemo(() => {
    const ids = new Set([...label.roster, ...label.alumni].flatMap((s) => s.releases));
    return (npcSongs as Song[]).filter((s) => ids.has(s.id)).sort((a, b) => (b.weeklyStreams ?? 0) - (a.weeklyStreams ?? 0));
  }, [label, npcSongs]);

  const last = label.history[label.history.length - 1];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel className="p-4"><Stat label="Cash" value={<span className={label.cash < 0 ? 'text-fall' : ''}>{money(label.cash)}</span>} sub="the label's account" /></Panel>
        <Panel className="p-4"><Stat label="Reputation" value={`${label.reputation.toFixed(0)}/100`} sub={`can sign artists up to ${fameCap(label.reputation, player ? blendedFame(player) : 0)} fame`} /></Panel>
        <Panel className="p-4"><Stat label="Roster" value={`${label.roster.filter((s) => s.status !== 'expired').length}/${rosterLimit(label.reputation)}`} sub="grows with reputation" /></Panel>
        <Panel className="p-4">
          <Stat
            label="This month"
            value={<span className={label.monthRevenue - label.monthCosts < 0 ? 'text-fall' : 'text-rise'}>{money(label.monthRevenue - label.monthCosts)}</span>}
            sub={last ? `last month ${money(last.profit)}` : 'first statement on the 1st'}
          />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Panel className="lg:col-span-3 p-4">
          <div className="text-[13px] font-semibold text-ink mb-3">Needs your attention</div>
          {alerts.length === 0 ? (
            <div className="text-[12px] text-ink3">Nothing waiting on you. {label.roster.length === 0 ? 'Go find some artists in Scouting.' : 'The office is running smoothly.'}</div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <button key={i} onClick={() => go(a.tab)} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-[10px] bg-sidebar border border-line hover:bg-cardhover">
                  <Tag tone={a.tone}>{a.tone === 'down' ? 'Urgent' : a.tone === 'up' ? 'Deal' : 'Action'}</Tag>
                  <span className="text-[12px] text-ink2">{a.text}</span>
                </button>
              ))}
            </div>
          )}

          <div className="text-[13px] font-semibold text-ink mt-5 mb-3">Catalogue</div>
          {catalog.length === 0 ? (
            <div className="text-[12px] text-ink3">No releases yet.</div>
          ) : (
            <div className="divide-y divide-line">
              {catalog.slice(0, 8).map((s) => (
                <button key={s.id} onClick={() => openSong(s.id)} className="w-full flex items-center gap-3 py-2 text-left hover:bg-white/[0.02]">
                  <Artwork seed={`song|${s.id}`} title={s.title} size={36} rounded={8} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink truncate">{s.title}</div>
                    <div className="text-[11px] text-ink3 truncate">{s.ownerName} · quality {s.quality}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-ink num">{compact(s.weeklyStreams ?? 0)}/wk</div>
                    <div className="text-[10px] text-ink3 num">{compact(s.totalStreams ?? 0)} total</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-2 p-4">
          <div className="text-[13px] font-semibold text-ink mb-3">Label diary</div>
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {label.events.slice(0, 30).map((e, i) => (
              <div key={i} className="flex gap-2">
                <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', e.tone === 'good' ? 'bg-rise' : e.tone === 'bad' ? 'bg-fall' : 'bg-ink3')} />
                <div>
                  <div className="text-[12px] text-ink2 leading-snug">{e.text}</div>
                  <div className="text-[10px] text-ink3">{formatMedium(serialToDate(e.serial))}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── ROSTER ────────────────────────────────────────────────────────────────

function SigneeCard({ s, label }: { s: LabelSignee; label: PlayerLabel }) {
  const store = useGameStore();
  const { gameDate, npcSongs, openSong, setScreen, selectNPC } = store;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const today = dateToSerial(gameDate);
  const st = signeeLabel(s);
  const arSkill = staffSkill(label.staff, 'ar');
  const songs = s.releases.map((id) => (npcSongs as Song[]).find((x) => x.id === id)).filter(Boolean) as Song[];
  const act = (r: { ok: boolean; message: string }) => setMsg({ ok: r.ok, text: r.message });
  const daysLeft = Math.max(0, s.endsSerial - today);
  const legalSkill = staffSkill(label.staff, 'legal');

  return (
    <Panel className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Artwork seed={`artist|${s.npcId}`} title={s.name} size={52} rounded={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { selectNPC(s.npcId); setScreen('npc_profile'); }}
              className="text-[16px] font-bold text-ink hover:underline truncate"
            >
              {s.name}
            </button>
            <Tag tone={st.tone === 'good' ? 'up' : st.tone === 'bad' ? 'down' : 'muted'}>{st.text}</Tag>
          </div>
          <div className="text-[12px] text-ink3">{genreLabel(s.genre)} · {s.country} · {DEAL_INFO[s.terms.dealType].label}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[18px] font-bold text-ink num">{s.fame.toFixed(0)}</div>
          <div className="text-[10px] text-ink3">fame (signed at {s.fameAtSigning.toFixed(0)})</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Meter label="Mood" value={s.mood} color={moodColor(s.mood)} right={moodWord(s.mood)} />
        <Meter label="Loyalty" value={s.loyalty} color="#4DA3FF" />
        {arSkill > 0 && (
          <Meter label="Ceiling (A&R estimate)" value={potentialEstimate(s.potential, arSkill, s.npcId) ?? 0} color="#B57BFF" right={`~${potentialEstimate(s.potential, arSkill, s.npcId)}`} />
        )}
        <Meter label="Releases owed" value={(s.releasesDelivered / Math.max(1, s.terms.releasesOwed)) * 100} color="#FFB800" right={`${s.releasesDelivered}/${s.terms.releasesOwed}`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Royalty</div><div className="text-ink num">{s.terms.royalty}%</div></div>
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Unrecouped</div><div className={cn('num', s.recoupBalance > 0 ? 'text-amber' : 'text-rise')}>{s.recoupBalance > 0 ? money(s.recoupBalance) : 'Recouped'}</div></div>
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Label earned</div><div className="text-ink num">{money(s.labelEarned)}</div></div>
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Deal ends</div><div className="text-ink num">{s.status === 'expiring' ? 'Now' : `${Math.round(daysLeft / 30)} mo`}</div></div>
      </div>

      {s.inStudio && (
        <div className="rounded-[10px] bg-amber/10 border border-amber/30 px-3 py-2 text-[12px] text-amber">
          🎙️ In the studio — {RELEASE_TIERS[s.inStudio.tier].label.toLowerCase()}, out in {Math.max(0, s.inStudio.until - today)} day{s.inStudio.until - today === 1 ? '' : 's'}.
        </div>
      )}

      {s.requestSerial !== undefined && !s.inStudio && s.status !== 'dispute' && (
        <div className="rounded-[10px] bg-sidebar border border-line p-3 space-y-2">
          <div className="text-[12px] text-ink">🎧 New music handed in {today - s.requestSerial} day{today - s.requestSerial === 1 ? '' : 's'} ago. Fund a release:</div>
          <div className="grid sm:grid-cols-3 gap-2">
            {(Object.keys(RELEASE_TIERS) as LabelReleaseTier[]).map((t) => {
              const tier = RELEASE_TIERS[t];
              const cost = tier.cost + Math.max(tier.marketing, s.terms.marketingCommit);
              return (
                <button
                  key={t}
                  disabled={label.cash < cost}
                  onClick={() => act(store.fundLabelRelease(s.npcId, t))}
                  className="text-left rounded-[9px] border border-line bg-card hover:bg-cardhover p-2 disabled:opacity-40"
                >
                  <div className="text-[12px] font-semibold text-ink">{tier.label}</div>
                  <div className="text-[11px] text-amber num">{money(cost)} · {tier.days}d</div>
                  <div className="text-[10px] text-ink3">{tier.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {s.requestSerial === undefined && !s.inStudio && s.status === 'active' && s.terms.dealType !== 'distribution' && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-ink3">Rush a record out:</span>
          {(Object.keys(RELEASE_TIERS) as LabelReleaseTier[]).map((t) => (
            <Button key={t} size="sm" variant="secondary" onClick={() => act(store.fundLabelRelease(s.npcId, t))}>
              {RELEASE_TIERS[t].label} · {money(RELEASE_TIERS[t].cost + Math.max(RELEASE_TIERS[t].marketing, s.terms.marketingCommit))}
            </Button>
          ))}
        </div>
      )}

      {s.demand && (
        <div className="rounded-[10px] bg-amber/10 border border-amber/30 p-3 space-y-2">
          <div className="text-[12px] text-ink">💰 {s.demand.text}</div>
          <div className="text-[10px] text-ink3">Answer within {Math.max(0, 21 - (today - s.demand.openedSerial))} days or it counts as a no.</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act(store.answerLabelDemand(s.npcId, 'raise'))}>Raise to {s.demand.royalty}%</Button>
            <Button size="sm" variant="secondary" disabled={label.cash < (s.demand.bonus ?? 0)} onClick={() => act(store.answerLabelDemand(s.npcId, 'bonus'))}>Pay {money(s.demand.bonus ?? 0)} bonus</Button>
            <Button size="sm" variant="ghost" onClick={() => act(store.answerLabelDemand(s.npcId, 'refuse'))}>Refuse</Button>
          </div>
        </div>
      )}

      {s.rivalOffer && (
        <div className="rounded-[10px] bg-fall/10 border border-fall/30 p-3 space-y-2">
          <div className="text-[12px] text-ink">
            🦈 <b>{s.rivalOffer.labelName}</b> offered {s.name} {s.rivalOffer.royalty}% and will pay you <b>{money(s.rivalOffer.buyout)}</b> for the contract.
            {s.loyalty >= 70 ? ' They are loyal and leaning toward staying.' : ' They are listening.'}
          </div>
          <div className="text-[10px] text-ink3">{Math.max(0, s.rivalOffer.expiresSerial - today)} days to answer.</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act(store.answerRivalOffer(s.npcId, 'match'))}>Match {s.rivalOffer.royalty}%</Button>
            <Button size="sm" variant="secondary" onClick={() => act(store.answerRivalOffer(s.npcId, 'sell'))}>Sell for {money(s.rivalOffer.buyout)}</Button>
            <Button size="sm" variant="ghost" onClick={() => act(store.answerRivalOffer(s.npcId, 'refuse'))}>Refuse to release them</Button>
          </div>
        </div>
      )}

      {s.status === 'dispute' && (
        <div className="rounded-[10px] bg-fall/10 border border-fall/30 p-3 space-y-2">
          <div className="text-[12px] text-ink">⚠️ {s.name} refuses to record. Each month there is a real chance their lawyers get them out — and you pay the fees.</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act(store.settleLabelDispute(s.npcId))}>Settle · {money(settlementCost(s, legalSkill))}</Button>
            <Button size="sm" variant="ghost" onClick={() => act(store.dropLabelArtist(s.npcId))}>Let them go</Button>
          </div>
        </div>
      )}

      {s.status === 'expiring' && (
        <div className="rounded-[10px] bg-sidebar border border-line px-3 py-2 text-[12px] text-ink2">
          📝 The deal is up. Renewal talks are in the Deals tab.
        </div>
      )}

      {songs.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Releases</div>
          <div className="divide-y divide-line">
            {songs.slice().reverse().slice(0, 5).map((song) => (
              <div key={song.id} className="flex items-center gap-2 py-1.5">
                <button onClick={() => openSong(song.id)} className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] text-ink truncate hover:underline">{song.title}</div>
                  <div className="text-[10px] text-ink3 num">{compact(song.weeklyStreams ?? 0)}/wk · {compact(song.totalStreams ?? 0)} total · Q{song.quality}</div>
                </button>
                <Button size="sm" variant="ghost" disabled={label.cash < 1000} onClick={() => act(store.promoteLabelSong(song.id, 1000))}>Push $1K</Button>
                <Button size="sm" variant="ghost" disabled={label.cash < 5000} onClick={() => act(store.promoteLabelSong(song.id, 5000))}>Push $5K</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.notes.length > 0 && <div className="text-[11px] text-ink3 italic">{s.notes[0]}</div>}

      <Flash msg={msg} />

      <div className="flex justify-end">
        {confirmDrop ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-fall">{s.recoupBalance > 0 ? `${money(s.recoupBalance)} unrecouped is lost.` : 'Sure?'}</span>
            <Button size="sm" variant="secondary" onClick={() => act(store.dropLabelArtist(s.npcId))}>Drop {s.name}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDrop(false)}>Cancel</Button>
          </div>
        ) : (
          <button onClick={() => setConfirmDrop(true)} className="text-[11px] text-ink3 hover:text-fall">Drop from label</button>
        )}
      </div>
    </Panel>
  );
}

function Roster({ label, go }: { label: PlayerLabel; go: (t: Tab) => void }) {
  if (label.roster.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="No artists yet"
          body="Your scouts have a list of unsigned acts your label can reach. Make someone an offer."
          action={<Button onClick={() => go('scouting')}>Open Scouting</Button>}
        />
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid xl:grid-cols-2 gap-4">
        {label.roster.map((s) => <SigneeCard key={s.npcId} s={s} label={label} />)}
      </div>
      {label.alumni.length > 0 && (
        <Panel className="p-4">
          <div className="text-[13px] font-semibold text-ink mb-2">Former artists</div>
          <div className="flex flex-wrap gap-2">
            {label.alumni.map((s, i) => (
              <span key={`${s.npcId}-${i}`} className="text-[11px] px-2 py-1 rounded-full bg-sidebar border border-line text-ink2">
                {s.name} · {signeeLabel(s).text.toLowerCase()} · {s.releases.length} release{s.releases.length === 1 ? '' : 's'}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-ink3 mt-2">Records they made with you keep earning for the label (except on distribution deals).</div>
        </Panel>
      )}
    </div>
  );
}

// ─── SCOUTING ──────────────────────────────────────────────────────────────

function Scouting({ label, go, setPitch }: { label: PlayerLabel; go: (t: Tab) => void; setPitch: (id: string) => void }) {
  const store = useGameStore();
  const { npcs, gameDate, player } = store;
  const [deal, setDeal] = useState<LabelDealType>('standard');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const today = dateToSerial(gameDate);
  const byId = useMemo(() => {
    const ids = new Set(label.prospects.map((p) => p.npcId));
    const m = new Map<string, NPC>();
    for (const n of npcs as NPC[]) if (ids.has(n.id)) m.set(n.id, n);
    return m;
  }, [npcs, label.prospects]);
  const cap = player ? fameCap(label.reputation, blendedFame(player)) : 0;
  const full = label.roster.filter((s) => s.status === 'active' || s.status === 'dispute' || s.status === 'expiring').length >= rosterLimit(label.reputation);
  const nextIn = Math.max(0, PROSPECT_REFRESH_DAYS - (today - label.prospectsSerial));

  return (
    <div className="space-y-4">
      <Panel className="p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="text-[12px] text-ink2">
          Your label can reach artists up to <b className="text-ink">{cap} fame</b>.{' '}
          {staffSkill(label.staff, 'ar') > 0 ? 'Your A&R is scouting abroad too and estimating ceilings.' : 'Hire a Head of A&R to scout abroad and estimate each act\'s ceiling.'}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={deal}
            onChange={(v) => setDeal(v as LabelDealType)}
            options={DEAL_ORDER.map((d) => ({ value: d, label: `${DEAL_INFO[d].emoji} ${DEAL_INFO[d].label}` }))}
            className="w-56"
          />
          <Button size="sm" variant="secondary" disabled={nextIn > 0} onClick={() => { const r = store.refreshLabelProspects(); setMsg({ ok: r.ok, text: r.message }); }}>
            {nextIn > 0 ? `New report in ${nextIn}d` : 'New report'}
          </Button>
        </div>
      </Panel>
      <div className="text-[11px] text-ink3 -mt-2 px-1">{DEAL_INFO[deal].blurb}</div>
      <Flash msg={msg} />
      {full && <div className="text-[12px] text-amber px-1">The roster is full at this reputation ({rosterLimit(label.reputation)}). Grow the label's name or let someone go before signing more.</div>}

      {label.prospects.length === 0 ? (
        <Panel><EmptyState title="Nobody on the list" body="The scouts found nobody your label can reach this week. Grow your reputation or hire an A&R." /></Panel>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {label.prospects.map((p) => {
            const n = byId.get(p.npcId);
            if (!n) return null;
            const talking = label.pitches.find((x) => x.npcId === n.id && x.status === 'open');
            const arche = ARCHETYPE_LABEL[archetypeOf(n)];
            return (
              <Panel key={p.npcId} className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Artwork seed={`artist|${n.id}`} title={n.name} size={44} rounded={22} />
                  <div className="flex-1 min-w-0">
                    <button onClick={() => { store.selectNPC(n.id); store.setScreen('npc_profile'); }} className="text-[14px] font-semibold text-ink truncate hover:underline block">{n.name}</button>
                    <div className="text-[11px] text-ink3 truncate">{genreLabel(n.genre)} · {n.city ? `${n.city}, ` : ''}{n.country} · {n.age}y</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-bold text-ink num">{n.fame.toFixed(0)}</div>
                    <div className="text-[10px] text-ink3">fame</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Tag tone="accent">{arche.emoji} {arche.label}</Tag>
                  {p.potentialEstimate !== undefined && <Tag tone="new">Ceiling ~{p.potentialEstimate}</Tag>}
                  {n.relationshipScore >= 20 && <Tag tone="up">Knows you</Tag>}
                  {label.genreFocus !== 'any' && n.genre === label.genreFocus && <Tag tone="amber">Your sound</Tag>}
                </div>
                <div className="text-[12px] text-ink2 leading-snug flex-1">{p.note}</div>
                {talking ? (
                  <Button size="sm" variant="secondary" onClick={() => { setPitch(talking.id); go('deals'); }}>Continue talks →</Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={full}
                    onClick={() => {
                      const r = store.openLabelPitch(n.id, deal);
                      setMsg({ ok: r.ok, text: r.message });
                      if (r.ok) {
                        const fresh = useGameStore.getState().label?.pitches.find((x) => x.npcId === n.id && x.status === 'open');
                        if (fresh) { setPitch(fresh.id); go('deals'); }
                      }
                    }}
                  >
                    Make an offer
                  </Button>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DEALS (THE NEGOTIATION PAGE) ──────────────────────────────────────────

function Stepper({ label, sub, value, onDec, onInc, disabled }: { label: string; sub?: string; value: ReactNode; onDec: () => void; onInc: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-0">
      <div className="min-w-0">
        <div className="text-[12px] text-ink2">{label}</div>
        {sub && <div className="text-[10px] text-ink3">{sub}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onDec} disabled={disabled} className="w-7 h-7 rounded-[8px] bg-sidebar border border-line text-ink font-bold disabled:opacity-40">−</button>
        <span className="min-w-[110px] text-center text-[13px] font-semibold text-ink num">{value}</span>
        <button onClick={onInc} disabled={disabled} className="w-7 h-7 rounded-[8px] bg-sidebar border border-line text-ink font-bold disabled:opacity-40">+</button>
      </div>
    </div>
  );
}

function Negotiation({ pitch, label, onClose }: { pitch: LabelPitch; label: PlayerLabel; onClose: () => void }) {
  const store = useGameStore();
  const ctx = store.labelPitchContext(pitch.id);
  const today = dateToSerial(store.gameDate);
  const [ask, setAsk] = useState<LabelTerms>({ ...pitch.terms });
  const [reply, setReply] = useState<{ ok: boolean; text: string } | null>(pitch.lastReply ? { ok: true, text: pitch.lastReply } : null);
  if (!ctx) return null;
  const open = pitch.status === 'open';
  const changed = JSON.stringify(ask) !== JSON.stringify(pitch.terms);
  const mood = MOOD_INFO[ctx.mood];
  const arche = ARCHETYPE_LABEL[archetypeOf(ctx.npc)];
  const [lo, hi] = DEAL_INFO[ask.dealType].royaltyRange;
  const advStep = Math.max(250, Math.round(pitch.wants.advance * 0.05 / 250) * 250 || 250);
  const agreed = !!pitch.agreedTerms && JSON.stringify(pitch.agreedTerms) === JSON.stringify(ask);
  const canSign = open && !changed && agreed && label.cash >= ask.advance;

  const send = () => {
    const r = store.counterLabelPitch(pitch.id, ask);
    setReply({ ok: r.outcome === 'accepted' || r.outcome === 'countered', text: r.message });
    const fresh = useGameStore.getState().label?.pitches.find((p) => p.id === pitch.id);
    if (fresh) setAsk({ ...fresh.terms });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <Panel className="lg:col-span-3 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Artwork seed={`artist|${ctx.npc.id}`} title={ctx.npc.name} size={44} rounded={22} />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink3">{pitch.renewal ? 'Contract renewal' : 'Record deal'}</div>
              <div className="text-[18px] font-bold text-ink">{pitch.name}</div>
              <div className="text-[11px] text-ink3">fame {ctx.npc.fame.toFixed(0)} · {genreLabel(ctx.npc.genre)} · {ctx.npc.country}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[12px] text-ink3 hover:text-ink">← All deals</button>
        </div>

        {pitch.competing && open && (
          <div className="rounded-[10px] bg-fall/10 border border-fall/30 px-3 py-2 text-[12px] text-fall">
            🦈 {pitch.competing} is also chasing {pitch.name}. They will not wait long.
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {DEAL_ORDER.map((d) => (
            <button
              key={d}
              disabled={!open}
              onClick={() => {
                const [l, h] = DEAL_INFO[d].royaltyRange;
                setAsk({ ...ask, dealType: d, royalty: Math.max(l, Math.min(h, d === pitch.wants.dealType ? pitch.wants.royalty - 3 : Math.round((l + h) / 2) - 5)) });
              }}
              className={cn('px-2.5 h-8 rounded-full border text-[11px] font-semibold', ask.dealType === d ? 'bg-amber/15 border-amber text-amber' : 'bg-card border-line text-ink2')}
            >
              {DEAL_INFO[d].emoji} {DEAL_INFO[d].label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-ink3">{DEAL_INFO[ask.dealType].blurb}</div>

        <div className="bg-sidebar border border-line rounded-[12px] px-3">
          <Stepper label="Advance" sub="Paid now from label cash. Recoupable." value={money(ask.advance)} disabled={!open}
            onDec={() => setAsk({ ...ask, advance: Math.max(0, ask.advance - advStep) })}
            onInc={() => setAsk({ ...ask, advance: ask.advance + advStep })} />
          <Stepper label="Artist royalty" sub={`${lo}–${hi}% on this kind of deal`} value={`${ask.royalty}%`} disabled={!open}
            onDec={() => setAsk({ ...ask, royalty: Math.max(lo, ask.royalty - 1) })}
            onInc={() => setAsk({ ...ask, royalty: Math.min(hi, ask.royalty + 1) })} />
          <Stepper label="Releases owed" value={ask.releasesOwed} disabled={!open}
            onDec={() => setAsk({ ...ask, releasesOwed: Math.max(1, ask.releasesOwed - 1) })}
            onInc={() => setAsk({ ...ask, releasesOwed: Math.min(10, ask.releasesOwed + 1) })} />
          <Stepper label="Term" value={`${ask.termMonths} months`} disabled={!open}
            onDec={() => setAsk({ ...ask, termMonths: Math.max(12, ask.termMonths - 6) })}
            onInc={() => setAsk({ ...ask, termMonths: Math.min(72, ask.termMonths + 6) })} />
          <Stepper label="Marketing per release" sub="Promised spend on every record" value={money(ask.marketingCommit)} disabled={!open}
            onDec={() => setAsk({ ...ask, marketingCommit: Math.max(0, ask.marketingCommit - 250) })}
            onInc={() => setAsk({ ...ask, marketingCommit: ask.marketingCommit + 250 })} />
          <div className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-[12px] text-ink2">Creative control</div>
              <div className="text-[10px] text-ink3">They decide what comes out</div>
            </div>
            <button
              disabled={!open}
              onClick={() => setAsk({ ...ask, creativeControl: !ask.creativeControl })}
              className={cn('w-12 h-7 rounded-full border transition relative', ask.creativeControl ? 'bg-amber border-amber' : 'bg-card border-line')}
              aria-pressed={ask.creativeControl}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', ask.creativeControl ? 'left-6' : 'left-0.5')} />
            </button>
          </div>
        </div>

        {reply && (
          <div className={cn('rounded-[10px] px-3 py-2 text-[12px] border', reply.ok ? 'bg-rise/10 border-rise/30 text-ink' : 'bg-fall/10 border-fall/30 text-ink')}>
            {reply.text}
          </div>
        )}

        {open ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={send} disabled={!changed && pitch.rounds > 0}>{pitch.rounds === 0 && !changed ? 'Send opening offer' : 'Send offer'}</Button>
            <Button variant="secondary" disabled={!canSign} onClick={() => { const r = store.signLabelPitch(pitch.id); setReply({ ok: r.ok, text: r.message }); }}>
              Sign at these terms{ask.advance > 0 ? ` · ${money(ask.advance)}` : ''}
            </Button>
            <Button variant="ghost" onClick={() => { store.withdrawLabelPitch(pitch.id); onClose(); }}>Walk away</Button>
          </div>
        ) : (
          <div className="text-[12px] text-ink3">These talks are closed ({pitch.status}).</div>
        )}
        {open && label.cash < ask.advance && <div className="text-[11px] text-fall">The label has {money(label.cash)} — not enough for this advance. Deposit from the Money tab.</div>}
      </Panel>

      <div className="lg:col-span-2 space-y-4">
        <Panel className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-ink">Reading the room</div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="bg-sidebar rounded-[9px] p-2"><div className="text-[10px] text-ink3">Type</div><div className="text-ink">{arche.emoji} {arche.label}</div><div className="text-[10px] text-ink3">{arche.blurb}</div></div>
            <div className="bg-sidebar rounded-[9px] p-2"><div className="text-[10px] text-ink3">Today</div><div className="text-ink">{mood.emoji} {mood.label}</div><div className="text-[10px] text-ink3">{mood.hint}</div></div>
          </div>
          <div>
            <div className="text-[10px] text-ink3 mb-1">Patience</div>
            <div className="flex gap-1">
              {Array.from({ length: Math.max(pitch.patience, 1) + 2 }).map((_, i) => (
                <span key={i} className={cn('h-2 flex-1 rounded-full', i < pitch.patience ? 'bg-amber' : 'bg-white/5')} />
              ))}
            </div>
          </div>
          <div className="text-[11px] text-ink3">{Math.max(0, pitch.expiresSerial - today)} days before they stop waiting · round {pitch.rounds}</div>
          {ctx.potentialEstimate !== undefined && <div className="text-[12px] text-ink2">🔍 A&R thinks their ceiling is around <b className="text-ink">{ctx.potentialEstimate}</b> fame.</div>}
        </Panel>
        <Panel className="p-4 space-y-2">
          <div className="text-[13px] font-semibold text-ink">⚖️ Lawyer's read</div>
          {ctx.lawyerNotes.length === 0 ? (
            <div className="text-[12px] text-ink3">No lawyer on this. Hire Business Affairs at the label (or a lawyer on your team) to learn what they really want.</div>
          ) : (
            <ul className="text-[12px] text-ink2 space-y-1">{ctx.lawyerNotes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
          )}
        </Panel>
        <Panel className="p-4 text-[11px] text-ink3 leading-relaxed">
          How it works: a lowball costs patience; a near miss gets a counter that fixes the line they care about most. Accept their counter by
          signing it unchanged. Bigger names, a famous owner and a good relationship all make artists easier to sign.
        </Panel>
      </div>
    </div>
  );
}

function Deals({ label, pitchId, setPitch }: { label: PlayerLabel; pitchId: string | null; setPitch: (id: string | null) => void }) {
  const today = dateToSerial(useGameStore().gameDate);
  const selected = label.pitches.find((p) => p.id === pitchId);
  if (selected) return <Negotiation key={selected.id} pitch={selected} label={label} onClose={() => setPitch(null)} />;
  const open = label.pitches.filter((p) => p.status === 'open');
  const closed = label.pitches.filter((p) => p.status !== 'open').slice(0, 12);
  return (
    <div className="space-y-4">
      {open.length === 0 ? (
        <Panel><EmptyState title="No open talks" body="Make an offer from Scouting. Renewals for artists whose deals are ending show up here too." /></Panel>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {open.map((p) => (
            <Panel key={p.id} className="p-4 flex items-center gap-3">
              <Artwork seed={`artist|${p.npcId}`} title={p.name} size={40} rounded={20} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ink truncate">{p.name} {p.renewal && <Tag tone="amber">Renewal</Tag>}</div>
                <div className="text-[11px] text-ink3">{DEAL_INFO[p.terms.dealType].label} · {Math.max(0, p.expiresSerial - today)} days left{p.competing ? ` · ${p.competing} interested` : ''}</div>
                {p.lastReply && <div className="text-[11px] text-ink2 truncate mt-0.5">“{p.lastReply}”</div>}
              </div>
              <Button size="sm" onClick={() => setPitch(p.id)}>Open</Button>
            </Panel>
          ))}
        </div>
      )}
      {closed.length > 0 && (
        <Panel className="p-4">
          <div className="text-[13px] font-semibold text-ink mb-2">Past talks</div>
          <div className="space-y-1">
            {closed.map((p) => (
              <div key={p.id} className="text-[12px] text-ink3 flex justify-between gap-2">
                <span className="truncate">{p.name}{p.renewal ? ' (renewal)' : ''}</span>
                <span className={p.status === 'signed' ? 'text-rise' : 'text-ink3'}>{p.status}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ─── STAFF ─────────────────────────────────────────────────────────────────

function Staff({ label }: { label: PlayerLabel }) {
  const store = useGameStore();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openRole, setOpenRole] = useState<LabelStaffRole | null>(null);
  const candidates = useMemo(() => (openRole ? store.labelStaffCandidates(openRole) : []), [openRole, label.staff.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <Flash msg={msg} />
      <div className="grid md:grid-cols-2 gap-3">
        {STAFF_ORDER.map((role) => {
          const info = STAFF_INFO[role];
          const who = label.staff.find((s) => s.role === role);
          return (
            <Panel key={role} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[22px]">{info.emoji}</span>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-ink">{info.title}</div>
                  <div className="text-[11px] text-ink3">{info.does}</div>
                </div>
              </div>
              {who ? (
                <div className="flex items-center justify-between rounded-[10px] bg-sidebar border border-line px-3 py-2">
                  <div>
                    <div className="text-[13px] text-ink">{who.name}</div>
                    <div className="text-[11px] text-ink3 num">skill {who.skill} · {money(who.salary)}/month</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => store.fireLabelStaff(role)}>Let go</Button>
                </div>
              ) : openRole === role ? (
                <div className="space-y-1.5">
                  {candidates.map((c) => (
                    <div key={c.npcId} className="flex items-center justify-between rounded-[10px] bg-sidebar border border-line px-3 py-2">
                      <div>
                        <div className="text-[12px] text-ink">{c.name}</div>
                        <div className="text-[10px] text-ink3 num">skill {c.skill} · {c.country} · {money(c.salary)}/mo</div>
                      </div>
                      <Button size="sm" onClick={() => { const r = store.hireLabelStaff(role, c.npcId); setMsg({ ok: r.ok, text: r.message }); if (r.ok) setOpenRole(null); }}>Hire</Button>
                    </div>
                  ))}
                  <button onClick={() => setOpenRole(null)} className="text-[11px] text-ink3 hover:text-ink">Cancel</button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setOpenRole(role)}>Find candidates</Button>
              )}
            </Panel>
          );
        })}
      </div>
      <div className="text-[11px] text-ink3 px-1">Salaries come out of the label's cash on the 1st of every month, with the office costs ({money(overheadFor(label))}/month at the current size).</div>
    </div>
  );
}

// ─── MONEY ─────────────────────────────────────────────────────────────────

function Money({ label }: { label: PlayerLabel }) {
  const store = useGameStore();
  const [amount, setAmount] = useState('10000');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hist = label.history.slice(-12);
  const peak = Math.max(1, ...hist.map((h) => Math.max(h.revenue, h.costs)));
  const life = [...label.roster, ...label.alumni].reduce((a, s) => a + s.labelEarned, 0);
  const salaries = label.staff.reduce((a, s) => a + s.salary, 0);
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <Panel className="lg:col-span-3 p-4">
        <div className="text-[13px] font-semibold text-ink mb-3">Monthly statements</div>
        {hist.length === 0 ? (
          <div className="text-[12px] text-ink3">The first statement arrives on the 1st of next month.</div>
        ) : (
          <div className="space-y-1.5">
            {hist.slice().reverse().map((h) => (
              <div key={h.key} className="grid grid-cols-[64px_1fr_90px] items-center gap-2">
                <div className="text-[11px] text-ink3 num">{h.key}</div>
                <div className="space-y-0.5">
                  <div className="h-1.5 rounded-full bg-rise/70" style={{ width: `${(h.revenue / peak) * 100}%` }} />
                  <div className="h-1.5 rounded-full bg-fall/70" style={{ width: `${(h.costs / peak) * 100}%` }} />
                </div>
                <div className={cn('text-right text-[12px] num', h.profit >= 0 ? 'text-rise' : 'text-fall')}>{money(h.profit)}</div>
              </div>
            ))}
            <div className="flex gap-4 text-[10px] text-ink3 pt-1"><span><span className="inline-block w-2 h-2 rounded-full bg-rise/70 mr-1" />Revenue</span><span><span className="inline-block w-2 h-2 rounded-full bg-fall/70 mr-1" />Costs</span></div>
          </div>
        )}
      </Panel>
      <div className="lg:col-span-2 space-y-4">
        <Panel className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-ink">Move money</div>
          <div className="text-[12px] text-ink2">You: {money(store.player?.career.money ?? 0)} · Label: {money(label.cash)}</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            className="w-full h-10 px-3 rounded-[10px] bg-sidebar border border-line text-ink text-[14px] num focus:outline-none focus:border-amber"
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={amt <= 0} onClick={() => { const r = store.labelDeposit(amt); setMsg({ ok: r.ok, text: r.message }); }}>Put in</Button>
            <Button size="sm" variant="secondary" className="flex-1" disabled={amt <= 0} onClick={() => { const r = store.labelWithdraw(amt); setMsg({ ok: r.ok, text: r.message }); }}>Take dividend</Button>
          </div>
          <Flash msg={msg} />
        </Panel>
        <Panel className="p-4 grid grid-cols-2 gap-3">
          <Stat label="You put in" value={money(label.totalInvested)} />
          <Stat label="You took out" value={money(label.totalWithdrawn)} />
          <Stat label="Catalogue earned" value={money(life)} sub="label's share, lifetime" />
          <Stat label="Fixed costs" value={`${money(salaries + overheadFor(label))}/mo`} sub={`staff ${money(salaries)}`} />
        </Panel>
      </div>
    </div>
  );
}

// ─── THE PAGE ──────────────────────────────────────────────────────────────

export function LabelScreen() {
  const label = useGameStore((s) => s.label);
  const gameDate = useGameStore((s) => s.gameDate);
  const [tab, setTab] = useState<Tab>('overview');
  const [pitchId, setPitchId] = useState<string | null>(null);
  if (!label) return <FoundLabel />;

  const openPitches = label.pitches.filter((p) => p.status === 'open').length;
  const needs = label.roster.filter((s) => (s.requestSerial !== undefined && !s.inStudio) || s.demand || s.rivalOffer || s.status === 'dispute').length;
  const founded = formatMedium(serialToDate(label.foundedSerial));
  void gameDate;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Logo label={label} size={60} />
        <div className="flex-1 min-w-[180px]">
          <h1 className="text-[22px] md:text-[26px] font-bold text-ink leading-tight">{label.name}</h1>
          <div className="text-[12px] text-ink3">
            {label.country} · {label.genreFocus === 'any' ? 'All sounds' : genreLabel(label.genreFocus)} · since {founded}
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex-1 sm:w-48 sm:flex-none">
            <Meter label="Reputation" value={label.reputation} color={label.color} right={`${label.reputation.toFixed(0)}/100`} />
          </div>
          <div className="text-right">
            <div className={cn('text-[20px] font-bold num', label.cash < 0 ? 'text-fall' : 'text-ink')}>{money(label.cash)}</div>
            <div className="text-[10px] text-ink3">label cash</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => { setTab(t); if (t !== 'deals') setPitchId(null); }}
          options={[
            { id: 'overview', label: 'Overview' },
            { id: 'roster', label: 'Roster', badge: needs ? `● ${needs}` : String(label.roster.length) },
            { id: 'scouting', label: 'Scouting' },
            { id: 'deals', label: 'Deals', badge: openPitches ? String(openPitches) : undefined },
            { id: 'staff', label: 'Staff', badge: `${label.staff.length}/4` },
            { id: 'money', label: 'Money' },
          ]}
        />
      </div>

      {tab === 'overview' && <Overview label={label} go={setTab} />}
      {tab === 'roster' && <Roster label={label} go={setTab} />}
      {tab === 'scouting' && <Scouting label={label} go={setTab} setPitch={setPitchId} />}
      {tab === 'deals' && <Deals label={label} pitchId={pitchId} setPitch={setPitchId} />}
      {tab === 'staff' && <Staff label={label} />}
      {tab === 'money' && <Money label={label} />}
    </div>
  );
}
