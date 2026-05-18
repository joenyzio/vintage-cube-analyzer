# Draft Simulation Report

Generated: 2026-05-18T04:58:51.767Z

**Players per Draft:** 8
**Drafts Simulated:** 10000
**Total Decks Built:** 80000

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
| midrange | 20707 | 25.9% | 1.00 | 1878 |
| ramp | 9151 | 11.4% | 1.00 | 1955 |
| reanimator | 9074 | 11.3% | 1.00 | 2008 |
| tempo | 8455 | 10.6% | 1.00 | 1913 |
| aggro | 8373 | 10.5% | 1.00 | 1866 |
| artifacts | 5568 | 7.0% | 1.00 | 1963 |
| oath | 4481 | 5.6% | 1.00 | 2030 |
| control | 4357 | 5.4% | 1.00 | 1918 |
| doomsday | 3830 | 4.8% | 1.00 | 1981 |
| sneak | 3778 | 4.7% | 1.00 | 2004 |
| storm | 2226 | 2.8% | 1.00 | 1942 |

## Midrange Breakdown

Midrange is 25.9% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 3685 | 17.8% | 1969 | 2.57 | Uro, Titan of Nature's Wrath, Liliana of the Veil, Tireless Tracker |
| Dimir (BU) | 105 | 0.5% | 1943 | 2.56 | Liliana of the Veil, Bolas's Citadel, Grief |
| Golgari (BG) | 199 | 1.0% | 1939 | 2.87 | Grist, the Hunger Tide, Liliana of the Veil, Dark Confidant |
| Simic (GU) | 71 | 0.3% | 1910 | 2.57 | Uro, Titan of Nature's Wrath, Scavenging Ooze, Oko, Thief of Crowns |
| Grixis (BRU) | 2099 | 10.1% | 1899 | 2.55 | Liliana of the Veil, Lutri, the Spellchaser, Dark Confidant |
| Jund (BGR) | 1664 | 8.0% | 1890 | 2.67 | Liliana of the Veil, Grist, the Hunger Tide, Dark Confidant |
| Esper (BUW) | 3367 | 16.3% | 1878 | 2.41 | Liliana of the Veil, Dark Confidant, Thoughtseize |
| Temur (GRU) | 1411 | 6.8% | 1875 | 2.62 | Uro, Titan of Nature's Wrath, Oko, Thief of Crowns, Tireless Tracker |
| Bant (GUW) | 1774 | 8.6% | 1858 | 2.51 | Oko, Thief of Crowns, Uro, Titan of Nature's Wrath, Tireless Tracker |
| Rakdos (BR) | 20 | 0.1% | 1858 | 2.83 | Fury, Wheel of Fortune, Thoughtseize |
| Abzan (BGW) | 1889 | 9.1% | 1840 | 2.51 | Liliana of the Veil, Dark Confidant, Tireless Tracker |
| Jeskai (RUW) | 2255 | 10.9% | 1832 | 2.44 | Gut, True Soul Zealot, Lutri, the Spellchaser, Adeline, Resplendent Cathar |
| Azorius (UW) | 78 | 0.4% | 1819 | 2.48 | Palace Jailer, Subtlety, Teferi, Time Raveler |
| Izzet (RU) | 57 | 0.3% | 1811 | 2.6 | Lutri, the Spellchaser, Dack Fayden, Time Spiral |
| Mardu (BRW) | 1180 | 5.7% | 1800 | 2.43 | Liliana of the Veil, Inquisition of Kozilek, Thoughtseize |
| Orzhov (BW) | 33 | 0.2% | 1789 | 2.44 | Liliana of the Veil, Dark Confidant, Lurrus of the Dream-Den |
| Gruul (GR) | 24 | 0.1% | 1777 | 2.7 | Tireless Tracker, Hexdrinker, Broadside Bombardiers |
| Naya (GRW) | 761 | 3.7% | 1767 | 2.54 | Questing Beast, Adeline, Resplendent Cathar, Minsc & Boo, Timeless Heroes |
| Boros (RW) | 29 | 0.1% | 1713 | 2.51 | Fireblast, Adeline, Resplendent Cathar, White Plume Adventurer |

## Aggro Breakdown

