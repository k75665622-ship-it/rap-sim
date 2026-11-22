// STAGE 7e — Act II for the Producer, Manager, Singer, Director and DJ.
// Each seat ends Act II with `ch2_done`, which opens the gala.
import type { Arc, Cond, Effect, StoryNode } from '../types';

const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const rep = (axis: 'integrity' | 'hustle' | 'heart', v: number): Effect => ({ k: 'rep', axis, v });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral', kind: 'people' | 'money' | 'career' | 'music' | 'beef' = 'career'): Effect => ({ k: 'memory', text, tone, kind, weight: 4 });
const flag = (id: string, v?: boolean): Cond => ({ k: 'flag', id, v });
const all = (...of: Cond[]): Cond => ({ k: 'all', of });

// ── PRODUCER · "The Sleeve" ─────────────────────────────────────────────────
const producer: StoryNode[] = [
  {
    id: 'pb1_credit', arc: 'sleeve', channel: 'text', from: 'ankh', expires: 4, title: 'Whose name goes on the sleeve',
    lapse: { fx: [f('credit_unclaimed')], schedule: { node: 'pb2_stem', days: 3 } },
    lines: [
      { who: 'ankh', text: "Your beat is in three songs this month. Two of them have an engineer's name where yours should be." },
      { who: 'ankh', text: "I can fix it with one phone call. But the call costs a favour from Efua, and I owe her enough." },
    ],
    choices: [
      { id: 'fight', label: 'Make the call. I want my name on it.', tone: 'sharp', fx: [bond('ankh', -2), bond('efua', 3), rep('hustle', 3), f('credit_fought'), sched('pb2_stem', 3)] },
      { id: 'let', label: "Leave it. The music matters more.", tone: 'quiet', fx: [bond('ankh', 3), rep('heart', 2), f('credit_let_go'), sched('pb2_stem', 3)] },
      { id: 'own', label: "I'll tell the engineer to his face.", tone: 'honest', fx: [rep('integrity', 3), f('credit_faced'), sched('pb2_stem', 3)] },
    ],
  },
  {
    id: 'pb2_stem', arc: 'sleeve', channel: 'encounter', from: 'ankh', where: 'studio', expires: 6, title: 'The vocal stem',
    lapse: { fx: [f('stem_unheard')], schedule: { node: 'pb3_firstlisten', days: 2 } },
    lines: [
      { who: 'narr', text: "Ankh slides a hard drive across the desk like a man handing over a gun." },
      { who: 'ankh', text: "Reel 9, ripped clean. One vocal, no music. I couldn't bring myself to play it for anyone but you." },
      { who: 'narr', text: "You solo the track. A woman, thirty-three, a tiny crack in the third note. You have heard that crack at a hundred Friday cyphers." },
    ],
    choices: [
      { id: 'copy', label: 'Keep a copy. Safe, offline, mine.', tone: 'sly', fx: [f('has_reel9'), bond('ankh', 2), rep('hustle', 2), sched('pb3_firstlisten', 2)] },
      { id: 'ret', label: 'Hand the drive back. It belongs in the open.', tone: 'honest', fx: [f('reel9_heard'), bond('ankh', 4), rep('integrity', 3), sched('pb3_firstlisten', 2)] },
    ],
  },
  {
    id: 'pb3_firstlisten', arc: 'sleeve', channel: 'call', from: 'efua', hours: [18, 23], expires: 2, title: 'Who gets the first listen',
    lapse: { fx: [f('ch2_done'), f('efua_unanswered')], goto: undefined },
    lines: [
      { who: 'efua', text: "I hear you have been listening to old tape. I would like to be the first to hear what you make of it." },
      { who: 'efua', text: "A producer who works for me will never be short of rooms. A producer who works against me will find the rooms quite cold." },
    ],
    choices: [
      { id: 'efua', label: "Efua first. Let her hear it, and decide what she does.", tone: 'sly', fx: [bond('efua', 6), rep('hustle', 4), rep('integrity', -4), f('first_listen_efua'), f('ch2_done'), { k: 'end', arc: 'sleeve', outcome: 'hired-hand' }] },
      { id: 'esi', label: "Esi first. It's her voice. It's her call.", tone: 'kind', fx: [bond('esi', 8), bond('efua', -4), rep('heart', 5), f('first_listen_esi'), f('ch2_done'), mem('You played Mama Esi her own voice before anyone else heard it.', 'good', 'people'), { k: 'end', arc: 'sleeve', outcome: 'name-on-sleeve' }] },
      { id: 'afia', label: "Afia first. It goes in a file before it goes in a room.", tone: 'honest', fx: [bond('afia', 6), rep('integrity', 5), f('first_listen_afia'), f('with_afia'), f('ch2_done'), { k: 'end', arc: 'sleeve', outcome: 'quiet-craftsman' }] },
    ],
  },
];

