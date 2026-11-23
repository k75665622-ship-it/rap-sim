// ROOTS — where you started changes how the story opens, and what the world
// asks of you when you cross a border. Region-gated lines inside shared nodes.
import type { Arc, Effect, StoryNode } from '../types';

const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const rep = (axis: 'integrity' | 'hustle' | 'heart', v: number): Effect => ({ k: 'rep', axis, v });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral'): Effect => ({ k: 'memory', text, tone, kind: 'career', weight: 3 });
const from = (r: string) => ({ k: 'flag' as const, id: `from:${r}` });
const at = (r: string) => ({ k: 'flag' as const, id: `at:${r}` });

const nodes: StoryNode[] = [
  {
    id: 'rt_welcome', arc: 'roots', channel: 'call', from: 'mimi', expires: 5, hours: [8, 21], title: 'A call about where you stand',
    lapse: { fx: [f('roots_unheard')] },
    lines: [
      { who: 'mimi', text: "{name}, it's Mimi. I manage people who are about to matter. Two minutes. Where you're standing right now decides a lot." },
      { who: 'mimi', if: from('westafrica'), text: "West Africa is loud, fast and honest about money. Everybody's cousin has a studio. Everybody's cousin is also trying to sign you. Be loved here first." },
      { who: 'mimi', if: from('africa'), text: "Your scene is smaller than the big coastal ones, but hungrier — and hunger records well. Own your corner before anyone tells you it's too small." },
      { who: 'mimi', if: from('europe'), text: "Europe will give you infrastructure: venues, grants, press with manners. It won't give you heat. You'll have to bring the heat from home." },
      { who: 'mimi', if: from('americas'), text: "The Americas have the biggest machine in the world. The machine does not know your name and does not plan to learn it unless you make it." },
      { who: 'mimi', if: from('elsewhere'), text: "Your market is its own planet. The charts here don't care what the West thinks — which is exactly why people are going to start paying attention." },
      { who: 'mimi', if: from('ghana'), text: "You're in Accra, where the party they call Akwaaba Tonight is being quietly arranged. Stay close to the street. The street talks." },
      { who: 'mimi', text: "So tell me — where do you want to be loved first?" },
    ],
    choices: [
      { id: 'local', label: 'Here. I build at home first.', tone: 'honest', fx: [f('roots_local'), rep('heart', 2), bond('mimi', 3), mem('You told Mimi you would be loved at home first.')] },
      { id: 'global', label: 'Everywhere. I want out.', tone: 'sly', fx: [f('roots_global'), rep('hustle', 3), bond('mimi', 2), mem('You told Mimi you want the world, not just the neighbourhood.')] },
      { id: 'accra', label: 'Tell me about this Akwaaba Tonight.', tone: 'quiet', fx: [f('roots_accra_curious'), bond('mimi', 2)] },
    ],
  },
  {
    id: 'rt_invite', arc: 'roots', channel: 'text', from: 'moses', expires: 14, title: 'A desk at the airport',
    lines: [
      { who: 'moses', if: { k: 'not', c: from('ghana') }, text: "Big Moses. Promoter, Accra. Word on the street is you're worth a flight. Something is brewing in this city — the kind of night people talk about for years. Gold Coast Airport, check-in desk. Fly in. I'll find you." },
      { who: 'moses', if: from('ghana'), text: "Big Moses. A promoter I know abroad keeps asking about you. Not a favour — a test. Gold Coast Airport, check-in desk. Pick a country. Go play. Come back with a story." },
    ],
    choices: [
      { id: 'yes', label: "I'll book it.", tone: 'honest', fx: [f('roots_will_fly'), bond('moses', 3)] },
      { id: 'later', label: 'Not yet.', tone: 'quiet', fx: [bond('moses', -1)] },
    ],
  },
  {
    id: 'rt_landed', arc: 'roots', channel: 'call', from: 'mimi', expires: 3, title: 'You landed',
    lines: [
      { who: 'mimi', text: "You landed. A flight is a statement, {name}. The people here are already asking who you are." },
      { who: 'mimi', if: at('ghana'), text: "Accra: warm, loud, and watching. The kitchen on the strip, the label up the road, the party everyone whispers about. Walk the city before you talk about it." },
      { who: 'mimi', if: at('westafrica'), text: "West Africa moves at your speed or faster. Keep your phone charged and your ego quiet. Somebody's cousin is about to find you." },
      { who: 'mimi', if: at('africa'), text: "A smaller scene means everyone remembers how you behaved. Be generous early." },
      { who: 'mimi', if: at('europe'), text: "Cold weather, warm rooms. Be on time. They notice." },
      { who: 'mimi', if: at('americas'), text: "Big city, short attention. Say one thing well." },
      { who: 'mimi', if: at('elsewhere'), text: "Nobody here owes you anything yet, which is the best place to start. Listen to the room first." },
    ],
    choices: [
      { id: 'humble', label: 'I came to listen.', tone: 'quiet', fx: [rep('heart', 2), bond('mimi', 2), { k: 'fame', v: 1 }] },
      { id: 'loud', label: 'I came to be heard.', tone: 'sharp', fx: [rep('hustle', 2), { k: 'fame', v: 2 }, mem('You landed abroad loud. The right people noticed. So did the wrong ones.')] },
    ],
  },
];

export const rootsArc: Arc = {
  id: 'roots', title: 'Where you started', path: 'all', nodes,
  triggers: [
    { node: 'rt_welcome', if: { k: 'day', min: 1 } },
    { node: 'rt_invite', if: { k: 'all', of: [{ k: 'day', min: 20 }, { k: 'not', c: { k: 'flag', id: 'away' } }] } },
    { node: 'rt_landed', if: { k: 'flag', id: 'away' } },
  ],
};
