// ─── HOME ──────────────────────────────────────────────────────────────────
// After logging in: continue the last career, start a new one, open the list,
// and choose how the world thinks — your own AI key, or offline with the
// game's built-in writing.

import { useMemo, useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { Character } from '../avatar/Character';
import { readIndex, readSlot } from '../../store/saves';
import { logout, dropCloudToken } from '../../store/accounts';
import { aiSettings, aiConfigured, activeProvider, onAIChange } from '../../sim/ai';
import { cloudLogout, syncNow } from '../../net/cloud';
import { useAccount, useSync } from '../../hooks/useAccount';
import type { Look } from '../../sim/look';

export function SplashScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const loadSlot = useGameStore((s) => s.loadSlot);
  const newGame = useGameStore((s) => s.newGame);
  const account = useAccount();
  const sync = useSync();
  const [ai, setAI] = useState(aiSettings());
  useEffect(() => onAIChange(() => setAI(aiSettings())), []);

  // The index changes when a sync pulls careers down.
  const index = useMemo(() => readIndex(), [sync.lastSync, account?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = index.slots.find((s) => s.id === index.activeSlotId) ?? index.slots[0];
  const lastLook = useMemo<Look | undefined>(() => (last ? (readSlot(last.id)?.player as { look?: Look } | undefined)?.look : undefined), [last]);
  const aiOn = ai.enabled && aiConfigured(ai);
  const prov = activeProvider(ai);

  function handleNew() {
    newGame();
    setScreen('create_artist');
  }

  async function signOut() {
    if (account?.kind === 'cloud') { await cloudLogout(); dropCloudToken(); }
    logout();
  }

  return (
    <div className="min-h-screen bg-[#0A0B10] text-ink relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 45% at 15% 0%, rgba(255,184,0,0.14), transparent 70%), radial-gradient(45% 45% at 100% 100%, rgba(123,97,255,0.14), transparent 70%)' }} />
      <div className="relative max-w-[920px] mx-auto px-4 py-6 sm:py-10 space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-[9px] bg-amber text-black font-black text-[15px] flex items-center justify-center">R</span>
            <span className="text-[13px] font-black tracking-[0.3em]">RAP LIFE</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScreen('account')} className="h-9 pl-1.5 pr-3 rounded-full border border-line bg-card flex items-center gap-2 hover:border-amber/50">
              <span className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-[11px] font-bold">{account?.kind === 'guest' ? '👤' : account?.display.slice(0, 1).toUpperCase()}</span>
              <span className="text-[12px] font-semibold max-w-[120px] truncate">{account?.kind === 'guest' ? 'Guest' : `@${account?.username}`}</span>
              <span className={cn('w-2 h-2 rounded-full', account?.kind === 'cloud' ? (sync.lastError ? 'bg-amber' : 'bg-rise') : 'bg-white/30')} title={account?.kind === 'cloud' ? 'Online' : 'This device'} />
            </button>
            <Button size="sm" variant="ghost" onClick={() => void signOut()}>Switch</Button>
          </div>
        </header>

        {/* Continue */}
        {last ? (
          <section className="rounded-[24px] border border-line overflow-hidden grid sm:grid-cols-[200px_1fr]" style={{ background: 'radial-gradient(100% 120% at 0% 0%, rgba(255,184,0,0.18), rgba(10,11,16,0) 60%), #14161e' }}>
            <div className="h-[230px] sm:h-[300px] p-2">{lastLook ? <Character look={lastLook} className="w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-[60px]">🎤</div>}</div>
            <div className="p-5 sm:p-6 flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-wider text-amber font-bold">Continue</div>
              <div className="text-[30px] sm:text-[36px] font-black leading-tight mt-1 truncate">{last.artistName}</div>
              <div className="text-[13px] text-ink2 mt-1">{last.gameDate || '—'} · ${last.money.toLocaleString()} · {last.fans.toLocaleString()} fans · {last.songs} songs</div>
              <div className="text-[11px] text-ink3 mt-1">Last played {new Date(last.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
              <div className="flex flex-wrap gap-2 mt-5">
                <Button className="h-11 px-6" onClick={() => { if (!loadSlot(last.id)) setScreen('careers'); }}>▶ Continue</Button>
                <Button variant="secondary" className="h-11" onClick={handleNew}>New career</Button>
                {index.slots.length > 1 && <Button variant="ghost" className="h-11" onClick={() => setScreen('careers')}>All careers ({index.slots.length})</Button>}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[24px] border border-line p-6 sm:p-8 text-center" style={{ background: 'radial-gradient(100% 120% at 50% 0%, rgba(255,184,0,0.18), rgba(10,11,16,0) 60%), #14161e' }}>
            <div className="text-[44px]">🎤</div>
            <div className="text-[28px] font-black mt-2">Your story starts here</div>
            <div className="text-[14px] text-ink2 mt-1">Create your artist — your name, your look, your sound — and start from the bottom.</div>
            <Button className="h-12 px-8 mt-5" onClick={handleNew}>Create your artist</Button>
            {sync.syncing && <div className="text-[12px] text-ink3 mt-3">Fetching your careers from the server…</div>}
          </section>
        )}

        {/* How the world thinks */}
        <section className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => setScreen('ai')} className="text-left rounded-[18px] border border-line bg-card hover:border-re/50 p-4 transition" style={aiOn ? { background: 'radial-gradient(120% 140% at 0% 0%, rgba(181,123,255,0.22), rgba(10,11,16,0) 60%), #14161e' } : undefined}>
            <div className="text-[11px] uppercase tracking-wider text-re font-bold">AI brain</div>
            <div className="text-[16px] font-bold mt-1">{aiOn ? `On · ${prov.def.label}` : 'Bring your own AI key'}</div>
            <div className="text-[12px] text-ink2 mt-1 leading-snug">{aiOn ? `${prov.model} writes for the people in your world. Tap to change.` : 'Claude, OpenAI, Gemini, Groq, Grok, OpenRouter… or a model on your computer. People text, post and remember in their own words.'}</div>
          </button>
          <div className="rounded-[18px] border border-line bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink3 font-bold">{aiOn ? 'Offline' : 'Playing offline'}</div>
            <div className="text-[16px] font-bold mt-1">{aiOn ? 'Falls back by itself' : 'Built-in writing'}</div>
            <div className="text-[12px] text-ink2 mt-1 leading-snug">{aiOn ? 'No connection, or the daily limit is hit? The game quietly switches to its own writing and carries on.' : 'Everything works with no key and no internet. Your careers and journal are saved in this browser\'s database.'}</div>
          </div>
        </section>

        {account?.kind === 'cloud' && (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-card px-4 py-3 text-[12px]">
            <span className="text-ink2">{sync.syncing ? 'Syncing…' : sync.lastError ? <span className="text-amber">{sync.lastError}</span> : sync.lastSync ? `Synced ${new Date(sync.lastSync).toLocaleTimeString(undefined, { timeStyle: 'short' })}` : 'Online account'}</span>
            <Button size="sm" variant="secondary" disabled={sync.syncing} onClick={() => void syncNow()}>Sync now</Button>
          </div>
        )}
      </div>
    </div>
  );
}
