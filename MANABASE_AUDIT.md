# Manabase Audit

Snapshot taken: 2026-05-17

---

## 1. Inventory Table

### Original Manabase (`/manabase/`)

| folder | project | tags | one-line description |
|--------|---------|------|----------------------|
| /manabase | manabase-original | app | Monorepo root with workspaces |
| /manabase/_archive | manabase-original | archive | Old code snapshots from Dec 2025 refactors |
| /manabase/.claude | manabase-original | research | Claude skills and prompts |
| /manabase/.secrets | manabase-original | dependency | Local secrets storage |
| /manabase/apps | manabase-original | app | Application workspace container |
| /manabase/apps/api | manabase-original | app, elo, data | Hono API on Cloudflare Workers |
| /manabase/apps/db | manabase-original | data | D1 database schemas and migrations |
| /manabase/apps/mobile | manabase-original | app, ui | Mobile app (SolidStart) |
| /manabase/apps/party | manabase-original | app | PartyKit realtime server |
| /manabase/apps/web | manabase-original | app, ui | Main web app (SolidStart) |
| /manabase/backups | manabase-original | archive | Verification backups |
| /manabase/docs | manabase-original | research | Architecture and API documentation |
| /manabase/frontend | manabase-original | archive, unsure | Empty or legacy frontend folder |
| /manabase/notes | manabase-original | research | Design notes and planning docs |
| /manabase/notes/agent | manabase-original | research | AI agent integration notes |
| /manabase/notes/analysis | manabase-original | research | Analysis documents |
| /manabase/notes/architecture | manabase-original | research | Architecture decisions |
| /manabase/notes/contracts | manabase-original | research | API contract designs |
| /manabase/notes/designs | manabase-original | research, ui | UI/UX design notes |
| /manabase/notes/docs | manabase-original | research | Documentation drafts |
| /manabase/notes/experience | manabase-original | research | Experience design notes |
| /manabase/notes/game | manabase-original | research | Game mechanics notes |
| /manabase/notes/interactions | manabase-original | research | Interaction design |
| /manabase/notes/mobile | manabase-original | research | Mobile design notes |
| /manabase/notes/product | manabase-original | research | Product planning |
| /manabase/notes/promise | manabase-original | research | Product promise docs |
| /manabase/notes/puzzles | manabase-original | research | Puzzle system design |
| /manabase/notes/pwa | manabase-original | research | PWA exploration |
| /manabase/notes/test | manabase-original | research | Test planning |
| /manabase/notes/tests | manabase-original | research | Test case definitions |
| /manabase/notes/v2 | manabase-original | research | v2 planning notes |
| /manabase/packages | manabase-original | dependency | Shared packages workspace |
| /manabase/packages/core | manabase-original | dependency | Core draft and game logic |
| /manabase/packages/design-system | manabase-original | ui, pattern | Glass morphism design system |
| /manabase/packages/schemas | manabase-original | data | Zod schemas for validation |
| /manabase/packages/shared | manabase-original | dependency | Shared contracts and types |
| /manabase/packages/ui | manabase-original | ui | UI components library |
| /manabase/scripts | manabase-original | dependency | Build and dev scripts |
| /manabase/services | manabase-original | data, research | Microservices (mostly stubs) |
| /manabase/services/card2vec | manabase-original | research | Card embedding experiments |
| /manabase/services/decks | manabase-original | research | Deck service (stub) |
| /manabase/services/embeddings | manabase-original | research | Embedding service (stub) |
| /manabase/services/gateway | manabase-original | research | Gateway service (stub) |
| /manabase/services/pipeline | manabase-original | research | Data pipeline (stub) |
| /manabase/services/scryfall | manabase-original | data | Scryfall data fetcher |
| /manabase/tutorials | manabase-original | research | Tutorial content |
| /manabase/website | manabase-original | app, ui | Marketing website (Next.js) |

### MTG Cube / Vintage Cube Analyzer (`/mtg-cube/`)

