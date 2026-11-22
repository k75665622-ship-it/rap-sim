// ─── CITY (FREE ROAM) ──────────────────────────────────────────────────────
//
// Walk and drive round town. Doors open the game's existing screens — the
// studio door opens the Studio, The Stage opens Shows, and so on — and the
// back button brings you out on the pavement where you went in.
//
// Your phone comes out with P (or the phone button): chats, mail, socials and
// the rest open inside it while the city carries on behind.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CityCanvas } from '../../world/CityCanvas';
import { Hud } from '../../world/Hud';
import { Phone } from '../../world/Phone';
import { phone, usePhoneOpen } from '../../world/phone';
import { attachInput, hudStore, input } from '../../world/input';
import type { Place } from '../../world/layout';
import { live } from '../../world/sim';
import { radio } from '../../world/radio';
import { cast } from '../../world/people';
import { cityLayout } from '../../world/layout';

// Dev hook, like the store's: lets the console or a test script see where the
// player and the car are.
(window as unknown as { __rapCity?: unknown }).__rapCity = { layout: cityLayout, live, hud: hudStore.get, phone, people: cast, radio, input };

export function CityScreen({ app }: { app: ReactNode | null }) {
  const setScreen = useGameStore((s) => s.setScreen);
  const look = useGameStore((s) => s.player?.look);
  // On a phone the phone covers the whole screen: stop drawing the city
  // behind it to save battery.
  const phoneOut = usePhoneOpen();
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  useEffect(() => attachInput(), []);
  // Phones play the city sideways: lock it where the browser allows, and ask
  // for a turn where it doesn't.
  const [portrait, setPortrait] = useState(() => coarse && window.innerHeight > window.innerWidth);
  useEffect(() => {
    if (!coarse) return;
    const upd = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', upd);
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    try { o?.lock?.('landscape').catch(() => {}); } catch { /* not allowed outside fullscreen */ }
    return () => { window.removeEventListener('resize', upd); try { o?.unlock?.(); } catch { /* ignore */ } };
  }, [coarse]);
  // Leaving the city puts the phone away.
  useEffect(() => () => phone.reset(), []);

  // P takes the phone out or puts it away; Escape puts it away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'KeyP' && !e.repeat) { if (phone.isOpen()) phone.close(); else phone.open(); }
      if (e.code === 'Escape' && phone.isOpen()) phone.close();
      else if (e.code === 'Escape' && hudStore.get().talk) hudStore.set({ talk: null });
      if (e.code === 'KeyR' && !e.repeat && live.mode === 'car') radio.next();
      const h = hudStore.get();
      const free = !phone.isOpen() && !h.talk && !h.gig && !h.shooting && live.mode === 'foot';
      if (e.code === 'KeyG' && !e.repeat && free && h.nearStage) hudStore.set({ gig: true });
      if (e.code === 'KeyV' && !e.repeat && free) hudStore.set({ shooting: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useMessageAlerts();

  const onEnter = useCallback((place: Place) => {
    if (place.screen) setScreen(place.screen);
    else hudStore.toast(place.soon ?? `${place.name} is closed.`);
  }, [setScreen]);

  return (
    <div className="fixed inset-0 bg-[#9cc3e6] overflow-hidden select-none" style={{ touchAction: 'none' }}>
      <CityCanvas look={look} onEnter={onEnter} paused={phoneOut && coarse && window.innerWidth < 640} />
      <Hud onExit={() => { phone.reset(); setScreen('dashboard'); }} />
      <Phone app={app} />
      {portrait ? (
        <div className="absolute inset-0 z-[90] bg-[#0A0B10]/95 flex flex-col items-center justify-center gap-4 text-center px-8" onClick={() => { try { void document.documentElement.requestFullscreen?.().then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')).catch(() => {}); } catch { /* ignore */ } }}>
          <div className="text-[56px] rl-fade" style={{ transform: 'rotate(90deg)' }}>📱</div>
          <div className="text-[20px] font-black text-ink">Turn your phone sideways</div>
          <div className="text-[13px] text-ink2">RAP LIFE plays in landscape, so the pedals and the wheel sit under your thumbs. Tap here to go full screen.</div>
        </div>
      ) : null}
    </div>
  );
}

/** A buzz when a text or an email lands while you're out. */
function useMessageAlerts() {
  useEffect(() => {
    const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const hint = touch ? 'tap 📱' : 'press P';
    const counts = () => {
      const s = useGameStore.getState();
      const threads: Record<string, number> = {};
      for (const [id, t] of Object.entries(s.dmThreads)) threads[id] = t.unread;
      return { threads, mail: s.mailbox.filter((m) => !m.read).length };
    };
    let prev = counts();
    return useGameStore.subscribe((s) => {
      const now = counts();
      if (!phone.isOpen()) {
        const fresh = Object.keys(now.threads).find((id) => now.threads[id] > (prev.threads[id] ?? 0));
        if (fresh) {
          const who = s.npcs.find((n) => n.id === fresh)?.name ?? 'Someone';
          hudStore.toast(`📱 New message from ${who} — ${hint}`);
        } else if (now.mail > prev.mail) {
          const m = s.mailbox.find((x) => !x.read);
          hudStore.toast(`📧 New email${m ? ` from ${m.fromName}: ${m.subject}` : ''} — ${hint}`);
        }
      }
      prev = now;
    });
  }, []);
}
