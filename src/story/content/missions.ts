// WORLD MISSIONS — a phone call, a drive, and someone waiting where they said
// they would be. Be late and they notice. Nothing here is a "mission failed":
// miss it and the chance simply passes, and the world carries on.
import type { Arc, Effect, StoryNode } from '../types';

const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const rep = (axis: 'integrity' | 'hustle' | 'heart', v: number): Effect => ({ k: 'rep', axis, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral', kind: 'career' | 'money' | 'people' = 'career'): Effect => ({ k: 'memory', text, tone, kind, weight: 3 });

const nodes: StoryNode[] = [
  // ── the stadium ────────────────────────────────────────────────────────
  {
    id: 'ms_stadium_call', arc: 'missions', channel: 'call', from: 'moses', expires: 3, hours: [9, 20], title: 'Big Moses: the stadium',
    lapse: { fx: [bond('moses', -1)] },
    lines: [
      { who: 'moses', text: "{name}. I'm standing in the National Stadium right now and the man who books it is next to me. They need an opening act for a night in the big building." },
      { who: 'moses', text: "He's here till tomorrow evening. Come to the stadium. Walk onto that pitch like you own it. Don't keep him waiting." },
    ],
    choices: [
      { id: 'come', label: "I'm on my way.", tone: 'honest', fx: [sched('ms_stadium_meet', 0)] },
      { id: 'busy', label: "Can't today. Sorry, Moses.", tone: 'quiet', fx: [bond('moses', -1)] },
    ],
  },
  {
    id: 'ms_stadium_meet', arc: 'missions', channel: 'encounter', from: 'moses', where: 'stadium', expires: 2, title: 'The pitch',
    lapse: { fx: [bond('moses', -2), f('ms_stadium_missed')] },
    lines: [
      { who: 'narr', text: "The pitch is bigger than it looks from the stands. Somewhere above you a floodlight hums. Moses waves from the centre circle with the man from the booking office." },
      { who: 'moses', text: "There he is. This is the artist I told you about." },
      { who: 'narr', text: "The booking man looks you up and down, and then at the empty stands, and then at you again. 'Can you fill this?' he asks." },
    ],
    choices: [
      { id: 'big', label: "Yes. Book me and I'll fill it.", tone: 'sly', fx: [{ k: 'fame', v: 3 }, rep('hustle', 3), f('ms_stadium_big'), bond('moses', 2), mem('You told the stadium man you could fill his building. He wrote it down.')] },
      { id: 'honest', label: 'Not yet. Put me on the small stage first.', tone: 'honest', fx: [rep('integrity', 3), { k: 'money', v: 300 }, bond('moses', 3), mem('You told the stadium booker you were not ready, and he respected it.', 'good')] },
    ],
  },
  // ── the studio lot ─────────────────────────────────────────────────────
  {
    id: 'ms_lot_call', arc: 'missions', channel: 'call', from: 'selasi', expires: 4, hours: [10, 21], title: 'Selasi: a screen test',
    lapse: { fx: [bond('selasi', -1)] },
    lines: [
      { who: 'selasi', text: "{name}, it's Selasi. I'm on the lot at Gold Coast Studios and there's a gap in the schedule. A producer needs a face for a short scene. Not an actor — someone real." },
      { who: 'selasi', text: "Come to the soundstage. Ask for me. Twenty minutes, and you could be on screen." },
    ],
    choices: [
      { id: 'come', label: 'Coming now.', tone: 'honest', fx: [sched('ms_lot_meet', 0)] },
      { id: 'no', label: "Cameras aren't my thing.", tone: 'quiet', fx: [bond('selasi', -1)] },
    ],
  },
  {
    id: 'ms_lot_meet', arc: 'missions', channel: 'encounter', from: 'selasi', where: 'lots', expires: 3, title: 'On the soundstage',
    lapse: { fx: [bond('selasi', -2), f('ms_lot_missed')] },
    lines: [
      { who: 'narr', text: "The soundstage is cold and quiet in the way big rooms get when a hundred people are about to start talking. A camera sits on a dolly like something waiting to be fed." },
      { who: 'selasi', text: "Over here. Stand on the tape. Don't act. Just tell the lens one true thing about where you're from." },
    ],
    choices: [
      { id: 'true', label: 'Tell the truth about home.', tone: 'honest', fx: [{ k: 'fame', v: 4 }, rep('heart', 3), bond('selasi', 4), f('ms_lot_done'), mem('You told a camera one true thing about home. Selasi cut the take and said nothing for a second.', 'good')] },
      { id: 'sell', label: 'Sell it. Give them a line to repeat.', tone: 'sly', fx: [{ k: 'fame', v: 3 }, { k: 'fans', v: 150 }, rep('hustle', 2), bond('selasi', 1), f('ms_lot_done')] },
    ],
  },
  // ── the market ─────────────────────────────────────────────────────────
  {
    id: 'ms_mall_call', arc: 'missions', channel: 'text', from: 'mimi', expires: 4, title: 'Mimi: a pop-up',
    lapse: { fx: [bond('mimi', -1)] },
    lines: [
      { who: 'mimi', text: "Street team at Market Square this afternoon — free stalls, a crowd, nobody famous. Come stand in it for an hour. People remember who shows up when nobody told the press." },
    ],
    choices: [
      { id: 'go', label: "I'll be there.", tone: 'honest', fx: [sched('ms_mall_meet', 0)] },
      { id: 'skip', label: 'Not this one.', tone: 'quiet', fx: [bond('mimi', -1)] },
    ],
  },
  {
    id: 'ms_mall_meet', arc: 'missions', channel: 'encounter', from: 'mimi', where: 'mall', expires: 3, title: 'Among the stalls',
    lapse: { fx: [bond('mimi', -1), f('ms_mall_missed')] },
    lines: [
      { who: 'narr', text: "Market Square smells of grilled corn and hot oil. A speaker somewhere is playing somebody else's hit. Mimi pushes through the crowd holding two cold drinks." },
      { who: 'mimi', text: "Hold this. Now — shake hands, take pictures, learn three names. Don't pitch. Be the person they tell their cousins about." },
    ],
    choices: [
      { id: 'work', label: 'Work the whole square.', tone: 'sly', fx: [{ k: 'fans', v: 220 }, { k: 'energy', v: -12 }, rep('hustle', 2), bond('mimi', 2), mem('You worked the whole of Market Square for an hour. Three people asked for your handle.')] },
      { id: 'few', label: 'Sit with a few people and really talk.', tone: 'kind', fx: [{ k: 'fans', v: 80 }, rep('heart', 3), bond('mimi', 3), mem('You spent an hour with five people at Market Square. Two of them became real fans.', 'good', 'people')] },
    ],
  },
  // ── the bank ───────────────────────────────────────────────────────────
  {
    id: 'ms_bank_call', arc: 'missions', channel: 'call', from: 'afia', expires: 4, hours: [9, 17], title: 'Afia: read before you sign',
    lapse: { fx: [bond('afia', -1)] },
    lines: [
      { who: 'afia', text: "{name}, Afia Boakye. An offer is sitting at First Capital waiting for your signature. Do not sign it alone. Meet me at the bank — I'll be at the advisor's desk." },
    ],
    choices: [
      { id: 'come', label: "I'll come now.", tone: 'honest', fx: [sched('ms_bank_meet', 0)] },
      { id: 'later', label: "I'll deal with it myself.", tone: 'sharp', fx: [bond('afia', -2), f('ms_bank_alone')] },
    ],
  },
  {
    id: 'ms_bank_meet', arc: 'missions', channel: 'encounter', from: 'afia', where: 'bank', expires: 3, title: 'The advisor\'s desk',
    lapse: { fx: [bond('afia', -2), f('ms_bank_missed')] },
    lines: [
      { who: 'narr', text: "First Capital is all marble and low voices. Afia is already sitting down, reading glasses on, a pen in her hand like a small sword." },
      { who: 'afia', text: "Page six. There. Read it out loud. See how the sentence changes when you hear it?" },
    ],
    choices: [
      { id: 'careful', label: "Strike the clause. We'll negotiate.", tone: 'honest', fx: [{ k: 'money', v: -200 }, rep('integrity', 3), bond('afia', 4), f('ms_bank_careful'), mem('Afia made you read page six aloud. You struck the clause. It cost you a day and saved you a year.', 'good', 'money')] },
      { id: 'fast', label: 'Sign it. I need the money now.', tone: 'sly', fx: [{ k: 'money', v: 1500 }, rep('hustle', 2), rep('integrity', -2), bond('afia', -2), f('ms_bank_signed'), mem('You signed the bank offer against Afia\'s advice. The money was real. So was page six.', 'bad', 'money')] },
    ],
  },
];

export const missionsArc: Arc = {
  id: 'missions', title: 'Out in the city', path: 'all', nodes,
  triggers: [
    { node: 'ms_mall_call', if: { k: 'all', of: [{ k: 'day', min: 10 }, { k: 'stat', id: 'fame', min: 5 }] } },
    { node: 'ms_stadium_call', if: { k: 'all', of: [{ k: 'day', min: 16 }, { k: 'stat', id: 'fame', min: 12 }] } },
    { node: 'ms_lot_call', if: { k: 'all', of: [{ k: 'day', min: 22 }, { k: 'stat', id: 'songs', min: 1 }] } },
    { node: 'ms_bank_call', if: { k: 'all', of: [{ k: 'day', min: 28 }, { k: 'stat', id: 'money', min: 500 }] } },
  ],
};
