# Draft Simulation Report

Generated: 2026-05-18T00:15:46.008Z

**Players per Draft:** 8
**Drafts Simulated:** 200
**Total Decks Built:** 1600

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
| midrange | 418 | 26.1% | 1.00 | 1878 |
| reanimator | 184 | 11.5% | 1.00 | 2008 |
| tempo | 178 | 11.1% | 1.00 | 1919 |
| ramp | 167 | 10.4% | 1.00 | 1975 |
| aggro | 166 | 10.4% | 0.99 | 1848 |
| artifacts | 105 | 6.6% | 1.00 | 1972 |
| oath | 104 | 6.5% | 1.00 | 2029 |
| doomsday | 81 | 5.1% | 1.00 | 1975 |
| control | 79 | 4.9% | 0.99 | 1934 |
| sneak | 66 | 4.1% | 1.00 | 1989 |
| storm | 52 | 3.3% | 1.00 | 1971 |

## Midrange Breakdown

Midrange is 26.1% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 82 | 19.6% | 1971 | 2.59 | Uro, Titan of Nature's Wrath, Tireless Tracker, Oko, Thief of Crowns |
| Jund (BGR) | 28 | 6.7% | 1895 | 2.71 | Liliana of the Veil, Questing Beast, Inquisition of Kozilek |
| Esper (BUW) | 60 | 14.4% | 1886 | 2.29 | Thoughtseize, Inquisition of Kozilek, Psychic Frog |
| Grixis (BRU) | 40 | 9.6% | 1879 | 2.41 | Barrowgoyf, Liliana of the Veil, Dack Fayden |
| Temur (GRU) | 25 | 6.0% | 1866 | 2.6 | Laelia, the Blade Reforged, Minsc & Boo, Timeless Heroes, Lutri, the Spellchaser |
| Jeskai (RUW) | 58 | 13.9% | 1853 | 2.46 | Ocelot Pride, Comet, Stellar Pup, Mishra's Bauble |
| Bant (GUW) | 46 | 11.0% | 1840 | 2.48 | Tireless Tracker, Scavenging Ooze, Oko, Thief of Crowns |
| Abzan (BGW) | 34 | 8.1% | 1825 | 2.45 | Grist, the Hunger Tide, Dark Confidant, Liliana of the Veil |
| Mardu (BRW) | 19 | 4.5% | 1799 | 2.38 | Goblin Rabblemaster, Headliner Scarlett, Liliana of the Veil |
| Naya (GRW) | 13 | 3.1% | 1755 | 2.46 | Adeline, Resplendent Cathar, Forth Eorlingas!, Channel |

## Aggro Breakdown

Aggro is 10.4% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Grixis (BRU) | 10 | 6.0% | 1943 | 2.03 | Dragon's Rage Channeler, Ragavan, Nimble Pilferer, Reanimate |
| Jeskai (RUW) | 57 | 34.3% | 1876 | 2.24 | Dragon's Rage Channeler, Laelia, the Blade Reforged, Adeline, Resplendent Cathar |
| Bant (GUW) | 11 | 6.6% | 1841 | 2.03 | Voice of Victory, Mox Opal, Lotus Petal |
| Esper (BUW) | 15 | 9.0% | 1838 | 2.13 | Baleful Strix, Emperor of Bones, Esper Sentinel |
| Mardu (BRW) | 21 | 12.7% | 1835 | 2.16 | Guide of Souls, Dragon's Rage Channeler, Chain Lightning |
| Naya (GRW) | 23 | 13.9% | 1797 | 2.26 | Dragon's Rage Channeler, Chain Lightning, Badgermole Cub |

## Tempo Breakdown

Tempo is 11.1% of decks. Here's the breakdown by color:

