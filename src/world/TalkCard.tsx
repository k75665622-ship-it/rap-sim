// ─── THE CITY: TALKING TO PEOPLE ───────────────────────────────────────────
//
// Walk up to someone and press E (or ✋): they stop, turn to you, and say
// something that fits who they are and how well you know each other. From
// here you can catch up (a small, once-a-day boost to the relationship),
// text them, open their profile, or play their latest song.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useGameStore, blendedFame } from '../store/gameStore';
import { Avatar } from '../components/social/shared';
import { usePreviewing } from '../audio/preview';
import { playSongById, songKey, stopPreview } from '../audio/quickPlay';
import { hudStore } from './input';
import { cast, describe, type Resident } from './people';
import { phone } from './phone';
import type { NPC } from '../types/game';

const ROLE: Record<string, string> = {
  artist: 'Artist', producer: 'Producer', engineer: 'Engineer', songwriter: 'Songwriter', session_musician: 'Session musician',
  manager: 'Manager', label_ceo: 'Label boss', ar: 'A&R', a_and_r_scout: 'A&R scout', distributor: 'Distributor', rival_manager: 'Manager',
  media: 'Journalist', blogger: 'Blogger', radio_owner: 'Radio owner', dj: 'DJ', publicist: 'Publicist',
  stylist: 'Stylist', photographer: 'Photographer', choreographer: 'Choreographer', promoter: 'Promoter', venue_owner: 'Venue owner',
  tour_manager: 'Tour manager', lawyer: 'Lawyer', investor: 'Investor', local: 'Local',
};

function pick<T>(arr: T[], seed: string): T { let x = 0; for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0; return arr[x % arr.length]; }

function greeting(r: Resident, npc: NPC | undefined, me: { name: string; fame: number }, day: number): string {
  const first = me.name.split(' ')[0];
  const seed = `${r.id}|${day}`;
  if (!npc) {
    if (me.fame < 10) return pick(['Morning! Nice day, eh?', 'Hmm? Oh — hi.', 'You lost? The kitchen is that way.', 'Ei, the heat today…'], seed);
    if (me.fame < 30) return pick([`Wait… are you ${me.name}? From Chirp?`, `My cousin plays your song. ${first}, right?`, 'I know you from somewhere… the radio?'], seed);
    return pick([`${me.name.toUpperCase()}?! Ah! Can I get a picture? My sister won't believe me!`, `No way. ${me.name}. I've had your song on repeat all week.`, `${first}! Sign my phone case, please!`], seed);
  }
  const rel = npc.relationshipScore;
  if (rel >= 40) return pick([`${first}! Long time. You good?`, `My guy ${first}. We need to link properly this week.`, `${first}, I was just talking about you.`], seed);
  if (rel <= -30) return pick(['…Oh. It\'s you.', 'Not today.', 'Keep walking.'], seed);
  const gap = (npc.fame ?? 0) - me.fame;
  switch (r.role) {
    case 'producer': case 'engineer': return pick(['I\'ve got beats in the oven. Hit me up if you\'re cooking.', 'You recording this week? I\'ve got a slot.', 'Your last mix — who did that? Not bad.'], seed);
    case 'dj': case 'radio_owner': case 'media': case 'blogger': return pick(['Send me something for the radio. Something hot.', 'What\'s the next drop? Give me the exclusive.', 'People are talking about you. Good and bad.'], seed);
    case 'manager': case 'label_ceo': case 'ar': case 'a_and_r_scout': return pick(['You got a team yet? Talk to me when you\'re ready.', 'Numbers, numbers. Show me numbers.', 'I see you working. Keep it up.'], seed);
    case 'artist':
      if (gap > 25) return pick([`Yeah? …Oh, ${me.name}, right? I've heard the name.`, 'Can\'t stop, I\'m late for the studio.'], seed);
      if (gap < -25) return pick([`Ah, ${me.name}! Big fan, honestly.`, 'Yo! Let\'s do a song together one day.'], seed);
      return pick(['What you working on?', 'We should get in the booth sometime.', 'This city is small, eh? See everyone everywhere.'], seed);
    default: return pick(['Good to see you out here.', 'Busy day. Catch you later?', 'How\'s the music going?'], seed);
  }
}

export function TalkCard() {
  const hud = useSyncExternalStore(hudStore.subscribe, hudStore.get);
  if (!hud.talk) return null;
  const r = cast().find((x) => x.id === hud.talk);
  if (!r) return null;
  return <Card key={r.id} r={r} />;
}

