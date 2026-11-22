// STAGE 7c — Rapper Act II "The Price", the Adwoa romance, and Fiifi's thread.
import type { Arc, Cond, Effect, StoryNode } from '../types';

const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const rep = (axis: 'integrity' | 'hustle' | 'heart', v: number): Effect => ({ k: 'rep', axis, v });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral', kind: 'people' | 'money' | 'life' | 'beef' | 'career' | 'love' | 'music' = 'people', weight = 3): Effect => ({ k: 'memory', text, tone, kind, weight });
const flag = (id: string, v?: boolean): Cond => ({ k: 'flag', id, v });
const all = (...of: Cond[]): Cond => ({ k: 'all', of });
const any = (...of: Cond[]): Cond => ({ k: 'any', of });
const pathR: Cond = { k: 'path', is: 'rapper' };

// ── RAPPER · ACT II · THE PRICE ─────────────────────────────────────────────
const price: StoryNode[] = [
  {
    id: 'a1_remix', arc: 'price', channel: 'text', from: 'static', expires: 4, title: 'Have you heard it?',
    lapse: { fx: [bond('static', -3), f('remix_unheard')], schedule: { node: 'a2_streetteam', days: 1 } },
    lines: [
      { who: 'static', text: "They signed me. GCS. Efua herself shook my hand. My name is on a building lobby wall. A WALL." },
      { who: 'static', text: "First single drops Friday. It's called 'Akwaaba (Remix)'. You'll know the hook." },
      { who: 'static', text: "Mama doesn't know yet. Don't tell her. I'll tell her. Tell me you're happy for me. Even if you're lying." },
    ],
    choices: [
      { id: 'proud', label: "I'm proud of you. Truly.", tone: 'kind', fx: [bond('static', 4), f('static_signed_blessed'), sched('a2_streetteam', 1)] },
      { id: 'hook', label: 'That hook. Where did you get it again?', tone: 'sharp', fx: [bond('static', -2), f('asked_about_hook'), sched('a2_streetteam', 1)] },
      { id: 'quiet', label: "Congratulations. I'll listen Friday.", tone: 'quiet', fx: [bond('static', 0), sched('a2_streetteam', 1)] },
    ],
  },
  {
    id: 'a2_streetteam', arc: 'price', channel: 'encounter', from: 'efua', where: 'city', expires: 6, title: 'A very good coffee',
    lapse: { fx: [f('declined_street_team')], goto: undefined },
    lines: [
      { who: 'narr', text: 'A black car at the kerb. The back door opens. Efua Mensah-Quartey does not get out; she simply makes the pavement feel like her office.' },
      { who: 'efua', text: "{name}. I don't do cold approaches. I do warm ones. I've heard your Friday cypher verse four times. That is more than I've heard most of my catalogue." },
      { who: 'efua', text: "We're building a street team. Twelve voices who keep us honest. A stipend, a booth three nights a week, my phone number. In return you simply... don't release outside the family without telling us first." },
      { who: 'efua', text: 'It is a small deal. I like small deals. They are easier to keep.' },
    ],
    choices: [
      { id: 'sign', label: 'Sign. A booth and a stipend is a booth and a stipend.', tone: 'sly', fx: [{ k: 'money', v: 1500 }, f('street_team'), bond('efua', 6), bond('static', 1), rep('hustle', 3), rep('integrity', -2), mem('You joined Efua Mensah-Quartey\'s street team. Small deal. She likes those.', 'neutral', 'career'), sched('a3_cough', 5)] },
      { id: 'ask', label: 'Read me the clause about releasing. Slowly.', tone: 'honest', fx: [f('street_team_read'), bond('efua', 2), rep('integrity', 3), mem('You made Efua read the release clause aloud. She did. She noted that you asked.', 'neutral', 'career'), sched('a3_cough', 5)] },
      { id: 'no', label: "Thank you. I'll stay independent.", tone: 'quiet', fx: [f('independent'), bond('efua', -3), rep('integrity', 4), rep('hustle', -1), sched('a3_cough', 4)] },
    ],
  },
  {
    id: 'a3_cough', arc: 'price', channel: 'encounter', from: 'esi', where: 'kitchen', expires: 6, title: 'She sat down',
    lapse: { fx: [bond('esi', -3), f('mama_ill_ignored')], schedule: { node: 'a4_favour', days: 6 } },
    lines: [
      { who: 'narr', text: "Mama's Kitchen at four in the afternoon, which is the hour she never sits. She is sitting. A glass of water she hasn't touched." },
      { who: 'esi', text: "Don't. I'm tired, that is all. Women of my age are allowed to be tired." },
      { who: 'narr', text: "She hums to prove it, and halfway through the second line it breaks into a cough. She stops. She pretends she was only clearing her throat." },
      { who: 'esi', text: 'Sit with me while the rice finishes. Say nothing. It is the kindest thing a person can say.' },
    ],
    choices: [
      { id: 'clinic', label: "Mama. Get dressed. We're going to the clinic. I'm paying.", tone: 'kind', fx: [{ k: 'money', v: -400 }, bond('esi', 6), rep('heart', 5), f('mama_clinic'), mem('You took Mama Esi to the clinic and paid before she could argue. She argued anyway.', 'good', 'people'), sched('a4_favour', 6)] },
      { id: 'sit', label: 'Sit with her. Say nothing.', tone: 'quiet', fx: [bond('esi', 4), rep('heart', 2), f('sat_with_mama'), mem('You sat with Mama Esi in an empty kitchen and said nothing. It was the best thing you did all month.', 'good', 'people'), sched('a4_favour', 6)] },
      { id: 'busy', label: "I'll bring you tea. I have to run, I have a session.", tone: 'sly', fx: [bond('esi', -2), rep('hustle', 2), f('mama_ill_ignored'), sched('a4_favour', 6)] },
    ],
  },
  {
    id: 'a4_favour', arc: 'price', channel: 'call', from: 'efua', hours: [18, 23], expires: 2, title: 'Efua: a small favour',
    lapse: { fx: [bond('efua', -4), f('efua_unanswered')], schedule: { node: 'a5_reel9', days: 3 } },
    lines: [
      { who: 'efua', text: "{name}. I wouldn't call at this hour unless I trusted you with it." },
      { who: 'efua', text: "Afia Boakye has been asking questions about the original 'Akwaaba Tonight'. She's a child with a law degree and a dentist for a landlord, but she is persistent." },
      { who: 'efua', text: "If a young artist from the community signed a short statement — that the song's hook was Gold Coast Sound's original work, written in house, nothing to do with any kitchen — it would end her inquiry by Monday." },
      { who: 'efua', text: "$5,000. And a place on the lobby wall. Static's already signed his. Yours would sit next to his." },
    ],
    choices: [
      { id: 'sign', label: "Send me the statement. I'll sign.", tone: 'sly', fx: [{ k: 'money', v: 5000 }, f('betrayed_esi'), bond('efua', 8), bond('esi', -6), bond('static', -2), rep('integrity', -10), rep('hustle', 5), mem('You signed Efua\'s statement. It said the hook belonged to GCS. Mama Esi\'s name was not on it. $5,000.', 'bad', 'career', 5), sched('a5_reel9', 4)] },
      { id: 'record', label: "Let me think about it. (Keep this call recorded.)", tone: 'honest', fx: [f('efua_recorded'), rep('integrity', 2), rep('hustle', 2), mem('You kept Efua\'s call recorded. You don\'t know yet what it\'s for.', 'neutral', 'career', 4), sched('a5_reel9', 4)] },
      { id: 'refuse', label: 'No. And tell Afia I said hello.', tone: 'sharp', fx: [f('refused_efua'), bond('efua', -8), bond('afia', 6), rep('integrity', 8), mem('Efua offered you $5,000 and a place on the wall to bury Mama\'s story. You said no.', 'good', 'career', 5), sched('a5_reel9', 3)] },
    ],
  },
  {
    id: 'a5_reel9', arc: 'price', channel: 'encounter', from: 'ankh', where: 'studio', expires: 6, title: 'Reel 9',
    lapse: { fx: [f('reel9_unplayed')], schedule: { node: 'a6_static', days: 3 } },
    lines: [
      { who: 'narr', text: 'Studio 9, after midnight. Ankh is standing at the tape machine with his back to you, like a man at a grave.' },
      { who: 'ankh', text: "I have kept this for twenty-six years. I told myself it was because tape rots and I am a careful man. It was cowardice." },
      { who: 'narr', text: 'He threads a reel marked 9 in a hand you do not recognise. The machine breathes. Then a woman sings — thirty-three, hungry, hurt, brilliant. The same three notes and a little crack in the middle.' },
      { who: 'narr', text: 'You know that voice. You have eaten her stew every Friday of your life.' },
      { who: 'ankh', text: "Now you know. What you do with it is the only part that is still yours." },
    ],
    choices: [
      { id: 'copy', label: 'Ask him for a copy. Tonight.', tone: 'sly', fx: [f('has_reel9'), bond('ankh', 4), rep('hustle', 3), mem('Ankh played you Reel 9. You heard Mama Esi at thirty-three. You asked for a copy.', 'neutral', 'music', 5), sched('a6_static', 3)] },
      { id: 'mama', label: "Does Mama know you kept this?", tone: 'honest', fx: [f('reel9_heard'), bond('ankh', 2), bond('esi', 1), rep('integrity', 3), mem('Ankh played you Reel 9. You asked whether Mama knew he\'d kept it. He couldn\'t answer.', 'neutral', 'music', 5), sched('a6_static', 3)] },
      { id: 'stay', label: 'Play it again. Say nothing.', tone: 'quiet', fx: [f('reel9_heard'), bond('ankh', 5), rep('heart', 3), mem('You listened to Reel 9 three times in a row. Neither of you said a word.', 'neutral', 'music', 5), sched('a6_static', 3)] },
    ],
  },
  {
    id: 'a6_static', arc: 'price', channel: 'encounter', from: 'static', where: 'shows', expires: 7, title: 'The man with the wall',
    lapse: { fx: [bond('static', -4)], goto: undefined },
    lines: [
      { who: 'narr', text: 'The green room after a showcase. Static in a jacket you could have lived in for a year. He is laughing at something. He stops when he sees you.' },
      { who: 'static', text: "Come, sit. I've had a thousand people clap for me and the only face I was looking for in the dark was yours." },
      { who: 'static', text: "You signed the statement, didn't you?", if: flag('betrayed_esi') },
      { who: 'static', text: "Efua's people called me. They said you'd done something small and clever. They didn't say what. Tell me it's nothing.", if: flag('betrayed_esi') },
      { who: 'static', text: "Efua has a recording in her desk drawer of you. I've seen the label on it. Don't make me ask what's on it.", if: flag('efua_recorded') },
      { who: 'static', text: 'I know that hook was never mine. I heard Mama hum it one morning and I knew. I took it anyway. I have to live in that.', if: all(flag('betrayed_esi', false), flag('efua_recorded', false)) },
    ],
    choices: [
      { id: 'tell', label: 'Tell him everything — Reel 9, the hook, Mama.', tone: 'honest', if: any(flag('has_reel9'), flag('reel9_heard')), fx: [f('static_told'), bond('static', 4), rep('integrity', 6), rep('heart', 3), mem('You told Static the truth about the hook. He didn\'t speak for a long time.', 'neutral', 'people', 5), sched('a7_afia', 2)] },
      { id: 'admit', label: "Yes. I signed it. I'm sorry.", tone: 'honest', if: flag('betrayed_esi'), fx: [bond('static', -5), rep('integrity', 3), f('static_knows_betrayal'), mem('You admitted to Static you signed Efua\'s statement. He left without saying goodbye.', 'bad', 'beef', 5), sched('a7_afia', 2)] },
      { id: 'deny', label: "It's nothing. Business.", tone: 'sly', fx: [bond('static', -4), rep('integrity', -3), f('static_lied_to'), sched('a7_afia', 2)] },
      { id: 'hold', label: "Not yet. Soon. I promise.", tone: 'quiet', fx: [bond('static', -1), f('static_deferred'), sched('a7_afia', 2)] },
    ],
  },
  {
    id: 'a7_afia', arc: 'price', channel: 'letter', from: 'afia', expires: 10, title: 'A letter on dentist stationery',
    lapse: { fx: [f('ch2_done')] },
    lines: [
      { who: 'narr', text: "A letter on stationery that still has a toothbrush logo in the corner. The office she shares with a dentist." },
      { who: 'afia', text: "I'll be brief. Efua's lawyers have been calling me, which means I'm right. The 1999 copyright filing lists only a studio. It does not list a singer." },
      { who: 'afia', text: "I can make it official — but I need three things: the voice, the paper, and someone brave enough to say the voice is hers." },
      { who: 'afia', text: "You've been standing nearer to this than anyone. Come and see me. The dentist is out Thursday.", if: flag('betrayed_esi', false) },
      { who: 'afia', text: "I've heard you signed something for Efua. I'll understand if you don't want to see me. I would like you to anyway.", if: flag('betrayed_esi') },
    ],
    choices: [
      { id: 'in', label: "I'm in. Tell me what you need.", tone: 'kind', fx: [bond('afia', 6), rep('integrity', 4), f('with_afia'), f('ch2_done'), mem('Chapter 2 ended in a dentist\'s office. Afia needs a voice, a paper, and you.', 'good', 'career', 5), { k: 'end', arc: 'price', outcome: 'complete' }] },
      { id: 'wait', label: "Let me finish what I started first.", tone: 'sly', fx: [bond('afia', -2), f('ch2_done'), { k: 'end', arc: 'price', outcome: 'delayed' }] },
    ],
  },
];

