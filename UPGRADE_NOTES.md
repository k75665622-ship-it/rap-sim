# Rap Life — upgrade notes

## Shows now run like real life
- **Plan a show** → pick a room, a date (diary shows only nights you can actually book), a ticket price → **Announce & put on sale**.
- Room needs a lead time to sell: club 3d, theatre 7d, hall 14d, arena 28d, stadium 49d. Max 6 shows on sale at once.
- A 25% **deposit** is paid to hold the room. Tickets sell **day by day** (presale spike → slow middle → last-week surge) from live demand, so a hit single or a scandal between announcing and the night really moves sales.
- **Upcoming tab**: live sold/capacity, sales chart, mood chip (Selling fast / On track / Slow / At risk / Sold out), and per-show actions:
  - **Price** – cut or raise (earlier buyers keep their tickets)
  - **Promote** – social push / radio & DJ / press blitz (diminishing returns)
  - **Postpone** – up to 2×, costs a fee, some ticket-holders refund, short notice dents reputation
  - **Cancel** – reason matters (low sales / illness / conflict); cheap 4+ weeks out, brutal the week of; fake illness is punished; fans react on Chirp
- **Mailbox + feed updates**: on-sale confirmation, 25/50/75% milestones, SOLD OUT, reminders at 14/7/3/1 days, "struggling" warnings, settlement report.
- The **clock plays the show** on its night (works across day/week/month jumps). Deposit and promotion are credited back so profit is exact. Show history/cooldown/city-fatigue/anti-spam rules from the previous rebuild all still apply.
- Old saves load safely (`scheduledShows` defaults to `[]`).

Files: `src/sim/ticketing.ts` (pure engine), `src/components/screens/UpcomingShows.tsx`, `ShowsScreen.tsx`, store actions `scheduleShow / repriceScheduledShow / promoteScheduledShow / postponeScheduledShow / cancelScheduledShow`.

## Genres: 8 → 20
New: R&B, Neo-Soul, Pop, Gospel, Alté, Amapiano, Highlife, Reggae, Latin, Boom Bap, Jazz Rap, Rock.
One source of truth: `src/data/genres.ts` (family, BPM centre, lyric texture). Wired into the artist creator, studio, tempo fit, mood fit, streaming-platform fit, ghostwriter and the NPC roster.

## Studio redesign
Numbered step flow (Lyrics → Sound → Vocals → Features → Mix & book) with progress ticks, a "record sheet" chip row, genres grouped by family, tempo auto-snaps to the genre, roomier mood cards, Back/Next buttons.

## Offers, invitations & negotiation (new)
**Shows -> Offers tab.** Promoters, DJs and NPC artists near your level (or further up, if they already like you) send offers. Each says WHY they picked you.
- **Access rule:** an artist host more than 40 fame above you never invites you; 20-40 above needs relationship 25+.
- **Fees are bounded by the room** (capacity x host pull x billing share), so offers are not a money printer. One open offer per host, max 5 open.
- **No manager** = fewer offers and a shorter window. A manager/promoter brings more.
- **Negotiation page** (term sheet): fee, billing, set length, merch share, travel and hotel, cancellation terms, radius clause. Each host has an archetype (Business / Street / Creative / Status), traits (Shark, Diva, Generous, Hustler, Petty, Loyal), a daily mood and a patience bar. Counters can be accepted, met halfway, refused, or make them walk away.
- Your **manager** hints what will move; your **lawyer** reads the fine print (without one, hidden clauses stay hidden and are applied if you sign).
- **Decline** with a reason (7 options) and optionally "soften it". The reaction depends on archetype, traits, mood, relationship and whether your excuse is true (a fake scheduling/health excuse is punished). Replies are attributed to "their camp", never invented quotes for real names.
- Accepted dates are **played by the clock**: host-drawn crowd, fee + merch - travel - manager cut, performance review, relationship change, small random moments. **Back out** later costs a penalty and standing. A radius clause blocks your own shows in that city.
Files: `src/sim/offers.ts`, `src/components/screens/OffersPanel.tsx`, store actions `counterShowOffer / acceptShowOffer / declineShowOffer / backOutOfGig`.

## Audit of your spec notes vs the game
Already in the game (found in the code): Story Director, beef, fanbase, interviews, awards and Trophy Room, certifications, investments and lifestyle, retirement and legacy, news/headlines, remix, videos, tours, tax.
Not found / thin: Brag system (Tier-3 award bragging rights), child support and family events, marriage/divorce stages (barely present), sample clearances, payola, scout missions, NPC-hosted shows with their own managers, "They noticed you" events, rivalry data file with seeded real rivalries.

