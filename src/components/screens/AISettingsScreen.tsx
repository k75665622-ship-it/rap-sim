// ─── AI BRAIN ──────────────────────────────────────────────────────────────
// Plug in a Claude API key and the people in the game write their own
// messages, replies, posts and interview questions. Off by default; the key
// stays in this browser.

import { useEffect, useState } from 'react';
import { AI_MODELS, aiSettings, aiUsage, estimateCost, onAIChange, saveAISettings, testKey, type AIFeature } from '../../sim/ai';
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

  useEffect(() => onAIChange(() => { setS(aiSettings()); setU(aiUsage()); }), []);
  const model = AI_MODELS.find((m) => m.id === s.model) ?? AI_MODELS[0];
  const cost = estimateCost(u, s.model);
  const status = !s.key ? { label: 'No key', cls: 'bg-white/10 text-ink3' } : !s.enabled ? { label: 'Off', cls: 'bg-white/10 text-ink2' } : u.calls >= s.dailyCap ? { label: 'Daily limit reached', cls: 'bg-amber/15 text-amber' } : { label: 'On', cls: 'bg-rise/15 text-rise' };

  async function runTest() {
    setTesting(true);
    setTest(null);
    try {
      await testKey();
      setTest({ ok: true, msg: 'Connected. The key works.' });
    } catch (e) {
      setTest({ ok: false, msg: e instanceof Error ? e.message : 'Could not connect.' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-[760px] mx-auto space-y-4 pb-10">
      <div className="rounded-[20px] p-5 border border-re/40 overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(181,123,255,0.25), rgba(10,11,16,0) 60%), #14161e' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-re">AI brain</div>
            <h1 className="text-[26px] font-bold text-ink leading-tight mt-1">Bring the world to life</h1>
          </div>
          <span className={cn('shrink-0 h-7 px-3 rounded-full text-[12px] font-bold flex items-center', status.cls)}>{status.label}</span>
        </div>
        <p className="text-[13px] text-ink2 mt-2 leading-relaxed">Add your Claude API key and the people in your world start writing for themselves — real conversations in your DMs, reactions to your posts, hosts who listen, and friends and rivals who make their own moves. Without a key the game uses its built-in writing.</p>
      </div>

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-3">
        <div className="text-[15px] font-semibold text-ink">Your API key</div>
        {s.key ? (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-sidebar px-3 py-2.5">
            <span className="text-[13px] text-ink2 num truncate">{show ? s.key : `${s.key.slice(0, 10)}••••••••${s.key.slice(-4)}`}</span>
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setShow((x) => !x)}>{show ? 'Hide' : 'Show'}</Button>
              <Button size="sm" variant="secondary" onClick={() => { saveAISettings({ key: '', enabled: false }); setTest(null); }}>Remove</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input type="password" autoComplete="off" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="sk-ant-…" className="flex-1 min-w-0 h-11 rounded-[10px] bg-sidebar border border-line px-3 text-[14px] text-ink outline-none focus:border-re" />
            <Button disabled={keyDraft.trim().length < 20} onClick={() => { saveAISettings({ key: keyDraft.trim(), enabled: true }); setKeyDraft(''); void runTest(); }}>Save</Button>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="secondary" disabled={!s.key || testing} onClick={() => void runTest()}>{testing ? 'Testing…' : 'Test connection'}</Button>
          <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-[#b57bff]" checked={s.enabled} disabled={!s.key} onChange={(e) => saveAISettings({ enabled: e.target.checked })} />
            Use the AI
          </label>
          {test && <span className={cn('text-[12px]', test.ok ? 'text-rise' : 'text-fall')}>{test.msg}</span>}
        </div>
        <div className="text-[11px] text-ink3 leading-snug">Get a key in the Claude Console (platform.claude.com → API keys) and set a monthly spend limit there. The key is saved only in this browser on this device — never in your save files — and is sent only to Anthropic's API.</div>
      </section>

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-3">
        <div className="text-[15px] font-semibold text-ink">Model</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {AI_MODELS.map((m) => (
            <button key={m.id} onClick={() => saveAISettings({ model: m.id })} className={cn('text-left rounded-[12px] border p-3 transition', s.model === m.id ? 'border-re bg-re/10' : 'border-line bg-sidebar hover:bg-cardhover')}>
              <div className="text-[13px] font-semibold text-ink">{m.label}</div>
              <div className="text-[11px] text-ink3 mt-0.5 leading-snug">{m.note}</div>
            </button>
          ))}
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
        <div className="text-[11px] text-ink3">When the limit is reached the game quietly switches back to its built-in writing until tomorrow (your real day). Answers are kept short, thinking is off, and the game's rules are cached, so each call costs a fraction of a cent on {model.label}.</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Calls today</div><div className="text-[17px] font-bold text-ink num">{u.calls}<span className="text-ink3 text-[12px]"> / {s.dailyCap}</span></div></div>
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Tokens</div><div className="text-[17px] font-bold text-ink num">{((u.input + u.output + u.cacheRead + u.cacheWrite) / 1000).toFixed(1)}k</div></div>
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Cached</div><div className="text-[17px] font-bold text-ink num">{((u.cacheRead / Math.max(1, u.input + u.cacheRead + u.cacheWrite)) * 100).toFixed(0)}%</div></div>
          <div className="rounded-[12px] border border-line bg-sidebar p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Est. cost today</div><div className="text-[17px] font-bold text-ink num">${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}</div></div>
        </div>
        {u.lastError && <div className="text-[12px] text-fall">Last problem: {u.lastError}{u.errors ? ` (${u.errors} today)` : ''}</div>}
      </section>

      <div className="text-[11px] text-ink3 leading-snug px-1">The AI only ever writes for the game's fictional people. Real artists in the game never get words put in their mouths, and anything that mentions them is thrown away.</div>
    </div>
  );
}
