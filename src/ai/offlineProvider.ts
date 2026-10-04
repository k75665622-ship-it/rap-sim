// Offline AI Provider — always works, no API key needed
// Returns templated responses based on NPC personality and relationship score

import type { NPC } from '../types/game';

export type AIResponse = {
  text: string;
  relationshipChange: number;
};

type RelationshipBracket = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

function getRelBracket(score: number): RelationshipBracket {
  if (score <= -60) return 'very_negative';
  if (score <= -20) return 'negative';
  if (score <= 20) return 'neutral';
  if (score <= 60) return 'positive';
  return 'very_positive';
}

// Template pools
const DM_TEMPLATES: Record<RelationshipBracket, string[]> = {
  very_negative: [
    "Stop messaging me. We're not cool.",
    "Why are you even in my DMs right now?",
    "I got nothing to say to you. Move on.",
    "My people told me not to respond to this. They were right.",
    "Read the room. This ain't it.",
  ],
  negative: [
    "What do you want?",
    "I'm busy. Make it quick.",
    "We're not really on good terms right now, you know that right?",
    "Okay. And?",
    "I'll think about it. Don't hold your breath.",
  ],
  neutral: [
    "Yeah, I hear you. I'll see what I can do.",
    "Interesting. Shoot your shot.",
    "Noted. Might circle back on that.",
    "Alright, respect the hustle.",
    "We can talk. Hit my manager first though.",
  ],
  positive: [
    "Always good to hear from you! Let's link up.",
    "Say less, I'm with it.",
    "Real talk, I've been meaning to reach out too.",
    "You know I rate you. What's the move?",
    "Yeah let's make this happen. I'm free next week.",
  ],
  very_positive: [
    "Bro/Sis!! You know you're always welcome in my world.",
    "Family! Say less. I got you.",
    "You're one of the real ones. Whatever you need.",
    "I was literally just thinking about you. Let's create.",
    "You already know. Just say the word and we're moving.",
  ],
};

const POST_COMMENT_TEMPLATES: Record<RelationshipBracket, string[]> = {
  very_negative: [
    "😂 This is a joke right?",
    "Hard pass.",
    "Not my cup of tea at all.",
    "Some of y'all will hype anything.",
    "I've heard better from a ringtone.",
  ],
  negative: [
    "Eh. Could be better.",
    "I'm not convinced yet.",
    "Room to grow, I guess.",
    "This ain't really hitting for me.",
  ],
  neutral: [
    "Not bad.",
    "I see you.",
    "Decent work.",
    "Keep going.",
    "Interesting direction.",
  ],
  positive: [
    "This is fire! 🔥",
    "Okay I see you! Keep going!",
    "This one hits different!",
    "Love the energy on this one!",
  ],
  very_positive: [
    "GOAT behavior!! 🐐🔥",
    "This is the one! Send this everywhere!!",
    "Nobody doing it like you right now. Facts.",
    "I've been listening to this on repeat. Instant classic.",
    "The streets are talking about this one. Respect! 🙌",
  ],
};

const SONG_REACTION_TEMPLATES: Record<RelationshipBracket, string[]> = {
  very_negative: [
    "I listened. Not for me. Won't be sharing this.",
    "You sent me this? Really?",
    "I'll give it to you — you tried. But no.",
  ],
  negative: [
    "It's okay. Seen better from you.",
    "Some parts work, some don't.",
    "Not sure about the hook.",
  ],
  neutral: [
    "It's decent. Quality is there. Let's talk more.",
    "Good effort. The beat selection is solid.",
    "I can see what you were going for. Interesting.",
  ],
  positive: [
    "Okay this actually hits! Send me the stems.",
    "This is real work. I rate this heavily.",
    "We need to talk. This could be something big.",
  ],
  very_positive: [
    "BRO/SIS. This is a hit. Full stop. Let me see what I can do.",
    "I played this for three people and they all went crazy. This is IT.",
    "You're on another level right now. I want in on this.",
  ],
};

