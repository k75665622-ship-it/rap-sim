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

## 2026-10-19 (f) — AI brain, real DMs, plans on the clock, a real clothing brand, world football, life events, redesigns

### AI brain (optional — Claude API)
- New **AI Brain** page (sidebar → Business). Paste a Claude API key and the game's fictional people write their own words:
  - **Chats**: type anything in PingChat and they answer in their own voice, from their personality, your relationship and your history. They can invite you to the studio or a link-up (a card with a time appears), agree to meet when you ask, offer you a verse — or stop replying if you're rude.
  - **Replies to your decisions** in the DMs, **comments under your posts** (fans, jokers, haters, friends reacting to what you actually wrote), **live interview hosts** who react to your last answer, and **people acting on their own** once a game day (texts, posts, invites, gossip from bloggers).
- Built so it doesn't burn through the key: Claude Haiku 5.5 by default (Sonnet/Opus selectable), short answers, thinking off, the game's rules cached, one request at a time, a daily call cap (default 300) with usage and estimated cost on the page. Anything that fails falls back to the built-in writing silently.
- The key stays in that browser (never in saves). Set a spend limit in the Claude Console.
- Real people are protected: the AI is never asked to write for a real artist or their real team, and any answer naming one is thrown away. This also fixed an old gap — most real artists' ids don't end in `_real`, so the "never put words in a real person's mouth" checks now go through one lookup (`sim/realPeople.ts`).

### DMs that read like DMs
- Answering a request no longer posts the button text as your message. You send a natural line; they reply in their voice; a small grey line shows what it led to (+$, relationship, reputation).
- **Ignoring** sends nothing — they see "Seen". Depending on who they are, they may follow up later ("saw you online btw 👀", "So you can't even reply? Ok").
- Quick replies sit under their message, a typing indicator shows while they answer, chats fill the phone screen with the composer always visible, songs attach from a button, and each header shows their temperament.

### Plans on the clock
- "Pull up to the studio tonight" → yes puts it in your diary at **8:00 PM**, with a card in the chat (move it, cancel it). When the clock gets there you're **at the studio**: record together, just vibe, play them your unreleased songs, or leave early — or bail. Running late, sleeping through it, or skipping the day all count. How they take it depends on who they are (punctual or always late, forgiving or holds grudges, private or takes it public).
- You can make plans with anyone from their chat (📅): studio, link-up, party or meeting, any day and hour. They accept or decline by relationship, fame gap and personality.

### Personalities and special skills
- Every person has a temperament and readable tags (always on time / always late, holds grudges, takes it public, big ego, warm…) on their profile and in chat; they drive texting style, lateness and reactions.
- Hireable staff can have a **special skill** with a real effect: Market reader (+15 advisor skill), Tax wizard, Haggler (extra discounts), Shark, Fixer, Spin doctor, Hype machine, Trendsetter, Brand closer, Viral eye, Cover artist, Hitmaker, Fast hands, Golden ears, Studio hustler, Hook genius, Ghost pen, Voice doctor, Drill sergeant, Stamina coach, Organized (never miss a plan), The plug (double casino limits). Shown on profiles and the Team page.

### Your clothing brand is a real operation
- Design products (tees, hoodies, caps, joggers, jackets, jerseys, bags, sneakers) in basic/premium/luxury; ride a current trend; collab with an artist friend (fee + 25% of sales); make limited one-run drops. Design quality comes from your creativity, your stylist and luck.
- Order stock from an overseas factory (cheap, 4 weeks, more faults, customs delays), a local workshop (fast, dear), a premium mill (level 2) or your own factory line (level 3). Set every price against what fans think is fair.
- Weekly sales react to price, design, trends (which heat up and cool down), seasons (hoodies in harmattan, everything in December), your fame, reputation, hype, channels and fakes. Pop-ups (L2), stores (L4), wholesale (L5), warehouse space, staff, marketing, sales, influencer seeding, clearing old stock.
- Things happen: a piece goes viral, a footballer wears it, fakes flood the market (a lawyer stops it), customs holds a shipment, a van gets robbed, faulty batches come back as refunds.

### World football
- A new **Betting** tab (Money): daily matches from England, Spain, Italy, Germany, France, a European cup, Ghana and Nigeria (club names are fictional, named after real cities). Kickoffs on the game clock, live scores and minutes, results, league tables. Markets: 1X2, over/under 2.5, both teams to score; singles and accumulators with a bet slip. Odds come from the same model the matches are played with, minus a ~6% margin.

