# Plan: ELO System Refactor with Industry-Standard Approach

## Research Summary

**Best Available Solution:** Adapt [madrury's mtg-draftbot](https://github.com/madrury/mtg-draftbot) framework

This is an open-source, archetype-aware draft system that does exactly what we need:
- Dynamic archetype preferences that evolve during draft
- Cards evaluated within current archetype context
- Clear, well-documented architecture
- Can be adapted with Vintage Cube archetype definitions

**Why this over others:**
- 17lands: Limited Vintage Cube data (Arena only), no archetype context
- Draftsim: Proprietary, no source access
- Neural networks: Overkill, need retraining, black box
- Our current system: Additive bonuses don't scale

---

## Architecture Overview

### Current State (Problem)
```
DraftSimulator.tsx (5800+ lines)
├── getSynergyAdjustedElo() - 400 lines embedded
├── analyzeDeck() - 300 lines embedded
├── getContextualGrade() - 60 lines embedded
├── All adjustment logic mixed with UI
└── Impossible to test or reuse
```

### Target State (Solution)
```
src/
├── services/
│   ├── eloHelpers.ts (existing - base ELO utilities)
│   ├── cardRating/
│   │   ├── index.ts              # Public API
│   │   ├── types.ts              # Shared types
│   │   ├── archetypes.ts         # Archetype definitions
│   │   ├── archetypeAffinity.ts  # Card-to-archetype mappings
│   │   ├── contextualRating.ts   # Main rating engine
│   │   └── deckAnalysis.ts       # Deck state analysis
│   └── eloHelpers.ts (existing)
├── components/
│   └── DraftSimulator.tsx        # UI only, imports cardRating
└── data/
    ├── elo-ratings.json (existing)
    └── archetype-mappings.json   # Card affinities by archetype
```

---

## Implementation Plan

### Phase 1: Extract & Define Types (Day 1)

**Task 1.1: Create `src/services/cardRating/types.ts`**
```typescript
// Core types for the rating system

export interface ArchetypeDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  keyCards: string[];        // Cards that define this archetype
  signalCards: string[];     // Cards that suggest this archetype
  antiSynergyCards: string[]; // Cards that don't fit
}

export interface CardAffinity {
  cardName: string;
  archetypeId: string;
  weight: number;  // -1.0 (anti-synergy) to 1.0 (perfect fit)
  role?: 'enabler' | 'payoff' | 'support';
}

export interface DraftContext {
  picks: CubeCard[];
  packNumber: number;
  pickNumber: number;
  archetypeWeights: Map<string, number>;  // Current archetype commitment
  colorCounts: Record<string, number>;
  curveDistribution: number[];
}

export interface CardRating {
  cardName: string;
  baseElo: number;
  contextualScore: number;
  archetypeBoost: number;
  colorFit: number;
  curveFit: number;
  grade: string;
  reasons: string[];
}
```

**Task 1.2: Create `src/services/cardRating/archetypes.ts`**

Define the 10 major Vintage Cube archetypes:
```typescript
export const VINTAGE_CUBE_ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'reanimator',
    name: 'Reanimator',
    shortName: 'Rean',
    description: 'Cheat large creatures into play from graveyard',
    keyCards: ['Reanimate', 'Entomb', 'Animate Dead', 'Griselbrand'],
    signalCards: ['Faithless Looting', 'Careful Study', 'Collective Brutality'],
    antiSynergyCards: [],
  },
  {
    id: 'storm',
    name: 'Storm',
    shortName: 'Storm',
    description: 'Win via storm count spell chains',
    keyCards: ['Tendrils of Agony', 'Brain Freeze', "Yawgmoth's Will"],
    signalCards: ['Dark Ritual', 'Lion\'s Eye Diamond', 'Lotus Petal'],
    antiSynergyCards: [],
  },
  // ... other archetypes
];
```

### Phase 2: Core Rating Engine (Day 2-3)

**Task 2.1: Create `src/services/cardRating/archetypeAffinity.ts`**

Adapt madrury's dynamic weighting approach:
```typescript
// Card affinities - how well each card fits each archetype
// These replace the hardcoded +60, +55, etc. bonuses

export const CARD_AFFINITIES: CardAffinity[] = [
  // Reanimator
  { cardName: 'Griselbrand', archetypeId: 'reanimator', weight: 1.0, role: 'payoff' },
  { cardName: 'Entomb', archetypeId: 'reanimator', weight: 1.0, role: 'enabler' },
  { cardName: 'Reanimate', archetypeId: 'reanimator', weight: 1.0, role: 'enabler' },
  { cardName: 'Faithless Looting', archetypeId: 'reanimator', weight: 0.7, role: 'support' },

  // Storm
  { cardName: "Yawgmoth's Will", archetypeId: 'storm', weight: 1.0, role: 'payoff' },
  { cardName: 'Dark Ritual', archetypeId: 'storm', weight: 0.9, role: 'enabler' },

  // ... comprehensive mappings for all 360 cards
];

// Function to update archetype weights after each pick
export function updateArchetypeWeights(
  currentWeights: Map<string, number>,
  pickedCard: CubeCard,
  affinities: CardAffinity[]
): Map<string, number> {
  // madrury's approach: each pick shifts archetype preferences
  // based on the picked card's affinities
}
```

**Task 2.2: Create `src/services/cardRating/contextualRating.ts`**

The main rating engine (replaces getSynergyAdjustedElo):
```typescript
import { getEloData } from '../eloHelpers';
import { CARD_AFFINITIES, getCardAffinities } from './archetypeAffinity';
import { DraftContext, CardRating } from './types';

export function rateCard(
  card: CubeCard,
  context: DraftContext
): CardRating {
  const baseElo = getEloData(card.name)?.elo ?? 1500;

  // 1. Calculate archetype fit
  const archetypeBoost = calculateArchetypeBoost(card, context);

  // 2. Calculate color fit
  const colorFit = calculateColorFit(card, context);

  // 3. Calculate curve fit
  const curveFit = calculateCurveFit(card, context);

  // 4. Compute contextual score
  // KEY CHANGE: Multiplicative for archetype, additive for others
  const archetypeMultiplier = 1 + (archetypeBoost * getCommitmentFactor(context));
  const contextualScore = (baseElo * archetypeMultiplier) + colorFit + curveFit;

  return {
    cardName: card.name,
    baseElo,
    contextualScore,
    archetypeBoost,
    colorFit,
    curveFit,
    grade: computeGrade(contextualScore, context),
    reasons: buildReasons(archetypeBoost, colorFit, curveFit),
  };
}

function calculateArchetypeBoost(card: CubeCard, context: DraftContext): number {
  const affinities = getCardAffinities(card.name);
  let totalBoost = 0;

  for (const [archetypeId, weight] of context.archetypeWeights) {
    const affinity = affinities.find(a => a.archetypeId === archetypeId);
    if (affinity) {
      // Weight the card's affinity by how committed we are to this archetype
      totalBoost += affinity.weight * weight;
    }
  }

  return totalBoost;
}

function getCommitmentFactor(context: DraftContext): number {
  // How committed are we to any archetype?
  const maxCommitment = Math.max(...context.archetypeWeights.values());

  // Scale from 0 (open) to 2.0 (locked in)
  if (maxCommitment >= 0.8) return 2.0;
  if (maxCommitment >= 0.6) return 1.5;
  if (maxCommitment >= 0.4) return 0.75;
  if (maxCommitment >= 0.2) return 0.25;
  return 0;
}
```

**Task 2.3: Create `src/services/cardRating/deckAnalysis.ts`**

Extract from DraftSimulator.tsx (the analyzeDeck function):
```typescript
export function analyzeDeck(picks: CubeCard[]): DeckAnalysis {
  // Extract existing analyzeDeck logic
  // This becomes a pure function that can be tested independently
}
```

### Phase 3: Data Migration (Day 4)

**Task 3.1: Generate `src/data/archetype-mappings.json`**

Create comprehensive card-to-archetype mappings:
```json
{
  "version": "1.0",
  "lastUpdated": "2024-01-15",
  "archetypes": [
    { "id": "reanimator", "name": "Reanimator" },
    { "id": "storm", "name": "Storm" }
  ],
  "affinities": [
    { "card": "Griselbrand", "archetype": "reanimator", "weight": 1.0, "role": "payoff" },
    { "card": "Entomb", "archetype": "reanimator", "weight": 1.0, "role": "enabler" }
  ]
}
```

**Task 3.2: Build import script**

Script to generate initial affinities from existing hardcoded values:
```typescript
// scripts/generate-affinities.ts
// Reads existing getSynergyAdjustedElo logic
// Outputs archetype-mappings.json
```

### Phase 4: Integration (Day 5)

**Task 4.1: Update DraftSimulator.tsx**

Replace embedded logic with imports:
```typescript
// Before (embedded)
const getSynergyAdjustedElo = useCallback((card, picks, pack) => {
  // 400 lines of logic
}, [...]);

// After (imported)
import { rateCard, updateArchetypeWeights } from '@/services/cardRating';

const cardRating = rateCard(card, draftContext);
```

**Task 4.2: Create `src/services/cardRating/index.ts`**

Public API:
```typescript
export { rateCard } from './contextualRating';
export { updateArchetypeWeights } from './archetypeAffinity';
export { analyzeDeck } from './deckAnalysis';
export { VINTAGE_CUBE_ARCHETYPES } from './archetypes';
export * from './types';
```

### Phase 5: Testing & Calibration (Day 6-7)

**Task 5.1: Create test scenarios**

```typescript
// tests/cardRating.test.ts

describe('Archetype-aware rating', () => {
  it('Griselbrand beats Jace when committed to Reanimator', () => {
    const context = createReanimatorContext(commitment: 0.8);
    const griselbrand = rateCard(findCard('Griselbrand'), context);
    const jace = rateCard(findCard('Jace, the Mind Sculptor'), context);

    expect(griselbrand.contextualScore).toBeGreaterThan(jace.contextualScore);
  });

  it('Jace beats Griselbrand when uncommitted', () => {
    const context = createOpenContext();
    const griselbrand = rateCard(findCard('Griselbrand'), context);
    const jace = rateCard(findCard('Jace, the Mind Sculptor'), context);

    expect(jace.contextualScore).toBeGreaterThan(griselbrand.contextualScore);
  });
});
```

**Task 5.2: Calibration harness**

```typescript
// scripts/calibrate.ts
// Runs through known-good draft picks
// Reports accuracy of new system vs old system
```

---

## Key Differences from Current System

| Aspect | Current | New |
|--------|---------|-----|
| **Archetype bonuses** | Fixed additive (+60) | Multiplicative (×2.0) |
| **Commitment scaling** | Binary (committed/not) | Continuous (0-1.0) |
| **Card affinities** | Hardcoded in function | Data-driven JSON |
| **Architecture** | Embedded in component | Extracted service |
| **Testability** | None | Full unit tests |
| **Extensibility** | Edit 5800-line file | Add to JSON |

---

## File Changes Summary

### New Files
- `src/services/cardRating/types.ts`
- `src/services/cardRating/archetypes.ts`
- `src/services/cardRating/archetypeAffinity.ts`
- `src/services/cardRating/contextualRating.ts`
- `src/services/cardRating/deckAnalysis.ts`
- `src/services/cardRating/index.ts`
- `src/data/archetype-mappings.json`
- `tests/cardRating.test.ts`

### Modified Files
- `src/components/DraftSimulator.tsx` - Remove embedded logic, import service

### Deleted Logic (moved to service)
- `getSynergyAdjustedElo()` - 400 lines → `contextualRating.ts`
- `analyzeDeck()` - 300 lines → `deckAnalysis.ts`
- `getContextualGrade()` - 60 lines → `contextualRating.ts`
- Archetype detection - → `archetypes.ts`

---

## Success Criteria

1. **Core problem solved:** Griselbrand rates A+ for committed Reanimator
2. **No regression:** Existing good ratings stay correct
3. **Testable:** Can run unit tests on rating logic
4. **Maintainable:** Adding new archetype = edit JSON, not TypeScript
5. **Clean architecture:** DraftSimulator.tsx drops to ~4000 lines (UI only)

---

## Timeline

| Day | Tasks |
|-----|-------|
| 1 | Extract types, define archetypes |
| 2-3 | Build core rating engine |
| 4 | Migrate data, generate JSON |
| 5 | Integrate with DraftSimulator |
| 6-7 | Testing and calibration |

Total: ~7 days of focused work

---

## Dependencies

- madrury's mtg-draftbot (reference, not direct import)
- Existing CubeCobra ELO data (already have)
- Existing archetype detection logic (refactor, not rewrite)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| New system produces worse ratings | A/B test against current system first |
| Card affinity mappings incomplete | Start with existing bonus logic, expand |
| Multiplicative math too aggressive | Calibration phase with tunable parameters |
| Migration breaks existing features | Incremental integration with feature flags |

---

## Approval Requested

This plan:
- Uses industry-standard architecture (adapted from madrury's proven framework)
- Follows professional engineering practices (extracted services, typed interfaces)
- Solves the core problem (multiplicative archetype boost)
- Creates testable, maintainable code
- Preserves existing functionality during migration

Ready to proceed?
