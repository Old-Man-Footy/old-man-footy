# Marketing Plan: Zero-Budget Organic Growth

> Location note: this file sits at `docs/marketing_plan.md` at the maintainer's explicit request,
> rather than `docs/plans/<feature>-plan.md` as `docs/AGENTS.md` prescribes. It is indexed in
> [docs/plans/master-plan.md](plans/master-plan.md).

**Assumptions:** one volunteer, three to five hours a week, $0 spend. Every activity below costs time
only and uses free tools. Where an activity needs a product change, it is listed as a suggestion with
a remediation reference and is not to be built without maintainer approval (root `AGENTS.md` §6.3).

## 1. Positioning

**One line:** _Every Rugby League Masters carnival in Australia, in one place — free, and built by
the Masters community for the Masters community._

| Audience                                       | What they want                                                             | What Old Man Footy gives them                                                    | Role in growth                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Club delegates / organisers                    | Fill their carnival, manage registrations and players without spreadsheets | Carnival pages, club registrations, player lists, fee tracking, sponsor showcase | **Supply** — every carnival listed brings its players     |
| Masters players (35+) and families             | Know where and when to play, which clubs are going                         | Searchable carnival list by state, club pages, galleries, email alerts           | **Demand** — the audience delegates are trying to reach   |
| State Masters associations and regional bodies | A calendar they do not have to maintain                                    | A ready-made, MySideline-synced calendar they can link to                        | **Multipliers** — one endorsement reaches dozens of clubs |
| Local media and club sponsors                  | Local stories, visibility                                                  | Carnival photo galleries, sponsor listings on carnival and club pages            | **Amplifiers**                                            |

**Proof points to repeat everywhere:** free to use; carnivals already imported from MySideline
(organisers only need to claim them); state-by-state email alerts; volunteer-run, no ads.

**Tone:** mates talking to mates. Plain Australian English, short sentences, a bit of larrikin humour
("Old blokes, new tricks"). Never corporate.

## 2. Gate: fix before you promote

Sending people to broken journeys burns goodwill you cannot buy back. Do not start Section 5 outreach
until these items in [remediation_plan.md](remediation_plan.md) are closed:

| Must be fixed                                        | Why it blocks marketing                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| B-04 Log in / Create account links on carnival pages | The main conversion buttons on the page you will share most            |
| B-02 Delegate invitations                            | Delegates you recruit cannot bring in their committee                  |
| B-06 Joining an existing club                        | Second and third people from a club hit a dead end                     |
| B-01 Unsubscribe                                     | Email marketing without working unsubscribe breaches the Spam Act 2003 |
| B-03 Flash messages                                  | Users get no feedback after actions and assume the site is broken      |
| B-05, B-10 Dead links and missing scripts            | First impressions                                                      |
| B-17 to B-19 Onboarding                              | New delegates land on an empty dashboard                               |

Weeks 1–2 of the roadmap (Section 8) can run in parallel with these fixes because they build assets,
not traffic.

## 3. Product-led growth: make the site market itself

The cheapest marketing is a site that spreads every time someone uses it. These are suggestions
requiring approval; each would become its own remediation item.

| Suggestion                                                                                                              | Effort | Why it matters                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `robots.txt` and `sitemap.xml` (carnivals, clubs)                                                                       | Small  | Neither exists; Google cannot efficiently discover carnival pages                         |
| schema.org `SportsEvent` JSON-LD on carnival pages                                                                      | Small  | Carnivals can appear in Google's event results for "masters rugby league carnival <town>" |
| Canonical links; carnival `og:description` that includes date and town (currently first 150 characters of the schedule) | Small  | Facebook and WhatsApp previews are the main sharing surface for this audience             |
| "Add to calendar" (ICS download and Google Calendar link)                                                               | Small  | Players save the date; organisers get fewer "when is it again?" messages                  |
| Native share (Web Share API) on mobile, share button on list cards                                                      | Small  | Most of the audience is on phones in Facebook groups                                      |
| Embeddable "Our upcoming carnivals" widget or link badge for club websites                                              | Medium | Every club site becomes a referral source and backlink                                    |
| Printable carnival poster with QR code, generated from the carnival page                                                | Medium | Free offline promotion at grounds, clubhouses and pubs                                    |
| Post-carnival "Photos are up" email to registered clubs                                                                 | Medium | Galleries are the most shareable content the site has                                     |

Free one-off set-up (one hour, no code): verify the domain in Google Search Console and Bing
Webmaster Tools; submit the sitemap once it exists; claim a Google Business Profile only if the
project has a public contact point.

## 4. Supply first: recruit delegates

Players follow carnivals; carnivals follow delegates. Spend most early effort here.

