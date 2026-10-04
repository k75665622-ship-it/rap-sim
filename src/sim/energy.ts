// ─── ENERGY ────────────────────────────────────────────────────────────────
//
// Energy is the game's real brake. Money alone could not stop a player from
// touring every single day, because a tour had no cost except the booking fee
// and the calendar was free to burn. Energy makes effort finite: you get a
// budget, everything real spends it, and the ONLY way to get it back is to let
// time pass.
//
// One table, one place. If an action costs effort, its number lives here —
// never inline at the call site, or the costs drift apart and the balance
// stops meaning anything.

export const MAX_ENERGY = 100;

export const ENERGY_COSTS = {
  // Studio
  recordQuick: 20,
  recordStandard: 36,
  recordFull: 58,
  mixMaster: 18,
  release: 6,

  // Features — sending a track out is cheap, cutting the verse in is not.
  shopFeature: 4,
  addVerse: 10,
  /**
   * Writing a verse for somebody ELSE's record.
   *
   * More than `addVerse`, and deliberately: cutting somebody's finished verse
   * into your song is an evening's work, whereas writing one is the job. It is
   * the cost of the thing the player is being paid for, so it has to be real or
   * a paid verse is free money.
   */
  writeVerse: 24,

  // Live
  showLocal: 18,
  showUniversity: 20,
  showFestival: 28,
  showTour: 52,

  // Development
  trainLight: 16,
  trainStandard: 30,
  trainElite: 48,

  // Media & comms
  interview: 15,
  musicVideo: 24,
  socialPost: 3,
  sendDM: 1,
  // Getting to know somebody properly is not a message. It is an evening.
  reachOut: 8,
} as const;

export type EnergyAction = keyof typeof ENERGY_COSTS;

/** How much of the budget a given action takes. */
export function energyCost(action: EnergyAction): number {
  return ENERGY_COSTS[action];
}

/**
 * The energy cost of a studio session, which scales with how long you book.
 * Effort 1/2/3 = quick drop / standard / full session.
 */
export function sessionEnergy(effort: 1 | 2 | 3): number {
  return effort === 1
    ? ENERGY_COSTS.recordQuick
    : effort === 2
      ? ENERGY_COSTS.recordStandard
      : ENERGY_COSTS.recordFull;
}

export function showEnergy(type: 'local_club' | 'university' | 'festival' | 'international_tour'): number {
  return type === 'local_club'
    ? ENERGY_COSTS.showLocal
    : type === 'university'
      ? ENERGY_COSTS.showUniversity
      : type === 'festival'
        ? ENERGY_COSTS.showFestival
        : ENERGY_COSTS.showTour;
}

export function trainingEnergy(intensity: 1 | 2 | 3): number {
  return intensity === 1
    ? ENERGY_COSTS.trainLight
    : intensity === 2
      ? ENERGY_COSTS.trainStandard
      : ENERGY_COSTS.trainElite;
}

// ─── READ HELPERS ──────────────────────────────────────────────────────────
// The player sees a state, not a resource number to optimise. The bar is a
// bar; the words carry the meaning.
//
// Both take the CEILING, because a trainer raises it. Read against a fixed 100,
// an artist with a ceiling of 112 is told they are "Fresh" at 85 and shown a
// bar that is nearly full when it is three quarters — the label and the bar
// would both be describing a tank the player has not got.

export function energyLabel(energy: number, max = MAX_ENERGY): string {
  const pct = max > 0 ? energy / max : 0;
  if (pct >= 0.8) return 'Fresh';
  if (pct >= 0.55) return 'Good';
  if (pct >= 0.3) return 'Wearing thin';
  if (energy > 0) return 'Running on fumes';
  return 'Gassed out';
}

