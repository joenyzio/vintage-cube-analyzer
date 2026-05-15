# Draft Simulation Report

Generated: 2026-05-15T02:41:29.255Z

**Players per Draft:** 6
**Drafts Simulated:** 1000
**Total Decks Built:** 8000
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
| midrange | 1732 | 21.6% | 0.99 | 1835 |
| tempo | 744 | 9.3% | 0.99 | 1865 |
| aggro | 703 | 8.8% | 0.99 | 1830 |
| reanimator | 695 | 8.7% | 1.00 | 1967 |
| ramp | 586 | 7.3% | 1.00 | 1922 |
| control | 376 | 4.7% | 1.00 | 1876 |
| artifacts | 371 | 4.6% | 1.00 | 1931 |
| oath | 330 | 4.1% | 1.00 | 1965 |
| sneak | 286 | 3.6% | 1.00 | 1966 |
| storm | 177 | 2.2% | 1.00 | 1890 |

## Midrange Breakdown

Midrange is 21.6% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 322 | 18.6% | 1922 | 2.57 | Uro, Titan of Nature's Wrath, Tireless Tracker, Liliana of the Veil |
| Golgari (BG) | 19 | 1.1% | 1901 | 2.93 | Deathrite Shaman, Liliana of the Veil, Collective Brutality |
| Grixis (BRU) | 154 | 8.9% | 1847 | 2.49 | Thoughtseize, Lutri, the Spellchaser, Fatal Push |
| Temur (GRU) | 115 | 6.6% | 1836 | 2.69 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Lutri, the Spellchaser |
| Jund (BGR) | 140 | 8.1% | 1835 | 2.7 | Liliana of the Veil, Thoughtseize, Dark Confidant |
| Bant (GUW) | 159 | 9.2% | 1829 | 2.6 | Tireless Tracker, Oko, Thief of Crowns, Uro, Titan of Nature's Wrath |
| Esper (BUW) | 261 | 15.1% | 1820 | 2.42 | Liliana of the Veil, Thoughtseize, Dark Confidant |
| Jeskai (RUW) | 194 | 11.2% | 1797 | 2.42 | White Plume Adventurer, Adeline, Resplendent Cathar, Voice of Victory |
| Abzan (BGW) | 166 | 9.6% | 1797 | 2.49 | Dark Confidant, Liliana of the Veil, Grist, the Hunger Tide |
| Mardu (BRW) | 101 | 5.8% | 1782 | 2.41 | Thoughtseize, White Plume Adventurer, Inquisition of Kozilek |
| Naya (GRW) | 71 | 4.1% | 1734 | 2.44 | Questing Beast, Fireblast, Tireless Tracker |

## Aggro Breakdown

Aggro is 8.8% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 17 | 2.4% | 1879 | 2.2 | Grist, the Hunger Tide, Deathrite Shaman, Llanowar Elves |
| Grixis (BRU) | 46 | 6.5% | 1868 | 2.2 | Dragon's Rage Channeler, Chain Lightning, Emperor of Bones |
| Jeskai (RUW) | 222 | 31.6% | 1860 | 2.11 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Adeline, Resplendent Cathar |
| Temur (GRU) | 56 | 8.0% | 1848 | 2.26 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Esper (BUW) | 62 | 8.8% | 1821 | 2.1 | Emperor of Bones, Adeline, Resplendent Cathar, Deep-Cavern Bat |
| Bant (GUW) | 49 | 7.0% | 1813 | 2.1 | Llanowar Elves, Giver of Runes, Birds of Paradise |
| Mardu (BRW) | 108 | 15.4% | 1797 | 2.1 | Dragon's Rage Channeler, Adeline, Resplendent Cathar, Fireblast |
| Naya (GRW) | 80 | 11.4% | 1796 | 2.17 | Chain Lightning, Lightning Bolt, Dragon's Rage Channeler |
| Jund (BGR) | 24 | 3.4% | 1784 | 2.16 | Ignoble Hierarch, Chain Lightning, Emperor of Bones |
| Abzan (BGW) | 21 | 3.0% | 1778 | 2.08 | Esper Sentinel, Lion's Eye Diamond, Rofellos, Llanowar Emissary |

## Tempo Breakdown