| folder | project | tags | one-line description |
|--------|---------|------|----------------------|
| /mtg-cube | mtg-cube | app | Container folder for cube analyzer |
| /mtg-cube/.claude | mtg-cube | research | Claude project settings |
| /mtg-cube/cube-analyzer | vintage-cube-analyzer | app, analyzer, coach | Main draft analyzer application |
| /mtg-cube/cube-analyzer/docs | vintage-cube-analyzer | research | Documentation |
| /mtg-cube/cube-analyzer/public | vintage-cube-analyzer | ui | Static assets |
| /mtg-cube/cube-analyzer/scripts | vintage-cube-analyzer | data | Data fetching and simulation scripts |
| /mtg-cube/cube-analyzer/scripts/simulation | vintage-cube-analyzer | data, analyzer | Draft simulation engine |
| /mtg-cube/cube-analyzer/src | vintage-cube-analyzer | app | Application source |
| /mtg-cube/cube-analyzer/src/assets | vintage-cube-analyzer | ui | Asset files |
| /mtg-cube/cube-analyzer/src/components | vintage-cube-analyzer | ui, coach | React components |
| /mtg-cube/cube-analyzer/src/data | vintage-cube-analyzer | data, elo | Card data and ELO ratings |
| /mtg-cube/cube-analyzer/src/hooks | vintage-cube-analyzer | app | React hooks |
| /mtg-cube/cube-analyzer/src/services | vintage-cube-analyzer | analyzer, elo, archetype, coach | Core rating and coaching logic |
| /mtg-cube/cube-analyzer/src/services/cardRating | vintage-cube-analyzer | analyzer, archetype, elo | Archetype-aware rating engine |
| /mtg-cube/cube-analyzer/src/types | vintage-cube-analyzer | dependency | TypeScript type definitions |
| /mtg-cube/cube-analyzer/worker | vintage-cube-analyzer | app | Cloudflare Worker (stub) |
| /mtg-cube/src | mtg-cube | research, unsure | Duplicate/older src folder |
| /mtg-cube/src/services | mtg-cube | research, unsure | Duplicate services folder |
| /mtg-cube/src/services/cardRating | mtg-cube | research, unsure | Duplicate cardRating folder |

---

## 2. System Snapshots

### Original Manabase

**1. What is it today, in one paragraph, no jargon**

Manabase is a Magic: The Gathering platform for playing games, building decks, and tracking ratings. It runs on Cloudflare infrastructure with a SolidJS frontend. The system handles real-time multiplayer games through Durable Objects and PartyKit, stores persistent data in D1 (SQLite), and uses Clerk for authentication. It has a playtest mode, deck builder, matchmaking, and ELO rating system. There is also a marketing website and mobile app shell.

**2. What does it actually do for a user**

- Build and manage MTG decks
- Play 1v1 matches against other players
- See ratings and leaderboards by format
- Run drafts (cube and booster)
- Playtest decks with a goldfish simulator
- Solve MTG puzzles
- Track match history and win rates
- Join tournaments

**3. What is the data model**

- **Users**: Synced from Clerk, stored in D1. Has ratings per format.
- **Decks**: User-owned, stored in D1 with DeckDO for real-time editing.
- **Cards**: Oracle data from Scryfall, stored in D1.
- **Sessions**: Live game/draft sessions managed by SessionDO, persisted to D1.
- **Matches**: MatchResult records with ELO before/after, winner, duration.
- **Ratings**: Per-user per-format ELO (default 1200), computed server-side.
- **Tournaments**: Multi-round competition structures.

Key tables: users, ratings, decks, deck_cards, sessions, session_participants, match_results, cards, tournaments, venues.

**4. What is the deployment surface**

- **apps/api**: Cloudflare Workers + Durable Objects + D1
- **apps/web**: SolidStart on Cloudflare Pages
- **apps/party**: PartyKit for realtime presence
- **apps/mobile**: SolidStart (not fully deployed)
- **website**: Next.js on Cloudflare Pages

**5. What patterns from it have been ported elsewhere**

- **ELO calculation**: The `expectedScore()` and `calculateEloChange()` functions from `/apps/api/src/lib/matches.ts` have been referenced for Swapp's card ELO system. K-factor 32, standard formula.
- **Durable Object patterns**: The DO architecture (SessionDO, GameDO, DeckDO) is a pattern that could be reused.
- **Design system**: Glass morphism design system in `/packages/design-system`.