const ROYALTY_FLAVOR: string[] = [
  "Streams are looking steady. Keep dropping.",
  "The algorithm is finally working in your favor.",
  "Barely any movement this week — ouch.",
  "Chirp is buzzing about your hook.",
  "Your catalog is starting to pull consistent numbers.",
  "One of your old tracks is getting rediscovered — nice.",
  "New fans from Nigeria found you this week.",
  "Playlist placement is coming. Stay patient.",
  "The numbers are solid but you need a bigger push.",
  "People are adding this to their late-night playlists. That's always a good sign.",
];

const INTERVIEW_QUESTIONS: Record<string, string[]> = {
  friendly: [
    "Tell us how you got started in music.",
    "What's the story behind your latest song?",
    "Who are your biggest influences?",
    "What does success look like for you?",
    "Any shoutouts or upcoming projects to announce?",
  ],
  underground: [
    "Some people say you've gone too mainstream. What's your response?",
    "Break down your process — how do you approach a verse?",
    "What does authenticity mean to you in today's industry?",
    "Which producers are you rocking with right now?",
    "What's a lyric you've written that you're most proud of?",
  ],
  provocative: [
    "There are rumors about trouble with your label — care to address that?",
    "Some artists have called you out online. What's really going on?",
    "Is your image authentic or is it manufactured for streaming?",
    "We have to ask — what happened with [NPC]? Social media was wild about it.",
    "Some say your best days are behind you. Prove them wrong right now.",
  ],
  rival_aligned: [
    "How do you respond to what [Rival] said about your work recently?",
    "Some feel [Rival] is currently outperforming you. What's your take?",
    "Is there any tension between you and people in your city right now?",
    "Would you ever work with [Rival] or is it too far gone?",
  ],
};

// Public-facing generate functions

export function generateDMReply(npc: NPC, playerMessage: string): AIResponse {
  const bracket = getRelBracket(npc.relationshipScore);
  const pool = DM_TEMPLATES[bracket];
  const text = pool[Math.floor(Math.random() * pool.length)];
  
  // Relationship change based on message content (simple heuristic)
  const positiveWords = ['love', 'respect', 'appreciate', 'collab', 'feature', 'fan', 'great', 'amazing', 'fire'];
  const negativeWords = ['hate', 'trash', 'overrated', 'mediocre', 'done', 'whatever', 'bye'];
  
  let change = 0;
  const msg = playerMessage.toLowerCase();
  if (positiveWords.some((w) => msg.includes(w))) change += Math.floor(Math.random() * 3) + 1;
  if (negativeWords.some((w) => msg.includes(w))) change -= Math.floor(Math.random() * 3) + 1;
  
  // Bracket modifiers
  if (bracket === 'very_negative') change = Math.min(change, 1);
  if (bracket === 'very_positive') change = Math.max(change, 0);
  
  return { text, relationshipChange: Math.max(-5, Math.min(5, change)) };
}

export function generatePostComment(npc: NPC, _postContent: string): AIResponse {
  const bracket = getRelBracket(npc.relationshipScore);
  const pool = POST_COMMENT_TEMPLATES[bracket];
  const text = pool[Math.floor(Math.random() * pool.length)];
  return { text, relationshipChange: 0 };
}

export function generateSongReaction(npc: NPC, songTitle: string, songQuality: number): AIResponse {
  // Quality affects which bracket is used (bump up or down by quality)
  let adjustedScore = npc.relationshipScore;
  if (songQuality >= 80) adjustedScore = Math.min(100, adjustedScore + 20);
  else if (songQuality <= 40) adjustedScore = Math.max(-100, adjustedScore - 20);
  
  const tempNPC = { ...npc, relationshipScore: adjustedScore };
  const bracket = getRelBracket(tempNPC.relationshipScore);
  const pool = SONG_REACTION_TEMPLATES[bracket];
  const text = pool[Math.floor(Math.random() * pool.length)].replace('[SONG]', songTitle);
  
  let change = 0;
  if (songQuality >= 80) change = 2;
  else if (songQuality >= 60) change = 1;
  else if (songQuality <= 30) change = -1;
  
  return { text, relationshipChange: change };
}

export function generateRoyaltyFlavor(): string {
  return ROYALTY_FLAVOR[Math.floor(Math.random() * ROYALTY_FLAVOR.length)];
}

