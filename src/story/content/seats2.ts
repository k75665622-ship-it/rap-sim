// DIRECTOR "Frame" and DJ "The Room" — opening chapters.
import type { Arc, Effect, StoryNode, Task } from '../types';
const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const rep = (axis: 'integrity' | 'hustle' | 'heart', v: number): Effect => ({ k: 'rep', axis, v });

const shootTask: Task = { id: 'selasi-shoot', kind: 'shoot', text: "Shoot a clip in the city for Selasi's film — anything with light in it. He'll tell you what's in the frame that you didn't see.", withinDays: 5, done: 'd3_footage', miss: 'd3_footage' };
const director: StoryNode[] = [
  {
    id: 'd1_second', arc: 'frame', channel: 'text', from: 'selasi', expires: 4, title: 'A second camera', lapse: { schedule: { node: 'd2_set', days: 2 } },
    lines: [
      { who: 'selasi', text: 'I need a second camera on Saturday. Budget: nothing. Credit: "additional photography". It\'s a trap and you\'re going to take it.' },
      { who: 'selasi', text: "I'll feed you. Mama's Kitchen, I'm paying in jollof." },
    ],
    choices: [
      { id: 'yes', label: "A trap I can afford. I'm in.", tone: 'kind', fx: [bond('selasi', 3), sched('d2_set', 0)] },
      { id: 'credit', label: "I want better than 'additional photography'.", tone: 'sly', fx: [bond('selasi', 1), rep('hustle', 2), sched('d2_set', 0)] },
    ],
  },
  {
    id: 'd2_set', arc: 'frame', channel: 'encounter', from: 'selasi', where: 'kitchen', expires: 5, title: 'The shoot, the kitchen', lapse: { fx: [bond('selasi', -2)], schedule: { node: 'd3_footage', days: 2 } },
    lines: [
      { who: 'narr', text: "Mama's Kitchen at golden hour. Selasi has taped a sheet over the window as a diffuser and is directing a very patient cook in a hairnet." },
      { who: 'selasi', text: "Everything is a frame. The steam is a frame. Her hands are a frame. Look." },
      { who: 'narr', text: "Mama Esi stirs, hums, notices the camera, stops. For a second she looks straight down the lens like someone who has done it before." },
    ],
    choices: [
      { id: 'hold', label: 'Hold the shot on her. Do not cut.', tone: 'honest', fx: [rep('integrity', 2), bond('esi', -1), bond('selasi', 3), f('filmed_esi'), { k: 'task', task: shootTask }] },
      { id: 'cut', label: 'Cut away. She is uncomfortable.', tone: 'kind', fx: [rep('heart', 3), bond('esi', 3), f('spared_esi'), { k: 'task', task: shootTask }] },
    ],
  },
  {
    id: 'd3_footage', arc: 'frame', channel: 'encounter', from: 'selasi', where: 'studio', expires: 8, title: 'The old tape', lapse: {},
    lines: [
      { who: 'selasi', text: "I found something while digitising for a documentary I'll never finish. Come look." },
      { who: 'narr', text: "A beat-up VHS: the 1999 launch of 'Akwaaba Tonight'. A young woman in a gold dress — 'Naa Kai' — is on stage, mouthing the words with a half-second delay." },
      { who: 'selasi', text: "Watch her lips. They're late. Every line." },
      { who: 'narr', text: "In the last seconds before the tape cuts, an off-stage camera drifts to the wings. A woman in a plain dress, pressed against a curtain, singing the words along — the real timing, the real breath. Her face is turned away." },
    ],
    choices: [
      { id: 'who', label: 'Who is the woman in the wings?', tone: 'honest', fx: [f('saw_wings_footage'), bond('selasi', 3), { k: 'memory', text: 'Selasi found old 1999 footage: "Naa Kai" lip-syncing, while a woman in the wings sings the real take.', kind: 'career', tone: 'neutral', weight: 4 }] },
      { id: 'copy', label: 'Make me a copy. Tell nobody.', tone: 'sly', fx: [f('has_wings_footage'), rep('hustle', 2), bond('selasi', 1)] },
      { id: 'leave', label: "That's somebody's story. Not ours.", tone: 'quiet', fx: [rep('integrity', 1), f('walked_away_mystery')] },
    ],
  },
];
export const directorArc: Arc = { id: 'frame', title: 'Frame', path: 'director', nodes: director, triggers: [{ node: 'd1_second', if: { k: 'all', of: [{ k: 'path', is: 'director' }, { k: 'day', min: 0 }] } }] };