### Life happens
- 16 new life events on the dashboard: family asking for money, a police checkpoint, your phone snatched, your account hacked, fans mobbing you, an old friend asking to be put on, charity visits, presenting at an awards night, falling ill, power cuts mid-session, a film licensing your song, a scam promoter, going viral, a break-in, a church crusade, your car breaking down — each with choices and consequences.

### Redesigns (phone and laptop)
- **Dashboard**: hero with your stats and energy, shortcuts with unread counts, life events, what's waiting on you, streaming, diary, net worth, storylines and a feed.
- **Shows**: a step-by-step planner (where, room, night, occasion, price) with the estimate beside it and a sticky Announce bar on phones.
- **Mailbox**: a proper mail app — search, filters, unread, delete, mark all read; offers and feature negotiations restyled.
- **Updates** (was News Feed): notifications grouped by day with filters, headlines, trending posts and storylines.
- The older screens now share the same palette and buttons.

## 2026-10-19 (g) — Accounts and a real database, bring-your-own AI, your character, drip and ink, a journal, real football seasons

### Log in, or just play
- A new **login page**: log in, create an account, or **Just play** (no account, offline). **Device accounts** live in this browser and work offline (password optional). **Online accounts** appear when a game server is reachable, so you can log in on any device and your careers follow you. See `SETUP.md`.
- After logging in, a **home page** shows your last career (with your character) to continue, starts a new one, and lets you turn on the AI brain or keep playing offline.
- **Account** page (sidebar): where your careers are kept, sync status, take a device account online, the game server address, log out, delete.

### A real local database
- Saves moved from localStorage (~5 MB for the whole site) to **IndexedDB** (hundreds of MB): up to 30 careers per account. Old saves move across automatically, and careers saved before accounts go to the first account opened on the device.
- Online accounts sync each career, compressed, to the server. The newest copy wins, offline changes catch up later, and deleted careers are deleted online too.

### Bring your own AI
- AI Brain now takes **any provider**: Claude, OpenAI, Google Gemini, Groq, Grok (xAI), OpenRouter, DeepSeek, Mistral, **Ollama** (a free model on your own computer, fully offline) or any OpenAI-compatible server. Each has an editable model with sensible cheap defaults and a **Fetch models** button.
- Keys are saved **per account, in this browser only**. They're never in saves and never stored on the server. Without a key, everything runs on the built-in writing.

### Your character
- A new **Your look** step when creating an artist, with a live full-body preview: frame, build, nine skin tones, eyes, brows, expression, facial hair, 18 haircuts in 10 colours, a starter fit (top, bottoms, shoes) and up to three tattoos you already have. **Shuffle** generates a random look.
- You appear across the game: the dashboard hero (full body), the sidebar, the top bar, your social posts and stories. Fictional people get their own generated portraits everywhere their avatar shows (DMs, posts, profiles, mail). Real artists keep their initials, because the game doesn't draw real people.

