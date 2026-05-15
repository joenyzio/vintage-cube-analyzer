# Draft Simulation Report

Generated: 2026-05-15T01:34:29.597Z

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
| midrange | 15312 | 19.1% | 1.00 | 1860 |
| aggro | 7450 | 9.3% | 1.00 | 1858 |
| reanimator | 7435 | 9.3% | 1.00 | 1933 |
| tempo | 7103 | 8.9% | 1.00 | 1881 |
| ramp | 6105 | 7.6% | 1.00 | 1908 |
| control | 4100 | 5.1% | 1.00 | 1889 |
| artifacts | 3887 | 4.9% | 1.00 | 1916 |
| oath | 3687 | 4.6% | 1.00 | 1936 |
| sneak | 2756 | 3.4% | 1.00 | 1922 |
| storm | 2165 | 2.7% | 1.00 | 1871 |

## Midrange Breakdown

Midrange is 19.1% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 3150 | 20.6% | 1930 | 2.56 | Scavenging Ooze, Uro, Titan of Nature's Wrath, Dark Confidant |
| Golgari (BG) | 294 | 1.9% | 1894 | 2.88 | Grist, the Hunger Tide, Scavenging Ooze, Liliana of the Veil |
| Jund (BGR) | 1399 | 9.1% | 1871 | 2.71 | Liliana of the Veil, Grist, the Hunger Tide, Scavenging Ooze |
| Dimir (BU) | 73 | 0.5% | 1868 | 2.44 | Thoughtseize, Liliana of the Veil, Recurring Nightmare |
| Grixis (BRU) | 1370 | 8.9% | 1866 | 2.49 | Liliana of the Veil, Lutri, the Spellchaser, Dark Confidant |
| Temur (GRU) | 1033 | 6.7% | 1852 | 2.63 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Tireless Tracker |
| Simic (GU) | 44 | 0.3% | 1852 | 2.66 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Urza, Lord High Artificer |
| Esper (BUW) | 2173 | 14.2% | 1850 | 2.38 | Liliana of the Veil, Dark Confidant, Thoughtseize |
| Bant (GUW) | 1289 | 8.4% | 1837 | 2.5 | Oko, Thief of Crowns, Tireless Tracker, Uro, Titan of Nature's Wrath |
| Jeskai (RUW) | 1442 | 9.4% | 1832 | 2.42 | Lutri, the Spellchaser, Gut, True Soul Zealot, Broadside Bombardiers |
| Abzan (BGW) | 1571 | 10.3% | 1826 | 2.53 | Liliana of the Veil, Tireless Tracker, Dark Confidant |
| Azorius (UW) | 55 | 0.4% | 1817 | 2.4 | Flickerwisp, Mystic Confluence, The Wandering Emperor |
| Izzet (RU) | 41 | 0.3% | 1814 | 2.57 | Lutri, the Spellchaser, Chandra, Torch of Defiance, Wheel of Fortune |
| Rakdos (BR) | 14 | 0.1% | 1803 | 2.85 | Fury, Grief, Triplicate Titan |
| Mardu (BRW) | 771 | 5.0% | 1798 | 2.43 | Liliana of the Veil, Thoughtseize, Adeline, Resplendent Cathar |
| Gruul (GR) | 19 | 0.1% | 1793 | 3.01 | Fireblast, Rofellos, Llanowar Emissary, Pyrogoyf |
| Selesnya (GW) | 10 | 0.1% | 1779 | 2.9 | Hexdrinker, Scavenging Ooze, The One Ring |
| Naya (GRW) | 537 | 3.5% | 1775 | 2.59 | Questing Beast, Tireless Tracker, Fireblast |
| Orzhov (BW) | 16 | 0.1% | 1764 | 2.49 | Collective Brutality, Necromancy, Walking Ballista |
| Boros (RW) | 11 | 0.1% | 1755 | 2.45 | Forth Eorlingas!, Swords to Plowshares, Pyrogoyf |

## Aggro Breakdown