**6. What is still live and what is dormant**

Live:
- Core API routes (users, sessions, matches, decks)
- Web app shell
- ELO/rating system
- Playtest mode
- Deck builder

Dormant:
- Mobile app (shell only, not wired)
- Most microservices in `/services` (stubs)
- Tournament system (partially built)
- Puzzle system (has API, unclear frontend state)
- Agent/AI features (notes only)

**7. What is the annotation or xAPI emission state**

No xAPI emission. The term "statement" appears in seed scripts and SQL context, not xAPI. No learning record store integration. No annotation system visible.

---

### Vintage Cube Analyzer (the "new Manabase")

**1. What is it today, in one paragraph, no jargon**

A single-page React app for analyzing Vintage Cube draft picks. It shows card ratings, archetype affinities, and coaching recommendations during a simulated draft. The app loads a 360-card cube list, runs an 8-player draft simulation with AI opponents, and provides pick-by-pick advice based on ELO data and archetype fit. No backend required for core functionality - it runs entirely client-side with static JSON data.

**2. What does it actually do for a user**

- Browse the Vintage Cube card list with ELO ratings
- Practice drafting against 7 AI opponents
- Get real-time coaching: recommended picks, archetype signals, synergy bonuses
- See floor/ceiling ratings for build-around cards
- Choose an archetype (Open/Leaning/Committed mode) and see adjusted ratings
- View archetype composition, matchup matrices, power rankings
- Track draft progress with pool ELO and deck ELO metrics
- Study sample decks and archetype guides

**3. What is the data model**

- **cards.json**: 360 cards from CubeCobra with Scryfall data (name, colors, type, CMC, oracle text)
- **elo-ratings.json**: CubeCobra ELO for each card (1240-2377 range, pick counts, cube counts)
- **simulation-data.json**: Pre-computed simulation results (archetype frequencies, pick positions)
- **draftSimulatorConstants.ts**: Draft configuration (8 players, 3 packs, 15 cards each)
- **archetypes.ts**: 11 archetype definitions (key cards, signal cards, anti-synergy cards)
- **comprehensiveAffinities.ts**: Card-to-archetype weights for all 360 cards
- **Runtime state**: Draft picks, pack contents, archetype preferences (in React state)

No database. No user accounts. No persistence between sessions.

**4. What is the deployment surface**

- **Vite build**: Static HTML/JS/CSS to `/dist`
- **Cloudflare Pages**: Likely target (worker folder exists but is stub)
- **Local dev**: `npm run dev` on localhost:5173

**5. What patterns is it testing or proving out**

- **Archetype-aware rating**: Cards rated differently based on draft direction. Yawgmoth's Will goes from C- (general) to S-tier (Storm committed).
- **Floor/ceiling display**: Shows variance across archetypes for build-around cards.
- **Drift detection**: Auto-detects emerging archetype from picks.
- **Open/Leaning/Committed modes**: Mirrors draft psychology progression.
- **Madrury engine port**: Dot-product preference model from mtg-draftbot.

**6. What is the coaching layer doing**

The coaching layer in `DraftCoach.tsx` and `cardRating/` provides:

- **Pack Intel**: Color distribution, archetype signals, likely wheels
- **Active Synergies**: Card-to-card combos in pool
- **Missing Pieces**: What combo pieces you still need
- **Archetype Commitments**: Probability per archetype based on picks
- **Draft Signals**: What colors are open/cut
- **Mana Base Status**: Fixing needs and splash viability
- **Deck Projection**: Projected final deck shape

Coach mode can be toggled on/off. Quiz mode hides recommendations until after you pick.

**7. What is the rating system doing**

Rating system in `cardRating/`:

- **Base ELO**: Static ratings from CubeCobra (getEloData)
- **Synergy adjustment**: Card-to-card bonuses from pool synergies
- **Archetype weighting**: Madrury engine computes preference scores
- **Contextual grade**: A+ through F based on adjusted score
- **Wheel probability**: Based on ELO percentile (bottom 30% = likely wheels)
- **Floor/ceiling**: Min/max rating across all archetypes
- **Tier display**: S/A/B/C in-archetype value

