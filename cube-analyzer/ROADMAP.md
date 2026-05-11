---
kind: doc
doc-type: note
status: draft
audience: contributor
domain: manabase
authority: low
last-verified: 2026-05-11
---

# Vintage Cube Mastery Platform

**Product Thesis:** A coaching platform that makes you measurably better, not a reference tool you look at during games. Internalize everything before you show up. Pure instinct and knowledge.

---

## Implementation Status

### Core Infrastructure ✅ COMPLETE
- [x] **Spaced Repetition Engine** - SM-2 algorithm in `spacedRepetition.ts`
- [x] **Skill Rating System** - ELO per category with percentiles
- [x] **Mistake Pattern Tracking** - Tracks failure patterns per category
- [x] **Progress Dashboard** - Visual skill ratings with trends

### Phase 1: Foundation ✅ COMPLETE
- [x] **Full Pack P1P1** - 15-card packs with ELO-based correct picks
- [x] **Mulligan Trainer** - 7-card hands with archetype context
- [x] **Signal Recognition Quiz** - 30+ cards mapped to archetype signals
- [x] **Archetype Key Cards Flashcards** - 10 archetypes, select correct key cards

### Phase 2: Integration ✅ MOSTLY COMPLETE
- [ ] **Tournament Simulation** - Full draft → build → play (NOT YET BUILT)
- [x] **Sideboard Scenarios** - 10 matchups with board in/out decisions
- [x] **Sequencing Puzzles** - 8 combo/tempo play order puzzles
- [x] **Progress Dashboard** - ELO bars, trends, strengths/weaknesses

### Phase 3: Depth ✅ PARTIAL
- [ ] Power Tier Drill
- [ ] Speed Draft Mode
- [ ] Pack 2/3 Context Picks
- [x] **Combo Line Practice** - Covered by Sequencing Puzzles
- [x] **Who's the Beatdown** - 10 matchup role identification scenarios

---

## Current Training Modes

### Core Drills (Featured)
1. **Pack P1P1** - Pick the best card from a real 15-card pack
2. **Mulligan Trainer** - Keep or mull with archetype context
3. **Signal Quiz** - What does this late pick mean?
4. **Archetype Drills** - Select 3 key cards for each archetype
5. **Sideboard Guide** - What comes in/out for each matchup?
6. **Sequencing** - Order your plays correctly for combos/tempo
7. **Who's the Beatdown?** - Identify the aggressor role

### Quick Games
- Higher or Lower (ELO comparison)
- Speed Round (30 seconds, max correct)
- Will It Wheel? (Pick likelihood)
- First Pickable? (P1P1 worthy)
- Guess the CMC
- Synergy Snap (Do these combo?)
- Stay in Lane (On-color picks)

---

## Remaining Work

### High Priority
1. **Tournament Simulation** - The capstone feature integrating all skills

### Nice to Have
- Power Tier Drill (S/A/B/C/F instant rating)
- Speed Draft Mode (45 sec/pick pressure test)
- Pack 2/3 Context Picks (draft pool considerations)

---

## How Skills Compound

```
Card Evaluation ──────┐
                      ├──► Full Pack P1P1 ──┐
Archetype Knowledge ──┘                     │
                                            ├──► Tournament Performance
Signal Recognition ───► Draft Decisions ────┤
                                            │
Mulligan Training ────► Game 1 Win Rate ────┤
                                            │
Sideboard Knowledge ──► Games 2-3 Win Rate ─┘

Sequencing ──────────► Close Game Conversion
```

---

## Success Metrics

- **Skill ratings increase over time** - The system makes you better
- **Spaced repetition reduces review time** - You retain what you learn
- **Mistake patterns get addressed** - Weak spots become strengths
- **Core drill accuracy > 80%** - Internalized knowledge

---

## Captured Ideas (Future)

- Card Role Quiz
- Trap Card Identification
- Pivot Scenarios
- Draft Replay Mode
- Archetype Draft Drill
- 6-Card Keep/Mull scenarios
- On the Play vs Draw differences
- Hate Card Recognition
- Threat Assessment
- Counter Timing
- Damage Racing Math
- Build-Around Recognition
- Mana Base Builder
- Board State Read
- Danger Detection
