# Draft Simulation Report

Generated: 2026-05-16T21:51:21.362Z

**Players per Draft:** 8
**Drafts Simulated:** 2000
**Total Decks Built:** 16000

## Classification Methodology

Combo archetypes use **functional classification** - a deck must have both enablers AND payoffs:

- **Storm**: Requires a payoff (Tendrils/Brain Freeze) + 3+ enablers (rituals, draw engines)
- **Reanimator**: Requires reanimate spell + graveyard enabler + fatty target
- **Sneak & Show**: Requires Sneak Attack/Show and Tell/Through the Breach + target
- **Oath**: Requires Oath of Druids + creature payoff
- **Doomsday**: Requires Doomsday + Thassa's Oracle/Lab Man + pile enablers

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
| midrange | 4115 | 25.7% | 1.00 | 1878 |
| reanimator | 1842 | 11.5% | 1.00 | 2007 |
| ramp | 1818 | 11.4% | 1.00 | 1956 |
| tempo | 1697 | 10.6% | 1.00 | 1911 |
| aggro | 1680 | 10.5% | 1.00 | 1867 |
| artifacts | 1146 | 7.2% | 1.00 | 1961 |
| oath | 896 | 5.6% | 1.00 | 2025 |
| control | 851 | 5.3% | 1.00 | 1919 |
| doomsday | 771 | 4.8% | 1.00 | 1980 |
| sneak | 730 | 4.6% | 1.00 | 2003 |
| storm | 454 | 2.8% | 1.00 | 1948 |

## Midrange Breakdown

Midrange is 25.7% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 692 | 16.8% | 1973 | 2.6 | Uro, Titan of Nature's Wrath, Liliana of the Veil, Dark Confidant |
| Dimir (BU) | 28 | 0.7% | 1962 | 2.53 | Liliana of the Veil, Dark Confidant, Echo of Eons |
| Golgari (BG) | 34 | 0.8% | 1950 | 2.86 | Tireless Tracker, Collective Brutality, Liliana of the Veil |
| Jund (BGR) | 349 | 8.5% | 1904 | 2.7 | Liliana of the Veil, Dark Confidant, Grist, the Hunger Tide |
| Grixis (BRU) | 436 | 10.6% | 1899 | 2.51 | Liliana of the Veil, Lutri, the Spellchaser, Dark Confidant |
| Esper (BUW) | 664 | 16.1% | 1876 | 2.38 | Inquisition of Kozilek, Dark Confidant, Liliana of the Veil |
| Temur (GRU) | 301 | 7.3% | 1861 | 2.64 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Tireless Tracker |
| Bant (GUW) | 386 | 9.4% | 1856 | 2.5 | Uro, Titan of Nature's Wrath, Tireless Tracker, Oko, Thief of Crowns |
| Izzet (RU) | 11 | 0.3% | 1844 | 2.66 | Lutri, the Spellchaser, Broadside Bombardiers, Narset, Parter of Veils |
| Abzan (BGW) | 346 | 8.4% | 1843 | 2.51 | Liliana of the Veil, Scavenging Ooze, Inquisition of Kozilek |
| Azorius (UW) | 10 | 0.2% | 1831 | 2.73 | Mother of Runes, Mystic Confluence, Daze |
| Jeskai (RUW) | 426 | 10.4% | 1826 | 2.46 | Gut, True Soul Zealot, Lutri, the Spellchaser, Teferi, Time Raveler |
| Mardu (BRW) | 251 | 6.1% | 1797 | 2.43 | Thoughtseize, Liliana of the Veil, Lurrus of the Dream-Den |
| Naya (GRW) | 159 | 3.9% | 1774 | 2.57 | Questing Beast, Adeline, Resplendent Cathar, Tireless Tracker |

## Aggro Breakdown

Aggro is 10.5% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Grixis (BRU) | 99 | 5.9% | 1935 | 2.15 | Dragon's Rage Channeler, Lightning Bolt, Chain Lightning |
| Sultai (BGU) | 37 | 2.2% | 1912 | 2.12 | Psychic Frog, Deep-Cavern Bat, Birds of Paradise |
| Temur (GRU) | 113 | 6.7% | 1908 | 2.23 | Ragavan, Nimble Pilferer, Dragon's Rage Channeler, Chain Lightning |
| Jeskai (RUW) | 593 | 35.3% | 1895 | 2.12 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Lightning Bolt |
| Izzet (RU) | 10 | 0.6% | 1884 | 2.07 | Chain Lightning, Brain Freeze, Wan Shi Tong, Librarian |
| Esper (BUW) | 144 | 8.6% | 1873 | 2.11 | Mother of Runes, Deep-Cavern Bat, Adeline, Resplendent Cathar |
| Jund (BGR) | 62 | 3.7% | 1861 | 2.21 | Dragon's Rage Channeler, Chain Lightning, Emperor of Bones |
| Bant (GUW) | 113 | 6.7% | 1848 | 2.15 | Adeline, Resplendent Cathar, Ocelot Pride, Mother of Runes |
| Naya (GRW) | 224 | 13.3% | 1817 | 2.18 | Adeline, Resplendent Cathar, Dragon's Rage Channeler, Chain Lightning |
| Mardu (BRW) | 195 | 11.6% | 1817 | 2.12 | Dragon's Rage Channeler, Chain Lightning, Adeline, Resplendent Cathar |
| Boros (RW) | 16 | 1.0% | 1779 | 1.99 | Dragon's Rage Channeler, Adeline, Resplendent Cathar, Guide of Souls |
| Abzan (BGW) | 53 | 3.2% | 1775 | 2.08 | Emperor of Bones, Stoneforge Mystic, Esper Sentinel |