### Drip & Ink (new page)
- **Shop** with a new **drop every other Friday**: sneaker lines step up a version (Runner 4 makes Runner 3 last season's shoe), fashion-house pieces, jewellery, limited runs that sell out, and the odd **collab with a fictional artist**. Brands are fictional. Try anything on before you buy.
- **Hype fades** as pieces age and newer versions land, while "classic" pieces hold up. Your **drip score** (shown on the dashboard) comes from what you're wearing and pushes Snapgram and Clip reach. **Post a fit pic** to flex new pieces. **Resell** pieces, with sold-out limited pairs going above retail.
- **Tattoo studio**: six spots and a dozen designs. Ink is permanent, cover-ups cost extra, and laser removal costs three times the original. Sessions take real hours on the clock and some energy. A face tattoo makes the news if you're known.
- **Barber**: change hair, colour and facial hair. Braids and locs take hours in the chair.

### The journal (memories)
- A **Journal** page records what happened, who was there and how it went: plans kept, ignored or ghosted, big purchases, ink, chart moments, headlines about you, milestones. You can pin moments and write your own notes. It's saved with each career, so it syncs too.
- The AI reads it, so people **remember**: someone you stood up can bring it up weeks later, while a forgiving person lets it go.

### Invites: ignore, or don't go
- Invites have **Leave on read** as well as Decline. How it lands depends on who sent it: warm people chase ("you saw my message? 👀"), proud ones go cold ("Say less."), messy ones may subtweet, and the relationship hit grows with ego and pettiness.
- When it's time, the plan asks **are you going?** You can **Pull up**, **Text an excuse**, or **Don't go**. The card shows who you're dealing with (holds grudges, takes it public…). Not showing up costs more with proud people, and missing a business meeting also costs reputation.

### Football seasons, like real life
- Every league is a **double round-robin from August to May**: everyone plays everyone home and away, in a fixture order drawn each season, on weekends with Friday and Monday games. You won't see the same match two weeks running. Leagues now have 18–20 clubs (fictional, named after real cities).
- The **Champions Cup** has four groups on Tuesday/Wednesday nights (September–December), then quarter-finals in March, semis in late April/May and a final at the end of May. Knockout draws go to penalties.
- **June** is the international window (national team friendlies) and **July** is pre-season. Seasons end with champions crowned (notification) and **past champions** kept on the tables page. A new career starts mid-season with the season so far already played.

## 2026-10-19 (h) — Career modes, feature deals that make sense, the courthouse, award seasons, a living social world, home and the bank, and a logic pass

### Retiring actually works
- **Industry & Life** now opens with **Your career**: Full-time artist, Semi-retired (drop a single when you feel like it), Business focus (your companies earn more and handle trouble better) and Retired (the catalogue keeps paying; a post-career role gives you something to do). Each mode changes what reaches you — offers, asks, shows, press — and how fast fans drift.
- **Comebacks**: announce one and your first release within 45 days gets a nostalgia bump.

### Feature deals with honest money
- Every verse deal has **payment terms**: paid up front, half now / half on delivery, or free. The money you're owed is shown, and what you've been paid is a real receipt — so nobody chases you about a verse they "paid for" when they didn't.
- Agree to a verse in your DMs and the song lands in **Studio → Features** with its due date. Open it, choose the effort, and write it.
- Paid for someone's verse and it never came? **Chase** them, ask for a **refund**, or **sue**. How they answer depends on who they are: some are just late, some ignore you, some pay back.

### The courthouse
- Lawsuits both ways: unpaid verses, unpaid balances, walking out on a show, defamation, uncleared samples, defaulted loans. Cases are **served**, answered (pay, settle, fight or ignore) and heard on the game clock.
- **Lawyers**: one on your team, or hire legal aid, a practice or a top firm for the case. Go to court and testify, or let your lawyer handle it. Verdicts move money, reputation and the news, and go in your journal.

### Award seasons
- Local and international award bodies with their own calendars: nominations, a voting window, then the ceremony night. **Follow** an award to get the news; campaign and rally your fans to vote when you're nominated.
- **Award night**: red carpet (your drip is judged), perform if they ask you, open the envelopes, give a speech if you win. Winners trend on social, and everything lands in your journal.

### A social world that talks back
- Your posts **get comments** as the hours pass, even small ones, and **fans post** about you: your new release, your nominations, your court case, your beef — and about the rest of the scene. Fans who mention you show up in Activity.
- **Big artists roll their releases out**: an announcement a few days before ("🗓️ out Friday"), then the drop. Real artists only appear as cards (no words in their mouth). Artists now space their releases out like real people instead of dropping every week.
- **Tap any name or face** on Chirp, Snapgram, Clip or Circle and you get **their social page**: bio, followers, following, likes, their posts on each app, their replies, what they've liked and the people you both know. Message, follow, block, their music and their contact card are one tap away. Fan accounts and award bodies have pages too.

### Home & Life (new page)
- Everybody lives somewhere. You start in the **family house** and can move to a single room, an apartment, a gated apartment, a villa or a mansion — **rented or bought**. Prices follow your country, and in **Ghana and Nigeria landlords want a year up front**, like in real life.
- **Monthly bills** (food, power, data, transport, upkeep on what you own) come out every month. Fall behind on rent and you get **30 days' notice**, then you're back at your mum's — and if you're famous, the blogs hear about it.
- Where you sleep matters: better places raise your **max energy**. Film a **house tour** once per place. Let out homes you own for rent income.
- Cars, a jet membership, a yacht and art now **cost money to keep** and can be **sold** for what they're worth today. Jewellery and watches live in Drip & Ink.

### The bank (Money → Bank)
- A **credit score** built from what you earn, how long you've earned it, what you own and whether you pay. **Personal loans** and **mortgages** (20% down) at rates that depend on your country and your score.
- Payments come out monthly. Miss one and there's a late fee; miss three and the bank calls the loan in, **repossesses the house** for a mortgage, and **takes you to court** for the rest.

### Logic pass
- **Streams were counted seven times**: lifetime streams, fan growth and fame were adding the weekly figure every day. Fixed — a career now grows at a believable pace (a good Ghanaian newcomer reaches tens of thousands of fans in months, not a million).
- **Momentum fades** day by day and posting alone can't make you hot; it now reflects what's happening right now. Three quiet weeks and people start forgetting you.
- **Reputation no longer drains on its own**: unanswered collab offers were "escalating" forever and costing reputation. Only real trouble escalates now, and old storylines close themselves.
- Feature asks you never answer **expire after two weeks** instead of sitting open forever.
- Nobody offers you shows, cash gigs, bring-outs or fan letters about songs you haven't released; blogs only blackmail people worth a headline; rewards for viral moments scale with how famous you are.
- Show fees follow local ticket prices. Headlines read properly ("New Music: X releases …"). Notifications for court, awards, features and home open the right page. The sidebar and dashboard show the same fame number. Real artists' DMs come through their team.

## 2026-10-19 (i) — DMs that make sense, a label with its own page, a social media manager, Groq in a minute

### Deals in the DMs now leave something behind
- **Beats you buy in a DM land in Studio → Beats**, exclusive, ready to record on. Before, the money left and nothing arrived.
- **"Let me jump on one of yours instead"** is a real trade: the beat lands in your library *and* their tape lands in **Studio → Features** with a due date. Don't deliver and they'll want paying for the beat — or take you to court for it. You can back out by paying for the beat.
- Saying yes to a collab, a verse swap or a free verse in a chat sends the record **straight to Studio → Features** — no second "ask" in the Mailbox.
- **Cash gigs are nights on the clock**: "Friday, 11 PM at their club, $X cash after the set" goes in your diary; you get paid when you play. Do the full set, ten minutes and dip (less money), or walk out. Shady promoters sometimes pay half ("the door was slow"). No-shows cost the relationship and your reputation. Club money now follows the city.
- **"I'm bringing you out tonight"** is also a night in your diary — be there when they call your name.
- Playing someone your unreleased song and them loving it now gets **their verse on your song** (it arrives in Features), not you on theirs.
- A designer dressing you leaves the piece in your wardrobe.

### A DM is a DM
- People answer in their own words. The story of what happened ("X's people came back with a number…") is a small note under the chat, never a bubble from them. Feature replies, counters and refusals all got proper voices.
- **"Ask to link up"** (was "Spend an evening") sends a text. They answer — yes with a time, "this week is mad", or nothing — and the evening (and what it does for you two) happens when you actually meet. You meet in your city.
- Outcome chips say where things went: 🎹 beat in your library, 🎙️ verse owed in Features, 🗓️ in your diary, 🎁 in your wardrobe.
- Show offers in the DMs read like a person ("Sat 14 Feb"), with the "go to Shows → Offers" hint as a note.
- Global stars no longer DM an unknown from another country for a verse. Real artists' asks come through their team.

### Your label has its own page
- The label posts from **its own account** — signings, releases, videos — not from yours. Its page shows its roster, followers that grow with its artists, and a link to run the label.
- The composer has **Post as: you / your label**.

### Social media manager
- Put your **publicist on "Social media manager"** (Team): they post for you a few times a week — your new release, your next show, award votes, studio content — answer fans, and keep your pages from going quiet. Their posts say who posted them.

### Small fixes
- Car trouble when you don't own a car is a ride problem, not an $800 tow. Big houses with security don't get burgled. The old friend you take on the road is for the month you paid for.

### AI: Groq in a minute
- AI Brain now opens with a **free Groq quick start**: a link to console.groq.com/keys, three steps, and a "Use Groq" button. Every provider's "get a key" line is a clickable link.

## How to run

```
npm install
npm run dev      # play at the address it prints (usually http://localhost:5173)
npm run build    # single-file build in dist/index.html
npm start        # optional: the game + online accounts at http://localhost:8080 (see SETUP.md)
```
