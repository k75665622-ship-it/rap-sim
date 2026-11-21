// RAPPER — "Two Rooms". Act I, chapters 1–5 (see STORY_BIBLE.md §7A).
import type { Arc, Effect, StoryNode, Task } from '../types';

const pathR = { k: 'path', is: 'rapper' } as const;
const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral', who: string[] = [], kind: 'people' | 'music' | 'career' | 'beef' = 'people'): Effect => ({ k: 'memory', text, tone, who, kind, weight: 3 });

const ankhTask: Task = { id: 'ankh-take', kind: 'song', text: "Ankh is waiting in Studio 9. Record one song — something you've never said to anybody.", withinDays: 3, tiers: [{ min: 70, node: 'r2_high' }, { min: 50, node: 'r2_mid' }], done: 'r2_low', miss: 'r2_slow' };
const hookTask: Task = { id: 'hook-verse', kind: 'song', text: 'Sunrise deadline. Record your verse on the hook nobody can clear — before Radio K plays new music at six.', withinDays: 1, tiers: [{ min: 72, node: 'r3_hit' }], done: 'r3_flat', miss: 'r3_miss' };

const nodes: StoryNode[] = [
  // ── 1 · FRIDAY CYPHER ────────────────────────────────────────────────────
  {
    id: 'r0_text', arc: 'two-rooms', channel: 'text', from: 'static', expires: 3, title: 'Cypher tonight',
    lapse: { fx: [bond('static', -4), f('left_on_read')], schedule: { node: 'r1_cypher', days: 0 } },
    lines: [
      { who: 'static', text: "Oya {name}. Cypher at Mama's tonight. Don't make me come to your door." },
      { who: 'static', text: "She's making the stew. The good one. So — you coming, or are you pretending to have a life? 😂" },
    ],
    choices: [
      { id: 'yes', label: "I'll be there.", tone: 'kind', fx: [bond('static', 2), f('static_invited'), sched('r1_cypher', 0)] },
      { id: 'stew', label: 'Only for the stew.', tone: 'sly', fx: [bond('esi', 2), bond('static', 1), sched('r1_cypher', 0)] },
      { id: 'no', label: "Can't. Working on something.", tone: 'quiet', fx: [bond('static', -3), f('skipped_cypher'), sched('r1_cypher', 1)] },
    ],
  },
  {
    id: 'r1_cypher', arc: 'two-rooms', channel: 'encounter', from: 'static', where: 'kitchen', expires: 5, title: "Mama's Kitchen",
    lapse: { goto: 'r1_missed', fx: [bond('esi', -2)] },
    lines: [
      { who: 'narr', text: "Mama's Kitchen after dark. Plantain oil, charcoal smoke, a speaker duct-taped to the fridge. Thirty people, one circle, and Static in the middle of it like he owns the weather." },
      { who: 'static', text: 'Ei! The ghost has a face. I won\'t even say anything.', if: { k: 'flag', id: 'skipped_cypher' } },
      { who: 'static', text: "There he is. {name}! You're late, but you're here — come.", if: { k: 'flag', id: 'skipped_cypher', v: false } },
      { who: 'esi', text: 'Wash your hands before you touch my food. Both of you.' },
      { who: 'narr', text: "Behind the counter, Mama Esi is humming. Three notes and a little crack in the middle — the kind of thing you'd only catch if you were listening. You are." },
      { who: 'esi', text: 'Why are you looking at me like that? Eat.' },
      { who: 'narr', text: 'The circle opens a gap for you. Static grins. In the back corner an older man in a grey cap is eating alone, not looking at anything — which is how you know he is looking at everything.' },
    ],
    choices: [
      { id: 'circle', label: 'Step into the circle.', tone: 'sharp', fx: [{ k: 'rep', axis: 'hustle', v: 2 }, f('cypher_circle')], goto: 'r1_bars' },
      { id: 'plates', label: 'Help Mama carry the plates.', tone: 'kind', fx: [{ k: 'rep', axis: 'heart', v: 3 }, bond('esi', 6), f('helped_mama'), mem('You carried plates for Mama Esi while the cypher roared. She noticed.', 'good', ['esi'])], goto: 'r1_mama' },
      { id: 'back', label: 'Watch from the back.', tone: 'quiet', fx: [f('cypher_watched')], goto: 'r1_back' },
    ],
  },
  {
    id: 'r1_bars', arc: 'two-rooms', channel: 'scene', from: 'static', title: 'Eight bars', lines: [
      { who: 'narr', text: "The beat is somebody's phone through a bass bin and a lot of hope. Static has the mic. He bounces it to you with a grin that's half a dare, half a gift." },
      { who: 'narr', text: "The room goes quiet the way rooms do when they've decided to be kind for exactly eight bars." },
    ],
    choices: [
      { id: 'roast', label: 'Roast him. Hard, but with love.', tone: 'sly', fx: [{ k: 'rep', axis: 'hustle', v: 3 }, bond('static', -2), f('roasted_static')], goto: 'r1_after' },
      { id: 'truth', label: 'Rap about the block — the flat, the wall between your rooms.', tone: 'honest', fx: [{ k: 'rep', axis: 'integrity', v: 3 }, bond('static', 4), f('spoke_truth'), { k: 'fame', v: 1 }], goto: 'r1_after' },
      { id: 'mama', label: 'Rap about this kitchen. About Mama.', tone: 'kind', fx: [{ k: 'rep', axis: 'heart', v: 2 }, bond('esi', 4), bond('static', 2), f('rapped_for_mama')], goto: 'r1_after' },
    ],
  },
  {
    id: 'r1_after', arc: 'two-rooms', channel: 'scene', from: 'static', title: 'After the circle', lines: [
      { who: 'narr', text: 'The room explodes. Static clutches his chest, laughing — and behind the laugh, for one second, it is not a joke.', if: { k: 'flag', id: 'roasted_static' } },
      { who: 'narr', text: "Nobody laughs. Somebody says 'eh' very quietly. It is the best review of your life.", if: { k: 'flag', id: 'spoke_truth' } },
      { who: 'narr', text: "Mama stops stirring. She doesn't turn around. The spoon does, slowly, on its own.", if: { k: 'flag', id: 'rapped_for_mama' } },
      { who: 'static', text: "Chale. Where did THAT come from?" },
    ],
    choices: [{ id: 'on', label: 'Catch your breath.', goto: 'r1_card' }],
  },
  {
    id: 'r1_mama', arc: 'two-rooms', channel: 'scene', from: 'esi', title: "Mama's spoon", lines: [
      { who: 'esi', text: "You didn't have to." },
      { who: 'narr', text: "She puts a spoon of stew in your hand without being asked and watches your face the way a doctor watches a pulse." },
      { who: 'esi', text: "My son tells the whole street you're the real pen between you two. Is that true?" },
    ],
    choices: [
      { id: 'humble', label: "He's the star. I just keep up.", tone: 'kind', fx: [{ k: 'rep', axis: 'heart', v: 1 }, bond('esi', 2)], goto: 'r1_card' },
      { id: 'proud', label: "I'm the one with the words.", tone: 'sharp', fx: [{ k: 'rep', axis: 'hustle', v: 2 }, bond('esi', -1)], goto: 'r1_card' },
      { id: 'hum', label: 'Mama — who taught you to hum like that?', tone: 'honest', fx: [f('asked_hum'), bond('esi', 1)], goto: 'r1_hum' },
    ],
  },
  {
    id: 'r1_hum', arc: 'two-rooms', channel: 'scene', from: 'esi', title: 'A small silence', lines: [
      { who: 'esi', text: 'Hum like what?' },
      { who: 'narr', text: "She says it lightly. The spoon doesn't move. For a second the kitchen is full of noise and she's standing in a room with no sound in it at all." },
      { who: 'esi', text: "Eat, {name}. It's getting cold." },
    ],
    choices: [{ id: 'eat', label: 'Eat. Say nothing.', tone: 'quiet', fx: [f('noticed_hum')], goto: 'r1_card' }],
  },
  {
    id: 'r1_back', arc: 'two-rooms', channel: 'scene', from: 'ankh', title: 'The back table', lines: [
      { who: 'narr', text: "From the back you can see the whole room: how Static performs for the crowd and then, half a second later, checks Mama's face. How she pretends not to check back." },
      { who: 'narr', text: 'And the man in the grey cap, three tables over, who has stopped eating.' },
      { who: 'ankh', text: "You're not in the circle." },
    ],
    choices: [
      { id: 'notnow', label: 'Not tonight.', tone: 'quiet', fx: [bond('ankh', 1)], goto: 'r1_card' },
      { id: 'watch', label: "Why is everyone watching him and nobody's watching her?", tone: 'honest', fx: [bond('ankh', 4), f('noticed_esi_watching')], goto: 'r1_card' },
      { id: 'known', label: "You're Kofi Danso. Studio 9.", tone: 'sly', fx: [bond('ankh', 1), f('knew_ankh')], goto: 'r1_card' },
    ],
  },
  {
    id: 'r1_card', arc: 'two-rooms', channel: 'scene', from: 'ankh', title: 'A card under a plate', lines: [
      { who: 'narr', text: 'By the time you come up for air, the man in the grey cap has gone. His plate is clean — Mama says it is the first time in ten years.' },
      { who: 'narr', text: "Under the plate, a business card: STUDIO 9. KOFI DANSO. On the back, in pencil: \"Thursday. Ten at night. Bring something you haven't said.\"" },
    ],
    choices: [
      { id: 'pocket', label: 'Pocket it.', tone: 'kind', fx: [f('got_card'), mem("A man left you a card at Mama's Kitchen: Studio 9. Thursday. Ten at night.", 'neutral', ['ankh'], 'career'), sched('r2_studio', 1)] },
      { id: 'bin', label: "Bin it. You don't need anyone's charity.", tone: 'sharp', fx: [f('binned_card'), bond('ankh', -2), sched('r2_studio', 2)] },
    ],
  },
  {
    id: 'r1_missed', arc: 'two-rooms', channel: 'text', from: 'static', expires: 3, title: "You weren't there", lapse: { fx: [bond('static', -3)], schedule: { node: 'r2_studio', days: 3 } },
    lines: [
      { who: 'static', text: "Mama asked where you were. I said busy. She said \"hm.\" You know the \"hm.\"" },
      { who: 'static', text: 'A man called Danso asked about you too. Said he heard you on a tape of mine. Don\'t ask. Studio 9, Thursday.' },
    ],
    choices: [
      { id: 'sorry', label: "Tell her I'll make it up.", tone: 'kind', fx: [bond('esi', 1), bond('static', 1), f('static_brought'), sched('r2_studio', 1)] },
      { id: 'nothing', label: 'Tell her nothing.', tone: 'quiet', fx: [bond('esi', -3), bond('static', -2), sched('r2_studio', 3)] },
    ],
  },

  // ── 2 · SAY SOMETHING YOU'VE NEVER SAID ─────────────────────────────────
  {
    id: 'r2_studio', arc: 'two-rooms', channel: 'encounter', from: 'ankh', where: 'studio', hours: [20, 5], expires: 5, title: 'Studio 9, after dark',
    lapse: { fx: [bond('ankh', -3)], goto: 'r2_late' },
    lines: [
      { who: 'narr', text: "Studio 9 looks like a place that used to be loud. Gold records fade on one wall; on the other, wires and a calendar from 2011. The console is the size of a small car, and its owner is asleep in a chair with the headphones round his neck." },
      { who: 'ankh', text: "You threw my card away. Fiifi found it in the bin and brought it back — smart boy. What do you want?", if: { k: 'flag', id: 'binned_card' } },
      { who: 'ankh', text: "You came. I wasn't sure I'd remember inviting you.", if: { k: 'flag', id: 'binned_card', v: false } },
      { who: 'ankh', text: "I don't want a hit. I've made a hit. Do you know what a hit does? It makes people stop listening." },
      { who: 'ankh', text: "Booth's through there. Say something you've never said — to anybody. Not for radio. Not for sixteen bars. If I hear you performing, I turn it off." },
    ],
    choices: [
      { id: 'ready', label: "Ready.", tone: 'honest', fx: [bond('ankh', 2), { k: 'task', task: ankhTask }] },
      { id: 'what', label: "What's in it for me?", tone: 'sly', fx: [bond('ankh', -2), { k: 'task', task: ankhTask }] },
      { id: 'happened', label: 'What happened to Studio 9?', tone: 'quiet', fx: [bond('ankh', 1), f('asked_studio_past'), { k: 'task', task: ankhTask }] },
    ],
  },
  {
    id: 'r2_late', arc: 'two-rooms', channel: 'text', from: 'ankh', expires: 4, title: 'Door is open until Sunday',
    lapse: { fx: [f('long_way'), bond('ankh', -2)], schedule: { node: 'r3_call', days: 4 } },
    lines: [{ who: 'ankh', text: 'The door is open until Sunday. After Sunday I will pretend I never knew you.' }],
    choices: [{ id: 'coming', label: "I'm coming.", fx: [sched('r2_studio', 0), f('late_to_ankh')] }],
  },
  {
    id: 'r2_high', arc: 'two-rooms', channel: 'encounter', from: 'ankh', where: 'studio', expires: 4, title: 'Ankh listens',
    lapse: { fx: [f('ankh_waited')], schedule: { node: 'r3_call', days: 1 } },
    lines: [
      { who: 'narr', text: "He listens with his eyes closed and one hand flat on the console, like he's checking for a fever. When it's over he is quiet for long enough that you start composing apologies." },
      { who: 'ankh', text: 'Again.' },
      { who: 'narr', text: 'You press play. He listens again.' },
      { who: 'ankh', text: "That isn't a verse. That's a confession in rhyme. Don't let anyone mix the shake out of your voice — not me, not a label, not a mirror." },
      { who: 'ankh', text: "There's a spare key under the Gold Coast Sound plaque outside. Use it after midnight if you need it. Don't touch the tape room." },
    ],
    choices: [
      { id: 'taperoom', label: "What's in the tape room?", tone: 'honest', fx: [bond('ankh', 4), f('ankh_respects'), f('asked_tape_room'), mem('Ankh heard your take and handed you a key to Studio 9 — with one rule: stay out of the tape room.', 'good', ['ankh'], 'career')], goto: 'r2_taperoom' },
      { id: 'thanks', label: 'Thank you.', tone: 'kind', fx: [bond('ankh', 6), f('ankh_respects'), mem('Ankh heard your take and handed you a key to Studio 9.', 'good', ['ankh'], 'career'), sched('r3_call', 2)] },
      { id: 'why', label: 'Why me?', tone: 'quiet', fx: [bond('ankh', 5), f('ankh_respects'), sched('r3_call', 2)] },
    ],
  },
  {
    id: 'r2_taperoom', arc: 'two-rooms', channel: 'scene', from: 'ankh', title: 'Dust', lines: [
      { who: 'ankh', text: 'Nothing. Dust. A bad night in 1999.' },
      { who: 'narr', text: "He says it the way people say \"I'm fine\" to a doctor. Behind him, a steel door with a number painted on it: 9." },
    ],
    choices: [{ id: 'leave', label: 'Let it go. For now.', tone: 'quiet', fx: [f('saw_reel_door'), sched('r3_call', 2)] }],
  },
  {
    id: 'r2_mid', arc: 'two-rooms', channel: 'encounter', from: 'ankh', where: 'studio', expires: 4, title: 'Ankh listens',
    lapse: { fx: [f('ankh_waited')], schedule: { node: 'r3_call', days: 1 } },
    lines: [
      { who: 'ankh', text: "Competent. Clean. I could play it at a wedding." },
      { who: 'ankh', text: "Come back when you've lived something. Go to Mama's. Sit for an hour. Say nothing. Eat what she gives you. Then tell me what you heard." },
    ],
    choices: [
      { id: 'fine', label: 'Fine.', tone: 'quiet', fx: [bond('ankh', 2), f('ankh_homework'), sched('r3_call', 3)] },
      { id: 'thats', label: "That's it? That's your advice?", tone: 'sharp', fx: [bond('ankh', -2), f('ankh_homework'), sched('r3_call', 3)] },
      { id: 'lived', label: "I've lived plenty.", tone: 'sharp', fx: [bond('ankh', -1), f('ankh_homework'), sched('r3_call', 3)] },
    ],
  },
  {
    id: 'r2_low', arc: 'two-rooms', channel: 'encounter', from: 'ankh', where: 'studio', expires: 4, title: 'The long way',
    lapse: { schedule: { node: 'r3_call', days: 1 } },
    lines: [
      { who: 'narr', text: 'He listens to it once, all the way through, with no expression. Then he gets up and hands you a broom.' },
      { who: 'ankh', text: "Sweep. Not because I'm testing you. Because a man should know the floor of the room he wants to sing in." },
      { who: 'narr', text: "At the door a kid in a cap is pretending he isn't listening. Fiifi. \"He thinks you're cooler than you are,\" says Ankh. \"Don't correct him.\"" },
    ],
    choices: [
      { id: 'sweep', label: 'Take the broom.', tone: 'honest', fx: [f('long_way'), bond('ankh', 4), bond('fiifi', 3), { k: 'rep', axis: 'heart', v: 2 }, sched('r3_call', 4)] },
      { id: 'refuse', label: "I didn't come here to clean.", tone: 'sharp', fx: [f('long_way'), bond('ankh', -3), sched('r3_call', 4)] },
    ],
  },
  {
    id: 'r2_slow', arc: 'two-rooms', channel: 'text', from: 'ankh', expires: 3, title: 'Nothing recorded', lapse: { schedule: { node: 'r3_call', days: 3 } },
    lines: [{ who: 'ankh', text: "You didn't record. That's allowed. It's also information." }],
    choices: [{ id: 'ok', label: "I'll come back.", fx: [f('long_way'), bond('ankh', -1), sched('r3_call', 3)] }],
  },

  // ── 3 · THE HOOK WE CAN'T CLEAR ─────────────────────────────────────────
  {
    id: 'r3_call', arc: 'two-rooms', channel: 'call', from: 'static', hours: [22, 3], expires: 1, title: 'Static, 11:48 p.m.',
    lapse: { fx: [bond('static', -8), f('ignored_static_call')], schedule: { node: 'r3_aftermath', days: 1 } },
    lines: [
      { who: 'static', text: "{name}. Are you up? Don't say you're asleep, I can hear your TV." },
      { who: 'static', text: "Listen. I found something. An old cassette in Mama's cupboard — no label. There's a hook on it. Eight seconds of a woman singing and I can't stop playing it." },
      { who: 'static', text: "I can't clear it, I can't trace it, and GCS would take it off me the second they heard it. Studio 9. Midnight. We have till sunrise — Radio K plays new music at six." },
    ],
    choices: [
      { id: 'coming', label: "I'm coming.", tone: 'kind', fx: [bond('static', 4), sched('r3_session', 0)] },
      { id: 'why', label: 'Why me? Why not your label guys?', tone: 'honest', fx: [bond('static', 3), { k: 'rep', axis: 'integrity', v: 1 }, sched('r3_session', 0)] },
      { id: 'no', label: 'Not tonight.', tone: 'quiet', fx: [bond('static', -6), f('declined_static'), sched('r3_aftermath', 1)] },
    ],
  },
  {
    id: 'r3_session', arc: 'two-rooms', channel: 'encounter', from: 'static', where: 'studio', hours: [23, 5], expires: 1, title: 'Midnight, Studio 9',
    lapse: { fx: [bond('static', -6), f('ignored_static_call')], schedule: { node: 'r3_aftermath', days: 1 } },
    lines: [
      { who: 'narr', text: "Midnight. Static's laptop, two cups of Milo, and a cassette player older than both of you." },
      { who: 'static', text: 'Listen.' },
      { who: 'narr', text: "Eight seconds. A woman's voice, no words you can catch — a rising line that breaks open halfway into something like a prayer. It isn't polished. That's why it sounds true." },
      { who: 'narr', text: "A door opens behind you. Ankh, a coat over his pyjamas. The tape plays on. His face does something you've never seen a face do." },
      { who: 'ankh', text: 'Turn it off.' },
      { who: 'static', text: "Uncle K, it's just a —" },
      { who: 'ankh', text: 'Turn. It. Off.' },
      { who: 'narr', text: 'Static does. The silence has a shape.' },
      { who: 'ankh', text: 'Where did you get that?' },
      { who: 'static', text: 'Mama\'s cupboard. Behind the rice tin.' },
      { who: 'ankh', text: "Put it back. Put it back and forget —" },
      { who: 'narr', text: 'He stops himself.' },
      { who: 'ankh', text: "…Do what you want. You're grown. But it isn't yours." },
    ],
    choices: [
      { id: 'press', label: 'You know whose voice that is.', tone: 'honest', fx: [{ k: 'rep', axis: 'integrity', v: 2 }, bond('ankh', -3), f('pressed_ankh')], goto: 'r3_task' },
      { id: 'backs', label: "It's his hook, Ankh. He found it.", tone: 'kind', fx: [bond('static', 4), bond('ankh', -1), f('backed_static')], goto: 'r3_task' },
      { id: 'work', label: 'We have till sunrise. Verse first, ghosts later.', tone: 'sly', fx: [{ k: 'rep', axis: 'hustle', v: 3 }, f('chose_work')], goto: 'r3_task' },
    ],
  },
  {
    id: 'r3_task', arc: 'two-rooms', channel: 'scene', from: 'static', title: 'Till sunrise', lines: [
      { who: 'narr', text: "Ankh leaves. He doesn't slam the door, which is worse." },
      { who: 'static', text: "I'll build the beat around it. You write. We're not finishing until it's true." },
      { who: 'narr', text: 'Static slides the mic across to you.' },
    ],
    choices: [{ id: 'cut', label: 'Step into the booth.', tone: 'honest', fx: [{ k: 'task', task: hookTask }] }],
  },
  {
    id: 'r3_hit', arc: 'two-rooms', channel: 'encounter', from: 'radiok', where: 'studio', expires: 2, title: 'Six in the morning',
    lapse: { schedule: { node: 'r4_invite', days: 1 } },
    lines: [
      { who: 'narr', text: 'Six a.m. The radio on the studio wall crackles.' },
      { who: 'radiok', text: "…and this one's from two kids who clearly haven't slept. Somebody left a cassette in a cupboard. I'm told that's where the good stuff lives." },
      { who: 'radiok', text: "That little cry in the hook — I've heard that voice before. Can't think where. It'll come to me. Midnight Cypher, you know where I am." },
      { who: 'static', text: "Did you hear that? He said it like he KNEW." },
    ],
    choices: [
      { id: 'knows', label: 'He recognised the voice. Ask him.', tone: 'honest', fx: [f('radiok_knows'), bond('static', 2), mem('Radio K played your hook at dawn and said he recognised the voice on the cassette.', 'neutral', ['radiok'], 'music'), sched('r4_invite', 1)] },
      { id: 'air', label: "We're on the radio, Static. We're ON THE RADIO.", tone: 'kind', fx: [bond('static', 5), { k: 'fame', v: 2 }, { k: 'fans', v: 25 }, sched('r4_invite', 1)] },
    ],
  },
  {
    id: 'r3_flat', arc: 'two-rooms', channel: 'encounter', from: 'static', where: 'studio', expires: 2, title: 'Sunrise, nothing', lapse: { schedule: { node: 'r4_invite', days: 2 } },
    lines: [
      { who: 'narr', text: "It's fine. The hook is a ghost in the middle of something ordinary. The sun comes up on a track nobody will remember, and Static pretends he doesn't mind." },
      { who: 'static', text: "It's a good start. It's… a start." },
    ],
    choices: [
      { id: 'again', label: "We'll get it. Next time.", tone: 'kind', fx: [bond('static', 1), f('flat_session'), sched('r4_invite', 3)] },
      { id: 'blame', label: "The hook's too hard to sit on. That's not on me.", tone: 'sharp', fx: [bond('static', -2), f('flat_session'), sched('r4_invite', 3)] },
    ],
  },
  {
    id: 'r3_miss', arc: 'two-rooms', channel: 'text', from: 'static', expires: 2, title: 'Done without you', lapse: { schedule: { node: 'r4_invite', days: 1 } },
    lines: [{ who: 'static', text: 'I finished it myself. Radio K played it. You should have heard it.' }],
    choices: [{ id: 'ok', label: "Congratulations. I'm sorry.", tone: 'kind', fx: [bond('static', -3), f('static_solo'), sched('r4_invite', 2)] }],
  },
  {
    id: 'r3_aftermath', arc: 'two-rooms', channel: 'text', from: 'static', expires: 3, title: 'He did it without you', lapse: { fx: [bond('static', -2)], schedule: { node: 'r4_invite', days: 1 } },
    lines: [
      { who: 'static', text: 'Radio K played it. Without you. Hope you slept well. 🙂' },
      { who: 'static', text: 'Funny thing — I rang you three times.', if: { k: 'flag', id: 'ignored_static_call' } },
    ],
    choices: [
      { id: 'sorry', label: "I'm sorry. I should've come.", tone: 'kind', fx: [bond('static', 3), f('static_solo'), sched('r4_invite', 2)] },
      { id: 'cong', label: 'Congrats. Genuinely.', tone: 'sharp', fx: [bond('static', -2), f('static_solo'), sched('r4_invite', 2)] },
      { id: 'send', label: 'Send it to me.', tone: 'quiet', fx: [f('static_solo'), sched('r4_invite', 2)] },
    ],
  },

  // ── 4 · THE MIDNIGHT CYPHER ─────────────────────────────────────────────
  {
    id: 'r4_invite', arc: 'two-rooms', channel: 'text', from: 'radiok', expires: 3, title: 'The Midnight Cypher', lapse: { fx: [bond('radiok', -3)], schedule: { node: 'r5_envelope', days: 3 } },
    lines: [
      { who: 'radiok', text: "Kwabena here. The Midnight Cypher. I like the noise you two make." },
      { who: 'radiok', text: 'Static is coming Thursday. I would like you there as well. Two rooms, one wall — I have heard the story.', if: { k: 'flag', id: 'static_solo' } },
      { who: 'radiok', text: "Thursday. Midnight. The Stage booth. Don't be late — I notice." },
    ],
    choices: [
      { id: 'there', label: "I'll be there.", tone: 'kind', fx: [bond('radiok', 2), sched('r4_cypher', 0)] },
      { id: 'cassette', label: 'Is this about the cassette?', tone: 'honest', fx: [bond('radiok', 1), f('asked_radiok_cassette'), sched('r4_cypher', 0)] },
      { id: 'worth', label: 'Make it worth my time.', tone: 'sly', fx: [{ k: 'rep', axis: 'hustle', v: 2 }, bond('radiok', -1), sched('r4_cypher', 0)] },
    ],
  },
  {
    id: 'r4_cypher', arc: 'two-rooms', channel: 'encounter', from: 'radiok', where: 'shows', hours: [22, 4], expires: 4, title: 'On air', lapse: { fx: [bond('radiok', -4), bond('static', -2)], schedule: { node: 'r5_envelope', days: 3 } },
    lines: [
      { who: 'narr', text: "The Stage, after the crowd's gone home. A glass booth, two chairs, one mic too many. Radio K has a voice like warm gravel and the patience of a man who has ended careers by accident." },
      { who: 'radiok', text: "Live in three. Two rooms. One mic." },
      { who: 'static', text: "Ready, chale?" },
      { who: 'narr', text: "It's your turn. Static goes first — he is a little too good tonight, the way people are when they're scared. He leaves the last bar open for you." },
    ],
    choices: [
      { id: 'cut', label: 'Take Static apart. On air.', tone: 'sharp', fx: [{ k: 'rep', axis: 'hustle', v: 4 }, bond('static', -9), { k: 'fame', v: 3 }, { k: 'fans', v: 60 }, f('cut_static'), mem('You cut Static down on live radio. The city loved it. He did not laugh.', 'bad', ['static'], 'beef')], goto: 'r4_after' },
      { id: 'lift', label: 'Lift him up. Make him the story.', tone: 'kind', fx: [{ k: 'rep', axis: 'heart', v: 3 }, bond('static', 6), { k: 'fame', v: 1 }, f('lifted_static'), mem("On live radio you chose to lift Static instead of beating him. He won't forget it.", 'good', ['static'])], goto: 'r4_after' },
      { id: 'quiet', label: 'Say less. Let the beat breathe.', tone: 'quiet', fx: [{ k: 'rep', axis: 'integrity', v: 2 }, bond('radiok', 4), { k: 'fame', v: 2 }, f('stayed_quiet')], goto: 'r4_after' },
    ],
  },
  {
    id: 'r4_after', arc: 'two-rooms', channel: 'scene', from: 'radiok', title: 'Off air', lines: [
      { who: 'radiok', text: "That's what the city will quote on Monday. Not the loud bit. The bit where somebody decided who they are.", if: { k: 'flag', id: 'cut_static' } },
      { who: 'narr', text: "Static doesn't speak in the lift. At the bottom he says, to the doors, \"It's just radio.\" Neither of you believes it.", if: { k: 'flag', id: 'cut_static' } },
      { who: 'radiok', text: "Rare, to hear one rapper hold a door for another. I noticed.", if: { k: 'flag', id: 'lifted_static' } },
      { who: 'static', text: "You didn't have to do that. …Thanks.", if: { k: 'flag', id: 'lifted_static' } },
      { who: 'radiok', text: "Silence is a risk. You took it. I like that you left me wondering.", if: { k: 'flag', id: 'stayed_quiet' } },
      { who: 'radiok', text: "One more thing. That cassette. When you find who sings on it — come tell me before you tell anyone else. Not for the show. For me." },
    ],
    choices: [
      { id: 'promise', label: "I'll tell you first.", tone: 'honest', fx: [bond('radiok', 4), f('promised_radiok'), sched('r5_envelope', 1)] },
      { id: 'maybe', label: 'Depends who it is.', tone: 'quiet', fx: [{ k: 'rep', axis: 'integrity', v: 1 }, sched('r5_envelope', 1)] },
    ],
  },

  // ── 5 · BIG MOSES'S ENVELOPE ────────────────────────────────────────────
  {
    id: 'r5_envelope', arc: 'two-rooms', channel: 'text', from: 'moses', expires: 4, title: 'A private party', lapse: { fx: [bond('moses', -1), f('moses_waiting')], schedule: { node: 'r5_end', days: 2 } },
    lines: [
      { who: 'moses', text: "Big Moses. We haven't met. Everyone is talking about you, so we are practically family." },
      { who: 'moses', text: 'Saturday. A private party in East Legon. Thirty minutes. Cash in an envelope, and the envelope is thick.' },
      { who: 'moses', text: "Don't worry about the guests. Worry about being on time." },
    ],
    choices: [
      { id: 'yes', label: 'Thirty minutes? I can do thirty minutes.', tone: 'sly', fx: [{ k: 'money', v: 800 }, { k: 'rep', axis: 'hustle', v: 3 }, bond('moses', 5), f('took_moses_envelope'), mem("Big Moses paid you $800 cash for thirty minutes at a private party. He said you'd be family.", 'neutral', ['moses'], 'career'), sched('r5_end', 2)] },
      { id: 'ask', label: "Who's the party for?", tone: 'honest', fx: [{ k: 'rep', axis: 'integrity', v: 2 }, bond('moses', -1), f('asked_moses'), sched('r5_end', 2)] },
      { id: 'no', label: "I'll pass. I don't do private parties.", tone: 'quiet', fx: [{ k: 'rep', axis: 'integrity', v: 3 }, bond('moses', -3), f('refused_moses'), sched('r5_end', 2)] },
    ],
  },
  {
    id: 'r5_end', arc: 'two-rooms', channel: 'letter', from: 'esi', expires: 7, title: 'A note on a plate',
    lapse: { fx: [f('ch1_done')] },
    lines: [
      { who: 'narr', text: "An envelope under your door. Not cash. Inside, a folded paper napkin and Mama's careful handwriting:" },
      { who: 'esi', text: 'Come and eat. Bring Nii. Both of you. I have something to say and I am too old to keep saying it to the wall.' },
      { who: 'narr', text: 'On the back of the napkin, in different ink — shaky, quick — as if added after she thought better of it: "It is not about the music."', if: { k: 'flag', id: 'noticed_hum' } },
    ],
    choices: [
      { id: 'go', label: "We'll be there, Mama.", tone: 'kind', fx: [bond('esi', 3), f('ch1_done'), mem('Chapter 1 closed with a note from Mama Esi: "Come and eat. I have something to say."', 'neutral', ['esi'], 'people'), { k: 'end', arc: 'two-rooms-ch1', outcome: 'complete' }] },
      { id: 'later', label: "I'll come when I can.", tone: 'quiet', fx: [bond('esi', -1), f('ch1_done'), { k: 'end', arc: 'two-rooms-ch1', outcome: 'complete' }] },
    ],
  },
];

export const rapperArc: Arc = {
  id: 'two-rooms', title: 'Two Rooms', path: 'rapper', nodes,
  triggers: [{ node: 'r0_text', if: { k: 'all', of: [pathR, { k: 'day', min: 0 }] } }],
};