## Tempo Breakdown

Tempo is 10.6% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Dimir (BU) | 13 | 0.8% | 2034 | 2.42 | True-Name Nemesis, Daze, Remand |
| Sultai (BGU) | 102 | 6.0% | 1955 | 2.36 | True-Name Nemesis, Nadu, Winged Wisdom, Memory Lapse |
| Grixis (BRU) | 176 | 10.4% | 1937 | 2.38 | True-Name Nemesis, Daze, Remand |
| Simic (GU) | 12 | 0.7% | 1924 | 2.34 | Daze, Scythecat Cub, Uro, Titan of Nature's Wrath |
| Izzet (RU) | 19 | 1.1% | 1922 | 2.29 | True-Name Nemesis, Daze, Snapcaster Mage |
| Bant (GUW) | 221 | 13.0% | 1914 | 2.27 | Daze, True-Name Nemesis, Spell Pierce |
| Esper (BUW) | 433 | 25.5% | 1912 | 2.25 | Daze, True-Name Nemesis, Spell Pierce |
| Temur (GRU) | 119 | 7.0% | 1912 | 2.35 | Daze, True-Name Nemesis, Remand |
| Jeskai (RUW) | 473 | 27.9% | 1909 | 2.25 | Daze, True-Name Nemesis, Spell Pierce |
| Azorius (UW) | 62 | 3.7% | 1887 | 2.28 | True-Name Nemesis, Snap, Wan Shi Tong, Librarian |
| Jund (BGR) | 10 | 0.6% | 1819 | 2.47 | Mox Emerald, Badgermole Cub, Fire Covenant |
| Naya (GRW) | 12 | 0.7% | 1778 | 2.56 | Guide of Souls, Phelia, Exuberant Shepherd, Fireblast |
| Mardu (BRW) | 26 | 1.5% | 1766 | 2.22 | Reprieve, Guide of Souls, Bolas's Citadel |
| Abzan (BGW) | 16 | 0.9% | 1763 | 2.34 | Birds of Paradise, Mother of Runes, Elite Spellbinder |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 8996 | 56.2% |
| Blue (U) | 11158 | 69.7% |
| Black (B) | 10074 | 63.0% |
| Red (R) | 8112 | 50.7% |
| Green (G) | 8989 | 56.2% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| BGU | 2304 | 14.4% |
| BUW | 2268 | 14.2% |
| RUW | 2133 | 13.3% |
| BGR | 1545 | 9.7% |
| BRU | 1472 | 9.2% |
| GUW | 1449 | 9.1% |
| BGW | 1343 | 8.4% |
| GRU | 1191 | 7.4% |
| BRW | 812 | 5.1% |
| GRW | 812 | 5.1% |
| BG | 218 | 1.4% |
| UW | 122 | 0.8% |
| BU | 84 | 0.5% |
| RU | 68 | 0.4% |
| GU | 67 | 0.4% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.6 | 2.59 | 0 | 20 |
| Removal | 3.99 | 1.96 | 0 | 12 |
| Card Draw | 4.99 | 2.34 | 0 | 15 |
| Avg CMC | 2.79 | 0.7 | 1.2 | 6 |
| Deck Quality | 1933.21 | 128.53 | 1508 | 2573 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Mox Sapphire | 15.7 | 2000 |
| 2 | Time Walk | 16.1 | 2000 |
| 3 | Ancestral Recall | 16.2 | 2000 |
| 4 | Black Lotus | 16.2 | 2000 |
| 5 | Mana Crypt | 16.2 | 2000 |
| 6 | Mox Pearl | 16.2 | 2000 |
| 7 | Sol Ring | 16.2 | 2000 |
| 8 | Lion's Eye Diamond | 16.3 | 2000 |
| 9 | Mox Diamond | 16.4 | 2000 |
| 10 | Mox Jet | 16.4 | 2000 |
| 11 | Mox Ruby | 16.5 | 2000 |
| 12 | Mana Drain | 16.6 | 2000 |
| 13 | Mana Vault | 16.6 | 2000 |
| 14 | Timetwister | 16.6 | 2000 |
| 15 | Mox Emerald | 16.7 | 2000 |
| 16 | Tolarian Academy | 16.7 | 2000 |
| 17 | Chrome Mox | 17 | 2000 |
| 18 | Emrakul, the Aeons Torn | 17 | 2000 |
| 19 | The One Ring | 17 | 2000 |
| 20 | Reanimate | 17.1 | 2000 |

