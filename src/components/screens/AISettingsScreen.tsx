// ─── AI BRAIN ──────────────────────────────────────────────────────────────
// Plug in any AI key (or a local model) and the people in the game write
// their own messages, replies, posts and interview questions. Off by default:
// the game plays offline with its built-in writing. Keys stay in this browser,
// per account.

import { useEffect, useState } from 'react';
import { AI_BUILD, rankChatModels, PROVIDERS, activeProvider, aiConfigured, aiSettings, aiUsage, estimateCost, fetchModels, onAIChange, saveAISettings, testKey, type AIFeature } from '../../sim/ai';
import { currentAccount } from '../../store/accounts';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';

const FEATURES: { id: AIFeature; emoji: string; label: string; blurb: string; cost: string }[] = [
  { id: 'dms', emoji: '💬', label: 'Chats', blurb: 'People answer whatever you type in PingChat, in their own voice. They can invite you to the studio, agree to link up, offer you a verse — or stop replying if you\'re rude.', cost: '1 call per message you send' },
  { id: 'moments', emoji: '⚡', label: 'Replies to your decisions', blurb: 'When you answer a request in the DMs, they react to what you chose.', cost: '1 call per decision' },
  { id: 'director', emoji: '🧠', label: 'People acting on their own', blurb: 'Once a game day, friends, rivals, your team and bloggers decide what to do: text you, post, gossip, invite you out.', cost: '1 call per game day' },
  { id: 'social', emoji: '📱', label: 'Comments on your posts', blurb: 'Fans, jokers, haters and friends react to what you actually posted.', cost: '1 call per post' },
  { id: 'interviews', emoji: '🎙️', label: 'Live interview hosts', blurb: 'The host reacts to your last answer before asking the next question.', cost: '1 call per answer' },
];

