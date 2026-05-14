# ELO Rating & Adaptive Synergy System - Technical Analysis

## Overview

This document describes our card evaluation system for MTG Vintage Cube drafting. The system has two layers:

1. **Base ELO** - Raw card power from CubeCobra pick data
2. **Synergy-Adjusted ELO** - Contextual adjustments based on deck state, archetype, and draft phase

---

## Part 1: Base ELO System

### Data Source

ELO ratings come from **CubeCobra**, based on actual pick data from thousands of drafts.

**Fetch Script:** `src/scripts/fetch-elo.ts`
```typescript
// Fetches from CubeCobra API
const url = `https://cubecobra.com/cube/api/cubeJSON/${CUBE_ID}`;
// Extracts: card.details.elo, pickCount, cubeCount
```

**Current Statistics:**
- Cards: 360
- ELO Range: 1240 to 2377 (1137 point spread)
- High confidence threshold: pickCount >= 10,000

### How Base ELO Is Used

**File:** `src/services/eloHelpers.ts`

```typescript
getEloData(cardName: string): {
  elo: number;        // Raw rating (1240-2377)
  pickCount: number;  // Total picks
  cubeCount: number;  // Cubes it appears in
}

getPercentile(cardName: string): number;  // 0-100
getWheelLikelihood(cardName): 'likely' | 'maybe' | 'unlikely';
```

**Percentile Tiers:**
- 90+ = S Tier (premium)
- 75-89 = A Tier
- 50-74 = B Tier
- 25-49 = C Tier
- 0-24 = D Tier

---

## Part 2: Synergy-Adjusted ELO System

### Core Function

**File:** `src/components/DraftSimulator.tsx`
**Function:** `getSynergyAdjustedElo()` (Lines 1424-1814)

```typescript
getSynergyAdjustedElo(card, picks, currentPack?): {
  baseElo: number;      // Raw CubeCobra ELO
  adjustedElo: number;  // Final contextual score
  adjustment: number;   // Total adjustment (+/-)
  reasons: string[];    // Human-readable explanations
}
```

### Adjustment Categories

#### A. Pack Synergy (P1P1 Combos)
**Lines 979-1042**

Bonuses when combo pieces appear together in pack:
- Tinker + Blightsteel: +40
- Channel + Emrakul: +50
- Reanimate + Griselbrand: +45
- Entomb + Reanimate: +40
- Time Vault + Voltaic Key: +50
- etc.

#### B. Pack Positioning
**Lines 1442-1480**

Based on card rank within pack:
```
Rank 1: +30
Rank 2: +20
Rank 3: +12
Rank 4: +5
Upper half: +3
Lower tier: -15
Bottom: -25
```

#### C. Color Fit (Scaling)
**Lines 1498-1542**

Color penalties scale with commitment:
```typescript
colorScale = Math.min(1, 0.2 + (picks.length * 0.1))
// Pick 1: 20% of penalty
// Pick 8+: 100% of penalty
```

Bonuses/penalties:
- Colorless: +10
- On-color: +60 × colorScale
- Off-color (top 5%): -10 × colorScale
- Off-color (below 85%): -80 × colorScale

#### D. Mana Curve
**Lines 1545-1567**

- High priority need: +40
- Medium priority: +20
- Curve glut (4+ cards at CMC): -25

#### E. Card Type Balance
**Lines 1570-1617**

Target ranges:
- Creatures: 12-17 (bonus if <8, penalty if 18+)
- Removal: 4-6 (bonus if <3)
- Card draw: 3-5

#### F. Archetype Synergy (THE CRITICAL SECTION)
**Lines 1650-1728**

Triggers when archetype strength >= 6 (committed) or >= 4 (leaning):

**REANIMATOR Example:**
```typescript
if (committed >= 6) {
  if (cmc >= 7 && isCreature) adjustment += 60;           // Fat targets
  if (isReanimateEnablers.includes(name)) adjustment += 55;  // Entomb, etc.
  if (hasDiscardOutlet) adjustment += 25;
  if (isReanimateSpell) adjustment += 50;
}
if (leaning >= 4) {
  // Half values
}
```

**Other Archetypes:**
- AGGRO: +40 for CMC<=2 creatures, -50 for CMC>=5
- CONTROL: +45 for sweepers, +35 for counterspells
- STORM: +70 for engines, +50 for fast mana
- etc.

#### G. Diminishing Returns
**Lines 1754-1771**

- Second Lotus/LED: -15
- 3+ counterspells: -20
- 2+ board wipes: -25

---

## Part 3: Contextual Grading

**Function:** `getContextualGrade()` (Lines 763-823)

Converts adjusted score to letter grade:
```
A+: 95+
A:  88-94
B+: 75-81
B:  65-74
C+: 45-54
C:  35-44
D:  15-24
F:  <15
```

---

## THE PROBLEM

### Symptom
When building Reanimator (or any archetype), cards that are PERFECT fits still appear mediocre compared to generically powerful cards.

**Example Scenario:**
- Player is clearly on Reanimator (committed = 6+)
- Pack contains: Griselbrand (ELO ~1800) and Jace, the Mind Sculptor (ELO ~2300)
- Griselbrand gets +60 for being a fat reanimation target
- But 1800 + 60 = 1860, still far below Jace's 2300
- Griselbrand still looks like a "B" while Jace looks like "A+"

### Root Cause Analysis

1. **Additive vs. Relative Adjustments**
   - Current system: `adjustedElo = baseElo + adjustment`
   - Problem: A +60 bonus on a 1800 ELO card barely moves the needle
   - A +60 bonus on a 2300 ELO card is proportionally tiny

2. **Fixed Point Values**
   - Archetype bonuses are hardcoded (+60, +55, +50, etc.)
   - These values were likely tuned for "feel" not math
   - A 60 point swing in a 1137 point range is only ~5%

3. **Lack of Relative Comparison**
   - System doesn't ask: "Among cards that do X, how good is this one?"
   - Griselbrand is arguably THE BEST reanimation target, but gets same bonus as any 7+ CMC creature

4. **No Opportunity Cost Modeling**
   - System doesn't model: "If I DON'T take this archetype piece, will I see another?"
   - Key enablers (Entomb, Reanimate) are irreplaceable

5. **Linear vs. Non-Linear Fit**
   - Reality: The 1st reanimation target is MUCH more valuable than the 3rd
   - Current: Just gives flat +60 regardless

---

## IDEAS FOR IMPROVEMENT

### Idea 1: Percentile-Based Adjustments

Instead of fixed points, adjust based on percentile shift:

```typescript
// Current
adjustment += 60;

