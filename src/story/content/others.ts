// PRODUCER "Reel 9", MANAGER "Hands", SINGER-SONGWRITER "The Key" — opening chapters.
import type { Arc, Effect, StoryNode, Task } from '../types';
const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral', who: string[] = []): Effect => ({ k: 'memory', text, tone, who, kind: 'career', weight: 3 });

// ── PRODUCER ────────────────────────────────────────────────────────────────
const beatTask: Task = { id: 'ankh-beat', kind: 'beat', text: "Make one beat for the studio's board. Ankh will hear it. Don't make it loud — make it honest.", withinDays: 4, tiers: [], done: 'p3_twice', miss: 'p3_twice' };
const producer: StoryNode[] = [
  {
    id: 'p1_call', arc: 'reel-9', channel: 'call', from: 'ankh', hours: [3, 7], expires: 2, title: 'Ankh, 4:10 a.m.', lapse: { fx: [bond('ankh', -2), f('missed_ankh_call')], schedule: { node: 'p2_sweep', days: 2 } },
    lines: [
      { who: 'ankh', text: "You're the one selling beats on the internet for twenty dollars." },
      { who: 'ankh', text: "I need hands. My engineer left. Three of my four cables are lying to me. The door's open. Bring your laptop and no opinions." },
    ],
    choices: [
      { id: 'yes', label: 'On my way.', tone: 'kind', fx: [bond('ankh', 3), sched('p2_sweep', 0)] },
      { id: 'twenty', label: 'My beats are worth more than twenty dollars.', tone: 'sharp', fx: [bond('ankh', 1), { k: 'rep', axis: 'hustle', v: 2 }, sched('p2_sweep', 0)] },
      { id: 'asleep', label: "It's four in the morning.", tone: 'quiet', fx: [bond('ankh', -1), sched('p2_sweep', 1)] },
    ],
  },
  {
    id: 'p2_sweep', arc: 'reel-9', channel: 'encounter', from: 'ankh', where: 'studio', expires: 5, title: 'Studio 9, the floor', lapse: { fx: [bond('ankh', -3)], schedule: { node: 'p3_twice', days: 2 } },
    lines: [
      { who: 'narr', text: 'Studio 9 at dawn is a cathedral that forgot its hymns. Dust on the faders, a console older than you, and a steel door at the end of the hall with a 9 painted on it.' },
      { who: 'ankh', text: "Mop first. Then cables. Then — one key, one sound. You press it. I'll tell you what it says about you." },
      { who: 'narr', text: 'You press a key on a keyboard that has not been played in years. One note. It rings for a long time.' },
      { who: 'ankh', text: "…Hm. You let it ring. Most people stab at it. Make me something for the board. Honest, not loud." },
    ],
    choices: [{ id: 'ok', label: 'Open the beat maker.', tone: 'honest', fx: [bond('ankh', 3), f('swept_floor'), { k: 'task', task: beatTask }] }],
  },
  {
    id: 'p3_twice', arc: 'reel-9', channel: 'text', from: 'static', expires: 3, title: 'Two buyers, one beat', lapse: { fx: [f('beat_sold_twice_silent')] },
    lines: [
      { who: 'static', text: "Yo. That beat on your page — 'Rain on Tin'. I'll take it exclusive. Name a number. Cash today." },
      { who: 'narr', text: 'An hour later, a second message, from a number you don\'t know:' },
      { who: 'adwoa', text: "Hi — Adwoa Sarpong. I just wrote the best chorus of my life over 'Rain on Tin'. Please say it's still available." },
    ],
    choices: [
      { id: 'static', label: 'Sell it to Static. Tell Adwoa the truth.', tone: 'honest', fx: [bond('static', 5), bond('adwoa', -2), { k: 'money', v: 400 }, { k: 'rep', axis: 'integrity', v: 3 }, f('sold_static')] },
      { id: 'adwoa', label: 'Sell it to Adwoa. Tell Static the truth.', tone: 'honest', fx: [bond('adwoa', 5), bond('static', -2), { k: 'money', v: 300 }, { k: 'rep', axis: 'integrity', v: 3 }, f('sold_adwoa')] },
      { id: 'both', label: 'Sell to both. Quietly. Different stems, different mixes.', tone: 'sly', fx: [{ k: 'money', v: 700 }, { k: 'rep', axis: 'hustle', v: 4 }, { k: 'rep', axis: 'integrity', v: -4 }, f('sold_twice'), sched('p4_found_out', 6)] },
    ],
  },
  {
    id: 'p4_found_out', arc: 'reel-9', channel: 'call', from: 'adwoa', expires: 1, title: 'Adwoa, 9:02 p.m.', lapse: { fx: [bond('adwoa', -6), bond('static', -6)], schedule: { node: 'p4_found_out', days: 99 } },
    lines: [
      { who: 'adwoa', text: "Two radio stations. Two artists. One beat. Tell me I'm hearing a coincidence." },
      { who: 'narr', text: "Her voice isn't loud. That's what makes it frightening." },
    ],
    choices: [
      { id: 'own', label: 'It was me. I sold it twice. I can explain.', tone: 'honest', fx: [bond('adwoa', 2), { k: 'rep', axis: 'integrity', v: 2 }, f('owned_double_sale')] },
      { id: 'lie', label: "It's a sample issue. A coincidence.", tone: 'sly', fx: [bond('adwoa', -8), { k: 'rep', axis: 'integrity', v: -3 }, f('lied_double_sale')] },
    ],
  },
];
export const producerArc: Arc = {
  id: 'reel-9', title: 'Reel 9', path: 'producer', nodes: producer,
  triggers: [{ node: 'p1_call', if: { k: 'all', of: [{ k: 'path', is: 'producer' }, { k: 'day', min: 0 }] } }],
};

