import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { Avatar } from '../social/shared';
import { MAX_NEGOTIATION_ROUNDS } from '../../sim/features';
import { InboundAskPanel } from './InboundAskPanel';
import type { ContractOffer } from '../../types/game';

/** Render contract terms in plain language rather than raw object values. */
function termRows(offer: ContractOffer): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (offer.type === 'management') {
    rows.push(['Type', 'Management deal']);
    // Both structures are on the table, so both are printed. Picking between
    // them is the player's decision, not the manager's.
    rows.push(['Option A — commission', `${offer.percentage}% of gross income`]);
    if (offer.monthlyFee) {
      rows.push(['Option B — retainer', `$${offer.monthlyFee.toLocaleString()} a month, flat`]);
    }
    rows.push(['Length', `${offer.lengthYears} years`]);
    if (offer.minMonths) rows.push(['Minimum term', `${offer.minMonths} months before either side can walk`]);
    rows.push(['Exclusivity', offer.exclusivity ? 'Exclusive — no other managers' : 'Non-exclusive']);
    rows.push(['Creative control', offer.creativeControl ? 'You keep full control' : 'Manager approves']);
  } else {
    rows.push(['Type', `${offer.type.charAt(0).toUpperCase()}${offer.type.slice(1)} deal`]);
    if (offer.advance) rows.push(['Advance', `$${offer.advance.toLocaleString()} (upfront)`]);
    rows.push(['Your royalty', `${offer.royaltyRate}%`]);
    rows.push(['Label share', `${Math.round(offer.royaltyRate < 50 ? 100 - offer.royaltyRate : offer.percentage)}%`]);
    rows.push(['Length', `${offer.lengthYears} years`]);
    if (offer.albumRequirements) rows.push(['Album commitment', `${offer.albumRequirements} album${offer.albumRequirements > 1 ? 's' : ''}`]);
    rows.push(['Creative control', offer.creativeControl ? 'You keep it' : 'Label must approve releases']);
    rows.push(['Exclusivity', offer.exclusivity ? 'Exclusive' : 'Non-exclusive']);
  }
  return rows;
}

/** Flag terms that are quietly bad for the player. */
function warnings(offer: ContractOffer): string[] {
  const out: string[] = [];
  if (offer.type === 'management' && offer.percentage >= 20) {
    out.push(`A ${offer.percentage}% cut is steep for a manager at your level.`);
  }
  if (offer.type === 'management' && offer.exclusivity) {
    out.push('Exclusive management means you cannot work with anyone else while signed.');
  }
  if (offer.type === 'management' && offer.monthlyFee) {
    out.push(
      `The retainer is $${offer.monthlyFee.toLocaleString()} a month whether you earn anything or not — ` +
        `that is $${(offer.monthlyFee * 12).toLocaleString()} a year, in a bad year too.`,
    );
  }
  if (offer.type === 'management' && (offer.minMonths ?? 0) >= 12) {
    out.push(`You are locked in for ${offer.minMonths} months. Walking early costs a buy-out.`);
  }
  if (offer.type === 'label' && offer.royaltyRate <= 14) {
    out.push(`A ${offer.royaltyRate}% royalty is low — you would give up most of your streaming income.`);
  }
  if (offer.type === 'label' && !offer.creativeControl) {
    out.push('The label controls your releases. You may be pushed toward a sound you did not choose.');
  }
  if (offer.type === 'label' && (offer.albumRequirements ?? 0) >= 3) {
    out.push(`${offer.albumRequirements} albums is a long commitment, with deadlines attached.`);
  }
  return out;
}

