// The real-world headliners.
//
// `npcs.ts` holds the small hand-written support cast; `npcGenerator.ts` fills
// the scene out to ~12,000 anonymous names. This file is the third leg: the
// actual artists a player would recognise, each with the label, crew and
// manager they are publicly associated with.
//
// Bios are deliberately short and factual — origin, breakout, signature sound.
// No invented scandals, no speculation about anyone's private life. These are
// real people and the game should not put words in their mouths.
//
// Managers are declared inline (`mgr`) and expanded into real roster entries by
// `buildRealArtists()`, so every artist's team is reachable from their profile.

import type { Genre, Gender, NPC, NPCTier } from '../types/game';

interface Seed {
  /** roster id */
  id: string;
  /** display / stage name */
  n: string;
  /** real name, where it is public knowledge */
  rn?: string;
  g: Genre;
  c: string;
  city: string;
  /** fame 0-100 */
  f: number;
  t: NPCTier;
  gd: Gender;
  a: number;
  /** label they are signed to / distribute through */
  label?: string;
  /** crew or collective */
  crew?: string;
  /** manager or management company */
  mgr?: string;
  /** go-to producer */
  prod?: string;
  /** booking agent, publicist, lawyer… */
  extras?: string[];
  /** personality traits */
  p: string[];
  bio: string;
  /** false when they are effectively unreachable */
  closed?: boolean;
  /** defaults to 'artist'; Jay-Z is a label boss first */
  role?: NPC['role'];
}

