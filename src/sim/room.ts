// ─── THE ROOM ───────────────────────────────────────────────────────────────
//
// Where a record is tracked is a purchase, and until now the only version of it
// was the crew: an in-house engineer "makes the tracking cleaner". That covers
// the hands, not the desk. This file covers the desk.
//
// Two ways to get a better room, and they are deliberately different purchases:
//
//   * OWN IT — a personal studio, bought a slot at a time and upgraded forever.
//     Capital, and it never has to be paid for twice.
//   * RENT IT — pay per session for somebody else's room. No commitment, and a
//     room you could never afford to build.
//
// Everything here is static DATA. Nothing is random and nothing is stored
// except the levels the player owns, so the same gear always produces the same
// number — which is what lets the editor's preview and the recorded master be
// scored by the same function with the same inputs. A preview that quietly
// omitted the room would lie about the record by exactly the size of the room.
//
// The two bonuses are combined in exactly ONE place — `roomProductionBonus` —
// and they do NOT stack: a rented flagship is somebody else's gear, not an
// addition to your own. Owning a great room is what eventually makes renting
// pointless, which is the honest shape of that decision.

/** One rung of a gear slot. `bonus` is what the slot is worth AT that level. */
export interface GearTier {
  level: number;
  name: string;
  /** What it costs to move up TO this level. */
  price: number;
  /** Production points this level contributes, replacing the level below it. */
  bonus: number;
  blurb: string;
}

export interface GearSlot {
  id: GearSlotId;
  name: string;
  emoji: string;
  /** What the slot is for, in one line. */
  what: string;
  tiers: GearTier[];
}

export type GearSlotId = 'mic' | 'preamp' | 'monitors' | 'treatment' | 'console';

/**
 * The personal studio, five slots, three rungs each.
 *
 * Prices climb steeply on purpose: the entry rung of every slot is a few
 * hundred dollars, so a broke artist can start improving the room almost
 * immediately, and the top rung is a five-figure statement piece that only a
 * working artist ever reaches. The top of everything is +20 production points,
 * against roughly +3 to +8 from a good crew — a room is the bigger lever, and
 * it is the one the player can see on a shelf.
 */
export const GEAR_SLOTS: GearSlot[] = [
  {
    id: 'mic',
    name: 'Microphone',
    emoji: '🎤',
    what: 'The front end. Everything downstream is only as good as what this catches.',
    tiers: [
      { level: 1, name: 'USB Condenser', price: 1_200, bonus: 1, blurb: 'Plugged straight into a laptop. Better than a phone.' },
      { level: 2, name: 'Studio Condenser', price: 6_500, bonus: 2, blurb: 'A proper large-diaphragm mic and a shock mount.' },
      { level: 3, name: 'Tube Reference', price: 28_000, bonus: 4, blurb: 'The one the big rooms keep behind glass.' },
    ],
  },
  {
    id: 'preamp',
    name: 'Preamp & Converter',
    emoji: '🎚️',
    what: 'How cleanly the signal gets into the machine.',
    tiers: [
      { level: 1, name: 'Bus-powered Interface', price: 900, bonus: 1, blurb: 'Two inputs, fine until you push it.' },
      { level: 2, name: 'Clean Preamp Pair', price: 7_500, bonus: 2, blurb: 'Headroom, so a loud take stops clipping.' },
      { level: 3, name: 'Mastering Converter', price: 34_000, bonus: 4, blurb: 'Nothing added and nothing taken away.' },
    ],
  },
  {
    id: 'monitors',
    name: 'Monitors',
    emoji: '🔊',
    what: 'You cannot fix what you cannot hear.',
    tiers: [
      { level: 1, name: 'Nearfield Pair', price: 1_100, bonus: 1, blurb: 'Small boxes, honest enough for a rough.' },
      { level: 2, name: 'Three-way Mains', price: 9_000, bonus: 2, blurb: 'You start hearing the low end properly.' },
      { level: 3, name: 'Mastering Monitors', price: 42_000, bonus: 4, blurb: 'Hears the mistake before the client does.' },
    ],
  },
  {
    id: 'treatment',
    name: 'Room Treatment',
    emoji: '🧱',
    what: 'The cheapest upgrade and the one most people skip.',
    tiers: [
      { level: 1, name: 'Foam Corner Kit', price: 600, bonus: 1, blurb: 'Kills the worst of the flutter.' },
      { level: 2, name: 'Bass Traps & Panels', price: 5_200, bonus: 2, blurb: 'Measured, placed, and worth every cent.' },
      { level: 3, name: 'Purpose-built Booth', price: 26_000, bonus: 3, blurb: 'A room that only ever does one job.' },
    ],
  },
  {
    id: 'console',
    name: 'Console & Outboard',
    emoji: '🎛️',
    what: 'The desk the whole session runs through.',
    tiers: [
      { level: 1, name: 'Channel Strip', price: 2_000, bonus: 1, blurb: 'One good strip in front of the interface.' },
      { level: 2, name: 'Summing Desk', price: 12_000, bonus: 3, blurb: 'The mix stops being a folder of files.' },
      { level: 3, name: 'Large-format Console', price: 55_000, bonus: 5, blurb: 'A desk with its own reputation.' },
    ],
  },
];

