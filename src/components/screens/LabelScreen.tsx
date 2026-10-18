// ─── MY LABEL ──────────────────────────────────────────────────────────────
//
// Found a label, scout artists, negotiate, answer their demos, build a studio,
// keep the roster happy and live off what the catalogue earns. The engine is
// `sim/label.ts`; every number shown here comes from the store or the engine.

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
  LabelSubmission,
  LabelTactic,
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
  GEAR_INFO,
  GEAR_ORDER,
  LABEL_COLORS,
  LEAK_DAYS,
  PROSPECT_REFRESH_DAYS,
  RELEASE_TIERS,
  STAFF_INFO,
  STAFF_ORDER,
  STUDIO_TIERS,
  SUBMISSION_PATIENCE_DAYS,
  TACTIC_INFO,
  fameCap,
  gearCap,
  money,
  moodWord,
  normalizeTerms,
  overheadFor,
  potentialEstimate,
  rosterLimit,
  sessionPlan,
  settlementCost,
  signeeLabel,
  signingCost,
  staffSkill,
  studioEffects,
  studioRent,
} from '../../sim/label';
import { MOOD_INFO, ARCHETYPE_LABEL, archetypeOf } from '../../sim/offers';
import { GENRE_LIST, genreLabel } from '../../data/genres';
import { dateToSerial, serialToDate, formatMedium } from '../../sim/gameClock';
import { trackTotals } from '../../store/musicSelectors';
import { cn } from '@/utils/cn';

type Tab = 'overview' | 'roster' | 'ar' | 'scouting' | 'deals' | 'studio' | 'staff' | 'money';
type Msg = { ok: boolean; text: string } | null;

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

function Flash({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div className={cn('rounded-[10px] px-3 py-2 text-[12px] border', msg.ok ? 'bg-rise/10 border-rise/30 text-rise' : 'bg-fall/10 border-fall/30 text-fall')}>
      {msg.text}
    </div>
  );
}

function moodColor(m: number): string {
  if (m >= 60) return '#2ED573';
  if (m >= 40) return '#FFB800';
  return '#FF4757';
}