// ── ADWOA · THE ONE WHO DOESN'T WANT A PIECE ───────────────────────────────
const adwoa: StoryNode[] = [
  {
    id: 'ad1_text', arc: 'adwoa', channel: 'text', from: 'adwoa', expires: 4, title: 'A verse, a hook, a coffee',
    lapse: { fx: [bond('adwoa', -1)], schedule: { node: 'ad2_dinner', days: 7 } },
    lines: [
      { who: 'adwoa', text: "Hi. This is Adwoa Sarpong. I know, I know — people pitch me daily. This isn't a pitch." },
      { who: 'adwoa', text: "I heard your verse on Radio K and I haven't stopped thinking about the second line. Coffee? I'll pay. I'll even pretend not to take notes." },
    ],
    choices: [
      { id: 'yes', label: "Coffee sounds good. I'll bring the second line.", tone: 'kind', fx: [bond('adwoa', 4), f('adwoa_coffee'), sched('ad2_dinner', 4)] },
      { id: 'cool', label: 'Sure. Tell me when.', tone: 'quiet', fx: [bond('adwoa', 2), sched('ad2_dinner', 5)] },
      { id: 'no', label: 'Busy this month. Maybe later.', tone: 'sharp', fx: [bond('adwoa', -2), sched('ad2_dinner', 10)] },
    ],
  },
  {
    id: 'ad2_dinner', arc: 'adwoa', channel: 'encounter', from: 'adwoa', where: 'city', hours: [17, 23], expires: 5, title: 'The place with the good light',
    lapse: { fx: [bond('adwoa', -3)], goto: undefined },
    lines: [
      { who: 'narr', text: 'A small place on a side street, fairy lights, plastic chairs, kenkey and fried fish so good the plates are clean before the talking starts.' },
      { who: 'adwoa', text: "Here is my problem. Everyone wants a piece. My manager. My cousin. A man named Kwesi who says he is my 'brand'." },
      { who: 'adwoa', text: "You haven't asked me for anything in twenty minutes. Either you're very good at this or you're someone I should keep." },
      { who: 'narr', text: 'She laughs at her own joke, then looks at you a beat too long.' },
    ],
    choices: [
      { id: 'honest', label: "I want a piece of nothing. Just a good song.", tone: 'honest', fx: [bond('adwoa', 6), f('adwoa_trust'), rep('heart', 2), mem('Dinner with Adwoa. You asked for nothing. She noticed.', 'good', 'love', 4), sched('ad3_clause', 10)] },
      { id: 'flirt', label: "Everyone wants a piece. I want the whole playlist.", tone: 'sly', fx: [bond('adwoa', 3), f('adwoa_flirt'), sched('ad3_clause', 10)] },
      { id: 'pitch', label: 'Actually — a feature would help me a lot.', tone: 'sharp', fx: [bond('adwoa', -3), rep('hustle', 3), f('adwoa_pitched'), sched('ad3_clause', 12)] },
    ],
  },
  {
    id: 'ad3_clause', arc: 'adwoa', channel: 'call', from: 'adwoa', hours: [21, 23], expires: 2, title: "Adwoa: can I show you something",
    lapse: { fx: [bond('adwoa', -4), f('adwoa_alone_with_clause')], schedule: { node: 'ad4_choice', days: 6 } },
    lines: [
      { who: 'adwoa', text: "Are you awake? I'm sorry. I didn't know who else to call that wouldn't tell Kwesi." },
      { who: 'adwoa', text: "GCS sent a contract. It's good. It's too good. On page eleven there's a sentence that gives them the rights to anything I write that 'derives from' their catalogue." },
      { who: 'adwoa', text: "I think it means 'Akwaaba Tonight'. I think they're buying the right to bury it forever. And I want to sign anyway, because it's my dream, and I hate that I want to." },
    ],
    choices: [
      { id: 'advise', label: "Don't sign yet. Show it to Afia Boakye first.", tone: 'kind', fx: [bond('adwoa', 6), bond('afia', 3), rep('integrity', 3), f('adwoa_to_afia'), sched('ad4_choice', 6)] },
      { id: 'sign', label: "It's your dream. You should sign.", tone: 'quiet', fx: [bond('adwoa', 2), rep('hustle', 1), f('adwoa_signed'), sched('ad4_choice', 6)] },
      { id: 'use', label: "Sign — then give me the page eleven copy.", tone: 'sly', fx: [bond('adwoa', -4), rep('integrity', -4), f('used_adwoa_clause'), sched('ad4_choice', 6)] },
    ],
  },
  {
    id: 'ad4_choice', arc: 'adwoa', channel: 'encounter', from: 'adwoa', where: 'city', expires: 6, title: "Where this goes",
    lapse: { fx: [bond('adwoa', -3)] },
    lines: [
      { who: 'narr', text: 'The seafront, nearly empty. She is holding her shoes and the wind is doing something to her hair that no stylist could plan.' },
      { who: 'adwoa', text: 'I have been very careful with people. I think I am tired of being careful.' },
      { who: 'adwoa', text: "So I'll just ask. Is this a thing — us — or are we a good song that happens to hold hands?" },
      { who: 'adwoa', text: "Before you answer, you should know I know what you did for Efua.", if: flag('betrayed_esi') },
    ],
    choices: [
      { id: 'love', label: "It's a thing. I'd like it to be a thing.", tone: 'kind', if: flag('used_adwoa_clause', false), fx: [bond('adwoa', 12), f('adwoa_love'), rep('heart', 5), mem('On an empty seafront Adwoa asked whether this was a thing. You said yes.', 'good', 'love', 5), { k: 'end', arc: 'adwoa', outcome: 'together' }] },
      { id: 'friend', label: "I care about you too much to risk the music.", tone: 'honest', fx: [bond('adwoa', 2), f('adwoa_friends'), mem('You and Adwoa chose to be a good song and nothing more.', 'neutral', 'love', 4), { k: 'end', arc: 'adwoa', outcome: 'friends' }] },
      { id: 'step', label: "I can't. Not with everything I'm carrying.", tone: 'quiet', fx: [bond('adwoa', -5), f('adwoa_apart'), mem('You told Adwoa you couldn\'t. She nodded and put her shoes on.', 'bad', 'love', 4), { k: 'end', arc: 'adwoa', outcome: 'apart' }] },
    ],
  },
];

