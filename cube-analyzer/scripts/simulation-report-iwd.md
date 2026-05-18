# Draft Simulation Report

Generated: 2026-05-18T04:51:02.190Z

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
| midrange | 20734 | 25.9% | 1.00 | 1880 |
| reanimator | 9182 | 11.5% | 1.00 | 2004 |
| ramp | 9026 | 11.3% | 1.00 | 1952 |
| tempo | 8440 | 10.5% | 1.00 | 1914 |
| aggro | 8277 | 10.3% | 1.00 | 1872 |
| artifacts | 5560 | 7.0% | 1.00 | 1957 |
| oath | 4457 | 5.6% | 1.00 | 2025 |
| control | 4450 | 5.6% | 1.00 | 1919 |
| doomsday | 3866 | 4.8% | 1.00 | 1980 |
| sneak | 3860 | 4.8% | 1.00 | 1999 |
| storm | 2147 | 2.7% | 1.00 | 1941 |

## Midrange Breakdown

Midrange is 25.9% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 3620 | 17.5% | 1969 | 2.57 | Uro, Titan of Nature's Wrath, Dark Confidant, Tireless Tracker |
| Golgari (BG) | 238 | 1.1% | 1948 | 2.93 | Liliana of the Veil, Tireless Tracker, Deathrite Shaman |
| Dimir (BU) | 82 | 0.4% | 1944 | 2.61 | Liliana of the Veil, Memory Jar, Bolas's Citadel |
| Grixis (BRU) | 2120 | 10.2% | 1898 | 2.55 | Liliana of the Veil, Dark Confidant, Lutri, the Spellchaser |
| Jund (BGR) | 1654 | 8.0% | 1895 | 2.71 | Liliana of the Veil, Grist, the Hunger Tide, Tireless Tracker |
| Simic (GU) | 80 | 0.4% | 1884 | 2.62 | Oko, Thief of Crowns, Tireless Tracker, Uro, Titan of Nature's Wrath |
| Esper (BUW) | 3359 | 16.2% | 1876 | 2.41 | Liliana of the Veil, Dark Confidant, Inquisition of Kozilek |
| Temur (GRU) | 1493 | 7.2% | 1871 | 2.63 | Oko, Thief of Crowns, Uro, Titan of Nature's Wrath, Questing Beast |
| Rakdos (BR) | 26 | 0.1% | 1858 | 2.73 | Bolas's Citadel, Underworld Breach, Sheoldred, the Apocalypse |
| Bant (GUW) | 1831 | 8.8% | 1856 | 2.5 | Oko, Thief of Crowns, Uro, Titan of Nature's Wrath, Tireless Tracker |
| Gruul (GR) | 16 | 0.1% | 1847 | 2.83 | Rofellos, Llanowar Emissary, Minsc & Boo, Timeless Heroes, Badgermole Cub |
| Abzan (BGW) | 1902 | 9.2% | 1845 | 2.54 | Liliana of the Veil, Dark Confidant, Deathrite Shaman |
| Jeskai (RUW) | 2265 | 10.9% | 1834 | 2.45 | Lutri, the Spellchaser, Gut, True Soul Zealot, Fear of Missing Out |
| Izzet (RU) | 67 | 0.3% | 1833 | 2.6 | Lutri, the Spellchaser, Dack Fayden, Gut, True Soul Zealot |
| Azorius (UW) | 65 | 0.3% | 1830 | 2.45 | The Wandering Emperor, Teferi, Time Raveler, Flickerwisp |
| Mardu (BRW) | 1154 | 5.6% | 1807 | 2.43 | Liliana of the Veil, Thoughtseize, Inquisition of Kozilek |
| Selesnya (GW) | 13 | 0.1% | 1787 | 2.63 | Channel, Hexdrinker, Questing Beast |
| Orzhov (BW) | 36 | 0.2% | 1785 | 2.45 | Bolas's Citadel, Dark Ritual, Liliana of the Veil |
| Naya (GRW) | 701 | 3.4% | 1777 | 2.58 | Questing Beast, Tireless Tracker, Minsc & Boo, Timeless Heroes |
| Boros (RW) | 13 | 0.1% | 1723 | 2.56 | Comet, Stellar Pup, Pyrogoyf, Gut, True Soul Zealot |

## Aggro Breakdown

