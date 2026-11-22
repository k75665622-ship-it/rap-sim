// THE PERSONAL LAYER — for every seat: KJ (the shortcut), family, and the
// first whispers of the Akwaaba mystery arriving through ordinary life.
import type { Arc, Effect, StoryNode } from '../types';

const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const rep = (axis: 'integrity' | 'hustle' | 'heart', v: number): Effect => ({ k: 'rep', axis, v });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral', kind: 'people' | 'money' | 'life' | 'beef' | 'career' = 'people', weight = 3): Effect => ({ k: 'memory', text, tone, kind, weight });

// ── KJ: THE SHORTCUT ────────────────────────────────────────────────────────
const kj: StoryNode[] = [
  {
    id: 'k1_broke', arc: 'kj', channel: 'encounter', from: 'kj', where: 'city', expires: 8, title: 'You still broke?',
    lapse: { fx: [bond('kj', -2), f('kj_missed_first')], schedule: { node: 'k2_bag', days: 6 } },
    lines: [
      { who: 'narr', text: "A car you don't recognise slows beside you. The window comes down on a grin you'd know anywhere — the gap in the teeth, the gold chain that is definitely a loan." },
      { who: 'kj', text: "{name}! Still walking? Eh, they said you were 'building a career'. You're building it on foot?" },
      { who: 'kj', text: "I'm joking, I'm joking. Come, get in. It's been, what — two years? Three? You look tired, my guy." },
      { who: 'kj', text: "Listen. Talent is good. I'm not saying it isn't. But talent is a candle. Money is the electricity. Nobody sees a candle from the road." },
      { who: 'narr', text: "He pulls a roll of cash from the glovebox the way other people pull out a sandwich." },
      { who: 'kj', text: "Take it. Studio time, a phone that isn't cracked, whatever. We grew up in the same gutter; I'm not letting you drown in it alone." },
    ],
    choices: [
      { id: 'take', label: 'Take it. All of it. Say thank you.', tone: 'sly', fx: [{ k: 'money', v: 2500 }, f('kj_money'), f('kj_debt', 3500), bond('kj', 6), rep('integrity', -2), rep('hustle', 2), mem('KJ pulled up and handed you $2,500 "for the dream". You said thank you. He said "of course."', 'neutral', 'money'), sched('k2_bag', 4)] },
      { id: 'part', label: "Take a little. A loan. I'll pay it back, with interest.", tone: 'honest', fx: [{ k: 'money', v: 800 }, f('kj_loan'), f('kj_debt', 1000), bond('kj', 3), sched('k2_bag', 7)] },
      { id: 'no', label: "Keep it. I'll build it the slow way.", tone: 'quiet', fx: [rep('integrity', 3), f('kj_refused'), bond('kj', -1), mem('You turned down KJ\'s money. He laughed. He also looked, for a second, relieved — or hurt. You couldn\'t tell.', 'neutral', 'people'), sched('k2_bag', 10)] },
    ],
  },
  {
    id: 'k2_bag', arc: 'kj', channel: 'call', from: 'kj', hours: [17, 23], expires: 2, title: "KJ: don't ask questions",
    lapse: { fx: [f('kj_missed_job'), bond('kj', -2)], schedule: { node: 'k3_favour', days: 8 } },
    lines: [
      { who: 'kj', text: "My guy! Small job. A bag. Drop it at a studio in Tema, hand it to a man called Papa Joe. Fifteen minutes. Six hundred cedis for you. Dollars, I mean. Six hundred dollars. Don't tell your mother I said cedis." },
      { who: 'you', text: "Is it legal?" },
      { who: 'kj', text: "It's… geographic. Legal in some places." },
      { who: 'kj', text: "Don't ask questions, {name}. Questions cost extra." },
    ],
    choices: [
      { id: 'quiet', label: "Fine. I'll take the bag. No questions.", tone: 'sly', fx: [{ k: 'money', v: 600 }, f('did_kj_job'), rep('hustle', 2), rep('integrity', -3), bond('kj', 4), sched('k3_favour', 6)] },
      { id: 'peek', label: "I'll do it — but I'm looking inside first.", tone: 'honest', fx: [f('did_kj_job'), f('saw_bag'), { k: 'money', v: 600 }, bond('kj', -1), rep('integrity', -1), sched('k2_peek', 0)] },
      { id: 'ask', label: "What's in the bag, KJ?", tone: 'honest', fx: [bond('kj', -1), f('asked_kj'), rep('integrity', 1), sched('k3_favour', 6)] },
      { id: 'out', label: "No. I'm out.", tone: 'quiet', fx: [rep('integrity', 3), f('refused_kj_job'), bond('kj', -4), sched('k3_favour', 7)] },
    ],
  },
  {
    id: 'k2_peek', arc: 'kj', channel: 'scene', from: 'kj', title: 'The bag', lines: [
      { who: 'narr', text: "In the back of a trotro, you unzip the bag an inch. Not drugs, not weapons — worse, somehow: neat bundles of cash banded with ticket-stubs from the old Independence Arch Arena. Hundreds of them. Dated 1999." },
      { who: 'narr', text: "On the top bundle, an old promoter's stamp: M. APPIAH PRODUCTIONS." },
      { who: 'narr', text: "You zip the bag. Your heart is going like a hi-hat." },
    ],
    choices: [{ id: 'on', label: 'Deliver it. Say nothing.', tone: 'quiet', fx: [f('knows_moses_link'), mem("The bag KJ gave you carried old 1999 ticket stubs and cash stamped M. APPIAH PRODUCTIONS. Big Moses's money.", 'neutral', 'money', 4), sched('k3_favour', 6)] }],
  },
  {
    id: 'k3_favour', arc: 'kj', channel: 'text', from: 'kj', expires: 4, title: 'I need a favour',
    lapse: { fx: [bond('kj', -3), f('kj_favour_ignored')], schedule: { node: 'k4_owe', days: 20 } },
    lines: [
      { who: 'kj', text: "Bro. Favour. Not a job — a favour. Thursday night at The Stage, if anyone asks, I was with you from eight. Like, all night. Watching you perform. Which you'll be doing. Obviously." },
      { who: 'kj', text: "I can't say more. I'm not asking you to lie. I'm asking you to remember it the way I remember it." },
      { who: 'kj', text: "You'd do it for me. I did it for you." },
    ],
    choices: [
      { id: 'vouch', label: "Okay. You were with me all night.", tone: 'sly', fx: [rep('integrity', -5), bond('kj', 8), f('alibi_kj'), sched('k4_owe', 18)] },
      { id: 'terms', label: "I'll vouch for you if you tell me what happened.", tone: 'honest', fx: [rep('integrity', 1), bond('kj', 1), f('kj_told_truth'), f('knows_moses_link'), sched('k3_truth', 0)] },
      { id: 'no', label: "I can't do that, KJ. Not for anyone.", tone: 'quiet', fx: [rep('integrity', 3), bond('kj', -6), f('refused_alibi'), sched('k4_owe', 18)] },
    ],
  },
  {
    id: 'k3_truth', arc: 'kj', channel: 'scene', from: 'kj', title: 'What KJ tells you', lines: [
      { who: 'kj', text: "Okay. Okay. A man I work for — you don't know him — a man who does shows — he lost a cash drop. Somebody said it was me. It wasn't. But if they ask where I was…" },
      { who: 'kj', text: "He's not a bad man, {name}. He's a man who remembers things. Everything. He's been remembering a long time." },
      { who: 'narr', text: "You get the feeling you've just heard about Big Moses without hearing his name." },
    ],
    choices: [
      { id: 'vouch', label: "Fine. You were with me.", tone: 'sly', fx: [rep('integrity', -4), bond('kj', 6), f('alibi_kj'), sched('k4_owe', 18)] },
      { id: 'help', label: "Tell the truth to him yourself. I'll come with you.", tone: 'honest', fx: [rep('integrity', 3), rep('heart', 3), bond('kj', 3), f('went_with_kj'), sched('k4_owe', 18)] },
    ],
  },
  {
    id: 'k4_owe', arc: 'kj', channel: 'encounter', from: 'kj', where: 'kitchen', expires: 10, title: 'You owe me',
    lapse: { fx: [bond('kj', -5), f('kj_waited')], schedule: { node: 'k5_career', days: 30 } },
    lines: [
      { who: 'narr', text: "KJ is waiting at Mama's Kitchen, at a corner table, eating a plate of waakye the way a man eats when he's decided something." },
      { who: 'kj', text: "Remember who helped you when nobody knew your name.", if: { k: 'any', of: [{ k: 'flag', id: 'kj_money' }, { k: 'flag', id: 'kj_loan' }] } },
      { who: 'kj', text: "That money wasn't a gift, {name}. It was an investment. A man doesn't give away that kind of money. He plants it.", if: { k: 'flag', id: 'kj_money' } },
      { who: 'kj', text: "You paid me back every cedi, I know, I know. But the other thing — being believed in — that's not something you pay back with cash.", if: { k: 'flag', id: 'kj_loan' } },
      { who: 'kj', text: "You turned my money down, and I respected that. Then I watched you struggle for months and I thought — where's the loyalty, where's the 'I got you'? Who stood next to you at the bus stop?", if: { k: 'flag', id: 'kj_refused' } },
      { who: 'kj', text: "You alibied me, remember? That makes us partners in a thing. Partners don't walk away.", if: { k: 'flag', id: 'alibi_kj' } },
      { who: 'kj', text: "The man I work for is asking about you. He says you've become useful. He wants an introduction — your studio, your manager, your label friends. Just an introduction." },
    ],
    choices: [
      { id: 'pay', label: 'Pay him what I owe — and not a cedi more. We are done.', tone: 'honest', if: { k: 'money', min: 1000 }, fx: [{ k: 'money', v: -1000 }, rep('integrity', 3), bond('kj', -2), f('paid_kj'), sched('k5_career', 25)] },
      { id: 'negotiate', label: "Let's talk about what 'owing' means between us.", tone: 'sly', fx: [rep('hustle', 3), bond('kj', 2), f('negotiated_kj'), sched('k5_career', 25)] },
      { id: 'help', label: 'Get out, KJ. I can find you honest work. A studio runner, a driver, anything.', tone: 'kind', fx: [rep('heart', 4), bond('kj', 4), f('helping_kj_out'), mem('You told KJ you would find him honest work. He didn\'t laugh this time.', 'good', 'people', 4), sched('k5_career', 25)] },
      { id: 'betray', label: "Go to the police. Tell them what's in that bag.", tone: 'sharp', fx: [rep('integrity', 2), bond('kj', -25), f('betrayed_kj'), mem('You turned KJ in. Nobody calls it betrayal when the law does it, but he will.', 'bad', 'beef', 5), sched('k5_career', 14)] },
      { id: 'refuse', label: 'No introductions. I am not your door.', tone: 'sharp', fx: [bond('kj', -8), f('refused_kj_intro'), sched('k5_career', 25)] },
    ],
  },
  {
    id: 'k5_career', arc: 'kj', channel: 'encounter', from: 'kj', where: 'shows', hours: [18, 4], expires: 10, title: 'The career',
    lapse: { fx: [bond('kj', -6)], goto: undefined },
    lines: [
      { who: 'narr', text: "Backstage at The Stage. Your name is on the poster outside — not big, but there. KJ is leaning on a flight case, not smiling, which is how you know it's serious." },
      { who: 'kj', text: "Everyone knows your name now. That's what I wanted. And now I want in." },
      { who: 'kj', text: "I got hurt, {name}, when you walked past me at the awards and kept walking. I know you didn't see me. That's what hurt.", if: { k: 'flag', id: 'kj_money' } },
      { who: 'kj', text: "I heard what you did. The police. I'm not here to shout. I'm here to ask one question: did it help?", if: { k: 'flag', id: 'betrayed_kj' } },
      { who: 'kj', text: "I took that job you gave me. Studio runner. Nine months, no trouble. You know how long it's been since someone trusted me with a key?", if: { k: 'flag', id: 'helping_kj_out' } },
      { who: 'kj', text: "So. I have a business — real, mostly — and I want a seat near yours. What are we?" },
    ],
    choices: [
      { id: 'inside', label: 'Bring him inside. Studio, team, the lot.', tone: 'kind', fx: [bond('kj', 10), rep('heart', 3), f('kj_inside'), { k: 'end', arc: 'kj', outcome: 'inside' }, mem('You brought KJ inside your world. Whatever happens next, you chose it.', 'neutral', 'people', 5)] },
      { id: 'away', label: 'Keep him close as a friend — but away from the business.', tone: 'honest', fx: [bond('kj', 2), rep('integrity', 3), f('kj_away'), { k: 'end', arc: 'kj', outcome: 'away' }] },
      { id: 'cut', label: 'Cut him off. For good.', tone: 'sharp', fx: [bond('kj', -20), rep('integrity', 2), f('kj_cut'), { k: 'end', arc: 'kj', outcome: 'cut' }, mem('You cut KJ off. You told yourself it was a clean break.', 'bad', 'people', 5)] },
      { id: 'deal', label: 'A real deal, in writing. Mutual benefit — and I keep the pen.', tone: 'sly', fx: [bond('kj', 4), rep('hustle', 4), { k: 'money', v: 1500 }, f('kj_partner'), { k: 'end', arc: 'kj', outcome: 'partner' }] },
    ],
  },
];