## 2026-10-04 — Industry & Social Reality Pass

Added a consolidated Industry & Life layer for the systems that were still missing from the earlier build:
- Sample clearance requests, quoted rights costs, deadlines and legal open threads.
- Radio promotion/payola campaigns with real money cost, temporary attention lift and exposure/reputation risk.
- A&R scout missions that require relationship-building before completion.
- Rare earned "they noticed you" events from higher-tier NPCs.
- Family/child-support obligation with recurring monthly expense.
- Retirement, legacy score/titles, comeback attempt and post-career role selection.
- Industry notices feed for these events.
- Save/load migration defaults for all new state.

### Social UI pass
- Removed the dedicated "Beef Watch" social tab. Rivalries still exist in the simulation and can surface organically through posts/news.
- Rebuilt the social page around a realistic social-network layout: persistent header, home/trending/mentions/profile tabs, composer, timeline cards, replies, likes, reposts, bookmarks, trends and suggested accounts.
- Chirp now presents as a normal microblogging feed rather than a game control panel.
- Refresh remains a real game-time action with cooldown.

## 2026-10-18 — Your own record label

**Business → My Label** (also reachable from Investments). The old "Record Label" business, which just ticked money every month, is now a real company you run.

- **Found it**: name, colour, sound (genre focus). Costs $25,000 and needs 8+ fame; 60% of that becomes the label's first cash. If you already owned the old Record Label business it converts for free and its value becomes the opening balance.
- **Its own bank account.** Advances, recording, marketing, staff and the office are all paid from label cash. You **put money in** and **take dividends out** from the Money tab. Overdrawn labels cannot fund anything, and the artists notice.
- **Scouting**: a weekly report of unsigned artists your label can reach. Reach = reputation + your own fame; big names will not take a meeting with a tiny label. Home country and your genre come first.
- **Negotiation page** (same feel as the show offers): pick the deal type (Standard, 360, Joint venture, Distribution), then advance, royalty, releases owed, term, marketing per release and creative control. Each artist has an archetype, traits, a daily mood and patience. A lowball costs patience; a near miss gets a counter that fixes the line they care about most; their counter can be signed as it stands. Rival labels sometimes chase the same act, and then the window is short.
- **Real label money**: records your artists release go through the real streaming engine and chart like everybody else's. The label gets the gross minus a 15% distributor fee, pays the artist's royalty, and **recoups** advances, recording and half the marketing out of the artist's share first. 360 deals also take 20% of touring/brand money. On a distribution deal the artist owns the masters and funds their own records; you take a fee.
- **Releases**: artists hand in new music every couple of months. Fund a quick single, a proper single or a big rollout (quality, marketing and fame bump scale with spend). You can also rush a record (at most one a month) and **push** any release with extra marketing. Signed artists no longer release on the world's schedule, only through you.
- **Artists have feelings**: mood and loyalty move every month — releases, being shelved, being paid, the label's reputation and money all count. Successful artists **demand a raise** (raise, pay a bonus, or refuse). **Rival labels try to poach** (match, sell the contract for a buyout, or refuse). Very unhappy artists go into **dispute**, stop recording, and may win their release in court unless you settle.
- **Contracts end**: when the term is up a renewal negotiation opens; if nothing is signed in 21 days they leave. Records already released stay in your catalogue (except distribution deals).
- **Staff**: Head of A&R (more and better prospects, ceiling estimates, better records), Marketing Director (marketing goes further), Radio Plugger (free airplay, reputation), Business Affairs (reads what artists really want, longer warning on poaching, cheaper settlements). Hired from the real NPC roster, paid monthly.
- **Reputation** grows with your roster's fame, chart entries and releases; it raises how many artists you can carry and who will sign.
- **Monthly statement** in the Mailbox, label diary, catalogue list, and alerts in the sidebar badge.
- Saves: `label` is stored with the career; signed artists' grown fame and label name are restored on load. Old saves load with no label.

Files: `src/sim/label.ts` (pure engine), `src/components/screens/LabelScreen.tsx`, store actions `foundLabel / labelDeposit / labelWithdraw / refreshLabelProspects / openLabelPitch / counterLabelPitch / signLabelPitch / withdrawLabelPitch / fundLabelRelease / promoteLabelSong / answerLabelDemand / answerRivalOffer / settleLabelDispute / dropLabelArtist / hireLabelStaff / fireLabelStaff`, and the `labelTick` in `advanceTurn`.

Also fixed in this pass: the Industry & Life actions (sample clearance, payola, scout missions, retirement, comeback, child support) were missing from the store's type, so `tsc` failed; and a venue inquiry on a retired career referenced an undefined variable and would have thrown.

