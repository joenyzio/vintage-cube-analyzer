# Signal Architecture: ELO + IWD Integration

This document describes how the draft coach combines CubeCobra ELO data with 17lands win rate data to surface actionable insights.

## Why Two Signals?

**ELO (CubeCobra)** answers: *"What do drafters believe is good?"*
- Derived from pick priority in CubeCobra drafts
- Reflects community consensus on card power level
- Updated frequently as meta evolves
- Available for all cards in the cube

**IWD (17lands)** answers: *"What actually wins games?"*
- Improvement When Drawn: the win rate delta when a card is drawn
- Isolates a card's actual contribution to winning
- Requires significant sample size (500+ games)
- Only available for cards in Arena Powered Cube

Both signals are load-bearing. ELO captures drafters' collective wisdom about pick priority and archetype fit. IWD captures empirical performance data that can reveal when that wisdom is wrong.

## Confidence States

The system classifies each card into one of three confidence states:

### Aligned
ELO and IWD agree on the card's power level.
- High ELO + high IWD = confirmed bomb
- Low ELO + low IWD = confirmed filler
- **UI treatment**: Quiet, muted display (gray, small text)

### Divergent
ELO and IWD disagree significantly.

**Trap** (high ELO, low IWD):
- Thresholds: ELO >= 75th percentile AND IWD < 1%
- Card is picked earlier than it deserves
- Example: Lightning Bolt in RG decks (+high ELO, -0.5% IWD)
- **UI treatment**: Red badge, warning icon, prominent

**Steal** (low ELO, high IWD):
- Thresholds: ELO < 50th percentile AND IWD > 3%
- Card is available later than it should be
- Example: Undervalued role-players that overperform
- **UI treatment**: Green badge, gem icon, prominent

### Unknown
Insufficient data to determine confidence.
- Card not in Arena Powered Cube
- Sample size below thresholds
- **UI treatment**: "ELO only" indicator

## Color-Filtered IWD

IWD varies significantly by deck colors. Lightning Bolt has:
- +4.6% IWD in UR (aligned: tempo + burn synergy)
- -0.5% IWD in RG (trap: less synergy with stompy plan)

The system uses a fallback chain to find the most relevant IWD:

1. **3-color exact match**: Try user's current colors (e.g., "URG")
2. **2-color pairs**: Try all two-color subsets (e.g., "UR", "UG", "RG")
3. **Global IWD**: Use overall IWD across all decks
4. **ELO only**: No IWD data available

## Sample Size Thresholds

These thresholds exist to ensure statistical reliability:

| Data Type | Minimum Games | Rationale |
|-----------|---------------|-----------|
| Global IWD | 500 | Enough samples for stable average |
| Color-filtered IWD | 100 | Lower bar for archetype-specific data |

**Do not lower these thresholds.** Smaller samples produce noisy signals that can mislead drafters.

## Integration Points

### Recommendation Logic (`getRecommendedPick`)
- Applies IWD adjustment to card scores
- Trap cards: -100 penalty
- Steal cards: +50 bonus
- Ensures traps are deprioritized even if ELO is high

### Coach Explanation (`coachExplanation.mainReason`)
- Prioritizes steal signals in reasoning
- "Undervalued gem - high win rate" for steals
- Falls back to ELO-based reasoning when aligned

### Visual Indicators
- **Grade badge** (top-right): ELO-based, always prominent
- **Divergence badge** (bottom): Only when trap/steal detected
- **IWD number** (detail panel): Always visible, quiet when aligned

## File Locations

- Signal types and functions: `src/services/simulationInsights.ts`
- Card overlays: `src/components/DraftSimulator/DraftPackCard.tsx`
- Detail panel: `src/components/DraftSimulator/CardDetailPanel.tsx`
- Coach integration: `src/components/DraftSimulator.tsx` (getRecommendedPick)
