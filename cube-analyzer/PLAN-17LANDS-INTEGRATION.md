# 17lands Win Rate Integration Plan

## Executive Summary

Add 17lands win rate data as a second signal alongside CubeCobra ELO. The key differentiator: **archetype-filtered IWD** (Improvement When Drawn) that tells you whether a card is good *in your specific deck*, not just globally.

**Why this matters:**
- ELO = what drafters *believe* is good (crowd consensus)
- IWD = what *actually wins* when drawn (outcome data, controlling for deck quality)
- When they diverge, you've found alpha (traps and steals)

---

## Phase 0: Name Normalization (Pre-requisite)

**Problem:** 57 of 360 cards appear "missing" from 17lands, but ~30-40 are just naming mismatches.

**Solution:** Build `normalizeCardName()` that tries multiple formats:

```typescript
// src/services/cardNameNormalizer.ts

export function normalizeCardName(name: string): string[] {
  const variants: string[] = [name];

  // Adventure cards: "Bonecrusher Giant // Stomp" ↔ "Bonecrusher Giant"
  if (name.includes(' // ')) {
    const [front, back] = name.split(' // ');
    variants.push(front);
    variants.push(back);
  } else {
    // Try adding common back-faces
    variants.push(`${name} // `); // Partial match
  }

  // DFCs: "Delver of Secrets // Insectile Aberration"
  // Try front-face only

  // Parenthetical text: "Jace, the Mind Sculptor (Borderless)"
  variants.push(name.replace(/\s*\([^)]*\)\s*$/, ''));

  return [...new Set(variants)];
}

export function findCardIn17lands(
  cubeName: string,
  lands17Data: Map<string, WinRateData>
): WinRateData | null {
  for (const variant of normalizeCardName(cubeName)) {
    if (lands17Data.has(variant)) {
      return lands17Data.get(variant)!;
    }
  }
  return null;
}
```

**Deliverable:** Run normalization against the 57 missing cards. Document how many recover vs. truly unavailable.

---

## Phase 1: Data Pipeline

### 1.1 Fetch Script

```typescript
// scripts/fetch-17lands.ts

const ENDPOINT = 'https://www.17lands.com/card_ratings/data';
const EXPANSION = 'Cube - Powered';
const FORMAT = 'PremierDraft';

// Also fetch color-filtered data for archetype-aware IWD
const COLOR_COMBOS = [
  '', // Global (no filter)
  'W', 'U', 'B', 'R', 'G',
  'WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'UR', 'BG', 'RW', 'GU',
  'WUB', 'UBR', 'BRG', 'RGW', 'GWU', // Shards
  'WBG', 'URW', 'BGU', 'RWB', 'GUR', // Wedges
];

interface WinRateData {
  name: string;
  gihWR: number | null;        // ever_drawn_win_rate
  iwd: number | null;          // drawn_improvement_win_rate
  avgPick: number | null;      // avg_pick (17lands' pick priority)
  gameCount: number;           // ever_drawn_game_count
  playRate: number | null;     // play_rate (% of time it makes the deck)

  // Color-filtered IWD for archetype-aware coaching
  iwdByColor: Record<string, number | null>;
}

// Fetch and save to src/data/17lands-winrates.json
```

### 1.2 Data Structure

```json
{
  "metadata": {
    "fetchedAt": "2026-05-17T20:00:00Z",
    "expansion": "Cube - Powered",
    "totalCards": 721,
    "cardsWithData": 625,
    "source": "17lands.com"
  },
  "cards": {
    "Time Walk": {
      "gihWR": 0.65,
      "iwd": 0.15,
      "avgPick": 1.2,
      "gameCount": 45000,
      "playRate": 0.95,
      "iwdByColor": {
        "U": 0.16,
        "UB": 0.14,
        "UR": 0.15,
        "UW": 0.13
      }
    }
  },
  "missingFromCube": [
    "Doomsday",
    "Blightsteel Colossus"
  ]
}
```

---

## Phase 2: Win Rate Service (with Archetype-Aware IWD)

This is the **core feature**, not a Phase 4 polish.

```typescript
// src/services/winRateInsights.ts

export interface WinRateData {
  gihWR: number | null;
  iwd: number | null;
  avgPick: number | null;
  gameCount: number;
  playRate: number | null;
}

export interface ArchetypeFilteredData extends WinRateData {
  archetypeIWD: number | null;  // IWD for the user's current colors
  archetypeColors: string;       // Which color combo was used
}

/**
 * Get win rate data for a card, optionally filtered by archetype colors.
 * This is the key function - it returns IWD for YOUR deck's colors.
 */
export function getWinRateData(
  cardName: string,
  archetypeColors?: string[]
): ArchetypeFilteredData | null {
  const data = WINRATE_DATA.cards[cardName];
  if (!data || data.gameCount < 500) return null;

  // If archetype colors provided, get color-filtered IWD
  let archetypeIWD = data.iwd;
  let archetypeColorKey = '';

  if (archetypeColors && archetypeColors.length > 0) {
    const colorKey = archetypeColors.sort().join('');
    if (data.iwdByColor[colorKey] !== undefined) {
      archetypeIWD = data.iwdByColor[colorKey];
      archetypeColorKey = colorKey;
    }
  }

  return {
    ...data,
    archetypeIWD,
    archetypeColors: archetypeColorKey,
  };
}

/**
 * Classify card as trap, steal, or aligned based on IWD (not raw GIH WR).
 *
 * - TRAP: High pick priority (low avgPick) + low IWD (< 1%)
 * - STEAL: Low pick priority (high avgPick) + high IWD (> 3%)
 * - ALIGNED: ELO and IWD agree
 */
export type DivergenceType = 'trap' | 'steal' | 'aligned' | 'unknown';