// ── FAMILY ──────────────────────────────────────────────────────────────────
const family: StoryNode[] = [
  {
    id: 'f1_hobby', arc: 'family', channel: 'text', from: 'mum', expires: 6, title: 'Is it a business or a hobby?', lapse: { fx: [bond('mum', -2)] },
    lines: [
      { who: 'mum', text: "Your auntie tells me you are 'in the music business'. Is that a business or a hobby with a phone?" },
      { who: 'mum', text: 'Have you eaten. Real food. Not whatever is in that packet.' },
    ],
    choices: [
      { id: 'business', label: "It's a business, Mum. I'm building it.", tone: 'honest', fx: [bond('mum', 3), f('mum_knows_plan')] },
      { id: 'eaten', label: "I've eaten. I swear. (I have not eaten.)", tone: 'sly', fx: [bond('mum', 1)] },
      { id: 'later', label: 'Mum, I will call you later. Love you.', tone: 'quiet', fx: [bond('mum', 1)] },
    ],
  },
  {
    id: 'f2_poster', arc: 'family', channel: 'call', from: 'mum', hours: [8, 21], expires: 3, title: 'Mum, on the phone', lapse: { fx: [bond('mum', -3), f('mum_hurt')] },
    lines: [
      { who: 'mum', text: "I saw your name on a poster. Your uncle took a photo of it. He's been showing the barber." },
      { who: 'mum', text: "I didn't know it would be so… small. And so big. At the same time. You understand?" },
    ],
    choices: [
      { id: 'invite', label: 'Come to my next show, Mum. Front row.', tone: 'kind', fx: [bond('mum', 6), rep('heart', 2), mem('Your mother saw your name on a poster. You invited her to the front row.', 'good', 'life', 4)] },
      { id: 'send', label: 'Let me send you something for the house.', tone: 'kind', if: { k: 'money', min: 300 }, fx: [{ k: 'money', v: -200 }, bond('mum', 4)] },
      { id: 'dont', label: "Don't tell anyone yet, Mum. It's early.", tone: 'quiet', fx: [bond('mum', -1)] },
    ],
  },
  {
    id: 'f3_home', arc: 'family', channel: 'call', from: 'mum', hours: [8, 22], expires: 4, title: 'You don\'t come home anymore', lapse: { fx: [bond('mum', -6), f('mum_hurt')] },
    lines: [
      { who: 'mum', text: "I'm not shouting. I want you to hear that. I'm not shouting." },
      { who: 'mum', text: "You don't come home anymore. Your room is the same. The boy next door asks if you're dead or famous." },
      { who: 'mum', text: "I made your stew yesterday and I didn't know who to give it to.", if: { k: 'flag', id: 'mum_hurt' } },
    ],
    choices: [
      { id: 'visit', label: "I'm coming this weekend. I'll stay for dinner. The whole dinner.", tone: 'kind', fx: [bond('mum', 7), rep('heart', 3), f('went_home'), mem('You went home. The stew was the same as when you were nine.', 'good', 'life', 4)] },
      { id: 'sorry', label: "I'm sorry. It's been a lot. I'll make it up.", tone: 'honest', fx: [bond('mum', 2)] },
      { id: 'busy', label: "Mum, I'm in the middle of something — can we talk later?", tone: 'quiet', fx: [bond('mum', -3)] },
    ],
  },
  {
    id: 'f4_low', arc: 'family', channel: 'text', from: 'mum', expires: 5, title: 'You do not have to prove anything', lapse: {},
    lines: [
      { who: 'mum', text: "I don't know much about this business. I know your face when you try to look fine." },
      { who: 'mum', text: 'You do not have to prove anything to us. There is always rice, and there is always a bed.' },
    ],
    choices: [
      { id: 'thanks', label: 'Thank you, Mum. I might take the rice.', tone: 'kind', fx: [bond('mum', 5), rep('heart', 1)] },
      { id: 'fine', label: "I'm fine. Really.", tone: 'quiet', fx: [bond('mum', 1)] },
    ],
  },
  {
    id: 'f5_heard', arc: 'family', channel: 'call', from: 'mum', hours: [6, 24], expires: 2, title: 'Mum', lapse: {},
    lines: [
      { who: 'mum', text: 'I heard you.' },
      { who: 'narr', text: 'A long pause on the line. Traffic behind her. A bird.' },
      { who: 'mum', text: 'Your father would have been proud.' },
      { who: 'narr', text: 'She hangs up before you can answer. Nothing was gained. Nothing was asked.' },
    ],
    choices: [{ id: 'hold', label: 'Hold the phone a little longer.', tone: 'quiet', fx: [mem('Your mum called after the radio. "I heard you." Then: "Your father would have been proud."', 'good', 'life', 5), bond('mum', 4)] }],
  },
];

