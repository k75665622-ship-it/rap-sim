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

## How to run

```
npm install
npm run dev      # play at the address it prints (usually http://localhost:5173)
npm run build    # single-file build in dist/index.html
```