export function generateInterviewQuestion(stationPersonality: string, openThread?: string): string {
  const pool = INTERVIEW_QUESTIONS[stationPersonality] ?? INTERVIEW_QUESTIONS.friendly;
  let question = pool[Math.floor(Math.random() * pool.length)];
  if (openThread && (stationPersonality === 'provocative' || stationPersonality === 'rival_aligned')) {
    question = question.replace('[NPC]', openThread).replace('[Rival]', openThread);
  }
  return question;
}

export function generateStoryEvent(eventType: string, npcName: string, detail: string): string {
  const templates: Record<string, string[]> = {
    beef: [
      `${npcName} posted a cryptic subliminal on Chirp. Everyone thinks it's about you.`,
      `${npcName} just dropped a freestyle that definitely has your name on it.`,
      `Fans are debating whether ${npcName}'s latest verse is a diss or not. The comments are wild.`,
    ],
    feature: [
      `${npcName} is asking around about working with you. Their manager reached out.`,
      `Word on the street: ${npcName} wants you on their next record.`,
      `${npcName} played your song at their last show. The crowd went crazy.`,
    ],
    deal: [
      `A representative from ${npcName} slid into your mailbox with an interesting proposal.`,
      `${npcName} is looking to make moves and your name came up in their circle.`,
    ],
    scandal: [
      `Someone leaked that ${detail}. Chirp is going crazy.`,
      `A blog post about ${detail} is trending. Your DMs are blowing up.`,
    ],
    general: [
      `${npcName} posted about ${detail}.`,
      `Something is brewing in the scene — ${npcName} seems to be making moves.`,
    ],
  };
  
  const pool = templates[eventType] ?? templates.general;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateHeadline(eventType: string, artistName: string, detail: string): string {
  const templates: Record<string, string[]> = {
    award: [
      `${artistName} Takes Home ${detail} — A Night to Remember`,
      `${artistName} Wins ${detail}: "This Is Just the Beginning"`,
    ],
    chart: [
      `${artistName} Debuts at #${detail} — Fans Go Wild`,
      `"${detail}" by ${artistName} Storms the Charts`,
    ],
    beef: [
      `${artistName} vs ${detail}: The Beef That Has Everyone Talking`,
      `Did ${artistName} Just Fire Back at ${detail}?`,
    ],
    feature: [
      `${artistName} and ${detail} Link Up — New Music Incoming`,
      `Surprise Collab: ${artistName} Hops On ${detail}'s Track`,
    ],
    show: [
      `${artistName} Shuts Down ${detail} Show — Fans Demand Encore`,
      `${artistName}'s ${detail} Performance Gets Viral Clip Treatment`,
    ],
    scandal: [
      `${artistName} Caught in ${detail} Drama — Internet Reacts`,
    ],
    business: [
      `${artistName} Launches ${detail} — Expanding Beyond Music`,
    ],
    general: [
      `${artistName}: ${detail}`,
    ],
  };
  
  const pool = templates[eventType] ?? templates.general;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateNPCChirpPost(npc: NPC): string {
  const posts: Record<string, string[]> = {
    artist: [
      `New music soon. Stay locked in. 🔒`,
      `The grind never stops. Back in the studio at 2am. 🎤`,
      `Some of y'all need to listen more and talk less. Real talk.`,
      `Grateful for the love. New era incoming. 🙏`,
      `The numbers don't lie. We in these streets.`,
    ],
    manager: [
      `Big things loading. Can't say too much yet. 👀`,
      `My clients are built different. Watch.`,
      `In meetings all week. Something is coming.`,
    ],
    media: [
      `👀 EXCLUSIVE: Something is cooking in the Ghana music scene...`,
      `Hot take: The best artist in the country right now is not who you think it is.`,
      `Which Ghanaian rapper is about to blow up internationally? Drop your picks below. 👇`,
    ],
    fan_account: [
      `Daily reminder that the music scene is popping right now. 🔥`,
      `Your fave could never. Different caliber.`,
      `Stream counts don't lie. Go look up who's really running it.`,
    ],
  };
  
  const roleKey = npc.role in posts ? npc.role : 'artist';
  const pool = posts[roleKey];
  return pool[Math.floor(Math.random() * pool.length)];
}
