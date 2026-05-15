# Draft Simulation Report

Generated: 2026-05-15T02:40:53.509Z

**Players per Draft:** 8
**Drafts Simulated:** 1000
**Total Decks Built:** 8000

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
| midrange | 2257 | 28.2% | 0.99 | 1833 |
| aggro | 984 | 12.3% | 0.99 | 1828 |
| reanimator | 947 | 11.8% | 1.00 | 1969 |
| tempo | 933 | 11.7% | 1.00 | 1864 |
| ramp | 796 | 10.0% | 1.00 | 1911 |
| artifacts | 540 | 6.8% | 1.00 | 1932 |
| control | 490 | 6.1% | 0.99 | 1877 |
| oath | 441 | 5.5% | 1.00 | 1974 |
| sneak | 368 | 4.6% | 1.00 | 1960 |
| storm | 244 | 3.0% | 1.00 | 1869 |

## Midrange Breakdown

Midrange is 28.2% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 421 | 18.7% | 1908 | 2.55 | Grist, the Hunger Tide, Scavenging Ooze, Dark Confidant |
| Dimir (BU) | 10 | 0.4% | 1890 | 2.65 | Thoughtseize, Psychic Frog, Duress |
| Golgari (BG) | 32 | 1.4% | 1884 | 2.99 | Grist, the Hunger Tide, Liliana of the Veil, Deathrite Shaman |
| Jund (BGR) | 153 | 6.8% | 1860 | 2.73 | Liliana of the Veil, Grist, the Hunger Tide, Deathrite Shaman |
| Temur (GRU) | 178 | 7.9% | 1845 | 2.62 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Tireless Tracker |
| Grixis (BRU) | 209 | 9.3% | 1838 | 2.51 | Inquisition of Kozilek, Liliana of the Veil, Lutri, the Spellchaser |
| Esper (BUW) | 340 | 15.1% | 1822 | 2.36 | Liliana of the Veil, Lurrus of the Dream-Den, Thoughtseize |
| Bant (GUW) | 205 | 9.1% | 1821 | 2.52 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Questing Beast |
| Jeskai (RUW) | 242 | 10.7% | 1800 | 2.45 | Laelia, the Blade Reforged, Lutri, the Spellchaser, Dack Fayden |
| Abzan (BGW) | 244 | 10.8% | 1792 | 2.46 | Hexdrinker, Liliana of the Veil, Dark Confidant |
| Mardu (BRW) | 119 | 5.3% | 1764 | 2.39 | Adeline, Resplendent Cathar, Comet, Stellar Pup, Palace Jailer |
| Naya (GRW) | 75 | 3.3% | 1728 | 2.47 | Questing Beast, Hexdrinker, Adeline, Resplendent Cathar |

## Aggro Breakdown

Aggro is 12.3% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Grixis (BRU) | 66 | 6.7% | 1875 | 2.13 | Emperor of Bones, Ragavan, Nimble Pilferer, Dragon's Rage Channeler |
| Jeskai (RUW) | 340 | 34.6% | 1859 | 2.13 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Temur (GRU) | 59 | 6.0% | 1848 | 2.28 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Fireblast |
| Sultai (BGU) | 18 | 1.8% | 1846 | 2.37 | Ponder, Icetill Explorer, Dauthi Voidwalker |
| Jund (BGR) | 45 | 4.6% | 1827 | 2.3 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Emperor of Bones |
| Esper (BUW) | 111 | 11.3% | 1820 | 2.08 | Thraben Inspector, Guide of Souls, Wan Shi Tong, Librarian |
| Bant (GUW) | 53 | 5.4% | 1810 | 2.1 | Ocelot Pride, Phelia, Exuberant Shepherd, Fastbond |
| Mardu (BRW) | 110 | 11.2% | 1804 | 2.07 | Chain Lightning, Adeline, Resplendent Cathar, Dragon's Rage Channeler |
| Naya (GRW) | 128 | 13.0% | 1775 | 2.2 | Adeline, Resplendent Cathar, Dragon's Rage Channeler, Chain Lightning |
| Abzan (BGW) | 34 | 3.5% | 1752 | 2.14 | Emperor of Bones, Lurrus of the Dream-Den, Badgermole Cub |
| Boros (RW) | 11 | 1.1% | 1722 | 2.25 | Fireblast, Adeline, Resplendent Cathar, Kaldra Compleat |

