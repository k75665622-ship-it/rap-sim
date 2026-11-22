// STAGE 7d — The Night of Akwaaba. The shared finale, every seat, every ending.
import type { Arc, Cond, Effect, StoryNode } from '../types';

const f = (id: string, v: boolean | number | string = true): Effect => ({ k: 'flag', id, v });
const bond = (who: string, v: number): Effect => ({ k: 'bond', who, v });
const sched = (node: string, days: number): Effect => ({ k: 'schedule', node, days });
const rep = (axis: 'integrity' | 'hustle' | 'heart', v: number): Effect => ({ k: 'rep', axis, v });
const mem = (text: string, tone: 'good' | 'bad' | 'neutral' = 'neutral', kind: 'people' | 'money' | 'life' | 'beef' | 'career' | 'love' | 'music' = 'people', weight = 5): Effect => ({ k: 'memory', text, tone, kind, weight });
const flag = (id: string, v?: boolean): Cond => ({ k: 'flag', id, v });
const all = (...of: Cond[]): Cond => ({ k: 'all', of });
const any = (...of: Cond[]): Cond => ({ k: 'any', of });
const no = (c: Cond): Cond => ({ k: 'not', c });
const proof = any(flag('has_reel9'), flag('reel9_heard'), flag('with_afia'), flag('efua_recorded'), flag('knows_moses_link'));

