# Draft Simulation Report

Generated: 2026-05-14T21:26:07.688Z

**Players per Draft:** 8
**Drafts Simulated:** 10000
**Total Decks Built:** 80000

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
| midrange | 20439 | 25.5% | 1.00 | 1861 |
| aggro | 10091 | 12.6% | 1.00 | 1859 |
| reanimator | 9830 | 12.3% | 1.00 | 1929 |
| tempo | 9311 | 11.6% | 1.00 | 1881 |
| ramp | 8211 | 10.3% | 1.00 | 1910 |
| control | 5452 | 6.8% | 1.00 | 1889 |
| artifacts | 5157 | 6.4% | 1.00 | 1912 |
| oath | 5008 | 6.3% | 1.00 | 1937 |
| sneak | 3683 | 4.6% | 1.00 | 1921 |
| storm | 2818 | 3.5% | 1.00 | 1868 |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 45180 | 56.5% |
| Blue (U) | 54920 | 68.7% |
| Black (B) | 49917 | 62.4% |
| Red (R) | 40801 | 51.0% |
| Green (G) | 45186 | 56.5% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| RUW | 11869 | 14.8% |
| BGU | 11850 | 14.8% |
| BUW | 10767 | 13.5% |
| BGR | 8159 | 10.2% |
| BGW | 6814 | 8.5% |
| GUW | 6680 | 8.3% |
| BRU | 6318 | 7.9% |
| GRU | 5667 | 7.1% |
| BRW | 3989 | 5.0% |
| GRW | 3891 | 4.9% |
| BG | 1464 | 1.8% |
| UW | 797 | 1.0% |
| BU | 368 | 0.5% |
| GU | 318 | 0.4% |
| RU | 286 | 0.4% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.77 | 2.69 | 0 | 20 |
| Removal | 4.11 | 1.95 | 0 | 14 |
| Card Draw | 4.95 | 2.32 | 0 | 15 |
| Avg CMC | 2.78 | 0.73 | 1.2 | 6.1 |
| Deck Quality | 1889.54 | 97.36 | 1480 | 2389 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Black Lotus | 16.1 | 10000 |
| 2 | Mox Sapphire | 16.2 | 10000 |
| 3 | Ancestral Recall | 16.3 | 10000 |
| 4 | Blightsteel Colossus | 16.3 | 10000 |
| 5 | Lion's Eye Diamond | 16.4 | 10000 |
| 6 | Mox Diamond | 16.4 | 10000 |
| 7 | Sol Ring | 16.4 | 10000 |
| 8 | Chrome Mox | 16.5 | 10000 |
| 9 | Emrakul, the Aeons Torn | 16.5 | 10000 |
| 10 | Mana Drain | 16.5 | 10000 |
| 11 | Mox Jet | 16.5 | 10000 |
| 12 | Mox Pearl | 16.5 | 10000 |
| 13 | Atraxa, Grand Unifier | 16.6 | 10000 |
| 14 | Griselbrand | 16.6 | 10000 |
| 15 | Mox Emerald | 16.7 | 10000 |
| 16 | Mox Ruby | 16.7 | 10000 |
| 17 | Time Walk | 16.8 | 10000 |
| 18 | Craterhoof Behemoth | 16.9 | 10000 |
| 19 | Lotus Petal | 16.9 | 10000 |
| 20 | Mana Crypt | 16.9 | 10000 |

## Wheel Analysis

### Consistent Wheelers (wheel > 80% of opportunities)

| Card | Wheel Rate | Opportunities |
|------|------------|---------------|
| Loran of the Third Path | 98.9% | 70000 |
| Recruiter of the Guard | 97.0% | 70000 |
| Pyrokinesis | 96.9% | 70000 |
| Imperial Recruiter | 96.0% | 70000 |
| Embereth Shieldbreaker // Battle Display | 95.9% | 70000 |
| Endurance | 94.9% | 70000 |
| Upheaval | 94.4% | 70000 |
| Cathar Commando | 92.9% | 70000 |
| Vindicate | 92.8% | 70000 |
| Monastery Mentor | 92.3% | 70000 |
| Elvish Mystic | 92.1% | 70000 |
| Damn | 92.0% | 70000 |
| Tishana's Tidebinder | 91.8% | 70000 |
| Containment Priest | 91.5% | 70000 |
| Lush Portico | 91.3% | 70000 |

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Black Lotus | 16.1 |
| Mox Sapphire | 16.2 |
| Ancestral Recall | 16.3 |
| Blightsteel Colossus | 16.3 |
| Lion's Eye Diamond | 16.4 |
| Mox Diamond | 16.4 |
| Sol Ring | 16.4 |
| Chrome Mox | 16.5 |
| Emrakul, the Aeons Torn | 16.5 |
| Mana Drain | 16.5 |
| Mox Jet | 16.5 |
| Mox Pearl | 16.5 |
| Atraxa, Grand Unifier | 16.6 |
| Griselbrand | 16.6 |
| Mox Emerald | 16.7 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 10000 |
| Golos, Tireless Pilgrim | 100.0% | 10000 |
| Urza's Saga | 100.0% | 10000 |
| Ignoble Hierarch | 94.1% | 10000 |
| Imperial Recruiter | 93.1% | 10000 |
| Damn | 92.9% | 10000 |
| Vindicate | 92.8% | 10000 |
| Loran of the Third Path | 92.7% | 10000 |
| Recruiter of the Guard | 92.0% | 10000 |
| Elvish Mystic | 90.1% | 10000 |
| Embereth Shieldbreaker // Battle Display | 89.9% | 10000 |
| Pyrokinesis | 89.7% | 10000 |
| Monastery Mentor | 89.6% | 10000 |
| Lingering Souls | 88.5% | 10000 |
| Seasoned Pyromancer | 88.0% | 10000 |

## Anomalies

### Insufficient Pool Depth: 5729 decks

7.2% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 25.5% | +12.5% | Algorithm over-commits; heavily contested in real drafts |
| aggro | 27 (13.5%) | 12.6% | -0.9% | Roughly matches card support |
| reanimator | 17 (8.5%) | 12.3% | +3.8% | Roughly matches card support |
| tempo | 21 (10.5%) | 11.6% | +1.1% | Roughly matches card support |
| ramp | 16 (8%) | 10.3% | +2.3% | Roughly matches card support |
| control | 30 (15%) | 6.8% | -8.2% | Algorithm under-values; likely open in real drafts |
| artifacts | 46 (23%) | 6.4% | -16.6% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 6.3% | +5.8% | Algorithm over-commits; heavily contested in real drafts |
| sneak | 7 (3.5%) | 4.6% | +1.1% | Roughly matches card support |
| storm | 9 (4.5%) | 3.5% | -1.0% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 3.5% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 12.3% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 4.6% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 6.4% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 12.6% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 11.6% of decks (structurally deep, likely open)
- **control**: 30 cards → 6.8% of decks (structurally deep, likely open)

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

Average color appearance: 59.0%

- White: 56.5% (-2.5% from average)
- Blue: 68.7% (+9.6% from average)
- Black: 62.4% (+3.4% from average)
- Red: 51.0% (-8.0% from average)
- Green: 56.5% (-2.5% from average)

## Summary

- **10000** drafts simulated, **80000** decks built
- Top archetype by algorithm: **midrange** (25.5%)
- Most played color: **U** (68.7%)
- Avg deck quality: **1890** ELO