## Tempo Breakdown

Tempo is 11.7% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 70 | 7.5% | 1904 | 2.35 | Daze, Wan Shi Tong, Librarian, Spell Pierce |
| Dimir (BU) | 10 | 1.1% | 1885 | 2.36 | Wan Shi Tong, Librarian, Remand, True-Name Nemesis |
| Grixis (BRU) | 86 | 9.2% | 1879 | 2.32 | Wan Shi Tong, Librarian, Spell Pierce, Preordain |
| Esper (BUW) | 231 | 24.8% | 1872 | 2.2 | Daze, Snap, True-Name Nemesis |
| Jeskai (RUW) | 265 | 28.4% | 1870 | 2.23 | Daze, True-Name Nemesis, Spell Pierce |
| Temur (GRU) | 71 | 7.6% | 1861 | 2.32 | Badgermole Cub, Daze, Snapcaster Mage |
| Bant (GUW) | 109 | 11.7% | 1852 | 2.2 | Daze, Snap, True-Name Nemesis |
| Azorius (UW) | 28 | 3.0% | 1849 | 2.25 | True-Name Nemesis, Daze, Snap |
| Simic (GU) | 12 | 1.3% | 1818 | 2.46 | Spell Pierce, Remand, Mana Leak |
| Jund (BGR) | 11 | 1.2% | 1809 | 2.41 | Coalition Relic, Night's Whisper, Broadside Bombardiers |
| Mardu (BRW) | 19 | 2.0% | 1780 | 2.25 | Jacked Rabbit, Phelia, Exuberant Shepherd, Reprieve |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 4518 | 56.5% |
| Blue (U) | 5566 | 69.6% |
| Black (B) | 5001 | 62.5% |
| Red (R) | 4036 | 50.4% |
| Green (G) | 4541 | 56.8% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| BGU | 1186 | 14.8% |
| RUW | 1160 | 14.5% |
| BUW | 1108 | 13.9% |
| BGR | 762 | 9.5% |
| BGW | 720 | 9.0% |
| GUW | 674 | 8.4% |
| GRU | 645 | 8.1% |
| BRU | 642 | 8.0% |
| BRW | 401 | 5.0% |
| GRW | 364 | 4.5% |
| BG | 124 | 1.6% |
| UW | 52 | 0.7% |
| GU | 41 | 0.5% |
| BU | 38 | 0.5% |
| RU | 20 | 0.3% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.78 | 2.61 | 1 | 19 |
| Removal | 4.11 | 1.96 | 0 | 12 |
| Card Draw | 4.91 | 2.25 | 0 | 13 |
| Avg CMC | 2.78 | 0.72 | 1.3 | 5.6 |
| Deck Quality | 1883.81 | 121.62 | 1529 | 2415 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Mox Emerald | 15.6 | 1000 |
| 2 | Black Lotus | 15.9 | 1000 |
| 3 | Time Walk | 15.9 | 1000 |
| 4 | Mox Jet | 16 | 1000 |
| 5 | Ancestral Recall | 16.1 | 1000 |
| 6 | Mana Crypt | 16.1 | 1000 |
| 7 | Mox Pearl | 16.1 | 1000 |
| 8 | Mox Sapphire | 16.3 | 1000 |
| 9 | Sol Ring | 16.3 | 1000 |
| 10 | Mana Drain | 16.4 | 1000 |
| 11 | Mox Ruby | 16.4 | 1000 |
| 12 | Force of Will | 16.5 | 1000 |
| 13 | Mana Vault | 16.5 | 1000 |
| 14 | Mox Diamond | 16.5 | 1000 |
| 15 | Urza, Lord High Artificer | 16.5 | 1000 |
| 16 | Hullbreacher | 16.6 | 1000 |
| 17 | Tinker | 16.7 | 1000 |
| 18 | Tolarian Academy | 16.8 | 1000 |
| 19 | Chrome Mox | 16.9 | 1000 |
| 20 | Atraxa, Grand Unifier | 17 | 1000 |