## Wheel Analysis

### Consistent Wheelers (wheel > 80% of opportunities)

| Card | Wheel Rate | Opportunities |
|------|------------|---------------|
| Loran of the Third Path | 99.2% | 14000 |
| Embereth Shieldbreaker // Battle Display | 98.5% | 14000 |
| Cathar Commando | 96.2% | 14000 |
| Vindicate | 95.9% | 14000 |
| Damn | 95.5% | 14000 |
| Endurance | 95.1% | 14000 |
| Recruiter of the Guard | 95.1% | 14000 |
| Lush Portico | 94.8% | 14000 |
| Containment Priest | 94.5% | 14000 |
| Imperial Recruiter | 94.0% | 14000 |
| Scapeshift | 93.7% | 14000 |
| Pyrokinesis | 93.0% | 14000 |
| Flickerwisp | 90.6% | 14000 |
| Arbor Elf | 89.5% | 14000 |
| Enlightened Tutor | 89.3% | 14000 |

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Mox Sapphire | 15.7 |
| Time Walk | 16.1 |
| Ancestral Recall | 16.2 |
| Black Lotus | 16.2 |
| Mana Crypt | 16.2 |
| Mox Pearl | 16.2 |
| Sol Ring | 16.2 |
| Lion's Eye Diamond | 16.3 |
| Mox Diamond | 16.4 |
| Mox Jet | 16.4 |
| Mox Ruby | 16.5 |
| Mana Drain | 16.6 |
| Mana Vault | 16.6 |
| Timetwister | 16.6 |
| Mox Emerald | 16.7 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 2000 |
| Golos, Tireless Pilgrim | 100.0% | 2000 |
| Urza's Saga | 100.0% | 2000 |
| Ignoble Hierarch | 95.8% | 2000 |
| Damn | 94.3% | 2000 |
| Loran of the Third Path | 93.7% | 2000 |
| Vindicate | 92.8% | 2000 |
| Imperial Recruiter | 92.3% | 2000 |
| Recruiter of the Guard | 92.2% | 2000 |
| Arbor Elf | 92.1% | 2000 |
| Pyrokinesis | 90.8% | 2000 |
| Embereth Shieldbreaker // Battle Display | 90.5% | 2000 |
| Lingering Souls | 89.8% | 2000 |
| Monastery Mentor | 89.6% | 2000 |
| Atraxa, Grand Unifier | 89.3% | 2000 |

## Anomalies

### Insufficient Pool Depth: 1019 decks

6.4% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 25.7% | +12.7% | Algorithm over-commits; heavily contested in real drafts |
| reanimator | 17 (8.5%) | 11.5% | +3.0% | Roughly matches card support |
| ramp | 16 (8%) | 11.4% | +3.4% | Roughly matches card support |
| tempo | 21 (10.5%) | 10.6% | +0.1% | Roughly matches card support |
| aggro | 27 (13.5%) | 10.5% | -3.0% | Roughly matches card support |
| artifacts | 46 (23%) | 7.2% | -15.8% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 5.6% | +5.1% | Algorithm over-commits; heavily contested in real drafts |
| control | 30 (15%) | 5.3% | -9.7% | Algorithm under-values; likely open in real drafts |
| doomsday | 4 (2%) | 4.8% | +2.8% | Roughly matches card support |
| sneak | 7 (3.5%) | 4.6% | +1.1% | Roughly matches card support |
| storm | 9 (4.5%) | 2.8% | -1.7% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 2.8% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 11.5% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 4.6% of decks (only 1-2 drafters can realistically build this)
- **doomsday**: 4 cards → 4.8% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 7.2% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 10.5% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 10.6% of decks (structurally deep, likely open)
- **control**: 30 cards → 5.3% of decks (structurally deep, likely open)

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

Average color appearance: 59.2%

- White: 56.2% (-2.9% from average)
- Blue: 69.7% (+10.6% from average)
- Black: 63.0% (+3.8% from average)
- Red: 50.7% (-8.5% from average)
- Green: 56.2% (-3.0% from average)

## Summary

- **2000** drafts simulated, **16000** decks built
- Top archetype by algorithm: **midrange** (25.7%)
- Most played color: **U** (69.7%)
- Avg deck quality: **1933** ELO
