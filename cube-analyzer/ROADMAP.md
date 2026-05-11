# Vintage Cube Mastery Platform

**Product Thesis:** A coaching platform that makes you measurably better, not a reference tool you look at during games. Internalize everything before you show up. Pure instinct and knowledge.

---

## Core Infrastructure (Build First)

These aren't features - they're the system that makes features valuable.

### 1. Spaced Repetition Engine
Every drill feeds into a scheduling system. Cards/scenarios you get wrong come back in 30 minutes. Ones you get right come back in 3 days. This is the difference between "fun drill" and "tool that actually improves you." Build this into the data model before building more modes.

### 2. Skill Rating System
ELO-style rating per competency category. "Your Mulligan rating is 1450 (78th percentile)." Creates retention (numbers go up), competition (leaderboards), and surfaces weak spots automatically.

### 3. Mistake Pattern Tracking
Across all modes, track HOW you fail. "You struggle with: aggro mulligans, blue signal reads, combo sequencing." This is what coaches charge money for. The system sees patterns you can't.

### 4. Skill Compounding Logic
If you're 85% on Card Evaluation but 60% on Full Pack P1P1, that means you know what's good but not what to draft first. Surface these connections. Mode A should make Mode B easier, and players should feel it.

---

## Phase 1: Foundation (Build Now)

These are the highest-impact training modes. Build them well.

### 1. Full Pack P1P1
See a real 15-card pack. Make your pick. See the ELO-based "correct" answer with reasoning. This is the closest thing to real draft reps. Repeat until patterns are automatic.

### 2. Mulligan Trainer
See 7 cards + your archetype. Keep or mull. Explanation of why. Then add matchup context - same hand might be keep vs control, mull vs aggro. Most players are terrible at this; huge edge available.

### 3. Signal Recognition Quiz
"Reanimate wheeled at pick 5. What does this mean?" Train the pattern recognition that happens mid-draft. Include wheel signals, cut signals, and what late picks indicate about open lanes.

### 4. Archetype Key Cards Flashcards
"Reanimator needs: ___" - drill until automatic. Combined with spaced repetition, this encodes archetype knowledge permanently. Feed into skill rating for Archetype Mastery category.

---

## Phase 2: Integration (Build Next)

### 5. Tournament Simulation
Draft → Build → Play simulated matches → Get Round 1-2-3 breakdown. This is the highest-emotional-stakes moment the app can offer. Surfaces skill gaps that isolated drills miss - you can ace mulligan training and still lose because you couldn't sequence game 2. **This integrates everything else.**

### 6. Sideboard Scenarios
"You're Storm vs Mono White. What comes in? What goes out? Why?" Drill the 10 most common matchup transformations until automatic. Games 2 and 3 are where matches are won.

### 7. Sequencing Puzzles
"You have these cards, this mana, this board. What's the correct play order?" Tight play matters. Start with common scenarios, track which sequencing patterns you miss.

### 8. Progress Dashboard
Visualize skill ratings across all categories. Show improvement over time. Highlight weak spots. "You've improved 15% on mulligans this week, but signal reads are stagnant." This is where the coaching platform identity becomes real.

---

## Phase 3: Depth (Build Later)

### 9. Power Tier Drill
Flash a card, you say S/A/B/C/F tier, instant feedback. Faster than Higher/Lower. Builds instant recognition.

### 10. Speed Draft Mode
Full draft with real time pressure (45 sec/pick). Tests if your knowledge holds under stress.

### 11. Pack 2/3 Context Picks
Given your current pool, what's the pick? Tests staying open vs committing. Harder than P1P1 because context matters.

### 12. Combo Line Practice
Step through Storm/Reanimator/Tinker lines until automatic. "You have LED, Breach, Brain Freeze, and 4 cards in yard. What's the line?"

### 13. Who's the Beatdown
Given two decklists, identify who needs to be the aggressor. Fundamental concept, undertrained.

---

## Captured Ideas (May Build Eventually)

These are good ideas worth remembering. Not committed to building them.

- Card Role Quiz - "What role does this card play?"
- Trap Card Identification - Learn which cards look good but underperform
- Pivot Scenarios - "You started UW, pack 2 you see these. Pivot?"
- Draft Replay Mode - Step through a draft with analysis
- Archetype Draft Drill - "Draft Reanimator" timed and scored
- Mulligan by specific matchup variations
- 6-Card Keep/Mull scenarios
- On the Play vs Draw mulligan differences
- Sideboard Builder - Given your 45, build optimal 15
- Hate Card Recognition - Flash card, name what it hates
- Post-Board Game Plans - How strategy changes after boarding
- Threat Assessment - "What do you kill first?"
- Counter Timing - "Do you counter this?"
- Damage Racing Math - Combat math scenarios
- Archetype Speed Awareness - Know goldfish turns
- Build-Around Recognition - See card, know what deck it anchors
- Flex Slot Quiz - "Which card fits most archetypes?"
- Mana Base Builder - Build correct lands for your spells
- Opening Hand Archetype ID - See 7 cards, name the deck
- Board State Read - Guess opponent's archetype from board
- Card Cluster Recognition - "These 3 cards mean ___"
- Danger Detection - Recognize when opponent is about to combo
- Archetype Frequency Awareness - What's common/rare
- Contested vs Open Drill - Unique pieces vs shared
- Color Depth Quiz - Which colors are deepest
- Metagame Positioning - If everyone drafts X, what beats it
- Rapid Fire Card Eval - 30 seconds, rate as many as possible
- Blitz Mulligan Decisions - 10 hands in 60 seconds
- Draft Log Import - Import real draft, get analysis

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

The platform should surface these connections:
- "Your Card Eval is strong but P1P1 is weak → you know power but not draft priority"
- "Mulligan accuracy dropped vs aggro → review aggro matchup hands"
- "Signal reads improving → your draft decisions should follow"

---

## Build Order

1. **Spaced Repetition Engine** - Infrastructure first
2. **Full Pack P1P1** - Highest-impact drill
3. **Mulligan Trainer** - Biggest skill gap for most players
4. **Skill Rating System** - Makes progress visible
5. **Signal Recognition Quiz** - Draft-day edge
6. **Archetype Flashcards** - Foundational knowledge
7. **Mistake Pattern Tracking** - Coaching insight
8. **Tournament Simulation** - Integration + emotional stakes
9. **Progress Dashboard** - Retention + motivation
10. **Sideboard Scenarios** - Games 2-3 edge

---

## Success Metrics

- **Skill ratings increase over time** - The system makes you better
- **Spaced repetition reduces review time** - You retain what you learn
- **Mistake patterns get addressed** - Weak spots become strengths
- **Tournament sim win rate improves** - Integrated skill translates to wins