export function AISettingsScreen() {
  const [s, setS] = useState(aiSettings());
  const [u, setU] = useState(aiUsage());
  const [keyDraft, setKeyDraft] = useState('');
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const account = currentAccount();

  useEffect(() => onAIChange(() => { setS(aiSettings()); setU(aiUsage()); }), []);
  useEffect(() => { setModels(null); setTest(null); setKeyDraft(''); setShow(false); }, [s.provider]);
  const a = activeProvider(s);
  const cost = estimateCost(u);
  const ready = aiConfigured(s);
  const status = !ready ? { label: 'Offline · built-in writing', cls: 'bg-white/10 text-ink2' } : !s.enabled ? { label: 'Off', cls: 'bg-white/10 text-ink2' } : u.calls >= s.dailyCap ? { label: 'Daily limit reached', cls: 'bg-amber/15 text-amber' } : { label: `On · ${a.def.label}`, cls: 'bg-rise/15 text-rise' };

  async function runTest() {
    setTesting(true);
    setTest(null);
    try {
      const r = await testKey();
      setTest({ ok: true, msg: `Connected to ${a.def.label} (${a.model}). Replied: "${r.slice(0, 30)}"` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect.';
      setTest({ ok: false, msg });
      // The model isn't on this key: show what IS, so it's one tap to fix.
      if (/doesn't exist|does not exist|model/i.test(msg)) void loadModels();
    } finally {
      setTesting(false);
    }
  }

  async function loadModels() {
    setLoadingModels(true);
    try { setModels(rankChatModels(await fetchModels())); } catch (e) { setTest({ ok: false, msg: e instanceof Error ? e.message : 'Could not list models.' }); } finally { setLoadingModels(false); }
  }

  return (
    <div className="max-w-[760px] mx-auto space-y-4 pb-10">
      <div className="rounded-[20px] p-5 border border-re/40 overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(181,123,255,0.25), rgba(10,11,16,0) 60%), #14161e' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-re">AI brain</div>
            <h1 className="text-[26px] font-bold text-ink leading-tight mt-1">Bring your own AI</h1>
          </div>
          <span className={cn('shrink-0 h-7 px-3 rounded-full text-[12px] font-bold flex items-center text-center', status.cls)}>{status.label}</span>
        </div>
        <p className="text-[13px] text-ink2 mt-2 leading-relaxed">Plug in any AI key you have — Claude, OpenAI, Gemini, Groq, Grok, OpenRouter, DeepSeek, Mistral — or a model running on your own computer, and the people in your world write for themselves: real conversations in your DMs, reactions to your posts, hosts who listen, friends and rivals who remember what you did. No key? The game plays fully offline with its built-in writing.</p>
      </div>

      {!s.keys.groq && !Object.values(s.keys).some(Boolean) && (
        <section className="rounded-[16px] border border-rise/40 p-4" style={{ background: 'linear-gradient(135deg, rgba(46,204,113,0.12), rgba(46,204,113,0.02))' }}>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-rise">Quickest start · free</div>
          <div className="text-[16px] font-bold text-ink mt-1">Get a free Groq key in a minute</div>
          <ol className="mt-2 space-y-1 text-[13px] text-ink2 list-decimal list-inside">
            <li>Open <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-rise font-semibold underline">console.groq.com/keys</a> and sign in (Google works).</li>
            <li>Press <b className="text-ink">Create API key</b> and copy it (it starts with <span className="num">gsk_</span>).</li>
            <li>Paste it below and press Save. That's it — the people in your world start talking for themselves.</li>
          </ol>
          {s.provider !== 'groq' && <Button size="sm" className="mt-3" onClick={() => saveAISettings({ provider: 'groq' })}>Use Groq</Button>}
        </section>
      )}

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-3">
        <div className="text-[15px] font-semibold text-ink">Provider</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => saveAISettings({ provider: p.id })} className={cn('text-left rounded-[12px] border p-3 transition', s.provider === p.id ? 'border-re bg-re/10' : 'border-line bg-sidebar hover:bg-cardhover')}>
              <div className="text-[13px] font-semibold text-ink flex items-center gap-1.5">{p.label}{s.keys[p.id] ? <span className="text-rise text-[10px]">● key</span> : null}</div>
              <div className="text-[11px] text-ink3 mt-0.5 leading-snug truncate">{p.note ?? `Default: ${p.defaultModel}`}</div>
            </button>
          ))}
        </div>
        {a.def.note && <div className="text-[12px] text-ink2 leading-snug">{a.def.note}</div>}
      </section>

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-3">
        <div className="text-[15px] font-semibold text-ink">{a.def.keyless ? 'Connection' : `Your ${a.def.label} key`}</div>
        {(a.def.id === 'custom' || a.def.id === 'ollama') && (
          <div>
            <div className="text-[11px] text-ink3 mb-1">Server address (OpenAI-compatible, ends in /v1)</div>
            <input value={s.baseUrls[a.def.id] ?? a.def.base} onChange={(e) => saveAISettings({ baseUrls: { [a.def.id]: e.target.value.trim() } })} placeholder="http://localhost:1234/v1" className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink outline-none focus:border-re num" />
          </div>
        )}
        {a.key ? (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-sidebar px-3 py-2.5">
            <span className="text-[13px] text-ink2 num truncate">{show ? a.key : `${a.key.slice(0, 7)}••••••••${a.key.slice(-4)}`}</span>
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setShow((x) => !x)}>{show ? 'Hide' : 'Show'}</Button>
              <Button size="sm" variant="secondary" onClick={() => { saveAISettings({ keys: { [a.def.id]: '' }, enabled: a.def.keyless ? s.enabled : false }); setTest(null); }}>Remove</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input type="password" autoComplete="off" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder={a.def.keyHint} className="flex-1 min-w-0 h-11 rounded-[10px] bg-sidebar border border-line px-3 text-[14px] text-ink outline-none focus:border-re" />
            <Button disabled={keyDraft.trim().length < (a.def.keyless ? 1 : 12)} onClick={() => { saveAISettings({ keys: { [a.def.id]: keyDraft.trim() }, enabled: true }); setKeyDraft(''); void runTest(); }}>Save</Button>
          </div>
        )}
        <div>
          <div className="text-[11px] text-ink3 mb-1">Model</div>
          <div className="flex gap-2">
            <input list="ai-models" value={s.models[a.def.id] ?? a.def.defaultModel} onChange={(e) => saveAISettings({ models: { [a.def.id]: e.target.value.trim() } })} placeholder="model name" className="flex-1 min-w-0 h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink outline-none focus:border-re num" />
            <datalist id="ai-models">{[...a.def.models.map((m) => m.id), ...(models ?? [])].map((m) => <option key={m} value={m} />)}</datalist>
            <Button size="sm" variant="secondary" disabled={loadingModels || !ready} onClick={() => void loadModels()}>{loadingModels ? 'Loading…' : 'Fetch models'}</Button>
          </div>
          {a.def.models.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {a.def.models.map((m) => (
                <button key={m.id} onClick={() => saveAISettings({ models: { [a.def.id]: m.id } })} className={cn('h-8 px-3 rounded-full border text-[12px]', a.model === m.id ? 'border-re bg-re/10 text-ink' : 'border-line text-ink2 hover:text-ink')} title={m.note}>{m.label}{m.note ? <span className="text-ink3"> · {m.note}</span> : null}</button>
              ))}
            </div>
          )}
          {models && (
            <div className="mt-2">
              <div className="text-[11px] text-ink3 mb-1.5">Models your key can use — tap one:</div>
              <div className="flex flex-wrap gap-1.5">
                {models.slice(0, 12).map((m) => (
                  <button key={m} onClick={() => { saveAISettings({ models: { [a.def.id]: m } }); setTest(null); }} className={cn('h-8 px-3 rounded-full border text-[12px] num', a.model === m ? 'border-re bg-re/10 text-ink' : 'border-line text-ink2 hover:text-ink')}>{m}</button>
                ))}
              </div>
            </div>
          )}
          {a.model !== a.def.defaultModel && a.def.defaultModel && <button onClick={() => saveAISettings({ models: { [a.def.id]: a.def.defaultModel } })} className="mt-1.5 text-[11px] font-semibold text-re">Use the recommended model ({a.def.defaultModel})</button>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="secondary" disabled={!ready || testing} onClick={() => void runTest()}>{testing ? 'Testing…' : 'Test connection'}</Button>
          <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-[#b57bff]" checked={s.enabled} disabled={!ready} onChange={(e) => saveAISettings({ enabled: e.target.checked })} />
            Use the AI
          </label>
          {test && <span className={cn('text-[12px]', test.ok ? 'text-rise' : 'text-fall')}>{test.msg}</span>}
        </div>
        <div className="text-[11px] text-ink3 leading-snug">
          <span className="text-ink2">Game version {AI_BUILD}.</span>{' '}
          {a.def.keyUrl ? <>Get a key at <a href={a.def.keyUrl} target="_blank" rel="noreferrer" className="text-re underline">{a.def.keyUrl.replace(/^https:\/\//, '')}</a>{a.def.id === 'groq' ? ' (free tier, no card needed)' : ', and set a spend limit there'}. </> : null}
          Keys are saved only in this browser{account ? <>, for {account.kind === 'guest' ? 'the guest player' : <b className="text-ink2">@{account.username}</b>}</> : null} — never in your save files and never stored on the game's server. On another device you'll enter it again.
        </div>
      </section>

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-2">
        <div className="text-[15px] font-semibold text-ink mb-1">What the AI handles</div>
        {FEATURES.map((f) => (
          <label key={f.id} className="flex items-start gap-3 rounded-[12px] border border-line p-3 cursor-pointer hover:bg-cardhover/50">
            <input type="checkbox" className="mt-1 w-4 h-4 accent-[#b57bff] shrink-0" checked={s.features[f.id]} onChange={(e) => saveAISettings({ features: { ...s.features, [f.id]: e.target.checked } })} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-ink">{f.emoji} {f.label}</div>
              <div className="text-[12px] text-ink2 leading-snug mt-0.5">{f.blurb}</div>
              <div className="text-[11px] text-ink3 mt-0.5">{f.cost}</div>
            </div>
          </label>
        ))}
      </section>

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-3">
        <div className="flex items-center justify-between"><div className="text-[15px] font-semibold text-ink">Daily limit</div><span className="text-[14px] font-bold text-ink num">{s.dailyCap} calls</span></div>
        <input type="range" min={50} max={2000} step={50} value={s.dailyCap} onChange={(e) => saveAISettings({ dailyCap: Number(e.target.value) })} className="w-full accent-[#b57bff]" />
        <div className="text-[11px] text-ink3">When the limit is reached the game quietly switches back to its built-in writing until tomorrow (your real day). Answers are kept short, thinking is off, and the game's rules are cached, so each call costs a fraction of a cent on cheap models.</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Calls today</div><div className="text-[17px] font-bold text-ink num">{u.calls}<span className="text-ink3 text-[12px]"> / {s.dailyCap}</span></div></div>
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Tokens</div><div className="text-[17px] font-bold text-ink num">{((u.input + u.output + u.cacheRead + u.cacheWrite) / 1000).toFixed(1)}k</div></div>
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Cached</div><div className="text-[17px] font-bold text-ink num">{((u.cacheRead / Math.max(1, u.input + u.cacheRead + u.cacheWrite)) * 100).toFixed(0)}%</div></div>
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Est. cost today</div><div className="text-[17px] font-bold text-ink num">{cost === null ? <span className="text-[12px] text-ink3 font-normal">see your provider</span> : `$${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}`}</div></div>
        </div>
        {u.lastError && <div className="text-[12px] text-fall">Last problem: {u.lastError}{u.errors ? ` (${u.errors} today)` : ''}</div>}
      </section>

      <div className="text-[11px] text-ink3 leading-snug px-1">The AI only ever writes for the game's fictional people. Real artists in the game never get words put in their mouths, and anything that mentions them is thrown away.</div>
    </div>
  );
}