Aggro is 10.3% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 165 | 2.0% | 1926 | 2.18 | Birds of Paradise, Baleful Strix, Emperor of Bones |
| Grixis (BRU) | 548 | 6.6% | 1921 | 2.21 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Chain Lightning |
| Temur (GRU) | 681 | 8.2% | 1902 | 2.25 | Dragon's Rage Channeler, Lightning Bolt, Ragavan, Nimble Pilferer |
| Jeskai (RUW) | 2975 | 35.9% | 1897 | 2.13 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Adeline, Resplendent Cathar |
| Esper (BUW) | 712 | 8.6% | 1872 | 2.1 | Baleful Strix, Emperor of Bones, Deep-Cavern Bat |
| Izzet (RU) | 74 | 0.9% | 1870 | 2.23 | Dragon's Rage Channeler, Chain Lightning, Lightning Bolt |
| Jund (BGR) | 292 | 3.5% | 1864 | 2.22 | Dragon's Rage Channeler, Chain Lightning, Ragavan, Nimble Pilferer |
| Bant (GUW) | 585 | 7.1% | 1856 | 2.12 | Guide of Souls, Adeline, Resplendent Cathar, Noble Hierarch |
| Azorius (UW) | 39 | 0.5% | 1852 | 2.12 | Stoneforge Mystic, True-Name Nemesis, Esper Sentinel |
| Mardu (BRW) | 860 | 10.4% | 1828 | 2.12 | Dragon's Rage Channeler, Chain Lightning, Adeline, Resplendent Cathar |
| Naya (GRW) | 918 | 11.1% | 1818 | 2.19 | Dragon's Rage Channeler, Adeline, Resplendent Cathar, Chain Lightning |
| Gruul (GR) | 21 | 0.3% | 1803 | 2.44 | Fireblast, Badgermole Cub, Mawloc |
| Abzan (BGW) | 289 | 3.5% | 1792 | 2.12 | Adeline, Resplendent Cathar, Badgermole Cub, Emperor of Bones |
| Selesnya (GW) | 10 | 0.1% | 1782 | 2.13 | Lion Sash, Rofellos, Llanowar Emissary, Lotus Cobra |
| Boros (RW) | 83 | 1.0% | 1780 | 2.09 | Dragon's Rage Channeler, Adeline, Resplendent Cathar, Fireblast |

## Tempo Breakdown