Aggro is 10.5% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Grixis (BRU) | 509 | 6.1% | 1922 | 2.19 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Sultai (BGU) | 181 | 2.2% | 1917 | 2.19 | Emperor of Bones, Badgermole Cub, Baleful Strix |
| Temur (GRU) | 569 | 6.8% | 1901 | 2.23 | Dragon's Rage Channeler, Chain Lightning, Ragavan, Nimble Pilferer |
| Jeskai (RUW) | 2985 | 35.7% | 1896 | 2.14 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Adeline, Resplendent Cathar |
| Izzet (RU) | 37 | 0.4% | 1874 | 2.28 | Dragon's Rage Channeler, Snap, Robber of the Rich |
| Esper (BUW) | 678 | 8.1% | 1872 | 2.1 | Thraben Inspector, Baleful Strix, Deep-Cavern Bat |
| Jund (BGR) | 298 | 3.6% | 1857 | 2.22 | Ragavan, Nimble Pilferer, Emperor of Bones, Dragon's Rage Channeler |
| Gruul (GR) | 27 | 0.3% | 1851 | 2.39 | Chain Lightning, Orcish Lumberjack, Fireblast |
| Bant (GUW) | 576 | 6.9% | 1850 | 2.12 | Birds of Paradise, Noble Hierarch, Voice of Victory |
| Azorius (UW) | 36 | 0.4% | 1839 | 2.08 | True-Name Nemesis, Ocelot Pride, Adeline, Resplendent Cathar |
| Mardu (BRW) | 1010 | 12.1% | 1821 | 2.1 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Naya (GRW) | 1017 | 12.1% | 1817 | 2.17 | Dragon's Rage Channeler, Chain Lightning, Adeline, Resplendent Cathar |
| Abzan (BGW) | 292 | 3.5% | 1778 | 2.1 | Mother of Runes, Adeline, Resplendent Cathar, Emperor of Bones |
| Boros (RW) | 130 | 1.6% | 1769 | 2.16 | Adeline, Resplendent Cathar, Fireblast, Chain Lightning |

## Tempo Breakdown

Tempo is 10.6% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Dimir (BU) | 87 | 1.0% | 1971 | 2.39 | Bolas's Citadel, Wan Shi Tong, Librarian, Yawgmoth's Will |
| Sultai (BGU) | 613 | 7.3% | 1960 | 2.38 | Daze, True-Name Nemesis, Spell Pierce |
| Grixis (BRU) | 903 | 10.7% | 1944 | 2.33 | Daze, True-Name Nemesis, Spell Pierce |
| Simic (GU) | 40 | 0.5% | 1935 | 2.44 | Daze, Wan Shi Tong, Librarian, True-Name Nemesis |
| Esper (BUW) | 2065 | 24.4% | 1923 | 2.26 | Daze, True-Name Nemesis, Wan Shi Tong, Librarian |
| Temur (GRU) | 576 | 6.8% | 1913 | 2.33 | Daze, True-Name Nemesis, Spell Pierce |
| Jeskai (RUW) | 2436 | 28.8% | 1904 | 2.24 | Daze, True-Name Nemesis, Spell Pierce |
| Bant (GUW) | 1030 | 12.2% | 1901 | 2.28 | Daze, True-Name Nemesis, Spell Pierce |
| Izzet (RU) | 97 | 1.1% | 1899 | 2.37 | True-Name Nemesis, Daze, Wan Shi Tong, Librarian |
| Azorius (UW) | 254 | 3.0% | 1889 | 2.26 | True-Name Nemesis, Daze, Wan Shi Tong, Librarian |
| Jund (BGR) | 47 | 0.6% | 1851 | 2.56 | Yawgmoth's Will, Mawloc, Bolas's Citadel |
| Abzan (BGW) | 85 | 1.0% | 1803 | 2.4 | Jacked Rabbit, Staff of the Storyteller, Guide of Souls |
| Mardu (BRW) | 150 | 1.8% | 1792 | 2.42 | Staff of the Storyteller, Bolas's Citadel, Underworld Breach |
| Naya (GRW) | 59 | 0.7% | 1762 | 2.4 | Badgermole Cub, Phelia, Exuberant Shepherd, Staff of the Storyteller |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 44902 | 56.1% |
| Blue (U) | 55528 | 69.4% |
| Black (B) | 50262 | 62.8% |
| Red (R) | 40760 | 50.9% |
| Green (G) | 45059 | 56.3% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| BGU | 11598 | 14.5% |
| BUW | 11199 | 14.0% |
| RUW | 10945 | 13.7% |
| BGR | 7798 | 9.7% |
| BRU | 7063 | 8.8% |
| GUW | 6991 | 8.7% |
| BGW | 6754 | 8.4% |
| GRU | 6089 | 7.6% |
| BRW | 4078 | 5.1% |
| GRW | 3996 | 5.0% |
| BG | 1172 | 1.5% |
| UW | 611 | 0.8% |
| BU | 441 | 0.6% |
| GU | 320 | 0.4% |
| RU | 271 | 0.3% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.6 | 2.57 | 0 | 19 |
| Removal | 4.01 | 1.96 | 0 | 14 |
| Card Draw | 4.98 | 2.36 | 0 | 16 |
| Avg CMC | 2.79 | 0.71 | 1.2 | 6.2 |
| Deck Quality | 1933.41 | 128.74 | 1504 | 2549 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Mox Sapphire | 16 | 10000 |
| 2 | Ancestral Recall | 16.1 | 10000 |
| 3 | Mox Pearl | 16.1 | 10000 |
| 4 | Mox Jet | 16.2 | 10000 |
| 5 | Sol Ring | 16.2 | 10000 |
| 6 | Time Walk | 16.2 | 10000 |
| 7 | Mana Drain | 16.3 | 10000 |
| 8 | Mox Emerald | 16.3 | 10000 |
| 9 | Black Lotus | 16.4 | 10000 |
| 10 | Mox Diamond | 16.4 | 10000 |
| 11 | Lion's Eye Diamond | 16.5 | 10000 |
| 12 | Mox Ruby | 16.5 | 10000 |
| 13 | Mana Crypt | 16.6 | 10000 |
| 14 | Chrome Mox | 16.7 | 10000 |
| 15 | Mana Vault | 16.7 | 10000 |
| 16 | Ragavan, Nimble Pilferer | 16.8 | 10000 |
| 17 | The One Ring | 16.8 | 10000 |
| 18 | Timetwister | 16.9 | 10000 |
| 19 | Oko, Thief of Crowns | 17 | 10000 |
| 20 | Emrakul, the Aeons Torn | 17.1 | 10000 |