| Variant | Decks | % of Archetype | Avg ELO | Avg CMC | Top Cards |
|---------|-------|----------------|---------|---------|-----------|
| Sultai (BGU) | 18 | 10.1% | 1969 | 2.33 | Daze, Wan Shi Tong, Librarian, Memory Lapse |
| Esper (BUW) | 37 | 20.8% | 1943 | 2.22 | Daze, Wan Shi Tong, Librarian, Snap |
| Grixis (BRU) | 26 | 14.6% | 1928 | 2.35 | Subtlety, Miscalculation, Daze |
| Jeskai (RUW) | 46 | 25.8% | 1917 | 2.23 | True-Name Nemesis, Miscalculation, Snapcaster Mage |
| Temur (GRU) | 12 | 6.7% | 1908 | 2.16 | Daze, Wan Shi Tong, Librarian, Nadu, Winged Wisdom |
| Bant (GUW) | 26 | 14.6% | 1886 | 2.22 | Memory Lapse, Snap, Guide of Souls |

## Color Distribution

### Single Colors

| Color | Appearances | % of Decks |
|-------|-------------|------------|
| White (W) | 906 | 56.6% |
| Blue (U) | 1125 | 70.3% |
| Black (B) | 1006 | 62.9% |
| Red (R) | 791 | 49.4% |
| Green (G) | 912 | 57.0% |

### Color Combinations

| Colors | Count | % |
|--------|-------|---|
| BGU | 244 | 15.3% |
| BUW | 223 | 13.9% |
| RUW | 218 | 13.6% |
| GUW | 158 | 9.9% |
| BGR | 151 | 9.4% |
| BRU | 145 | 9.1% |
| BGW | 138 | 8.6% |
| GRU | 110 | 6.9% |
| BRW | 77 | 4.8% |
| GRW | 76 | 4.8% |
| BG | 22 | 1.4% |
| UW | 11 | 0.7% |
| GU | 7 | 0.4% |
| GR | 5 | 0.3% |
| RU | 5 | 0.3% |

## Average Deck Profile

| Metric | Mean | Std Dev | Min | Max |
|--------|------|---------|-----|-----|
| Creatures | 8.62 | 2.52 | 1 | 18 |
| Removal | 4 | 1.96 | 0 | 11 |
| Card Draw | 4.97 | 2.34 | 0 | 14 |
| Avg CMC | 2.79 | 0.73 | 1.3 | 5.6 |
| Deck Quality | 1935.84 | 129.91 | 1557 | 2375 |

## Most Picked Cards

### First Picks (P1P1)

| Rank | Card | Avg Pick Position | Times Picked |
|------|------|-------------------|--------------|
| 1 | Force of Will | 14.5 | 200 |
| 2 | The One Ring | 15.1 | 200 |
| 3 | Ragavan, Nimble Pilferer | 15.3 | 200 |
| 4 | Time Walk | 15.5 | 200 |
| 5 | Lotus Petal | 15.6 | 200 |
| 6 | Mana Crypt | 16 | 200 |
| 7 | Sol Ring | 16 | 200 |
| 8 | Black Lotus | 16.2 | 200 |
| 9 | Mox Pearl | 16.2 | 200 |
| 10 | Orcish Bowmasters | 16.2 | 200 |
| 11 | Mana Vault | 16.3 | 200 |
| 12 | Emrakul, the Aeons Torn | 16.4 | 200 |
| 13 | Mox Sapphire | 16.4 | 200 |
| 14 | Oko, Thief of Crowns | 16.4 | 200 |
| 15 | Mox Ruby | 16.5 | 200 |
| 16 | Atraxa, Grand Unifier | 16.6 | 200 |
| 17 | Mana Drain | 16.6 | 200 |
| 18 | Urza, Lord High Artificer | 16.6 | 200 |
| 19 | Timetwister | 16.7 | 200 |
| 20 | Mox Jet | 16.9 | 200 |

## Wheel Analysis

### Consistent Wheelers (wheel > 80% of opportunities)