/** Live numbers for a record: the streaming engine, climbing through the day. */
function useSongNumbers(songIds: string[]) {
  const state = useGameStore();
  return useMemo(() => {
    const out: Record<string, { week: number; lifetime: number }> = {};
    for (const id of songIds) {
      const t = trackTotals(state, id);
      const song = (state.npcSongs as Song[]).find((s) => s.id === id);
      out[id] = t ? { week: t.week, lifetime: t.lifetime } : { week: song?.weeklyStreams ?? 0, lifetime: song?.totalStreams ?? 0 };
    }
    return out;
  }, [state, songIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** What the artist is doing right now, in one line. */
function pipelineLine(s: LabelSignee, label: PlayerLabel, today: number): { text: string; tone: 'amber' | 'up' | 'down' | 'muted' } {
  const pending = label.submissions.find((x) => x.npcId === s.npcId && x.status === 'pending');
  const rework = label.submissions.find((x) => x.npcId === s.npcId && x.status === 'reworking');
  if (s.status === 'dispute') return { text: 'Refusing to record until the dispute is settled.', tone: 'down' };
  if (s.inStudio) return { text: `🎙️ Recording ${s.inStudio.kind === 'album' ? `the album "${s.inStudio.title}"` : `"${s.inStudio.title}"`} — out in ${Math.max(0, s.inStudio.until - today)} days.`, tone: 'up' };
  if (pending) return { text: `🎧 Waiting on your answer to "${pending.title}" (${today - pending.submittedSerial}d).`, tone: today - pending.submittedSerial > SUBMISSION_PATIENCE_DAYS ? 'down' : 'amber' };
  if (rework) return { text: `✍️ Reworking "${rework.title}" — back in ${Math.max(0, (rework.dueSerial ?? today) - today)} days.`, tone: 'muted' };
  if (s.terms.allIn && s.fund < 2000) return { text: '💸 Out of fund — cannot book sessions.', tone: 'down' };
  if (s.status === 'expiring') return { text: '📝 Contract up — renew, take the option, or let them go.', tone: 'amber' };
  const days = Math.max(0, s.workSerial - today);
  return { text: `✏️ Writing. Next demo in about ${days} day${days === 1 ? '' : 's'}.`, tone: 'muted' };
}

// ─── FOUNDING ──────────────────────────────────────────────────────────────

function FoundLabel() {
  const { player, businesses, foundLabel, setScreen } = useGameStore();
  const [name, setName] = useState(player ? `${player.artistName} Records` : '');
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const [genre, setGenre] = useState<Genre | 'any'>('any');
  const [msg, setMsg] = useState<Msg>(null);
  if (!player) return null;
  const fame = blendedFame(player);
  const existing = businesses.find((b) => b.type === 'record_label');
  const canFame = !!existing || fame >= FOUNDING_MIN_FAME;
  const canMoney = !!existing || player.career.money >= FOUNDING_COST;

  return (
    <div className="max-w-3xl">
      <PageTitle subtitle="Sign artists. Approve their music. Own the masters.">Start your own label</PageTitle>
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
                <button key={c} aria-label={`Colour ${c}`} onClick={() => setColor(c)}
                  className={cn('w-8 h-8 rounded-[9px] border-2 transition', color === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Sound</div>
            <Select value={genre} onChange={(v) => setGenre(v as Genre | 'any')}
              options={[{ value: 'any', label: 'Any genre' }, ...GENRE_LIST.map((g) => ({ value: g.id, label: g.label }))]} />
            <div className="text-[11px] text-ink3 mt-1.5">Scouts look for this sound first. "Any" keeps it open.</div>
          </div>
          <Flash msg={msg} />
          <Button disabled={!canFame || !canMoney || name.trim().length < 2}
            onClick={() => { const r = foundLabel({ name, color, genreFocus: genre }); setMsg({ ok: r.ok, text: r.message }); }} className="w-full">
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
            <li>🎧 Signed artists <b className="text-ink">work on their own</b> and pitch you demos. Approve, send back, or shelve.</li>
            <li>💰 Fund every record yourself — or hand them an <b className="text-ink">all-in fund</b> and let them run it.</li>
            <li>🎛️ Build your own studio, hire a producer and an engineer.</li>
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
  for (const sub of label.submissions) {
    if (sub.status !== 'pending') continue;
    const wait = today - sub.submittedSerial;
    alerts.push({ text: `${sub.name} pitched ${sub.kind === 'album' ? 'an album' : 'a single'}: "${sub.title}"${wait > SUBMISSION_PATIENCE_DAYS ? ` — ${wait} days waiting, it may leak` : ''}.`, tone: wait > SUBMISSION_PATIENCE_DAYS ? 'down' : 'amber', tab: 'ar' });
  }
  for (const s of label.roster) {
    if (s.demand) alerts.push({ text: `${s.name} wants to renegotiate.`, tone: 'amber', tab: 'roster' });
    if (s.rivalOffer) alerts.push({ text: `${s.rivalOffer.labelName} is trying to take ${s.name}.`, tone: 'down', tab: 'roster' });
    if (s.status === 'dispute') alerts.push({ text: `${s.name} is in dispute and refusing to record.`, tone: 'down', tab: 'roster' });
    if (s.terms.allIn && s.fund < 2000 && s.status === 'active') alerts.push({ text: `${s.name} has spent their recording fund.`, tone: 'amber', tab: 'roster' });
  }
  for (const p of label.pitches) if (p.status === 'open') alerts.push({ text: `${p.renewal ? 'Renewal' : 'Talks'} with ${p.name} — ${Math.max(0, p.expiresSerial - today)} days left.`, tone: 'up', tab: 'deals' });
  if (label.cash < 0) alerts.unshift({ text: `The label is overdrawn (${money(label.cash)}). Put money in from the Money tab.`, tone: 'down', tab: 'money' });

  const catalogIds = useMemo(() => {
    const ids = new Set([...label.roster, ...label.alumni].flatMap((s) => s.releases));
    return (npcSongs as Song[]).filter((s) => ids.has(s.id)).map((s) => s.id);
  }, [label, npcSongs]);
  const nums = useSongNumbers(catalogIds);
  const catalog = useMemo(
    () => (npcSongs as Song[]).filter((s) => nums[s.id]).sort((a, b) => (nums[b.id]?.week ?? 0) - (nums[a.id]?.week ?? 0)),
    [npcSongs, nums],
  );

  const last = label.history[label.history.length - 1];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel className="p-4"><Stat label="Cash" value={<span className={label.cash < 0 ? 'text-fall' : ''}>{money(label.cash)}</span>} sub="the label's account" /></Panel>
        <Panel className="p-4"><Stat label="Reputation" value={`${label.reputation.toFixed(0)}/100`} sub={`can sign artists up to ${fameCap(label.reputation, player ? blendedFame(player) : 0)} fame`} /></Panel>
        <Panel className="p-4"><Stat label="Roster" value={`${label.roster.length}/${rosterLimit(label.reputation)}`} sub="grows with reputation" /></Panel>
        <Panel className="p-4">
          <Stat label="This month" value={<span className={label.monthRevenue - label.monthCosts < 0 ? 'text-fall' : 'text-rise'}>{money(label.monthRevenue - label.monthCosts)}</span>}
            sub={last ? `last month ${money(last.profit)}` : 'first statement on the 1st'} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Panel className="lg:col-span-3 p-4">
          <div className="text-[13px] font-semibold text-ink mb-3">Needs your attention</div>
          {alerts.length === 0 ? (
            <div className="text-[12px] text-ink3">Nothing waiting on you. {label.roster.length === 0 ? 'Go find some artists in Scouting.' : 'The artists are writing; the office is running.'}</div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 8).map((a, i) => (
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
              {catalog.slice(0, 10).map((s) => (
                <button key={s.id} onClick={() => openSong(s.id)} className="w-full flex items-center gap-3 py-2 text-left hover:bg-white/[0.02]">
                  <Artwork seed={`song|${s.id}`} title={s.title} size={36} rounded={8} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink truncate">{s.title}{s.streamWeight !== undefined ? <span className="text-ink3 text-[11px]"> · album cut</span> : null}</div>
                    <div className="text-[11px] text-ink3 truncate">{s.ownerName} · quality {s.quality}{s.hasVideo ? ' · 🎬' : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-ink num">{compact(nums[s.id]?.week ?? 0)}/wk</div>
                    <div className="text-[10px] text-ink3 num">{compact(nums[s.id]?.lifetime ?? 0)} total</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-2 p-4">
          <div className="text-[13px] font-semibold text-ink mb-3">Label diary</div>
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {label.events.slice(0, 40).map((e, i) => (
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

// ─── A&R: THE DEMO INBOX ───────────────────────────────────────────────────

function SubmissionCard({ sub, label }: { sub: LabelSubmission; label: PlayerLabel }) {
  const store = useGameStore();
  const [msg, setMsg] = useState<Msg>(null);
  const today = dateToSerial(store.gameDate);
  const s = label.roster.find((x) => x.npcId === sub.npcId);
  const wait = today - sub.submittedSerial;
  const arSkill = staffSkill(label.staff, 'ar');
  const selfFunded = !!s && (s.terms.allIn || s.terms.dealType === 'distribution');
  const tiers = Object.keys(RELEASE_TIERS) as LabelReleaseTier[];
  return (
    <Panel className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Artwork seed={`demo|${sub.id}`} title={sub.title} size={48} rounded={10} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-ink">"{sub.title}"</span>
            <Tag tone={sub.kind === 'album' ? 'new' : 'accent'}>{sub.kind === 'album' ? `Album · ${sub.trackCount} tracks` : 'Single'}</Tag>
            {sub.reworks > 0 && <Tag tone="muted">Version {sub.reworks + 1}</Tag>}
          </div>
          <div className="text-[12px] text-ink3">{sub.name}{s ? ` · fame ${s.fame.toFixed(0)} · ${moodWord(s.mood).toLowerCase()}` : ''}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('text-[22px] font-bold num', sub.estimate >= 65 ? 'text-rise' : sub.estimate >= 48 ? 'text-amber' : 'text-fall')}>{sub.estimate}</div>
          <div className="text-[10px] text-ink3">{arSkill > 0 ? `A&R estimate (±${Math.round((100 - arSkill) / 6)})` : 'office guess (±18)'}</div>
        </div>
      </div>
      <div className="text-[12px] text-ink2 italic">“{sub.pitch}”</div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink3">Asking for a <b className="text-ink2">{RELEASE_TIERS[sub.askTier].label.toLowerCase()}</b>{selfFunded ? (s?.terms.allIn ? ` · paid from their fund (${money(s.fund)} left)` : ' · they pay') : ''}</span>
        <span className={cn(wait > SUBMISSION_PATIENCE_DAYS ? 'text-fall' : 'text-ink3')}>
          {wait} day{wait === 1 ? '' : 's'} waiting{wait > SUBMISSION_PATIENCE_DAYS ? ` · leaks in ~${Math.max(0, LEAK_DAYS - wait)}d` : ''}
        </span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {tiers.map((t) => {
          const plan = sessionPlan({ kind: sub.kind, tier: t, studio: label.studio, staff: label.staff, marketingCommit: s && !s.terms.allIn ? s.terms.marketingCommit : 0 });
          const cost = plan.recording + plan.marketing;
          const asked = t === sub.askTier;
          return (
            <button key={t}
              disabled={!selfFunded && label.cash < cost}
              onClick={() => { const r = store.answerLabelSubmission(sub.id, 'approve', t); setMsg({ ok: r.ok, text: r.message }); }}
              className={cn('text-left rounded-[9px] border p-2 disabled:opacity-40 hover:bg-cardhover', asked ? 'border-amber bg-amber/5' : 'border-line bg-card')}>
              <div className="text-[12px] font-semibold text-ink">Approve · {RELEASE_TIERS[t].label}{asked ? ' ★' : ''}</div>
              <div className="text-[11px] text-amber num">{selfFunded ? 'their money' : money(cost)} · {plan.days}d · +{Math.round(plan.qualityBonus)} quality</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant="secondary" onClick={() => { const r = store.answerLabelSubmission(sub.id, 'rework'); setMsg({ ok: r.ok, text: r.message }); }}>Send back for another pass</Button>
        <Button size="sm" variant="ghost" onClick={() => { const r = store.answerLabelSubmission(sub.id, 'reject'); setMsg({ ok: r.ok, text: r.message }); }}>Shelve it</Button>
        <span className="text-[10px] text-ink3">Approving less than they asked for upsets them; more makes their day.</span>
      </div>
      <Flash msg={msg} />
    </Panel>
  );
}

function AR({ label }: { label: PlayerLabel }) {
  const store = useGameStore();
  const today = dateToSerial(store.gameDate);
  const pending = label.submissions.filter((x) => x.status === 'pending');
  const working = label.submissions.filter((x) => x.status === 'reworking');
  const recent = label.submissions.filter((x) => x.status !== 'pending' && x.status !== 'reworking').slice(0, 12);
  const pol = label.policy;
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {pending.length === 0 ? (
          <Panel>
            <EmptyState title="No demos waiting" body={label.roster.length ? 'Your artists are writing. New pitches land here — and in the Mailbox.' : 'Sign some artists first. They will start pitching within a couple of weeks.'} />
          </Panel>
        ) : (
          pending.map((sub) => <SubmissionCard key={sub.id} sub={sub} label={label} />)
        )}
        {working.length > 0 && (
          <Panel className="p-4">
            <div className="text-[13px] font-semibold text-ink mb-2">Being reworked</div>
            {working.map((w) => (
              <div key={w.id} className="text-[12px] text-ink2 flex justify-between py-1">
                <span>{w.name} — "{w.title}"</span>
                <span className="text-ink3">back in {Math.max(0, (w.dueSerial ?? today) - today)}d</span>
              </div>
            ))}
          </Panel>
        )}
        {recent.length > 0 && (
          <Panel className="p-4">
            <div className="text-[13px] font-semibold text-ink mb-2">Recent decisions</div>
            {recent.map((r) => (
              <div key={r.id} className="text-[12px] flex justify-between py-1 gap-2">
                <span className="text-ink2 truncate">{r.name} — "{r.title}"{r.kind === 'album' ? ' (album)' : ''}</span>
                <span className={cn('shrink-0', r.status === 'leaked' || r.status === 'rejected' ? 'text-fall' : 'text-rise')}>
                  {r.status === 'approved' ? (r.auto ? 'auto-approved' : 'approved') : r.status}
                </span>
              </div>
            ))}
          </Panel>
        )}
      </div>

      <Panel className="p-4 space-y-4 h-fit">
        <div>
          <div className="text-[13px] font-semibold text-ink">Office rules</div>
          <div className="text-[11px] text-ink3">How the office handles demos when you are not around. Artists with creative control and distribution deals never ask.</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Approvals</div>
          <div className="flex flex-col gap-1.5">
            {([['manual', 'I decide every demo'], ['good', 'Auto-approve good demos'], ['all', 'Auto-approve everything']] as const).map(([id, text]) => (
              <button key={id} onClick={() => store.setLabelPolicy({ approve: id })}
                className={cn('text-left px-3 py-2 rounded-[9px] border text-[12px]', pol.approve === id ? 'border-amber bg-amber/10 text-amber' : 'border-line text-ink2')}>
                {text}
              </button>
            ))}
          </div>
        </div>
        {pol.approve === 'good' && (
          <div>
            <div className="flex justify-between text-[11px] text-ink3 mb-1"><span>"Good" means an estimate of at least</span><b className="text-ink num">{pol.threshold}</b></div>
            <input type="range" min={35} max={85} value={pol.threshold} onChange={(e) => store.setLabelPolicy({ threshold: Number(e.target.value) })} className="w-full accent-amber-400" />
          </div>
        )}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Budget for auto-approved records</div>
          <Select value={pol.tier} onChange={(v) => store.setLabelPolicy({ tier: v as typeof pol.tier })}
            options={[{ value: 'ask', label: 'Whatever the artist asks' }, ...(Object.keys(RELEASE_TIERS) as LabelReleaseTier[]).map((t) => ({ value: t, label: RELEASE_TIERS[t].label }))]} />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Music videos (label-funded singles)</div>
          <Select value={pol.videos} onChange={(v) => store.setLabelPolicy({ videos: v as typeof pol.videos })}
            options={[{ value: 'manual', label: 'Only when I order one' }, { value: 'hits', label: 'For singles rated 65+' }, { value: 'all', label: 'For every single' }]} />
          <div className="text-[10px] text-ink3 mt-1">Videos promised in a contract are always shot. All-in artists shoot their own.</div>
        </div>
      </Panel>
    </div>
  );
}

// ─── ROSTER ────────────────────────────────────────────────────────────────

function SigneeCard({ s, label, go }: { s: LabelSignee; label: PlayerLabel; go: (t: Tab) => void }) {
  const store = useGameStore();
  const { gameDate, openSong, setScreen, selectNPC } = store;
  const [msg, setMsg] = useState<Msg>(null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const today = dateToSerial(gameDate);
  const st = signeeLabel(s);
  const arSkill = staffSkill(label.staff, 'ar');
  const nums = useSongNumbers(s.releases.slice(-6));
  const songs = useMemo(() => s.releases.slice(-6).reverse().map((id) => (store.npcSongs as Song[]).find((x) => x.id === id)).filter(Boolean) as Song[], [s.releases, store.npcSongs]);
  const act = (r: { ok: boolean; message: string }) => setMsg({ ok: r.ok, text: r.message });
  const daysLeft = Math.max(0, s.endsSerial - today);
  const legalSkill = staffSkill(label.staff, 'legal');
  const line = pipelineLine(s, label, today);
  const hasPending = label.submissions.some((x) => x.npcId === s.npcId && x.status === 'pending');
  const optionsLeft = s.terms.optionYears - s.optionsUsed;
  const est = potentialEstimate(s.potential, arSkill, s.npcId);

  return (
    <Panel className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Artwork seed={`artist|${s.npcId}`} title={s.name} size={52} rounded={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { selectNPC(s.npcId); setScreen('npc_profile'); }} className="text-[16px] font-bold text-ink hover:underline truncate">{s.name}</button>
            <Tag tone={st.tone === 'good' ? 'up' : st.tone === 'bad' ? 'down' : 'muted'}>{st.text}</Tag>
            {s.terms.allIn && <Tag tone="new">All-in</Tag>}
            {s.terms.creativeControl && <Tag tone="accent">Creative control</Tag>}
          </div>
          <div className="text-[12px] text-ink3">{genreLabel(s.genre)} · {s.country} · {DEAL_INFO[s.terms.dealType].label}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[18px] font-bold text-ink num">{s.fame.toFixed(0)}</div>
          <div className="text-[10px] text-ink3">fame (signed at {s.fameAtSigning.toFixed(0)})</div>
        </div>
      </div>

      <button onClick={() => hasPending && go('ar')} className={cn('w-full text-left rounded-[10px] px-3 py-2 text-[12px] border',
        line.tone === 'up' ? 'bg-rise/10 border-rise/30 text-rise' : line.tone === 'amber' ? 'bg-amber/10 border-amber/30 text-amber' : line.tone === 'down' ? 'bg-fall/10 border-fall/30 text-fall' : 'bg-sidebar border-line text-ink2')}>
        {line.text}{hasPending ? ' → A&R' : ''}
      </button>
      {s.videoShoot && <div className="text-[12px] text-ink2">🎬 Shooting a video — premieres in {Math.max(0, s.videoShoot.until - today)} days.</div>}

      <div className="grid grid-cols-2 gap-3">
        <Meter label="Mood" value={s.mood} color={moodColor(s.mood)} right={moodWord(s.mood)} />
        <Meter label="Loyalty" value={s.loyalty} color="#4DA3FF" />
        {est !== undefined && <Meter label="Ceiling (A&R estimate)" value={est} color="#B57BFF" right={`~${est}`} />}
        <Meter label="Owed: singles · albums" value={((s.releasesDelivered + s.albumsDelivered * 3) / Math.max(1, s.terms.releasesOwed + s.terms.albumsOwed * 3)) * 100} color="#FFB800"
          right={`${s.releasesDelivered}/${s.terms.releasesOwed} · ${s.albumsDelivered}/${s.terms.albumsOwed}`} />
        {s.terms.allIn && <Meter label="Recording fund left" value={(s.fund / Math.max(1, s.terms.recordingFund)) * 100} color="#00D1C1" right={money(s.fund)} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Royalty</div><div className="text-ink num">{s.terms.royalty}%{s.terms.publishingShare ? ` · pub ${s.terms.publishingShare}%` : ''}</div></div>
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Unrecouped</div><div className={cn('num', s.recoupBalance > 0 ? 'text-amber' : 'text-rise')}>{s.recoupBalance > 0 ? money(s.recoupBalance) : 'Recouped'}</div></div>
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Label earned</div><div className="text-ink num">{money(s.labelEarned)}</div></div>
        <div className="bg-sidebar rounded-[9px] p-2"><div className="text-ink3">Deal ends</div><div className="text-ink num">{s.status === 'expiring' ? 'Now' : `${Math.round(daysLeft / 30)} mo`}{optionsLeft > 0 ? ` +${optionsLeft} opt` : ''}</div></div>
      </div>

      {s.terms.allIn && s.status !== 'dispute' && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-ink3">Top up their fund (recoupable):</span>
          {[10_000, 50_000].map((amt) => (
            <Button key={amt} size="sm" variant="secondary" disabled={label.cash < amt} onClick={() => act(store.topUpLabelFund(s.npcId, amt))}>+{money(amt)}</Button>
          ))}
        </div>
      )}
      {!s.terms.allIn && s.terms.dealType !== 'distribution' && s.status === 'active' && !s.inStudio && !hasPending && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-ink3">Don't wait for a demo — commission one:</span>
          {(Object.keys(RELEASE_TIERS) as LabelReleaseTier[]).map((t) => {
            const p = sessionPlan({ kind: 'single', tier: t, studio: label.studio, staff: label.staff, marketingCommit: s.terms.marketingCommit });
            return <Button key={t} size="sm" variant="ghost" onClick={() => act(store.fundLabelRelease(s.npcId, t))}>{RELEASE_TIERS[t].label} · {money(p.recording + p.marketing)}</Button>;
          })}
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
        <div className="rounded-[10px] bg-sidebar border border-line p-3 space-y-2">
          <div className="text-[12px] text-ink2">📝 The deal is up. Renewal talks are open in Deals.{optionsLeft > 0 ? ` Or exercise one of your ${optionsLeft} option year${optionsLeft === 1 ? '' : 's'}: 12 more months on the same terms, whether they like it or not.` : ''}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => go('deals')}>Open renewal talks</Button>
            {optionsLeft > 0 && <Button size="sm" onClick={() => act(store.exerciseLabelOption(s.npcId))}>Exercise option year</Button>}
          </div>
        </div>
      )}

      {songs.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Latest releases</div>
          <div className="divide-y divide-line">
            {songs.slice(0, 5).map((song) => (
              <div key={song.id} className="flex items-center gap-2 py-1.5">
                <button onClick={() => openSong(song.id)} className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] text-ink truncate hover:underline">{song.title}{song.hasVideo ? ' 🎬' : ''}</div>
                  <div className="text-[10px] text-ink3 num">{compact(nums[song.id]?.week ?? 0)}/wk · {compact(nums[song.id]?.lifetime ?? 0)} total · Q{song.quality}</div>
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
        <EmptyState title="No artists yet" body="Your scouts have a list of unsigned acts your label can reach. Make someone an offer."
          action={<Button onClick={() => go('scouting')}>Open Scouting</Button>} />
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid xl:grid-cols-2 gap-4">
        {label.roster.map((s) => <SigneeCard key={s.npcId} s={s} label={label} go={go} />)}
      </div>
      {label.alumni.length > 0 && (
        <Panel className="p-4">
          <div className="text-[13px] font-semibold text-ink mb-2">Former artists</div>
          <div className="flex flex-wrap gap-2">
            {label.alumni.map((s, i) => (
              <span key={`${s.npcId}-${i}`} className="text-[11px] px-2 py-1 rounded-full bg-sidebar border border-line text-ink2">
                {s.name} · {signeeLabel(s).text.toLowerCase()} · {s.releases.length} track{s.releases.length === 1 ? '' : 's'}
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
  const [allIn, setAllIn] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const today = dateToSerial(gameDate);
  const byId = useMemo(() => {
    const ids = new Set(label.prospects.map((p) => p.npcId));
    const m = new Map<string, NPC>();
    for (const n of npcs as NPC[]) if (ids.has(n.id)) m.set(n.id, n);
    return m;
  }, [npcs, label.prospects]);
  const cap = player ? fameCap(label.reputation, blendedFame(player)) : 0;
  const full = label.roster.length >= rosterLimit(label.reputation);
  const nextIn = Math.max(0, PROSPECT_REFRESH_DAYS - (today - label.prospectsSerial));

  return (
    <div className="space-y-4">
      <Panel className="p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="text-[12px] text-ink2 max-w-md">
          Your label can reach artists up to <b className="text-ink">{cap} fame</b>.{' '}
          {staffSkill(label.staff, 'ar') > 0 ? 'Your A&R scouts abroad too and estimates ceilings.' : 'Hire a Head of A&R to scout abroad and estimate each act\'s ceiling.'}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={deal} onChange={(v) => setDeal(v as LabelDealType)} className="w-56"
            options={DEAL_ORDER.map((d) => ({ value: d, label: `${DEAL_INFO[d].emoji} ${DEAL_INFO[d].label}` }))} />
          {deal !== 'distribution' && (
            <button onClick={() => setAllIn(!allIn)} className={cn('h-10 px-3 rounded-[10px] border text-[12px] font-semibold', allIn ? 'border-amber bg-amber/10 text-amber' : 'border-line text-ink2')}>
              {allIn ? '✓ All-in fund' : 'All-in fund?'}
            </button>
          )}
          <Button size="sm" variant="secondary" disabled={nextIn > 0} onClick={() => { const r = store.refreshLabelProspects(); setMsg({ ok: r.ok, text: r.message }); }}>
            {nextIn > 0 ? `New report in ${nextIn}d` : 'New report'}
          </Button>
        </div>
      </Panel>
      <div className="text-[11px] text-ink3 -mt-2 px-1">
        {DEAL_INFO[deal].blurb}{allIn && deal !== 'distribution' ? ' All-in: you pay one big recording fund up front; they pay for their own sessions, videos and marketing out of it and release on their own schedule.' : ''}
      </div>
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
                  <Button size="sm" disabled={full}
                    onClick={() => {
                      const r = store.openLabelPitch(n.id, deal, allIn && deal !== 'distribution');
                      setMsg({ ok: r.ok, text: r.message });
                      if (r.ok) {
                        const fresh = useGameStore.getState().label?.pitches.find((x) => x.npcId === n.id && x.status === 'open');
                        if (fresh) { setPitch(fresh.id); go('deals'); }
                      }
                    }}>
                    Make an offer{allIn && deal !== 'distribution' ? ' (all-in)' : ''}
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
        <span className="min-w-[104px] text-center text-[13px] font-semibold text-ink num">{value}</span>
        <button onClick={onInc} disabled={disabled} className="w-7 h-7 rounded-[8px] bg-sidebar border border-line text-ink font-bold disabled:opacity-40">+</button>
      </div>
    </div>
  );
}

function Toggle({ label, sub, on, onChange, disabled }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
      <div>
        <div className="text-[12px] text-ink2">{label}</div>
        {sub && <div className="text-[10px] text-ink3">{sub}</div>}
      </div>
      <button disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on}
        className={cn('w-12 h-7 rounded-full border transition relative shrink-0', on ? 'bg-amber border-amber' : 'bg-card border-line')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', on ? 'left-6' : 'left-0.5')} />
      </button>
    </div>
  );
}

function step(n: number, base: number): number {
  return Math.max(250, Math.round((Math.max(n, base) * 0.08) / 250) * 250);
}

function Negotiation({ pitch, label, onClose }: { pitch: LabelPitch; label: PlayerLabel; onClose: () => void }) {
  const store = useGameStore();
  const ctx = store.labelPitchContext(pitch.id);
  const today = dateToSerial(store.gameDate);
  const [ask, setAsk] = useState<LabelTerms>(normalizeTerms(pitch.terms));
  const [reply, setReply] = useState<Msg>(pitch.lastReply ? { ok: true, text: pitch.lastReply } : null);
  if (!ctx) return null;
  const open = pitch.status === 'open';
  const terms = normalizeTerms(pitch.terms);
  const changed = JSON.stringify(ask) !== JSON.stringify(terms);
  const mood = MOOD_INFO[ctx.mood];
  const arche = ARCHETYPE_LABEL[archetypeOf(ctx.npc)];
  const [lo, hi] = DEAL_INFO[ask.dealType].royaltyRange;
  const advStep = step(ask.advance, 2000);
  const fundStep = step(ask.recordingFund, 10000);
  const agreed = !!pitch.agreedTerms && JSON.stringify(normalizeTerms(pitch.agreedTerms)) === JSON.stringify(ask);
  const due = signingCost(ask);
  const canSign = open && !changed && agreed && label.cash >= due;
  const set = (patch: Partial<LabelTerms>) => setAsk({ ...ask, ...patch });
  const used = pitch.usedTactics ?? [];

  const send = () => {
    const r = store.counterLabelPitch(pitch.id, ask);
    setReply({ ok: r.outcome === 'accepted' || r.outcome === 'countered', text: r.message });
    const fresh = useGameStore.getState().label?.pitches.find((p) => p.id === pitch.id);
    if (fresh) setAsk(normalizeTerms(fresh.terms));
  };
  const tactic = (t: LabelTactic) => {
    const r = store.labelTactic(pitch.id, t);
    setReply({ ok: r.ok || r.outcome === 'accepted', text: r.message + (r.outcome === 'accepted' ? ' Sign it before they change their mind.' : '') });
    const fresh = useGameStore.getState().label?.pitches.find((p) => p.id === pitch.id);
    if (fresh) setAsk(normalizeTerms(fresh.terms));
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <Panel className="lg:col-span-3 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Artwork seed={`artist|${ctx.npc.id}`} title={ctx.npc.name} size={44} rounded={22} />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink3">{pitch.renewal ? 'Contract renewal' : 'Record deal'}{ctx.npc.team?.managerName ? ` · across the table: their manager ${ctx.npc.team.managerName}` : ''}</div>
              <div className="text-[18px] font-bold text-ink">{pitch.name}</div>
              <div className="text-[11px] text-ink3">fame {ctx.npc.fame.toFixed(0)} · {genreLabel(ctx.npc.genre)} · {ctx.npc.country}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[12px] text-ink3 hover:text-ink">← All deals</button>
        </div>

        {pitch.competing && open && (
          <div className="rounded-[10px] bg-fall/10 border border-fall/30 px-3 py-2 text-[12px] text-fall">🦈 {pitch.competing} is also chasing {pitch.name}. They will not wait long.</div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {DEAL_ORDER.map((d) => (
            <button key={d} disabled={!open}
              onClick={() => {
                const [l, h] = DEAL_INFO[d].royaltyRange;
                set({ dealType: d, allIn: d === 'distribution' ? false : ask.allIn, touringShare: d === 'three_sixty' ? Math.max(ask.touringShare, 20) : 0,
                  royalty: Math.max(l, Math.min(h, d === pitch.wants.dealType ? pitch.wants.royalty - 3 : Math.round((l + h) / 2) - 5)) });
              }}
              className={cn('px-2.5 h-8 rounded-full border text-[11px] font-semibold', ask.dealType === d ? 'bg-amber/15 border-amber text-amber' : 'bg-card border-line text-ink2')}>
              {DEAL_INFO[d].emoji} {DEAL_INFO[d].label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-ink3">{DEAL_INFO[ask.dealType].blurb}</div>

        <div className="bg-sidebar border border-line rounded-[12px] px-3">
          <div className="text-[10px] uppercase tracking-wider text-ink3 pt-2.5">Money</div>
          <Stepper label="Advance" sub="Their personal money, paid today. Recoupable." value={money(ask.advance)} disabled={!open}
            onDec={() => set({ advance: Math.max(0, ask.advance - advStep) })} onInc={() => set({ advance: ask.advance + advStep })} />
          {ask.dealType !== 'distribution' && (
            <Toggle label="All-in deal" sub="One recording fund; they pay their own sessions, videos, features and marketing." on={ask.allIn} disabled={!open}
              onChange={(v) => set({ allIn: v, recordingFund: v ? Math.max(ask.recordingFund, pitch.wants.recordingFund ? Math.round(pitch.wants.recordingFund * 0.8 / 1000) * 1000 : 50_000) : 0, marketingCommit: v ? 0 : ask.marketingCommit, videoBudget: v ? 0 : ask.videoBudget })} />
          )}
          {ask.allIn && (
            <Stepper label="Recording fund" sub="Paid today. Recoupable. Whatever they don't spend, they keep working with." value={money(ask.recordingFund)} disabled={!open}
              onDec={() => set({ recordingFund: Math.max(0, ask.recordingFund - fundStep) })} onInc={() => set({ recordingFund: ask.recordingFund + fundStep })} />
          )}
          <Stepper label="Signing bonus" sub="Not recoupable. A sweetener." value={money(ask.signingBonus)} disabled={!open}
            onDec={() => set({ signingBonus: Math.max(0, ask.signingBonus - 1000) })} onInc={() => set({ signingBonus: ask.signingBonus + 1000 })} />
          <Stepper label="Artist royalty" sub={`${lo}–${hi}% on this kind of deal`} value={`${ask.royalty}%`} disabled={!open}
            onDec={() => set({ royalty: Math.max(lo, ask.royalty - 1) })} onInc={() => set({ royalty: Math.min(hi, ask.royalty + 1) })} />
          <Stepper label="Publishing share" sub="Extra income for you. Artists hate giving it up." value={`${ask.publishingShare}%`} disabled={!open}
            onDec={() => set({ publishingShare: Math.max(0, ask.publishingShare - 5) })} onInc={() => set({ publishingShare: Math.min(50, ask.publishingShare + 5) })} />
          {ask.dealType === 'three_sixty' && (
            <Stepper label="Touring & merch cut" value={`${ask.touringShare}%`} disabled={!open}
              onDec={() => set({ touringShare: Math.max(5, ask.touringShare - 5) })} onInc={() => set({ touringShare: Math.min(35, ask.touringShare + 5) })} />
          )}

          <div className="text-[10px] uppercase tracking-wider text-ink3 pt-3">Commitment</div>
          <Stepper label="Singles owed" value={ask.releasesOwed} disabled={!open}
            onDec={() => set({ releasesOwed: Math.max(1, ask.releasesOwed - 1) })} onInc={() => set({ releasesOwed: Math.min(12, ask.releasesOwed + 1) })} />
          <Stepper label="Albums owed" value={ask.albumsOwed} disabled={!open}
            onDec={() => set({ albumsOwed: Math.max(0, ask.albumsOwed - 1) })} onInc={() => set({ albumsOwed: Math.min(4, ask.albumsOwed + 1) })} />
          <Stepper label="Term" value={`${ask.termMonths} months`} disabled={!open}
            onDec={() => set({ termMonths: Math.max(12, ask.termMonths - 6) })} onInc={() => set({ termMonths: Math.min(72, ask.termMonths + 6) })} />
          <Stepper label="Option years" sub="You may extend 12 months at a time, on these terms." value={ask.optionYears} disabled={!open}
            onDec={() => set({ optionYears: Math.max(0, ask.optionYears - 1) })} onInc={() => set({ optionYears: Math.min(3, ask.optionYears + 1) })} />

          {!ask.allIn && ask.dealType !== 'distribution' && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-ink3 pt-3">What you promise</div>
              <Stepper label="Marketing per release" value={money(ask.marketingCommit)} disabled={!open}
                onDec={() => set({ marketingCommit: Math.max(0, ask.marketingCommit - 250) })} onInc={() => set({ marketingCommit: ask.marketingCommit + 250 })} />
              <Stepper label="Video budget per single" sub="Contracted — the label must pay it." value={money(ask.videoBudget)} disabled={!open}
                onDec={() => set({ videoBudget: Math.max(0, ask.videoBudget - 2500) })} onInc={() => set({ videoBudget: ask.videoBudget + 2500 })} />
            </>
          )}
          <Toggle label="Creative control" sub="They release what they want, without asking you." on={ask.creativeControl} disabled={!open} onChange={(v) => set({ creativeControl: v })} />
        </div>

        {reply && (
          <div className={cn('rounded-[10px] px-3 py-2 text-[12px] border', reply.ok ? 'bg-rise/10 border-rise/30 text-ink' : 'bg-fall/10 border-fall/30 text-ink')}>{reply.text}</div>
        )}

        {open ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={send} disabled={!changed && pitch.rounds > 0}>{pitch.rounds === 0 && !changed ? 'Send opening offer' : 'Send offer'}</Button>
              <Button variant="secondary" disabled={!canSign} onClick={() => { const r = store.signLabelPitch(pitch.id); setReply({ ok: r.ok, text: r.message }); }}>
                Sign · {money(due)} today
              </Button>
              <Button variant="ghost" onClick={() => { store.withdrawLabelPitch(pitch.id); onClose(); }}>Walk away</Button>
            </div>
            {!agreed && !changed && pitch.rounds > 0 && <div className="text-[11px] text-ink3">They have not agreed to this yet. Change something and send it, or try a tactic.</div>}
            {open && label.cash < due && <div className="text-[11px] text-fall">Signing costs {money(due)} today and the label has {money(label.cash)}. Deposit from the Money tab.</div>}
          </div>
        ) : (
          <div className="text-[12px] text-ink3">These talks are closed ({pitch.status}).</div>
        )}
      </Panel>

      <div className="lg:col-span-2 space-y-4">
        <Panel className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-ink">Reading the room</div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="bg-sidebar rounded-[9px] p-2"><div className="text-[10px] text-ink3">Type</div><div className="text-ink">{arche.emoji} {arche.label}</div><div className="text-[10px] text-ink3">{arche.blurb}</div></div>
            <div className="bg-sidebar rounded-[9px] p-2"><div className="text-[10px] text-ink3">Today</div><div className="text-ink">{mood.emoji} {mood.label}</div><div className="text-[10px] text-ink3">{mood.hint}</div></div>
          </div>
          <Meter label="Your leverage" value={ctx.leverage} color={ctx.leverage >= 60 ? '#2ED573' : ctx.leverage >= 40 ? '#FFB800' : '#FF4757'} right={ctx.leverage >= 60 ? 'You hold the cards' : ctx.leverage >= 40 ? 'Even' : 'They hold the cards'} />
          <div className="text-[11px] text-ink3">Your table skill: {ctx.negotiator}/100 (business sense + your manager).</div>
          {ctx.temperature && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-ink3">Temperature:</span>
              <Tag tone={ctx.temperature.tone === 'good' ? 'up' : ctx.temperature.tone === 'bad' ? 'down' : 'amber'}>{ctx.temperature.label}</Tag>
            </div>
          )}
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

        {open && (
          <Panel className="p-4 space-y-2">
            <div className="text-[13px] font-semibold text-ink">Table tactics</div>
            {(Object.keys(TACTIC_INFO) as LabelTactic[]).map((t) => {
              const info = TACTIC_INFO[t];
              const once = t === 'vision' || t === 'personal' || t === 'hardball';
              const spent = once && used.includes(t);
              return (
                <button key={t} disabled={spent || (t === 'personal' && ctx.energy < 25)} onClick={() => tactic(t)}
                  className="w-full text-left rounded-[10px] border border-line bg-sidebar hover:bg-cardhover px-3 py-2 disabled:opacity-40">
                  <div className="text-[12px] font-semibold text-ink">{info.emoji} {info.label}{spent ? ' · used' : ''}{t === 'personal' ? ' · 25 energy' : ''}</div>
                  <div className="text-[10px] text-ink3">{info.blurb}</div>
                </button>
              );
            })}
          </Panel>
        )}

        <Panel className="p-4 space-y-2">
          <div className="text-[13px] font-semibold text-ink">⚖️ What you know</div>
          {(pitch.revealed ?? []).length > 0 && (
            <ul className="text-[12px] text-ink space-y-1">{(pitch.revealed ?? []).map((n, i) => <li key={i}>• They said they want {n}.</li>)}</ul>
          )}
          {ctx.lawyerNotes.length === 0 ? (
            <div className="text-[12px] text-ink3">No lawyer on this. Hire Business Affairs at the label (or a lawyer on your team) to learn what they really want.</div>
          ) : (
            <ul className="text-[12px] text-ink2 space-y-1">{ctx.lawyerNotes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
          )}
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
                <div className="text-[14px] font-semibold text-ink truncate">{p.name} {p.renewal && <Tag tone="amber">Renewal</Tag>} {normalizeTerms(p.terms).allIn && <Tag tone="new">All-in</Tag>}</div>
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

// ─── STUDIO ────────────────────────────────────────────────────────────────

function Studio({ label, go }: { label: PlayerLabel; go: (t: Tab) => void }) {
  const store = useGameStore();
  const [msg, setMsg] = useState<Msg>(null);
  const tier = STUDIO_TIERS[label.studio.tier];
  const next = STUDIO_TIERS[label.studio.tier + 1];
  const fx = studioEffects(label.studio, label.staff);
  const rent = studioRent(label.studio, label.reputation);
  const cap = gearCap(label.studio.tier);
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink3">Your building</div>
              <div className="text-[20px] font-bold text-ink">{tier.name}</div>
              <div className="text-[12px] text-ink2 max-w-md">{tier.blurb}</div>
            </div>
            <div className="text-[34px]">{['🏚️', '🛏️', '🎚️', '🏢', '🏟️'][label.studio.tier]}</div>
          </div>
          <div className="flex gap-1">
            {STUDIO_TIERS.map((_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= label.studio.tier ? 'bg-amber' : 'bg-white/5')} />)}
          </div>
          {next ? (
            <div className="rounded-[10px] bg-sidebar border border-line p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-ink">Next: {next.name}</div>
                <div className="text-[11px] text-ink3">{next.blurb}</div>
                <div className="text-[11px] text-ink2 mt-1">Sessions {Math.round(next.costCut * 100)}% cheaper · +{next.quality} quality · upkeep {money(next.upkeep)}/mo{next.rent ? ` · rents for up to ${money(next.rent)}/mo` : ''}</div>
              </div>
              <Button disabled={label.cash < next.cost} onClick={() => { const r = store.upgradeLabelStudio(); setMsg({ ok: r.ok, text: r.message }); }}>Build · {money(next.cost)}</Button>
            </div>
          ) : (
            <div className="text-[12px] text-rise">This is the best room in the country.</div>
          )}
          <Flash msg={msg} />
        </Panel>

        <Panel className="p-5 space-y-3">
          <div className="text-[13px] font-semibold text-ink">What it does for your records</div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Quality" value={`+${fx.quality}`} sub="on every session" />
            <Stat label="Session cost" value={`${Math.round((1 - fx.costMult) * 100)}% off`} sub="recording only" />
            <Stat label="Speed" value={`${Math.round((1 - fx.daysMult) * 100)}% faster`} sub="days in the room" />
            <Stat label="Upkeep" value={`${money(fx.upkeep)}/mo`} sub={rent ? `rent ~${money(rent)}/mo` : 'no rent income'} />
          </div>
          <div className="text-[11px] text-ink3">
            {staffSkill(label.staff, 'engineer') > 0 ? 'Your engineer is running the room.' : 'No engineer — hire one in Staff for faster, cleaner sessions.'}{' '}
            {staffSkill(label.staff, 'producer') > 0 ? 'Your in-house producer is on every record.' : 'An in-house producer adds the most quality of anyone.'}
          </div>
          <Button size="sm" variant="secondary" onClick={() => go('staff')}>Staff →</Button>
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
        {GEAR_ORDER.map((g) => {
          const info = GEAR_INFO[g];
          const lvl = label.studio.gear[g] ?? 0;
          const atCap = lvl >= cap;
          const cost = lvl < 3 ? info.costs[lvl] : 0;
          return (
            <Panel key={g} className="p-4 flex flex-col gap-2">
              <div className="text-[24px]">{info.emoji}</div>
              <div className="text-[13px] font-semibold text-ink">{info.label}</div>
              <div className="text-[11px] text-ink3 flex-1">{info.does}</div>
              <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < lvl ? 'bg-amber' : 'bg-white/5')} />)}</div>
              {lvl >= 3 ? (
                <div className="text-[11px] text-rise">Maxed</div>
              ) : (
                <Button size="sm" variant="secondary" disabled={atCap || label.cash < cost}
                  onClick={() => { const r = store.buyLabelGear(g); setMsg({ ok: r.ok, text: r.message }); }}>
                  {atCap ? (label.studio.tier === 0 ? 'Needs a studio' : 'Needs a bigger room') : `Level ${lvl + 1} · ${money(cost)}`}
                </Button>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ─── STAFF ─────────────────────────────────────────────────────────────────

function Staff({ label }: { label: PlayerLabel }) {
  const store = useGameStore();
  const [msg, setMsg] = useState<Msg>(null);
  const [openRole, setOpenRole] = useState<LabelStaffRole | null>(null);
  const candidates = useMemo(() => (openRole ? store.labelStaffCandidates(openRole) : []), [openRole, label.staff.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <Flash msg={msg} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
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
      <div className="text-[11px] text-ink3 px-1">Salaries come out of the label's cash on the 1st of every month, with the office ({money(overheadFor(label))}/month at the current size) and the studio upkeep.</div>
    </div>
  );
}

// ─── MONEY ─────────────────────────────────────────────────────────────────

function Money({ label }: { label: PlayerLabel }) {
  const store = useGameStore();
  const [amount, setAmount] = useState('10000');
  const [msg, setMsg] = useState<Msg>(null);
  const hist = label.history.slice(-12);
  const peak = Math.max(1, ...hist.map((h) => Math.max(h.revenue, h.costs)));
  const life = [...label.roster, ...label.alumni].reduce((a, s) => a + s.labelEarned, 0);
  const salaries = label.staff.reduce((a, s) => a + s.salary, 0);
  const fx = studioEffects(label.studio, label.staff);
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
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric"
            className="w-full h-10 px-3 rounded-[10px] bg-sidebar border border-line text-ink text-[14px] num focus:outline-none focus:border-amber" />
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
          <Stat label="Fixed costs" value={`${money(salaries + overheadFor(label) + fx.upkeep)}/mo`} sub={`staff ${money(salaries)} · studio ${money(fx.upkeep)}`} />
        </Panel>
      </div>
    </div>
  );
}

// ─── THE PAGE ──────────────────────────────────────────────────────────────

export function LabelScreen() {
  const label = useGameStore((s) => s.label);
  const [tab, setTab] = useState<Tab>('overview');
  const [pitchId, setPitchId] = useState<string | null>(null);
  if (!label) return <FoundLabel />;
  // Saves from before v2 can briefly lack the new fields until the next tick.
  if (!label.submissions || !label.studio || !label.policy) {
    return <Panel><EmptyState title="Updating your label…" body="Advance the clock one day to finish moving your label to the new system." /></Panel>;
  }

  const openPitches = label.pitches.filter((p) => p.status === 'open').length;
  const pendingDemos = label.submissions.filter((x) => x.status === 'pending').length;
  const needs = label.roster.filter((s) => s.demand || s.rivalOffer || s.status === 'dispute' || s.status === 'expiring').length;
  const founded = formatMedium(serialToDate(label.foundedSerial));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Logo label={label} size={60} />
        <div className="flex-1 min-w-[180px]">
          <h1 className="text-[22px] md:text-[26px] font-bold text-ink leading-tight">{label.name}</h1>
          <div className="text-[12px] text-ink3">{label.country} · {label.genreFocus === 'any' ? 'All sounds' : genreLabel(label.genreFocus)} · since {founded} · {STUDIO_TIERS[label.studio.tier].name}</div>
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
            { id: 'ar', label: 'A&R', badge: pendingDemos ? `● ${pendingDemos}` : undefined },
            { id: 'scouting', label: 'Scouting' },
            { id: 'deals', label: 'Deals', badge: openPitches ? String(openPitches) : undefined },
            { id: 'studio', label: 'Studio' },
            { id: 'staff', label: 'Staff', badge: `${label.staff.length}/${STAFF_ORDER.length}` },
            { id: 'money', label: 'Money' },
          ]}
        />
      </div>

      {tab === 'overview' && <Overview label={label} go={setTab} />}
      {tab === 'roster' && <Roster label={label} go={setTab} />}
      {tab === 'ar' && <AR label={label} />}
      {tab === 'scouting' && <Scouting label={label} go={setTab} setPitch={setPitchId} />}
      {tab === 'deals' && <Deals label={label} pitchId={pitchId} setPitch={setPitchId} />}
      {tab === 'studio' && <Studio label={label} go={setTab} />}
      {tab === 'staff' && <Staff label={label} />}
      {tab === 'money' && <Money label={label} />}
    </div>
  );
}
