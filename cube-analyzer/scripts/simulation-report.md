# Draft Simulation Report

Generated: 2026-05-15T01:29:50.927Z

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
| midrange | 20249 | 25.3% | 1.00 | 1861 |
| aggro | 10089 | 12.6% | 1.00 | 1859 |
| reanimator | 9916 | 12.4% | 1.00 | 1932 |
| tempo | 9569 | 12.0% | 1.00 | 1881 |
| ramp | 8085 | 10.1% | 1.00 | 1910 |
| control | 5367 | 6.7% | 1.00 | 1889 |
| artifacts | 5216 | 6.5% | 1.00 | 1912 |
| oath | 4927 | 6.2% | 1.00 | 1938 |
| sneak | 3746 | 4.7% | 1.00 | 1921 |
| storm | 2836 | 3.5% | 1.00 | 1870 |

## Midrange Breakdown

Midrange is 25.3% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 4190 | 20.7% | 1929 | 2.55 | Uro, Titan of Nature's Wrath, Dark Confidant, Scavenging Ooze |
| Golgari (BG) | 380 | 1.9% | 1894 | 2.87 | Deathrite Shaman, Scavenging Ooze, Liliana of the Veil |
| Jund (BGR) | 1826 | 9.0% | 1873 | 2.72 | Liliana of the Veil, Grist, the Hunger Tide, Dark Confidant |
| Dimir (BU) | 91 | 0.4% | 1871 | 2.59 | Bone Shards, Night's Whisper, Hymn to Tourach |
| Grixis (BRU) | 1853 | 9.2% | 1870 | 2.51 | Liliana of the Veil, Lutri, the Spellchaser, Inquisition of Kozilek |
| Simic (GU) | 78 | 0.4% | 1864 | 2.68 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Questing Beast |
| Temur (GRU) | 1276 | 6.3% | 1854 | 2.65 | Oko, Thief of Crowns, Uro, Titan of Nature's Wrath, Tireless Tracker |
| Esper (BUW) | 2845 | 14.1% | 1851 | 2.37 | Thoughtseize, Liliana of the Veil, Dark Confidant |
| Bant (GUW) | 1745 | 8.6% | 1836 | 2.48 | Oko, Thief of Crowns, Uro, Titan of Nature's Wrath, Tireless Tracker |
| Jeskai (RUW) | 1895 | 9.4% | 1832 | 2.4 | Gut, True Soul Zealot, Lutri, the Spellchaser, Fear of Missing Out |
| Abzan (BGW) | 2210 | 10.9% | 1828 | 2.52 | Tireless Tracker, Scavenging Ooze, Liliana of the Veil |
| Izzet (RU) | 41 | 0.2% | 1824 | 2.58 | Wan Shi Tong, Librarian, Fear of Missing Out, Mishra's Bauble |
| Azorius (UW) | 75 | 0.4% | 1820 | 2.42 | True-Name Nemesis, Flickerwisp, Force of Negation |
| Rakdos (BR) | 16 | 0.1% | 1809 | 3.02 | Sheoldred, the Apocalypse, Fury, Mox Jet |
| Mardu (BRW) | 1013 | 5.0% | 1798 | 2.43 | Liliana of the Veil, Thoughtseize, Inquisition of Kozilek |
| Gruul (GR) | 24 | 0.1% | 1795 | 2.87 | Questing Beast, Minsc & Boo, Timeless Heroes, Icetill Explorer |
| Selesnya (GW) | 11 | 0.1% | 1793 | 3.34 | Natural Order, Hexdrinker, Questing Beast |
| Naya (GRW) | 650 | 3.2% | 1775 | 2.58 | Questing Beast, Tireless Tracker, Fireblast |
| Orzhov (BW) | 19 | 0.1% | 1748 | 2.58 | Portable Hole, Hymn to Tourach, Bolas's Citadel |
| Boros (RW) | 11 | 0.1% | 1712 | 2.5 | Adeline, Resplendent Cathar, Fireblast, Goblin Rabblemaster |

## Aggro Breakdown