Aggro is 9.3% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Jeskai (RUW) | 2883 | 38.7% | 1891 | 2.1 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Adeline, Resplendent Cathar |
| Grixis (BRU) | 441 | 5.9% | 1890 | 2.17 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Temur (GRU) | 463 | 6.2% | 1882 | 2.26 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Sultai (BGU) | 124 | 1.7% | 1867 | 2.18 | Emperor of Bones, Orcish Bowmasters, Deep-Cavern Bat |
| Izzet (RU) | 49 | 0.7% | 1865 | 2.26 | Lightning Bolt, Ragavan, Nimble Pilferer, Chain Lightning |
| Jund (BGR) | 264 | 3.5% | 1852 | 2.25 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Esper (BUW) | 602 | 8.1% | 1846 | 2.06 | Emperor of Bones, Thraben Inspector, Esper Sentinel |
| Bant (GUW) | 430 | 5.8% | 1827 | 2.12 | Adeline, Resplendent Cathar, Noble Hierarch, Stoneforge Mystic |
| Mardu (BRW) | 860 | 11.5% | 1823 | 2.08 | Dragon's Rage Channeler, Adeline, Resplendent Cathar, Ragavan, Nimble Pilferer |
| Naya (GRW) | 900 | 12.1% | 1819 | 2.21 | Dragon's Rage Channeler, Adeline, Resplendent Cathar, Fireblast |
| Azorius (UW) | 29 | 0.4% | 1818 | 2.16 | Adeline, Resplendent Cathar, Giver of Runes, Guide of Souls |
| Rakdos (BR) | 16 | 0.2% | 1798 | 2.44 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Emperor of Bones |
| Boros (RW) | 131 | 1.8% | 1780 | 2.14 | Adeline, Resplendent Cathar, Ragavan, Nimble Pilferer, Dragon's Rage Channeler |
| Abzan (BGW) | 222 | 3.0% | 1777 | 2.09 | Adeline, Resplendent Cathar, Emperor of Bones, Badgermole Cub |
| Gruul (GR) | 16 | 0.2% | 1775 | 2.43 | Fireblast, Badgermole Cub, Lotus Cobra |

## Tempo Breakdown

Tempo is 8.9% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 509 | 7.2% | 1904 | 2.36 | Daze, True-Name Nemesis, Spell Pierce |
| Dimir (BU) | 63 | 0.9% | 1897 | 2.41 | Daze, Batterskull, True-Name Nemesis |
| Grixis (BRU) | 712 | 10.0% | 1894 | 2.3 | Daze, True-Name Nemesis, Wan Shi Tong, Librarian |
| Jeskai (RUW) | 2043 | 28.8% | 1890 | 2.19 | True-Name Nemesis, Daze, Spell Pierce |
| Esper (BUW) | 1729 | 24.3% | 1883 | 2.22 | Daze, True-Name Nemesis, Spell Pierce |
| Temur (GRU) | 504 | 7.1% | 1880 | 2.33 | Daze, True-Name Nemesis, Spell Pierce |
| Izzet (RU) | 80 | 1.1% | 1872 | 2.33 | Daze, True-Name Nemesis, Spell Pierce |
| Bant (GUW) | 886 | 12.5% | 1868 | 2.26 | Daze, True-Name Nemesis, Spell Pierce |
| Azorius (UW) | 260 | 3.7% | 1863 | 2.25 | True-Name Nemesis, Elite Spellbinder, Wan Shi Tong, Librarian |
| Simic (GU) | 44 | 0.6% | 1858 | 2.33 | True-Name Nemesis, Subtlety, Hullbreacher |
| Jund (BGR) | 38 | 0.5% | 1811 | 2.46 | Mawloc, Badgermole Cub, Delighted Halfling |
| Naya (GRW) | 64 | 0.9% | 1786 | 2.3 | Staff of the Storyteller, Reprieve, Mawloc |
| Mardu (BRW) | 99 | 1.4% | 1785 | 2.25 | Reprieve, Phelia, Exuberant Shepherd, Staff of the Storyteller |
| Abzan (BGW) | 66 | 0.9% | 1775 | 2.44 | Staff of the Storyteller, Walking Ballista, Delighted Halfling |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 33860 | 42.3% |
| Blue (U) | 41204 | 51.5% |
| Black (B) | 37142 | 46.4% |
| Red (R) | 30760 | 38.5% |
| Green (G) | 33982 | 42.5% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| RUW | 8891 | 11.1% |
| BGU | 8746 | 10.9% |
| BUW | 7906 | 9.9% |
| BGR | 6135 | 7.7% |
| GUW | 5120 | 6.4% |
| BGW | 5070 | 6.3% |
| BRU | 4759 | 5.9% |
| GRU | 4353 | 5.4% |
| BRW | 2993 | 3.7% |
| GRW | 2975 | 3.7% |
| BG | 1103 | 1.4% |
| UW | 621 | 0.8% |
| BU | 298 | 0.4% |
| RU | 255 | 0.3% |
| GU | 255 | 0.3% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.78 | 2.7 | 0 | 19 |
| Removal | 4.12 | 1.96 | 0 | 13 |
| Card Draw | 4.95 | 2.31 | 0 | 14 |
| Avg CMC | 2.78 | 0.73 | 1.2 | 5.9 |
| Deck Quality | 1889.6 | 98.58 | 1546 | 2406 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Black Lotus | 16.1 | 7451 |
| 2 | Ancestral Recall | 16.2 | 7442 |
| 3 | Mana Drain | 16.2 | 7504 |
| 4 | Mox Diamond | 16.2 | 7432 |
| 5 | Mox Ruby | 16.3 | 7474 |
| 6 | Mox Sapphire | 16.3 | 7470 |
| 7 | Griselbrand | 16.4 | 7446 |
| 8 | Mox Jet | 16.4 | 7549 |
| 9 | Sol Ring | 16.4 | 7568 |
| 10 | Mox Emerald | 16.6 | 7529 |
| 11 | Mox Pearl | 16.6 | 7516 |
| 12 | Chrome Mox | 16.7 | 7426 |
| 13 | Lion's Eye Diamond | 16.7 | 7533 |
| 14 | Time Walk | 16.7 | 7552 |
| 15 | Archon of Cruelty | 16.8 | 7502 |
| 16 | Atraxa, Grand Unifier | 16.8 | 7552 |
| 17 | Blightsteel Colossus | 16.8 | 7505 |
| 18 | Craterhoof Behemoth | 16.9 | 7449 |
| 19 | Emrakul, the Aeons Torn | 16.9 | 7465 |
| 20 | Lotus Petal | 16.9 | 7491 |