// ── MANAGER · "Three Clients" ───────────────────────────────────────────────
const manager: StoryNode[] = [
  {
    id: 'mb1_third', arc: 'three', channel: 'encounter', from: 'adwoa', where: 'city', expires: 6, title: 'A new kid, a cold coffee',
    lapse: { fx: [f('third_client_passed')], schedule: { node: 'mb2_conflict', days: 2 } },
    lines: [
      { who: 'narr', text: "A teenager with a notebook and a speaker the size of a lunchbox is waiting outside your office. Adwoa gave him your number." },
      { who: 'adwoa', text: "He's good. He's also going to ruin your calendar. Take him anyway." },
    ],
    choices: [
      { id: 'sign', label: "Sign him. Three clients. I can hold three.", tone: 'sly', fx: [f('third_client'), rep('hustle', 3), sched('mb2_conflict', 3)] },
      { id: 'pass', label: "Not yet. I'd be selling you short.", tone: 'honest', fx: [bond('adwoa', 3), rep('integrity', 2), f('third_client_passed'), sched('mb2_conflict', 3)] },
    ],
  },
  {
    id: 'mb2_conflict', arc: 'three', channel: 'call', from: 'mimi', hours: [9, 21], expires: 2, title: 'Mimi: one slot, three names',
    lapse: { fx: [f('slot_lost'), bond('mimi', -3)], schedule: { node: 'mb3_choice', days: 3 } },
    lines: [
      { who: 'mimi', text: "GCS has exactly one opening act slot on the gala bill. Adwoa wants it. Static needs it for the contract. And the boy has never been on a stage." },
      { who: 'mimi', text: "I can only put one name on the paper. You tell me whose." },
    ],
    choices: [
      { id: 'adwoa', label: 'Adwoa. She trusted me first.', tone: 'kind', fx: [bond('adwoa', 6), bond('static', -3), f('slot_adwoa'), sched('mb3_choice', 3)] },
      { id: 'static', label: 'Static. The contract needs it.', tone: 'sly', fx: [bond('static', 5), bond('adwoa', -5), rep('hustle', 4), f('slot_static'), sched('mb3_choice', 3)] },
      { id: 'kid', label: 'The boy. Somebody has to bet on the unknown.', tone: 'honest', fx: [rep('heart', 4), bond('adwoa', -2), f('slot_kid'), sched('mb3_choice', 3)] },
    ],
  },
  {
    id: 'mb3_choice', arc: 'three', channel: 'encounter', from: 'afia', where: 'city', expires: 7, title: 'The line on the statement',
    lapse: { fx: [f('ch2_done')] },
    lines: [
      { who: 'afia', text: "Line fourteen. The catering company. I traced it. It was formed in 1999 by the same man who funded the tour. It has been paid for twenty-six years for catering that was never served." },
      { who: 'afia', text: "It is not catering. It is hush money, and your clients are on both sides of it. I can't use this without you." },
    ],
    choices: [
      { id: 'file', label: "File it. Whatever it costs my roster.", tone: 'honest', fx: [bond('afia', 8), rep('integrity', 6), f('with_afia'), f('ch2_done'), mem('You gave Afia line fourteen and lost sleep for a month.', 'good'), { k: 'end', arc: 'three', outcome: 'reckoning' }] },
      { id: 'hold', label: "Hold it. Use it as leverage for my clients.", tone: 'sly', fx: [rep('hustle', 5), rep('integrity', -5), bond('mimi', 4), f('hook_leverage'), f('ch2_done'), { k: 'end', arc: 'three', outcome: 'fixer' }] },
      { id: 'bury', label: "Bury it. A small roster that loves me is enough.", tone: 'quiet', fx: [rep('heart', 3), bond('afia', -4), f('ch2_done'), { k: 'end', arc: 'three', outcome: 'trusted-hand' }] },
    ],
  },
];