export interface RentalRoom {
  id: string;
  name: string;
  emoji: string;
  /** Charged per session, on top of the session's own cost. */
  price: number;
  /** Production points this room is worth. */
  bonus: number;
  blurb: string;
  /**
   * Fame a room's front desk asks for before it will take the booking. A
   * flagship does not hire itself out to somebody with no draw — the same
   * argument `venueLockReason` makes about a stadium.
   */
  minFame?: number;
}

/**
 * Rooms you can hire by the session.
 *
 * The ladder is priced so that renting a room better than the one you own is
 * always possible and never cheap, and so the top of it costs more per session
 * than most records will earn back. That is not a mistake: a flagship room is
 * an event, not a habit, and the player who books one is buying a record that
 * has to be good.
 */
export const RENTAL_ROOMS: RentalRoom[] = [
  {
    id: 'bedroom', name: 'Bedroom Setup', emoji: '🛏️', price: 180, bonus: 1,
    blurb: 'A treated corner, a borrowed interface and no clock on the wall.',
  },
  {
    id: 'project', name: 'Project Room', emoji: '🎹', price: 750, bonus: 3,
    blurb: 'A small commercial room. Clean enough to release off.',
  },
  {
    id: 'pro', name: 'Pro Room', emoji: '🎚️', price: 2_800, bonus: 6, minFame: 35,
    blurb: 'An engineer on the desk and a live room you can actually use.',
  },
  {
    id: 'flagship', name: 'Flagship Room', emoji: '🏛️', price: 9_500, bonus: 10, minFame: 60,
    blurb: 'The room on the postcards. Booked months out, and it sounds like it.',
  },
];

// ─── THE BUILDING ───────────────────────────────────────────────────────────
//
// Gear goes INTO a room, and the room is a building you own. A bedroom corner
// cannot take a large-format console; a flagship complex has a live room, a
// vocal booth and a lounge the label people want to be seen in. The building
// is the big purchase, it has rent and power bills every month, and when you
// are not in it you can rent it out — which pays some of the bills, never all.
//
// Stored as `studio.levels.building` so it rides on the existing save and the
// one function every preview already calls (`roomProductionBonus`).

export interface HomeStudioTier {
  level: number;
  name: string;
  emoji: string;
  /** One-off cost to move up TO this level. */
  build: number;
  /** Monthly: rent, power, insurance, the cleaner. */
  upkeep: number;
  /** Production points the building itself adds, on top of the gear in it. */
  bonus: number;
  /** The highest gear rung this room can take. */
  gearCap: number;
  /** How much faster the team turns beats around in here. */
  beatSpeed: number;
  /** A month of renting it out to other artists, at fame 50. */
  rentOut: number;
  blurb: string;
  perks: string[];
}

export const HOME_STUDIO_TIERS: HomeStudioTier[] = [
  { level: 0, name: 'Bedroom corner', emoji: '🛏️', build: 0, upkeep: 0, bonus: 0, gearCap: 1, beatSpeed: 1, rentOut: 0,
    blurb: 'A laptop, a mic and a blanket on the wall.', perks: ['Entry-level gear only'] },
  { level: 1, name: 'Home studio', emoji: '🏠', build: 12_000, upkeep: 350, bonus: 1, gearCap: 2, beatSpeed: 1, rentOut: 0,
    blurb: 'A spare room, properly treated. Your own key, your own hours.', perks: ['Takes mid-range gear', '+1 production'] },
  { level: 2, name: 'Project studio', emoji: '🎹', build: 60_000, upkeep: 1_400, bonus: 2, gearCap: 3, beatSpeed: 1.25, rentOut: 900,
    blurb: 'A small commercial space: control room and a booth.', perks: ['Takes top-end gear', '+2 production', 'Team makes beats 25% faster', 'Can be rented out'] },
  { level: 3, name: 'Pro studio', emoji: '🎚️', build: 220_000, upkeep: 4_500, bonus: 4, gearCap: 3, beatSpeed: 1.5, rentOut: 3_200,
    blurb: 'A live room, two booths and a lounge. Artists ask to work here.', perks: ['+4 production', 'Team makes beats 50% faster', 'Better rent-out income', 'Artists want to session with you'] },
  { level: 4, name: 'Flagship complex', emoji: '🏛️', build: 750_000, upkeep: 13_000, bonus: 6, gearCap: 3, beatSpeed: 2, rentOut: 9_000,
    blurb: 'The building on the album credits. Three rooms, always booked.', perks: ['+6 production', 'Team makes beats twice as fast', 'Top rent-out income', 'A landmark — fame and respect'] },
];

export function buildingLevel(levels: GearLevels | undefined): number {
  return Math.max(0, Math.min(HOME_STUDIO_TIERS.length - 1, levels?.building ?? 0));
}
export function buildingTier(levels: GearLevels | undefined): HomeStudioTier {
  return HOME_STUDIO_TIERS[buildingLevel(levels)];
}