Aggro is 12.6% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Jeskai (RUW) | 3899 | 38.6% | 1893 | 2.1 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Adeline, Resplendent Cathar |
| Grixis (BRU) | 540 | 5.4% | 1888 | 2.18 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Lightning Bolt |
| Temur (GRU) | 618 | 6.1% | 1879 | 2.25 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Sultai (BGU) | 197 | 2.0% | 1871 | 2.13 | Baleful Strix, Emperor of Bones, Deathrite Shaman |
| Izzet (RU) | 68 | 0.7% | 1862 | 2.3 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Jund (BGR) | 349 | 3.5% | 1861 | 2.25 | Fireblast, Ragavan, Nimble Pilferer, Chain Lightning |
| Esper (BUW) | 793 | 7.9% | 1844 | 2.04 | Baleful Strix, Thraben Inspector, Guide of Souls |
| Bant (GUW) | 589 | 5.8% | 1835 | 2.09 | Birds of Paradise, Adeline, Resplendent Cathar, Mother of Runes |
| Naya (GRW) | 1256 | 12.4% | 1821 | 2.2 | Adeline, Resplendent Cathar, Dragon's Rage Channeler, Fireblast |
| Mardu (BRW) | 1146 | 11.4% | 1821 | 2.06 | Dragon's Rage Channeler, Adeline, Resplendent Cathar, Chain Lightning |
| Azorius (UW) | 56 | 0.6% | 1819 | 2.1 | True-Name Nemesis, Ocelot Pride, Snapcaster Mage |
| Boros (RW) | 202 | 2.0% | 1795 | 2.14 | Adeline, Resplendent Cathar, Fireblast, Dragon's Rage Channeler |
| Gruul (GR) | 33 | 0.3% | 1791 | 2.41 | Fireblast, Rofellos, Llanowar Emissary, Chain Lightning |
| Abzan (BGW) | 302 | 3.0% | 1780 | 2.08 | Emperor of Bones, Orcish Bowmasters, Adeline, Resplendent Cathar |
| Orzhov (BW) | 10 | 0.1% | 1731 | 2.03 | Adeline, Resplendent Cathar, Lightning Greaves, Night's Whisper |

## Tempo Breakdown

Tempo is 12.0% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 693 | 7.2% | 1907 | 2.33 | Daze, True-Name Nemesis, Remand |
| Grixis (BRU) | 936 | 9.8% | 1893 | 2.3 | Wan Shi Tong, Librarian, True-Name Nemesis, Daze |
| Jeskai (RUW) | 2820 | 29.5% | 1891 | 2.21 | True-Name Nemesis, Daze, Spell Pierce |
| Dimir (BU) | 91 | 1.0% | 1889 | 2.35 | Wan Shi Tong, Librarian, True-Name Nemesis, Psychic Frog |
| Esper (BUW) | 2346 | 24.5% | 1883 | 2.22 | Daze, True-Name Nemesis, Spell Pierce |
| Simic (GU) | 52 | 0.5% | 1880 | 2.39 | True-Name Nemesis, Nadu, Winged Wisdom, Daze |
| Temur (GRU) | 636 | 6.6% | 1877 | 2.35 | Daze, Remand, True-Name Nemesis |
| Bant (GUW) | 1204 | 12.6% | 1870 | 2.25 | True-Name Nemesis, Daze, Spell Pierce |
| Izzet (RU) | 123 | 1.3% | 1861 | 2.33 | True-Name Nemesis, Wan Shi Tong, Librarian, Daze |
| Azorius (UW) | 321 | 3.4% | 1851 | 2.26 | True-Name Nemesis, Daze, Snapcaster Mage |
| Jund (BGR) | 45 | 0.5% | 1812 | 2.67 | Mawloc, Lion's Eye Diamond, Animate Dead |
| Naya (GRW) | 79 | 0.8% | 1794 | 2.37 | Badgermole Cub, Lion Sash, Staff of the Storyteller |
| Mardu (BRW) | 131 | 1.4% | 1788 | 2.26 | Staff of the Storyteller, Phelia, Exuberant Shepherd, Jacked Rabbit |
| Abzan (BGW) | 83 | 0.9% | 1781 | 2.41 | Delighted Halfling, Phelia, Exuberant Shepherd, Badgermole Cub |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 45222 | 56.5% |
| Blue (U) | 54677 | 68.3% |
| Black (B) | 49698 | 62.1% |
| Red (R) | 41052 | 51.3% |
| Green (G) | 45286 | 56.6% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| RUW | 11944 | 14.9% |
| BGU | 11618 | 14.5% |
| BUW | 10502 | 13.1% |
| BGR | 8301 | 10.4% |
| BGW | 6849 | 8.6% |
| GUW | 6810 | 8.5% |
| BRU | 6331 | 7.9% |
| GRU | 5658 | 7.1% |
| BRW | 4036 | 5.0% |
| GRW | 3886 | 4.9% |
| BG | 1524 | 1.9% |
| UW | 791 | 1.0% |
| BU | 365 | 0.5% |
| GU | 333 | 0.4% |
| RU | 325 | 0.4% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.78 | 2.69 | 0 | 20 |
| Removal | 4.12 | 1.96 | 0 | 14 |
| Card Draw | 4.96 | 2.31 | 0 | 15 |
| Avg CMC | 2.78 | 0.73 | 1.2 | 6 |
| Deck Quality | 1889.95 | 97.32 | 1520 | 2400 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Mox Sapphire | 16.1 | 10000 |
| 2 | Black Lotus | 16.2 | 10000 |
| 3 | Mox Diamond | 16.2 | 10000 |
| 4 | Mox Pearl | 16.3 | 10000 |
| 5 | Mox Ruby | 16.3 | 10000 |
| 6 | Ancestral Recall | 16.4 | 10000 |
| 7 | Mana Drain | 16.4 | 10000 |
| 8 | Griselbrand | 16.5 | 10000 |
| 9 | Mox Emerald | 16.5 | 10000 |
| 10 | Sol Ring | 16.5 | 10000 |
| 11 | Lion's Eye Diamond | 16.6 | 10000 |
| 12 | Mox Jet | 16.6 | 10000 |
| 13 | Atraxa, Grand Unifier | 16.7 | 10000 |
| 14 | Blightsteel Colossus | 16.7 | 10000 |
| 15 | Chrome Mox | 16.7 | 10000 |
| 16 | Emrakul, the Aeons Torn | 16.7 | 10000 |
| 17 | Mana Crypt | 16.7 | 10000 |
| 18 | Archon of Cruelty | 16.8 | 10000 |
| 19 | Time Walk | 16.8 | 10000 |
| 20 | Craterhoof Behemoth | 16.9 | 10000 |