// ── SINGER · "The Understudy" ───────────────────────────────────────────────
const singer: StoryNode[] = [
  {
    id: 'sb1_rehearsal', arc: 'understudy', channel: 'encounter', from: 'efua', where: 'studio', expires: 6, title: 'Rehearsal for a song that is not yours',
    lapse: { fx: [f('rehearsal_missed')], schedule: { node: 'sb2_kitchen', days: 3 } },
    lines: [
      { who: 'narr', text: "Studio 9. A click track, a stool, a lyric sheet with your name nowhere on it. Efua listens from behind the glass with her arms folded." },
      { who: 'efua', text: "You have the key. You have the grace note. You even have the crack — the third note, a hair flat. Who taught you that?" },
      { who: 'narr', text: "Nobody taught you. You have been humming it since you were four." },
    ],
    choices: [
      { id: 'sing', label: 'Sing it exactly as she wrote it.', tone: 'quiet', fx: [bond('efua', 4), rep('hustle', 3), f('rehearsed_perfect'), sched('sb2_kitchen', 3)] },
      { id: 'ask', label: "Who wrote this? I'd like to know whose song I'm singing.", tone: 'honest', fx: [bond('efua', -3), rep('integrity', 4), f('asked_whose_song'), sched('sb2_kitchen', 3)] },
    ],
  },
  {
    id: 'sb2_kitchen', arc: 'understudy', channel: 'encounter', from: 'esi', where: 'kitchen', expires: 6, title: 'The woman at the stove',
    lapse: { fx: [f('esi_unmet')], schedule: { node: 'sb3_night', days: 2 } },
    lines: [
      { who: 'narr', text: "Mama Esi is humming the second verse over a pot of stew. The same grace note. The same hair-flat third. You stop in the doorway with your bag still on your shoulder." },
      { who: 'esi', text: "You have the look of someone who has seen a ghost. Sit. Eat. We can discuss the ghost after." },
    ],
    choices: [
      { id: 'sing', label: 'Hum along, quietly, a third above.', tone: 'kind', fx: [bond('esi', 8), rep('heart', 5), f('esi_knows_singer'), f('duet_seed'), mem('You hummed a harmony to Mama Esi in her kitchen. She stopped, and then she did not.', 'good', 'music'), sched('sb3_night', 4)] },
      { id: 'ask', label: "Mama, did you write 'Akwaaba Tonight'?", tone: 'honest', fx: [bond('esi', 3), rep('integrity', 4), f('esi_asked_direct'), sched('sb3_night', 4)] },
      { id: 'quiet', label: 'Eat. Say nothing. Memorise everything.', tone: 'quiet', fx: [bond('esi', 2), f('esi_watched'), sched('sb3_night', 4)] },
    ],
  },
  {
    id: 'sb3_night', arc: 'understudy', channel: 'call', from: 'efua', hours: [18, 23], expires: 2, title: 'Efua: the night before the night',
    lapse: { fx: [f('ch2_done')] },
    lines: [
      { who: 'efua', text: "Lady Zee has lost her voice. A throat infection, the doctors say. Which makes you the understudy. You will sing 'Akwaaba Tonight' at the gala in her place." },
      { who: 'efua', text: "I'd like to know now, not on the night, whether you will do it." },
    ],
    choices: [
      { id: 'duet', label: "I'll sing — if Mama Esi sings it with me.", tone: 'kind', if: flag('duet_seed'), fx: [bond('esi', 4), bond('efua', -4), rep('heart', 5), f('ch2_done'), { k: 'end', arc: 'understudy', outcome: 'duet' }] },
      { id: 'sing', label: "I'll sing. In her honour. I'll say her name.", tone: 'honest', fx: [bond('efua', -2), rep('integrity', 4), f('ch2_done'), { k: 'end', arc: 'understudy', outcome: 'understudy' }] },
      { id: 'refuse', label: "No. And I'll say why.", tone: 'sharp', fx: [bond('efua', -8), rep('integrity', 8), f('with_afia'), f('ch2_done'), { k: 'end', arc: 'understudy', outcome: 'whistleblower' }] },
      { id: 'star', label: "Yes. As Naa Kai. I'll live with it.", tone: 'sly', fx: [bond('efua', 6), rep('hustle', 5), rep('integrity', -6), f('ch2_done'), { k: 'end', arc: 'understudy', outcome: 'star' }] },
    ],
  },
];

