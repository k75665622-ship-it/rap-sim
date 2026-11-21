// ─── THE ACADEMY ───────────────────────────────────────────────────────────
// Real lessons on the tools you use in VOX and STUDIO PRO. Each lesson is a
// few paragraphs, a demo you can hear (on/off), and a three-question quiz.
// Pass every lesson in a course, then sit the exam for a certificate.
// Certificates change what you can do: VOX Certified sharpens your takes,
// PRO Certified sharpens your mixes. What's taught here is true to real
// audio work — it's meant to be learned.

export type CourseId = 'vox' | 'pro';
export type DemoKind = 'eq-low' | 'eq-high' | 'compress' | 'reverb' | 'delay';
export interface Question { q: string; options: string[]; answer: number; why: string }
export interface Lesson { id: string; course: CourseId; title: string; blurb: string; body: string[]; takeaway: string; demo?: { kind: DemoKind; off: string; on: string; listen: string }; quiz: Question[] }
export interface Course { id: CourseId; title: string; emoji: string; blurb: string; reward: string }
export interface AcademyState { lessons: Record<string, { best: number; at: number }>; certs: Partial<Record<CourseId, { score: number; total: number; at: number }>> }

export const COURSES: Course[] = [
  { id: 'vox', title: 'VOX: the vocal booth', emoji: '🎙️', blurb: 'Mic, timing, tuning and space — how to record a take that needs less fixing.', reward: 'VOX Certified: +3 on every take\'s quality score.' },
  { id: 'pro', title: 'STUDIO PRO: mixing', emoji: '🎛️', blurb: 'EQ, compression, de-essing, space and loudness — the tools on the desk and why they work.', reward: 'PRO Certified: +4 on every mix grade you print.' },
];