export function getDivergence(
  cardName: string,
  eloPercentile: number,  // 0-100, from CubeCobra ELO
  archetypeColors?: string[]
): { type: DivergenceType; confidence: 'high' | 'interesting' | 'low'; reason: string } {
  const data = getWinRateData(cardName, archetypeColors);

  if (!data || data.gameCount < 500) {
    return {
      type: 'unknown',
      confidence: 'low',
      reason: 'No win rate data available, using ELO only'
    };
  }

  const iwd = data.archetypeIWD ?? data.iwd ?? 0;
  const avgPick = data.avgPick ?? 15;

  // High ELO (top 25%) but low IWD (< 1%) = TRAP
  if (eloPercentile > 75 && iwd < 0.01) {
    return {
      type: 'trap',
      confidence: 'interesting',
      reason: `High pick priority but ${(iwd * 100).toFixed(1)}% IWD - card doesn't improve decks that play it`,
    };
  }

  // Low ELO (bottom 50%) but high IWD (> 3%) = STEAL
  if (eloPercentile < 50 && iwd > 0.03) {
    return {
      type: 'steal',
      confidence: 'interesting',
      reason: `Underdrafted but ${(iwd * 100).toFixed(1)}% IWD - card significantly improves decks`,
    };
  }

  // Signals agree = high confidence
  return {
    type: 'aligned',
    confidence: 'high',
    reason: 'ELO and win rate data agree',
  };
}
```

---

## Phase 3: UI Integration

### 3.1 Pack Card Badges

Show both ELO and WR on pack cards:

```
┌─────────────────────────────────┐
│  Time Walk                      │
│  ┌─────┐  ┌─────┐  ┌─────┐     │
│  │ +95 │  │ 65% │  │ +15%│     │
│  │ ELO │  │ GIH │  │ IWD │     │
│  └─────┘  └─────┘  └─────┘     │
│  ✓ Signals agree (high conf)   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Vampiric Tutor                 │
│  ┌─────┐  ┌─────┐  ┌─────┐     │
│  │ +71 │  │ 51% │  │ +1% │     │
│  │ ELO │  │ GIH │  │ IWD │     │
│  └─────┘  └─────┘  └─────┘     │
│  ⚠️ Trap: High ELO, low IWD    │
└─────────────────────────────────┘
```

### 3.2 Sort Toggle

```
Sort by: [ELO ▼] [Win Rate] [IWD]
```

### 3.3 Confidence Indicator

Three states:
- **✓ High Confidence**: ELO and IWD agree
- **⚡ Interesting**: ELO and IWD diverge (trap or steal)
- **? Low Confidence**: No win rate data, falling back to ELO

### 3.4 Arena Bo1 Caveat

For control-oriented cards/archetypes, show:

```
ℹ️ Arena data (Bo1) - control archetypes may be underrated
```

### 3.5 Data Freshness

```
17lands data: 316,589 games • Last updated: May 17, 2026
```

---

## Phase 4: Coach Integration

### 4.1 Archetype-Filtered Recommendations

When user is leaning/committed to an archetype, use color-filtered IWD:

```typescript
// In the coach recommendation logic
const userColors = ['U', 'B']; // Detected from their picks
const cardData = getWinRateData(cardName, userColors);

// Use cardData.archetypeIWD instead of global IWD
// This fixes "coach recommended Doomsday in non-black deck"
```

### 4.2 Divergence Explanations

When coach recommends a card, explain divergences:

```
Recommended: Inferno Titan

📊 Analysis:
• ELO: +65 (top 15%)
• Win Rate: 58% in Gruul decks (your colors)
• IWD: +4.2% (excellent - card carries games)
• Signals: ✓ Aligned (high confidence)

Alternative: Phyrexian Metamorph
• ELO: +58 (top 25%)
• Win Rate: 53% globally, but 48% in Gruul (not its home)
• IWD: +1.1% in Gruul
• Signals: ⚠️ ELO/WR diverge for your archetype
```

---

## Data Caveats to Surface in UI

1. **Arena ≠ Paper**: "Win rates from Arena Powered Cube (Oct 2025 - present)"
2. **Bo1 Bias**: "Best-of-1 format favors aggressive strategies"
3. **Sample Size**: Show game count, suppress data below 500 games
4. **Missing Cards**: "No Arena data - using ELO only" indicator
5. **Data Freshness**: Show last fetch date and total game count

---

## Implementation Order

| Phase | Days | Deliverable |
|-------|------|-------------|
| 0 | 0.5 | Name normalizer, missing cards report |
| 1 | 0.5 | Fetch script, JSON data file |
| 2 | 1 | Win rate service with archetype filtering |
| 3 | 1 | UI badges, sort toggle, confidence indicators |
| 4 | 1 | Coach integration with divergence explanations |

**Total: ~4 days**

---

## Success Metrics

1. **Coverage**: 85%+ of cube cards have win rate data after normalization
2. **Divergence Detection**: Correctly flags known traps (e.g., Vampiric Tutor)
3. **Archetype Accuracy**: Coach no longer recommends off-color cards
4. **User Value**: Toggle between ELO/WR sorting reveals different orderings

---

## API Reference

**Endpoint**: `https://www.17lands.com/card_ratings/data`

**Parameters**:
- `expansion`: `Cube - Powered`
- `format`: `PremierDraft`
- `colors`: `WU`, `UBR`, etc. (for color-filtered data)

**Key Response Fields**:
- `ever_drawn_win_rate`: GIH WR (win rate when drawn)
- `drawn_improvement_win_rate`: IWD (the gold metric)
- `avg_pick`: Average pick position (compare to ELO)
- `ever_drawn_game_count`: Sample size
- `play_rate`: How often card makes the deck

**Rate Limiting**: Unknown, but requests timeout if too frequent. Cache locally.
