// Story Director — Layers 1 & 2 (rule-based, no AI required)
// Layer 3 (AI narration) hooks in through the event system

import type { GameState, OpenThread, NPC } from '../types/game';
import { generateStoryEvent } from '../ai/offlineProvider';
import { v4 as uuidv4 } from 'uuid';

export interface StoryEvent {
  id: string;
  type: string;
  headline: string;
  description: string;
  involvedNPCIds: string[];
  effectType: 'fame' | 'money' | 'reputation' | 'relationship' | 'chart' | 'none';
  effectValue: number;
  openThread?: Partial<OpenThread>;
  priority: number;
}

// ─── LAYER 1: TRIGGER SCAN ────────────────────────────────────────────────

/**
 * Return one uniformly random NPC satisfying `match`, in a single pass.
 *
 * Replaces `npcs.filter(match)[random index]`. With a ~12,000 roster the filter
 * copies every match into a new array on a tick that only ever uses one of
 * them; reservoir sampling keeps it O(n) time and O(1) space.
 */
function sampleMatching(npcs: NPC[], match: (n: NPC) => boolean): NPC | undefined {
  let found: NPC | undefined;
  let seen = 0;
  for (const npc of npcs) {
    if (!match(npc)) continue;
    seen++;
    if (Math.random() < 1 / seen) found = npc;
  }
  return found;
}

function scanTriggers(state: GameState): StoryEvent[] {
  const events: StoryEvent[] = [];
  const { player, npcs, openThreads, songs, turnCount } = state;
  if (!player) return events;

  // Fame threshold events
  if (player.career.localFame >= 30 && !openThreads.some(t => t.type === 'label' && !t.resolved)) {
    events.push({
      id: uuidv4(),
      type: 'label_interest',
      headline: 'Local Label Shows Interest',
      description: 'A local label has noticed your growing local fame and wants to discuss a deal.',
      involvedNPCIds: ['manager_player'],
      effectType: 'none',
      effectValue: 0,
      priority: 6,
      openThread: { type: 'label', description: 'Local label interested in signing you', priority: 6 },
    });
  }

  if (player.career.localFame >= 50 && player.career.nationalFame < 20) {
    events.push({
      id: uuidv4(),
      type: 'national_push',
      headline: 'Fans Want More',
      description: 'Your local fanbase is buzzing. Time to push nationally or they will plateau.',
      involvedNPCIds: [],
      effectType: 'fame',
      effectValue: 3,
      priority: 4,
      openThread: { type: 'deal', description: 'National push opportunity', priority: 4 },
    });
  }

  // Low money trigger
  if (player.career.money < 500 && turnCount > 4) {
    events.push({
      id: uuidv4(),
      type: 'money_crisis',
      headline: 'Running Low on Funds',
      description: 'Your funds are critically low. Time to book a show or release something.',
      involvedNPCIds: [],
      effectType: 'none',
      effectValue: 0,
      priority: 8,
    });
  }

  // NPC rival trigger — one pass over the roster, keeping a random rival
  // rather than materialising an array of every hostile artist just to use one.
  const rival = sampleMatching(npcs, n => n.relationshipScore < -30 && n.role === 'artist');
  if (rival && Math.random() < 0.15) {
    events.push({
      id: uuidv4(),
      type: 'beef',
      headline: `${rival.name} Takes a Shot`,
      description: generateStoryEvent('beef', rival.name, player.artistName ?? ''),
      involvedNPCIds: [rival.id],
      effectType: 'reputation',
      effectValue: -2,
      priority: 7,
      openThread: { type: 'beef', description: `Beef with ${rival.name}`, involvedNPCIds: [rival.id], priority: 7 },
    });
  }

  // Feature offer from allied NPC
  const ally = sampleMatching(
    npcs,
    n => n.relationshipScore > 50 && n.role === 'artist' && n.tier !== 'international',
  );
  if (ally && Math.random() < 0.12) {
    events.push({
      id: uuidv4(),
      type: 'feature_offer',
      headline: `${ally.name} Wants a Collab`,
      description: generateStoryEvent('feature', ally.name, player.artistName ?? ''),
      involvedNPCIds: [ally.id],
      effectType: 'none',
      effectValue: 0,
      priority: 6,
      openThread: { type: 'feature', description: `Feature opportunity with ${ally.name}`, involvedNPCIds: [ally.id], priority: 6 },
    });
  }

  // Song milestone
  const hitSong = songs.find(s => s.totalStreams > 100_000 && !openThreads.some(t => t.description.includes(s.title)));
  if (hitSong) {
    events.push({
      id: uuidv4(),
      type: 'song_milestone',
      headline: `"${hitSong.title}" Crosses 100K Streams!`,
      description: `Your track "${hitSong.title}" just crossed 100,000 streams. The blogs are taking notice.`,
      involvedNPCIds: ['blog_kojo'],
      effectType: 'fame',
      effectValue: 3,
      priority: 7,
    });
  }

  // Wildcard events (small chance per turn)
  if (Math.random() < 0.08) {
    const wildcards = [
      {
        type: 'wildcard',
        headline: 'Fan Edit Goes Viral',
        description: 'A fan made an edit of your song that\'s taking off on Clip. Unexpected streams incoming.',
        effectType: 'fame' as const,
        effectValue: 2,
      },
      {
        type: 'wildcard',
        headline: 'Old Verse Gets Attention',
        description: 'A freestyle you dropped months ago is getting shared again. People are replaying it.',
        effectType: 'reputation' as const,
        effectValue: 2,
      },
      {
        type: 'wildcard',
        headline: 'International Blog Features You',
        description: 'An international music blog included you in their "Artists to Watch" list.',
        effectType: 'fame' as const,
        effectValue: 4,
      },
    ];
    const wildcard = wildcards[Math.floor(Math.random() * wildcards.length)];
    events.push({
      id: uuidv4(),
      ...wildcard,
      involvedNPCIds: [],
      priority: 5,
    });
  }

  // Open thread escalation — if an existing thread hasn't been resolved
  const unresolvedThreads = openThreads.filter(t => !t.resolved && t.escalationCount < 3);
  for (const thread of unresolvedThreads) {
    if (Math.random() < 0.2) {
      events.push({
        id: uuidv4(),
        type: `escalate_${thread.type}`,
        headline: `The ${thread.type.replace('_', ' ')} situation is heating up`,
        description: `That unresolved situation with ${thread.description} is escalating. You need to address it.`,
        involvedNPCIds: thread.involvedNPCIds ?? [],
        effectType: 'reputation',
        effectValue: -1,
        priority: thread.priority + 1,
        openThread: { ...thread, escalationCount: (thread.escalationCount ?? 0) + 1 },
      });
      break; // only escalate one per turn
    }
  }

  return events;
}