### 4.1 "Claim your carnival" outreach

The site already imports carnivals from MySideline. Each unclaimed carnival is a warm lead: the
organiser's event is already listed and just needs them.

1. Each week, list unclaimed upcoming carnivals from the admin carnival list — they show a
   "MySideline Import" badge and an admin Claim button (no code needed).
2. Find the organising club's public contact (MySideline listing, club website or Facebook page).
3. Send the "Claim your carnival" message (Appendix A1), personalised with the carnival name and date.
4. Target: **10 personalised messages a week**. Track in a simple spreadsheet: club, contact, date
   sent, reply, claimed.
5. Follow up once after seven days. Never more than twice.

### 4.2 State associations

Approach each state's Masters body (start with NSW and QLD, where most carnivals run) with a short
offer: "We already list your members' carnivals; would you link to us as your public calendar?" Ask
for one thing only: a link from their website or a post in their newsletter. Template in Appendix A2.

### 4.3 Founding clubs

Offer the first 20 clubs that claim their page and register for a carnival a "Founding Club" mention
on the About page and in the monthly round-up. Recognition costs nothing and gives delegates
something to brag about in their own club group.

## 5. Demand: reach players where they already are

### 5.1 Facebook groups (primary channel)

Masters rugby league lives in Facebook groups: state Masters groups, club pages, regional footy
groups and "old boys" groups.

- Join the relevant groups under a personal profile and read the rules first. Ask admins before
  posting links if rules are unclear.
- Post value, not ads: the weekly "This weekend's carnivals" list (Section 6) with one link to the
  state-filtered carnival page.
- Reply helpfully when someone asks "anyone know of a carnival in…?" with the direct carnival link.
- Maximum: one post per group per week. Comments any time they genuinely help.

### 5.2 Carnival-day presence

- Print-at-home A4 poster (Appendix A4) with a QR code to the carnival's page and "Photos go up here
  after the game".
- Ask the organiser to stick it at the canteen and the sign-on table, and to announce "photos on Old
  Man Footy" over the PA.
- After the day, post the gallery link in the club's Facebook page comments. Tagged photos spread
  further than any other content.

### 5.3 Club channels

Delegates who claim a carnival get a short "spread the word" kit (Appendix A3): a ready-made post for
their club page, a newsletter blurb and the poster. Make it easy for them to promote us while
promoting themselves.

### 5.4 Local media

Regional papers and community radio need local sport stories. For carnivals of eight or more teams,
send the press release (Appendix A5) to the local paper two weeks out and offer photos afterwards.
Pitch human stories: oldest player, father and son on the same team, a club returning after years
away.

### 5.5 Email subscribers