| Card | Wheel Rate | Opportunities |
|------|------------|---------------|
| Loran of the Third Path | 99.6% | 1400 |
| Embereth Shieldbreaker // Battle Display | 98.6% | 1400 |
| Vindicate | 96.5% | 1400 |
| Cathar Commando | 96.2% | 1400 |
| Recruiter of the Guard | 95.3% | 1400 |
| Damn | 95.2% | 1400 |
| Lush Portico | 95.1% | 1400 |
| Endurance | 94.9% | 1400 |
| Scapeshift | 94.9% | 1400 |
| Containment Priest | 93.7% | 1400 |
| Imperial Recruiter | 93.7% | 1400 |
| Pyrokinesis | 92.4% | 1400 |
| Flickerwisp | 90.6% | 1400 |
| Enlightened Tutor | 90.0% | 1400 |
| Arbor Elf | 89.4% | 1400 |

### Never Wheelers (wheel < 5% of opportunities)

| Card | Avg Pick Position |
|------|-------------------|
| Force of Will | 14.5 |
| The One Ring | 15.1 |
| Ragavan, Nimble Pilferer | 15.3 |
| Time Walk | 15.5 |
| Lotus Petal | 15.6 |
| Mana Crypt | 16 |
| Sol Ring | 16 |
| Black Lotus | 16.2 |
| Mox Pearl | 16.2 |
| Orcish Bowmasters | 16.2 |
| Mana Vault | 16.3 |
| Emrakul, the Aeons Torn | 16.4 |
| Mox Sapphire | 16.4 |
| Oko, Thief of Crowns | 16.4 |
| Mox Ruby | 16.5 |

## Sideboard Analysis

### Cards Often Sideboarded (> 50% of picks)

| Card | Sideboard Rate | Times Picked |
|------|----------------|--------------|
| Boseiju, Who Endures | 100.0% | 200 |
| Golos, Tireless Pilgrim | 100.0% | 200 |
| Urza's Saga | 100.0% | 200 |
| Ignoble Hierarch | 98.0% | 200 |
| Damn | 94.0% | 200 |
| Imperial Recruiter | 94.0% | 200 |
| Seasoned Pyromancer | 93.5% | 200 |
| Arbor Elf | 92.5% | 200 |
| Embereth Shieldbreaker // Battle Display | 92.5% | 200 |
| Lingering Souls | 92.5% | 200 |
| Loran of the Third Path | 92.5% | 200 |
| Vindicate | 92.5% | 200 |
| Recruiter of the Guard | 92.0% | 200 |
| Chaos Defiler | 91.5% | 200 |
| Atraxa, Grand Unifier | 90.0% | 200 |

## Key Card Routing

Where do archetype-defining cards actually end up? This shows the breakdown
of which archetypes take each key card, revealing whether similar archetypes
(like Storm and Doomsday) are producing meaningfully different decks.

### Doomsday Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Doomsday | 200 | doomsday (32%) | midrange (9%) | tempo (8%) |
| Thassa's Oracle | 200 | doomsday (37%) | midrange (16%) | tempo (10%) |
| Lion's Eye Diamond | 200 | midrange (25%) | doomsday (15%) | tempo (14%) |

### Storm Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Brain Freeze | 200 | storm (22%) | midrange (17%) | tempo (12%) |
| Yawgmoth's Will | 200 | midrange (17%) | storm (13%) | reanimator (8%) |

### Reanimator Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Entomb | 200 | reanimator (37%) | midrange (13%) | artifacts (4%) |
| Reanimate | 200 | reanimator (43%) | midrange (16%) | aggro (7%) |
| Exhume | 200 | reanimator (44%) | midrange (12%) | ramp (11%) |
| Griselbrand | 200 | reanimator (31%) | ramp (15%) | oath (14%) |

### Sneak Key Cards

| Card | Times Picked | Primary Archetype | Secondary | Third |
|------|--------------|-------------------|-----------|-------|
| Sneak Attack | 200 | midrange (16%) | sneak (13%) | reanimator (10%) |
| Through the Breach | 200 | reanimator (17%) | sneak (15%) | ramp (8%) |
| Show and Tell | 200 | sneak (15%) | midrange (11%) | oath (10%) |