## 2026-10-18 (b) — Label v2 and a living world

### Label v2
- **Artists work on their own.** Every few weeks each signee pitches a demo (a single, or an album after three singles). The **A&R** tab shows the office's estimate (an A&R hire makes it accurate), the pitch and the budget they want. **Approve** at any budget, **send it back** for another pass (perfectionists improve, divas sulk), or **shelve** it. Ignore a demo and they get restless; after ~45 days it **leaks** with no campaign. Creative-control and distribution artists release without asking.
- **Office rules** (A&R tab): auto-approve everything, or only demos the office rates above a threshold, at the artist's ask or a fixed budget; and whether label-funded singles get videos.
- **Albums** release as real projects: a lead single plus deep cuts that reach a fraction of the audience (new optional `streamWeight` on songs, applied in the streaming engine).
- **All-in deals**: a recoupable recording fund paid at signing. The artist pays for their own sessions, videos and marketing (booking your studio pays the label rent) and releases on their own. Top up the fund from the Roster.
- **Negotiation**: signing bonus, albums owed, option years, video budget, publishing share, touring cut; their counters name what they want; leverage and temperature; table tactics — pitch your vision, meet in person (25 energy), ask what they need, play hardball, exploding offer. Option years can be exercised when a deal ends.
- **Label studio**: five building tiers and five gear lines with upkeep; better quality, cheaper and faster sessions; rent from other artists on idle days. New staff: in-house producer and studio engineer.
- **Videos** for label songs from the song page go up on the artist's channel. The world no longer shoots random videos for label songs.
- New releases get their first day of streams at once; label pages show live, climbing numbers.
- Fixed: NPC songs aged a "week" per day on the running clock.

### Shows with a real bill
- Every show offer comes with a **lineup**: the host, support acts, openers, the DJ. Friends are marked; a **rival** can be on the bill (promoters love a storyline). Ask the host to **drop them** — they might, they might refuse, or they might drop you.
- On a booked bill with a rival, choose **keep your distance** or **don't back down**. On the night: steal the show, get upstaged, squash it backstage (ends the beef), or your crews clash (fine, headline, heat). Everyone else on the bill: relationship from sharing a stage; headliners sometimes ask for your number.
- **Friends invite you more**, and more invitations now come from artists.
- **Your own shows**: a **Bill** tab to add a special guest or an opener — fees scale with the room, friends cost less, lowballs sting. A name on the poster lifts ticket demand. Guests are paid on the night only if they turn up; flaky ones sometimes don't.

### Moments — the world comes to you
- People **text you** with things that want an answer: studio invites, parties, diss-bait (that can turn into a diss track weeks later), friends asking to borrow money (some pay you back), collab ideas, bloggers with a story, fans, cash gigs, beats for sale, "I'm bringing you out tonight", artists asking to open for you.
- Your **team walks in** with decisions: a cringe brand deal, a story about to break, burnout, a leaked snippet, raises, two team members feuding, a designer who wants to dress you. No team yet? Your cousin "handles things".
- Every option has a consequence, rolled with who they are and who you are; ignoring one is a choice too. They show up in PingChat (with buttons), on the Team page, and in a **Waiting on you** card on the Dashboard.
- **Feature requests** have twists: artists run late (wait, chase, or pull it), offer verse-for-a-verse instead of a fee, or demand top billing.
- **PingChat replies** read what you said (greeting, compliment, feature ask, money, insult, apology, flirt, show, label) and who they are. Stars ignore unknowns, friends answer fast, and double-texting costs you. Real artists' DMs are handled by their team.

## 2026-10-18 (c) — Social v2, rivals, relationships and the studio

### Four real apps
- **Chirp** (timeline), **Snapgram** (photo grid), **Clip** (vertical videos) and **Circle** (your community) each look and work like themselves, with separate follower counts that grow from your fanbase and from what you post.
- **One composer, all apps**: pick the kind of post (thread, photo dump, cover reveal, dance challenge, freestyle, skit, Q&A…), attach a released song, tag up to five people — artists, managers, producers, blogs — and cross-post to any apps at once. Each app gets its own version.
- Posts **keep collecting for three days**, can **go viral** (a viral Clip challenge pulls the attached song back up the charts), and posting ten times a day gets scrolled past.
- **Comment sections are real**: stans, fans, haters, trolls, rival fans and other artists. Open any post to read every comment, like them, reply — fans freak out when you answer; replying to a hater can go either way. Artists answer in their own voice (real-named artists never get words written for them).
- **Repost and quote** anything. Reposting someone is noticed; quote-tweeting them with an insult starts something.
- **Tagging matters**: friends reply or repost (their followers find you), big names often ignore you, rivals clap back.
- **Features post on every app**: when an artist is on your record they post it on Chirp, Snapgram and Clip and tag you; when your verse lands on their song, they post it too.
- The scene posts on every app daily — artists, fan pages editing your songs, blogs reporting on the stars. Name your fanbase on your profile.