// Proposed
const targetPercentile = 90; // Make archetype-perfect cards look premium
const currentPercentile = getPercentile(card.name);
const percentileBoost = (targetPercentile - currentPercentile) * 0.5;
adjustment += percentileBoost * (ELO_MAX - ELO_MIN) / 100;
```

This would make low-ELO perfect-fit cards competitive with high-ELO generic cards.

### Idea 2: Role-Based Ceiling Elevation

Define ceilings per role:
```typescript
const roleCeilings = {
  'reanimator-target': 2200,      // Can compete with top cards
  'reanimator-enabler': 2300,     // Critical pieces get highest ceiling
  'control-finisher': 2100,
  'aggro-2drop': 2000,
};

if (card.role === 'reanimator-target' && deck.isReanimator) {
  adjustedElo = Math.max(adjustedElo, roleCeilings['reanimator-target']);
}
```

### Idea 3: Scarcity-Weighted Bonuses

Cards that are rare for their role get bigger bonuses:
```typescript
const reanimateTargetsInCube = 15;  // Total 7+ CMC creatures
const reanimateTargetsSeen = countSeen('7+cmc-creature');
const scarcityMultiplier = 1 + (reanimateTargetsInCube - reanimateTargetsSeen) / reanimateTargetsInCube;
adjustment *= scarcityMultiplier;  // Unseen pieces get bigger bonuses
```

### Idea 4: Deck Completion Scoring

Score based on how much the card completes a viable deck:
```typescript
const deckViability = {
  beforePick: analyzeViability(picks),
  afterPick: analyzeViability([...picks, card]),
};
const viabilityGain = afterPick - beforePick;
adjustment += viabilityGain * 50;  // Significant for key pieces
```

### Idea 5: Contextual Percentile (Already Partially Implemented)

Current grading uses `synergy.adjustment / 10` to shift percentile, but it's capped and weak.

Proposal: Make the percentile shift more aggressive for archetype pieces:
```typescript
// Current
const synergyPercentileShift = adjustment / 10;  // +60 = +6 percentile

