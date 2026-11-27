# RAP LIFE — The Next Level Plan

> How to turn RAP LIFE from a deep simulation with a city attached into a game people can't put down, and one a buyer, publisher or investor would value at **$500,000 or more**.
>
> Written 26 Nov 2026, after reading the whole repo and walking the city in a browser.
> Read it alongside **ROADMAP.md** (the long-term vision and what's done) and **STORY_BIBLE.md** (the story).
> To pick up any step, say **"continue with NL-1.1"** (or any step ID in section 9).

---

## Contents

0. [The short version](#0-the-short-version)
1. [Where the game really stands](#1-where-the-game-really-stands)
2. [What "worth $500,000" actually means](#2-what-worth-500000-actually-means)
3. [The hook: why this game can stand out](#3-the-hook-why-this-game-can-stand-out)
4. [Pillar 1: missions people want to play](#4-pillar-1--missions-people-want-to-play)
5. [Pillar 2: a city that looks and feels alive](#5-pillar-2--a-city-that-looks-and-feels-alive)
6. [Pillar 3: reasons to come back every day](#6-pillar-3--reasons-to-come-back-every-day)
7. [Pillar 4: business, legal and launch](#7-pillar-4--business-legal-and-launch)
8. [Connectors, tools and people needed](#8-connectors-tools-and-people-needed)
9. [Step-by-step build order](#9-step-by-step-build-order)
10. [When is it "next level"? (checklist)](#10-when-is-it-next-level-checklist)
11. [How to pick this up again](#11-how-to-pick-this-up-again)

---

## 0. The short version

1. **Fix the missions first.** They're the biggest reason the game doesn't grab people, and fixing them needs no new art. Every mission gets real gameplay (driving against the clock, chases, rap battles, sneaking, live shows), a twist, and a payoff you can see in the world.
2. **Give the city an art pass, not a rewrite.** Stay on three.js. Replace the shapes made in code with real 3D models, add real light, shadows and weather, and build **one district to final quality first** before touching the rest.
3. **Make the world react to your fame.** Your song on a stranger's radio, your face on a billboard, people stopping you for selfies. That feeling is what brings people back.
4. **Clean up the legal and technical basics before selling anything.** Take out real brands and real artists, put gambling behind 18+, split the 23,000-line store file, and add crash reports and analytics.
5. **Prove it with numbers.** Soft-launch in Ghana and Nigeria, measure who comes back, fix what's wrong, then go global, starting with the diaspora.

---

## 1. Where the game really stands

### What's already strong (keep all of it)

- **Depth few indie games have:** about 100,000 lines of TypeScript covering a music career, charts, a label, shows, tours, social apps, money (bank, markets, property, businesses), a courthouse, award seasons and a journal of memories.
- **Real creative tools:** the VOX booth (it records your actual voice, scores each take, has presets and punch-in), STUDIO PRO mixing, a beat maker with a real drum kit, Director's Cut video editing, and the Academy.
- **A real story engine:** "Akwaaba Tonight", with six seats (Rapper, Producer, Manager, Singer, Director, DJ), Act I and Act II, a five-ending gala, and characters who remember what you did.
- **A big world:** 16 districts (1.2 km across), walkable interiors for every key building, day and night, traffic lights, traffic, pedestrians with daily routines, doors you can knock on, land plots and auctions, forests, a harbour, an airport, a world built per country, and local currencies.
- **Driving:** a chase camera and a cockpit view, phone pedals, car dealerships and test drives.
- **Docs that make the project easy to hand over:** ROADMAP, STORY_BIBLE, UPGRADE_NOTES and SETUP. Buyers notice that.

### What holds it back

| Problem | What I saw | Why it matters |
|---|---|---|
| **Missions are flat** | All 4 city missions (`src/story/content/missions.ts`) work the same way: a call, a drive, walk up, then pick one of two lines. No skill, no risk, no clock, no surprise. | Nothing is *played*. Rule 4 of the Story Bible ("gameplay is inside the story") isn't true for missions yet. |
| **The city looks like a prototype** | Everything is built from boxes, capsules and canvas textures. Flat light, no real shadows, low-poly trees, box buildings, and characters made of capsules. | Screenshots and clips are what sell a game. This look won't stop anyone scrolling. |
| **Streets feel empty** | One or two people in view, and a few cars. | A city that isn't alive doesn't feel like a world worth living in. |
| **The menus outweigh the world** | Most systems live on dashboard screens, so the city is somewhere you walk between menus. | The best moments should happen *out in the world*. |
| **Tech debt** | `src/store/gameStore.ts` is **23,483 lines**. There are 3 test files. The single-file build inlines everything. | It's hard to change safely and buyers will flag it. A single file also can't carry real 3D assets. |
| **Legal blockers** | Real car and watch brands (Toyota, Mercedes, Porsche, Ferrari, Lamborghini, Rolls-Royce, Rolex, Patek Philippe, Richard Mille). Real streaming brands (Spotify, Apple Music, Boomplay and others). Real artists' stage *and legal* names in `src/data/realArtists.ts`: the game shows fictional aliases, but the real names still ship inside the code. Plus a casino and a sportsbook. | Each of these can block a sale, a store listing or a publisher deal. |

---

## 2. What "worth $500,000" actually means

A game's value comes from **what it earns and how many people keep playing**, not from how many features it has. There are three ways to get to that number:

1. **Sell the game (or the studio).** Small profitable apps and games often sell for roughly **2–4× their yearly profit**. That's a rule of thumb, not a promise. On that rule, $500,000 means about **$125,000–$250,000 profit a year**, or roughly $10,000–$20,000 a month.
2. **Raise money or sign a publisher deal at a $500,000+ valuation.** The deciding factors are the **retention curve** (do players come back on day 1, 7 and 30?) and growth. A buyer can value a game that keeps players well even before it earns much.
3. **Earn it directly** over the game's life.

**What to measure.** These are the kind of targets mobile publishers look for. Treat them as goals to beat, not guarantees.

| Metric | Target |
|---|---|
| Day-1 retention | 40%+ |
| Day-7 retention | 15%+ |
| Day-30 retention | 6%+ |
| Average session | 15+ minutes |
| Crash-free sessions | 99.5%+ |

**Simple revenue maths (an example, not a forecast):** daily players × average revenue per daily player × 365.
For example, 20,000 daily players × $0.05 = $1,000 a day, or about $365,000 a year in revenue.
Average revenue per player in West Africa is lower than in the US or UK. That's why the plan launches in Ghana and Nigeria to *prove the fun*, then grows into the diaspora and global markets to *earn*.

**So every step in this plan has to move one of four things:** fun (retention), looks (installs from screenshots and clips), fair business (revenue without pay-to-win), and clean foundations (legal, stability and code a buyer can trust).

---

## 3. The hook: why this game can stand out

**"The first open-world music-life game set in a West African city."**

- Afrobeats and African hip-hop have a global audience, but no big game lets you *live* that life in Accra, Lagos or Kumasi.
- The story ("one song every person knows, one voice nobody can name") is the kind of hook that works in a trailer.
- The diaspora in the UK, US and Europe is a ready audience that pays in stronger currencies.
- It gives the press an easy angle and partners a natural fit: local artists, radio stations, fashion labels and phone makers. Partners appear only as labelled ads, never as fake "real" content.

**One-line pitch:** *Make the music, make the moves, from Mama's Kitchen to the stadium, in a city that remembers everything you do.*

---

## 4. Pillar 1 — Missions people want to play

### 4.1 Why today's missions feel boring

Every mission is the same loop: **phone rings → drive → walk up → read → pick A or B → small stat change.**
The drive is just transport. The meeting is just text. There's nothing to get *good* at, nothing that can go *wrong* while you play, and nothing in the world *changes* afterwards. "Meet and greet" is the right description.

### 4.2 The mission formula

Every mission is built from five parts:

1. **Hook:** someone you care about needs something *now*, delivered the way the Story Bible already sets out (a call at 2 a.m., a voice note, someone waiting outside).
2. **Go:** travel is part of the challenge (a clock, rain, traffic, someone following you), not filler.
3. **Play:** 2–3 **gameplay beats** that get harder, using the toolbox below. Your skill decides the quality (gold, silver, bronze or miss).
4. **Twist:** something you didn't expect turns up halfway through.
5. **Payoff and choice:** a decision with weight, then a **visible change in the world** (radio, billboards, NPC reactions, a door that opens or closes) as well as the stat change.

**The five-ingredient check** (a mission ships only if it has all five): **stakes · a clock · skill · a surprise · a change you can see.**

### 4.3 The gameplay toolbox (verbs)

Missions are built by combining verbs. Each verb is built once and reused in dozens of missions.

| Verb | How it plays | Existing code to build on |
|---|---|---|
| **Timed run** | Get somewhere before a deadline. Traffic, rain and roadworks get in the way, and shortcuts are rewarded. | `world/gps.ts`, `traffic.ts`, `sim.ts` |
| **Chase / escape** | Lose bloggers, a rival's crew or overexcited fans by breaking line of sight, using alleys or blending into traffic. | traffic, camera, `pedestrianTraffic.ts` |
| **Tail** | Follow a car or a person without being spotted, with a "suspicion" meter. | traffic, people schedules |
| **Escort / VIP driver** | Drive a star or a nervous artist. Driving style affects their mood, and you have to avoid paparazzi. | car controls, story bonds |
| **Rap battle** | Pick bars and land them on the beat with timing taps. A crowd meter reacts live, the opponent's lines use your memory flags, and you answer with comebacks. | `sim/freestyle.ts`, `beef.ts`, audio beat engine |
| **Live show** | A rhythm performance of your setlist (hits, ad-libs, crowd call-and-response) in front of a 3D crowd whose size you earned. | `sim/shows.ts`, `world/Stage.tsx`, beat engine |
| **Booth under the clock** | Record a real take in VOX before time runs out. The take score becomes the mission's quality. | VOX booth, `audio/take.ts` |
| **Beat-off / DJ set** | Build a beat in a few minutes, or crossfade and drop on the beat for a crowd. | beat maker, `audio/beat.ts` |
| **Sneak** | Get through a building with guards' vision cones and sweeping cameras, or talk your way in instead. | interiors (`world/interior.ts`) |
| **Search / investigate** | Find clues in a room, photograph evidence and pin it to an evidence board. | interiors, phone camera, journal |
| **Film it** | Hit your marks, frame a shot or capture a moment, judged on angle, light and timing. | `world/shootcam.ts`, Director's Cut |
| **Crowd work** | Win over a crowd at a market or a party with timed interactions (handshakes, photos, a quick freestyle). | people, fans system |
| **Negotiate** | Offer and counter-offer while reading *tells* in the other person's body language. | wrestling "tells", `sim/offers.ts`, `featureTerms.ts` |
| **Interview under pressure** | Answer live while a comment feed reacts. Lies can come back later. | `sim/interviews.ts`, social live |
| **Contract spotting** | Read a deal and tap the bad clauses before time runs out. A lawyer helps if your bond is high. | `sim/deals.ts`, court |
| **Promo campaign** | A multi-day campaign: poster runs, radio, pop-ups and posts move a live ticket counter. | `sim/ticketing.ts`, social |

### 4.4 Ten flagship missions

These are written to plug straight into the existing story and cast.

**1. Before Sunrise** *(all seats · Static, Radio K)*
- **Hook:** 2:07 a.m. Static calls. *"Radio K will play us on the Midnight Cypher if the hook is at the station by four."*
- **Play:** ① Drive to Studio 9 in the rain on slippery roads. ② Record the hook in VOX against a 15-minute in-game clock. ③ Race the USB across the city to HOT 101.9 before 4:00.
- **Twist:** a car with tinted windows follows you from the studio. A rival's people want the hook first. Lose them (chase), or let them follow and face them at the station.
- **Choice:** Radio K has room for one version, yours or Static's.
- **Payoff:** you sit in your car outside the station and **hear the hook come on the radio, live, with the DJ talking over it.** How big the boost is depends on the take score and how much time you had left. Arrive late and Radio K plays something else, and Static remembers.

**2. Park Battle** *(all seats · new rival MC)*
- **Hook:** a rival MC calls you out by name in a clip on the social app.
- **Play:** three rounds. Choose bars, land them on the beat and watch the crowd meter. The opponent's bars attack things you *actually did* (for example "signed the bank deal behind your lawyer's back", from memory flags), and you pick the comeback that answers them.
- **Twist:** in round 3 the speaker dies and you finish a cappella. Timing without a beat earns a bonus.
- **Payoff:** a win means the crowd's clip goes viral (fans and fame) and the MC becomes a rival or a friend. A loss starts the "underground road" scene with a mentor (failure makes story).

**3. The Tape Room** *(strongest for the Producer seat · Fiifi, Efua)*
- **Hook:** Fiifi texts a photo of a key card. *"GCS archive. Tonight. Guards change at one."*
- **Play:** get into the GCS tower at night one of three ways: Fiifi's card (sneak), talk past the front desk (a charisma check, and lying costs Integrity), or arrive as Mimi's guest (needs a strong bond). Inside, avoid the guard's flashlight and the sweeping cameras, find the 1999 box, and photograph the ledger page with your phone.
- **Twist:** Efua is in the building, alone and late, listening to a copy of Reel 9. Hide, or step out and talk.
- **Payoff:** a new evidence card, "The Ledger page", opens a branch. If you're caught you aren't arrested: you're walked out, Efua *knows*, and a tense new branch begins. Nobody gets hurt and nobody uses a weapon.

**4. Flashbulbs** *(all seats · triggered by an earlier choice)*
- **Hook:** a blog posts a scandal about you, built from a real past choice. Bloggers on okadas are waiting outside your place.
- **Play:** escape through traffic to somewhere safe, *or* stop and give a statement (interview under pressure).
- **Twist:** one of the okada riders is Fiifi, and he has the real story.
- **Payoff:** tomorrow's headline, the comments and NPC reactions on the street all change depending on how you handled it.

**5. Sold Out** *(all seats · Big Moses)*
- **Hook:** Moses books you at The Stage in 7 game days. *"Fill it, or you pay the difference."*
- **Play:** a ticket counter stays on the HUD all week. Poster runs (reach the hot spots before rain ruins the posters), a radio interview, a pop-up at Market Square and social posts all sell tickets. *Where and when* matters: the market at noon sells more than a side street at 3 a.m. On show night you play a live rhythm performance in front of a 3D crowd whose size is what you built.
- **Twist:** on day 5 a bigger star announces a show the same night. Move your date (it costs money), go head to head, or bring them on as a surprise guest (needs a bond).
- **Payoff:** a sold-out banner, money and fame. Or a half-empty room and a hard conversation with Moses about the difference.

**6. The Ledger** *(the main mystery as gameplay)*
- An **evidence board** in your home: photos, receipts, royalty statements and voice notes, collected all over the city (the tape room, bank statements through Afia, Ankh's late-night confession, an old newspaper at a market stall).
- Connect the pins to make deductions. A wrong accusation costs trust, and a right one opens the gala endings. This puts the main plot into the player's hands instead of just narrating it.

**7. One Phone Call** *(Static's spiral path)*
- **Hook:** Static has been arrested after a fight at a club.
- **Play:** get to the police station and pay bail, or bring Afia. Ask around at a chop bar to find a witness. The witness's friend runs on an okada, so **tail** him without being seen.
- **Choice:** give the footage you find to the police (Integrity), Radio K (Hustle) or Mama (Heart).
- **Payoff:** Static's arc changes direction, and each choice has its own consequences later.

**8. Shoot Day** *(Director seat and anyone making a video · Selasi)*
- **Play:** scout three locations with Selasi (photograph them with your phone, where light and crowd matter), book extras (NPCs you've bonded with actually turn up), shoot with the 4-angle shoot camera and hit your marks, then finish the edit in Director's Cut.
- **Twist:** the weather turns. A rain shot gets a moody bonus, or you can reschedule (and pay for it).
- **Payoff:** a music video whose quality you *earned*, premiered on the in-game streaming app.

**9. Tro-tro Mate** *(repeatable side job)*
- Drive a tro-tro route, call out destinations and pick up passengers. They talk: small stories, city rumours, and as your fame grows, fans who recognise you.
- Balance staying on schedule against passenger comfort. Very rarely a passenger is an A&R who heard your song.

**10. The Night of Akwaaba** *(the finale, played instead of only read)*
- The red carpet (interviews with flashbulbs going off) → backstage (sneak to the Reel 9 playback booth, or keep your promise and stay in the green room) → the stage (live performance) → the reveal (the big choice) → the drive home with Mama through the night city, with your song on the radio or with silence.
- The 8 gala scenes already written become the script for this set piece.

### 4.5 Fixing the four missions that exist now

Keep the people and the writing, and add the missing gameplay:

| Now | Becomes |
|---|---|
| **Stadium (Moses):** pick "I can fill it" or "not yet" | A **sound check**: play one song live on the empty pitch while the booker watches. Your score decides whether he books you, and boasting raises the bar. |
| **Studio lot (Selasi):** pick "truth" or "sell it" | A **screen test**: hit your marks, deliver the line and react to direction (timing and framing). The clip goes into your video library. |
| **Market (Mimi):** pick "work the square" or "talk to a few" | **Crowd work** against the clock: handshakes, photos, a quick freestyle, learn three names. Real interactions with the NPCs who are actually there. |
| **Bank (Afia):** pick "strike the clause" or "sign" | **Contract spotting**: page six is real. Find the bad clauses before the advisor gets impatient, and Afia gives hints if your bond is strong. |

### 4.6 Street Jobs: missions that never run out

Hand-written missions are the main course. Street Jobs are the **endless side dishes**: generated from what NPCs need, so there's always something to do in 5 minutes.

- **Templates:**
  - Beat drop (deliver a USB across town in X minutes)
  - Session for hire (record a hook for an NPC artist; quality matters)
  - Gig fill-in (an act cancelled; get there in 20 minutes and perform)
  - Battle challenge
  - Poster run
  - VIP driver
  - Okada food delivery for Mama's Kitchen at rush hour
  - Fan shout-out clip at a landmark
  - Lost demo tape
  - Talent scout (find a singer someone heard by following the sound)
- **Modifiers:** night, rain, a rival interfering, a police checkpoint, a VIP passenger, double pay in a rush.
- **Medals:** gold, silver or bronze, with best times saved. Online leaderboards come later.
- **Daily rhythm:** 3 "hot jobs" marked on the map each day, which feed the existing daily goals.
- **Logic rule:** the job pool follows your career. A beginner gets deliveries and open-mic fill-ins, and a star gets VIP events and stadium emergencies.

### 4.7 How it's built (the mission engine)

The story engine already has calls, texts, encounters, conditions, effects and "gameplay tasks with quality tiers". Missions **extend it rather than replace it**:

- A new node kind, **`play`**, with a `task` (verb + settings, such as `{ verb: 'timed_run', to: 'radio', minutes: 25, rain: true }`) and `outcomes` for each medal (`gold | silver | bronze | miss`), each pointing to the next node.
- A **mission runner** in the city: objective text, timer, meters (crowd, suspicion, tickets), checkpoint markers and the GPS route.
- **Retry rule, consistent with the Bible's "no fail screen":** a skill beat can be retried straight away, because it's a game, not a punishment. But the *world clock and the story don't wait*: if you give up, or the window closes, the story takes the "missed" branch and people remember.
- **Missions are data**, written in `src/story/content/` like the arcs, so new ones are quick to write.
- **A mission test harness:** a Playwright script that plays each mission's happy path in CI, so content never silently breaks.

### 4.8 Presentation (what makes it feel like a real game)

- A mission title card (name, who's involved, place).
- In-engine cutscenes with letterbox bars and camera cuts.
- Music stingers when a beat starts, a twist lands or you win.
- Voice lines for the key moments.
- An end card showing the medal, **what changed in the world**, and a one-tap 9:16 clip to share.

---

## 5. Pillar 2 — A city that looks and feels alive

### 5.1 The big decision: stay on three.js (don't port)

**Recommendation: keep the web stack (React + three.js) and upgrade the art and rendering.**

- **Why:** about 100,000 lines of TypeScript, including the audio tools that run in the browser, the story engine and every menu, would have to be rewritten for Unity, Unreal or Godot. That's months of work just to get back to where the game is today. Web also gives one codebase for browser and Android.
- **three.js can look far better than this.** The current look comes from the *assets* (shapes built in code, flat materials), not from the engine. Real models, real light and post-processing make a huge difference. three.js now also has a **WebGPU renderer** with a WebGL fallback.
- **Be honest about the ceiling:** a game running on phones in a browser won't look like GTA V. The target is **stylised, warm and rich**, like a good mobile open-world game. Art direction matters more than polygon count.
- **When to rethink it:** if the game later goes to PC or console with near-photoreal graphics, after funding. Not before.

### 5.2 Art direction: "Accra golden hour"

- **Style:** stylised realism, with warm light, saturated but not cartoonish colours, and clean shapes with lots of detail at street level.
- **Signatures of the place:**
  - hand-painted shop signs and slogans on tro-tros
  - container shops and kiosks
  - umbrellas over market stalls
  - black-and-yellow painted kerbs
  - open gutters with little slab bridges
  - unfinished buildings with rebar on the roof
  - corrugated roofs
  - high compound walls with gates
  - colonial-era facades in the old town
  - glass towers in the business district
- **A colour script per district** (for example: Downtown in warm ochre, Harbour in rust and sea blue, Skyline Heights in glass and steel, Palm Estates in white walls and bougainvillea).
- **Every brand is fictional:** cars, phones, drinks, banks and streaming apps all get invented names with their own logos, the way GTA does it. Fictional brands are also free space for labelled partner ads later.

### 5.3 Light, sky and weather (the biggest visual gain for the effort)

In order of impact:

1. **Real sun shadows** (cascaded shadow maps) on medium and high quality, with blob shadows kept for low.
2. **Baked ambient occlusion and lightmaps** for buildings, which gives soft, grounded light at almost no runtime cost.
3. **Tone mapping and colour grading** (look-up tables) that change through the day: golden mornings, hard white noon, orange sunset, blue night.
4. **Night that glows:** lit windows, street lamps, neon, headlight beams and bloom.
5. **Weather:**
   - rain, with wet roads that reflect, puddles and people running for cover
   - **Harmattan haze**, the dusty season around December to February: hazy sun and a soft yellow sky
   - thunderstorms
6. **A sky dome** with moving clouds, the sun and the moon.
7. **Post-processing by quality tier:** anti-aliasing (SMAA), bloom, and ambient occlusion on high quality only.

### 5.4 Roads and traffic

- **The road network:**
  - lane-based roads
  - real intersections with the existing signals
  - roundabouts, a big circle interchange
  - a **ring highway with an overpass** joining the districts
  - laterite dirt roads on the edges
  - speed bumps and potholes
  - wear and tyre marks painted onto the road
- **Street life on the road:**
  - **hawkers walking between stopped cars** at the lights
  - tro-tro stations and a lorry park
  - fuel stations
  - traffic wardens at busy junctions
  - car washes
- **Traffic AI v2:**
  - lane changes and honking
  - tro-tros stopping wherever a passenger waves
  - okadas weaving through traffic
  - rush hours (morning and evening) and quiet nights
  - traffic jams you can use in chases
- **Police (non-violent):** checkpoints and speed traps. Get stopped and you talk, pay a fine or get a story consequence. No shooting.

### 5.5 Houses and buildings

- **A modular building kit** (real 3D pieces in glTF):
  - wall sections and windows, with and without burglar-proof bars
  - doors and gates
  - balconies and AC units
  - roof types: corrugated metal, tiles, flat concrete with rebar
  - shopfront pieces
  - water tanks on stands
- **Building types:**
  - compound houses with courtyards
  - gated family houses with high walls
  - unfinished buildings
  - colonial-era shophouses
  - glass office towers
  - churches and mosques
  - markets
  - container shops
  - apartment blocks
- **Rules per district** decide which pieces and colours appear, so 16 districts get huge variety from one kit, and memory stays low because the pieces are reused and instanced.
- **Distance tricks:** simpler models for far buildings (LOD) and flat "impostor" cards on the skyline.

### 5.6 Apartments and homes

- **The housing ladder:** chamber-and-hall in a compound house → self-contained single room → apartment → townhouse → villa in Palm Estates → penthouse. Each step is a real, walkable home.
- **Decorate it:** place furniture, posters, plaques and awards, and build a home studio room that adds a production bonus.
- **Host things:** listening parties for your new single, crew hangouts and late-night writing sessions. Story characters drop by.
- **Already built, to grow:** tenants, rent setting and land plots stay, and become part of the same housing system.

### 5.7 NPCs

- **From capsules to characters:** skinned 3D people on one shared skeleton, with:
  - an **animation library** (walk variations, idles, phone use, talking gestures, dancing, sitting, carrying loads on the head like market porters do, selling, playing football)
  - modular clothing, including kente, batik and wax prints, football jerseys, church clothes and work uniforms
  - faces that can make expressions
- **Crowd levels of detail:** full rigs up close, simpler rigs in the middle distance and impostors far away. Target 40–80 people in view on mid-range phones.
- **Behaviour:**
  - The daily schedules that already exist, plus conversations between NPCs.
  - Vendors calling out.
  - Kids playing football.
  - Church on Sunday morning and the market rush.
  - Crowds outside the club at night.
- **Fame reactions (the big one):**
  - People whisper and point at you.
  - Fans ask for selfies.
  - A crowd gathers if you stand still too long.
  - Superfans follow you.
  - Haters shout.
  - Paparazzi turn up.
  - **NPCs hum your hook when your song is charting.**

### 5.8 The player

- The same character tech as the NPCs, but with more detail.
- **Everything you buy shows:** clothes from Drip & Ink, chains that swing, rings, watches, tattoos and hairstyles.
- **Animations:** your own walk style, dance emotes (Afro dance moves), phone and selfie, mic performance moves, getting in and out of cars, and sitting at Mama's Kitchen.
- **Photo mode:** pose, frame, filters, then share.

### 5.9 Cars, motorbikes and more

- **The vehicle ladder:** walking → tro-tro or taxi fare → okada ride → your own scooter → a used saloon → SUV → supercar → helicopter (superstars, from the airport). Each step changes how you get around the city.
- **Real 3D models:** fictional brands, interiors for the cockpit view that already exists, opening doors, dirt and damage.
- **Physics:** move car handling to a proper physics engine. Rapier is already in `node_modules` as a dependency (it's not used in the game code yet).
- **Motorbikes you can ride:** they already appear in traffic but you can't ride them. Add lean physics, helmets, delivery jobs and weaving through traffic.
- **The garage:** paint, rims, window tint, lights, underglow and a **sound system.** Your own songs play loud enough that the car shakes and people turn their heads.
- **Car culture:** night car meets in a car park (a social event) and organised street races at those meets.
- **The car radio:** the existing HOT 101.9 gets voiced DJs, adverts for in-game businesses, and *your songs when they chart* (that part already works).

### 5.10 Sound of the city

- Spatial audio, so sounds come from where their source is.
- **Ambient layers per district:** market chatter, horns, tro-tro mates calling out destinations, church choirs, a distant call to prayer, rain on tin roofs, generators at night, and football on someone's TV.
- Footsteps that change with the surface, and engine sounds for each vehicle type.
- Music in shops and bars from the game's own catalogue, which includes your releases.

### 5.11 Performance budget (it has to run on the phones people actually own)

Budget Android phones dominate in Ghana and Nigeria (brands like Tecno, Infinix and itel), and mobile data is expensive. So:

| | Low (budget Android, 2–3 GB RAM) | Medium | High (flagship / PC) |
|---|---|---|---|
| Target frame rate | 30 fps | 30–60 fps | 60 fps |
| Shadows | blob | sun shadows, near | sun shadows, full |
| Post-processing | none | bloom | bloom, AO, SMAA |
| People in view | ~30 | ~60 | ~100 |
| Draw calls in view | < 120 | < 200 | < 350 |
| Texture memory | < 120 MB | < 250 MB | < 500 MB |

- **An asset pipeline:** Blender → glTF (.glb) → compressed with Meshopt (geometry) and KTX2 (textures) → served from a CDN → loaded **per district chunk** (the 160 m chunks already exist).
- **The download has to change:** the current single-file build (`vite-plugin-singlefile`) inlines everything. That's fine for code but impossible for real 3D assets. Keep the code bundle, and load the assets separately.
- **Offline still works:** a service worker caches what you've downloaded, so story mode keeps working offline.
- **First download under 30 MB.** Each district streams in when you get near it.
- **Auto-pick a quality tier** on first launch, and let players change it.

---

## 6. Pillar 3 — Reasons to come back every day

1. **Fame you can see in the world:**
   - billboards with *your* cover art when an album drops
   - your face on magazine covers at kiosks
   - your name sprayed as graffiti
   - your songs in taxis and shops
   - crowds and paparazzi
   This is the core "goosebump" design law, made visible.
2. **Live shows as a real game:** the rhythm performance verb in 3D venues (The Stage → club → arena → stadium). Crowd size and energy come from what you built.
3. **The Battle League:** weekly battles at the park and then the arena, with a ladder, title belts and rivalries that carry into the story.
4. **Your crew, in the city:** hired team members walk and drive with you, each with a skill (driver, hype man, security, videographer, stylist), and they help in missions.
5. **Collectibles that tell the story:**
   - **50 lost studio tapes from the 1999 "Akwaaba Tonight" sessions** hidden across the city. Each one unlocks a few seconds of lore audio.
   - Graffiti spots to tag.
   - Rare vinyl records.
   Exploring always earns something meaningful.
6. **Local mini-games:**
   - **oware** at chop bars
   - 5-a-side football in the park
   - dance-offs
   - cooking at Mama's Kitchen during the rush
   - the open mic that already exists
7. **The world calendar:**
   - Harmattan
   - the rainy season
   - Independence Day (6 March)
   - Christmas and Easter
   - **December homecoming season**, when the diaspora comes home and every night has a concert. This is the biggest seasonal event.
8. **Clips and sharing:** one tap makes a 9:16 clip with your song (ROADMAP Stage 13) from battles, shows, radio moments and gala wins.
9. **Achievements and a Hall of Fame** (ROADMAP Stage 12).

---

## 7. Pillar 4 — Business, legal and launch

### 7.1 Legal clean-up (before any sale, store listing or marketing)

| Item | Where | Fix |
|---|---|---|
| Real car brands and models | `src/data/luxuryItems.ts` (Toyota Camry, Mercedes C-Class, Toyota Hilux, Range Rover Sport, Porsche 911, Ferrari Roma, Lamborghini Huracán, Ferrari SF90, Lamborghini Urus, Rolls-Royce Ghost) | Fictional makes and models that keep the feel (a "prancing-horse style" supercar with a made-up name) |
| Real watch brands | Rolex Submariner, Patek Philippe Nautilus, Richard Mille RM11 | Fictional watchmakers |
| Real streaming platforms | `src/data/platforms.ts` (Spotify, Apple Music, iTunes, Audiomack, YouTube Music, Boomplay, Deezer, SoundCloud) and their uses in `sim/streaming.ts` | Fictional platforms, the way the social apps already are (Chirp, Snapgram, Clip, Circle) |
| Real artists | `src/data/realArtists.ts` holds real stage names *and legal names*. The game shows aliases, but the real data ships in the code. | Delete the real data and keep only the fictional generator |
| Gambling | Casino and Sportsbook | An 18+ gate with an age check, or remove them from the store build (ROADMAP Stage 14 already says this) |
| Music and sound licences | `public/music/kit/credits.txt` | Keep credits up to date. Every beat and sample must be owned or licensed for commercial use |
| The name | "RAP LIFE" | Run a trademark search before the store launch, and consider "RAP LIFE: Music Nation" (ROADMAP's name check) |

### 7.2 A fair way to make money (design law 8: never pay-to-win)

- **Recommended:** free to play, with **cosmetics** (clothes, cars' looks, home decor, emotes), a **season pass** (cosmetics plus a seasonal story chapter) and an optional **ad-free and supporter pack**.
  - Up-front paid apps sell poorly in West Africa, and free-to-play reaches the most players.
  - Money buys looks and convenience, never chart positions, votes, verdicts or skill.
- **Payments:**
  - In the Play Store app, digital items generally have to go through **Google Play Billing**.
  - On the web, use a licensed local provider (**Paystack** or **Hubtel**) with **Mobile Money**.
  - The real-money creator market waits for ROADMAP M7: verified adults only, with a lawyer's advice first.

### 7.3 Code and stability (what a buyer's engineer will check)

- **Split `gameStore.ts`** (23,483 lines) into slices: career, music, money, social, world, story and missions. Behaviour stays the same and it's done in small, tested steps.
- **Versioned saves** with migrations, so updates never break a career.
- **Tests:**
  - unit tests for the simulation maths (charts, money, missions)
  - a Playwright smoke test that opens the city, drives, enters a building and plays one mission
  - all running in the existing GitHub Actions CI
- **Crash and error reporting** (Sentry) and **performance telemetry** (frame rate per device tier).
- **The Android app:** today it opens the live website. For the Play Store, bundle the game for offline use and add Play Billing.

### 7.4 Launch plan

1. **Vertical slice → trailer:** one district at final quality, with 3 flagship missions, filmed for a 60-second trailer and 10 screenshots.
2. **Soft launch in Ghana and Nigeria** on Android and web for 6–8 weeks. Measure retention, mission completion and where players stop.
3. **Fix and repeat** until the retention targets in section 2 are met.
4. **Global launch:** UK, US and Europe diaspora first, with TikTok-native marketing (radio moments, battles, "my song on a billboard"), creator partnerships in Ghana and Nigeria, and a press angle.
5. **A pitch kit for buyers and publishers:** trailer, metrics dashboard, revenue, a clean legal list and this documentation.

---

## 8. Connectors, tools and people needed

### 8.1 Connectors (I checked the connector directory on 26 Nov 2026)

| Need | Connector | What it lets me do |
|---|---|---|
| Code, tasks, releases | **GitHub** (already attached) | Branches, pull requests, CI and issues to track this plan |
| Crash reports | **Sentry** | See real players' errors, then find and fix the cause |
| Player analytics | **PostHog** | Retention, funnels (the first 5 minutes, mission completion) and drop-off points |
| Online database | **Neon** *or* **Supabase** (pick one; SETUP.md already supports both) | Accounts, cloud saves and later the online world |
| Hosting | **Render** (the game already runs at rap-sim.onrender.com) | Deploys, logs and metrics, without you clicking around the dashboard |
| Asset storage and CDN | **Cloudflare** | Serve 3D models and audio quickly and cheaply once the game is no longer one file |
| UI and HUD design | **Figma** | Turn HUD, mission card and menu designs into code accurately |
| Voice | **ElevenLabs** | The directory's connector is mainly for voice agents. For NPC and radio voice lines, generate them in ElevenLabs and commit them to the repo |
| Planning (optional) | **Linear** or **Notion** | Track steps as tickets. GitHub Issues and Projects also work, and they're free |

**Not available as connectors:** 3D modelling (there's no Blender connector in the directory) and 3D asset stores. The workaround is that artists or asset packs put files into the **GitHub repo** (with Git LFS for large files), and I wire them in.

**A limit to know about:** on your current plan, my workspace can only download from package registries and GitHub. So 3D models, textures and sounds need to be **committed to the repo or attached in chat**. Asset websites can't be reached directly from here.

### 8.2 Outside services (no connector needed)

- **Paystack or Hubtel:** web payments with Mobile Money.
- **Google Play Console:** the store listing, Play Billing, testing tracks and the age rating.
- **AI 3D generators (for example Meshy or Tripo):** quick drafts of props. Check each tool's commercial licence, and have an artist clean up anything used in the final game.
- **CC0 asset libraries (for example Poly Haven, Kenney, Quaternius):** free placeholder and starter assets, legally safe.

### 8.3 People (the honest part)

I can write the code, design the missions, write the story content, build the systems, and handle the pipeline, testing and docs. **Art at a $500,000 standard needs human artists or bought, licensed asset packs:**

- **A 3D environment artist:** the building kit, roads and props.
- **A 3D character artist plus an animator:** the skeleton, clothing and animation library.
- **A vehicle artist:** around 10 cars plus bikes, all fictional brands.
- **A sound designer and voice actors:** city ambience and key character lines.
- **Local producers:** licensed beats and radio songs.
- **A lawyer in Ghana:** for payments, the creator market and IP before money flows.

---

## 9. Step-by-step build order

**Why this order:**
- Missions come first because they give the biggest fun gain for the least cost and reuse existing tech.
- The foundation work runs alongside, and the legal fixes must land before any marketing.
- The look is proven on **one district** before the rest, so we don't build 16 districts of art before the style is approved.
- The soft launch measures retention before money goes into marketing.

Sizes: **S** = a session or two · **M** = a few sessions · **L** = a week or more of sessions · **XL** = needs artists or assets from outside.

### Phase 0 — A clean foundation (runs alongside Phase 1)

| ID | Step | Size | Done when |
|---|---|---|---|
| **NL-0.1** | **Legal clean-up:** fictional cars, watches and platforms. Remove the real artist data. Put the casino and sportsbook behind 18+. | M | A search of the code finds no real brand or real artist names, and gambling can't be reached without the 18+ gate |
| **NL-0.2** | **Split `gameStore.ts`** into slices, with versioned saves | L | No file is over 3,000 lines, old saves load, and CI is green |
| **NL-0.3** | **Tests and a city smoke test** in CI | M | CI opens the city, drives, enters Studio 9 and runs one mission headlessly |
| **NL-0.4** | **Sentry and PostHog** wired in, plus frame-rate telemetry | S | Errors and the first-session funnel show on the dashboards |
| **NL-0.5** | **Asset pipeline:** a glTF/KTX2/Meshopt loader, per-chunk streaming, CDN, service worker, auto quality tiers | L | One test model streams in per chunk, works offline after the first load, and the code download stays small |

### Phase 1 — Missions people want to play (start here)

| ID | Step | Size | Done when |
|---|---|---|---|
| **NL-1.1** ✅ | **Mission engine:** the `play` node, mission runner HUD (objective, timer, meters, checkpoints), medals, the retry rule and the end card | M | A test mission runs from call → play → medal → branch |
| **NL-1.2** | **First verbs:** timed run, chase/escape, booth under the clock | M | Each verb works on its own with the medal rules |
| **NL-1.3** | **"Before Sunrise"**, the first flagship mission (rain, booth, radio payoff) | M | Playtesters say it's the best moment in the game. You hear your hook on the car radio. |
| **NL-1.4** | **Rap battle verb + "Park Battle"** | M | 3 rounds, comebacks that use memory flags, the a cappella twist, and a shareable clip |
| **NL-1.5** | **Rework the 4 existing missions** (sound check, screen test, crowd work, contract spotting) | M | None of them is decided by a single A/B pick any more |
| **NL-1.6** | **Street Jobs generator** (templates × modifiers × medals, 3 hot jobs a day) | L | There's always a job within a 2-minute drive, and the jobs scale with your career |
| **NL-1.7** | **More verbs:** sneak, tail, investigate, negotiate, interview, live show, promo campaign | L | All the verbs in table 4.3 exist |
| **NL-1.8** | **The other flagship missions:** Tape Room, Flashbulbs, Sold Out, The Ledger board, One Phone Call, Shoot Day, Tro-tro Mate | L | Every seat has at least 5 missions that pass the five-ingredient check |
| **NL-1.9** | **The playable Night of Akwaaba** finale | L | The gala is played (carpet → backstage → stage → reveal → drive home), not only read |

**✅ NL-1.1 done (26 Nov 2026).**
- **What's in it:**
  - A new story node kind, `play` (`src/story/types.ts`).
  - Medals, outcomes and the retry rule (`src/story/engine.ts`).
  - The live runner (`src/missions/runtime.ts`): mission card → 3-2-1 → play → retry card or medal card.
  - The HUD (`src/missions/MissionHud.tsx`): objective, stop counter, timer, distance, and a "▶ Start" pill for a waiting mission.
  - The first verb, a basic **timed run** through stops (`src/missions/verbs.ts`).
  - The GPS route and beacon turn red while the clock runs.
  - E or ✋ presses the card's main button.
- **The test mission:** "Hot Jollof" (`src/story/content/missions.ts`). Mama calls on day 3+, you collect her jollof and race it to Hot 101.9, and the medal sends the story four ways:
  - 🥇 Gold: you go live on the Midnight Cypher.
  - 🥈 Silver: a tip, then a text from Mama.
  - 🥉 Bronze: a joke on air.
  - Miss: her nephew takes it, and Mama texts you.
- **Rules as built:**
  - The world clock is held while you play. Each try then costs its game minutes (25 here).
  - You get 3 tries.
  - Giving up, or never playing it before the day ends, takes the miss branch.
  - The medal is saved the moment the beat ends.
- **Checked:**
  - TypeScript and a production build pass.
  - In a browser I played the gold path, the fail → retry → retry → miss path, the clock being held and released, and a beat lapsing as a miss. There were no errors.
  - Test hook for scripts: `window.__rapMission` (`deliver`, `begin`, `state`, `skip`).
- **Next:** NL-1.2 deepens the run (rain, traffic events, shortcuts) and adds chase/escape and booth-under-the-clock.

### Phase 2 — The look (vertical slice first)

| ID | Step | Size | Done when |
|---|---|---|---|
| **NL-2.1** | **Quick wins on today's city:** sun shadows, tone mapping, colour grading by time of day, night glow, bloom, sky dome, rain and Harmattan | M | The same city looks clearly better in before-and-after screenshots, and the low tier still holds 30 fps |
| **NL-2.2** | **Art bible and fictional brand pack:** colour scripts, sign styles, logos | M (+ artist) | One page that every artist follows |
| **NL-2.3** | **Character tech:** skinned characters, shared skeleton, animation library, modular clothes, purchases visible on the player | XL | The player and NPCs walk, talk, dance and sit naturally, and Drip & Ink items show on your body |
| **NL-2.4** | **Vertical slice district:** Downtown around Mama's Kitchen and Studio 9 rebuilt at final quality (building kit, roads v2, props, people, sound) | XL | Good enough to film the trailer |
| **NL-2.5** | **Vehicles v2:** real models, physics, rideable motorbikes, the garage and sound system | XL | Driving feels good on a phone, and the vehicle ladder works from tro-tro to helicopter |
| **NL-2.6** | **Fame-reactive world:** billboards, radio, NPC reactions, paparazzi, graffiti | M | A charting player *sees* their fame within 1 minute of walking outside |
| **NL-2.7** | **Roll out to every district:** building kit rules per district, traffic AI v2, police checkpoints | XL | All 16 districts are at slice quality |
| **NL-2.8** | **Sound of the city:** spatial ambience per district, voiced radio DJs | L (+ audio) | Close your eyes and you can tell which district you're in |

### Phase 3 — Alive and sticky

| ID | Step | Size | Done when |
|---|---|---|---|
| **NL-3.1** | **Live show rhythm game** in 3D venues | L | Shows are played, not simulated, and crowd size comes from the campaign |
| **NL-3.2** | **Battle League** (weekly ladder, belts) | M | Players have a weekly reason to battle |
| **NL-3.3** | **Crew in the city** | M | Crew members follow you, help in missions and have their own small arcs |
| **NL-3.4** | **Housing ladder and decorating, listening parties** | L | Every rung is a walkable home you can decorate |
| **NL-3.5** | **Collectibles:** 50 lost tapes, graffiti, vinyl | M | Exploring always pays off, and the tapes add to the mystery |
| **NL-3.6** | **Mini-games:** oware, 5-a-side, dance-off, kitchen rush | L | Each one is fun on its own for 5 minutes |
| **NL-3.7** | **World calendar and December homecoming season** | M | The city changes with the seasons, with a big December event |
| **NL-3.8** | **Clips, photo mode, achievements, Hall of Fame** | M | One tap gives a shareable 9:16 clip with your song |

### Phase 4 — Launch

| ID | Step | Size | Done when |
|---|---|---|---|
| **NL-4.1** | **Store build:** offline bundle, Play Billing, age rating, privacy policy, permanent signing key | M | Accepted on a Play Store testing track |
| **NL-4.2** | **Fair monetization:** cosmetics shop, season pass, supporter pack, Mobile Money on the web | L | Buying works end to end, with nothing pay-to-win |
| **NL-4.3** | **Trailer, screenshots, store page and press kit** | M | Ready to post |
| **NL-4.4** | **Soft launch in Ghana and Nigeria:** measure, fix, repeat | L | The retention targets in section 2 are met |
| **NL-4.5** | **Global launch:** diaspora markets, creator partnerships | L | Live worldwide, with a growth plan |

### Phase 5 — Online and forever

Continue with **ROADMAP.md Stages 14–25** (accounts at scale, real players' music, a shared city, players filling jobs, live events, elections and courts, owning the city, seasons, new cities) and **M7** (the creator economy). The mission engine, verbs and Street Jobs from Phase 1 become the content players run *together*.

**First thing to build: NL-1.1, then NL-1.3 "Before Sunrise".** It reuses the booth, the radio, GPS and traffic, needs no new art, and proves the new mission formula in one evening of play.

---

## 10. When is it "next level"? (checklist)

- [ ] A new player has a **goosebump moment within 5 minutes** and a reason to come back tomorrow.
- [ ] **Every mission** passes the five-ingredient check (stakes, a clock, skill, a surprise, a visible change).
- [ ] There is **always something to do within a 2-minute drive** (Street Jobs).
- [ ] The city looks good enough that **a screenshot alone makes someone ask "what game is that?"**
- [ ] Streets feel **busy and local**, and people **react to your fame**.
- [ ] You can **ride a motorbike, own a car you customised and live in a home you decorated**.
- [ ] It runs at **30 fps on a budget Android**, with a **first download under 30 MB**.
- [ ] **No real brands or real artists** are anywhere in the code, and gambling is 18+ or gone.
- [ ] **Crash-free sessions are 99.5% or more**, and the dashboards show retention.
- [ ] Day-1 retention is **40%+**, Day-7 is **15%+** and Day-30 is **6%+** in the soft launch.
- [ ] Revenue comes from **cosmetics and passes only**, never pay-to-win.

---

## 11. How to pick this up again

- This file lives at the root of the GitHub repo: **`NEXT_LEVEL_README.md`**.
- In any new session, attach the repo and say **"read NEXT_LEVEL_README.md and continue with NL-x.y"**.
- When a step is finished, tick it here (add "✅ done" and a one-line note under its table, as ROADMAP.md does) so the next session knows where things stand.
- Big decisions made along the way (art style approved, monetization model chosen, district order) get recorded in a short **"Decisions"** list at the bottom of this file.

### How to write a mission (cheat sheet)

A mission is ordinary story content in `src/story/content/`. The pattern, from "Hot Jollof":

1. **A hook node.** A `call`, `text` or `encounter`, with lines and choices. The "yes" choice has `goto: '<play node id>'`. Saying yes takes you straight to the mission card in the city.
2. **A `play` node** (`channel: 'play'`, `choices: []`):
   - Its `lines` are the briefing on the mission card.
   - `expires` is how many days it waits before counting as a miss.
   - `play.task` is the verb and its settings, for example `{ verb: 'run', via: ['kitchen'], to: 'radio', pace: 10, steps: [...] }`. Places are story places (kitchen, studio, radio, bank, stadium…), never coordinates, so missions work in every city layout.
   - `play.objective` is one line.
   - Optional: `medals` (the scores needed for gold and silver), `minutes` (game time per try), `tries`.
   - `play.outcomes`: `gold`, `silver`, `bronze` and `miss` (required). Each has `say` (one line on the medal card), `fx` (the usual effects) and an optional `goto` (the next node: a scene, a text, a call that rings, an encounter, or another `play` beat).
3. **Branch later on the medal.** The medal is saved as the node's choice, so `{ k: 'done', node: 'mx_jollof_run', choice: 'gold' }` works in any condition. The score is in the flag `play:<node id>`.
4. **A trigger** in the arc's `triggers` decides when the hook arrives.

To add a verb, see the header of `src/missions/verbs.ts` (three places to touch).

### Decisions

- 2026-11-26: Stay on the web stack (React + three.js) and upgrade the art instead of porting to another engine. Revisit only for a PC or console version after funding.
- 2026-11-26 (NL-1.1): Mission timers run in real seconds, and the world clock is held during a beat. Each try then costs a fixed amount of game time. The game clock runs at 10 game minutes per real second, far too fast for a fair timer.