const SEEDS: Seed[] = [
  // ─── GHANA ──────────────────────────────────────────────────────────────
  { id: 'stonebwoy', n: 'Stonebwoy', rn: 'Livingstone Etse Satekla', g: 'dancehall', c: 'Ghana', city: 'Accra', f: 78, t: 'national', gd: 'male', a: 36, label: 'Burniton Music Group', crew: 'BHIM Nation', mgr: 'Blakk Cedi', p: ['proud', 'disciplined', 'business_minded'], bio: 'Ashaiman-born dancehall king. Built BHIM Nation into one of the most organised fanbases in Africa and took dancehall from Accra to the world stage.' },
  { id: 'shatta_wale', n: 'Shatta Wale', rn: 'Charles Nii Armah Mensah Jr.', g: 'dancehall', c: 'Ghana', city: 'Accra', f: 76, t: 'national', gd: 'male', a: 40, label: 'Shatta Movement', crew: 'Shatta Movement', mgr: 'Sammy Flex', p: ['volatile', 'charismatic', 'rebellious'], bio: 'The self-styled Dancehall King. Reinvented Ghanaian dancehall twice and never met a controversy he would not walk into.' },
  { id: 'black_sherif', n: 'Black Sherif', rn: 'Mohammed Ismail Sherif', g: 'drill', c: 'Ghana', city: 'Accra', f: 68, t: 'national', gd: 'male', a: 23, label: 'RBA / Empire', crew: 'Konongo Zongo', mgr: 'Kwadwo Yeboah', p: ['introspective', 'ambitious', 'soulful'], bio: 'Konongo kid who turned a freestyle into a national anthem. Carries Ghanaian drill with a preacher\'s intensity.' },
  { id: 'amaarae', n: 'Amaarae', rn: 'Ama Serwah Genfi', g: 'afrobeats', c: 'Ghana', city: 'Accra', f: 62, t: 'national', gd: 'female', a: 30, label: 'Golden Child', mgr: 'Kojo Amankwah', p: ['creative', 'selective', 'experimental'], bio: 'Alté auteur with a feather-light voice and a very sharp pen. The most distinctive record-maker in Accra.' },
  { id: 'medikal', n: 'Medikal', rn: 'Samuel Adu Frimpong', g: 'hip_hop', c: 'Ghana', city: 'Accra', f: 64, t: 'national', gd: 'male', a: 31, crew: 'AMG', mgr: 'Abeiku Mensah', p: ['prolific', 'flashy', 'confident'], bio: 'Rap workaholic from Sowutuom. Drops records faster than the blogs can review them and rarely misses.' },
  { id: 'king_promise', n: 'King Promise', rn: 'Gregory Bortey Newman', g: 'afrobeats', c: 'Ghana', city: 'Accra', f: 65, t: 'national', gd: 'male', a: 29, label: 'Legacy Life', mgr: 'Nana Appiah', p: ['smooth', 'romantic', 'professional'], bio: 'The voice of Ghanaian Afrobeats crossover. Writes love songs that fill stadiums.' },
  { id: 'kuami_eugene', n: 'Kuami Eugene', rn: 'Eugene Kwame Marfo', g: 'afrobeats', c: 'Ghana', city: 'Accra', f: 60, t: 'national', gd: 'male', a: 28, label: 'Lynx Entertainment', mgr: 'Richie Mensah', p: ['melodic', 'gifted', 'competitive'], bio: 'Highlife-raised hitmaker who won a talent show and never stopped charting. Equally dangerous behind the boards.' },
  { id: 'kidi', n: 'KiDi', rn: 'Dennis Nana Dwamena', g: 'afrobeats', c: 'Ghana', city: 'Accra', f: 59, t: 'national', gd: 'male', a: 31, label: 'Lynx Entertainment', mgr: 'Richie Mensah', p: ['charming', 'consistent', 'romantic'], bio: 'Lynx labelmate with a pop ear. Turns out polished, radio-ready Afrobeats without sounding factory-made.' },
  { id: 'gyakie', n: 'Gyakie', rn: 'Jackline Acheampong', g: 'afrobeats', c: 'Ghana', city: 'Accra', f: 56, t: 'national', gd: 'female', a: 25, label: 'Flip The Music', mgr: 'Emmanuel Sedode', p: ['spiritual', 'humble', 'selective'], bio: 'Daughter of highlife legend Nana Acheampong. "Forever" made her a continental name before she turned 22.' },
  { id: 'joey_b', n: 'Joey B', rn: 'Darryl Paa Kwesi Bannerman-Martin', g: 'hip_hop', c: 'Ghana', city: 'Accra', f: 54, t: 'national', gd: 'male', a: 32, crew: 'La Même Gang', mgr: 'Nana Kwarteng', p: ['laid_back', 'witty', 'creative'], bio: 'Smooth-talking Accra rapper with an effortless flow and a habit of making hooks sound easy.' },
  { id: 'efya_real', n: 'Efya', rn: 'Jane Awindor', g: 'afrobeats', c: 'Ghana', city: 'Accra', f: 64, t: 'national', gd: 'female', a: 37, label: 'One Nation', mgr: 'Dede Ayew', p: ['creative', 'spiritual', 'selective'], bio: 'Vocal powerhouse with a live show that resets people\'s expectations of Ghanaian singing.' },

  // ─── NIGERIA ────────────────────────────────────────────────────────────
  { id: 'wizkid', n: 'Wizkid', rn: 'Ayodeji Ibrahim Balogun', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 93, t: 'international', gd: 'male', a: 34, label: 'Starboy / RCA', crew: 'Starboy', mgr: 'Sunday Are', p: ['cool', 'loyal_to_few', 'iconic'], bio: 'From Surulere to global stadiums. The record that took Afrobeats worldwide had his name on it, and he has been the benchmark ever since.' },
  { id: 'davido', n: 'Davido', rn: 'David Adedeji Adeleke', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 92, t: 'international', gd: 'male', a: 32, label: 'DMW / Sony', crew: '30BG', mgr: 'Asa Asika', p: ['generous', 'loud', 'charismatic'], bio: 'The Omo Baba Olowo. Built 30 Billion Gang into a movement and a label at the same time, and has broken records on three continents.' },
  { id: 'burna_real', n: 'Burna Boy', rn: 'Damini Ebunoluwa Ogulu', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 92, t: 'international', gd: 'male', a: 33, label: 'Spaceship / Atlantic', crew: 'Spaceship Collective', mgr: 'Bose Ogulu', p: ['proud', 'rebellious', 'cerebral'], bio: 'The African Giant. Sold-out arenas from Lagos to London without ever softening the accent or the politics.' },
  { id: 'tiwa_real', n: 'Tiwa Savage', rn: 'Tiwa Savage', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 84, t: 'international', gd: 'female', a: 45, label: 'Motown / Universal', mgr: 'Bolaji Talent', p: ['fierce', 'business_minded', 'loyal'], bio: 'The Queen of Afrobeats. Songwriter first, star second, and the first African woman to headline major UK venues on her own name.' },
  { id: 'olamide', n: 'Olamide', rn: 'Olamide Adedeji', g: 'hip_hop', c: 'Nigeria', city: 'Lagos', f: 83, t: 'international', gd: 'male', a: 36, label: 'YBNL Nation', crew: 'YBNL', mgr: 'Babatunde Okunola', p: ['generous', 'streetwise', 'loyal'], bio: 'YBNL boss. Signed and broke more stars than most labels manage in a decade, and still raps in Yoruba for the people who made him.' },
  { id: 'mi_abaga', n: 'MI Abaga', rn: 'Jude Abaga', g: 'hip_hop', c: 'Nigeria', city: 'Lagos', f: 73, t: 'national', gd: 'male', a: 43, label: 'Chocolate City / Incredible Music', crew: 'Chocolate City', mgr: 'Grace Okafor', p: ['cerebral', 'strategic', 'articulate'], bio: 'Jos-raised lyricist who raised the technical bar for Nigerian rap and then spent a decade teaching the next generation how to clear it.' },
  { id: 'rema', n: 'Rema', rn: 'Divine Ikubor', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 85, t: 'international', gd: 'male', a: 24, label: 'Mavin / Jonzing', crew: 'Jonzing World', mgr: 'Vanessa Momoh', p: ['confident', 'creative', 'young'], bio: 'Benin City kid who broke out of a church choir and turned Afrorave into a global export before he could legally drink in the US.' },
  { id: 'asake', n: 'Asake', rn: 'Ahmed Ololade', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 81, t: 'international', gd: 'male', a: 29, label: 'YBNL / Empire', crew: 'YBNL', mgr: 'Babatunde Okunola', p: ['spiritual', 'humble', 'distinctive'], bio: 'Lagos street-pop with Fuji in its bones and a choir in the chorus. Ran three straight years of hits without a dip.' },
  { id: 'tems', n: 'Tems', rn: 'Temilade Openiyi', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 84, t: 'international', gd: 'female', a: 29, label: 'RCA / Leading Vibe', mgr: 'Chris Ogunbanjo', p: ['introspective', 'private', 'original'], bio: 'Wrote her way to the top with a voice that sounds like it is thinking. A Grammy and a global feature run later, she still writes alone.' },
  { id: 'omah_lay', n: 'Omah Lay', rn: 'Stanley Omah Didia', g: 'afrobeats', c: 'Nigeria', city: 'Port Harcourt', f: 76, t: 'international', gd: 'male', a: 27, label: 'KeyQaad / Sire', mgr: 'Chidi Anya', p: ['melancholy', 'honest', 'creative'], bio: 'Port Harcourt singer who makes heartbreak sound like a warm night. Wrote his way out of a studio internship.' },
  { id: 'fireboy', n: 'Fireboy DML', rn: 'Adedamola Adefolahan', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 73, t: 'national', gd: 'male', a: 28, label: 'YBNL / Empire', crew: 'YBNL', mgr: 'Babatunde Okunola', p: ['gentle', 'romantic', 'disciplined'], bio: 'Soft-spoken YBNL singer whose Afrobeats ballads travel further than most people\'s club records.' },
  { id: 'joeboy', n: 'Joeboy', rn: 'Joseph Akinwale Akinfenwa-Donus', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 69, t: 'national', gd: 'male', a: 27, label: 'Empawa / Warner', mgr: 'Samuel Okafor', p: ['humble', 'romantic', 'consistent'], bio: 'Discovered through an open call and turned into one of the most reliable melody writers in Lagos.' },
  { id: 'falz', n: 'Falz', rn: 'Folarin Falana', g: 'hip_hop', c: 'Nigeria', city: 'Lagos', f: 67, t: 'national', gd: 'male', a: 33, label: 'Bahd Guys Records', crew: 'Bahd Guys', mgr: 'Tolu Adeyemi', p: ['satirical', 'principled', 'articulate'], bio: 'Lawyer-turned-rapper who uses comedy as a delivery system for social commentary. The rare act everyone agrees on.' },
  { id: 'phyno', n: 'Phyno', rn: 'Chibuzor Nelson Azubuike', g: 'hip_hop', c: 'Nigeria', city: 'Enugu', f: 68, t: 'national', gd: 'male', a: 38, label: 'Penthauze', crew: 'Penthauze', mgr: 'Emeka Nwosu', p: ['proud', 'loyal', 'grounded'], bio: 'The Igbo rap pioneer. Rhymes in a language the industry told him would limit him, then made it the sound of the east.' },
  { id: 'zlatan', n: 'Zlatan', rn: 'Omoniyi Temidayo Raphael', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 65, t: 'national', gd: 'male', a: 29, label: 'Zanku Records', crew: 'Zanku', mgr: 'Kunle Bakare', p: ['energetic', 'streetwise', 'funny'], bio: 'Invented a dance, named it, and made a career out of being the loudest man in the room.' },
  { id: 'naira_marley', n: 'Naira Marley', rn: 'Azeez Fashola', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 62, t: 'national', gd: 'male', a: 32, label: 'Marlian Records', crew: 'Marlians', mgr: 'Tunde Sanni', p: ['provocative', 'unbothered', 'influential'], bio: 'Built a whole subculture out of not caring what anyone thought. His fanbase is louder than most labels.' },
  { id: 'yemi_alade', n: 'Yemi Alade', rn: 'Yemi Eberechi Alade', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 71, t: 'national', gd: 'female', a: 35, label: 'Effyzzie Music', mgr: 'Taiwo Alade', p: ['hardworking', 'pan_african', 'independent'], bio: 'Mama Africa. Tours the continent harder than almost anyone alive and sings in four languages while she does it.' },
  { id: 'adekunle_gold', n: 'Adekunle Gold', rn: 'Adekunle Kosoko', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 71, t: 'national', gd: 'male', a: 37, label: 'Afro Urban', mgr: 'Segun Adeyemi', p: ['romantic', 'evolving', 'soulful'], bio: 'Started as a graphic designer making covers for friends, then became the most dependable highlife-pop voice of his generation.' },
  { id: 'simi', n: 'Simi', rn: 'Simisola Kosoko', g: 'afrobeats', c: 'Nigeria', city: 'Lagos', f: 67, t: 'national', gd: 'female', a: 36, label: 'Studio Brat', mgr: 'Bola Kosoko', p: ['gifted', 'independent', 'honest'], bio: 'Singer, engineer and label owner. One of very few Nigerian women who mixes her own records.' },
  { id: 'blaqbonez', n: 'Blaqbonez', rn: 'Emeka Akumefule', g: 'hip_hop', c: 'Nigeria', city: 'Lagos', f: 62, t: 'national', gd: 'male', a: 29, label: 'Chocolate City', mgr: 'Grace Okafor', p: ['funny', 'self_aware', 'strategic'], bio: 'Turned internet marketing into a rap career and then, annoyingly for his critics, became genuinely good at the rapping part too.' },
  { id: 'ladipoe', n: 'Ladipoe', rn: 'Ladipo Eso', g: 'hip_hop', c: 'Nigeria', city: 'Lagos', f: 60, t: 'national', gd: 'male', a: 33, label: 'Mavin Records', mgr: 'Vanessa Momoh', p: ['cerebral', 'precise', 'patient'], bio: 'Mavin\'s resident lyricist. Writes verses that reward a second listen and a third.' },
  { id: 'johnny_drille', n: 'Johnny Drille', rn: 'John Ighodaro', g: 'pop_rap', c: 'Nigeria', city: 'Lagos', f: 59, t: 'national', gd: 'male', a: 34, label: 'Mavin Records', mgr: 'Vanessa Momoh', p: ['gentle', 'sincere', 'unfashionable'], bio: 'Folk-leaning songwriter in a scene built on tempo. Took the slow road and it worked.' },

  // ─── SOUTH AFRICA ───────────────────────────────────────────────────────
  { id: 'nasty_c', n: 'Nasty C', rn: 'Nsikayezwe Zwelithini Cebekhulu', g: 'hip_hop', c: 'South Africa', city: 'Durban', f: 77, t: 'national', gd: 'male', a: 28, label: 'Def Jam Africa', crew: 'Tall Racks', mgr: 'Tumi Mokoena', p: ['technical', 'ambitious', 'cool'], bio: 'Durban-raised technician who was freestyling on national radio as a teenager and signed to Def Jam before he was 21.' },
  { id: 'cassper', n: 'Cassper Nyovest', rn: 'Refiloe Maele Phoolo', g: 'hip_hop', c: 'South Africa', city: 'Johannesburg', f: 75, t: 'national', gd: 'male', a: 34, label: 'Family Tree', crew: 'Family Tree', mgr: 'Sipho Nkosi', p: ['ambitious', 'showman', 'business_minded'], bio: 'Filled stadiums on his own money before anyone believed it was possible in South African hip hop.' },
  { id: 'ko', n: 'K.O', rn: 'Ntokozo Mdluli', g: 'hip_hop', c: 'South Africa', city: 'Johannesburg', f: 70, t: 'national', gd: 'male', a: 38, label: 'Skhanda World', crew: 'Skhanda World', mgr: 'Lerato Dube', p: ['strategic', 'proud', 'loyal'], bio: 'Half of Teargas, then a solo run, then a label. "SETE" became a national moment a decade into his career.' },
  { id: 'kabza', n: 'Kabza De Small', rn: 'Kabelo Motha', g: 'afrobeats', c: 'South Africa', city: 'Pretoria', f: 72, t: 'national', gd: 'male', a: 32, label: 'Piano Hub', crew: 'Piano Hub', mgr: 'Thabo Molefe', p: ['prolific', 'humble', 'quiet'], bio: 'The King of Amapiano. Produces so relentlessly that the genre\'s whole decade is basically his discography.' },
  { id: 'dj_maphorisa', n: 'DJ Maphorisa', rn: 'Themba Sonnyboy Sekowe', g: 'afrobeats', c: 'South Africa', city: 'Johannesburg', f: 73, t: 'national', gd: 'male', a: 38, label: 'Blayze Records', crew: 'Piano Hub', mgr: 'Thabo Molefe', p: ['sharp', 'prolific', 'connected'], bio: 'Producer who helped build both Afrobeats and Amapiano. Has a credit on more hits than most artists have songs.' },
  { id: 'focalistic', n: 'Focalistic', rn: 'Lethabo Sebetso', g: 'afrobeats', c: 'South Africa', city: 'Pretoria', f: 68, t: 'national', gd: 'male', a: 28, label: '18 Area Holdings', crew: '18 Area', mgr: 'Kagiso Maluleke', p: ['energetic', 'proud', 'entrepreneurial'], bio: 'Pitori Maradona. Put Amapiano and hip hop in the same room and made the whole country dance to it.' },
  { id: 'uncle_waffles', n: 'Uncle Waffles', rn: 'Lungelihle Zwane', g: 'afrobeats', c: 'South Africa', city: 'Johannesburg', f: 66, t: 'national', gd: 'female', a: 24, label: 'Independent', mgr: 'Zanele Mthembu', p: ['confident', 'viral', 'young'], bio: 'Turned a single viral clip into an international Amapiano touring career inside eighteen months.' },
  { id: 'sho_madjozi', n: 'Sho Madjozi', rn: 'Maya Christinah Xichavo Wegerif', g: 'hip_hop', c: 'South Africa', city: 'Johannesburg', f: 64, t: 'national', gd: 'female', a: 32, label: 'Flourish and Wow', mgr: 'Naledi Khumalo', p: ['colourful', 'clever', 'original'], bio: 'Raps in Tsonga, Xitsonga and English over beats nobody else would pick, and makes it look like the obvious choice.' },
  { id: 'sjava', n: 'Sjava', rn: 'Jabulani Hadebe', g: 'conscious', c: 'South Africa', city: 'Johannesburg', f: 65, t: 'national', gd: 'male', a: 39, label: '1021 Music', crew: '1021', mgr: 'Bongani Zulu', p: ['humble', 'spiritual', 'patient'], bio: 'Zulu soul and rap from Bergville. Sings about home without romanticising it.' },
  { id: 'blxckie', n: 'Blxckie', rn: 'Sihle Sithole', g: 'hip_hop', c: 'South Africa', city: 'Durban', f: 60, t: 'national', gd: 'male', a: 25, label: 'Independent', crew: 'The Sauce', mgr: 'Ayanda Ndlovu', p: ['hungry', 'melodic', 'versatile'], bio: 'Durban\'s most in-demand feature. Sings, raps, and turns up on other people\'s songs sounding like he owns them.' },
  { id: 'khaligraph', n: 'Khaligraph Jones', rn: 'Brian Robert Ouko', g: 'hip_hop', c: 'Kenya', city: 'Nairobi', f: 64, t: 'national', gd: 'male', a: 35, label: 'Blu Ink', crew: 'Blu Ink', mgr: 'Grace Wanjiru', p: ['confident', 'hardworking', 'competitive'], bio: 'Kayole-raised heavyweight who spent a decade arguing he was the best in Africa and eventually got tired of being argued with.' },
  { id: 'octopizzo', n: 'Octopizzo', rn: 'Henry Ohanga', g: 'hip_hop', c: 'Kenya', city: 'Nairobi', f: 58, t: 'national', gd: 'male', a: 36, label: 'Kibera Foundation', mgr: 'Peter Otieno', p: ['community_first', 'principled', 'independent'], bio: 'Rapper and activist out of Kibera. Runs youth programmes alongside the music and means both.' },
  { id: 'diamond', n: 'Diamond Platnumz', rn: 'Naseeb Abdul Juma Issack', g: 'afrobeats', c: 'Tanzania', city: 'Dar es Salaam', f: 79, t: 'national', gd: 'male', a: 35, label: 'WCB Wasafi', crew: 'WCB Wasafi', mgr: 'Sallam Sharaf', p: ['ambitious', 'showman', 'ruthless'], bio: 'Built Wasafi into an East African empire. The most reliable hitmaker in Bongo Flava and its shrewdest businessman.' },
  { id: 'harmonize', n: 'Harmonize', rn: 'Rajab Abdul Kahali', g: 'afrobeats', c: 'Tanzania', city: 'Dar es Salaam', f: 65, t: 'national', gd: 'male', a: 30, label: 'Kondefam', mgr: 'Amina Hassan', p: ['melodic', 'competitive', 'driven'], bio: 'Wrote his way out of Wasafi and into his own label, with a run of Swahili hits that never really stopped.' },
  { id: 'zuchu', n: 'Zuchu', rn: 'Zuhura Othman Soud', g: 'afrobeats', c: 'Tanzania', city: 'Dar es Salaam', f: 62, t: 'national', gd: 'female', a: 27, label: 'WCB Wasafi', mgr: 'Sallam Sharaf', p: ['gifted', 'hardworking', 'charming'], bio: 'Taarab raised, pop finished. Signed to Wasafi and immediately became its most streamed artist.' },
  { id: 'fally_ipupa', n: 'Fally Ipupa', rn: 'Fally Ipupa Nsimba', g: 'afrobeats', c: 'DR Congo', city: 'Kinshasa', f: 74, t: 'national', gd: 'male', a: 47, label: 'F\'Victeam', crew: 'F\'Victeam', mgr: 'Papy Kakol', p: ['polished', 'professional', 'loyal'], bio: 'The biggest name in Congolese rumba and a genuine stadium act across Francophone Africa.' },

  // ─── UK ─────────────────────────────────────────────────────────────────
  { id: 'stormzy', n: 'Stormzy', rn: 'Michael Ebenezer Kwadjo Omari Owuo Jr.', g: 'grime', c: 'UK', city: 'London', f: 87, t: 'international', gd: 'male', a: 31, label: 'Merky Records', crew: 'Merky', mgr: 'Tobe Onwuka', p: ['principled', 'ambitious', 'charismatic'], bio: 'Glastonbury headliner, label owner, and the artist who made British rap a mainstream concern again.' },
  { id: 'dave', n: 'Dave', rn: 'David Orobosa Omoregie', g: 'hip_hop', c: 'UK', city: 'London', f: 84, t: 'international', gd: 'male', a: 26, label: 'Dave / Neighbourhood', mgr: 'Tobe Onwuka', p: ['cerebral', 'technical', 'private'], bio: 'Streatham pianist-turned-rapper. Won the Mercury Prize on a debut album and raps like he has something to prove anyway.' },
  { id: 'central_cee', n: 'Central Cee', rn: 'Oakley Neil H T Caesar-Su', g: 'drill', c: 'UK', city: 'London', f: 83, t: 'international', gd: 'male', a: 26, label: 'Independent', mgr: 'Bhavik Patel', p: ['cool', 'strategic', 'elusive'], bio: 'Took UK drill global from a bedroom in Shepherd\'s Bush. Rarely gives interviews and rarely needs to.' },
  { id: 'skepta', n: 'Skepta', rn: 'Joseph Olaitan Adenuga Jr.', g: 'grime', c: 'UK', city: 'London', f: 82, t: 'international', gd: 'male', a: 42, label: 'Boy Better Know', crew: 'Boy Better Know', mgr: 'Grace Adeyemi', p: ['independent', 'influential', 'stubborn'], bio: 'Boy Better Know co-founder. Turned a Tottenham crew into a blueprint for doing it without a label.' },
  { id: 'j_hus', n: 'J Hus', rn: 'Momodou Lamin Jallow', g: 'afrobeats', c: 'UK', city: 'London', f: 78, t: 'national', gd: 'male', a: 28, label: 'Black Butter', mgr: 'Ibrahim Sanneh', p: ['enigmatic', 'original', 'reluctant'], bio: 'Invented Afroswing more or less by himself, then went quiet about it for years at a time.' },
  { id: 'little_simz', n: 'Little Simz', rn: 'Simbiatu Ajikawo', g: 'hip_hop', c: 'UK', city: 'London', f: 79, t: 'national', gd: 'female', a: 30, label: 'Age 101', mgr: 'Tobe Onwuka', p: ['cerebral', 'independent', 'exacting'], bio: 'Islington-raised rapper and actor who runs her own label and treats every album like a film.' },
  { id: 'headie_one', n: 'Headie One', rn: 'Irving Ampofo Adjei', g: 'drill', c: 'UK', city: 'London', f: 74, t: 'national', gd: 'male', a: 30, label: 'Relentless / Sony', mgr: 'Bhavik Patel', p: ['patient', 'distinctive', 'resilient'], bio: 'Broadwater Farm\'s most recognisable voice. Made drill sound like a career rather than a moment.' },
  { id: 'giggs', n: 'Giggs', rn: 'Nathaniel Thompson', g: 'hip_hop', c: 'UK', city: 'London', f: 71, t: 'national', gd: 'male', a: 41, label: 'SN1 Records', crew: 'SN1', mgr: 'Kwame Boateng', p: ['stoic', 'respected', 'independent'], bio: 'Peckham legend. The reason a generation of British rappers believed you could do this on your own terms.' },
  { id: 'aitch', n: 'Aitch', rn: 'Harrison Armstrong', g: 'hip_hop', c: 'UK', city: 'Manchester', f: 71, t: 'national', gd: 'male', a: 25, label: 'Since 93', mgr: 'Jordan Riley', p: ['cheerful', 'sharp', 'consistent'], bio: 'Manchester\'s most likeable rapper, and quietly one of its most technically capable.' },
  { id: 'ms_banks', n: 'Ms Banks', rn: 'Thyra Oji', g: 'hip_hop', c: 'UK', city: 'London', f: 60, t: 'national', gd: 'female', a: 31, label: 'Independent', mgr: 'Grace Adeyemi', p: ['confident', 'direct', 'hardworking'], bio: 'South London rapper who out-raps most of the scene on any given guest verse.' },
  { id: 'stefflon_don', n: 'Stefflon Don', rn: 'Stephanie Victoria Allen', g: 'dancehall', c: 'UK', city: 'London', f: 67, t: 'national', gd: 'female', a: 32, label: '54 London', mgr: 'Grace Adeyemi', p: ['fierce', 'glamorous', 'direct'], bio: 'Birmingham-raised, Jamaica-rooted. Dancehall delivery with a UK accent and a lot of attitude.' },
  { id: 'fredo', n: 'Fredo', rn: 'Marvin William Bailey', g: 'drill', c: 'UK', city: 'London', f: 68, t: 'national', gd: 'male', a: 30, label: 'Since 93', mgr: 'Jordan Riley', p: ['understated', 'sharp', 'private'], bio: 'Mozart Estate-raised storyteller. Raps like he is recounting rather than performing.' },
  { id: 'kano', n: 'Kano', rn: 'Kane Brett Robinson', g: 'grime', c: 'UK', city: 'London', f: 73, t: 'national', gd: 'male', a: 40, label: 'Bigger Picture Music', mgr: 'Grace Adeyemi', p: ['thoughtful', 'veteran', 'evolving'], bio: 'East Ham grime pioneer who grew into one of the most complete writers British rap has produced.' },

  // ─── USA ────────────────────────────────────────────────────────────────
  { id: 'kanye', n: 'Kanye West', rn: 'Ye', g: 'hip_hop', c: 'USA', city: 'Chicago', f: 96, t: 'international', gd: 'male', a: 47, label: 'YZY', crew: 'Sunday Service', mgr: 'Ari Emanuel', prod: 'Mike Dean', p: ['volatile', 'brilliant', 'unpredictable'], bio: 'Producer who became the most consequential rap artist of his era, and then the most unpredictable. Still changes the sound of whatever he touches.' },
  { id: 'j_cole', n: 'J. Cole', rn: 'Jermaine Lamarr Cole', g: 'hip_hop', c: 'USA', city: 'Fayetteville', f: 92, t: 'international', gd: 'male', a: 39, label: 'Dreamville', crew: 'Dreamville', mgr: 'Ibrahim Hamad', p: ['introspective', 'competitive', 'disciplined'], bio: 'Signed himself off a mixtape and built Dreamville into a label, a festival and a roster. Raps like he is still the hungry kid from Fayetteville.' },
  { id: 'travis_scott', n: 'Travis Scott', rn: 'Jacques Berman Webster II', g: 'trap', c: 'USA', city: 'Houston', f: 92, t: 'international', gd: 'male', a: 33, label: 'Cactus Jack / Epic', crew: 'Cactus Jack', mgr: 'David Stromberg', prod: 'Mike Dean', p: ['perfectionist', 'visionary', 'enigmatic'], bio: 'Built a whole sonic universe out of Houston low-end and reverb. Sells out arenas on atmosphere alone.' },
  { id: 'future', n: 'Future', rn: 'Nayvadius DeMun Wilburn', g: 'trap', c: 'USA', city: 'Atlanta', f: 88, t: 'international', gd: 'male', a: 40, label: 'Freebandz / Epic', crew: 'Freebandz', mgr: 'Cory Young', p: ['prolific', 'melancholy', 'reliable'], bio: 'The most imitated voice in trap. Put out more records in one decade than most labels, and plenty of them are classics.' },
  { id: 'lil_durk', n: 'Lil Durk', rn: 'Durk Derrick Banks', g: 'drill', c: 'USA', city: 'Chicago', f: 85, t: 'international', gd: 'male', a: 32, label: 'Only The Family / Alamo', crew: 'OTF', mgr: 'Twan Turner', p: ['loyal', 'raw', 'guarded'], bio: 'OTF founder. Turned Chicago drill\'s pain into melody and built a label around his own block.' },
  { id: 'lil_tjay', n: 'Lil Tjay', rn: 'Tione Jayden Merritt', g: 'drill', c: 'USA', city: 'New York', f: 79, t: 'national', gd: 'male', a: 23, label: 'Columbia', mgr: 'Anthony Reyes', p: ['melodic', 'resilient', 'young'], bio: 'Bronx melodist who came back from a shooting and kept the same singing flow. New York drill\'s softest edge.' },
  { id: 'polo_g', n: 'Polo G', rn: 'Taurus Tremani Bartlett', g: 'drill', c: 'USA', city: 'Chicago', f: 79, t: 'national', gd: 'male', a: 25, label: 'Capitol', mgr: 'Twan Turner', p: ['introspective', 'melodic', 'emotional'], bio: 'Chicago drill with a piano under it and grief on top. Writes hooks that sound like confessions.' },
  { id: '21_savage', n: '21 Savage', rn: 'Shéyaa Bin Abraham-Joseph', g: 'trap', c: 'USA', city: 'Atlanta', f: 87, t: 'international', gd: 'male', a: 32, label: 'Slaughter Gang / Epic', crew: 'Slaughter Gang', mgr: 'Kei Henderson', p: ['deadpan', 'sharp', 'private'], bio: 'Atlanta by way of London. Turns deadpan delivery into a weapon and has quietly become one of the best rappers alive.' },
  { id: 'playboi_carti', n: 'Playboi Carti', rn: 'Jordan Terrell Carter', g: 'trap', c: 'USA', city: 'Atlanta', f: 85, t: 'international', gd: 'male', a: 28, label: 'Opium / AWGE', crew: 'Opium', mgr: 'Erin Larsen', p: ['mysterious', 'fashionable', 'abrasive'], bio: 'Redefined what a rap vocal could be by mostly abandoning words. The most copied aesthetic in modern rap.' },
  { id: 'lil_baby', n: 'Lil Baby', rn: 'Dominique Armani Jones', g: 'trap', c: 'USA', city: 'Atlanta', f: 87, t: 'international', gd: 'male', a: 30, label: 'Quality Control / Motown', crew: '4PF', mgr: 'Kevin Lee', p: ['consistent', 'grounded', 'hardworking'], bio: 'Atlanta\'s most dependable hitmaker. Went from a two-year run of features to headlining arenas on his own name.' },
  { id: 'gunna', n: 'Gunna', rn: 'Sergio Giavanni Kitchens', g: 'trap', c: 'USA', city: 'Atlanta', f: 82, t: 'international', gd: 'male', a: 31, label: 'Young Stoner Life / 300', crew: 'YSL', mgr: 'Kevin Lee', p: ['smooth', 'melodic', 'strategic'], bio: 'Made "drip" a genre. The most melodic writer in the YSL camp and its most consistent album artist.' },
  { id: 'rod_wave', n: 'Rod Wave', rn: 'Rodarius Marcell Green', g: 'trap', c: 'USA', city: 'St. Petersburg', f: 81, t: 'national', gd: 'male', a: 26, label: 'Alamo', mgr: 'Anthony Reyes', p: ['emotional', 'prolific', 'sincere'], bio: 'Sings pain over trap drums and sells out arenas without a single radio hit. The most streamed sad rapper alive.' },
  { id: 'nicki_minaj', n: 'Nicki Minaj', rn: 'Onika Tanya Maraj-Petty', g: 'hip_hop', c: 'USA', city: 'New York', f: 94, t: 'international', gd: 'female', a: 42, label: 'Republic', crew: 'Heavy On It', mgr: 'Gee Roberson', p: ['fierce', 'theatrical', 'competitive'], bio: 'The most technically gifted rapper of her generation, full stop. Rewrote what a female rap career could look like.' },
  { id: 'cardi_b', n: 'Cardi B', rn: 'Belcalis Marlenis Almánzar', g: 'hip_hop', c: 'USA', city: 'New York', f: 90, t: 'international', gd: 'female', a: 32, label: 'Atlantic', mgr: 'Solid Foundation', p: ['brash', 'funny', 'unfiltered'], bio: 'Bronx personality who became a Grammy-winning rapper without dropping the accent or the attitude.' },
  { id: 'megan_thee_stallion', n: 'Megan Thee Stallion', rn: 'Megan Jovon Ruth Pete', g: 'hip_hop', c: 'USA', city: 'Houston', f: 87, t: 'international', gd: 'female', a: 30, label: 'Hot Girl Productions', crew: 'Hot Girl', mgr: 'Rico Hall', p: ['confident', 'disciplined', 'funny'], bio: 'Houston Hottie with a degree to go with the bars. Took full ownership of her masters and her career.' },
  { id: 'doja_cat', n: 'Doja Cat', rn: 'Amala Ratna Zandile Dlamini', g: 'pop_rap', c: 'USA', city: 'Los Angeles', f: 90, t: 'international', gd: 'female', a: 29, label: 'Kemosabe / RCA', mgr: 'Erin Larsen', p: ['playful', 'provocative', 'restless'], bio: 'Grew up on the internet and makes records like it. Swings between pop, rap and something entirely her own.' },
  { id: 'tyler_creator', n: 'Tyler, the Creator', rn: 'Tyler Gregory Okonma', g: 'hip_hop', c: 'USA', city: 'Los Angeles', f: 87, t: 'international', gd: 'male', a: 33, label: 'Columbia', crew: 'Odd Future', mgr: 'Erin Larsen', p: ['original', 'theatrical', 'exacting'], bio: 'Producer, designer and songwriter who turned a shock-value internet crew into a genuinely serious body of work.' },
  { id: 'asap_rocky', n: 'A$AP Rocky', rn: 'Rakim Athelaston Mayers', g: 'hip_hop', c: 'USA', city: 'New York', f: 85, t: 'international', gd: 'male', a: 36, label: 'AWGE / RCA', crew: 'A$AP Mob', mgr: 'Chace Johnson', p: ['stylish', 'patient', 'influential'], bio: 'Harlem rapper who made fashion and rap the same conversation. Albums come rarely and still move the culture.' },
  { id: 'kodak_black', n: 'Kodak Black', rn: 'Bill Kahan Kapri', g: 'hip_hop', c: 'USA', city: 'Miami', f: 77, t: 'national', gd: 'male', a: 27, label: 'Sniper Gang / Atlantic', crew: 'Sniper Gang', mgr: 'Twan Turner', p: ['unpredictable', 'gifted', 'raw'], bio: 'Florida\'s most naturally gifted and least predictable rapper. When he focuses, nobody sounds like him.' },
  { id: 'nba_youngboy', n: 'NBA YoungBoy', rn: 'Kentrell DeSean Gaulden', g: 'hip_hop', c: 'USA', city: 'Baton Rouge', f: 81, t: 'national', gd: 'male', a: 25, label: 'Never Broke Again / Motown', crew: 'Never Broke Again', mgr: 'Twan Turner', p: ['prolific', 'guarded', 'loyal'], bio: 'Baton Rouge\'s most streamed artist. Puts out music at a rate the industry has never really solved for.' },
  { id: 'fifty_cent', n: '50 Cent', rn: 'Curtis James Jackson III', g: 'hip_hop', c: 'USA', city: 'New York', f: 88, t: 'international', gd: 'male', a: 49, label: 'G-Unit / Caroline', crew: 'G-Unit', mgr: 'Chris Lighty', p: ['sharp', 'business_minded', 'unforgiving'], bio: 'Turned a debut album into a business empire and then into television. Still one of the shrewdest operators in music.' },
  { id: 'sza', n: 'SZA', rn: 'Solána Imani Rowe', g: 'pop_rap', c: 'USA', city: 'Los Angeles', f: 87, t: 'international', gd: 'female', a: 35, label: 'Top Dawg / RCA', mgr: 'Terrence Henderson', p: ['honest', 'anxious', 'gifted'], bio: 'Writes about insecurity so precisely that it became the most relatable catalogue in modern R&B.' },
  { id: 'chris_brown', n: 'Chris Brown', rn: 'Christopher Maurice Brown', g: 'pop_rap', c: 'USA', city: 'Los Angeles', f: 84, t: 'international', gd: 'male', a: 35, label: 'RCA', mgr: 'Erin Larsen', p: ['gifted', 'controversial', 'hardworking'], bio: 'One of the most naturally talented performers of his generation, with a career that has always been complicated.' },
  { id: 'metro_boomin', n: 'Metro Boomin', rn: 'Leland Tyler Wayne', g: 'trap', c: 'USA', city: 'Atlanta', f: 82, t: 'international', gd: 'male', a: 31, label: 'Boominati / Republic', crew: 'Boominati', mgr: 'Kevin Lee', p: ['perfectionist', 'strategic', 'influential'], bio: 'The producer who scored a whole era of Atlanta rap. His tags are more recognisable than most artists\' hooks.' },
  { id: 'hitboy', n: 'Hit-Boy', rn: 'Chauncey Alexander Hollis Jr.', g: 'hip_hop', c: 'USA', city: 'Los Angeles', f: 70, t: 'national', gd: 'male', a: 37, label: 'Surf Club', mgr: 'Erin Larsen', p: ['prolific', 'technical', 'versatile'], bio: 'Produced era-defining records for everyone from Jay-Z to Nas, then started rapping well enough to release his own albums.' },
  { id: 'ice_spice', n: 'Ice Spice', rn: 'Isis Naija Gaston', g: 'drill', c: 'USA', city: 'New York', f: 77, t: 'national', gd: 'female', a: 25, label: '10K Projects', mgr: 'Erin Larsen', p: ['deadpan', 'strategic', 'unbothered'], bio: 'Bronx drill star who built a look, a cadence and a career out of the same three ingredients.' },
  { id: 'glorilla', n: 'GloRilla', rn: 'Gloria Hallelujah Woods', g: 'hip_hop', c: 'USA', city: 'Memphis', f: 76, t: 'national', gd: 'female', a: 25, label: 'Collective Music / Interscope', crew: 'CMG', mgr: 'Kevin Lee', p: ['energetic', 'funny', 'confident'], bio: 'Memphis crunk energy with a modern pen. Turned one freestyle into a national catchphrase.' },
  { id: 'latto', n: 'Latto', rn: 'Alyssa Michelle Stephens', g: 'hip_hop', c: 'USA', city: 'Atlanta', f: 75, t: 'national', gd: 'female', a: 26, label: 'RCA', mgr: 'Erin Larsen', p: ['confident', 'competitive', 'sharp'], bio: 'Won a TV rap competition as a teenager and spent the next decade proving it was not a fluke.' },
  { id: 'sexyy_red', n: 'Sexyy Red', rn: 'Janae Nierah Wherry', g: 'hip_hop', c: 'USA', city: 'St. Louis', f: 74, t: 'national', gd: 'female', a: 26, label: 'Open Shift / gamma', mgr: 'Erin Larsen', p: ['unfiltered', 'loud', 'funny'], bio: 'St. Louis rapper who took the least polished version of herself and made it the most quoted.' },

  // ─── CANADA / CARIBBEAN ─────────────────────────────────────────────────
  { id: 'drake_real', n: 'Drake', rn: 'Aubrey Drake Graham', g: 'hip_hop', c: 'Canada', city: 'Toronto', f: 97, t: 'international', gd: 'male', a: 38, label: 'OVO / Republic', crew: 'OVO', mgr: 'OVO Management', prod: 'Noah "40" Shebib', p: ['calculating', 'loyal_to_few', 'petty'], bio: 'The most streamed rapper of all time. Turned Toronto into a music capital and never let anyone forget it.' },
  { id: 'weeknd', n: 'The Weeknd', rn: 'Abel Makkonen Tesfaye', g: 'pop_rap', c: 'Canada', city: 'Toronto', f: 94, t: 'international', gd: 'male', a: 34, label: 'XO / Republic', crew: 'XO', mgr: 'Amir Esmailian', p: ['private', 'perfectionist', 'cinematic'], bio: 'Started by uploading anonymous mixtapes and became the defining pop voice of a decade.' },
  { id: 'tory_lanez', n: 'Tory Lanez', rn: 'Daystar Shemuel Shua Peterson', g: 'pop_rap', c: 'Canada', city: 'Toronto', f: 68, t: 'national', gd: 'male', a: 32, label: 'One Umbrella', mgr: 'Erin Larsen', p: ['prolific', 'confrontational', 'gifted'], bio: 'Singer-rapper with a genuinely versatile catalogue and a career defined by what happened off the record.' },
  { id: 'nav', n: 'NAV', rn: 'Navraj Singh Goraya', g: 'trap', c: 'Canada', city: 'Toronto', f: 68, t: 'national', gd: 'male', a: 35, label: 'XO / Republic', crew: 'XO', mgr: 'Amir Esmailian', p: ['understated', 'consistent', 'guarded'], bio: 'Produced his way into the Weeknd\'s orbit and then quietly became one of the most streamed Canadians alive.' },
  { id: 'partynextdoor', n: 'PARTYNEXTDOOR', rn: 'Jahron Anthony Brathwaite', g: 'pop_rap', c: 'Canada', city: 'Mississauga', f: 72, t: 'national', gd: 'male', a: 31, label: 'OVO', crew: 'OVO', mgr: 'OVO Management', p: ['moody', 'private', 'influential'], bio: 'Wrote the blueprint for the hazy, late-night Toronto sound that everyone else borrowed.' },
  { id: 'popcaan', n: 'Popcaan', rn: 'Andrae Hugh Sutherland', g: 'dancehall', c: 'Jamaica', city: 'Portmore', f: 77, t: 'national', gd: 'male', a: 36, label: 'Unruly / OVO', crew: 'Unruly Gang', mgr: 'Kwame Bennett', p: ['loyal', 'proud', 'charismatic'], bio: 'Portmore\'s Unruly Boss. Took dancehall into a global festival slot without changing the patois.' },
  { id: 'shenseea', n: 'Shenseea', rn: 'Chinsea Lee', g: 'dancehall', c: 'Jamaica', city: 'Kingston', f: 69, t: 'national', gd: 'female', a: 27, label: 'Rich Immigrants / Interscope', mgr: 'Kwame Bennett', p: ['confident', 'ambitious', 'polished'], bio: 'The most crossover-ready dancehall artist of her generation, and she knows exactly what she is doing.' },
  { id: 'koffee', n: 'Koffee', rn: 'Mikayla Victoria Simpson', g: 'dancehall', c: 'Jamaica', city: 'Spanish Town', f: 67, t: 'national', gd: 'female', a: 24, label: 'Promised Land / Columbia', mgr: 'Kwame Bennett', p: ['spiritual', 'humble', 'gifted'], bio: 'Wrote a Grammy-winning reggae record before she turned twenty. Spanish Town\'s brightest export.' },
  { id: 'masicka', n: 'Masicka', rn: 'Javaun Fearon', g: 'dancehall', c: 'Jamaica', city: 'Kingston', f: 69, t: 'national', gd: 'male', a: 34, label: 'Genahsyde', crew: 'Genahsyde', mgr: 'Kwame Bennett', p: ['intense', 'loyal', 'relentless'], bio: 'Dancehall\'s hardest working lyricist. Built a career on consistency while everyone else chased a single.' },
  { id: 'vybz_kartel', n: 'Vybz Kartel', rn: 'Adidja Azim Palmer', g: 'dancehall', c: 'Jamaica', city: 'Kingston', f: 81, t: 'national', gd: 'male', a: 48, label: 'Adidjahiem Records', crew: 'Gaza', mgr: 'Kwame Bennett', p: ['iconic', 'controversial', 'prolific'], bio: 'The most influential dancehall artist of the modern era. Released classics from a cell for over a decade.' },
  { id: 'bad_bunny', n: 'Bad Bunny', rn: 'Benito Antonio Martínez Ocasio', g: 'trap', c: 'Puerto Rico', city: 'San Juan', f: 93, t: 'international', gd: 'male', a: 30, label: 'Rimas Entertainment', mgr: 'Noah Assad', p: ['original', 'political', 'unstoppable'], bio: 'Took Spanish-language music to the top of the global charts and refused to translate for anyone.' },
  { id: 'rauw_alejandro', n: 'Rauw Alejandro', rn: 'Raúl Alejandro Ojeda Rosado', g: 'trap', c: 'Puerto Rico', city: 'San Juan', f: 82, t: 'international', gd: 'male', a: 31, label: 'Duars / Sony', mgr: 'Noah Assad', p: ['smooth', 'experimental', 'charismatic'], bio: 'Reggaeton with synths borrowed from 80s pop and a dancer\'s sense of timing.' },
  { id: 'anuel', n: 'Anuel AA', rn: 'Emmanuel Gazmey Santiago', g: 'trap', c: 'Puerto Rico', city: 'Carolina', f: 78, t: 'national', gd: 'male', a: 32, label: 'Real Hasta La Muerte', crew: 'Real Hasta La Muerte', mgr: 'Noah Assad', p: ['confrontational', 'resilient', 'prolific'], bio: 'Helped define Latin trap, then came home from prison and immediately had the biggest year of his career.' },
  { id: 'daddy_yankee', n: 'Daddy Yankee', rn: 'Ramón Luis Ayala Rodríguez', g: 'dancehall', c: 'Puerto Rico', city: 'San Juan', f: 85, t: 'international', gd: 'male', a: 48, label: 'El Cartel Records', mgr: 'Noah Assad', p: ['veteran', 'strategic', 'principled'], bio: 'The King of Reggaeton. Made the genre global, then retired at the top of it.' },
  { id: 'j_balvin', n: 'J Balvin', rn: 'José Álvaro Osorio Balvín', g: 'dancehall', c: 'Colombia', city: 'Medellín', f: 85, t: 'international', gd: 'male', a: 39, label: 'Sueños Globales', mgr: 'Noah Assad', p: ['colourful', 'strategic', 'polished'], bio: 'Medellín\'s global ambassador. Made reggaeton a design-led, worldwide pop proposition.' },
  { id: 'karol_g', n: 'Karol G', rn: 'Carolina Giraldo Navarro', g: 'dancehall', c: 'Colombia', city: 'Medellín', f: 89, t: 'international', gd: 'female', a: 33, label: 'Bichota Records', mgr: 'Noah Assad', p: ['empowering', 'driven', 'honest'], bio: 'Bichota. Filled stadiums across Latin America and became the first woman to headline some of them.' },
  { id: 'ozuna', n: 'Ozuna', rn: 'Juan Carlos Ozuna Rosado', g: 'dancehall', c: 'Puerto Rico', city: 'San Juan', f: 81, t: 'international', gd: 'male', a: 32, label: 'Aura Music', mgr: 'Noah Assad', p: ['melodic', 'prolific', 'reliable'], bio: 'One of the most streamed Latin artists ever, mostly by never stopping.' },
  { id: 'anitta', n: 'Anitta', rn: 'Larissa de Macedo Machado', g: 'dancehall', c: 'Brazil', city: 'Rio de Janeiro', f: 85, t: 'international', gd: 'female', a: 31, label: 'Floresta / Republic', mgr: 'Noah Assad', p: ['ambitious', 'multilingual', 'strategic'], bio: 'Took Brazilian funk worldwide by learning the language of every market she wanted to enter.' },
  { id: 'emicida', n: 'Emicida', rn: 'Leandro Roque de Oliveira', g: 'conscious', c: 'Brazil', city: 'São Paulo', f: 71, t: 'national', gd: 'male', a: 39, label: 'Laboratório Fantasma', crew: 'Laboratório Fantasma', mgr: 'Paulo Ribeiro', p: ['principled', 'cerebral', 'community_first'], bio: 'São Paulo rapper, presenter and label owner. Makes social critique sound like poetry rather than a lecture.' },
  { id: 'criolo', n: 'Criolo', rn: 'Kleber Cavalcante Gomes', g: 'conscious', c: 'Brazil', city: 'São Paulo', f: 68, t: 'national', gd: 'male', a: 48, label: 'Oloko Records', mgr: 'Paulo Ribeiro', p: ['poetic', 'respected', 'independent'], bio: 'Gravitas personified. One of the few Brazilian rappers critics and street audiences agree on.' },

  // ─── EUROPE ─────────────────────────────────────────────────────────────
  { id: 'booba', n: 'Booba', rn: 'Élie Yaffa', g: 'hip_hop', c: 'France', city: 'Paris', f: 79, t: 'national', gd: 'male', a: 48, label: '92i / Tallac', crew: '92i', mgr: 'Karim Bouzid', p: ['ruthless', 'strategic', 'pioneering'], bio: 'The Duke of Boulogne. Turned French rap into a serious commercial industry and has outlasted every rival.' },
  { id: 'ninho', n: 'Ninho', rn: 'William Nzobazola', g: 'hip_hop', c: 'France', city: 'Paris', f: 77, t: 'national', gd: 'male', a: 28, label: 'Rec. 118 / Warner', mgr: 'Karim Bouzid', p: ['prolific', 'melodic', 'quiet'], bio: 'The most streamed rapper in France, with a run of diamond albums and almost no public appearances.' },
  { id: 'aya_nakamura', n: 'Aya Nakamura', rn: 'Aya Danioko', g: 'afrobeats', c: 'France', city: 'Paris', f: 81, t: 'international', gd: 'female', a: 29, label: 'Rec. 118 / Warner', mgr: 'Karim Bouzid', p: ['confident', 'unbothered', 'original'], bio: 'The most listened-to French-language artist in the world. Turned a Malian-rooted flow into global pop.' },
  { id: 'damso', n: 'Damso', rn: 'William Kalubi', g: 'hip_hop', c: 'France', city: 'Paris', f: 75, t: 'national', gd: 'male', a: 32, label: '92i / Capitol', mgr: 'Karim Bouzid', p: ['cerebral', 'dark', 'meticulous'], bio: 'Brussels-born writer with one of the sharpest pens in Francophone rap and a taste for uncomfortable subjects.' },
  { id: 'jul', n: 'Jul', rn: 'Julien Mari', g: 'hip_hop', c: 'France', city: 'Marseille', f: 75, t: 'national', gd: 'male', a: 34, label: 'D\'Or et de Platine', mgr: 'Karim Bouzid', p: ['prolific', 'independent', 'loyal'], bio: 'Marseille\'s most prolific artist. Releases albums the way other people release singles, and his fans buy all of them.' },
  { id: 'sch', n: 'SCH', rn: 'Julien Schwarzer', g: 'hip_hop', c: 'France', city: 'Marseille', f: 73, t: 'national', gd: 'male', a: 31, label: 'Maison Baron Rouge', mgr: 'Karim Bouzid', p: ['cinematic', 'dark', 'precise'], bio: 'Marseille noir. Raps like he is narrating a film he also produced.' },
  { id: 'capital_bra', n: 'Capital Bra', rn: 'Vladislav Balovatsky', g: 'hip_hop', c: 'Germany', city: 'Berlin', f: 73, t: 'national', gd: 'male', a: 29, label: 'Bra Music', mgr: 'Lukas Weber', p: ['prolific', 'competitive', 'strategic'], bio: 'Held the German singles chart hostage for years, often with more than one record in the top five at once.' },
  { id: 'raf_camora', n: 'RAF Camora', rn: 'Raphael Ragucci', g: 'hip_hop', c: 'Germany', city: 'Berlin', f: 73, t: 'national', gd: 'male', a: 40, label: 'Indipendenza', mgr: 'Lukas Weber', p: ['strategic', 'versatile', 'veteran'], bio: 'Austrian-born, Berlin-based. Raps, sings and produces, and has had a hand in most German rap hits of the last decade.' },
  { id: 'ufo361', n: 'Ufo361', rn: 'Ufuk Bayraktar', g: 'trap', c: 'Germany', city: 'Berlin', f: 69, t: 'national', gd: 'male', a: 36, label: 'Stay High', crew: 'Stay High', mgr: 'Lukas Weber', p: ['fashionable', 'melodic', 'independent'], bio: 'Kreuzberg rapper who fused trap with Berlin club culture and built his own label to keep it.' },
  { id: 'luciano', n: 'Luciano', rn: 'Patrick Großmann', g: 'trap', c: 'Germany', city: 'Berlin', f: 71, t: 'national', gd: 'male', a: 30, label: 'Locosquad', crew: 'Locosquad', mgr: 'Lukas Weber', p: ['distinctive', 'hardworking', 'loyal'], bio: 'Bautzen-born, Berlin-made. One of the most recognisable voices in German rap.' },
  { id: 'frenna', n: 'Frenna', rn: 'Francis Edusei', g: 'afrobeats', c: 'Netherlands', city: 'Amsterdam', f: 69, t: 'national', gd: 'male', a: 33, label: 'Top Notch', mgr: 'Daan Visser', p: ['charismatic', 'consistent', 'business_minded'], bio: 'Amsterdam-Zuidoost\'s biggest rap export. Turned Dutch-language street rap into arena shows.' },
  { id: 'lil_kleine', n: 'Lil Kleine', rn: 'Jorik Scholten', g: 'hip_hop', c: 'Netherlands', city: 'Amsterdam', f: 66, t: 'national', gd: 'male', a: 30, label: 'Top Notch', mgr: 'Daan Visser', p: ['melodic', 'troubled', 'gifted'], bio: 'Wrote some of the most streamed Dutch records ever, in between a very public personal life.' },
  { id: 'rosalia', n: 'Rosalía', rn: 'Rosalía Vila Tobella', g: 'pop_rap', c: 'Spain', city: 'Barcelona', f: 87, t: 'international', gd: 'female', a: 32, label: 'Columbia', mgr: 'Noah Assad', p: ['visionary', 'exacting', 'restless'], bio: 'Took flamenco technique and rebuilt it as avant-garde pop. Nobody else sounds remotely like her.' },
  { id: 'c_tangana', n: 'C. Tangana', rn: 'Antón Álvarez Alfaro', g: 'pop_rap', c: 'Spain', city: 'Madrid', f: 75, t: 'national', gd: 'male', a: 34, label: 'Sony', mgr: 'Noah Assad', p: ['reinventing', 'cerebral', 'stylish'], bio: 'Started in Spanish trap and walked away from it to make a record about the history of Spanish music.' },
  { id: 'sfera', n: 'Sfera Ebbasta', rn: 'Gionata Boschetti', g: 'trap', c: 'Italy', city: 'Milan', f: 75, t: 'national', gd: 'male', a: 31, label: 'Billion Headz', crew: 'Billion Headz', mgr: 'Marco Rossi', p: ['influential', 'reserved', 'commercial'], bio: 'The artist who made Italian trap a genuine mainstream force, and then filled arenas with it.' },
  { id: 'geolier', n: 'Geolier', rn: 'Emanuele Palumbo', g: 'trap', c: 'Italy', city: 'Naples', f: 71, t: 'national', gd: 'male', a: 24, label: 'Billion Headz', crew: 'Billion Headz', mgr: 'Marco Rossi', p: ['authentic', 'proud', 'loyal'], bio: 'Secondigliano-raised. Raps in Neapolitan dialect about a neighbourhood he refuses to sanitise.' },
  { id: 'marracash', n: 'Marracash', rn: 'Fabio Bartolo Rizzo', g: 'hip_hop', c: 'Italy', city: 'Milan', f: 73, t: 'national', gd: 'male', a: 45, label: 'Island / Universal', mgr: 'Marco Rossi', p: ['cerebral', 'veteran', 'principled'], bio: 'Milanese rapper whose late-career albums are the most critically respected in Italian hip hop.' },
  { id: 'yung_lean', n: 'Yung Lean', rn: 'Jonatan Aron Leandoer Håstad', g: 'trap', c: 'Sweden', city: 'Stockholm', f: 66, t: 'national', gd: 'male', a: 28, label: 'Sad Boys', crew: 'Sad Boys', mgr: 'Axel Johansson', p: ['original', 'melancholy', 'influential'], bio: 'Invented a whole internet aesthetic from a Stockholm suburb and then outlived the joke.' },
  { id: 'bladee', n: 'Bladee', rn: 'Benjamin Reichwald', g: 'trap', c: 'Sweden', city: 'Stockholm', f: 64, t: 'national', gd: 'male', a: 30, label: 'Year0001', crew: 'Drain Gang', mgr: 'Axel Johansson', p: ['elusive', 'prolific', 'original'], bio: 'Drain Gang\'s most prolific voice. Built an entire subculture out of distortion and detachment.' },
  { id: 'soolking', n: 'Soolking', rn: 'Abderraouf Derradji', g: 'hip_hop', c: 'Algeria', city: 'Algiers', f: 73, t: 'national', gd: 'male', a: 35, label: 'Affranchis Music', mgr: 'Karim Bouzid', p: ['melodic', 'political', 'charismatic'], bio: 'Algiers rapper who became one of France\'s biggest streaming artists without ever moving his base.' },
  { id: 'elgrande_toto', n: 'ElGrandeToto', rn: 'Taha Fahsi', g: 'hip_hop', c: 'Morocco', city: 'Casablanca', f: 71, t: 'national', gd: 'male', a: 29, label: 'Independent', mgr: 'Youssef Alami', p: ['provocative', 'melodic', 'independent'], bio: 'Casablanca rapper who made Moroccan rap the biggest in North Africa, mostly by ignoring what he was told to do.' },
  { id: 'wegz', n: 'Wegz', rn: 'Ahmed Ali', g: 'trap', c: 'Egypt', city: 'Alexandria', f: 70, t: 'national', gd: 'male', a: 28, label: 'Independent', mgr: 'Youssef Alami', p: ['streetwise', 'melodic', 'original'], bio: 'Alexandria\'s biggest rap export. Took Egyptian street slang to the top of the regional charts.' },
  { id: 'mohamed_ramadan', n: 'Mohamed Ramadan', rn: 'Mohamed Ramadan Mahmoud Hegazy', g: 'trap', c: 'Egypt', city: 'Cairo', f: 76, t: 'national', gd: 'male', a: 36, label: 'Independent', mgr: 'Youssef Alami', p: ['showman', 'prolific', 'commercial'], bio: 'Actor and rapper who makes Egyptian trap at a volume nobody else can match, on screen or off it.' },
  { id: 'divine', n: 'Divine', rn: 'Vivian Wilson Fernandes', g: 'hip_hop', c: 'India', city: 'Mumbai', f: 70, t: 'national', gd: 'male', a: 34, label: 'Gully Gang', crew: 'Gully Gang', mgr: 'Rohan Mehta', p: ['authentic', 'gritty', 'independent'], bio: 'Mumbai\'s defining rapper. Put the city\'s gully slang on global playlists and kept the accent intact.' },
  { id: 'badshah', n: 'Badshah', rn: 'Aditya Prateek Singh Sisodia', g: 'pop_rap', c: 'India', city: 'Delhi', f: 75, t: 'national', gd: 'male', a: 39, label: 'Sony Music India', mgr: 'Rohan Mehta', p: ['commercial', 'prolific', 'polished'], bio: 'The most-played rapper in India. Makes records built for weddings, films and stadiums at once.' },
  { id: 'raftaar', n: 'Raftaar', rn: 'Dilin Nair', g: 'hip_hop', c: 'India', city: 'Delhi', f: 71, t: 'national', gd: 'male', a: 36, label: 'Kalamkaar', crew: 'Kalamkaar', mgr: 'Rohan Mehta', p: ['technical', 'competitive', 'outspoken'], bio: 'Delhi lyricist who runs his own label and has spent years arguing for rap as a craft rather than a trend.' },
  { id: 'jay_park', n: 'Jay Park', rn: 'Park Jae-beom', g: 'hip_hop', c: 'South Korea', city: 'Seoul', f: 78, t: 'national', gd: 'male', a: 37, label: 'MORE VISION', crew: 'AOMG', mgr: 'Kim Ji-hoon', p: ['versatile', 'business_minded', 'hardworking'], bio: 'Built two of Korea\'s most important hip hop labels from scratch after being dropped by a boy band.' },
  { id: 'zico', n: 'Zico', rn: 'Woo Ji-ho', g: 'hip_hop', c: 'South Korea', city: 'Seoul', f: 75, t: 'national', gd: 'male', a: 32, label: 'KOZ Entertainment', crew: 'KOZ', mgr: 'Kim Ji-hoon', p: ['creative', 'independent', 'sharp'], bio: 'Producer, rapper and label founder. Has a habit of topping Korean charts with whatever he feels like making.' },
  { id: 'bibi', n: 'BIBI', rn: 'Kim Hyung-seo', g: 'pop_rap', c: 'South Korea', city: 'Seoul', f: 67, t: 'national', gd: 'female', a: 26, label: 'Feel Ghood Music', mgr: 'Kim Ji-hoon', p: ['unconventional', 'bold', 'creative'], bio: 'Writes and produces her own records, which is still unusual enough in Seoul to count as a statement.' },
  { id: 'awich', n: 'Awich', rn: 'Akiko Urasaki', g: 'hip_hop', c: 'Japan', city: 'Naha', f: 64, t: 'national', gd: 'female', a: 38, label: 'BPM Tokyo', mgr: 'Kenji Sato', p: ['fierce', 'independent', 'veteran'], bio: 'Okinawan rapper who spent years in Atlanta and came home to become the most respected voice in Japanese rap.' },
  { id: 'gai', n: 'GAI', rn: 'Zhou Yan', g: 'hip_hop', c: 'China', city: 'Chongqing', f: 70, t: 'national', gd: 'male', a: 37, label: 'Door & Key', mgr: 'Li Wei', p: ['proud', 'traditional', 'charismatic'], bio: 'Chongqing rapper who fused Sichuan dialect and traditional Chinese melody into a mainstream sound.' },
  { id: 'vava', n: 'VaVa', rn: 'Mao Yanqi', g: 'hip_hop', c: 'China', city: 'Chengdu', f: 65, t: 'national', gd: 'female', a: 29, label: 'Hip-Hop Culture', mgr: 'Li Wei', p: ['confident', 'polished', 'ambitious'], bio: 'One of the most visible women in Chinese rap, on stage and in the mainstream media that follows it.' },
  { id: 'jackson_wang', n: 'Jackson Wang', rn: 'Wang Jia-er', g: 'pop_rap', c: 'China', city: 'Hong Kong, China', f: 79, t: 'national', gd: 'male', a: 30, label: 'Team Wang', crew: 'Team Wang', mgr: 'Li Wei', p: ['ambitious', 'disciplined', 'international'], bio: 'Hong Kong, China-born performer who built Team Wang into a label, a fashion house and a global touring operation.' },
  { id: 'lexie_liu', n: 'Lexie Liu', rn: 'Liu Yuxin', g: 'pop_rap', c: 'China', city: 'Changsha', f: 62, t: 'national', gd: 'female', a: 25, label: '88rising', mgr: 'Li Wei', p: ['experimental', 'multilingual', 'creative'], bio: 'Writes in Mandarin and English over electronic production that owes more to art school than to the club.' },
  { id: 'kid_laroi', n: 'The Kid LAROI', rn: 'Charlton Kenneth Jeffrey Howard', g: 'pop_rap', c: 'Australia', city: 'Sydney', f: 83, t: 'international', gd: 'male', a: 21, label: 'Columbia', mgr: 'Erin Larsen', p: ['young', 'ambitious', 'emotional'], bio: 'Sydney teenager who went from SoundCloud to global number ones in about two years.' },
  { id: 'sampa_the_great', n: 'Sampa the Great', rn: 'Sampa Tembo', g: 'conscious', c: 'Australia', city: 'Sydney', f: 65, t: 'national', gd: 'female', a: 32, label: 'Independent', mgr: 'Zanele Mthembu', p: ['principled', 'poetic', 'independent'], bio: 'Zambian-born, Sydney-based. Won Australia\'s biggest music prize with an album about not belonging.' },

  // ─── THE OLD GUARD ──────────────────────────────────────────────────────
  // Kept because they anchor the top of the game: the people whose cosign is
  // the end of the ladder.
  { id: 'sarkodie_real', n: 'Sarkodie', rn: 'Michael Owusu Addo', g: 'hip_hop', c: 'Ghana', city: 'Accra', f: 86, t: 'international', gd: 'male', a: 39, label: 'SarkCess Music', crew: 'SarkNation', mgr: 'Angel Town', p: ['competitive', 'proud', 'strategic'], bio: 'Tema-born heavyweight and the most decorated rapper in African history. Semi-retired, still drops heat without warning.' },
  { id: 'kwesi_arthur_real', n: 'Kwesi Arthur', rn: 'Emmanuel Kwesi Arthur', g: 'hip_hop', c: 'Ghana', city: 'Tema', f: 52, t: 'national', gd: 'male', a: 30, label: 'Ground Up Chale', crew: 'Ground Up', mgr: 'Kofi Asare', p: ['passionate', 'loyal', 'humble'], bio: 'Grimy Tema lyricist with a raw delivery. Respected in the underground and still chasing the mainstream moment.' },
  { id: 'beyonce_real', n: 'Beyoncé', rn: 'Beyoncé Giselle Knowles-Carter', g: 'pop_rap', c: 'USA', city: 'Houston', f: 99, t: 'international', gd: 'female', a: 43, label: 'Parkwood / Columbia', crew: 'Parkwood', mgr: 'Parkwood Entertainment', p: ['flawless', 'private', 'iconic'], bio: 'Global icon and the most exacting live performer in popular music. Effectively unreachable, which is rather the point.' , closed: true },
  { id: 'jay_z_real', n: 'Jay-Z', rn: 'Shawn Corey Carter', g: 'hip_hop', c: 'USA', city: 'New York', f: 96, t: 'international', gd: 'male', a: 55, label: 'Roc Nation', crew: 'Roc Nation', mgr: 'Roc Nation', p: ['mogul', 'strategic', 'unforgiving'], bio: 'Roc Nation founder and the blueprint for rapper-as-owner. Offers deals when he smells potential and remembers everything.' , closed: true, role: 'label_ceo' },
  { id: 'kendrick_real', n: 'Kendrick Lamar', rn: 'Kendrick Lamar Duckworth', g: 'conscious', c: 'USA', city: 'Los Angeles', f: 96, t: 'international', gd: 'male', a: 37, label: 'pgLang / Interscope', crew: 'pgLang', mgr: 'pgLang', p: ['introspective', 'competitive', 'cerebral'], bio: 'Compton\'s Pulitzer winner. Does not answer half-hearted outreach, and does not need to.' , closed: true },
];