Tempo is 9.3% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Grixis (BRU) | 74 | 9.9% | 1914 | 2.26 | Spell Pierce, Cabal Ritual, Wan Shi Tong, Librarian |
| Sultai (BGU) | 67 | 9.0% | 1885 | 2.37 | Daze, Recurring Nightmare, True-Name Nemesis |
| Jeskai (RUW) | 194 | 26.1% | 1871 | 2.23 | Daze, True-Name Nemesis, Spell Pierce |
| Temur (GRU) | 49 | 6.6% | 1865 | 2.35 | True-Name Nemesis, Mawloc, Wan Shi Tong, Librarian |
| Esper (BUW) | 180 | 24.2% | 1864 | 2.19 | True-Name Nemesis, Remand, Daze |
| Azorius (UW) | 28 | 3.8% | 1864 | 2.3 | True-Name Nemesis, Daze, Subtlety |
| Bant (GUW) | 105 | 14.1% | 1844 | 2.27 | True-Name Nemesis, Memory Lapse, Daze |
| Mardu (BRW) | 14 | 1.9% | 1795 | 2.19 | Animate Dead, Cabal Ritual, Reprieve |
| Abzan (BGW) | 11 | 1.5% | 1728 | 2.19 | Dark Ritual, Path to Exile, Phelia, Exuberant Shepherd |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 3326 | 41.6% |
| Blue (U) | 4173 | 52.2% |
| Black (B) | 3779 | 47.2% |
| Red (R) | 3054 | 38.2% |
| Green (G) | 3408 | 42.6% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| BGU | 920 | 11.5% |
| BUW | 812 | 10.2% |
| RUW | 811 | 10.1% |
| BGR | 579 | 7.2% |
| GUW | 525 | 6.6% |
| BRU | 513 | 6.4% |
| GRU | 482 | 6.0% |
| BGW | 480 | 6.0% |
| BRW | 338 | 4.2% |
| GRW | 280 | 3.5% |
| BG | 104 | 1.3% |
| UW | 55 | 0.7% |
| GU | 20 | 0.3% |
| BU | 19 | 0.2% |
| RU | 16 | 0.2% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.78 | 2.58 | 1 | 18 |
| Removal | 4.12 | 1.97 | 0 | 13 |
| Card Draw | 4.92 | 2.28 | 0 | 15 |
| Avg CMC | 2.78 | 0.73 | 1.3 | 5.7 |
| Deck Quality | 1885.2 | 122.58 | 1553 | 2368 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Mox Jet | 15.7 | 760 |
| 2 | Mox Sapphire | 15.8 | 727 |
| 3 | Sol Ring | 15.9 | 744 |
| 4 | Ancestral Recall | 16.2 | 750 |
| 5 | Mana Drain | 16.2 | 749 |
| 6 | Mox Emerald | 16.2 | 744 |
| 7 | Black Lotus | 16.4 | 782 |
| 8 | Mox Ruby | 16.5 | 749 |
| 9 | Mox Pearl | 16.6 | 738 |
| 10 | Oko, Thief of Crowns | 16.7 | 732 |
| 11 | Orcish Bowmasters | 16.7 | 773 |
| 12 | Tolarian Academy | 16.7 | 740 |
| 13 | Chrome Mox | 16.8 | 772 |
| 14 | Hullbreacher | 16.8 | 760 |
| 15 | Thoughtseize | 16.8 | 772 |
| 16 | Urza, Lord High Artificer | 16.8 | 736 |
| 17 | Mox Diamond | 16.9 | 747 |
| 18 | Lotus Petal | 17 | 769 |
| 19 | Ragavan, Nimble Pilferer | 17 | 760 |
| 20 | The One Ring | 17 | 757 |

## Wheel Analysis

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Mox Jet | 15.7 |
| Mox Sapphire | 15.8 |
| Sol Ring | 15.9 |
| Ancestral Recall | 16.2 |
| Mana Drain | 16.2 |
| Mox Emerald | 16.2 |
| Black Lotus | 16.4 |
| Mox Ruby | 16.5 |
| Mox Pearl | 16.6 |
| Oko, Thief of Crowns | 16.7 |
| Orcish Bowmasters | 16.7 |
| Tolarian Academy | 16.7 |
| Chrome Mox | 16.8 |
| Hullbreacher | 16.8 |
| Thoughtseize | 16.8 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 765 |
| Golos, Tireless Pilgrim | 100.0% | 741 |
| Urza's Saga | 100.0% | 774 |
| Ignoble Hierarch | 93.8% | 741 |
| Imperial Recruiter | 93.6% | 750 |
| Damn | 93.5% | 754 |
| Vindicate | 93.0% | 769 |
| Loran of the Third Path | 92.7% | 738 |
| Recruiter of the Guard | 91.3% | 774 |
| Pyrokinesis | 90.0% | 752 |
| Elvish Mystic | 89.6% | 742 |
| Embereth Shieldbreaker // Battle Display | 88.5% | 757 |
| Noble Hierarch | 87.7% | 770 |
| Atraxa, Grand Unifier | 87.6% | 761 |
| Endurance | 87.5% | 776 |

## Anomalies

### Insufficient Pool Depth: 398 decks

5.0% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 21.6% | +8.6% | Algorithm over-commits; heavily contested in real drafts |
| tempo | 21 (10.5%) | 9.3% | -1.2% | Roughly matches card support |
| aggro | 27 (13.5%) | 8.8% | -4.7% | Roughly matches card support |
| reanimator | 17 (8.5%) | 8.7% | +0.2% | Roughly matches card support |
| ramp | 16 (8%) | 7.3% | -0.7% | Roughly matches card support |
| control | 30 (15%) | 4.7% | -10.3% | Algorithm under-values; likely open in real drafts |
| artifacts | 46 (23%) | 4.6% | -18.4% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 4.1% | +3.6% | Roughly matches card support |
| sneak | 7 (3.5%) | 3.6% | +0.1% | Roughly matches card support |
| storm | 9 (4.5%) | 2.2% | -2.3% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 2.2% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 8.7% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 3.6% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 4.6% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 8.8% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 9.3% of decks (structurally deep, likely open)
- **control**: 30 cards → 4.7% of decks (structurally deep, likely open)

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

Average color appearance: 44.4%

- White: 41.6% (-2.8% from average)
- Blue: 52.2% (+7.8% from average)
- Black: 47.2% (+2.9% from average)
- Red: 38.2% (-6.2% from average)
- Green: 42.6% (-1.8% from average)

## Summary

- **1000** drafts simulated, **8000** decks built
- Top archetype by algorithm: **midrange** (21.6%)
- Most played color: **U** (52.2%)
- Avg deck quality: **1885** ELO