Tempo is 10.5% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Dimir (BU) | 71 | 0.8% | 1979 | 2.35 | True-Name Nemesis, Daze, Wan Shi Tong, Librarian |
| Sultai (BGU) | 574 | 6.8% | 1962 | 2.37 | Daze, True-Name Nemesis, Spell Pierce |
| Grixis (BRU) | 880 | 10.4% | 1945 | 2.35 | Daze, True-Name Nemesis, Spell Pierce |
| Simic (GU) | 44 | 0.5% | 1937 | 2.38 | Daze, True-Name Nemesis, Spell Pierce |
| Esper (BUW) | 2113 | 25.0% | 1926 | 2.25 | Daze, True-Name Nemesis, Spell Pierce |
| Jeskai (RUW) | 2400 | 28.4% | 1908 | 2.22 | Daze, True-Name Nemesis, Spell Pierce |
| Temur (GRU) | 602 | 7.1% | 1906 | 2.35 | Daze, True-Name Nemesis, Spell Pierce |
| Bant (GUW) | 1042 | 12.3% | 1898 | 2.26 | Daze, True-Name Nemesis, Spell Pierce |
| Azorius (UW) | 294 | 3.5% | 1879 | 2.28 | True-Name Nemesis, Daze, Spell Pierce |
| Izzet (RU) | 92 | 1.1% | 1877 | 2.46 | Daze, True-Name Nemesis, Gut, True Soul Zealot |
| Jund (BGR) | 37 | 0.4% | 1865 | 2.48 | Mawloc, Dismember, Delighted Halfling |
| Abzan (BGW) | 92 | 1.1% | 1811 | 2.4 | Guide of Souls, Bristly Bill, Spine Sower, Badgermole Cub |
| Mardu (BRW) | 132 | 1.6% | 1809 | 2.29 | Phelia, Exuberant Shepherd, Bolas's Citadel, Jacked Rabbit |
| Naya (GRW) | 62 | 0.7% | 1796 | 2.39 | Guide of Souls, Phelia, Exuberant Shepherd, Badgermole Cub |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 45061 | 56.3% |
| Blue (U) | 55859 | 69.8% |
| Black (B) | 49991 | 62.5% |
| Red (R) | 40600 | 50.7% |
| Green (G) | 44973 | 56.2% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| BUW | 11399 | 14.2% |
| BGU | 11237 | 14.0% |
| RUW | 10960 | 13.7% |
| BGR | 7732 | 9.7% |
| GUW | 7163 | 9.0% |
| BRU | 7127 | 8.9% |
| BGW | 6925 | 8.7% |
| GRU | 6287 | 7.9% |
| BRW | 3860 | 4.8% |
| GRW | 3794 | 4.7% |
| BG | 1150 | 1.4% |
| UW | 643 | 0.8% |
| RU | 360 | 0.4% |
| BU | 348 | 0.4% |
| GU | 335 | 0.4% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.61 | 2.59 | 0 | 20 |
| Removal | 4.01 | 1.95 | 0 | 13 |
| Card Draw | 4.99 | 2.33 | 0 | 17 |
| Avg CMC | 2.79 | 0.7 | 1.2 | 5.7 |
| Deck Quality | 1932.82 | 125.54 | 1493 | 2550 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Mox Pearl | 16 | 10000 |
| 2 | Mox Sapphire | 16 | 10000 |
| 3 | Ancestral Recall | 16.1 | 10000 |
| 4 | Mox Jet | 16.2 | 10000 |
| 5 | Sol Ring | 16.2 | 10000 |
| 6 | Time Walk | 16.2 | 10000 |
| 7 | Mana Drain | 16.3 | 10000 |
| 8 | Mox Emerald | 16.3 | 10000 |
| 9 | Black Lotus | 16.4 | 10000 |
| 10 | Lion's Eye Diamond | 16.5 | 10000 |
| 11 | Mox Diamond | 16.5 | 10000 |
| 12 | Mox Ruby | 16.5 | 10000 |
| 13 | Mana Crypt | 16.6 | 10000 |
| 14 | Mana Vault | 16.7 | 10000 |
| 15 | Ragavan, Nimble Pilferer | 16.8 | 10000 |
| 16 | The One Ring | 16.9 | 10000 |
| 17 | Timetwister | 16.9 | 10000 |
| 18 | Oko, Thief of Crowns | 17 | 10000 |
| 19 | Chrome Mox | 17.1 | 10000 |
| 20 | Emrakul, the Aeons Torn | 17.1 | 10000 |

## Wheel Analysis

### Consistent Wheelers (wheel > 80% of opportunities)

| Card | Wheel Rate | Opportunities |
|------|------------|---------------|
| Embereth Shieldbreaker // Battle Display | 98.9% | 70000 |
| Loran of the Third Path | 97.6% | 70000 |
| Vindicate | 96.9% | 70000 |
| Recruiter of the Guard | 96.2% | 70000 |
| Endurance | 96.2% | 70000 |
| Lush Portico | 95.7% | 70000 |
| Imperial Recruiter | 95.3% | 70000 |
| Scapeshift | 94.6% | 70000 |
| Damn | 94.1% | 70000 |
| Flickerwisp | 92.2% | 70000 |
| Cathar Commando | 91.8% | 70000 |
| Containment Priest | 91.8% | 70000 |
| Enlightened Tutor | 91.3% | 70000 |
| Arbor Elf | 90.3% | 70000 |
| Goblin Engineer | 90.2% | 70000 |

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Mox Pearl | 16 |
| Mox Sapphire | 16 |
| Ancestral Recall | 16.1 |
| Mox Jet | 16.2 |
| Sol Ring | 16.2 |
| Time Walk | 16.2 |
| Mana Drain | 16.3 |
| Mox Emerald | 16.3 |
| Black Lotus | 16.4 |
| Lion's Eye Diamond | 16.5 |
| Mox Diamond | 16.5 |
| Mox Ruby | 16.5 |
| Mana Crypt | 16.6 |
| Mana Vault | 16.7 |
| Ragavan, Nimble Pilferer | 16.8 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 10000 |
| Golos, Tireless Pilgrim | 100.0% | 10000 |
| Urza's Saga | 100.0% | 10000 |
| Ignoble Hierarch | 96.2% | 10000 |
| Damn | 93.7% | 10000 |
| Loran of the Third Path | 93.7% | 10000 |
| Vindicate | 93.2% | 10000 |
| Imperial Recruiter | 93.1% | 10000 |
| Recruiter of the Guard | 92.7% | 10000 |
| Arbor Elf | 92.4% | 10000 |
| Pyrokinesis | 90.3% | 10000 |
| Embereth Shieldbreaker // Battle Display | 90.1% | 10000 |
| Elvish Mystic | 89.5% | 10000 |
| Monastery Mentor | 89.1% | 10000 |
| Atraxa, Grand Unifier | 89.1% | 10000 |

