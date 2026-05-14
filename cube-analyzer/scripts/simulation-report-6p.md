# Draft Simulation Report

Generated: 2026-05-14T21:30:58.375Z

**Players per Draft:** 6
**Drafts Simulated:** 10000
**Total Decks Built:** 80000
**Cards per Draft:** 270 (90 undrafted each time)

## Classification Methodology

Combo archetypes use **functional classification** - a deck must have both enablers AND payoffs:

- **Storm**: Requires a payoff (Tendrils/Brain Freeze) + 3+ enablers (rituals, draw engines)
- **Reanimator**: Requires reanimate spell + graveyard enabler + fatty target
- **Sneak & Show**: Requires Sneak Attack/Show and Tell/Through the Breach + target
- **Oath**: Requires Oath of Druids + creature payoff

Fair archetypes (Midrange, Aggro, Control, Tempo, Ramp) are classified by card composition.

## Sanity Checks

| Check | Result |
|-------|--------|
| All decks 40 cards | ✓ |
| All decks 17 lands | ✓ |
| No duplicates in draft | ✓ |
| All cards picked at least once | ✓ |
| Archetype diversity (5+ above 1%) | ✓ |

## Archetype Distribution

| Archetype | Decks | % | Avg Commitment | Avg Deck Quality |
|-----------|-------|---|----------------|------------------|
| midrange | 15225 | 19.0% | 1.00 | 1861 |
| aggro | 7583 | 9.5% | 1.00 | 1858 |
| reanimator | 7436 | 9.3% | 1.00 | 1931 |
| tempo | 6984 | 8.7% | 1.00 | 1880 |
| ramp | 6213 | 7.8% | 1.00 | 1909 |
| control | 4048 | 5.1% | 1.00 | 1888 |
| artifacts | 4020 | 5.0% | 1.00 | 1914 |
| oath | 3600 | 4.5% | 1.00 | 1936 |
| sneak | 2787 | 3.5% | 1.00 | 1924 |
| storm | 2104 | 2.6% | 1.00 | 1871 |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 33702 | 42.1% |
| Blue (U) | 41115 | 51.4% |
| Black (B) | 37564 | 47.0% |
| Red (R) | 30691 | 38.4% |
| Green (G) | 33960 | 42.4% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| BGU | 8956 | 11.2% |
| RUW | 8900 | 11.1% |
| BUW | 8039 | 10.0% |
| BGR | 6308 | 7.9% |
| BGW | 5037 | 6.3% |
| GUW | 4962 | 6.2% |
| BRU | 4718 | 5.9% |
| GRU | 4204 | 5.3% |
| BRW | 2999 | 3.7% |
| GRW | 2909 | 3.6% |
| BG | 1083 | 1.4% |
| UW | 588 | 0.7% |
| BU | 289 | 0.4% |
| GU | 250 | 0.3% |
| RU | 209 | 0.3% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.76 | 2.7 | 0 | 19 |
| Removal | 4.13 | 1.95 | 0 | 13 |
| Card Draw | 4.95 | 2.31 | 0 | 15 |
| Avg CMC | 2.78 | 0.73 | 1.3 | 6.2 |
| Deck Quality | 1889.61 | 98.45 | 1507 | 2347 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Black Lotus | 16 | 7532 |
| 2 | Mox Jet | 16.2 | 7503 |
| 3 | Mana Drain | 16.3 | 7529 |
| 4 | Mox Ruby | 16.3 | 7468 |
| 5 | Sol Ring | 16.3 | 7550 |
| 6 | Chrome Mox | 16.4 | 7528 |
| 7 | Mox Diamond | 16.4 | 7568 |
| 8 | Mox Pearl | 16.4 | 7593 |
| 9 | Mox Sapphire | 16.4 | 7528 |
| 10 | Ancestral Recall | 16.5 | 7505 |
| 11 | Emrakul, the Aeons Torn | 16.5 | 7435 |
| 12 | Atraxa, Grand Unifier | 16.6 | 7555 |
| 13 | Griselbrand | 16.6 | 7530 |
| 14 | Lion's Eye Diamond | 16.6 | 7509 |
| 15 | Time Walk | 16.6 | 7479 |
| 16 | Archon of Cruelty | 16.7 | 7454 |
| 17 | Craterhoof Behemoth | 16.7 | 7516 |
| 18 | Mox Emerald | 16.7 | 7515 |
| 19 | Blightsteel Colossus | 16.8 | 7484 |
| 20 | Lotus Petal | 16.8 | 7518 |

