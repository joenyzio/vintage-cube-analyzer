# Draft Rating System Calibration

**Last Updated:** 2026-05-14
**Goal:** Optimize draft strategy for the existing 360-card cube (not cube modification)

## Final Results

### Affinity Data
- **95 verified affinity entries** across 10 archetypes
- Down from 120 entries after removing 25 orphans (cards referenced but not in cube)
- All remaining entries verified to exist in `src/data/cards.json`

### Archetype Distribution (500 drafts, seed 42)

| Archetype   | % of Decks | Notes |
|-------------|------------|-------|
| midrange    | 20.6%      | Most common, expected for generic good-stuff |
| aggro       | 15.8%      | Healthy aggro presence |
| reanimator  | 13.1%      | Well-supported in cube |
| storm       | 12.8%      | Good enabler density |
| **tempo**   | **10.6%**  | Natural ceiling (see below) |
| ramp        | 8.6%       | Solid support |
| artifacts   | 3.7%       | Niche but viable |
| control     | 3.6%       | Limited sweepers in cube |
| oath        | 1.6%       | Single enabler (Oath of Druids) |
| sneak       | 1.1%       | Cheaty, low emergence expected |

### Color Distribution (within targets)
- U: 60.6%
- G: 54.7%
- B: 53.0%
- R: 51.1%
- W: 49.9%

### Deck Composition
- 2-color decks: ~25% (target: 25-30%)
- 3-color decks: ~70% (target: 65-70%)
- Average CMC: 2.68
- Average creatures: 10.5
- Average removal: 3.9
- Average card draw: 5.0

---

## Tempo Archetype Analysis

### Natural Ceiling: 10.6%

**10.6% Tempo emergence is the natural ceiling for this cube.**

The cube has only **13 Tempo-relevant cards** with explicit affinities:

| Card | Weight | Role |
|------|--------|------|
| Daze | 0.9 | support |
| True-Name Nemesis | 0.85 | payoff |
| Snapcaster Mage | 0.65 | payoff |
| Remand | 0.65 | support |
| Subtlety | 0.6 | support |
| Hullbreacher | 0.6 | payoff |
| Spell Pierce | 0.6 | support |
| Miscalculation | 0.55 | support |
| Memory Lapse | 0.55 | support |
| Brainstorm | 0.45 | support |
| Ponder | 0.4 | support |
| Preordain | 0.4 | support |
| Gitaxian Probe | 0.35 | support |

### Missing Tempo Staples (not in cube)

These cards are standard Vintage Cube Tempo cards but **do not exist** in this cube:

- Delver of Secrets
- Vendilion Clique
- Brazen Borrower
- Ledger Shredder
- Force Spike
- Vapor Snag
- Flusterstorm

### Conclusion

Pushing Tempo above 10.6% would require either:
1. **Adding Tempo cards to the cube** (out of scope - goal is draft strategy)
2. **Reassigning cards from other archetypes** (creates new imbalances)

Therefore, the rating system is **calibrated correctly** for this cube's actual composition.

---

## Cube Gaps vs Typical Vintage Cube

This is **informational only** - understanding gaps helps draft strategy.

### Under-Supported Archetypes

**Tempo (10.6%)**
- Missing: Delver of Secrets, Vendilion Clique, Brazen Borrower, Ledger Shredder
- Missing: Force Spike, Vapor Snag, Flusterstorm
- Impact: Draft Tempo opportunistically, not as primary plan

**Control (3.6%)**
- Missing: Teferi, Hero of Dominaria, Cryptic Command
- Missing: Supreme Verdict, Day of Judgment, Terminus
- Impact: Board sweepers scarce - control must win through value

**Oath (1.6%)**
- Missing: Forbidden Orchard (key enabler)
- Missing: Omniscience (payoff)
- Only enabler: Oath of Druids itself
- Impact: Oath is speculative, not a primary plan

**Aggro (15.8%)**
- Missing: Monastery Swiftspear, Goblin Guide, Soul-Scar Mage
- Missing: Eidolon of the Great Revel, Sulfuric Vortex
- Impact: Red aggro less consistent than typical Vintage Cube

**Artifacts (3.7%)**
- Missing: Daretti, Scrap Savant, Time Vault, Voltaic Key
- Impact: No infinite combo, artifact strategies are fair

---

## Draft Strategy Insights

Based on simulation data:

### High-Value First Picks
1. The One Ring (avg pick 15.6)
2. Black Lotus (avg pick 15.8)
3. Mox Pearl (avg pick 15.8)
4. Ragavan, Nimble Pilferer (avg pick 15.9)
5. Mana Drain (avg pick 16.2)

### Consistent Wheelers (>80% wheel rate)
Cards that often table - safe to pass early:
- Damn (93.5%)
- Lush Portico (93.1%)
- Vindicate (93.1%)
- Commercial District (91.4%)
- Golos, Tireless Pilgrim (91.4%)

### Deck Composition Targets
- Aim for 10-11 creatures
- Prioritize 4+ removal spells
- 5+ card draw is achievable
- Keep average CMC around 2.5-2.8

---

## Technical Details

### Tuning Parameters (src/services/cardRating/tuning.ts)

**Color Multipliers:**
```typescript
addingSecondColor: 0.92   // Mild penalty going 1→2 colors
addingThirdColor: 0.55    // 45% reduction going 2→3 colors
addingFourthPlusColor: 0.30 // 70% reduction for 4+ colors
```

**Commitment Thresholds:**
```typescript
locked: 0.8      // 8+ archetype signals → 2.0x multiplier
committed: 0.6   // 6-7 signals → 1.5x multiplier
leaning: 0.4     // 4-5 signals → 0.75x multiplier
exploring: 0.2   // 2-3 signals → 0.25x multiplier
open: 0          // <2 signals → base ELO only
```

### Simulation Commands
```bash
# Run 500 drafts with fixed seed
npx tsx scripts/simulate-drafts.ts --count 500 --seed 42

# Check for orphan affinities
npx tsx /tmp/check-orphans.ts
```

---

## Version History

- **2026-05-14:** Initial calibration complete
  - Removed 25 orphan affinity entries
  - Confirmed 95 verified entries
  - Tempo ceiling documented at 10.6%
  - Color distribution within targets
