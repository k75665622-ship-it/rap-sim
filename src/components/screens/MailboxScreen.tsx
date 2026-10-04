import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { cn } from '@/utils/cn';
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
  const {
    mailbox, readMail, acceptOffer, declineOffer, negotiateOffer, player,
    featureRequests, inboundRequests, payFeatureFee, declineFeatureTerms, addFeatureVerse,
    counterFeatureOffer, setScreen,
  } = useGameStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The number the player is about to put on the table. */
  const [counterDraft, setCounterDraft] = useState('');

  const selected = mailbox.find(m => m.id === selectedId);

  // The live state of the negotiation a mail is about. Mails are a snapshot of
  // what was true when they arrived; the request is the truth now.
  const linkedRequest = selected?.featureRequestId
    ? featureRequests.find(r => r.id === selected.featureRequestId)
    : undefined;

  // The same trick for an inbound ask: the mail is a snapshot of the day it
  // arrived, the request is the truth now.
  const linkedAsk = selected?.inboundRequestId
    ? inboundRequests.find(r => r.id === selected.inboundRequestId)
    : undefined;

  function handleSelect(id: string) {
    setSelectedId(id);
    readMail(id);
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'contract': return '📋';
      case 'legal': return '⚖️';
      case 'interview_request': return '🎙️';
      case 'offer': return '💼';
      case 'feature_reply': return '🤝';
      case 'feature_ask': return '🎤';
      default: return '📧';
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'contract': return 'yellow';
      case 'legal': return 'red';
      case 'interview_request': return 'blue';
      case 'offer': return 'green';
      case 'feature_reply': return 'purple';
      case 'feature_ask': return 'orange';
      default: return 'gray';
    }
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* Mail List */}
      <div className="w-72 flex-shrink-0">
        <Card className="h-full overflow-y-auto">
          <h3 className="font-bold text-white text-sm mb-3">📬 Mailbox</h3>
          {mailbox.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-8">No messages yet</p>
          ) : (
            <div className="space-y-2">
              {mailbox.map(mail => (
                <button
                  key={mail.id}
                  onClick={() => handleSelect(mail.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl transition-all',
                    selectedId === mail.id ? 'bg-yellow-500/10 border border-yellow-500/30' : 'hover:bg-gray-800',
                    !mail.read && 'border-l-2 border-l-yellow-500'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getTypeIcon(mail.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn('text-xs font-bold truncate', mail.read ? 'text-gray-300' : 'text-white')}>
                          {mail.fromName}
                        </span>
                        {!mail.read && <span className="w-2 h-2 bg-yellow-500 rounded-full ml-auto flex-shrink-0" />}
                      </div>
                      <div className={cn('text-xs truncate', mail.read ? 'text-gray-600' : 'text-gray-400')}>
                        {mail.subject}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <Badge color={getTypeColor(mail.type) as any}>{mail.type.replace('_', ' ')}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Mail Content */}
      <div className="flex-1">
        {!selected ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📬</div>
              <p className="text-gray-500 text-sm">Select a message to read it</p>
            </div>
          </Card>
        ) : (
          <Card className="h-full overflow-y-auto">
            <div className="max-w-2xl">
              {/* Header */}
              <div className="border-b border-gray-800 pb-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selected.subject}</h2>
                    <p className="text-sm text-gray-500 mt-1">From: <span className="text-gray-300">{selected.fromName}</span></p>
                  </div>
                  <Badge color={getTypeColor(selected.type) as any}>
                    {getTypeIcon(selected.type)} {selected.type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Body */}
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-gray-900/50 rounded-xl p-4 mb-4">
                {selected.body}
              </div>

              {/* Actions for offers */}
              {(selected.type === 'contract' || selected.type === 'offer') && selected.offerData && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <h3 className="text-yellow-400 font-bold text-sm mb-3">
                    {selected.type === 'offer' ? '💼 Management Terms' : '📋 Contract Terms'}
                  </h3>
                  <div className="space-y-2 text-xs mb-4">
                    {termRows(selected.offerData as ContractOffer).map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-white font-medium text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Honest read on the downsides */}
                  {warnings(selected.offerData as ContractOffer).length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                      <div className="text-red-300 text-xs font-bold mb-1">⚠️ Read this before signing</div>
                      {warnings(selected.offerData as ContractOffer).map((w, i) => (
                        <p key={i} className="text-red-300/80 text-xs">• {w}</p>
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
                              <Button variant="gold" onClick={() => sign('commission')}>
                                ✅ Sign — {offer.percentage}% of gross
                              </Button>
                              <Button variant="gold" onClick={() => sign('retainer')}>
                                ✅ Sign — ${offer.monthlyFee.toLocaleString()}/month flat
                              </Button>
                            </>
                          ) : (
                            <Button variant="gold" onClick={() => sign()}>
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
                            variant="danger"
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
                    <p className="text-yellow-300/70 text-[11px] mt-3">
                      These terms have been re-cut {(selected.negotiationRounds ?? 0)} time
                      {(selected.negotiationRounds ?? 0) === 1 ? '' : 's'}. Pushing again moves the number
                      less — and costs you a little goodwill every time.
                    </p>
                  ) : null}
                </div>
              )}

              {/* ── Feature negotiation reply ───────────────────────────── */}
              {selected.type === 'feature_reply' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <h3 className="text-purple-300 font-bold text-sm mb-3">🤝 Feature request</h3>

                  {!linkedRequest ? (
                    <p className="text-gray-400 text-xs">
                      This negotiation is no longer on record — the track may have been scrapped
                      or the session reset.
                    </p>
                  ) : linkedRequest.status === 'terms' ? (
                    <>
                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Track</span>
                          <span className="text-white font-medium text-right">{linkedRequest.songTitle}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Artist</span>
                          <span className="text-white font-medium text-right">{linkedRequest.npcName}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Their fee</span>
                          <span className="text-yellow-400 font-bold text-right">
                            ${linkedRequest.fee.toLocaleString()}
                            {linkedRequest.originalFee !== undefined &&
                            linkedRequest.originalFee > linkedRequest.fee ? (
                              <span className="text-green-400 font-normal">
                                {' '}
                                (down from ${linkedRequest.originalFee.toLocaleString()})
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">You have</span>
                          <span className="text-white text-right">
                            ${(player?.career.money ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {linkedRequest.fee > (player?.career.money ?? 0) && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                          <p className="text-red-300 text-xs">
                            You cannot cover this yet. Work, release something, or come back when
                            the money is there — the offer stands until you answer it.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3 flex-wrap">
                        <Button
                          variant="gold"
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
                          variant="danger"
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
                          <div className="text-[11px] text-gray-400 mb-2 leading-relaxed">
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
                                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-[12px] text-gray-200 hover:bg-white/[0.09] disabled:opacity-40 disabled:cursor-not-allowed num"
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
                              className="w-28 h-8 px-2 rounded-lg bg-card border border-line text-white text-[12px] focus:outline-none focus:border-amber"
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
                      <p className="text-gray-300 text-xs mb-4">
                        {linkedRequest.freeVerse
                          ? `${linkedRequest.npcName} is doing this one for the relationship, not the money. The verse is ready.`
                          : `You have paid ${linkedRequest.npcName}. The verse is ready.`}
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        <Button
                          variant="gold"
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
                    <p className="text-green-300 text-xs">
                      ✅ {linkedRequest.npcName} is on the record. Nothing left to do here.
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-gray-400 text-xs">
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
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <h3 className="text-purple-300 font-bold text-sm mb-2">🎤 They want you on their record</h3>
                    <p className="text-gray-400 text-xs">
                      This ask is no longer on record — it may have been answered already.
                    </p>
                  </div>
                )
              )}

              {notice && (
                <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-300 text-sm">
                  {notice}
                </div>
              )}

              {selected.type === 'general' && (
                <div className="flex gap-3">
                  <Button variant="secondary" size="sm">Reply via PingChat</Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