// ── THE AKWAABA WHISPERS (ordinary life, strange details) ───────────────────
const world: StoryNode[] = [
  {
    id: 'w1_billboard', arc: 'whispers', channel: 'encounter', from: 'narr', where: 'city', expires: 20, title: 'A billboard on the main road', lapse: { schedule: { node: 'w2_radio', days: 3 } },
    lines: [
      { who: 'narr', text: 'A new billboard goes up overnight on the main road: LADY ZEE — AKWAABA TONIGHT (THE REMIX). GOLD COAST SOUND PRESENTS: 25 YEARS.' },
      { who: 'narr', text: 'From a phone-charging shop on the corner, the song is playing. Everybody in the queue is humming along without noticing.' },
      { who: 'narr', text: 'You catch yourself doing it too. The same three notes. The crack in the middle.' },
    ],
    choices: [
      { id: 'listen', label: 'Stand there and listen to the whole thing.', tone: 'quiet', fx: [f('listened_akwaaba'), sched('w2_radio', 2)] },
      { id: 'move', label: 'Keep walking. Songs are songs.', tone: 'sly', fx: [sched('w2_radio', 4)] },
    ],
  },
  {
    id: 'w2_radio', arc: 'whispers', channel: 'encounter', from: 'ankh', where: 'studio', expires: 12, title: 'The radio is on', lapse: {},
    lines: [
      { who: 'narr', text: "You walk into Studio 9. The radio on the shelf is playing Lady Zee's remix. Ankh is sitting with his back to it, eating bread, not eating bread." },
      { who: 'narr', text: 'The second you step through the door, he reaches over and turns the radio off. Not angrily. Like closing a window on a draught.' },
      { who: 'ankh', text: "Sorry. Old man's nerves. What did you need?" },
    ],
    choices: [
      { id: 'ask', label: "Ankh — why did you turn it off?", tone: 'honest', fx: [f('asked_ankh_radio'), bond('ankh', -1), rep('integrity', 1), sched('u1_unknown', 0)] },
      { id: 'play', label: 'Turn it back on. Casually.', tone: 'sly', fx: [f('turned_radio_on'), bond('ankh', -2), sched('u1_unknown', 0)] },
      { id: 'drop', label: 'Nothing. I came to see how you are.', tone: 'kind', fx: [bond('ankh', 3), sched('u1_unknown', 1)] },
    ],
  },
  {
    id: 'u1_unknown', arc: 'whispers', channel: 'text', from: 'unknown', expires: 5, title: 'Unknown number', lapse: { fx: [f('ignored_unknown')], schedule: { node: 'x1_moves_on', days: 20 } },
    lines: [{ who: 'unknown', text: 'Stop asking about that song.' }],
    choices: [
      { id: 'who', label: 'Who is this?', tone: 'honest', fx: [f('replied_unknown'), rep('integrity', 1), sched('x1_moves_on', 25)] },
      { id: 'which', label: 'Which song?', tone: 'sly', fx: [f('replied_unknown'), sched('x1_moves_on', 25)] },
      { id: 'notmine', label: 'Not my problem. (Block the number.)', tone: 'quiet', fx: [f('walked_away_mystery'), sched('x1_moves_on', 20)] },
    ],
  },
  {
    id: 'x1_moves_on', arc: 'whispers', channel: 'text', from: 'static', expires: 8, title: 'Mama has gone quiet', lapse: { fx: [bond('static', -4)] },
    lines: [
      { who: 'static', text: "Bro. Weird one. Mama's been shutting the kitchen early. She doesn't hum anymore. I asked and she said I'm imagining things." },
      { who: 'static', text: "Some man in a suit has been eating at the back table three days running. Doesn't order. Just watches her.", if: { k: 'flag', id: 'replied_unknown' } },
      { who: 'static', text: "You've been quiet too. Everything alright?", if: { k: 'flag', id: 'walked_away_mystery' } },
    ],
    choices: [
      { id: 'come', label: "I'll come by tonight. Let me look.", tone: 'kind', fx: [bond('static', 4), bond('esi', 2), f('looked_after_esi')] },
      { id: 'busy', label: "She's probably tired. I'm swamped, chale.", tone: 'quiet', fx: [bond('static', -2), f('missed_esi_change')] },
    ],
  },
  // ambient humour & the way ordinary life rhymes with the plot
  {
    id: 'h1_car', arc: 'life', channel: 'text', from: 'mimi', expires: 6, title: 'You had one job', lapse: {},
    lines: [
      { who: 'mimi', text: "I'm told you spent your first real money on a car." },
      { who: 'you', text: 'The car is part of the job.' },
      { who: 'mimi', text: 'What job.' },
      { who: 'you', text: 'Looking successful.' },
      { who: 'mimi', text: "…I hate that this is going to work. Meet me for coffee. I'm paying, since you clearly can't." },
    ],
    choices: [
      { id: 'coffee', label: 'I accept. Bring a bigger car.', tone: 'sly', fx: [bond('mimi', 3), f('met_mimi_early')] },
      { id: 'later', label: 'Rain check. The car needs washing.', tone: 'quiet', fx: [bond('mimi', 0)] },
    ],
  },
  {
    id: 'h2_review', arc: 'life', channel: 'encounter', from: 'ankh', where: 'studio', expires: 6, title: 'The honest review', lapse: {},
    lines: [
      { who: 'ankh', text: 'I listened to the take.' },
      { who: 'you', text: 'And?' },
      { who: 'ankh', text: 'It was terrible.' },
      { who: 'you', text: "It wasn't that bad." },
      { who: 'ankh', text: 'You rhymed "money" with "money".' },
      { who: 'you', text: 'It was a statement.' },
      { who: 'ankh', text: 'It was a loop. Do it again. Differently.' },
    ],
    choices: [
      { id: 'again', label: 'Fine. Again. Differently.', tone: 'honest', fx: [bond('ankh', 3), rep('hustle', 1)] },
      { id: 'art', label: "It's an artistic choice, Ankh.", tone: 'sly', fx: [bond('ankh', 0), f('defended_money_rhyme')] },
    ],
  },
];