// Proposed
const synergyPercentileShift = adjustment / 4;   // +60 = +15 percentile
// Or use a non-linear function
const synergyPercentileShift = Math.sign(adjustment) * Math.sqrt(Math.abs(adjustment)) * 2;
```

### Idea 6: Bayesian Role Evaluation

Treat ELO as a prior, update with archetype evidence:
```typescript
// Prior: CubeCobra ELO (how good is this card in general?)
// Likelihood: How good is this card in THIS archetype?
// Posterior: What we should display

const prior = baseElo;
const likelihoodBonus = getArchetypeFitScore(card, archetype);
const evidence = archetypeCommitment;  // How sure are we about the archetype?

const posteriorElo = prior + (likelihoodBonus * evidence / 10);
```

### Idea 7: Comparative Within-Pack Scoring

Don't just boost the card, penalize alternatives:
```typescript
// For a committed Reanimator drafter:
// - Griselbrand: +60 (archetype fit)
// - Jace: -40 (not helping the archetype, opportunity cost)

if (deck.committedArchetype && !card.fitsArchetype) {
  adjustment -= 30;  // Penalty for off-plan cards
}
```

### Idea 8: Multi-Factor Weighted Model

Weight adjustments by their importance to the current deck state:
```typescript
const weights = computeDynamicWeights(deckState);
// weights = { colorFit: 0.3, archetypeFit: 0.4, power: 0.2, curve: 0.1 }

adjustedElo = baseElo * weights.power
            + archetypeBonus * weights.archetypeFit
            + colorBonus * weights.colorFit
            + curveBonus * weights.curve;
```

---

## RESEARCH DIRECTIONS

The improving agent should consider:

1. **Study pick data from successful drafters**
   - Do they value archetype synergy over raw power?
   - At what point do they commit to an archetype?

2. **Analyze wheel patterns**
   - Which archetype cards wheel vs. generics?
   - This informs opportunity cost

3. **Look at modern recommendation systems**
   - Collaborative filtering for "drafters like you picked X"
   - Learning-to-rank algorithms

4. **Consider MTG-specific heuristics**
   - BREAD (Bombs, Removal, Evasion, Aggro, Duds)
   - How do pros weight archetype vs. power?

5. **Test with A/B comparisons**
   - Generate pick recommendations with different algorithms
   - Have users rate which feels more correct

6. **Explore normalization techniques**
   - Z-score normalization
   - Min-max scaling within categories
   - Percentile-based comparison

---

## KEY FILES FOR MODIFICATION

1. **`src/components/DraftSimulator.tsx`**
   - `getSynergyAdjustedElo()` - Main adjustment function
   - `getContextualGrade()` - Grading display
   - `analyzeDeck()` - Deck state analysis

2. **`src/services/eloHelpers.ts`**
   - Base ELO utilities
   - Percentile calculations

3. **`src/data/elo-ratings.json`**
   - Raw ELO data (consider adding archetype tags?)

---

## SUCCESS CRITERIA

The improved system should:

1. Make archetype-perfect cards LOOK premium (A/A+ grade) when on-archetype
2. Make off-archetype generics look worse when committed to a deck
3. Feel intuitive to experienced drafters
4. Not break edge cases (colorless cards, splashes, pivot drafts)
5. Scale appropriately from P1P1 (open) to P3P10 (committed)

---

## CURRENT CONSTANTS REFERENCE

```typescript
// Archetype commitment thresholds
COMMITTED = 6;
LEANING = 4;

// Fixed bonuses (the problematic values)
REANIMATOR_TARGET = 60;
REANIMATOR_ENABLER = 55;
STORM_ENGINE = 70;
AGGRO_2DROP = 40;

// ELO range
ELO_MIN = 1240;
ELO_MAX = 2377;
ELO_SPREAD = 1137;

// Color scaling
COLOR_SCALE_BASE = 0.2;
COLOR_SCALE_PER_PICK = 0.1;
```

---

## NEXT STEPS

1. Prototype 2-3 alternative adjustment algorithms
2. Create test harness to compare recommendations
3. Gather feedback from experienced drafters
4. Iterate based on "does this feel right?" testing
5. Consider machine learning if manual tuning fails

The agent has full freedom to research additional approaches, propose entirely new systems, or suggest we need external data sources. The goal is recommendations that an experienced drafter would agree with.
