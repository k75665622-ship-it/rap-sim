import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import type { ShowOffer, OfferTerms, OfferBilling, OfferCancel, DeclineReason } from '../../types/game';
import { dateToSerial, serialToDate, formatMedium } from '../../sim/gameClock';
import {
  ARCHETYPE_LABEL,
  BILLING_LABEL,
  BILLING_ORDER,
  CANCEL_LABEL,
  DECLINE_REASONS,
  MOOD_INFO,
  backOutTerms,
} from '../../sim/offers';

const KIND_LABEL: Record<ShowOffer['kind'], string> = {
  headline: 'Headline show',
  invite: 'Invitation',
  festival: 'Festival slot',
  club_night: 'Club night',
};

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// ─── THE NEGOTIATION PAGE ──────────────────────────────────────────────────

function Negotiation({ offer, onClose }: { offer: ShowOffer; onClose: () => void }) {
  const { showOfferContext, counterShowOffer, acceptShowOffer, declineShowOffer, quoteDecline, gameDate } = useGameStore();
  const ctx = showOfferContext(offer.id);
  const today = dateToSerial(gameDate);

  const [ask, setAsk] = useState<OfferTerms>({ ...offer.terms });
  const [panel, setPanel] = useState<'none' | 'decline'>('none');
  const [reason, setReason] = useState<DeclineReason>('scheduling');
  const [soften, setSoften] = useState(false);
  const [reply, setReply] = useState<{ ok: boolean; text: string } | null>(null);

  if (!ctx) return null;
  const arche = ARCHETYPE_LABEL[offer.archetype];
  const mood = MOOD_INFO[ctx.mood];
  const hasLawyer = ctx.lawyerSkill > 0;
  const hasManager = ctx.managerSkill > 0;
  const closed = offer.status !== 'open';
  const changed = JSON.stringify(ask) !== JSON.stringify(offer.terms);

  const feeStep = Math.max(10, Math.round((offer.fair * 0.05) / 10) * 10);
  const patienceMax = 5;
  const quote = panel === 'decline' ? quoteDecline(offer.id, reason, soften) : null;

  const hiddenCancel = offer.hidden.includes('cancel') && !hasLawyer;
  const hiddenExcl = offer.hidden.includes('exclusivity') && !hasLawyer;

  // The manager's read on what will and will not move.
  const hint =
    offer.archetype === 'status'
      ? 'They will move on perks, not on billing.'
      : offer.archetype === 'business'
        ? 'They will move on the fee and splits, not on the cancellation terms.'
        : offer.archetype === 'creative'
          ? 'They will trade money for creative room — ask for slot time, not cash.'
          : 'They will deal on the fee, but they want to see loyalty.';

  const send = () => {
    const r = counterShowOffer(offer.id, ask);
    setReply({ ok: r.outcome !== 'refused' && r.outcome !== 'walked', text: r.message });
    if (r.outcome === 'walked') setTimeout(onClose, 1800);
    else if (r.outcome === 'accepted' || r.outcome === 'met_halfway') {
      const fresh = useGameStore.getState().showOffers.find((o) => o.id === offer.id);
      if (fresh) setAsk({ ...fresh.terms });
    }
  };

  const Stepper = ({ label, value, onDec, onInc, sub }: { label: string; value: string; onDec: () => void; onInc: () => void; sub?: string }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-800/80 last:border-0">
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onDec} disabled={closed} className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold disabled:opacity-40">−</button>
        <span className="min-w-[96px] text-center text-sm font-bold text-white tabular-nums">{value}</span>
        <button onClick={onInc} disabled={closed} className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold disabled:opacity-40">+</button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ── The term sheet ── */}
      <Card className="lg:col-span-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">{KIND_LABEL[offer.kind]}</div>
            <h3 className="text-lg font-bold text-white">{offer.venueName}</h3>
            <div className="text-xs text-gray-500">
              {offer.city}, {offer.country} · {formatMedium(serialToDate(offer.serial))} · {offer.capacity.toLocaleString()} capacity
            </div>
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-white">← Back</button>
        </div>

        <div className="bg-yellow-500/[0.07] border border-yellow-500/25 rounded-xl p-3 text-xs text-yellow-100/90">
          <b className="text-yellow-300">Why you:</b> {offer.reason}
        </div>

        <div className="bg-gray-950/60 border border-gray-800 rounded-xl px-3">
          <Stepper
            label="Guaranteed fee"
            sub={`Room is worth about ${money(offer.fair)}`}
            value={money(ask.fee)}
            onDec={() => setAsk({ ...ask, fee: Math.max(50, ask.fee - feeStep) })}
            onInc={() => setAsk({ ...ask, fee: ask.fee + feeStep })}
          />
          <Stepper
            label="Billing"
            value={BILLING_LABEL[ask.billing]}
            onDec={() => setAsk({ ...ask, billing: BILLING_ORDER[Math.max(0, BILLING_ORDER.indexOf(ask.billing) - 1)] as OfferBilling })}
            onInc={() => setAsk({ ...ask, billing: BILLING_ORDER[Math.min(3, BILLING_ORDER.indexOf(ask.billing) + 1)] as OfferBilling })}
          />
          <Stepper
            label="Set length"
            value={`${ask.slotMins} min`}
            onDec={() => setAsk({ ...ask, slotMins: Math.max(15, ask.slotMins - 5) })}
            onInc={() => setAsk({ ...ask, slotMins: Math.min(120, ask.slotMins + 5) })}
          />
          <Stepper
            label="Your merch share"
            value={`${ask.merchSplit}%`}
            onDec={() => setAsk({ ...ask, merchSplit: Math.max(40, ask.merchSplit - 5) })}
            onInc={() => setAsk({ ...ask, merchSplit: Math.min(100, ask.merchSplit + 5) })}
          />
          <div className="flex items-center justify-between py-2 border-b border-gray-800/80">
            <div className="text-xs text-gray-400">Travel &amp; hotel covered</div>
            <button
              disabled={closed}
              onClick={() => setAsk({ ...ask, travel: !ask.travel })}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${ask.travel ? 'bg-green-500/20 text-green-300' : 'bg-gray-800 text-gray-400'}`}
            >
              {ask.travel ? 'Yes' : 'No'}
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800/80">
            <div className="text-xs text-gray-400">If you pull out</div>
            {hiddenCancel ? (
              <span className="text-[11px] text-gray-600">🔒 fine print — a lawyer would read this</span>
            ) : (
              <select
                disabled={closed}
                value={ask.cancel}
                onChange={(e) => setAsk({ ...ask, cancel: e.target.value as OfferCancel })}
                className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-white px-2 py-1"
              >
                {(Object.keys(CANCEL_LABEL) as OfferCancel[]).map((c) => (
                  <option key={c} value={c}>{CANCEL_LABEL[c].label} ({Math.round(CANCEL_LABEL[c].pct * 100)}% of fee)</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="text-xs text-gray-400">Radius clause</div>
            {hiddenExcl ? (
              <span className="text-[11px] text-gray-600">🔒 fine print — a lawyer would read this</span>
            ) : (
              <select
                disabled={closed}
                value={ask.exclusivityDays}
                onChange={(e) => setAsk({ ...ask, exclusivityDays: Number(e.target.value) })}
                className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-white px-2 py-1"
              >
                {[0, 14, 30, 60].map((d) => (
                  <option key={d} value={d}>{d === 0 ? 'None' : `No ${offer.city} shows within ${d} days`}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {hasLawyer && offer.hidden.length > 0 && (
          <div className="text-xs rounded-xl p-3 bg-red-500/10 border border-red-500/30 text-red-200">
            ⚖️ <b>Your lawyer flagged:</b>{' '}
            {offer.hidden.includes('cancel') && `a ${CANCEL_LABEL[offer.terms.cancel].label.toLowerCase()} cancellation clause`}
            {offer.hidden.length === 2 && ' and '}
            {offer.hidden.includes('exclusivity') && `a ${offer.terms.exclusivityDays}-day radius clause`}.
          </div>
        )}

        {reply && (
          <div className={`text-xs rounded-xl p-3 border ${reply.ok ? 'bg-green-500/10 border-green-500/30 text-green-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
            {reply.text}
          </div>
        )}

        {closed ? (
          <div className="text-xs text-gray-500">This offer is {offer.status}.</div>
        ) : panel === 'decline' ? (
          <div className="bg-red-500/[0.06] border border-red-500/25 rounded-xl p-3 space-y-2">
            <div className="text-xs font-bold text-white">Why are you saying no?</div>
            <div className="space-y-1.5">
              {DECLINE_REASONS.map((r) => (
                <label key={r.id} className={`flex gap-2 p-2 rounded-lg border cursor-pointer ${reason === r.id ? 'border-red-400/60 bg-red-500/10' : 'border-gray-800 bg-gray-900'}`}>
                  <input type="radio" name="decline" checked={reason === r.id} onChange={() => setReason(r.id)} className="mt-0.5 accent-red-500" />
                  <span>
                    <span className="text-xs text-white font-semibold">{r.label}</span>
                    <span className="block text-[11px] text-gray-500">{r.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" checked={soften} onChange={(e) => setSoften(e.target.checked)} className="accent-yellow-500" />
              Soften it — offer another date or a shout-out (halves the sting)
            </label>
            {quote && (
              <p className="text-[11px] text-red-200/90">
                Likely: {quote.relationship === 0 ? 'no change' : `${quote.relationship > 0 ? '+' : ''}${quote.relationship} relationship`}
                {quote.reputation < 0 && ` · ${quote.reputation} reputation`}. Mood and personality can shift this.
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => { const r = declineShowOffer(offer.id, reason, soften); setReply({ ok: r.ok, text: r.message }); setPanel('none'); setTimeout(onClose, 1800); }}>
                Send the decline
              </Button>
              <Button variant="ghost" onClick={() => setPanel('none')}>Back</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={send} disabled={!changed}>
              {changed ? 'Send counter-offer' : 'Change a term to counter'}
            </Button>
            <Button
              variant="gold"
              onClick={() => { const r = acceptShowOffer(offer.id); setReply({ ok: r.ok, text: r.message }); if (r.ok) setTimeout(onClose, 1800); }}
              disabled={changed}
            >
              {offer.agreed ? '✅ They agreed — book it' : 'Accept as shown'}
            </Button>
            <Button variant="ghost" onClick={() => setPanel('decline')}>Decline…</Button>
          </div>
        )}
      </Card>

      {/* ── The other side of the table ── */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">{arche.emoji}</div>
            <div className="min-w-0">
              <div className="font-bold text-white truncate">{offer.hostName}</div>
              <div className="flex gap-1.5 mt-0.5 flex-wrap">
                <Badge color="purple">{arche.label}</Badge>
                {ctx.traits.shark && <Badge color="red">Shark</Badge>}
                {ctx.traits.diva && <Badge color="yellow">Diva</Badge>}
                {ctx.traits.generous && <Badge color="green">Generous</Badge>}
                {ctx.traits.hustler && <Badge color="blue">Hustler</Badge>}
                {ctx.traits.petty && <Badge color="red">Petty</Badge>}
                {ctx.traits.loyal && <Badge color="green">Loyal</Badge>}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">{arche.blurb}</p>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">{mood.emoji} {mood.label}</span>
              <span className="text-gray-600">{mood.hint}</span>
            </div>
            <div className="flex justify-between text-xs mb-1 mt-2">
              <span className="text-gray-400">Patience</span>
              <span className="text-gray-300 tabular-nums">{Math.max(0, Math.ceil(offer.patience))} counter{Math.ceil(offer.patience) === 1 ? '' : 's'} left</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${offer.patience <= 1 ? 'bg-red-500' : offer.patience <= 2 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (offer.patience / patienceMax) * 100)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-gray-950/60 rounded-lg p-2">
              <div className="text-[10px] text-gray-500 uppercase">Relationship</div>
              <div className={`text-sm font-bold ${ctx.relationship >= 25 ? 'text-green-400' : ctx.relationship < 0 ? 'text-red-400' : 'text-white'}`}>
                {ctx.relationship > 0 ? '+' : ''}{ctx.relationship}
              </div>
            </div>
            <div className="bg-gray-950/60 rounded-lg p-2">
              <div className="text-[10px] text-gray-500 uppercase">Your leverage</div>
              <div className="text-sm font-bold text-white">
                {ctx.competing > 0 ? `${ctx.competing} other offer${ctx.competing > 1 ? 's' : ''}` : 'None'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-2">
          <div className="text-xs font-bold text-white">Your team in the room</div>
          <div className="text-xs text-gray-400">
            👔 Manager: {hasManager ? <span className="text-green-300">in the room ({ctx.managerSkill})</span> : <span className="text-gray-600">nobody — you will be reading this blind</span>}
          </div>
          <div className="text-xs text-gray-400">
            ⚖️ Lawyer: {hasLawyer ? <span className="text-green-300">reading the fine print ({ctx.lawyerSkill})</span> : <span className="text-gray-600">nobody — traps stay hidden</span>}
          </div>
          {hasManager && <p className="text-[11px] text-yellow-300/90 bg-yellow-500/10 rounded-lg p-2">💡 Manager: {hint}</p>}
        </Card>

        {offer.log.length > 0 && (
          <Card className="space-y-1.5">
            <div className="text-xs font-bold text-white">What has been said</div>
            {offer.log.slice(0, 5).map((l, i) => <p key={i} className="text-[11px] text-gray-400">• {l}</p>)}
          </Card>
        )}
        <div className="text-[11px] text-gray-600 px-1">Reply by {formatMedium(serialToDate(offer.expiresSerial))} · {offer.expiresSerial - today} days left</div>
      </div>
    </div>
  );
}

// ─── THE INBOX ─────────────────────────────────────────────────────────────

export function OffersPanel() {
  const { showOffers, bookedGigs, gameDate, backOutOfGig } = useGameStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const today = dateToSerial(gameDate);

  const open = showOffers.filter((o) => o.status === 'open').sort((a, b) => a.expiresSerial - b.expiresSerial);
  const past = showOffers.filter((o) => o.status !== 'open').slice(-5).reverse();
  const selected = openId ? showOffers.find((o) => o.id === openId) : undefined;

  if (selected) return <Negotiation offer={selected} onClose={() => setOpenId(null)} />;

  return (
    <div className="space-y-5">
      {notice && <div className="text-xs rounded-lg p-2 border bg-yellow-500/10 border-yellow-500/30 text-yellow-200">{notice}</div>}

      <div>
        <h3 className="text-sm font-bold text-white mb-2">Waiting for an answer ({open.length})</h3>
        {open.length === 0 ? (
          <Card className="text-center py-8">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-white font-bold">No offers right now</div>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Promoters, venue owners, DJs and artists near your level reach out as your name grows. A manager brings more, and keeps them from expiring unseen.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {open.map((o) => {
              const arche = ARCHETYPE_LABEL[o.archetype];
              const left = o.expiresSerial - today;
              return (
                <button key={o.id} onClick={() => setOpenId(o.id)} className="text-left bg-gray-900/80 border border-gray-800 hover:border-yellow-500/50 rounded-2xl p-4 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500">{KIND_LABEL[o.kind]}</div>
                      <div className="font-bold text-white truncate">{o.hostName}</div>
                      <div className="text-xs text-gray-500 truncate">{o.venueName} · {o.city} · {formatMedium(serialToDate(o.serial))}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${left <= 3 ? 'bg-red-500/20 text-red-300' : 'bg-gray-800 text-gray-400'}`}>
                      {left <= 0 ? 'last day' : `${left}d left`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1.5">
                      <Badge color="purple">{arche.emoji} {arche.label}</Badge>
                      <Badge color="blue">{BILLING_LABEL[o.terms.billing]}</Badge>
                    </div>
                    <div className="text-yellow-400 font-bold tabular-nums">{money(o.terms.fee)}</div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">{o.reason}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-2">Dates you said yes to ({bookedGigs.length})</h3>
        {bookedGigs.length === 0 ? (
          <p className="text-xs text-gray-600">None yet.</p>
        ) : (
          <div className="space-y-2">
            {[...bookedGigs].sort((a, b) => a.serial - b.serial).map((g) => {
              const days = g.serial - today;
              const t = backOutTerms(g, days, 'local');
              return (
                <Card key={g.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{g.hostName} · {g.city}</div>
                    <div className="text-xs text-gray-500">
                      {BILLING_LABEL[g.terms.billing]} · {g.terms.slotMins} min · {money(g.terms.fee)} guaranteed · {formatMedium(serialToDate(g.serial))}{' '}
                      <span className="text-yellow-400">({days <= 0 ? 'tonight' : `in ${days}d`})</span>
                    </div>
                    {g.terms.exclusivityDays > 0 && <div className="text-[11px] text-orange-300 mt-0.5">Radius clause: {g.terms.exclusivityDays} days</div>}
                  </div>
                  <Button variant="danger" onClick={() => {
                    if (window.confirm(`Pull out? It costs about ${money(t.penalty)} and hurts your standing with ${g.hostName}.`)) {
                      setNotice(backOutOfGig(g.id).message);
                    }
                  }}>Back out</Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-2">Recently closed</h3>
          <div className="space-y-1">
            {past.map((o) => (
              <div key={o.id} className="text-[11px] text-gray-600">
                {o.hostName} · {o.city} — <span className="capitalize">{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