## Wheel Analysis

### Consistent Wheelers (wheel > 80% of opportunities)

| Card | Wheel Rate | Opportunities |
|------|------------|---------------|
| Loran of the Third Path | 98.9% | 70000 |
| Pyrokinesis | 97.0% | 70000 |
| Recruiter of the Guard | 97.0% | 70000 |
| Imperial Recruiter | 96.0% | 70000 |
| Embereth Shieldbreaker // Battle Display | 95.8% | 70000 |
| Endurance | 95.0% | 70000 |
| Upheaval | 94.5% | 70000 |
| Vindicate | 92.8% | 70000 |
| Cathar Commando | 92.8% | 70000 |
| Monastery Mentor | 92.3% | 70000 |
| Damn | 92.3% | 70000 |
| Elvish Mystic | 92.0% | 70000 |
| Containment Priest | 91.7% | 70000 |
| Tishana's Tidebinder | 91.7% | 70000 |
| Lush Portico | 91.2% | 70000 |

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Mox Sapphire | 16.1 |
| Black Lotus | 16.2 |
| Mox Diamond | 16.2 |
| Mox Pearl | 16.3 |
| Mox Ruby | 16.3 |
| Ancestral Recall | 16.4 |
| Mana Drain | 16.4 |
| Griselbrand | 16.5 |
| Mox Emerald | 16.5 |
| Sol Ring | 16.5 |
| Lion's Eye Diamond | 16.6 |
| Mox Jet | 16.6 |
| Atraxa, Grand Unifier | 16.7 |
| Blightsteel Colossus | 16.7 |
| Chrome Mox | 16.7 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 10000 |
| Urza's Saga | 100.0% | 10000 |
| Golos, Tireless Pilgrim | 100.0% | 10000 |
| Ignoble Hierarch | 94.0% | 10000 |
| Damn | 93.3% | 10000 |
| Vindicate | 93.0% | 10000 |
| Imperial Recruiter | 92.6% | 10000 |
| Loran of the Third Path | 92.4% | 10000 |
| Recruiter of the Guard | 91.7% | 10000 |
| Embereth Shieldbreaker // Battle Display | 90.3% | 10000 |
| Pyrokinesis | 90.0% | 10000 |
| Elvish Mystic | 89.9% | 10000 |
| Monastery Mentor | 89.5% | 10000 |
| Seasoned Pyromancer | 88.2% | 10000 |
| Lingering Souls | 88.2% | 10000 |

## Anomalies

### Insufficient Pool Depth: 5707 decks

7.1% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 25.3% | +12.3% | Algorithm over-commits; heavily contested in real drafts |
| aggro | 27 (13.5%) | 12.6% | -0.9% | Roughly matches card support |
| reanimator | 17 (8.5%) | 12.4% | +3.9% | Roughly matches card support |
| tempo | 21 (10.5%) | 12.0% | +1.5% | Roughly matches card support |
| ramp | 16 (8%) | 10.1% | +2.1% | Roughly matches card support |
| control | 30 (15%) | 6.7% | -8.3% | Algorithm under-values; likely open in real drafts |
| artifacts | 46 (23%) | 6.5% | -16.5% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 6.2% | +5.7% | Algorithm over-commits; heavily contested in real drafts |
| sneak | 7 (3.5%) | 4.7% | +1.2% | Roughly matches card support |
| storm | 9 (4.5%) | 3.5% | -1.0% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 3.5% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 12.4% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 4.7% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 6.5% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 12.6% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 12.0% of decks (structurally deep, likely open)
- **control**: 30 cards → 6.7% of decks (structurally deep, likely open)

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
- Blue: 68.3% (+9.4% from average)
- Black: 62.1% (+3.1% from average)
- Red: 51.3% (-7.7% from average)
- Green: 56.6% (-2.4% from average)

## Summary

- **10000** drafts simulated, **80000** decks built
- Top archetype by algorithm: **midrange** (25.3%)
- Most played color: **U** (68.3%)
- Avg deck quality: **1890** ELO