The `madruryEngine.ts` (37KB) is the core: dot-product of card archetype weights vs drafter preferences, softmax for pick probability, ELO weighting by draft phase.

**8. What is the annotation or xAPI emission state**

No xAPI emission. No learning record store. No annotation system. All state is ephemeral in React. Grepped for xAPI - only hits in node_modules types.

---

## 3. Compare and Contrast

### Core purpose and user

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Primary user | MTG players who want to play online | MTG players practicing Vintage Cube draft |
| Core loop | Build deck, find opponent, play game, see rating | Start draft, make picks, learn from coaching |
| Multiplayer | Yes (real-time games) | No (single-player vs AI) |
| Persistence | Yes (accounts, history) | No (session only) |

### Data model and source of truth

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Cards | Scryfall import to D1 | Static JSON from CubeCobra |
| User data | D1 + Clerk | None |
| Ratings | D1 per-user per-format | Static JSON per-card |
| Game state | Durable Objects | React state |
| Persistence | D1 database | None (refresh = reset) |

### Rating and ELO approach

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| What is rated | Players (ELO 1200 default) | Cards (ELO 1240-2377 from CubeCobra) |
| Calculation | Standard ELO formula (K=32) | Not calculated, read from JSON |
| Updates | After each match result | Never (static) |
| Purpose | Matchmaking, leaderboards | Pick recommendations |

They use "ELO" to mean different things. Manabase rates players. Cube Analyzer rates cards.

### Archetype handling

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Archetype definitions | Minimal (format-based) | Detailed (11 archetypes with key/signal cards) |
| Detection | Not visible | Automatic from picks (drift detection) |
| Rating impact | None | Major (weights adjusted per archetype) |
| User control | None | Open/Leaning/Committed mode selector |

### UI and interaction patterns

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Framework | SolidJS | React |
| Design system | Custom glass morphism | Tailwind utility classes |
| Mobile support | Dedicated mobile app | Responsive design only |
| Desktop layout | Full app shell | Tab-based sections |

### Coaching or recommendation layer

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Presence | Minimal (deck suggestions?) | Extensive (full coach panel) |
| Pick advice | None visible | Real-time per pick |
| Archetype guidance | None | Drift detection, commitment modes |
| Synergy analysis | Unknown | Active synergies, missing pieces |

### Multiplayer or social surface

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Real-time play | Yes (WebSocket via PartyKit/DO) | No |
| Friend system | Yes (friends API) | No |
| Matchmaking | Yes | No |
| Spectating | Planned | No |

### xAPI / annotation posture

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| xAPI emission | None | None |
| Learning records | None | None |
| Annotation | None | None |

Neither project emits learning records or annotations.

### Tech stack

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Frontend | SolidJS + SolidStart | React + Vite |
| Backend | Cloudflare Workers + Hono | None (static) |
| Realtime | PartyKit + Durable Objects | None |
| Database | D1 (SQLite) | None |
| Auth | Clerk | None |
| Deploy | Cloudflare Pages/Workers | Cloudflare Pages (likely) |

### State of completeness

| Dimension | Original Manabase | Vintage Cube Analyzer |
|-----------|-------------------|----------------------|
| Core loop | Working but rough | Working and polished |
| Authentication | Complete | None needed |
| Multiplayer | Working | Not applicable |
| Mobile | Shell only | Responsive works |
| Rating system | Working | Working |
| Coaching | Minimal | Extensive |
| Documentation | Extensive architecture docs | Light README |

---

**What each project is actually for, given what I observed:**

**Original Manabase** is a platform for MTG players to play games online and track their ratings. It has the infrastructure for multiplayer (real-time games, matchmaking, tournaments) but the game experience itself is not fully polished. The ELO system works. The deck builder works. The playtest works. The actual "play a game against another person" flow exists but is not the main draw yet. It is more of a backend and architecture testbed than a finished consumer product.

**Vintage Cube Analyzer** is a draft training tool for one specific cube format. It has no multiplayer, no accounts, no persistence. What it does have is a polished single-player draft simulation with extensive coaching. The archetype detection, rating adjustments, floor/ceiling display, and pick recommendations are all working and visible. It is a focused tool that solves one problem well: helping someone get better at drafting Vintage Cube.