const nodes: StoryNode[] = [
  {
    id: 'g1_invite', arc: 'gala', channel: 'letter', from: 'efua', expires: 12, title: 'Gold Coast Sound requests the pleasure',
    lapse: { fx: [f('gala_ignored_invite')], schedule: { node: 'g2_eve', days: 10 } },
    lines: [
      { who: 'narr', text: 'Cream card, gold edge. It smells faintly of a very expensive room.' },
      { who: 'efua', text: "Twenty-five years of 'Akwaaba Tonight'. The Independence Arch Arena. One night, one remix, one very special voice. Black tie. You are on the list because I put you on it." },
      { who: 'efua', text: "P.S. Bring no one who does not need to be there. — E.M.-Q." },
    ],
    choices: [
      { id: 'go', label: "RSVP: yes.", tone: 'quiet', fx: [f('gala_rsvp'), sched('g2_eve', 10)] },
      { id: 'bring', label: "RSVP: yes. And I'm bringing the whole kitchen.", tone: 'sharp', fx: [f('gala_rsvp'), f('bringing_kitchen'), bond('efua', -3), bond('esi', 2), sched('g2_eve', 10)] },
      { id: 'no', label: 'Throw it in the drawer.', tone: 'sly', fx: [f('gala_ignored_invite'), sched('g2_eve', 11)] },
    ],
  },
  {
    id: 'g2_eve', arc: 'gala', channel: 'encounter', from: 'esi', where: 'kitchen', expires: 8, title: 'The night before',
    lapse: { fx: [bond('esi', -3), f('esi_alone_eve')], schedule: { node: 'g3_backstage', days: 1 } },
    lines: [
      { who: 'narr', text: "Mama's Kitchen, closed early for the first time anyone can remember. A single pot on the fire. She has put out two bowls and is pretending one of them is not for you." },
      { who: 'esi', text: "Efua's people sent a dress. I am not going to wear a stranger's dress to sit in a stranger's arena and listen to another woman sing my song." },
      { who: 'esi', text: "You know. I can see it. It is in how you stand — like a boy holding a hot plate." },
      { who: 'narr', text: 'She turns off the radio at the wall. For once, nobody objects.' },
    ],
    choices: [
      { id: 'tell', label: "Mama. I heard Reel 9. I know it's you.", tone: 'honest', if: proof, fx: [f('esi_knows'), bond('esi', 6), rep('integrity', 4), mem("The night before the gala you told Mama Esi you'd heard Reel 9. She put down her spoon and said \"then eat first.\"", 'neutral', 'people'), sched('g3_backstage', 1)] },
      { id: 'ask', label: "Come with me tomorrow. Just sit. I'll be beside you.", tone: 'kind', fx: [f('esi_invited'), bond('esi', 5), rep('heart', 4), mem('You asked Mama Esi to come to the gala and sit beside you.', 'good', 'people'), sched('g3_backstage', 1)] },
      { id: 'quiet', label: 'Eat. Say nothing.', tone: 'quiet', fx: [bond('esi', 3), rep('heart', 2), f('ate_with_esi'), sched('g3_backstage', 1)] },
      { id: 'leave', label: "I can't stay. Early start.", tone: 'sly', fx: [bond('esi', -4), rep('heart', -3), f('left_mama_eve'), sched('g3_backstage', 1)] },
    ],
  },
  {
    id: 'g3_backstage', arc: 'gala', channel: 'encounter', from: 'static', where: 'shows', expires: 6, title: 'Backstage, Independence Arch Arena',
    lapse: { fx: [f('gala_missed')], goto: 'g5_room' },
    lines: [
      { who: 'narr', text: "Black marble, gold light, forty thousand seats filling like a tide. Backstage is a corridor of people who know exactly who they are, and you, with a lanyard." },
      { who: 'static', text: "I rehearsed this. Efua gave me a script. I memorised it and I hate every word. Tell me what you know, now, before I walk out there and say it.", if: any(flag('static_told'), flag('static_deferred')) },
      { who: 'static', text: "You and I have not spoken since the green room. I want to say I'm sorry. I want you to say it back. I don't know which of us is the worse man.", if: any(flag('static_knows_betrayal'), flag('static_lied_to')) },
      { who: 'static', text: "Big night, brother. Whatever happens, you were always the better writer. I just had the louder speakers.", if: no(any(flag('static_told'), flag('static_deferred'), flag('static_knows_betrayal'), flag('static_lied_to'))) },
      { who: 'ankh', text: "I'll be at the desk. If you want a mic cut, a tape rolled, or a silence held — you only need to look at me." },
      { who: 'afia', text: "I have the filing in my bag. It is dated and notarised. It needs a voice and a witness. I'm not allowed to hold either.", if: flag('with_afia') },
      { who: 'esi', text: "I came. Do not look at me like that. I walked in by the kitchen door like I own it. I do.", if: any(flag('esi_invited'), flag('bringing_kitchen')) },
      { who: 'narr', text: "Lady Zee passes you in the corridor in a dress made of light. She stops. 'I sang it for months,' she says. 'Nobody told me it had a mother.'" },
    ],
    choices: [
      { id: 'esi', label: 'Plan: Mama Esi walks onstage.', tone: 'kind', fx: [f('stage_esi'), bond('esi', 3)], goto: 'g4_speaks' },
      { id: 'me', label: 'Plan: I walk out and say it myself.', tone: 'sharp', fx: [f('stage_me'), rep('hustle', 2)], goto: 'g4_speaks' },
      { id: 'zee', label: 'Plan: Lady Zee gives up the mic.', tone: 'honest', fx: [f('stage_zee'), bond('efua', -3)], goto: 'g4_speaks' },
      { id: 'static', label: 'Plan: Static says it, in his own voice.', tone: 'honest', fx: [f('stage_static'), bond('static', 4)], goto: 'g4_speaks' },
      { id: 'none', label: 'Plan: nobody. I take my seat.', tone: 'quiet', fx: [f('stage_none'), rep('integrity', 1)], goto: 'g4_speaks' },
    ],
  },
  {
    id: 'g4_speaks', arc: 'gala', channel: 'scene', from: 'efua', expires: 1, title: 'Who speaks first',
    lapse: { fx: [f('first_efua')], goto: 'g5_room' },
    lines: [
      { who: 'narr', text: "Efua is at the lectern. The whole arena breathes as one animal. She says: 'Twenty-five years ago a song changed this city. Tonight, it comes home.'" },
      { who: 'narr', text: "Then she hesitates. It is the first time you've seen her hesitate. Her eyes find yours and you understand she's waiting for you to decide what this night is." },
    ],
    choices: [
      { id: 'efua', label: 'Let Efua go first. See what she does.', tone: 'quiet', fx: [f('first_efua'), bond('efua', 3)], goto: 'g5_room' },
      { id: 'me', label: 'Stand. Say it aloud, from your seat.', tone: 'sharp', if: proof, fx: [f('first_me'), rep('integrity', 5), rep('hustle', 3), bond('efua', -6)], goto: 'g5_room' },
      { id: 'ankh', label: 'Nod to Ankh at the desk. Let the tape speak.', tone: 'honest', if: any(flag('has_reel9'), flag('reel9_heard')), fx: [f('first_ankh'), bond('ankh', 6)], goto: 'g5_room' },
      { id: 'static', label: 'Look at Static. He knows what he has to do.', tone: 'sly', if: no(flag('static_lied_to')), fx: [f('first_static'), bond('static', 4)], goto: 'g5_room' },
    ],
  },
  {
    id: 'g5_room', arc: 'gala', channel: 'scene', from: 'esi', expires: 1, title: 'What the room does',
    lapse: { fx: [f('room_silent')], goto: 'g6_verdict' },
    lines: [
      { who: 'narr', text: 'Forty thousand people on their feet, half of them already holding phones up like candles. Lady Zee waits at the mark. The first note of the remix lingers on the air.' },
      { who: 'narr', text: 'On the screens: a photograph, black and white, of a woman in a studio in 1999, mouth open mid-note.', if: flag('first_ankh') },
      { who: 'narr', text: 'Mama Esi is on the stairs at the side of the stage. She has not yet decided. Her hand is on the rail. Her knuckles are pale.', if: flag('stage_esi') },
      { who: 'narr', text: "Static is at the mic. His voice, unscripted and shaking: 'The hook was never mine.'", if: any(flag('first_static'), flag('stage_static')) },
      { who: 'narr', text: 'You stand. A spotlight finds you, not because anyone planned it but because someone at the desk is looking at you.', if: any(flag('first_me'), flag('stage_me')) },
    ],
    choices: [
      { id: 'sing', label: 'Let the song be sung. By whoever it belongs to.', tone: 'kind', fx: [f('room_listens'), rep('heart', 3)], goto: 'g6_verdict' },
      { id: 'say', label: 'Say the name. Esi Armah. Out loud.', tone: 'honest', if: proof, fx: [f('room_named'), rep('integrity', 5)], goto: 'g6_verdict' },
      { id: 'walk', label: 'Walk out. Let it be their problem.', tone: 'quiet', fx: [f('room_walked'), rep('hustle', 2), rep('integrity', -3)], goto: 'g6_verdict' },
    ],
  },
  {
    id: 'g6_verdict', arc: 'gala', channel: 'scene', from: 'esi', expires: 1, title: 'The verdict of the night',
    lapse: { fx: [f('gala_done')], goto: 'g7_portrait' },
    lines: [
      { who: 'narr', text: 'There is a moment, in every night that matters, where the story you meant to tell and the story that happened come apart like two hands letting go.' },
      { who: 'narr', text: 'Mama Esi walks out into the light. A hush. The whole arena can hear her breathing. Then she sings the first line — thirty-three years of silence, in a voice that has only gotten better — and a woman in the front row starts to cry.', if: all(flag('stage_esi'), any(flag('esi_knows'), flag('esi_invited'), flag('ate_with_esi'))) },
      { who: 'narr', text: 'Mama Esi does not come out. The stage is quiet. Lady Zee finishes the song; it is perfectly sung and nobody believes it. Mama watches from the wings, not forgiving, not unforgiving, her hand over her mouth.', if: all(flag('stage_esi'), any(flag('left_mama_eve'), flag('esi_alone_eve'))) },
      { who: 'narr', text: 'The tape plays. Her voice fills the arena from 1999. Ten thousand people go perfectly still. Efua watches her own life work hum through the speakers with no expression at all.', if: flag('first_ankh') },
      { who: 'narr', text: "You hear yourself say the name. It lands with a sound like a door. Efua's face does something you will remember for years — a flicker of relief.", if: flag('room_named') },
      { who: 'narr', text: 'You are in the car park before you realise you have walked out. Behind you, through the concrete, a crowd is singing a song that is not theirs.', if: flag('room_walked') },
    ],
    choices: [
      { id: 'voice', label: 'It was enough. She was heard.', tone: 'kind', if: all(flag('stage_esi'), any(flag('esi_knows'), flag('esi_invited'), flag('ate_with_esi'))), fx: [f('end_voice'), bond('esi', 10), mem('You stood in the dark while Mama Esi sang the song that was hers. Nobody cheered. They wept.', 'good', 'music')], goto: 'g7_portrait' },
      { id: 'rivals', label: 'Static and I will have to settle this properly.', tone: 'sharp', if: any(flag('static_knows_betrayal'), flag('static_lied_to'), flag('asked_about_hook')), fx: [f('end_rivals'), bond('static', -4), mem('The gala ended with Static and you on opposite sides of a truth neither could carry alone.', 'bad', 'beef')], goto: 'g7_portrait' },
      { id: 'loss', label: "Mama didn't make it to the stage.", tone: 'quiet', if: all(flag('mama_ill_ignored'), no(flag('mama_clinic')), no(flag('sat_with_mama'))), fx: [f('end_loss'), bond('esi', -10), rep('heart', -6), mem("Mama Esi collapsed in her kitchen two days after the gala. She could still hum. She never again got a line out.", 'bad', 'life')], goto: 'g7_portrait' },
      { id: 'quiet', label: 'Walk home. Keep the tape. Keep the truth.', tone: 'quiet', if: any(flag('stage_none'), flag('room_walked')), fx: [f('end_quiet'), rep('integrity', 3), mem('You kept the truth and walked home through the quiet streets, and the stars were out.', 'neutral', 'life')], goto: 'g7_portrait' },
      { id: 'mixed', label: 'Neither triumph nor ruin. Just the next morning.', tone: 'honest', fx: [f('end_mixed')], goto: 'g7_portrait' },
    ],
  },
  {
    id: 'g7_portrait', arc: 'gala', channel: 'scene', from: 'esi', expires: 1, title: 'What kind of person you became',
    lapse: { fx: [f('gala_done')] },
    lines: [
      { who: 'narr', text: "A week later, sitting on the stairs behind Mama's, you add it up. Not the money. Not the fame. What you did, when it was your turn." },
      { who: 'narr', text: "You are THE KEEPER. You carried the truth even when it cost you, and the people who needed it knew they could lean on you.", if: { k: 'rep', axis: 'integrity', min: 12 } },
      { who: 'narr', text: 'You are THE CLOSER. You won — and the people behind you know exactly how.', if: all({ k: 'rep', axis: 'hustle', min: 10 }, { k: 'rep', axis: 'integrity', max: 11 }) },
      { who: 'narr', text: 'You are THE HEART. You rebuilt what the label broke, one plate at a time.', if: all({ k: 'rep', axis: 'heart', min: 10 }, { k: 'rep', axis: 'integrity', max: 11 }) },
      { who: 'narr', text: 'You are THE MIRROR. Depending on who you ask, you were a saint or a snake — and both of them have a story to prove it.', if: all({ k: 'rep', axis: 'integrity', max: 11 }, { k: 'rep', axis: 'hustle', max: 9 }, { k: 'rep', axis: 'heart', max: 9 }) },
      { who: 'narr', text: 'You are THE GHOST. The mystery walked past you and you let it. The world moved on without you, and honestly, it looks fine.', if: any(flag('x1_moves_on'), flag('moves_on')) },
      { who: 'narr', text: "KJ's text, at 3 a.m.: 'You were on the news. I watched with my chain on.'", if: any(flag('kj_money'), flag('kj_loan')) },
      { who: 'narr', text: "Mum's voicemail, nine seconds. She doesn't say anything. She just hums the second verse.", if: { k: 'done', node: 'f5_heard' } },
    ],
    choices: [
      { id: 'on', label: "Close the door on it. The city's still out there.", tone: 'quiet', fx: [f('gala_done'), sched('g8_after', 14), { k: 'end', arc: 'gala', outcome: 'complete' }, mem('The Night of Akwaaba ended. The city did not.', 'neutral', 'life')] },
    ],
  },
  {
    id: 'g8_after', arc: 'gala', channel: 'text', from: 'efua', expires: 20, title: 'Efua: Monday',
    lapse: { fx: [f('after_gala')] },
    lines: [
      { who: 'efua', text: "The board met this morning. I won't call it a verdict; boards do not give verdicts, they give minutes." },
      { who: 'efua', text: "Gold Coast Sound is relicensing the song. Fully credited. Fully paid. Mama Esi's name is on the paper. I wrote it myself.", if: any(flag('end_voice'), flag('room_named'), flag('first_ankh')) },
      { who: 'efua', text: "The board is considering selling Gold Coast Sound. Whoever buys it will have the catalogue and none of the history. I am sorry.", if: any(flag('end_quiet'), flag('end_mixed'), flag('end_rivals')) },
      { who: 'efua', text: "Mama's Kitchen is on a list now. 'Heritage site'. She hates it. Come for lunch before they put a plaque up.", if: flag('end_loss') },
      { who: 'efua', text: "Whatever you do next, I would rather have you with me than against me. That is not a threat. It's the nearest thing to a compliment I give." },
    ],
    choices: [
      { id: 'next', label: "Understood. Let's see what's next.", tone: 'quiet', fx: [f('after_gala'), mem('Monday after the gala. Efua called. The world was still there.', 'neutral', 'career', 3)] },
    ],
  },
];

export const galaArc: Arc = {
  id: 'gala', title: 'The Night of Akwaaba', path: 'all', nodes,
  triggers: [{ node: 'g1_invite', if: any(all(flag('ch2_done'), { k: 'day', min: 90 }), { k: 'day', min: 220 }) }],
};