The site already supports state-based email alerts. Promote subscription on every post ("Get a heads
up when carnivals open in your state"). Send at most one round-up a month (Section 6). Only start
once B-01 (unsubscribe) and B-11 (verification email) are fixed.

## 6. Content engine (one hour a week, batched)

| Content                                              | Frequency                       | Source                                                 | Channel                                    |
| ---------------------------------------------------- | ------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| "This weekend's carnivals" list                      | Weekly (Wednesday)              | Carnival list filtered to upcoming                     | Facebook groups, club pages                |
| Carnival spotlight (one carnival, photo, two lines)  | Weekly                          | A claimed carnival with a promotional image            | Facebook                                   |
| Gallery highlights ("Photos from <carnival> are up") | After each carnival with photos | Carnival gallery                                       | Facebook, organiser's page                 |
| Monthly state round-up                               | Monthly                         | Upcoming carnivals plus last month's results or photos | Email subscribers, association newsletters |
| Club or player spotlight (short Q&A)                 | Monthly                         | Ask a delegate five questions by message               | Facebook, About page                       |
| Milestone posts ("100 carnivals listed")             | When reached                    | Admin stats                                            | Everywhere                                 |

Write all of a week's posts in one sitting. Reuse wording; nobody minds a familiar format.

## 7. Weekly cadence (solo volunteer)

| Day                               | Task                                                                             | Time   |
| --------------------------------- | -------------------------------------------------------------------------------- | ------ |
| Monday                            | Outreach: 10 "claim your carnival" messages; follow-ups                          | 60 min |
| Wednesday                         | Write and schedule this week's carnival list and spotlight; post to groups       | 60 min |
| Friday                            | Reply to comments, messages, and contact-form enquiries; share any new galleries | 30 min |
| Sunday or Monday after a carnival | Post gallery highlight; thank the organiser publicly                             | 15 min |
| First Monday of the month         | Monthly round-up email; metrics review (Section 9)                               | 60 min |

About three and a half hours a week, with one heavier week a month.

## 8. 90-day roadmap

| Weeks | Focus                                                   | Outcomes                                                                                                                                                                                |
| ----- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2   | **Foundations** (runs alongside remediation Phase 1)    | Search Console and Bing verified; outreach spreadsheet set up; templates finalised; list of 30 Facebook groups and 20 target clubs; About page states the "free, volunteer-built" story |
| 3–6   | **Delegate recruitment** (once Section 2 gate is clear) | 40 outreach messages sent; first state association approached; 10 carnivals claimed; first Founding Clubs named                                                                         |
| 7–12  | **Season amplification**                                | Weekly carnival lists running in at least 10 groups; posters at five carnivals; one local media story; first monthly round-up sent; 25 carnivals claimed                                |

Review at day 90: keep what moved the numbers, drop what did not.

## 9. Measurement (free tools only)

| Metric                                        | Tool                                                                                                           | 90-day target                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Upcoming carnivals claimed by a delegate      | Admin carnival list                                                                                            | 25                              |
| Active delegates (logged in within 30 days)   | Admin users list                                                                                               | 40                              |
| Clubs with at least one carnival registration | Admin clubs list                                                                                               | 30                              |
| Email subscribers                             | Admin contact-submissions area (subscriber tools)                                                              | 200                             |
| Organic search impressions and clicks         | Google Search Console                                                                                          | Upward trend month on month     |
| Visitors and top referrers                    | Cloudflare Web Analytics (free; enable in the Cloudflare dashboard — the site's CSP already allows its beacon) | Facebook in top three referrers |
| Outreach reply rate                           | Outreach spreadsheet                                                                                           | 30%                             |

Monthly review checklist:

- [ ] Record each metric in the spreadsheet
- [ ] Note which Facebook groups drove clicks (Cloudflare referrers); drop groups with none after two months
- [ ] Note which outreach messages got replies; adjust the template
- [ ] Pick one experiment for next month (new group, new post format, new state)

## 10. Risks and guardrails

- **Spam perception:** one post per group per week, follow group rules, never cold-message players.
  Outreach goes to public club contacts only.
- **Privacy:** never post player names or photos without the club's consent; respect gallery
  permissions. No player data in marketing material.
- **Volunteer burnout:** the cadence is the ceiling, not the floor. Skip a week rather than drop the
  monthly review.
- **Brand confusion with MySideline/PlayNRL:** position Old Man Footy as the Masters community
  calendar that works alongside MySideline, never as a replacement for official registration.
- **Overpromising:** only mention features that exist. The automated draw and scheduled email plans
  are not built yet (see [master-plan](plans/master-plan.md)).

## Appendix A — Copy templates

### A1 "Claim your carnival" message

> G'day <name>,
>
> I help run Old Man Footy (oldmanfooty.au), a free calendar for every Rugby League Masters carnival
> in Australia. Your <carnival name> on <date> is already listed from MySideline.
>
> If you claim it (two minutes, free), you can add your draw, sponsors and photos, and see which
> clubs are coming. Here's the page: <carnival link>
>
> Happy to help if you have any questions. Cheers, <your name>

### A2 State association approach

> G'day <name>,
>
> Old Man Footy (oldmanfooty.au) is a free, volunteer-run calendar of Masters rugby league carnivals.
> We already list <n> carnivals in <state>, synced from MySideline, with state email alerts for
> players.
>
> Would you be open to linking to it from your website or mentioning it in your next newsletter? It
> costs you nothing and your clubs keep full control of their own listings.
>
> Cheers, <your name>

### A3 Club "spread the word" post

> 🏉 We're hosting <carnival name> on <date> at <ground>! All the details, who's coming and (after
> the day) the photos are on Old Man Footy: <carnival link>. Got mates who still reckon they've got a
> game in them? Tag them.

### A4 Carnival-day poster text

> **<Carnival name>**
> Photos, results and next carnival dates →
> [QR code to carnival page]
> **oldmanfooty.au** — every Masters carnival in one place

### A5 Press release (local media)

> **Masters rugby league carnival comes to <town>**
>
> <Number> teams of players aged 35 and over will take the field at <ground> on <date> for the
> <carnival name>, hosted by <club>. <One human-interest line: oldest player, family connection,
> charity cause.>
>
> "<Short quote from the organiser>," said <name>, <role> at <club>.
>
> Spectators are welcome. Full details: <carnival link>.
>
> Media contact: <name>, <phone>, <email>. Photos available after the event.

### A6 Weekly Facebook carnival list

> 📅 Masters carnivals this weekend:
> • <Carnival> — <town>, <day>
> • <Carnival> — <town>, <day>
>
> Full list and state email alerts: oldmanfooty.au/carnivals