// ── MANAGER ─────────────────────────────────────────────────────────────────
const manager: StoryNode[] = [
  {
    id: 'm1_text', arc: 'hands', channel: 'text', from: 'adwoa', expires: 3, title: 'Coffee?', lapse: { fx: [f('adwoa_waited')], schedule: { node: 'm2_coffee', days: 1 } },
    lines: [
      { who: 'adwoa', text: "You booked my cousin's wedding, my friend's launch and somehow a goat sacrifice, all for free." },
      { who: 'adwoa', text: "I need someone to answer my emails who isn't me. Coffee at Mama's? I'm paying. For once." },
    ],
    choices: [
      { id: 'yes', label: "Sure. I'll be there.", tone: 'kind', fx: [bond('adwoa', 2), sched('m2_coffee', 0)] },
      { id: 'goat', label: 'The goat was a one-time thing.', tone: 'sly', fx: [bond('adwoa', 3), sched('m2_coffee', 0)] },
    ],
  },
  {
    id: 'm2_coffee', arc: 'hands', channel: 'encounter', from: 'adwoa', where: 'kitchen', expires: 4, title: 'Coffee at Mama\'s', lapse: { fx: [bond('adwoa', -3)], schedule: { node: 'm3_mimi', days: 1 } },
    lines: [
      { who: 'narr', text: "Mama's Kitchen, mid-afternoon: steam off the jollof, a table by the window, Adwoa with a notebook that looks like it has a lot of secrets." },
      { who: 'adwoa', text: "Here's my condition. Don't treat me like a product. I've been a product. I didn't like the packaging." },
      { who: 'adwoa', text: "And one more. If you ever find out something about my career that I should know — you tell me first. Even if it costs you." },
    ],
    choices: [
      { id: 'promise', label: "Deal. You hear it from me first. Always.", tone: 'honest', fx: [bond('adwoa', 6), { k: 'rep', axis: 'integrity', v: 3 }, f('promised_adwoa'), sched('m3_mimi', 1)] },
      { id: 'terms', label: "I'll tell you what I can. Management has secrets too.", tone: 'sly', fx: [bond('adwoa', 1), { k: 'rep', axis: 'hustle', v: 2 }, sched('m3_mimi', 1)] },
    ],
  },
  {
    id: 'm3_mimi', arc: 'hands', channel: 'call', from: 'mimi', hours: [9, 20], expires: 2, title: 'Mimi Owusu-Banson', lapse: { fx: [f('mimi_noticed_silence')], schedule: { node: 'm4_statement', days: 3 } },
    lines: [
      { who: 'mimi', text: "I hear you've signed Adwoa Sarpong. Congratulations. That's a very good first client for a very new manager." },
      { who: 'mimi', text: "Come to the tower at Gold Coast Sound Thursday. I'll buy you a coffee that costs more than your phone. There's a conversation I want to have." },
    ],
    choices: [
      { id: 'go', label: "I'll come.", tone: 'kind', fx: [bond('mimi', 3), f('mimi_mentor'), sched('m4_statement', 3)] },
      { id: 'what', label: "What conversation? I'm not leaving my client.", tone: 'sharp', fx: [bond('mimi', -1), { k: 'rep', axis: 'integrity', v: 2 }, sched('m4_statement', 3)] },
    ],
  },
  {
    id: 'm4_statement', arc: 'hands', channel: 'letter', from: 'afia', expires: 7, title: 'A royalty statement', lapse: { fx: [f('statement_unread')] },
    lines: [
      { who: 'narr', text: 'A brown envelope slid under your door. A GCS royalty statement, three pages stapled, and a yellow sticky note in tidy handwriting:' },
      { who: 'afia', text: "Afia Boakye, music lawyer. Line 14. Monthly payments to a catering company, labelled 'Naa Kai advance recoup'. Naa Kai hasn't been seen in 25 years. Who is the caterer? Please call me." },
    ],
    choices: [
      { id: 'call', label: 'Call Afia.', tone: 'honest', fx: [bond('afia', 4), { k: 'rep', axis: 'integrity', v: 2 }, f('met_afia'), f('saw_line_14'), mem("A lawyer named Afia Boakye showed you a royalty line that doesn't make sense: payments to a caterer for a singer who disappeared.", 'neutral', ['afia'])] },
      { id: 'mimi', label: 'Ask Mimi about it first.', tone: 'sly', fx: [bond('mimi', 3), bond('afia', -1), f('asked_mimi_line_14')] },
      { id: 'burn', label: 'Burn it. Some questions cost clients.', tone: 'sharp', fx: [{ k: 'rep', axis: 'hustle', v: 3 }, { k: 'rep', axis: 'integrity', v: -3 }, f('burned_statement')] },
    ],
  },
];
export const managerArc: Arc = {
  id: 'hands', title: 'Hands', path: 'manager', nodes: manager,
  triggers: [{ node: 'm1_text', if: { k: 'all', of: [{ k: 'path', is: 'manager' }, { k: 'day', min: 0 }] } }],
};