// ── DIRECTOR · "Final Cut" ──────────────────────────────────────────────────
const director: StoryNode[] = [
  {
    id: 'db1_cut', arc: 'finalcut', channel: 'encounter', from: 'selasi', where: 'studio', expires: 6, title: 'The cut that disagrees with the story',
    lapse: { fx: [f('cut_unseen')], schedule: { node: 'db2_zee', days: 3 } },
    lines: [
      { who: 'selasi', text: "I cut the Akwaaba anniversary film. I cut it three ways. In two of them the song begins in the studio. In the third it begins with a woman's hand on a microphone, in the wings." },
      { who: 'selasi', text: "Efua asked for the first. I keep watching the third." },
    ],
    choices: [
      { id: 'third', label: 'Cut the third. Tell the truth in frames.', tone: 'honest', fx: [bond('selasi', 6), rep('integrity', 4), f('cut_wings'), sched('db2_zee', 3)] },
      { id: 'first', label: "Give Efua the first cut. We'll keep the third in a drawer.", tone: 'sly', fx: [bond('efua', 4), rep('hustle', 3), f('cut_studio'), sched('db2_zee', 3)] },
    ],
  },
  {
    id: 'db2_zee', arc: 'finalcut', channel: 'call', from: 'selasi', hours: [10, 22], expires: 2, title: 'Lady Zee has seen the footage',
    lapse: { fx: [f('zee_unwarned')], schedule: { node: 'db3_screening', days: 3 } },
    lines: [
      { who: 'selasi', text: "She came to the edit suite alone. She watched the third cut four times and she did not say a word. Then she asked me whether I could make her look like she knew." },
    ],
    choices: [
      { id: 'honest', label: 'Tell her she can still choose what she does next.', tone: 'kind', fx: [rep('heart', 3), f('zee_told'), sched('db3_screening', 3)] },
      { id: 'edit', label: "Offer to recut her out of it.", tone: 'sly', fx: [rep('integrity', -4), rep('hustle', 3), f('zee_edited'), sched('db3_screening', 3)] },
    ],
  },
  {
    id: 'db3_screening', arc: 'finalcut', channel: 'encounter', from: 'selasi', where: 'shows', expires: 7, title: 'The screening',
    lapse: { fx: [f('ch2_done')] },
    lines: [
      { who: 'narr', text: 'A hundred seats, a white wall, the projector warming up. Selasi is in the back row with his hands clasped like a man at a funeral.' },
      { who: 'selasi', text: "Whichever cut plays on the night, plays on the screen behind her. It's your edit, your frames. I'll stand by whichever you press play on." },
    ],
    choices: [
      { id: 'wings', label: 'Play the third cut. All of it.', tone: 'honest', fx: [bond('selasi', 8), rep('integrity', 6), f('has_wings_footage'), f('ch2_done'), { k: 'end', arc: 'finalcut', outcome: 'true-cut' }] },
      { id: 'studio', label: "Play the studio cut. It's what they asked for.", tone: 'sly', fx: [bond('efua', 4), rep('hustle', 3), f('ch2_done'), { k: 'end', arc: 'finalcut', outcome: 'studio-cut' }] },
    ],
  },
];