## Wheel Analysis

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Black Lotus | 16.1 |
| Ancestral Recall | 16.2 |
| Mana Drain | 16.2 |
| Mox Diamond | 16.2 |
| Mox Ruby | 16.3 |
| Mox Sapphire | 16.3 |
| Griselbrand | 16.4 |
| Mox Jet | 16.4 |
| Sol Ring | 16.4 |
| Mox Emerald | 16.6 |
| Mox Pearl | 16.6 |
| Chrome Mox | 16.7 |
| Lion's Eye Diamond | 16.7 |
| Time Walk | 16.7 |
| Archon of Cruelty | 16.8 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 7463 |
| Golos, Tireless Pilgrim | 100.0% | 7463 |
| Urza's Saga | 100.0% | 7505 |
| Ignoble Hierarch | 94.3% | 7555 |
| Damn | 93.3% | 7452 |
| Imperial Recruiter | 93.3% | 7512 |
| Loran of the Third Path | 93.0% | 7490 |
| Vindicate | 92.8% | 7529 |
| Recruiter of the Guard | 91.3% | 7548 |
| Pyrokinesis | 90.0% | 7626 |
| Elvish Mystic | 89.9% | 7528 |
| Embereth Shieldbreaker // Battle Display | 89.9% | 7425 |
| Monastery Mentor | 89.1% | 7566 |
| Lingering Souls | 88.6% | 7491 |
| Endurance | 88.4% | 7460 |

## Anomalies

### Insufficient Pool Depth: 4289 decks

5.4% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 19.1% | +6.1% | Algorithm over-commits; heavily contested in real drafts |
| aggro | 27 (13.5%) | 9.3% | -4.2% | Roughly matches card support |
| reanimator | 17 (8.5%) | 9.3% | +0.8% | Roughly matches card support |
| tempo | 21 (10.5%) | 8.9% | -1.6% | Roughly matches card support |
| ramp | 16 (8%) | 7.6% | -0.4% | Roughly matches card support |
| control | 30 (15%) | 5.1% | -9.9% | Algorithm under-values; likely open in real drafts |
| artifacts | 46 (23%) | 4.9% | -18.1% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 4.6% | +4.1% | Roughly matches card support |
| sneak | 7 (3.5%) | 3.4% | -0.1% | Roughly matches card support |
| storm | 9 (4.5%) | 2.7% | -1.8% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 2.7% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 9.3% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 3.4% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 4.9% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 9.3% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 8.9% of decks (structurally deep, likely open)
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

Average color appearance: 44.2%

- White: 42.3% (-1.9% from average)
- Blue: 51.5% (+7.3% from average)
- Black: 46.4% (+2.2% from average)
- Red: 38.5% (-5.8% from average)
- Green: 42.5% (-1.8% from average)

## Summary

- **10000** drafts simulated, **80000** decks built
- Top archetype by algorithm: **midrange** (19.1%)
- Most played color: **U** (51.5%)
- Avg deck quality: **1890** ELO