## Wheel Analysis

### Consistent Wheelers (wheel > 80% of opportunities)

| Card | Wheel Rate | Opportunities |
|------|------------|---------------|
| Loran of the Third Path | 99.2% | 70000 |
| Embereth Shieldbreaker // Battle Display | 98.7% | 70000 |
| Vindicate | 96.3% | 70000 |
| Cathar Commando | 95.9% | 70000 |
| Damn | 95.7% | 70000 |
| Endurance | 95.1% | 70000 |
| Recruiter of the Guard | 95.0% | 70000 |
| Lush Portico | 94.7% | 70000 |
| Containment Priest | 94.4% | 70000 |
| Imperial Recruiter | 94.1% | 70000 |
| Scapeshift | 93.5% | 70000 |
| Pyrokinesis | 92.7% | 70000 |
| Flickerwisp | 90.7% | 70000 |
| Enlightened Tutor | 89.9% | 70000 |
| Sentinel of the Nameless City | 89.2% | 70000 |

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Mox Sapphire | 16 |
| Ancestral Recall | 16.1 |
| Mox Pearl | 16.1 |
| Mox Jet | 16.2 |
| Sol Ring | 16.2 |
| Time Walk | 16.2 |
| Mana Drain | 16.3 |
| Mox Emerald | 16.3 |
| Black Lotus | 16.4 |
| Mox Diamond | 16.4 |
| Lion's Eye Diamond | 16.5 |
| Mox Ruby | 16.5 |
| Mana Crypt | 16.6 |
| Chrome Mox | 16.7 |
| Mana Vault | 16.7 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 10000 |
| Golos, Tireless Pilgrim | 100.0% | 10000 |
| Urza's Saga | 100.0% | 10000 |
| Ignoble Hierarch | 96.2% | 10000 |
| Damn | 93.8% | 10000 |
| Imperial Recruiter | 93.5% | 10000 |
| Loran of the Third Path | 93.3% | 10000 |
| Vindicate | 93.0% | 10000 |
| Recruiter of the Guard | 92.4% | 10000 |
| Arbor Elf | 92.0% | 10000 |
| Pyrokinesis | 90.7% | 10000 |
| Embereth Shieldbreaker // Battle Display | 90.0% | 10000 |
| Elvish Mystic | 89.3% | 10000 |
| Monastery Mentor | 89.2% | 10000 |
| Lingering Souls | 89.0% | 10000 |

