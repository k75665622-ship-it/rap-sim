// ─── WELCOME / LOG IN ──────────────────────────────────────────────────────
// Log in, create an account, or just play. Device accounts live in this
// browser's database and work offline; online accounts (when a game server is
// reachable) follow you to any device.

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '../ui/kit';
import { Character } from '../avatar/Character';
import { lookFor } from '../../sim/look';
import { listAccounts, createLocalAccount, loginLocal, switchTo, playAsGuest, hasUnclaimedSaves, careerCount, type Account } from '../../store/accounts';
import { probeServer, cloudLogin, cloudRegister, serverUrl, setServerUrl } from '../../net/cloud';
import { useSync } from '../../hooks/useAccount';

type Mode = 'login' | 'create';
type Where = 'device' | 'online';

export function WelcomeScreen() {
  const sync = useSync();
  const [mode, setMode] = useState<Mode>(() => (listAccounts().some((a) => a.kind !== 'guest') ? 'login' : 'create'));
  const [where, setWhere] = useState<Where>('device');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverEdit, setServerEdit] = useState(false);
  const [serverDraft, setServerDraft] = useState(serverUrl());
  const accounts = listAccounts();
  const legacy = hasUnclaimedSaves();
  const crowd = useMemo(() => ['a', 'b', 'c'].map((k, i) => lookFor(`welcome|${k}`, i === 1 ? 'female' : 'male')), []);

  useEffect(() => { void probeServer().then((up) => { if (up) setWhere('online'); }); }, []);
  const online = sync.server === true;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const r = where === 'online'
        ? await (mode === 'login' ? cloudLogin(username, password) : cloudRegister(username, password))
        : await (mode === 'login' ? loginLocal(username, password) : createLocalAccount(username, password));
      if (!r.ok) setError(r.error);
    } finally {
      setBusy(false);
    }
  }

  function pick(a: Account) {
    setError(null);
    if (a.kind === 'guest') { playAsGuest(); return; }
    if (a.kind === 'cloud') {
      if (a.cloud?.token) { switchTo(a.id); return; }
      setWhere('online'); setMode('login'); setUsername(a.username); setPassword('');
      setError('Log in again to sync this online account.');
      return;
    }
    if (!a.pass) { switchTo(a.id); return; }
    setWhere('device'); setMode('login'); setUsername(a.username); setPassword('');
  }

  return (
    <div className="min-h-screen bg-[#0A0B10] text-ink relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 50% at 20% 10%, rgba(255,184,0,0.16), transparent 70%), radial-gradient(50% 50% at 90% 90%, rgba(123,97,255,0.16), transparent 70%)' }} />
      <div className="relative max-w-[1040px] mx-auto px-4 py-8 sm:py-14 grid lg:grid-cols-[1fr_440px] gap-8 items-center">
        {/* The brand */}
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2">
            <span className="w-9 h-9 rounded-[10px] bg-amber text-black font-black text-[18px] flex items-center justify-center">R</span>
            <span className="text-[15px] font-black tracking-[0.3em]">RAP LIFE</span>
          </div>
          <h1 className="text-[40px] sm:text-[56px] font-black leading-[1.02] mt-5">From the block<br /><span className="text-amber">to the world.</span></h1>
          <p className="text-[15px] text-ink2 mt-4 max-w-[460px] mx-auto lg:mx-0">Make the music, build the name, wear the drip, keep your word — or don't. Everyone remembers.</p>
          <div className="hidden sm:flex justify-center lg:justify-start items-end gap-1 mt-6 h-[220px]">
            {crowd.map((l, i) => <div key={i} className={cn('w-[110px]', i === 1 ? 'h-[220px]' : 'h-[190px] opacity-80')}><Character look={l} className="w-full h-full" /></div>)}
          </div>
        </div>

        {/* The card */}
        <div className="rounded-[22px] border border-line bg-[#12141b]/95 backdrop-blur p-5 sm:p-6 shadow-2xl">
          {accounts.length > 0 && (
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-wider text-ink3 font-semibold mb-2">On this device</div>
              <div className="space-y-1.5">
                {accounts.slice(0, 5).map((a) => (
                  <button key={a.id} onClick={() => pick(a)} className="w-full flex items-center gap-3 rounded-[12px] border border-line bg-card hover:border-amber/50 px-3 py-2.5 text-left transition">
                    <span className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-[14px] font-bold">{a.kind === 'guest' ? '👤' : a.display.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold truncate">{a.kind === 'guest' ? 'Guest' : `@${a.username}`}</span>
                      <span className="block text-[11px] text-ink3">{a.kind === 'cloud' ? (a.cloud?.token ? '🌐 Online account' : '🌐 Online · log in again') : a.kind === 'guest' ? 'Offline' : a.pass ? '🔒 This device' : 'This device'} · {careerCount(a.id)} career{careerCount(a.id) === 1 ? '' : 's'}</span>
                    </span>
                    <span className="text-[12px] text-amber font-semibold">Continue →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex rounded-[12px] border border-line bg-black/30 p-1 mb-4">
            {(['login', 'create'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); }} className={cn('flex-1 h-9 rounded-[9px] text-[13px] font-semibold transition', mode === m ? 'bg-amber text-black' : 'text-ink2 hover:text-ink')}>{m === 'login' ? 'Log in' : 'Create account'}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setWhere('device')} className={cn('rounded-[12px] border px-3 py-2 text-left transition', where === 'device' ? 'border-amber bg-amber/10' : 'border-line bg-card')}>
              <div className="text-[13px] font-semibold">📱 This device</div>
              <div className="text-[11px] text-ink3 leading-snug">Works offline. Saved in this browser.</div>
            </button>
            <button disabled={!online} onClick={() => setWhere('online')} className={cn('rounded-[12px] border px-3 py-2 text-left transition disabled:opacity-45', where === 'online' ? 'border-amber bg-amber/10' : 'border-line bg-card')}>
              <div className="text-[13px] font-semibold">🌐 Online</div>
              <div className="text-[11px] text-ink3 leading-snug">{online ? 'Play on any device. Syncs.' : sync.server === null ? 'Checking for a server…' : 'No game server found.'}</div>
            </button>
          </div>

          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username" className="w-full h-11 rounded-[12px] bg-card border border-line px-4 text-[14px] text-ink placeholder:text-ink3 focus:outline-none focus:border-amber" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={where === 'device' && mode === 'create' ? 'Password (optional on this device)' : 'Password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} className="w-full h-11 rounded-[12px] bg-card border border-line px-4 text-[14px] text-ink placeholder:text-ink3 focus:outline-none focus:border-amber" />
            {error && <div className="text-[12px] text-fall">{error}</div>}
            <Button className="w-full h-11" disabled={busy || username.trim().length < 3 || (where === 'online' && password.length < 6)}>{busy ? '…' : mode === 'login' ? 'Log in' : where === 'online' ? 'Create online account' : 'Create account'}</Button>
          </form>

          <div className="flex items-center gap-3 my-4"><div className="h-px bg-line flex-1" /><span className="text-[11px] text-ink3">or</span><div className="h-px bg-line flex-1" /></div>
          <Button variant="secondary" className="w-full h-11" onClick={() => playAsGuest()}>Just play — offline, no account</Button>

          {legacy && <div className="mt-4 text-[11px] text-amber/90 leading-snug">Careers saved before accounts existed will move into the first account you open on this device.</div>}

          <div className="mt-4 text-[11px] text-ink3 leading-snug">
            {serverEdit ? (
              <div className="flex gap-1.5">
                <input value={serverDraft} onChange={(e) => setServerDraft(e.target.value)} placeholder="https://your-game-server.example" className="flex-1 min-w-0 h-8 rounded-[8px] bg-card border border-line px-2 text-[12px] text-ink" />
                <Button size="sm" onClick={() => { setServerUrl(serverDraft); setServerEdit(false); void probeServer(true).then((up) => setWhere(up ? 'online' : 'device')); }}>Use</Button>
              </div>
            ) : (
              <>Game server: <span className="text-ink2">{serverUrl() || 'none'}</span>{sync.server ? <span className="text-rise"> · online{sync.db ? ` (${sync.db})` : ''}</span> : sync.server === false ? ' · not reachable' : ''} · <button onClick={() => setServerEdit(true)} className="text-amber hover:underline">change</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