// ── DJ · "The Last Record" ──────────────────────────────────────────────────
const dj: StoryNode[] = [
  {
    id: 'jb1_radiok', arc: 'lastrecord', channel: 'call', from: 'radiok', hours: [18, 23], expires: 2, title: 'Radio K: a slot at midnight',
    lapse: { fx: [f('radio_slot_missed')], schedule: { node: 'jb2_request', days: 2 } },
    lines: [
      { who: 'radiok', text: "My Thursday guest cancelled. I need two hours of music that sounds like it remembers something. Come. Bring the crate." },
    ],
    choices: [
      { id: 'yes', label: "I'll bring everything.", tone: 'kind', fx: [bond('radiok', 5), rep('hustle', 2), f('radiok_set'), sched('jb2_request', 2)] },
      { id: 'no', label: "I'm not ready for a mic yet.", tone: 'quiet', fx: [bond('radiok', -1), sched('jb2_request', 2)] },
    ],
  },
  {
    id: 'jb2_request', arc: 'lastrecord', channel: 'encounter', from: 'esi', where: 'kitchen', expires: 6, title: 'A request from the kitchen',
    lapse: { fx: [f('request_missed')], schedule: { node: 'jb3_spin', days: 2 } },
    lines: [
      { who: 'esi', text: "Radio K's boy. They tell me you play the old things. Is it true? Can you play me one I used to know?" },
      { who: 'narr', text: "She says the name of a song you have only ever heard on a reel marked 9. She has not said it aloud in twenty-six years." },
    ],
    choices: [
      { id: 'play', label: "I have it. I'll play it tonight, on the air.", tone: 'kind', fx: [bond('esi', 6), rep('heart', 4), f('promised_esi_record'), sched('jb3_spin', 1)] },
      { id: 'ask', label: "Why that one, Mama?", tone: 'honest', fx: [bond('esi', 3), f('asked_esi_why'), sched('jb3_spin', 1)] },
    ],
  },
  {
    id: 'jb3_spin', arc: 'lastrecord', channel: 'scene', from: 'radiok', expires: 2, title: 'The last record',
    lapse: { fx: [f('ch2_done')] },
    lines: [
      { who: 'narr', text: 'Midnight. A red light, a pair of headphones, a record in your hand that has not been played in public for twenty-six years. Radio K watches through the glass.' },
      { who: 'radiok', text: "Whatever's on that disc, once it's on air I can't call it back. You choose." },
    ],
    choices: [
      { id: 'play', label: 'Play it. All of it. Say her name after.', tone: 'honest', fx: [bond('esi', 8), bond('efua', -6), rep('integrity', 6), f('played_unknown_record'), f('ch2_done'), mem('At midnight you put a record on air that Mama Esi had not heard in twenty-six years.', 'good', 'music'), { k: 'end', arc: 'lastrecord', outcome: 'on-air' }] },
      { id: 'tease', label: "Play the first thirty seconds. Let the city wonder.", tone: 'sly', fx: [rep('hustle', 4), f('ch2_done'), { k: 'end', arc: 'lastrecord', outcome: 'teaser' }] },
      { id: 'hold', label: "Keep it in the crate. Not like this.", tone: 'quiet', fx: [rep('heart', 2), f('ch2_done'), { k: 'end', arc: 'lastrecord', outcome: 'held' }] },
    ],
  },
];

const t = (path: string, node: string, after: string): { node: string; if: Cond } => ({ node, if: all({ k: 'path', is: path as never }, { k: 'done', node: after }, { k: 'day', min: 30 }) });

export const act2SeatArcs: Arc[] = [
  { id: 'sleeve', title: 'The Sleeve', path: 'producer', nodes: producer, triggers: [t('producer', 'pb1_credit', 'p4_found_out')] },
  { id: 'three', title: 'Three Clients', path: 'manager', nodes: manager, triggers: [t('manager', 'mb1_third', 'm4_statement')] },
  { id: 'understudy', title: 'The Understudy', path: 'singer', nodes: singer, triggers: [t('singer', 'sb1_rehearsal', 's3_gala')] },
  { id: 'finalcut', title: 'Final Cut', path: 'director', nodes: director, triggers: [t('director', 'db1_cut', 'd3_footage')] },
  { id: 'lastrecord', title: 'The Last Record', path: 'dj', nodes: dj, triggers: [t('dj', 'jb1_radiok', 'j3_crate')] },
];