const dj: StoryNode[] = [
  {
    id: 'j1_call', arc: 'the-room', channel: 'call', from: 'radiok', hours: [19, 24], expires: 2, title: 'Radio K', lapse: { fx: [bond('radiok', -2)], schedule: { node: 'j2_set', days: 3 } },
    lines: [
      { who: 'radiok', text: 'My Thursday DJ quit. For a girl, I think, or a goat. Do you own a controller?' },
      { who: 'radiok', text: "Don't answer. I've heard your mixes. They have the one thing I can't teach: you never panic." },
    ],
    choices: [
      { id: 'yes', label: "I'm in. What time?", tone: 'kind', fx: [bond('radiok', 3), sched('j2_set', 0)] },
      { id: 'pay', label: 'What does it pay?', tone: 'sly', fx: [bond('radiok', -1), rep('hustle', 2), sched('j2_set', 0)] },
    ],
  },
  {
    id: 'j2_set', arc: 'the-room', channel: 'encounter', from: 'radiok', where: 'shows', hours: [20, 4], expires: 4, title: 'The Thursday set', lapse: { fx: [bond('radiok', -3)], schedule: { node: 'j3_crate', days: 4 } },
    lines: [
      { who: 'narr', text: 'The Stage on a Thursday: wet floor, loud room, and a booth with a view of a hundred strangers trusting you not to ruin their night.' },
      { who: 'radiok', text: 'Eight songs. Make them forget the clock. If you have to save one record, save the one that makes them sing.' },
    ],
    choices: [
      { id: 'crowd', label: 'Play it safe. Give them what they know.', tone: 'kind', fx: [{ k: 'fame', v: 1 }, bond('radiok', 2), sched('j3_crate', 3)] },
      { id: 'risk', label: 'Take a risk. Play something nobody knows.', tone: 'sly', fx: [rep('hustle', 3), { k: 'fame', v: 2 }, bond('radiok', 1), f('played_unknown_record'), sched('j3_crate', 3)] },
      { id: 'zee', label: "Close with Lady Zee's remix. The whole room will sing.", tone: 'sly', fx: [{ k: 'fame', v: 2 }, f('played_zee_remix'), sched('j3_crate', 3)] },
    ],
  },
  {
    id: 'j3_crate', arc: 'the-room', channel: 'encounter', from: 'radiok', where: 'shows', expires: 8, title: 'The archive crate', lapse: {},
    lines: [
      { who: 'radiok', text: "Come to the back. Mind the dust. These are the station's old reels — nobody's listened to them since I was young and handsome." },
      { who: 'narr', text: "On a reel labelled LIVE — LAUNCH 1999 — you hear a crowd roar and an announcer: \"…and ladies and gentlemen, our hook — Esi, on the hook!\"" },
      { who: 'radiok', text: "Hm. Just \"Esi\". No surname. I always thought that was odd." },
    ],
    choices: [
      { id: 'who', label: 'Esi who?', tone: 'honest', fx: [f('heard_esi_reel'), bond('radiok', 3), { k: 'memory', text: 'In Radio K\'s archive you heard 1999 launch tape: an announcer calls out "Esi, on the hook!"', kind: 'career', tone: 'neutral', weight: 4 }] },
      { id: 'copy', label: "Can I borrow the reel?", tone: 'sly', fx: [f('has_esi_reel'), rep('hustle', 2), bond('radiok', 1)] },
      { id: 'leave', label: 'Probably nothing. Put it back.', tone: 'quiet', fx: [f('walked_away_mystery')] },
    ],
  },
];
export const djArc: Arc = { id: 'the-room', title: 'The Room', path: 'dj', nodes: dj, triggers: [{ node: 'j1_call', if: { k: 'all', of: [{ k: 'path', is: 'dj' }, { k: 'day', min: 0 }] } }] };