## Wheel Analysis

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Black Lotus | 16 |
| Mox Jet | 16.2 |
| Mana Drain | 16.3 |
| Mox Ruby | 16.3 |
| Sol Ring | 16.3 |
| Chrome Mox | 16.4 |
| Mox Diamond | 16.4 |
| Mox Pearl | 16.4 |
| Mox Sapphire | 16.4 |
| Ancestral Recall | 16.5 |
| Emrakul, the Aeons Torn | 16.5 |
| Atraxa, Grand Unifier | 16.6 |
| Griselbrand | 16.6 |
| Lion's Eye Diamond | 16.6 |
| Time Walk | 16.6 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 7591 |
| Golos, Tireless Pilgrim | 100.0% | 7529 |
| Urza's Saga | 100.0% | 7542 |
| Ignoble Hierarch | 93.5% | 7529 |
| Damn | 93.1% | 7509 |
| Imperial Recruiter | 92.8% | 7426 |
| Vindicate | 92.3% | 7452 |
| Recruiter of the Guard | 92.1% | 7437 |
| Loran of the Third Path | 91.9% | 7454 |
| Elvish Mystic | 90.1% | 7515 |
| Pyrokinesis | 89.9% | 7503 |
| Monastery Mentor | 89.4% | 7439 |
| Embereth Shieldbreaker // Battle Display | 89.3% | 7548 |
| Lingering Souls | 88.6% | 7486 |
| Noble Hierarch | 87.7% | 7538 |

## Anomalies

### Insufficient Pool Depth: 4400 decks

5.5% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 19.0% | +6.0% | Algorithm over-commits; heavily contested in real drafts |
| aggro | 27 (13.5%) | 9.5% | -4.0% | Roughly matches card support |
| reanimator | 17 (8.5%) | 9.3% | +0.8% | Roughly matches card support |
| tempo | 21 (10.5%) | 8.7% | -1.8% | Roughly matches card support |
| ramp | 16 (8%) | 7.8% | -0.2% | Roughly matches card support |
| control | 30 (15%) | 5.1% | -9.9% | Algorithm under-values; likely open in real drafts |
| artifacts | 46 (23%) | 5.0% | -18.0% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 4.5% | +4.0% | Roughly matches card support |
| sneak | 7 (3.5%) | 3.5% | -0.0% | Roughly matches card support |
| storm | 9 (4.5%) | 2.6% | -1.9% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 2.6% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 9.3% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 3.5% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 5.0% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 9.5% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 8.7% of decks (structurally deep, likely open)
- **control**: 30 cards → 5.1% of decks (structurally deep, likely open)

## Drafting Implications

For real drafts of this cube, use this gap analysis:

**Heavily Contested (proceed with caution):**
- Storm has only 9 cards — if you see others taking rituals, bail out
- Reanimator has 17 cards — can support 1-2 drafters maximum
- Sneak/Show has 7 cards — commit hard early or stay away entirely

**Likely Open (look for signals):**
- Artifacts is the deepest archetype (46 cards) but rarely drafted as a deck
- Aggro is structurally supported (27 cards) but routinely underdrafted
- Tempo has real support (21 cards) that gets scattered across other decks

**The Key Insight:**

The algorithm tells you what optimal independent drafting looks like.
The cube tells you what's actually supported.
The gap tells you where the value is.

## Color Balance

Average color appearance: 44.3%

- White: 42.1% (-2.1% from average)
- Blue: 51.4% (+7.1% from average)
- Black: 47.0% (+2.7% from average)
- Red: 38.4% (-5.9% from average)
- Green: 42.4% (-1.8% from average)

## Summary

- **10000** drafts simulated, **80000** decks built
- Top archetype by algorithm: **midrange** (19.0%)
- Most played color: **U** (51.4%)
- Avg deck quality: **1890** ELO