export const LESSONS: Lesson[] = [
  { id: 'vox-1', course: 'vox', title: 'Your mic and your headphones', blurb: 'Distance, volume and why the beat must stay in your ears.',
    body: ['Stay about a hand-span (10–15 cm) from the mic and a little off-centre, so your "p" and "b" sounds don\'t thump. Closer makes you warmer and louder; further makes you thinner and lets the room in.', 'Always rap with headphones. If the beat plays from speakers, the mic hears it too, and it ends up in your vocal where nobody can remove it.', 'Set your level so the loudest line fills most of the meter without touching the red. A clipped take is distorted for good; a quiet one can be turned up, but it brings the noise with it.'],
    takeaway: 'Hand-span from the mic, headphones on, loudest line just under red.',
    quiz: [
      { q: 'Why do you wear headphones when recording over a beat?', options: ['It makes you rap faster', 'So the beat doesn\'t leak into the mic and onto your vocal', 'The mic only works with headphones', 'It lowers the noise in the room'], answer: 1, why: 'Speakers leak into the mic; once the beat is baked into your vocal, it can\'t be separated.' },
      { q: 'Your take hit the red the whole time. What\'s the problem?', options: ['It\'s fine, loud is good', 'It clipped — distortion you can\'t fix later', 'The mic is too far', 'You need more reverb'], answer: 1, why: 'Clipping destroys the waveform. Record a little lower; you can always turn it up.' },
      { q: 'Your "p" and "b" sounds thump. What helps most?', options: ['Rap closer to the mic', 'Move slightly off-centre and back a hand-span', 'Add reverb', 'Turn the beat down'], answer: 1, why: 'Plosives are blasts of air; angling away and adding distance tames them.' },
    ] },
  { id: 'vox-2', course: 'vox', title: 'Finding the pocket', blurb: 'Timing against the beat, and what latency does to it.',
    body: ['The beat is a grid. Most rap lands on the 16th-note grid: four small steps in every beat. Hitting the same spot of the grid again and again is what "being in the pocket" means.', 'Latency is the delay between a sound happening and you hearing it — bluetooth headphones can add a quarter of a second. You rap on time to what you hear, so a late signal makes your vocal late. That\'s why the booth has a timing test, and why wired headphones feel tighter.', 'A little behind the beat feels laid-back; a little ahead feels urgent. Randomly wandering in both directions just sounds off.'],
    takeaway: 'Consistency beats perfection: land in the same spot of the grid every time, and test your latency.',
    quiz: [
      { q: 'What does "in the pocket" mean?', options: ['Rapping very quietly', 'Landing consistently in the same spot against the beat\'s grid', 'Rapping exactly on every kick drum', 'Using lots of effects'], answer: 1, why: 'Consistency, not rigid perfection, is what makes a flow feel locked in.' },
      { q: 'Your vocal always sounds late. Most likely cause?', options: ['Too much reverb', 'Output latency (often bluetooth)', 'The beat is too loud', 'The mic is too close'], answer: 1, why: 'You perform to what you hear; if it reaches you late, so does your vocal.' },
      { q: 'Rapping slightly behind the beat usually feels…', options: ['Broken', 'Laid-back and relaxed', 'Faster', 'Louder'], answer: 1, why: 'Consistent lay-back is a style choice; random drift is the problem.' },
    ] },
  { id: 'vox-3', course: 'vox', title: 'Pitch correction and the key', blurb: 'What auto-tune really does, and how much is too much.',
    body: ['Every beat has a key — a set of notes that sound right together. Pitch correction nudges each sung or rapped note to the nearest note in that key.', 'Amount decides how much it nudges. Snap (speed) decides how fast: slow is natural, instant is the robotic "T-Pain" sound. Rap with a little tune smooths drifting melodies; full-speed tune is a creative effect, not a repair.', 'Tuning can\'t fix timing or a weak performance, and a vocal tuned in the wrong key sounds worse than untuned. Always tune to the beat\'s key.'],
    takeaway: 'Tune to the beat\'s key; low amount to repair, instant snap as a style.',
    quiz: [
      { q: 'What does a fast "snap" setting do?', options: ['Makes the vocal quieter', 'Corrects pitch instantly — the robotic effect', 'Fixes timing', 'Adds reverb'], answer: 1, why: 'Fast snap jumps straight to the note, giving the hard-tune sound.' },
      { q: 'Which problem can pitch correction NOT fix?', options: ['A slightly flat note', 'Late timing', 'A drifting melody', 'A wobbly held note'], answer: 1, why: 'Pitch tools change notes, not when you rapped them.' },
      { q: 'The beat is in Cm but the tuner is set to another key. Result?', options: ['Sounds better', 'Notes get pulled to wrong pitches and sound worse', 'No change', 'Louder vocal'], answer: 1, why: 'Correction toward the wrong notes is worse than none.' },
    ] },
  { id: 'vox-4', course: 'vox', title: 'Reverb and echo', blurb: 'Making a room around your voice without drowning it.',
    body: ['Reverb is the sound of a space: a small amount makes a vocal feel real; a lot makes it feel far away and washy. Echo (delay) repeats words in time with the beat, so it adds bounce.', 'Echo works best on the ends of lines, in time with the tempo (1/8, 3/16, 1/4 notes). Too much echo fights the next line and hurts clarity.', 'A dry, upfront vocal is aggressive and intimate; a wet, spacious one is dreamy. Pick based on the song.'],
    takeaway: 'Space is a mood. More isn\'t better — clarity first.',
    demo: { kind: 'reverb', off: 'Dry', on: 'Big room', listen: 'Listen to the drums: with the room on, they sit further back and the beat gets washier.' },
    quiz: [
      { q: 'Too much reverb on a vocal makes it sound…', options: ['Closer and clearer', 'Distant and washy', 'Louder', 'Higher'], answer: 1, why: 'Reverb places a sound further away in a space.' },
      { q: 'Why sync echo to the tempo?', options: ['It looks neater', 'The repeats land on the beat and add bounce instead of mess', 'It makes it louder', 'It removes noise'], answer: 1, why: 'Tempo-synced repeats fall in the groove.' },
      { q: 'You want an aggressive, upfront vocal. Choose:', options: ['Lots of reverb', 'Little reverb, dry and close', 'Maximum echo', 'Lo-fi filter'], answer: 1, why: 'Dry sounds close and in-your-face.' },
    ] },
  { id: 'pro-1', course: 'pro', title: 'EQ: shaping tone', blurb: 'Cut mud, add presence, keep it open.',
    body: ['An equaliser turns frequency regions up or down. Low (below ~200 Hz) is weight and boom, low-mids (200–500 Hz) is "mud", mids around 2–4 kHz carry presence and intelligibility, and highs above ~8 kHz are air and shine.', 'Rule of thumb: cut before you boost. A harsh or muddy vocal is usually fixed by cutting what is wrong, not by boosting what is missing. High-pass filters remove rumble you can\'t even hear but that eats headroom.', 'Make space: if the 808 owns the low end, don\'t also push bass on the vocal. Every element needs its own spot.'],
    takeaway: 'Cut mud (200–500 Hz) before boosting; give each sound its own space.',
    demo: { kind: 'eq-low', off: 'Flat', on: 'Bass +9 dB', listen: 'With bass boosted, the low end swells and the track gets boomy and less clear.' },
    quiz: [
      { q: 'A vocal sounds "boxy" and muddy. Where do you look first?', options: ['Boost 10 kHz', 'Cut around 200–500 Hz', 'Add reverb', 'Raise the level'], answer: 1, why: 'Mud lives in the low-mids; cutting there clears the sound.' },
      { q: 'What does a high-pass filter on a vocal remove?', options: ['Sibilance', 'Low rumble below the voice', 'Reverb', 'Presence'], answer: 1, why: 'It cuts frequencies below a point — rumble, plosive thumps.' },
      { q: 'Presence and clarity of a voice live mostly in:', options: ['Sub bass (<60 Hz)', 'The 2–4 kHz mids', 'Above 18 kHz', 'Only in the reverb'], answer: 1, why: 'The ear is most sensitive around 2–4 kHz, where speech is understood.' },
    ] },
  { id: 'pro-2', course: 'pro', title: 'Compression', blurb: 'Control volume swings and add punch.',
    body: ['A compressor turns loud parts down so quiet and loud parts sit closer together. Threshold is where it starts working; ratio is how hard it presses down; attack and release set how fast it grabs and lets go.', 'Used lightly it evens a vocal so every word can be heard. Used heavily it adds punch and energy but can sound squashed and tiring, and it raises the noise floor.', 'After compressing you usually turn the level back up (make-up gain). The danger: louder always sounds better, so A/B at the same loudness or you\'ll fool yourself.'],
    takeaway: 'Compress to even things out, not to flatten them. Match loudness when comparing.',
    demo: { kind: 'compress', off: 'No compression', on: 'Heavy compression', listen: 'Hear the beat get denser and flatter; the drum hits lose their natural jump.' },
    quiz: [
      { q: 'What does a compressor do?', options: ['Adds high frequencies', 'Reduces the gap between loud and quiet parts', 'Adds echo', 'Corrects pitch'], answer: 1, why: 'It lowers peaks, narrowing dynamic range.' },
      { q: 'A higher ratio means…', options: ['Gentler squeeze', 'Harder squeeze above the threshold', 'Slower release', 'More reverb'], answer: 1, why: 'Ratio is how much the level is reduced above the threshold.' },
      { q: 'Why can compression fool you when comparing?', options: ['It adds pitch', 'It makes things louder, and louder sounds better', 'It changes the key', 'It slows the track'], answer: 1, why: 'Level-match when you A/B or you\'ll pick the louder one, not the better one.' },
    ] },
  { id: 'pro-3', course: 'pro', title: 'De-essing and noise', blurb: 'Tame harsh S sounds and clean the background.',
    body: ['Sibilance is the sharp hiss of "s", "sh" and "t" sounds, mostly around 5–8 kHz. Compression and bright EQ make it worse. A de-esser dips only those frequencies when they spike, so the vocal stays bright but never piercing.', 'Noise comes from fans, hiss and rumble. Cut rumble with a high-pass, soften hiss with a high-shelf cut, and — best — record in a quiet room. Heavy noise reduction makes a vocal dull and watery.', 'Fix problems at the source first: re-recording a noisy take beats any processing.'],
    takeaway: 'De-ess after compression; clean noise gently — or re-record.',
    quiz: [
      { q: 'Where does harsh sibilance mostly live?', options: ['Below 100 Hz', 'Around 5–8 kHz', 'Around 300 Hz', 'Above 20 kHz'], answer: 1, why: 'The "ess" hiss is in the upper mids and highs.' },
      { q: 'Why is heavy noise reduction risky?', options: ['It adds echo', 'It can make the vocal dull and watery', 'It changes the key', 'It makes it louder'], answer: 1, why: 'Strong cleanup removes real detail along with noise.' },
      { q: 'Best first fix for a noisy take?', options: ['More compression', 'Re-record in a quieter spot', 'Add reverb', 'Raise the beat'], answer: 1, why: 'The source is always the best place to fix noise.' },
    ] },
  { id: 'pro-4', course: 'pro', title: 'Space and depth: sends', blurb: 'Reverb and delay as sends, and front-to-back placement.',
    body: ['Instead of putting reverb on a track, a send feeds a copy to a shared effect and blends it back. You control how much "room" each sound gets, and one reverb glues the whole mix.', 'Depth is made with level, brightness and reverb: close sounds are loud, bright and dry; far sounds are quieter, duller and wetter. A lead vocal stays dry-ish and upfront; backing vocals and ad-libs sit behind it with more space.', 'Pan places sounds left to right. The lead stays centred, doubles and ad-libs can spread wide.'],
    takeaway: 'Lead dry and centred; support wet and wide. Use sends to glue.',
    demo: { kind: 'delay', off: 'Dry', on: 'Echo send', listen: 'The echo fills the gaps between hits — fun, but it can crowd a vocal.' },
    quiz: [
      { q: 'Why use a send instead of reverb on every track?', options: ['It\'s louder', 'You control the amount per track and one reverb glues the mix', 'It removes noise', 'It tunes the vocal'], answer: 1, why: 'Sends give consistent space and easy control.' },
      { q: 'To push a vocal further back in the mix:', options: ['Make it brighter and louder', 'Make it quieter, a little duller and wetter', 'Pan it hard left', 'Add pitch correction'], answer: 1, why: 'Distance sounds quieter, duller and more reverberant.' },
      { q: 'Where should the lead vocal usually sit?', options: ['Hard left', 'Centre, upfront', 'Hard right', 'Anywhere'], answer: 1, why: 'The focus of the song anchors the centre.' },
    ] },
  { id: 'pro-5', course: 'pro', title: 'Loudness and mastering', blurb: 'Targets, peaks, and why louder isn\'t better.',
    body: ['Streaming platforms play everything at a similar loudness (roughly −14 LUFS), turning loud tracks down. Squashing a song to be as loud as possible just costs punch; it won\'t play louder than a well-balanced one.', 'Peaks must stay under 0 dBFS or the audio clips and distorts. A limiter at the end of the chain catches peaks so you can raise the average level safely; leave a little headroom (around −1 dB).', 'Mastering is the final polish: gentle EQ, glue compression, limiting. It can\'t fix a bad mix — fix the mix first.'],
    takeaway: 'Aim around −14 LUFS, keep peaks under 0 dBFS, fix the mix before mastering.',
    quiz: [
      { q: 'A track hits +2 dBFS peaks. What happens?', options: ['It sounds bigger', 'It clips and distorts', 'It turns blue', 'Nothing'], answer: 1, why: 'Digital audio can\'t exceed 0 dBFS; anything above is clipped.' },
      { q: 'Why not just master as loud as possible?', options: ['Platforms turn loud tracks down, and you lose punch', 'It\'s illegal', 'It changes the key', 'It adds noise'], answer: 0, why: 'Loudness normalisation makes the extra squash pointless.' },
      { q: 'Mastering can mainly…', options: ['Rescue any bad mix', 'Polish a good mix', 'Replace recording', 'Fix timing'], answer: 1, why: 'It\'s a finishing step, not a repair shop.' },
    ] },
];