// ─── LAYER 2: WEIGHTED PICK + COMBO DETECTION ────────────────────────────

function pickEvents(events: StoryEvent[], openThreads: OpenThread[]): StoryEvent[] {
  if (events.length === 0) return [];

  // Sort by priority descending
  const sorted = [...events].sort((a, b) => b.priority - a.priority);

  // Combo check: does any event connect to an open thread?
  const comboPicks: StoryEvent[] = [];
  for (const event of sorted) {
    const hasCombo = event.involvedNPCIds.some(npcId =>
      openThreads.some(t => !t.resolved && t.involvedNPCIds?.includes(npcId))
    );
    if (hasCombo) {
      comboPicks.push({ ...event, priority: event.priority + 2 });
    }
  }

  const finalPool = comboPicks.length > 0
    ? [...comboPicks, ...sorted.filter(e => !comboPicks.find(c => c.id === e.id))]
    : sorted;

  // Pick 1-2 events based on priority weighting
  const picked: StoryEvent[] = [finalPool[0]];
  if (finalPool.length > 1 && Math.random() < 0.3) {
    picked.push(finalPool[1]);
  }

  return picked;
}

// ─── MAIN DIRECTOR FUNCTION ───────────────────────────────────────────────

export function runStoryDirector(state: GameState): {
  events: StoryEvent[];
  newOpenThreads: OpenThread[];
  headlines: string[];
} {
  const candidates = scanTriggers(state);
  const picked = pickEvents(candidates, state.openThreads);

  const newOpenThreads: OpenThread[] = [];
  const headlines: string[] = [];

  for (const event of picked) {
    headlines.push(event.headline);

    if (event.openThread) {
      const existing = state.openThreads.find(t =>
        t.type === event.openThread?.type &&
        t.involvedNPCIds?.join(',') === (event.openThread?.involvedNPCIds ?? []).join(',') &&
        !t.resolved
      );

      if (!existing) {
        newOpenThreads.push({
          id: uuidv4(),
          type: (event.openThread.type ?? 'wildcard') as OpenThread['type'],
          description: event.openThread.description ?? event.description,
          involvedNPCIds: event.openThread.involvedNPCIds ?? event.involvedNPCIds,
          startDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          resolved: false,
          priority: event.openThread.priority ?? event.priority,
          escalationCount: 0,
        });
      }
    }
  }

  return { events: picked, newOpenThreads, headlines };
}

// ─── NPC WORLD SIMULATION (background, no AI) ─────────────────────────────

export function simulateNPCWorld(npcs: NPC[], turnCount: number): string[] {
  const events: string[] = [];

  // The roster is thousands strong. Sampling a bounded pool of the more
  // notable artists keeps the world feeling alive without generating hundreds
  // of log lines (and hundreds of comparisons) on every single tick.
  //
  // This used to `filter(fame >= 20)` then `slice()` — copying every qualifying
  // artist (several thousand) before discarding all but 140. Instead we walk
  // the roster once and collect a rotating window of eligible artists, so the
  // cost is O(n) with a fixed-size output and the pool still drifts over time.
  const POOL = 140;
  const eligible: NPC[] = [];
  let matched = 0;
  for (const npc of npcs) {
    if (npc.role !== 'artist' || npc.fame < 20) continue;
    matched++;
    if (eligible.length < POOL) {
      eligible.push(npc);
      continue;
    }
    // Once full, overwrite a slot picked from the running turn offset. The
    // pattern is deterministic per turn, so a given week always sees a stable
    // pool while successive weeks look at different corners of the scene.
    const slot = (turnCount * 37 + matched * 17) % POOL;
    eligible[slot] = npc;
  }

  for (const npc of eligible) {
    if (Math.random() >= 0.06) continue;

    const eventTypes = ['released_song', 'performed_show', 'signed_deal', 'beef_started'];
    const etype = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    switch (etype) {
      case 'released_song':
        events.push(`${npc.name} dropped new music.`);
        break;
      case 'performed_show':
        events.push(`${npc.name} performed at a show in ${npc.city ?? npc.country}.`);
        break;
      case 'signed_deal':
        if (npc.tier === 'local' && turnCount > 10) {
          events.push(`${npc.name} reportedly signed a new deal.`);
        }
        break;
      case 'beef_started':
        if (Math.random() < 0.3) {
          events.push(`${npc.name} posted a subliminal on Chirp. The comments are popping.`);
        }
        break;
    }
  }

  // Only the freshest handful ever reach the player's log.
  return events.slice(0, 6);
}