// ─── EXPANSION ────────────────────────────────────────────────────────────

const TIER_ORDER: Record<NPCTier, number> = { international: 0, national: 1, local: 2 };

function managerFame(artistFame: number): number {
  return Math.max(10, Math.min(80, Math.round(artistFame * 0.46)));
}

function managerPersonality(artist: Seed): string[] {
  // Managers are the opposite of their client on the axis that matters most:
  // the louder the artist, the quieter and more transactional the manager.
  if (artist.p.includes('volatile') || artist.p.includes('confrontational')) {
    return ['unflappable', 'transactional', 'protective'];
  }
  if (artist.p.includes('introspective') || artist.p.includes('private')) {
    return ['aggressive', 'connected', 'loyal'];
  }
  return ['sharp', 'all_business', 'protective'];
}

/**
 * Turn the compact seeds into full roster records.
 *
 * Every artist with a named manager also emits that manager as a real NPC, so
 * the profile page can link to them and the feature-negotiation system can use
 * their pull. The manager's id is deterministic (`mgr_<artistId>`) so saves
 * survive a reload.
 */
export function buildRealArtists(): NPC[] {
  const out: NPC[] = [];
  const seenManagers = new Map<string, string>(); // manager name → id

  for (const s of SEEDS) {
    let managerId: string | undefined;

    if (s.mgr) {
      const existing = seenManagers.get(s.mgr);
      if (existing) {
        managerId = existing;
      } else {
        managerId = `mgr_${s.id}`;
        seenManagers.set(s.mgr, managerId);
        out.push({
          id: managerId,
          name: s.mgr,
          tier: s.t === 'international' ? 'national' : s.t,
          role: 'manager',
          personality: managerPersonality(s),
          country: s.c,
          city: s.city,
          relationshipScore: 0,
          relationshipStage: 'acquainted',
          memoryLog: [],
          fame: managerFame(s.f),
          isAvailable: s.f < 92,
          gender: 'prefer_not_to_say',
          age: 30 + Math.round(s.f * 0.12),
          bio: `Manages ${s.n}. Handles every feature request, booking and business conversation before it reaches the artist.`,
        });
      }
    }

    out.push({
      id: s.id,
      name: s.n,
      realName: s.rn,
      tier: s.t,
      role: s.role ?? 'artist',
      personality: s.p,
      genre: s.g,
      country: s.c,
      city: s.city,
      relationshipScore: 0,
      relationshipStage: 'acquainted',
      memoryLog: [],
      fame: s.f,
      isAvailable: s.closed !== true,
      gender: s.gd,
      age: s.a,
      bio: s.bio,
      managerId,
      team: {
        managerId,
        managerName: s.mgr,
        label: s.label,
        crew: s.crew,
        producer: s.prod,
        extras: s.extras,
      },
    });
  }

  // Most famous first, so anything that takes a slice gets the headliners.
  out.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.fame - a.fame);
  return out;
}

/** Just the artists, without the generated managers. Handy for tests and UI. */
export function realArtistCount(): { artists: number; managers: number } {
  const managers = new Set(SEEDS.map((s) => s.mgr).filter(Boolean)).size;
  return { artists: SEEDS.length, managers };
}