function Card({ r }: { r: Resident }) {
  const npc = useGameStore((s) => (r.npcId ? s.npcs.find((n) => n.id === r.npcId) : undefined)) as NPC | undefined;
  const player = useGameStore((s) => s.player);
  const day = useGameStore((s) => s.gameDate.day + s.gameDate.month * 31);
  const meet = useGameStore((s) => s.meetInCity);
  const selectNPC = useGameStore((s) => s.selectNPC);
  const top = useGameStore((s) => (r.npcId ? [...s.npcSongs].filter((x) => x.ownerId === r.npcId).sort((a, b) => (b.totalStreams ?? 0) - (a.totalStreams ?? 0))[0] : undefined));
  const playing = usePreviewing();
  const [said, setSaid] = useState<string | null>(null);
  // On a phone the tap that opened this card is followed by a "click" at the
  // same spot — which would land on the card's buttons and close it again.
  // Ignore taps for a moment after it opens.
  const [armed, setArmed] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setArmed(true), 400); return () => window.clearTimeout(t); }, []);
  const close = () => hudStore.set({ talk: null });
  const me = { name: player?.artistName ?? 'you', fame: player ? blendedFame(player) : 0 };
  const line = said ?? greeting(r, npc, me, day);
  const songOn = top ? playing === songKey(top.id) : false;

  const btn = 'h-10 px-3.5 rounded-[10px] text-[13px] font-semibold border transition active:scale-95';
  return (
    <div className="absolute inset-x-0 bottom-0 sm:bottom-6 flex justify-center px-3 pb-3 z-30 rl-fade" style={{ pointerEvents: armed ? 'auto' : 'none' }}>
      <div className="w-full max-w-[440px] rounded-[18px] bg-card/95 backdrop-blur border border-line p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          {npc ? <Avatar name={npc.name} seed={npc.id} size={48} /> : (
            <span className="w-12 h-12 rounded-full bg-cardhover flex items-center justify-center text-[18px] font-bold text-ink2">{r.name[0]}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold truncate">{r.name}</div>
            <div className="text-[12px] text-ink3 truncate">{ROLE[r.role] ?? r.role.replace(/_/g, ' ')}{npc ? ` · fame ${Math.round(npc.fame)}` : ''} · {describe(r)}</div>
          </div>
          <button onClick={close} aria-label="Say bye" className="w-8 h-8 rounded-full text-ink2 hover:text-ink hover:bg-white/5 text-[18px] leading-none">×</button>
        </div>
        <p className="mt-3 text-[14px] leading-snug">“{line}”</p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {npc ? (
            <>
              <button
                className={`${btn} bg-amber text-black border-amber`}
                onClick={() => {
                  const res = meet(npc.id, `outside ${describe(r).replace(/^On the way to |^Inside /, '')}`);
                  setSaid(res.ok ? pick(['Good catching up. Don\'t be a stranger.', 'Respect. Let\'s link soon.', 'Safe, safe. See you around.'], `${r.id}|${day}|bye`) : null);
                  hudStore.toast(res.ok ? `🤝 ${res.message}` : res.message, 2600);
                }}
              >
                Catch up
              </button>
              <button className={`${btn} border-line hover:border-amber/60`} onClick={() => { selectNPC(npc.id); close(); phone.launch('pingchat'); }}>Message</button>
              <button className={`${btn} border-line hover:border-amber/60`} onClick={() => { selectNPC(npc.id); close(); phone.launch('npc_profile'); }}>Profile</button>
              {top ? (
                <button
                  className={`${btn} ${songOn ? 'bg-amber text-black border-amber' : 'border-line hover:border-amber/60'}`}
                  onClick={() => (songOn ? stopPreview() : void playSongById(top.id, { seconds: 90 }))}
                  title={top.title}
                >
                  {songOn ? '■ Stop' : `▶ "${top.title.length > 16 ? `${top.title.slice(0, 15)}…` : top.title}"`}
                </button>
              ) : null}
            </>
          ) : me.fame >= 20 ? (
            <button
              className={`${btn} bg-amber text-black border-amber`}
              onClick={() => { hudStore.toast(`📸 ${r.name} posts it: "Just met ${me.name} in the street 😭🔥"`, 3200); close(); }}
            >
              Take a selfie
            </button>
          ) : null}
          <button className={`${btn} border-line text-ink2 hover:text-ink`} onClick={close}>Bye</button>
        </div>
      </div>
    </div>
  );
}