// ── FIIFI · THE KID WHO WATCHES ────────────────────────────────────────────
const fiifi: StoryNode[] = [
  {
    id: 'fi1_gear', arc: 'fiifi', channel: 'encounter', from: 'fiifi', where: 'city', expires: 8, title: 'Let me carry that',
    lapse: { fx: [bond('fiifi', -1)], schedule: { node: 'fi2_sees', days: 12 } },
    lines: [
      { who: 'narr', text: 'A kid in a cap two sizes too big falls into step beside you and takes your bag before you can say no.' },
      { who: 'fiifi', text: "I'm Fiifi. I live behind Mama's. I carry gear. For free, for now. Later you can pay me in advice." },
      { who: 'fiifi', text: "Is it true you wrote the whole verse in one night? Static said you did. I told everyone you did." },
    ],
    choices: [
      { id: 'pay', label: 'Pay him. Fairly. And say thank you.', tone: 'kind', fx: [{ k: 'money', v: -40 }, bond('fiifi', 6), rep('heart', 2), f('fiifi_paid'), sched('fi2_sees', 14)] },
      { id: 'advice', label: "Advice: finish school. It's the real hook.", tone: 'honest', fx: [bond('fiifi', 3), f('fiifi_schooled'), sched('fi2_sees', 14)] },
      { id: 'free', label: 'Let him carry it. Free labour.', tone: 'sly', fx: [bond('fiifi', -2), rep('integrity', -2), f('fiifi_used'), sched('fi2_sees', 12)] },
    ],
  },
  {
    id: 'fi2_sees', arc: 'fiifi', channel: 'encounter', from: 'fiifi', where: 'kitchen', expires: 8, title: 'He saw',
    lapse: { fx: [bond('fiifi', -2)], schedule: { node: 'fi3_mirror', days: 20 } },
    lines: [
      { who: 'fiifi', text: "I wasn't listening. I was on the stairs. But you know the stairs are the only place in this building where sound goes up." },
      { who: 'fiifi', text: 'I heard what you did about the statement.', if: flag('betrayed_esi') },
      { who: 'fiifi', text: 'I heard what you said to Mama in the clinic line. Nobody ever says that to her.', if: any(flag('mama_clinic'), flag('sat_with_mama')) },
      { who: 'fiifi', text: "I heard you ignore Mama's cough. I don't think you meant it. But it was there.", if: flag('mama_ill_ignored') },
      { who: 'fiifi', text: "I'm not saying anything. I just want you to know someone is keeping a count." },
    ],
    choices: [
      { id: 'own', label: "Then count honestly. I'll try to deserve it.", tone: 'honest', fx: [bond('fiifi', 5), rep('integrity', 3), f('fiifi_respects'), sched('fi3_mirror', 20)] },
      { id: 'warn', label: "Don't repeat any of this. To anyone.", tone: 'sharp', fx: [bond('fiifi', -4), f('fiifi_warned'), sched('fi3_mirror', 20)] },
      { id: 'teach', label: 'Sit. Let me explain how it really works.', tone: 'kind', fx: [bond('fiifi', 3), f('fiifi_taught'), sched('fi3_mirror', 20)] },
    ],
  },
  {
    id: 'fi3_mirror', arc: 'fiifi', channel: 'text', from: 'fiifi', expires: 6, title: 'Fiifi: listen to this',
    lapse: { fx: [f('fiifi_unheard'), { k: 'end', arc: 'fiifi', outcome: 'unheard' }] },
    lines: [
      { who: 'fiifi', text: "I made a thing. It's not good. Do you want to hear it? I recorded it on my uncle's phone." },
      { who: 'narr', text: "The clip is thirty seconds. It's rough, a little off the beat — and it is unmistakably built from your cadence. Your pauses. The way you turn the last word of a line." },
      { who: 'fiifi', text: "I told the boys that's how you do it. Honest. Was I right?", if: any(flag('fiifi_respects'), flag('fiifi_taught')) },
      { who: 'fiifi', text: "I told the boys that's how you do it. You do it that way, right? Even when you're not telling the truth?", if: any(flag('betrayed_esi'), flag('fiifi_used')) },
    ],
    choices: [
      { id: 'real', label: "It's honest. Keep going — in your own voice.", tone: 'kind', fx: [bond('fiifi', 6), rep('heart', 4), f('fiifi_voice'), mem('Fiifi played you his first track. It sounded like you. You told him to find his own.', 'good', 'people', 5), { k: 'end', arc: 'fiifi', outcome: 'own-voice' }] },
      { id: 'copy', label: "Good. Do it exactly like me.", tone: 'sly', fx: [bond('fiifi', 2), rep('integrity', -2), f('fiifi_copy'), mem('Fiifi is turning into a smaller copy of you. You told him to.', 'neutral', 'people', 4), { k: 'end', arc: 'fiifi', outcome: 'copy' }] },
      { id: 'warn', label: "Don't be me. Be better than me.", tone: 'honest', fx: [bond('fiifi', 4), rep('integrity', 3), f('fiifi_warned_me'), { k: 'end', arc: 'fiifi', outcome: 'cautionary' }] },
    ],
  },
];

export const priceArc: Arc = {
  id: 'price', title: 'The Price', path: 'rapper', nodes: price,
  triggers: [{ node: 'a1_remix', if: all(pathR, flag('ch1_done'), { k: 'day', min: 25 }) }],
};
export const adwoaArc: Arc = {
  id: 'adwoa', title: 'The One Who Doesn\'t Want a Piece', path: 'all', nodes: adwoa,
  triggers: [{ node: 'ad1_text', if: all({ k: 'day', min: 30 }, any({ k: 'stat', id: 'fame', min: 10 }, { k: 'stat', id: 'released', min: 1 })) }],
};
export const fiifiArc: Arc = {
  id: 'fiifi', title: 'The Kid Who Watches', path: 'all', nodes: fiifi,
  triggers: [{ node: 'fi1_gear', if: { k: 'day', min: 20 } }],
};
