// ─── ACCOUNT ───────────────────────────────────────────────────────────────
// Who's playing, where the careers are kept, online sync, and taking a device
// account online.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { useAccount, useSync } from '../../hooks/useAccount';
import { logout, deleteAccount, moveCareers, switchTo, dropCloudToken, careerCount, currentAccount } from '../../store/accounts';
import { kv, kvBytes } from '../../store/kv';
import { cloudRegister, cloudLogout, syncNow, serverUrl, setServerUrl, probeServer } from '../../net/cloud';

export function AccountScreen() {
  const account = useAccount();
  const sync = useSync();
  const player = useGameStore((s) => s.player);
  const setScreen = useGameStore((s) => s.setScreen);
  const saveNow = useGameStore((s) => s.saveGame);
  const [goOnline, setGoOnline] = useState(false);
  const [pw, setPw] = useState('');
  const [name, setName] = useState(account?.kind === 'guest' ? '' : account?.username ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [server, setServer] = useState(serverUrl());
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!account) return null;
  const bytes = kvBytes(`a:${account.id}:`);
  const store = kv().kind === 'indexeddb' ? "this browser's database (IndexedDB)" : kv().kind === 'localstorage' ? "this browser's local storage" : 'memory only (private window — nothing is kept)';

  async function takeOnline() {
    setMsg(null);
    const from = account!.id;
    const fromKind = account!.kind;
    const slot = useGameStore.getState().activeSlotId;
    saveNow?.();
    const r = await cloudRegister(name, pw);
    if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
    await syncNow();
    // The new online account is now active: bring the careers across, then push them up.
    const moved = moveCareers(from, r.account.id);
    if (fromKind === 'guest') deleteAccount(from);
    switchTo(r.account.id);
    // Carry on with the career that was open.
    if (slot && useGameStore.getState().loadSlot(slot)) useGameStore.getState().setScreen('account');
    const res = await syncNow();
    setMsg({ ok: true, text: `You're online as @${r.account.username}. ${moved ? `${res.pushed} career${res.pushed === 1 ? '' : 's'} uploaded.` : ''}` });
    setGoOnline(false);
  }

  async function signOut() {
    if (player) saveNow?.();
    if (account?.kind === 'cloud') { await syncNow(); await cloudLogout(); dropCloudToken(); }
    logout();
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4 pb-10">
      <div className="rounded-[20px] border border-line p-5" style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(255,184,0,0.16), rgba(10,11,16,0) 60%), #14161e' }}>
        <div className="text-[12px] uppercase tracking-wider text-amber font-semibold">Account</div>
        <div className="flex items-center gap-3 mt-2">
          <span className="w-12 h-12 rounded-full bg-white/[0.08] flex items-center justify-center text-[20px] font-bold">{account.kind === 'guest' ? '👤' : account.display.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <div className="text-[22px] font-bold text-ink truncate">{account.kind === 'guest' ? 'Guest' : `@${account.username}`}</div>
            <div className="text-[12px] text-ink2">{account.kind === 'cloud' ? '🌐 Online account — your careers sync to the server' : account.kind === 'guest' ? 'Playing without an account, on this device' : `📱 Device account${account.pass ? ' · password protected' : ''}`}</div>
          </div>
        </div>
      </div>

      {msg && <div className={cn('rounded-[12px] border px-4 py-3 text-[13px]', msg.ok ? 'border-rise/40 text-rise bg-rise/5' : 'border-fall/40 text-fall bg-fall/5')}>{msg.text}</div>}

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-2">
        <div className="text-[15px] font-semibold text-ink">Where your careers live</div>
        <div className="text-[13px] text-ink2 leading-snug">{careerCount(account.id)} career{careerCount(account.id) === 1 ? '' : 's'} ({(bytes / 1024 / 1024).toFixed(1)} MB) in {store}. Each career carries its journal — the memories the people in the game read. Everything works offline.</div>
        {account.kind === 'cloud' && (
          <div className="rounded-[12px] border border-line bg-sidebar px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 text-[12px] text-ink2">{sync.syncing ? 'Syncing…' : sync.lastError ? <span className="text-amber">{sync.lastError}</span> : sync.lastSync ? `Last synced ${new Date(sync.lastSync).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Not synced yet'}{sync.pending ? ` · ${sync.pending} waiting` : ''}</div>
            <Button size="sm" variant="secondary" disabled={sync.syncing} onClick={() => { saveNow?.(); void syncNow(); }}>Sync now</Button>
          </div>
        )}
      </section>

      {account.kind !== 'cloud' && (
        <section className="rounded-[16px] border border-line bg-card p-4 space-y-3">
          <div className="text-[15px] font-semibold text-ink">Play on any device</div>
          <div className="text-[13px] text-ink2 leading-snug">Make this an online account and your careers upload to the game server. Log in anywhere and carry on; play offline and it catches up later.</div>
          {sync.server ? (goOnline ? (
            <div className="space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink" />
              <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="Password (6+ characters)" className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink" />
              <div className="flex gap-2"><Button disabled={name.trim().length < 3 || pw.length < 6} onClick={() => void takeOnline()}>Go online</Button><Button variant="ghost" onClick={() => setGoOnline(false)}>Cancel</Button></div>
            </div>
          ) : <Button onClick={() => setGoOnline(true)}>Create an online account</Button>) : (
            <div className="text-[12px] text-ink3">No game server is reachable{serverUrl() ? ` at ${serverUrl()}` : ''}. See the setup notes for running one.</div>
          )}
        </section>
      )}

      <section className="rounded-[16px] border border-line bg-card p-4 space-y-2">
        <div className="text-[15px] font-semibold text-ink">Game server</div>
        <div className="flex gap-2">
          <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://your-game-server.example" className="flex-1 min-w-0 h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink num" />
          <Button size="sm" variant="secondary" onClick={() => { setServerUrl(server); void probeServer(true); }}>Check</Button>
        </div>
        <div className="text-[12px] text-ink3">{sync.server ? <span className="text-rise">Connected{sync.db ? ` · storage: ${sync.db}` : ''}</span> : sync.server === false ? 'Not reachable — playing on this device.' : 'Checking…'}</div>
      </section>

      <section className="rounded-[16px] border border-line bg-card p-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setScreen('ai')}>✦ AI settings</Button>
        <Button variant="secondary" onClick={() => void signOut()}>{account.kind === 'guest' ? 'Switch account' : 'Log out'}</Button>
        {player && <Button variant="ghost" onClick={() => setScreen('careers')}>Careers</Button>}
        <div className="ml-auto">
          {confirmDelete ? (
            <span className="flex items-center gap-2"><span className="text-[12px] text-fall">Delete {careerCount(account.id)} career{careerCount(account.id) === 1 ? '' : 's'} from this device?</span><Button size="sm" variant="secondary" onClick={() => { deleteAccount(account.id); }}>Delete</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button></span>
          ) : <Button variant="ghost" onClick={() => setConfirmDelete(true)}>{currentAccount()?.kind === 'cloud' ? 'Remove from this device' : 'Delete account'}</Button>}
        </div>
      </section>
    </div>
  );
}