export const lessonsOf = (c: CourseId) => LESSONS.filter((l) => l.course === c);
export const emptyAcademy = (): AcademyState => ({ lessons: {}, certs: {} });
export const examPass = 0.8;

/** Six questions from across the course, in a repeatable order for the day. */
export function examQuestions(course: CourseId, seed: number): Question[] {
  const all = lessonsOf(course).flatMap((l) => l.quiz);
  const arr = [...all];
  let a = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, 6);
}

// A tutor that answers from what's taught here. Real AI tutoring can plug in later (see ai/bridge.ts).
const TUTOR: { keys: string[]; answer: string; lesson: string }[] = [
  { keys: ['compress', 'ratio', 'threshold', 'punch'], answer: 'A compressor reduces the gap between loud and quiet parts. Start with a gentle ratio (2:1–3:1), pull the threshold down until it grabs only the loudest words, then add make-up gain. Level-match when comparing or the louder one will always seem better.', lesson: 'pro-2' },
  { keys: ['eq', 'mud', 'muddy', 'boxy', 'bass', 'frequency', 'frequencies'], answer: 'Cut before you boost. Mud lives around 200–500 Hz, presence around 2–4 kHz, air above 8 kHz. High-pass the vocal to drop rumble, and let the 808 own the low end.', lesson: 'pro-1' },
  { keys: ['s sound', 'sibil', 'harsh', 'deess', 'de-ess', 'esses'], answer: 'Sibilance sits around 5–8 kHz. Use the de-esser after compression and just enough to tame the spikes — too much and you get a lisp.', lesson: 'pro-3' },
  { keys: ['noise', 'hiss', 'rumble', 'fan'], answer: 'Fix it at the source: a quieter room or re-record. Then cut rumble with a high-pass and soften hiss gently. Heavy noise reduction makes vocals watery.', lesson: 'pro-3' },
  { keys: ['loud', 'lufs', 'master', 'clip', 'peak', 'limiter'], answer: 'Aim for roughly −14 LUFS and keep peaks under 0 dBFS (around −1 is safe). Louder isn\'t better — platforms turn loud tracks down. Fix the mix before mastering.', lesson: 'pro-5' },
  { keys: ['reverb', 'echo', 'delay', 'room', 'send', 'depth'], answer: 'Reverb places a sound in a space; delay repeats it in time with the beat. Keep the lead vocal fairly dry and centred and put backing vocals wetter and wider. Use sends so one reverb glues the mix.', lesson: 'pro-4' },
  { keys: ['tune', 'autotune', 'auto-tune', 'pitch', 'key', 'snap'], answer: 'Pitch correction pulls notes to the nearest note in the beat\'s key. Low amount and slow snap is natural repair; full amount with instant snap is a style. It can\'t fix timing.', lesson: 'vox-3' },
  { keys: ['late', 'timing', 'pocket', 'latency', 'bluetooth', 'off beat', 'offbeat'], answer: 'Run the timing test in 🎧 Setup. Bluetooth adds a lot of delay; wired headphones feel tighter. Consistency matters more than perfection — be in the same spot of the grid every bar.', lesson: 'vox-2' },
  { keys: ['mic', 'headphone', 'distance', 'pop', 'plosive', 'level', 'red'], answer: 'Stay a hand-span from the mic, slightly off-centre, headphones on, and keep your loudest line just under red. Clipping can\'t be repaired.', lesson: 'vox-1' },
];
export function askTutor(q: string): { answer: string; lesson?: string } {
  const t = q.toLowerCase();
  const hit = TUTOR.find((x) => x.keys.some((k) => t.includes(k)));
  return hit ? { answer: hit.answer, lesson: hit.lesson } : { answer: 'Good question. Try asking about compression, EQ, mud, de-essing, noise, reverb, delay, tuning, timing, loudness or your mic — or open a lesson and I\'ll walk you through it.' };
}