## Key Card Routing

Where do archetype-defining cards actually end up? This shows the breakdown
of which archetypes take each key card, revealing whether similar archetypes
(like Storm and Doomsday) are producing meaningfully different decks.

### Doomsday Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Doomsday | 10000 | doomsday (29%) | midrange (15%) | tempo (8%) |
| Thassa's Oracle | 10000 | doomsday (34%) | midrange (15%) | tempo (10%) |
| Lion's Eye Diamond | 10000 | midrange (23%) | doomsday (14%) | ramp (12%) |

### Storm Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Brain Freeze | 10000 | storm (19%) | midrange (18%) | tempo (10%) |
| Yawgmoth's Will | 10000 | midrange (19%) | storm (9%) | tempo (8%) |

### Reanimator Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Entomb | 10000 | reanimator (37%) | midrange (14%) | ramp (6%) |
| Reanimate | 10000 | reanimator (41%) | midrange (14%) | ramp (4%) |
| Exhume | 10000 | reanimator (40%) | midrange (10%) | ramp (8%) |
| Griselbrand | 10000 | reanimator (27%) | ramp (14%) | oath (14%) |

### Sneak Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Sneak Attack | 10000 | sneak (16%) | midrange (11%) | aggro (10%) |
| Through the Breach | 10000 | sneak (19%) | reanimator (11%) | ramp (7%) |
| Show and Tell | 10000 | sneak (16%) | midrange (13%) | reanimator (8%) |

### Storm vs Doomsday Split

Cards shared between Storm and Doomsday - do they split appropriately?

| Card | Storm % | Doomsday % | Other % | Verdict |
|------|---------|------------|---------|---------|
| Dark Ritual | 6% | 11% | 83% | Healthy split |
| Cabal Ritual | 7% | 12% | 82% | Healthy split |
| Lotus Petal | 5% | 5% | 89% | Healthy split |
| Lion's Eye Diamond | 6% | 14% | 79% | Doomsday-leaning |
| Gitaxian Probe | 3% | 12% | 85% | Doomsday-leaning |
| Brainstorm | 3% | 11% | 86% | Doomsday-leaning |
| Ponder | 3% | 11% | 86% | Doomsday-leaning |
| Preordain | 3% | 11% | 86% | Doomsday-leaning |

## Anomalies

### Insufficient Pool Depth: 5298 decks

6.6% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 25.9% | +12.9% | Algorithm over-commits; heavily contested in real drafts |
| ramp | 16 (8%) | 11.4% | +3.4% | Roughly matches card support |
| reanimator | 17 (8.5%) | 11.3% | +2.8% | Roughly matches card support |
| tempo | 21 (10.5%) | 10.6% | +0.1% | Roughly matches card support |
| aggro | 27 (13.5%) | 10.5% | -3.0% | Roughly matches card support |
| artifacts | 46 (23%) | 7.0% | -16.0% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 5.6% | +5.1% | Algorithm over-commits; heavily contested in real drafts |
| control | 30 (15%) | 5.4% | -9.6% | Algorithm under-values; likely open in real drafts |
| doomsday | 4 (2%) | 4.8% | +2.8% | Roughly matches card support |
| sneak | 7 (3.5%) | 4.7% | +1.2% | Roughly matches card support |
| storm | 9 (4.5%) | 2.8% | -1.7% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 2.8% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 11.3% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 4.7% of decks (only 1-2 drafters can realistically build this)
- **doomsday**: 4 cards → 4.8% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 7.0% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 10.5% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 10.6% of decks (structurally deep, likely open)
- **control**: 30 cards → 5.4% of decks (structurally deep, likely open)

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

Average color appearance: 59.1%

- White: 56.1% (-3.0% from average)
- Blue: 69.4% (+10.3% from average)
- Black: 62.8% (+3.7% from average)
- Red: 50.9% (-8.2% from average)
- Green: 56.3% (-2.8% from average)

## Summary

- **10000** drafts simulated, **80000** decks built
- Top archetype by algorithm: **midrange** (25.9%)
- Most played color: **U** (69.4%)
- Avg deck quality: **1933** ELO