/** A month of renting the room out. Fame fills the calendar. */
export function rentOutIncome(tier: HomeStudioTier, fame: number, roll: number): number {
  if (!tier.rentOut) return 0;
  return Math.round(tier.rentOut * (0.45 + Math.min(100, fame) / 90) * (0.8 + roll * 0.4) / 10) * 10;
}

// ─── READING THE GEAR ───────────────────────────────────────────────────────

/** Owned levels, keyed by slot. Missing means nothing is owned in that slot. */
export type GearLevels = Record<string, number>;

/** The rung the player owns in a slot, or `undefined` when they own none. */
export function gearTierOf(slotId: string, level: number): GearTier | undefined {
  const slot = GEAR_SLOTS.find((s) => s.id === slotId);
  if (!slot || !level) return undefined;
  return slot.tiers.find((t) => t.level === level);
}

/** The rung that buying this slot next would get you. */
export function nextGearTier(slotId: string, level: number): GearTier | undefined {
  const slot = GEAR_SLOTS.find((s) => s.id === slotId);
  if (!slot) return undefined;
  return slot.tiers.find((t) => t.level === level + 1);
}

/**
 * Production points from everything the player owns.
 *
 * Levels REPLACE rather than accumulate: a level-3 mic is worth 4 points, not
 * 1+2+4. You own one microphone.
 */
export function gearBonus(levels: GearLevels | undefined): number {
  if (!levels) return 0;
  let total = buildingTier(levels).bonus;
  for (const slot of GEAR_SLOTS) {
    const tier = gearTierOf(slot.id, levels[slot.id] ?? 0);
    if (tier) total += tier.bonus;
  }
  return total;
}

/**
 * How much of the catalogue is owned, for a progress read.
 *
 * `owned` and `slots` are in the SAME unit on purpose — both count slots. An
 * earlier version counted slots in one and rungs in the other, which read as
 * "2 of 15" and meant nothing.
 */
export function gearProgress(levels: GearLevels | undefined): {
  owned: number;
  slots: number;
  bonus: number;
  maxBonus: number;
} {
  const l = levels ?? {};
  let owned = 0;
  let maxBonus = HOME_STUDIO_TIERS[HOME_STUDIO_TIERS.length - 1].bonus;
  for (const slot of GEAR_SLOTS) {
    if (l[slot.id]) owned += 1;
    maxBonus += slot.tiers[slot.tiers.length - 1].bonus;
  }
  return { owned, slots: GEAR_SLOTS.length, bonus: gearBonus(l), maxBonus };
}

/** The cost to kit the whole studio out, from wherever the player is now. */
export function gearToMaxCost(levels: GearLevels | undefined): number {
  const l = levels ?? {};
  let total = 0;
  for (const slot of GEAR_SLOTS) {
    const have = l[slot.id] ?? 0;
    for (const tier of slot.tiers) if (tier.level > have) total += tier.price;
  }
  return total;
}

export function roomById(id: string | undefined | null): RentalRoom | undefined {
  if (!id) return undefined;
  return RENTAL_ROOMS.find((r) => r.id === id);
}

/** Whether a room's front desk would take this artist's booking. */
export function roomLockReason(room: RentalRoom, fame: number): string | null {
  if (room.minFame === undefined) return null;
  if (fame >= room.minFame) return null;
  return `Requires a ${room.minFame} fame draw before they will take the booking.`;
}

/**
 * THE ONE PLACE the room's contribution is worked out.
 *
 * Gear and a rental do not stack — a rented flagship is somebody else's room,
 * so the better of the two is what you actually record through. `source` says
 * which one won, because the player paid for a specific thing and the UI has to
 * be able to name it.
 *
 * Callers must not add the two together themselves. Two places doing this
 * arithmetic is how the preview and the master end up disagreeing.
 */
export function roomProductionBonus(
  levels: GearLevels | undefined,
  roomId?: string | null,
): { bonus: number; fromGear: number; fromRoom: number; source: 'gear' | 'rental' | 'none' } {
  const fromGear = gearBonus(levels);
  const fromRoom = roomById(roomId)?.bonus ?? 0;
  if (fromRoom > fromGear) return { bonus: fromRoom, fromGear, fromRoom, source: 'rental' };
  if (fromGear > 0) return { bonus: fromGear, fromGear, fromRoom, source: 'gear' };
  return { bonus: 0, fromGear: 0, fromRoom, source: 'none' };
}

/**
 * One line describing where the player is recording, for the session summary.
 * Always says something — "no room" is itself information the player needs,
 * because it is the difference between a record and a demo.
 */
export function roomSummary(levels: GearLevels | undefined, roomId?: string | null): string {
  const { source, bonus } = roomProductionBonus(levels, roomId);
  const room = roomById(roomId);
  if (source === 'rental' && room) return `${room.name} (+${bonus} production)`;
  if (source === 'gear') {
    const { owned } = gearProgress(levels);
    return `Your ${buildingTier(levels).name.toLowerCase()}, ${owned} of ${GEAR_SLOTS.length} slots kitted (+${bonus} production)`;
  }
  return 'No room of your own and nothing rented — tracking as it comes.';
}