### Storm vs Doomsday Split

Cards shared between Storm and Doomsday - do they split appropriately?

| Card | Storm % | Doomsday % | Other % | Verdict |
|------|---------|------------|---------|---------|
| Dark Ritual | 8% | 9% | 83% | Healthy split |
| Cabal Ritual | 10% | 11% | 79% | Healthy split |
| Lotus Petal | 5% | 7% | 89% | Healthy split |
| Lion's Eye Diamond | 8% | 15% | 77% | Healthy split |
| Gitaxian Probe | 3% | 13% | 85% | Doomsday-leaning |
| Brainstorm | 3% | 12% | 86% | Doomsday-leaning |
| Ponder | 6% | 12% | 83% | Doomsday-leaning |
| Preordain | 6% | 12% | 83% | Healthy split |

## Anomalies

### Color Imbalances

- U overrepresented (70%)

### Insufficient Pool Depth: 105 decks

6.6% of decks had fewer than 23 castable non-land cards in their chosen colors.

## Algorithm Gap Analysis

The algorithm doesn't model competition between drafters. Each drafter optimizes
for archetype fit independently. Real drafts have 8 drafters competing for limited
cards in each archetype. This creates predictable gaps between simulation results
and what the cube can actually support.

### Card Count vs Simulation Results

| Archetype | Cards in Cube | Sim Result | Gap | Interpretation |
|-----------|---------------|------------|-----|----------------|
| midrange | 26 (13%) | 26.1% | +13.1% | Algorithm over-commits; heavily contested in real drafts |
| reanimator | 17 (8.5%) | 11.5% | +3.0% | Roughly matches card support |
| tempo | 21 (10.5%) | 11.1% | +0.6% | Roughly matches card support |
| ramp | 16 (8%) | 10.4% | +2.4% | Roughly matches card support |
| aggro | 27 (13.5%) | 10.4% | -3.1% | Roughly matches card support |
| artifacts | 46 (23%) | 6.6% | -16.4% | Algorithm under-values; likely open in real drafts |
| oath | 1 (0.5%) | 6.5% | +6.0% | Algorithm over-commits; heavily contested in real drafts |
| doomsday | 4 (2%) | 5.1% | +3.1% | Roughly matches card support |
| control | 30 (15%) | 4.9% | -10.1% | Algorithm under-values; likely open in real drafts |
| sneak | 7 (3.5%) | 4.1% | +0.6% | Roughly matches card support |
| storm | 9 (4.5%) | 3.3% | -1.3% | Roughly matches card support |

### Combo Over-Representation

The algorithm pushes drafters toward combo archetypes whose card pools can't
support that many drafters:

- **storm**: 9 cards → 3.3% of decks (only 1-2 drafters can realistically build this)
- **reanimator**: 17 cards → 11.5% of decks (only 1-2 drafters can realistically build this)
- **sneak**: 7 cards → 4.1% of decks (only 1-2 drafters can realistically build this)
- **doomsday**: 4 cards → 5.1% of decks (only 1-2 drafters can realistically build this)

### Linear Under-Representation

The algorithm scatters these cards across other strategies as "value picks"
rather than recognizing them as coherent archetypes:

- **artifacts**: 46 cards → 6.6% of decks (structurally deep, likely open)
- **aggro**: 27 cards → 10.4% of decks (structurally deep, likely open)
- **tempo**: 21 cards → 11.1% of decks (structurally deep, likely open)
- **control**: 30 cards → 4.9% of decks (structurally deep, likely open)

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

Average color appearance: 59.3%

- White: 56.6% (-2.6% from average)
- Blue: 70.3% (+11.1% from average)
- Black: 62.9% (+3.6% from average)
- Red: 49.4% (-9.8% from average)
- Green: 57.0% (-2.3% from average)

## Summary

- **200** drafts simulated, **1600** decks built
- Top archetype by algorithm: **midrange** (26.1%)
- Most played color: **U** (70.3%)
- Avg deck quality: **1936** ELO