### Rivals: fan wars and beef
- **Fan wars** (your fans vs theirs) start when you're fighting someone for the same chart spot, when a blog pits you against a peer, or when a beef spills into the comments. Watch intensity and who's winning; **rally**, **call for peace** or **quote a hater**. A boiling war can drag you into a beef.
- **Beef now starts on its own**: people who can't stand you (relationship −35 or worse) finally say it, insulting or quote-tweeting someone, tagging a rival in a fight. Rivals **hit back online** while you keep it going. The **Rivals** tab shows every beef with its heat, the 9-rung ladder, the next move, and how it can end.

### Relationships
- Up: time together, **gifts** (flowers, a bottle, a chain — the second gift in a week reads as trying too hard), likes, reposts, replies, tagging with love, delivering verses, inviting them on stage.
- Down: insults in DMs or comments, quote-tweets, tagging them in a fight, beef.
- Friends you never make time for **drift** a little every month; grudges soften slowly. The rules are on every artist's profile.

### The studio
- New **Studio home**: start a song, the best beats waiting for you, masters to finish, who on your team does what, your room.
- **Beats you own**: your in-house **producer** sends a beat every few days and your **sound engineer** about once a week — free. The **beat store** restocks weekly (lease cheap, or own it exclusive). **Order a beat** to a brief — genre, tempo, mood, the song it's for — from your team (free) or anyone (a fee); don't like it, **ask for a redo**. Pick a library beat in the session and it sets genre/tempo/mood to match, with no producer fee.
- **Build your own studio**: bedroom corner → home studio → project studio → pro studio → flagship complex. Each costs a lot once and has monthly upkeep, takes better gear, adds production and makes the team's beats faster. From project studio up you can **rent it out** to cover part of the bills.

## 2026-10-18 (d) — Live social, interviews, the manager's desk, studio on mobile

