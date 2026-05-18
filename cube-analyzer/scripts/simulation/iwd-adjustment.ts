/**
 * IWD Adjustment Module
 *
 * Applies 17lands win rate signals to bot pick decisions.
 * The bot uses CardSignal just like a human would with the coaching tool.
 */

import type { CardRating } from '../../src/services/cardRating/types';
import { getCardSignal } from '../../src/services/simulationInsights';

// IWD adjustment values (same as getRecommendedPick in DraftSimulator.tsx)
const TRAP_PENALTY = -100;
const STEAL_BONUS = 50;

/**
 * Apply IWD adjustments to card ratings.
 *
 * Logic:
 * - Aligned cards: no adjustment (ELO is trusted)
 * - Trap cards: -100 penalty despite high ELO
 * - Steal cards: +50 bonus despite lower ELO
 * - Unknown cards: no adjustment (ELO + affinity only)
 *
 * @param ratings - Original card ratings from rateAllCards()
 * @param currentColors - Drafter's current colors (for color-filtered IWD)
 */
export function applyIwdAdjustments(
  ratings: CardRating[],
  currentColors: string[]
): CardRating[] {
  return ratings.map(rating => {
    const signal = getCardSignal(rating.cardName, currentColors);

    let adjustment = 0;
    let iwdReason = '';

    if (signal.divergence) {
      if (signal.divergence.direction === 'trap') {
        adjustment = TRAP_PENALTY;
        iwdReason = `Trap (-100): High pick priority but weak performance`;
      } else if (signal.divergence.direction === 'steal') {
        adjustment = STEAL_BONUS;
        iwdReason = `Steal (+50): Undervalued but strong performance`;
      }
    }
    // Aligned and unknown cards get no adjustment - ELO + affinity stands

    return {
      ...rating,
      contextualScore: rating.contextualScore + adjustment,
      // Store IWD info for debugging/logging
      iwdAdjustment: adjustment,
      iwdReason,
      iwdSignal: signal.confidence,
    } as CardRating & { iwdAdjustment: number; iwdReason: string; iwdSignal: string };
  });
}

/**
 * Get dominant colors from color counts.
 * Returns colors with 2+ cards (same logic as DraftSimulator).
 */
export function getCurrentColors(colorCounts: Record<string, number>): string[] {
  return Object.entries(colorCounts)
    .filter(([_, count]) => count >= 2)
    .map(([color]) => color);
}