## Wheel Analysis

### Consistent Wheelers (wheel > 80% of opportunities)

| Card | Wheel Rate | Opportunities |
|------|------------|---------------|
| Loran of the Third Path | 98.9% | 7000 |
| Embereth Shieldbreaker // Battle Display | 98.4% | 7000 |
| Vindicate | 96.2% | 7000 |
| Damn | 96.1% | 7000 |
| Cathar Commando | 95.6% | 7000 |
| Lush Portico | 95.0% | 7000 |
| Recruiter of the Guard | 95.0% | 7000 |
| Endurance | 94.8% | 7000 |
| Containment Priest | 94.7% | 7000 |
| Imperial Recruiter | 94.0% | 7000 |
| Pyrokinesis | 93.0% | 7000 |
| Scapeshift | 93.0% | 7000 |
| Flickerwisp | 90.0% | 7000 |
| Enlightened Tutor | 89.5% | 7000 |
| Monastery Mentor | 88.5% | 7000 |

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Mox Emerald | 15.6 |
| Black Lotus | 15.9 |
| Time Walk | 15.9 |
| Mox Jet | 16 |
| Ancestral Recall | 16.1 |
| Mana Crypt | 16.1 |
| Mox Pearl | 16.1 |
| Mox Sapphire | 16.3 |
| Sol Ring | 16.3 |
| Mana Drain | 16.4 |
| Mox Ruby | 16.4 |
| Force of Will | 16.5 |
| Mana Vault | 16.5 |
| Mox Diamond | 16.5 |
| Urza, Lord High Artificer | 16.5 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 1000 |
| Golos, Tireless Pilgrim | 100.0% | 1000 |
| Urza's Saga | 100.0% | 1000 |
| Ignoble Hierarch | 94.2% | 1000 |
| Damn | 92.9% | 1000 |
| Loran of the Third Path | 92.5% | 1000 |
| Imperial Recruiter | 92.4% | 1000 |
| Recruiter of the Guard | 92.0% | 1000 |
| Vindicate | 91.3% | 1000 |
| Embereth Shieldbreaker // Battle Display | 90.4% | 1000 |
| Pyrokinesis | 90.2% | 1000 |
| Atraxa, Grand Unifier | 89.1% | 1000 |
| Lingering Souls | 87.9% | 1000 |
| Monastery Mentor | 87.9% | 1000 |
| Elvish Mystic | 87.8% | 1000 |

## Anomalies

### Insufficient Pool Depth: 582 decks

7.3% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 28.2% | +15.2% | Algorithm over-commits; heavily contested in real drafts |
| aggro | 27 (13.5%) | 12.3% | -1.2% | Roughly matches card support |
| reanimator | 17 (8.5%) | 11.8% | +3.3% | Roughly matches card support |
| tempo | 21 (10.5%) | 11.7% | +1.2% | Roughly matches card support |
| ramp | 16 (8%) | 10.0% | +2.0% | Roughly matches card support |
| artifacts | 46 (23%) | 6.8% | -16.3% | Algorithm under-values; likely open in real drafts |
| control | 30 (15%) | 6.1% | -8.9% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 5.5% | +5.0% | Algorithm over-commits; heavily contested in real drafts |
| sneak | 7 (3.5%) | 4.6% | +1.1% | Roughly matches card support |
| storm | 9 (4.5%) | 3.0% | -1.5% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 3.0% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 11.8% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 4.6% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 6.8% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 12.3% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 11.7% of decks (structurally deep, likely open)
- **control**: 30 cards → 6.1% of decks (structurally deep, likely open)

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

- White: 56.5% (-2.7% from average)
- Blue: 69.6% (+10.4% from average)
- Black: 62.5% (+3.4% from average)
- Red: 50.4% (-8.7% from average)
- Green: 56.8% (-2.4% from average)

## Summary

- **1000** drafts simulated, **8000** decks built
- Top archetype by algorithm: **midrange** (28.2%)
- Most played color: **U** (69.6%)
- Avg deck quality: **1884** ELO