### Social media that's alive
- **Live numbers**: every post has a minute it went up, and its likes, reposts, comments and views keep arriving while the clock runs — fast in the first half hour, then settling over a few days. Size depends on who posted: a global superstar's photo collects millions of likes and thousands of comments within the hour; a local artist gets hundreds. Real artists post pictures and clips with emoji captions — the game never puts words in a real person's mouth.
- **Refresh** (every 15 game minutes) pulls what just landed; new posts that arrive while you scroll wait behind a "↑ N new posts" pill. **For You** is algorithmic (what's doing numbers, who you follow, your own new posts); **Following** is chronological.
- **Comments are real**: comment counts match the size of the post, and you can keep loading more as they come in.
- **Follow, unfollow, block** — on any post or profile. People follow back (or don't, if they're much bigger); unfollowing someone who follows you can be noticed, reported by blogs and start a fan war; blocking hides their posts, comments, tags and DMs, ends their pending messages — and they may post the screenshot.
- **Activity tab**: who liked, commented, reposted, followed, tagged you, and like milestones. The **blue tick** arrives when you're big enough.
- **Snapgram**: stories bar (tap through, reply or react — it lands in their DMs), post your own story (studio, teaser, night out, behind the scenes, Q&A, the flex — each does something), full-width photo posts with double-tap likes and "liked by".
- **Clip**: a vertical For You player with the action rail, **Sounds** (what everybody is making videos to — use one and your clip rides the trend, and the artist notices) and **Go Live** (viewers, gifts in real money, followers, sometimes a friend drops in, sometimes trolls).
- **Chirp**: views on every post, live trends from your own country's chart.

### Interviews
- Twelve outlets per country (radio, TV, podcasts, YouTube shows, magazines) plus four abroad, each with a host, an audience size, a vibe and the fame they want. They **invite you** — more when you've just released, when you're in a beef, when you're hot — or you **pitch yourself** once a day.
- Six formats: release talk, the hot seat, life story, live freestyle, business talk, the debate chair. Questions are built from your world (your latest song and its producer, your rival, your friends, your country's biggest stars, your label) and shuffled every time. About half the interviews have a **surprise**: the host plays your rival's diss live, your rival calls in, a fan breaks down, the DJ drops your song, a leak, a friend walks in.
- Every answer moves something: fame, reputation, momentum, fans, streams for the song you talked up, relationships with anyone you name, beef heat, the outlet's opinion of you. Freestyles and jokes roll against your stats. Walk out and it's a headline. The outlet posts the clip — it can go viral — and the people you named react.

### Your manager handles the business
- With a manager, **show offers, feature asks and interview requests go to their desk**, not your DMs. Each comes with the details (fair money, the small print, who's on the bill, your calendar) and their advice — take it, pass, counter (at their number) or your call. One message a day sums up what's new. Act from the desk in PingChat, the Team page or the dashboard.
- Without a manager, promoters and artists message you directly and the letters pile up in the mailbox.
- **PingChat**: delete a chat, clear everything you've read, blocked accounts can't message you; works on a phone (list, then chat).

### Studio on a phone
- The record screen stacks into one column with a **live read** of the song at the top, a scrollable step rail, and a **sticky bar** with the cost and the Book button. Ghostwriters, moods, effort, the room, projects and the vault all reflow for small screens.

## 2026-10-18 (e) — Money: shares, crypto, businesses, property, the casino; team jobs; artist pages

### The Money page (replaces Investments)
- **Overview**: your net worth (cash, shares, crypto, businesses, property, cars and jewels) with a chart over time, what came in last month, money news, and your financial advisor's calls.
- **Shares**: 14 fictional companies across telecom, banking, mining, energy, fashion, media, tech, airlines, cocoa, logistics, food, property and cars. Prices move every game day with the market's mood (bull, bear, sideways), hidden trends that change, and news shocks ("fraud investigation — −14%"). Dividends pay every quarter. 1% fee per trade.
- **Crypto**: majors, altcoins, meme coins and a stablecoin. Memes pump on celebrity tweets and give it back; anonymous teams **rug pull** (−90% overnight); dead coins are delisted and new ones list. The stablecoin can lose its peg. Memes lose money on average — they are lottery tickets.
- **Businesses you run** — clothing brand, restaurant, nightclub, car wash, barbershop, drinks brand, events company, gym, tech app, sneaker resale. You set staff (cheap/good/elite), prices (budget/standard/premium) and monthly marketing; grow each through five levels; and each has a monthly big move (drop a collection, throw a party, a festival, a celebrity chef, a flavour launch, raise money for the app, flip a sneaker drop). Things happen: theft, viral bad reviews, inspectors, police at the club, a footballer wearing your hoodie on TV. Fame-driven businesses lose money if nobody knows you; a car wash doesn't care. Sell any time for what it's worth, or close it down.
- **Property development**: buy a plot (outskirts, suburbs, downtown, beachfront), build apartments, villas, a plaza or a hotel (4–10 months), then rent it out or sell. Building sites go wrong: rain delays, cost overruns that stop work until you pay, permit fees, a contractor running off with a deposit (unless you have a lawyer). The property market moves under you. Developed property is included in property tax.
- **The casino**: walk in (⚡3) for blackjack, roulette, slots and dice with real house edges; the sports book (tomorrow's matches, bookmaker odds) works from your phone. Table limits rise with how much you've played (Guest → Gold → Platinum → Black card). Big wins and big nights of losses make the blogs if you're famous.

### Your team has jobs
- Everyone on the payroll now has a choice of what to work on, set on the Team page, and reports what they did each week:
  - **Accountant**: books & tax, **financial advisor** (buy/hold/sell calls on every stock and coin, rug-pull warnings, a monthly return on your portfolio — a skill-90 advisor reads the hidden trend every time, a skill-20 one is guessing), or deal-maker (8% off businesses, upgrades, land and builds).
  - **Lawyer**: contracts, disputes (business fines and losses cost less), or chasing royalties (weekly cash).
  - **Publicist**: buzz (momentum), damage control (reputation), or press bookings (more interview invites).
  - **Stylist**: your image, paid brand posts, or designing for your clothing line (+15% sales).
  - **Photographer**: covers, or your socials (posts reach 15% further, followers every week).
  - **Personal assistant**: diary (better rest), business errands (permit fees halved), networking.
  - **Producer / engineer**: beats for you, selling beats or renting your studio for cash, teaching you, or making more beats.
  - **Songwriter**: your songs, or writing for others for cash. **Vocal coach**: voice, live shows, freestyle. **Trainer**: stamina or stage fitness.

### Artist pages
- The Artists directory and profile were rebuilt for phones: search, country/role/tier filters, cards with the full name and verified tick; the profile has a banner, the name in full, followers and listeners, and tabs for overview, music, relationship, team and hiring.

## How to run

```
npm install
npm run dev      # play at the address it prints (usually http://localhost:5173)
npm run build    # single-file build in dist/index.html
```