---

## 4. Gap Report

### Original Manabase

| Dimension | Score | Gaps |
|-----------|-------|------|
| Clarity of purpose | 5/10 | Tries to be too many things: game platform, deck builder, tournament system, puzzle system. Unclear what the MVP is. |
| Data model coherence | 7/10 | Well-documented. Foreign keys enforced. Some missing endpoints noted in docs (weekly-stats, active-sessions). |
| Rating and archetype logic correctness | 6/10 | ELO formula is correct and standard. Archetype handling is minimal - no deck archetype classification visible. |
| Coaching or recommendation quality | 3/10 | Unclear what coaching exists. Deck intelligence route (111KB) exists but UI surface not obvious. |
| UI clarity for the actual user | 4/10 | Complex. Many sections. Not clear what the happy path is. |
| Documentation a new contributor could use | 7/10 | Good architecture docs, API contracts, data model docs. Could use more "getting started" guidance. |
| Test coverage on the critical path | 4/10 | Tests exist (playwright, e2e) but unclear coverage. "verify-ranked-loop" suggests manual verification still needed. |
| Observability in production | 5/10 | Metrics route exists. Logger exists. Unclear if dashboards or alerts are wired. |
| Reusability of patterns | 6/10 | ELO calculation is clean and portable. DO patterns are specific to Cloudflare. Design system exists but is custom. |

### Vintage Cube Analyzer

| Dimension | Score | Gaps |
|-----------|-------|------|
| Clarity of purpose | 9/10 | Clear: draft training for Vintage Cube. One thing done well. |
| Data model coherence | 6/10 | Static JSON files work but are not normalized. Some duplication (explicit affinities vs comprehensive affinities). |
| Rating and archetype logic correctness | 8/10 | Madrury engine is sophisticated. Archetype weights are hand-tuned. Some cards may be missing affinity data. |
| Coaching or recommendation quality | 9/10 | Extensive. Pack intel, synergies, signals, projections. Works visibly in UI. |
| UI clarity for the actual user | 7/10 | Good for desktop. Mobile works but cramped. Many tabs/sections to navigate. |
| Documentation a new contributor could use | 3/10 | Light README. No architecture docs. Code comments are good but no onboarding guide. |
| Test coverage on the critical path | 2/10 | Playwright in devDeps but no visible test files. No unit tests found. |
| Observability in production | 1/10 | No observability. No logging. No metrics. |
| Reusability of patterns | 7/10 | Archetype mode, floor/ceiling, drift detection are all portable concepts. Madrury engine could be extracted. |

---

### The good of each

**Original Manabase:**
- Clean ELO implementation with proper expected score calculation
- Well-documented data model with ownership and access rules
- Durable Object architecture that properly separates live state from persistence
- Working authentication with Clerk integration
- OpenAPI routes with schema validation
- Real multiplayer infrastructure (PartyKit + DO + D1)
- Design system with consistent glass morphism aesthetic

**Vintage Cube Analyzer:**
- Focused product with clear value prop
- Sophisticated rating engine (Madrury port)
- Archetype mode with Open/Leaning/Committed progression
- Floor/ceiling display that reveals build-around potential
- Drift detection that mirrors real draft psychology
- Working coach panel with multiple intelligence surfaces
- Card-to-card synergy database
- Quiz mode for self-testing
- Works entirely client-side (no infra cost)

---

### The bad of each

**Original Manabase:**
- No clear MVP. Too many half-built features.
- Mobile app is a shell with no unique functionality
- Services folder is mostly stubs
- Agent integration is notes only
- Tournament system is incomplete
- Puzzle system is incomplete
- Match history endpoint is missing per docs
- Weekly stats endpoint is missing per docs
- Active sessions endpoint is missing per docs
- No clear "first 5 minutes" experience

**Vintage Cube Analyzer:**
- No tests
- No observability
- No persistence (draft progress lost on refresh)
- No documentation for contributors
- Duplicate folders at root level (`/mtg-cube/src/` mirrors `/mtg-cube/cube-analyzer/src/`)
- Static data cannot be updated without code deploy
- ELO data is from CubeCobra, which may drift from actual cube
- Some affinity data is incomplete (property-based rules fill gaps)
- No way to track improvement over time