// ── SINGER-SONGWRITER ───────────────────────────────────────────────────────
const singer: StoryNode[] = [
  {
    id: 's1_text', arc: 'the-key', channel: 'text', from: 'selasi', expires: 3, title: 'Your hook, on the radio', lapse: { fx: [f('selasi_waited')], schedule: { node: 's2_credit', days: 1 } },
    lines: [
      { who: 'selasi', text: "I'm not the kind of person who texts strangers. But the hook on the new GCS single — the melody on the bridge — that's yours. I heard you hum it on set last year." },
      { who: 'selasi', text: "The credit says someone else wrote it. I thought you should know before the radio does." },
    ],
    choices: [
      { id: 'thanks', label: "Thank you. I didn't know.", tone: 'kind', fx: [bond('selasi', 4), sched('s2_credit', 0)] },
      { id: 'sure', label: "Are you sure it's mine?", tone: 'honest', fx: [bond('selasi', 1), sched('s2_credit', 0)] },
    ],
  },
  {
    id: 's2_credit', arc: 'the-key', channel: 'encounter', from: 'selasi', where: 'kitchen', expires: 4, title: 'Proof', lapse: { schedule: { node: 's3_gala', days: 2 } },
    lines: [
      { who: 'narr', text: "Mama's Kitchen. Selasi has a laptop open to a clip: a stripped demo, your voice, your melody — dated eleven months before the GCS release." },
      { who: 'selasi', text: "I filmed this for a documentary I never finished. The date's in the file. It's yours." },
    ],
    choices: [
      { id: 'sue', label: 'Take it to a lawyer.', tone: 'honest', fx: [{ k: 'rep', axis: 'integrity', v: 3 }, bond('selasi', 3), f('went_legal'), sched('s3_gala', 3)] },
      { id: 'confront', label: "Confront the writer. Directly.", tone: 'sharp', fx: [{ k: 'rep', axis: 'hustle', v: 2 }, f('confronted_writer'), sched('s3_gala', 3)] },
      { id: 'trade', label: 'Let it go. Use it as leverage instead.', tone: 'sly', fx: [{ k: 'rep', axis: 'hustle', v: 3 }, { k: 'rep', axis: 'integrity', v: -2 }, f('hook_leverage'), sched('s3_gala', 3)] },
    ],
  },
  {
    id: 's3_gala', arc: 'the-key', channel: 'letter', from: 'efua', expires: 7, title: 'An invitation, cream card stock', lapse: { fx: [f('gala_invite_ignored')] },
    lines: [
      { who: 'narr', text: 'A heavy cream envelope with a gold seal. Inside:' },
      { who: 'efua', text: "Gold Coast Sound requests the pleasure of your voice at our 25th anniversary gala, at the Independence Arch Arena. You'll sing the song that built us. Please call my office." },
      { who: 'narr', text: 'At the bottom, in blue ink, the CEO\'s own handwriting: "I heard you at the wedding. I never forget a voice."' },
    ],
    choices: [
      { id: 'yes', label: 'Call the office. Say yes.', tone: 'kind', fx: [bond('efua', 4), { k: 'rep', axis: 'hustle', v: 2 }, f('accepted_gala'), mem('Efua Mensah-Quartey invited you to sing "Akwaaba Tonight" at the 25th-anniversary gala.', 'good', ['efua'])] },
      { id: 'ask', label: 'Ask what the song means to her.', tone: 'honest', fx: [bond('efua', 2), f('asked_efua_song')] },
      { id: 'no', label: "Decline. It's not your song.", tone: 'quiet', fx: [{ k: 'rep', axis: 'integrity', v: 3 }, bond('efua', -3), f('declined_gala')] },
    ],
  },
];
export const singerArc: Arc = {
  id: 'the-key', title: 'The Key', path: 'singer', nodes: singer,
  triggers: [{ node: 's1_text', if: { k: 'all', of: [{ k: 'path', is: 'singer' }, { k: 'day', min: 0 }] } }],
};