export function energyColor(energy: number, max = MAX_ENERGY): string {
  const pct = max > 0 ? energy / max : 0;
  if (pct >= 0.55) return 'bg-green-500';
  if (pct >= 0.3) return 'bg-yellow-500';
  if (energy > 0) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * What the player is told when they try something they have not got the legs
 * for. Deliberately concrete about the fix — the answer is always "let the
 * clock move".
 */
export function energyShortfallMessage(need: number, have: number): string {
  // At zero the advice changes: there is no point looking for a cheaper option,
  // so every caller gets the exhaustion message without having to know about it.
  if (have <= 0) return exhaustedMessage();
  return (
    `You have not got it in you. That takes ${need} energy and you are at ` +
    `${Math.floor(have)}. Rest — sleep a few hours, or sim a day — and come back to it.`
  );
}

// ─── REST ──────────────────────────────────────────────────────────────────
//
// The other way to get energy back, and the one that costs you almost no time.
//
// Letting the clock run a whole day refills you completely, but it costs a day
// — the world moves, the charts publish, and the day is gone. Resting costs
// three game hours and does the same thing. That is the trade: a day buys you
// progress as well as energy, and a sleep buys you only the energy. So the
// player with a full afternoon ahead of them sleeps, and the player with
// nothing left to do sims the day.
//
// Anything shorter than three hours is a partial recovery — a share of the gap
// rather than a flat number, so resting twice for half the time is worth the
// same as resting once for the whole of it. No exploit, no penalty for
// choosing the smaller option.

/** How long a rest has to be to count as a full sleep. */
export const FULL_REST_MINUTES = 180;

export interface RestOption {
  minutes: number;
  label: string;
  blurb: string;
}

/** The durations the player can choose. Nothing below half an hour. */
export const REST_OPTIONS: RestOption[] = [
  { minutes: 30, label: '30 min', blurb: 'A breather. Takes the edge off, nothing more.' },
  { minutes: 60, label: '1 hour', blurb: 'A nap. You can work again — not well.' },
  { minutes: 120, label: '2 hours', blurb: 'A proper sleep. Most of it comes back.' },
  { minutes: 180, label: '3 hours', blurb: 'A full sleep. All of it comes back.' },
];

/**
 * What the player's energy is after resting for `minutes`.
 *
 * Three hours or more is a full night in one go. Below that it is the same
 * fraction of the *gap* between where they are and full, which is what keeps
 * two short rests equal to one long one.
 */
export function restRecovery(minutes: number, energy: number, max: number): number {
  if (minutes >= FULL_REST_MINUTES) return max;
  const share = Math.max(0, Math.min(1, minutes / FULL_REST_MINUTES));
  return Math.min(max, energy + Math.round((max - energy) * share));
}

/**
 * What the clock alone does, which is the same rule as a rest.
 *
 * This is the replacement for the old blanket `energy = max` at the top of a
 * turn. That assignment was not a model, it was a reset: it said a turn is a
 * rest no matter how much time the turn was worth, and it made the partial
 * rests meaningless the moment the clock crossed midnight — a 30-minute nap at
 * 23:50 rolled a day, and the day put you back to full anyway.
 *
 * Time is now converted to energy the same way a rest is: three hours of
 * elapsed game time is a full night, and less than that closes the same
 * fraction of the gap. A day, a week and a month all exceed three hours, so
 * they still leave you fresh — which is the correct answer, because a day
 * contains a night — but the rule is now stated once, in one place, instead of
 * being a magic assignment that contradicted the sleep mechanic next to it.
 */
export const MINUTES_PER_DAY = 24 * 60;

export function elapsedRecovery(days: number, energy: number, max: number): number {
  if (days <= 0) return energy;
  return restRecovery(days * MINUTES_PER_DAY, energy, max);
}

/** Is there anything left to recover? */
export function needsRest(energy: number, max: number): boolean {
  return energy < max;
}

/**
 * Why a rest was refused, in the player's words. A disabled control with no
 * explanation is the same thing as a broken one.
 */
export function restRefusal(minutes: number, energy: number, max: number): string | null {
  if (minutes < 30) {
    return 'That is not a rest, that is standing still. Give it at least half an hour.';
  }
  if (!needsRest(energy, max)) {
    return 'You are not tired. Go and do something with the day instead.';
  }
  return null;
}

/**
 * What a rest is worth, said plainly, for the control that offers it.
 *
 * `mult` is the payroll's rest multiplier — a personal assistant makes a nap
 * worth more. It is passed in rather than looked up, because this file knows
 * nothing about who works for you and should not start.
 */
export function restOutcomeLine(minutes: number, energy: number, max: number, mult = 1): string {
  const base = restRecovery(minutes, energy, max);
  const after = Math.min(max, Math.round(energy + (base - energy) * mult));
  const gained = after - energy;
  if (gained <= 0) return 'Nothing to recover.';
  return `+${gained} energy → ${after}/${max}`;
}

/**
 * What the player is told when they are too gassed to do anything at all.
 * Distinct from the ordinary shortfall, because the fix is different: at zero
 * there is no point looking for a cheaper option, there is only sleeping.
 */
export function exhaustedMessage(): string {
  return (
    'You are gassed out — nothing left in the tank. Sleep. ' +
    'Three hours will put you right back to full.'
  );
}