---

### What is half-built

**Original Manabase:**
- Tournament system (DO and routes exist, unclear UI)
- Puzzle system (API exists, frontend state unclear)
- Mobile app (shell, not wired to real features)
- Agent integration (notes only)
- Spectator mode (mentioned in design, not found in code)
- Friend activity feed (friends API exists, feed unclear)
- Deck intelligence (111KB route, unclear UI surface)
- Card recognition service (route exists, integration unclear)

**Vintage Cube Analyzer:**
- Cloudflare worker (folder exists, no implementation)
- Deck analysis scripts (simulation folder has scripts, not wired to UI)
- Games page (167KB component, unclear completion state)
- Sample decks page (exists but unclear if current)
- Prep calendar (exists, unclear use case)

---

## 5. Overlap and Conflict

### Where the two projects do the same job two different ways

| Job | Original Manabase | Vintage Cube Analyzer |
|-----|-------------------|----------------------|
| Card data | Scryfall import to D1, resolved at runtime | Static JSON baked into bundle |
| ELO display | Per-player rating from D1 | Per-card rating from JSON |
| Archetype detection | Not implemented | Full engine with 11 archetypes |
| Draft simulation | Draft DO with real multiplayer | Client-side with AI opponents |
| Deck building | Full editor with DO sync | None (pool only) |
| Synergy analysis | Unknown (deck-intelligence route) | Visible in coach panel |

### Where one project's pattern is clearly better

| Pattern | Winner | Why |
|---------|--------|-----|
| Archetype rating | Vintage Cube Analyzer | Actually implemented with weights, modes, drift |
| Coaching UI | Vintage Cube Analyzer | Visible, working, multi-faceted |
| Floor/ceiling display | Vintage Cube Analyzer | Original has nothing comparable |
| Multiplayer infrastructure | Original Manabase | Real DO/PartyKit stack vs none |
| Data persistence | Original Manabase | D1 vs no persistence |
| Authentication | Original Manabase | Clerk vs none |
| ELO calculation | Original Manabase | Proper player ELO vs static card data |

### Where naming, data, or logic conflicts

- **"Manabase"**: Both called Manabase informally. Cube analyzer README says "related to the Manabase MTG training platform."
- **"ELO"**: Manabase uses ELO for player ratings. Cube analyzer uses ELO for card pick frequency. Same word, different meaning.
- **Card data**: Manabase fetches from Scryfall. Cube analyzer uses CubeCobra export. Different sources.
- **Archetype definitions**: Cube analyzer has 11 explicit archetypes. Manabase has none visible.
- **Rating system**: Completely different things being rated.

### Where one project depends on or borrows from the other

- Cube analyzer README says it "may be folded into Manabase"
- No code imports between them
- No shared packages
- No API calls between them
- They are currently independent except for the naming relationship

---

## 6. Coordination Notes for Swapp and Empress

### What patterns from either project are currently being ported, or could be

**From Original Manabase to Swapp:**
- ELO calculation (`expectedScore`, `calculateEloChange`, K-factor 32) - already referenced
- Durable Object patterns for live state
- Clerk authentication flow

**From Vintage Cube Analyzer (potential):**
- Archetype-aware rating could apply to Swapp card matching
- Floor/ceiling concept could show card versatility
- Drift detection could suggest emerging user preferences

**From Swapp back to these projects:**
- Swapp's card data model (if different)
- Any xAPI patterns from Swapp

### What patterns from Swapp or Empress these projects should probably be using

- Neither project emits xAPI statements
- Neither project has annotation support
- If Empress has standard xAPI emission patterns, both should adopt them
- If Swapp has standard ELO patterns, original Manabase already matches; cube analyzer uses a different concept

### Data or schema overlap

- Card data: All three need MTG card data. Scryfall is the ultimate source.
- User data: Manabase uses Clerk IDs. Swapp uses Clerk IDs. No direct user data sharing.
- ELO: Manabase player ELO vs Swapp card ELO vs Cube Analyzer card ELO - three different systems using the same name.

---

*End of audit. No recommendations included per brief.*