export function MailboxScreen() {
  const mailbox = useGameStore((s) => s.mailbox);
  const readMail = useGameStore((s) => s.readMail);
  const deleteMail = useGameStore((s) => s.deleteMail);
  const markAllMailRead = useGameStore((s) => s.markAllMailRead);
  const acceptOffer = useGameStore((s) => s.acceptOffer);
  const declineOffer = useGameStore((s) => s.declineOffer);
  const negotiateOffer = useGameStore((s) => s.negotiateOffer);
  const player = useGameStore((s) => s.player);
  const featureRequests = useGameStore((s) => s.featureRequests);
  const inboundRequests = useGameStore((s) => s.inboundRequests);
  const payFeatureFee = useGameStore((s) => s.payFeatureFee);
  const declineFeatureTerms = useGameStore((s) => s.declineFeatureTerms);
  const addFeatureVerse = useGameStore((s) => s.addFeatureVerse);
  const counterFeatureOffer = useGameStore((s) => s.counterFeatureOffer);
  const setScreen = useGameStore((s) => s.setScreen);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'deals' | 'features' | 'other'>('all');
  const [q, setQ] = useState('');
  /** The number the player is about to put on the table. */
  const [counterDraft, setCounterDraft] = useState('');

  const selected = mailbox.find(m => m.id === selectedId);
  const linkedRequest = selected?.featureRequestId ? featureRequests.find(r => r.id === selected.featureRequestId) : undefined;
  const linkedAsk = selected?.inboundRequestId ? inboundRequests.find(r => r.id === selected.inboundRequestId) : undefined;
  const unread = mailbox.filter((m) => !m.read).length;

  const list = useMemo(() => mailbox.filter((m) => {
    if (filter === 'unread' && m.read) return false;
    if (filter === 'deals' && !(m.type === 'contract' || m.type === 'offer')) return false;
    if (filter === 'features' && !(m.type === 'feature_reply' || m.type === 'feature_ask')) return false;
    if (filter === 'other' && (m.type === 'contract' || m.type === 'offer' || m.type === 'feature_reply' || m.type === 'feature_ask')) return false;
    const t = q.trim().toLowerCase();
    return !t || m.fromName.toLowerCase().includes(t) || m.subject.toLowerCase().includes(t);
  }), [mailbox, filter, q]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setNotice(null);
    readMail(id);
  }

  return (
    <div className="h-[calc(100dvh-72px)] md:h-[calc(100dvh-48px)] flex gap-4 -mb-3 md:mb-0">
      {/* List */}
      <div className={cn('w-full md:w-[340px] flex-shrink-0 flex-col rounded-[18px] border border-line bg-card overflow-hidden', selected ? 'hidden md:flex' : 'flex')}>
        <div className="px-4 pt-4 pb-3 border-b border-line space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-ink">Mailbox</h1>
            <div className="flex items-center gap-2">
              {unread > 0 && <span className="px-2 h-[20px] rounded-full bg-amber text-black text-[11px] font-bold flex items-center">{unread}</span>}
              {unread > 0 && <button onClick={markAllMailRead} className="text-[11px] text-ink3 hover:text-ink">Mark all read</button>}
            </div>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="w-full h-10 rounded-full bg-sidebar border border-line px-4 text-[13px] text-ink placeholder:text-ink3 outline-none focus:border-amber" />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {([['all', 'All'], ['unread', 'Unread'], ['deals', 'Deals'], ['features', 'Features'], ['other', 'Other']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} className={cn('shrink-0 h-8 px-3 rounded-full border text-[12px] font-semibold', filter === id ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink2')}>{label}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {list.length === 0 ? (
            <p className="text-ink3 text-[13px] text-center py-10">{mailbox.length ? 'Nothing here.' : 'No mail yet. Offers, contracts and feature replies land here.'}</p>
          ) : list.map((mail) => (
            <button key={mail.id} onClick={() => handleSelect(mail.id)} className={cn('w-full text-left p-3 rounded-[14px] transition flex gap-3', selectedId === mail.id ? 'bg-amber/[0.08]' : 'hover:bg-white/[0.03]')}>
              <div className="relative shrink-0">
                <Avatar name={mail.fromName} seed={mail.from} size={42} />
                <span className="absolute -right-1 -bottom-1 text-[13px]">{TYPE[mail.type]?.icon ?? '📧'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-[14px] truncate', mail.read ? 'text-ink2 font-medium' : 'text-ink font-bold')}>{mail.fromName}</span>
                  {!mail.read && <span className="w-2 h-2 bg-amber rounded-full ml-auto shrink-0" />}
                </div>
                <div className={cn('text-[13px] truncate', mail.read ? 'text-ink3' : 'text-ink2 font-medium')}>{mail.subject}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', TYPE[mail.type]?.cls ?? 'bg-white/10 text-ink3')}>{TYPE[mail.type]?.label ?? mail.type}</span>
                  <span className="text-[11px] text-ink3 truncate">{mail.body.replace(/\s+/g, ' ').slice(0, 60)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Reader */}
      <div className={cn('flex-1 min-w-0', selected ? 'flex' : 'hidden md:flex')}>
        {!selected ? (
          <div className="flex-1 rounded-[18px] border border-line bg-card flex items-center justify-center p-6 text-center">
            <div><div className="text-4xl mb-2">📬</div><p className="text-ink2 text-sm">Pick a letter to read it.</p></div>
          </div>
        ) : (
          <div className="flex-1 rounded-[18px] border border-line bg-card overflow-y-auto">
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-line px-3 py-2.5 flex items-center gap-2">
              <button onClick={() => setSelectedId(null)} className="md:hidden w-8 h-8 text-ink2 text-[20px]" aria-label="Back">←</button>
              <span className={cn('text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', TYPE[selected.type]?.cls ?? 'bg-white/10 text-ink3')}>{TYPE[selected.type]?.icon} {TYPE[selected.type]?.label ?? selected.type}</span>
              <button onClick={() => { deleteMail(selected.id); setSelectedId(null); }} className="ml-auto h-8 px-3 rounded-full border border-line text-[12px] text-ink3 hover:text-fall">Delete</button>
            </div>
            <div className="p-4 sm:p-6 max-w-[720px] space-y-4">
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-bold text-ink leading-snug">{selected.subject}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <Avatar name={selected.fromName} seed={selected.from} size={38} />
                  <div className="min-w-0"><div className="text-[14px] font-semibold text-ink truncate">{selected.fromName}</div><div className="text-[12px] text-ink3">to {player?.artistName ?? 'you'}</div></div>
                </div>
              </div>
              <div className="text-[15px] text-ink2 leading-relaxed whitespace-pre-wrap">{selected.body}</div>

              {/* Actions for offers */}
              {(selected.type === 'contract' || selected.type === 'offer') && selected.offerData && (
                <div className="rounded-[16px] border border-amber/30 bg-amber/[0.06] p-4">
                  <h3 className="text-amber font-bold text-[14px] mb-3">
                    {selected.type === 'offer' ? '💼 Management Terms' : '📋 Contract Terms'}
                  </h3>
                  <div className="space-y-2 text-xs mb-4">
                    {termRows(selected.offerData as ContractOffer).map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-ink3">{label}</span>
                        <span className="text-ink font-medium text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Honest read on the downsides */}
                  {warnings(selected.offerData as ContractOffer).length > 0 && (
                    <div className="rounded-[12px] border border-fall/30 bg-fall/10 p-3 mb-4">
                      <div className="text-fall text-xs font-bold mb-1">⚠️ Read this before signing</div>
                      {warnings(selected.offerData as ContractOffer).map((w, i) => (
                        <p key={i} className="text-fall/90 text-xs">• {w}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    {(() => {
                      const offer = selected.offerData as ContractOffer;
                      const isMgmt = offer.type === 'management';
                      const rounds = selected.negotiationRounds ?? 0;

                      const sign = (kind?: 'commission' | 'retainer') => {
                        const r = acceptOffer(selected.id, kind);
                        setNotice(r.message);
                        if (r.ok) setSelectedId(null);
                      };

                      return (
                        <>
                          {isMgmt && offer.monthlyFee ? (
                            <>
                              <Button variant="primary" onClick={() => sign('commission')}>
                                ✅ Sign — {offer.percentage}% of gross
                              </Button>
                              <Button variant="primary" onClick={() => sign('retainer')}>
                                ✅ Sign — ${offer.monthlyFee.toLocaleString()}/month flat
                              </Button>
                            </>
                          ) : (
                            <Button variant="primary" onClick={() => sign()}>
                              ✅ {isMgmt ? 'Sign with them' : 'Sign the Deal'}
                            </Button>
                          )}

                          {offer.type !== 'distribution' && offer.type !== 'publishing' && (
                            <Button
                              variant="secondary"
                              disabled={rounds >= 3}
                              onClick={() => {
                                const r = negotiateOffer(selected.id);
                                setNotice(r.message);
                              }}
                            >
                              {rounds === 0
                                ? '🤝 Push back on the terms'
                                : rounds >= 3
                                  ? 'No more room'
                                  : `🤝 Push again (${rounds}/3)`}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            onClick={() => {
                              declineOffer(selected.id);
                              setNotice(`You turned down ${selected.fromName}.`);
                              setSelectedId(null);
                            }}
                          >
                            ❌ Decline
                          </Button>
                        </>
                      );
                    })()}
                  </div>

                  {selected.renegotiated ? (
                    <p className="text-amber/70 text-[11px] mt-3">
                      These terms have been re-cut {(selected.negotiationRounds ?? 0)} time
                      {(selected.negotiationRounds ?? 0) === 1 ? '' : 's'}. Pushing again moves the number
                      less — and costs you a little goodwill every time.
                    </p>
                  ) : null}
                </div>
              )}

              {/* ── Feature negotiation reply ───────────────────────────── */}
              {selected.type === 'feature_reply' && (
                <div className="rounded-[16px] border border-re/30 bg-re/[0.06] p-4">
                  <h3 className="text-re font-bold text-sm mb-3">🤝 Feature request</h3>

                  {!linkedRequest ? (
                    <p className="text-ink3 text-xs">
                      This negotiation is no longer on record — the track may have been scrapped
                      or the session reset.
                    </p>
                  ) : linkedRequest.status === 'terms' ? (
                    <>
                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex justify-between gap-4">
                          <span className="text-ink3">Track</span>
                          <span className="text-ink font-medium text-right">{linkedRequest.songTitle}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-ink3">Artist</span>
                          <span className="text-ink font-medium text-right">{linkedRequest.npcName}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-ink3">Their fee</span>
                          <span className="text-amber font-bold text-right">
                            ${linkedRequest.fee.toLocaleString()}
                            {linkedRequest.originalFee !== undefined &&
                            linkedRequest.originalFee > linkedRequest.fee ? (
                              <span className="text-rise font-normal">
                                {' '}
                                (down from ${linkedRequest.originalFee.toLocaleString()})
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-ink3">You have</span>
                          <span className="text-ink text-right">
                            ${(player?.career.money ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {linkedRequest.fee > (player?.career.money ?? 0) && (
                        <div className="rounded-[12px] border border-fall/30 bg-fall/10 p-3 mb-4">
                          <p className="text-fall text-xs">
                            You cannot cover this yet. Work, release something, or come back when
                            the money is there — the offer stands until you answer it.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3 flex-wrap">
                        <Button
                          variant="primary"
                          disabled={linkedRequest.fee > (player?.career.money ?? 0)}
                          onClick={() => {
                            const ok = payFeatureFee(linkedRequest.id);
                            setNotice(
                              ok
                                ? `Paid ${linkedRequest.npcName} $${linkedRequest.fee.toLocaleString()}. The verse is in — add it to the record in the Studio.`
                                : 'That payment could not go through.'
                            );
                          }}
                        >
                          💸 Pay ${linkedRequest.fee.toLocaleString()}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            declineFeatureTerms(linkedRequest.id);
                            setNotice(`You passed on ${linkedRequest.npcName}.`);
                          }}
                        >
                          ❌ Pass
                        </Button>
                      </div>

                      {/* ── Haggling ────────────────────────────────────────
                          A price in this business is an opening. The counter
                          is here, in the letter that carries the number,
                          because that is where the player is when they read
                          it. Three rounds and the table closes. */}
                      {(linkedRequest.negotiationRound ?? 0) < MAX_NEGOTIATION_ROUNDS && (
                        <div className="mt-4 rounded-lg border border-line bg-white/[0.02] p-3">
                          <div className="text-[11px] text-ink3 mb-2 leading-relaxed">
                            This is push {(linkedRequest.negotiationRound ?? 0) + 1} of{' '}
                            {MAX_NEGOTIATION_ROUNDS}. How far they come depends on how much they
                            want the record and who is asking — and an offer under half their
                            number reads as an insult, not an opening bid.
                          </div>
                          <div className="flex gap-2 flex-wrap items-center">
                            {[0.9, 0.78, 0.62].map((f) => {
                              const amount = Math.max(100, Math.round((linkedRequest.fee * f) / 100) * 100);
                              return (
                                <button
                                  key={f}
                                  disabled={amount >= linkedRequest.fee || amount > (player?.career.money ?? 0)}
                                  onClick={() => {
                                    const res = counterFeatureOffer(linkedRequest.id, amount);
                                    setNotice(res.message);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-[12px] text-ink2 hover:bg-white/[0.09] disabled:opacity-40 disabled:cursor-not-allowed num"
                                >
                                  ${amount.toLocaleString()}
                                </button>
                              );
                            })}
                            <input
                              value={counterDraft}
                              onChange={(e) => setCounterDraft(e.target.value.replace(/[^0-9]/g, ''))}
                              inputMode="numeric"
                              placeholder="your number"
                              className="w-28 h-8 px-2 rounded-lg bg-card border border-line text-ink text-[12px] focus:outline-none focus:border-amber"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!(Number(counterDraft) > 0 && Number(counterDraft) < linkedRequest.fee)}
                              onClick={() => {
                                const res = counterFeatureOffer(linkedRequest.id, Number(counterDraft));
                                setNotice(res.message);
                                setCounterDraft('');
                              }}
                            >
                              🤝 Counter
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : linkedRequest.status === 'verse_ready' ? (
                    <>
                      <p className="text-ink2 text-xs mb-4">
                        {linkedRequest.freeVerse
                          ? `${linkedRequest.npcName} is doing this one for the relationship, not the money. The verse is ready.`
                          : `You have paid ${linkedRequest.npcName}. The verse is ready.`}
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        <Button
                          variant="primary"
                          onClick={() => {
                            const ok = addFeatureVerse(linkedRequest.id);
                            setNotice(
                              ok
                                ? `${linkedRequest.npcName} is now on "${linkedRequest.songTitle}".`
                                : 'That verse could not be added.'
                            );
                          }}
                        >
                          ➕ Add verse to "{linkedRequest.songTitle}"
                        </Button>
                        <Button variant="secondary" onClick={() => setScreen('studio')}>
                          🎛️ Open the Studio
                        </Button>
                      </div>
                    </>
                  ) : linkedRequest.status === 'added' ? (
                    <p className="text-rise text-xs">
                      ✅ {linkedRequest.npcName} is on the record. Nothing left to do here.
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-ink3 text-xs">
                        Nothing to action. The track is still yours.
                      </p>
                      <Button variant="secondary" size="sm" onClick={() => setScreen('studio')}>
                        🎛️ Back to the Studio
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Somebody wants YOU on their record ──────────────────── */}
              {selected.type === 'feature_ask' && (
                linkedAsk ? (
                  <InboundAskPanel request={linkedAsk} />
                ) : (
                  <div className="rounded-[16px] border border-re/30 bg-re/[0.06] p-4">
                    <h3 className="text-re font-bold text-sm mb-2">🎤 They want you on their record</h3>
                    <p className="text-ink3 text-xs">
                      This ask is no longer on record — it may have been answered already.
                    </p>
                  </div>
                )
              )}

              {notice && (
                <div className="mt-4 rounded-[12px] border border-rise/30 bg-rise/10 px-4 py-3 text-ink text-[13px]">
                  {notice}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TYPE: Record<string, { icon: string; label: string; cls: string }> = {
  contract: { icon: '📋', label: 'Contract', cls: 'bg-amber/15 text-amber' },
  offer: { icon: '💼', label: 'Offer', cls: 'bg-rise/15 text-rise' },
  legal: { icon: '⚖️', label: 'Legal', cls: 'bg-fall/15 text-fall' },
  interview_request: { icon: '🎙️', label: 'Interview', cls: 'bg-new/15 text-new' },
  feature_reply: { icon: '🤝', label: 'Feature', cls: 'bg-re/15 text-re' },
  feature_ask: { icon: '🎤', label: 'Verse ask', cls: 'bg-re/15 text-re' },
  general: { icon: '📧', label: 'Mail', cls: 'bg-white/10 text-ink3' },
};