const any = (...c: import('../types').Cond[]) => ({ k: 'any', of: c } as const);
export const kjArc: Arc = {
  id: 'kj', title: 'The Shortcut', path: 'all', nodes: kj,
  triggers: [{ node: 'k1_broke', if: { k: 'day', min: 2 } }],
};
export const familyArc: Arc = {
  id: 'family', title: 'Home', path: 'all', nodes: family,
  triggers: [
    { node: 'f1_hobby', if: { k: 'day', min: 3 } },
    { node: 'f2_poster', if: { k: 'all', of: [{ k: 'day', min: 8 }, any({ k: 'stat', id: 'fame', min: 6 }, { k: 'stat', id: 'released', min: 1 })] } },
    { node: 'f3_home', if: { k: 'all', of: [{ k: 'done', node: 'f2_poster' }, { k: 'day', min: 60 }, any({ k: 'stat', id: 'fame', min: 25 }, { k: 'day', min: 120 })] } },
    { node: 'f4_low', if: { k: 'all', of: [{ k: 'day', min: 45 }, { k: 'stat', id: 'money', max: 150 }] } },
    { node: 'f5_heard', if: any({ k: 'done', node: 'r4_cypher' }, { k: 'done', node: 'p3_twice' }, { k: 'done', node: 'm2_coffee' }, { k: 'done', node: 's2_credit' }, { k: 'done', node: 'd3_footage' }, { k: 'done', node: 'j2_set' }) },
  ],
};
export const whispersArc: Arc = {
  id: 'whispers', title: 'The Song in the Air', path: 'all', nodes: world,
  triggers: [{ node: 'w1_billboard', if: { k: 'day', min: 5 } }],
};
export const lifeArc: Arc = {
  id: 'life', title: 'Everyday', path: 'all', nodes: [],
  triggers: [],
};
// the humour nodes live in `world` for simplicity; wire their triggers here
whispersArc.triggers.push(
  { node: 'h1_car', if: { k: 'all', of: [{ k: 'stat', id: 'money', min: 3000 }, { k: 'day', min: 10 }, { k: 'flag', id: 'kj_money' }] } },
  { node: 'h2_review', if: { k: 'all', of: [{ k: 'stat', id: 'songs', min: 1 }, { k: 'day', min: 9 }, { k: 'not', c: { k: 'flag', id: 'ankh_respects' } }] } },
);