## Key Card Routing

Where do archetype-defining cards actually end up? This shows the breakdown
of which archetypes take each key card, revealing whether similar archetypes
(like Storm and Doomsday) are producing meaningfully different decks.

### Doomsday Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Doomsday | 10000 | doomsday (29%) | midrange (14%) | tempo (7%) |
| Thassa's Oracle | 10000 | doomsday (34%) | midrange (15%) | tempo (10%) |
| Lion's Eye Diamond | 10000 | midrange (23%) | doomsday (15%) | ramp (12%) |

### Storm Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Brain Freeze | 10000 | storm (18%) | midrange (18%) | tempo (10%) |
| Yawgmoth's Will | 10000 | midrange (21%) | storm (8%) | tempo (7%) |

### Reanimator Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Entomb | 10000 | reanimator (36%) | midrange (15%) | ramp (6%) |
| Reanimate | 10000 | reanimator (41%) | midrange (14%) | ramp (4%) |
| Exhume | 10000 | reanimator (42%) | midrange (10%) | ramp (7%) |
| Griselbrand | 10000 | reanimator (27%) | ramp (14%) | oath (13%) |

### Sneak Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Sneak Attack | 10000 | sneak (17%) | midrange (11%) | aggro (9%) |
| Through the Breach | 10000 | sneak (19%) | reanimator (11%) | midrange (7%) |
| Show and Tell | 10000 | sneak (16%) | midrange (13%) | reanimator (7%) |

### Storm vs Doomsday Split

Cards shared between Storm and Doomsday - do they split appropriately?

| Card | Storm % | Doomsday % | Other % | Verdict |
|------|---------|------------|---------|---------|
| Dark Ritual | 6% | 11% | 83% | Healthy split |
| Cabal Ritual | 7% | 12% | 81% | Healthy split |
| Lotus Petal | 5% | 6% | 89% | Healthy split |
| Lion's Eye Diamond | 6% | 15% | 79% | Doomsday-leaning |
| Gitaxian Probe | 3% | 12% | 85% | Doomsday-leaning |
| Brainstorm | 3% | 11% | 86% | Doomsday-leaning |
| Ponder | 3% | 11% | 87% | Doomsday-leaning |
| Preordain | 3% | 11% | 86% | Doomsday-leaning |

## Anomalies

### Insufficient Pool Depth: 5051 decks

6.3% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 25.9% | +12.9% | Algorithm over-commits; heavily contested in real drafts |
| reanimator | 17 (8.5%) | 11.5% | +3.0% | Roughly matches card support |
| ramp | 16 (8%) | 11.3% | +3.3% | Roughly matches card support |
| tempo | 21 (10.5%) | 10.5% | +0.0% | Roughly matches card support |
| aggro | 27 (13.5%) | 10.3% | -3.2% | Roughly matches card support |
| artifacts | 46 (23%) | 7.0% | -16.0% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 5.6% | +5.1% | Algorithm over-commits; heavily contested in real drafts |
| control | 30 (15%) | 5.6% | -9.4% | Algorithm under-values; likely open in real drafts |
| doomsday | 4 (2%) | 4.8% | +2.8% | Roughly matches card support |
| sneak | 7 (3.5%) | 4.8% | +1.3% | Roughly matches card support |
| storm | 9 (4.5%) | 2.7% | -1.8% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 2.7% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 11.5% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 4.8% of decks (only 1-2 drafters can realistically build this)
- **doomsday**: 4 cards → 4.8% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 7.0% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 10.3% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 10.5% of decks (structurally deep, likely open)
- **control**: 30 cards → 5.6% of decks (structurally deep, likely open)

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

- White: 56.3% (-2.8% from average)
- Blue: 69.8% (+10.7% from average)
- Black: 62.5% (+3.4% from average)
- Red: 50.7% (-8.4% from average)
- Green: 56.2% (-2.9% from average)

## Summary

- **10000** drafts simulated, **80000** decks built
- Top archetype by algorithm: **midrange** (25.9%)
- Most played color: **U** (69.8%)
- Avg deck quality: **1933** ELO
