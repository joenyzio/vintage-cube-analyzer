/**
 * Contextual Card Rating Engine
 *
 * The core rating system that computes context-aware card scores.
 * Uses multiplicative archetype boost with continuous commitment scaling.
 *
 * Key formula:
 *   contextualScore = baseElo * (1 + archetypeFit * commitmentMultiplier) + secondaryAdjustments
 */

import type { CubeCard } from '../../types/card';
import type { CardRating, DraftContext, DeckStats } from './types';
import { getEloData, getPercentile } from '../eloHelpers';
import { calculateCardAffinity } from './archetypeAffinity';
import {
  AFFINITY_BOUNDS,
  SECONDARY_ADJUSTMENT_SCALE,
  MAX_SECONDARY_ADJUSTMENT,
  COLOR_FIT_ADJUSTMENTS,
  CURVE_FIT_ADJUSTMENTS,
  GRADING_THRESHOLDS,
  ELO_RANGE,
  getCommitmentMultiplier,
  getColorScale,
  clamp,
} from './tuning';

// ============================================
// Main Rating Function
// ============================================

/**
 * Rate a single card in the current draft context.
 */
export function rateCard(
  card: CubeCard,
  context: DraftContext,
  pack?: CubeCard[]
): CardRating {
  const eloData = getEloData(card.name);
  const baseElo = eloData?.elo ?? ELO_RANGE.median;

  const reasons: string[] = [];

  // 1. Calculate archetype affinity
  const { totalAffinity, breakdown } = calculateCardAffinity(card, context.archetypeWeights);

  // 2. Get commitment multiplier (how much to amplify archetype fit)
  const maxCommitment = Math.max(0, ...context.archetypeWeights.values());
  const commitmentMultiplier = getCommitmentMultiplier(maxCommitment);

  // 3. Calculate archetype boost (multiplicative)
  const archetypeFit = clamp(totalAffinity, AFFINITY_BOUNDS.minWeight, AFFINITY_BOUNDS.maxWeight);
  const archetypeBoost = 1 + (archetypeFit * commitmentMultiplier);
  // Allow anti-synergy to reduce scores (minimum 0.5x multiplier)
  const archetypeAdjustedElo = baseElo * clamp(archetypeBoost, 0.5, AFFINITY_BOUNDS.maxMultiplier);

  if (archetypeFit > 0.1 && commitmentMultiplier > 0) {
    const topArchetype = breakdown.sort((a, b) => b.contribution - a.contribution)[0];
    if (topArchetype) {
      reasons.push(`×${archetypeBoost.toFixed(2)} ${topArchetype.archetypeId} fit`);
    }
  }

  // 4. Calculate secondary adjustments (additive)
  let secondaryAdjustment = 0;

  // 4a. Color fit
  const colorFit = calculateColorFit(card, context);
  secondaryAdjustment += colorFit * SECONDARY_ADJUSTMENT_SCALE.colorFit;
  if (Math.abs(colorFit) >= 20) {
    reasons.push(colorFit > 0 ? `+${colorFit} on-color` : `${colorFit} off-color`);
  }

  // 4b. Curve fit
  const curveFit = calculateCurveFit(card, context);
  secondaryAdjustment += curveFit * SECONDARY_ADJUSTMENT_SCALE.curveFit;
  if (Math.abs(curveFit) >= 15) {
    reasons.push(curveFit > 0 ? `+${curveFit} curve need` : `${curveFit} curve glut`);
  }

  // 4c. Type balance
  const typeBalance = calculateTypeBalance(card, context);
  secondaryAdjustment += typeBalance * SECONDARY_ADJUSTMENT_SCALE.typeBalance;
  if (typeBalance >= 15) {
    reasons.push(`+${typeBalance} fills role`);
  }

  // Clamp secondary adjustments
  secondaryAdjustment = clamp(secondaryAdjustment, -MAX_SECONDARY_ADJUSTMENT, MAX_SECONDARY_ADJUSTMENT);

  // 5. Final contextual score
  const contextualScore = archetypeAdjustedElo + secondaryAdjustment;

  // 6. Calculate grade
  const { grade, gradeReason } = calculateGrade(contextualScore, context, pack);

  // 7. Calculate contextual percentile
  const percentile = calculateContextualPercentile(contextualScore, pack);

  // 8. Determine if card is "on plan"
  const isOnPlan = archetypeFit > 0.2 || (context.dominantArchetype === null);

  return {
    cardName: card.name,
    baseElo,
    contextualScore,
    archetypeBoost,
    archetypeFit,
    colorFit,
    curveFit,
    grade,
    gradeReason,
    reasons,
    percentile,
    isOnPlan,
  };
}

/**
 * Rate all cards in a pack.
 */
export function rateAllCards(
  cards: CubeCard[],
  context: DraftContext
): CardRating[] {
  return cards.map(card => rateCard(card, context, cards));
}

// ============================================
// Secondary Adjustment Calculations
// ============================================

/**
 * Calculate color fit adjustment.
 */
function calculateColorFit(card: CubeCard, context: DraftContext): number {
  const cardColors = card.color_identity || [];
  const colorScale = getColorScale(context.totalPicks);

  // Colorless cards are always slightly good
  if (cardColors.length === 0) {
    return COLOR_FIT_ADJUSTMENTS.colorless;
  }

  // Check if card is on-color
  const isOnColor = cardColors.every((c: string) => context.mainColors.includes(c));
  if (isOnColor) {
    return COLOR_FIT_ADJUSTMENTS.onColor * colorScale;
  }

  // Check if card touches existing colors
  const touchesColor = cardColors.some((c: string) => context.colorCounts[c] > 0);
  if (touchesColor) {
    return COLOR_FIT_ADJUSTMENTS.touchedColor * colorScale;
  }

  // Off-color - penalty based on card quality
  const percentile = getPercentile(card.name);
  if (percentile >= 95) {
    return COLOR_FIT_ADJUSTMENTS.offColorPremium * colorScale;
  } else if (percentile >= 85) {
    return COLOR_FIT_ADJUSTMENTS.offColorGood * colorScale;
  } else {
    return COLOR_FIT_ADJUSTMENTS.offColorBad * colorScale;
  }
}

/**
 * Calculate curve fit adjustment.
 */
function calculateCurveFit(card: CubeCard, context: DraftContext): number {
  const cmc = Math.min(7, Math.floor(card.cmc ?? 0));
  const currentAtCmc = context.curveDistribution[cmc] || 0;

  // Check for curve glut
  if (currentAtCmc >= 4 && cmc <= 3) {
    return CURVE_FIT_ADJUSTMENTS.curveGlut;
  }

  // Check for curve needs (simplified - could be archetype-aware)
  const isCreature = card.type_line?.toLowerCase().includes('creature');
  if (isCreature) {
    // Basic curve targets
    const targets = [3, 5, 4, 3, 2, 1, 1, 1]; // CMC 0-7+
    const target = targets[cmc] || 1;

    if (currentAtCmc < target - 2) {
      return CURVE_FIT_ADJUSTMENTS.highPriorityNeed;
    } else if (currentAtCmc < target) {
      return CURVE_FIT_ADJUSTMENTS.mediumPriorityNeed;
    }
  }

  return 0;
}

/**
 * Calculate type balance adjustment.
 */
function calculateTypeBalance(card: CubeCard, context: DraftContext): number {
  if (!context.deckStats) return 0;

  const typeLine = card.type_line?.toLowerCase() || '';
  const oracleText = card.oracle_text?.toLowerCase() || '';

  let adjustment = 0;

  // Need creatures?
  if (typeLine.includes('creature') && context.deckStats.creatures < 8) {
    adjustment += 25;
  }

  // Need removal?
  const isRemoval = oracleText.includes('destroy') || oracleText.includes('exile') ||
                    oracleText.includes('damage') && oracleText.includes('target');
  if (isRemoval && context.deckStats.removal < 3) {
    adjustment += 30;
  }

  // Need card draw?
  const isCardDraw = oracleText.includes('draw') && !typeLine.includes('creature');
  if (isCardDraw && context.deckStats.cardDraw < 2) {
    adjustment += 20;
  }

  return adjustment;
}

// ============================================
// Grading
// ============================================

/**
 * Calculate letter grade for a card.
 */
function calculateGrade(
  contextualScore: number,
  _context: DraftContext,
  pack?: CubeCard[]
): { grade: string; gradeReason: string } {
  // Calculate percentile within pack (if available)
  const percentile = pack
    ? calculateContextualPercentile(contextualScore, pack)
    : scoreToPercentile(contextualScore);

  // Map percentile to grade
  for (const [grade, threshold] of Object.entries(GRADING_THRESHOLDS)) {
    if (percentile >= threshold) {
      return {
        grade,
        gradeReason: `Top ${Math.round((1 - threshold) * 100)}% in context`,
      };
    }
  }

  return { grade: 'F', gradeReason: 'Bottom of pack' };
}

/**
 * Calculate percentile within current pack.
 */
function calculateContextualPercentile(
  contextualScore: number,
  pack?: CubeCard[]
): number {
  if (!pack || pack.length === 0) {
    return scoreToPercentile(contextualScore);
  }

  // Simple ranking within pack
  // Note: This is a simplified version - full implementation would rate all cards
  return scoreToPercentile(contextualScore);
}

/**
 * Convert raw score to approximate percentile.
 */
function scoreToPercentile(score: number): number {
  // Normalize to 0-1 based on expected score range
  // With archetype boost, scores can go up to ~5000+
  const normalized = (score - ELO_RANGE.min) / (ELO_RANGE.max * 2 - ELO_RANGE.min);
  return clamp(normalized, 0, 1);
}

// ============================================
// Context Helpers
// ============================================

/**
 * Create initial draft context.
 */
export function createInitialContext(): DraftContext {
  return {
    picks: [],
    packNumber: 1,
    pickNumber: 1,
    totalPicks: 0,
    archetypeWeights: new Map(),
    dominantArchetype: null,
    colorCounts: {},
    mainColors: [],
    curveDistribution: [0, 0, 0, 0, 0, 0, 0, 0],
    deckStats: null,
  };
}

/**
 * Update context after a pick.
 */
export function updateContext(
  context: DraftContext,
  pickedCard: CubeCard,
  newArchetypeWeights: Map<string, number>
): DraftContext {
  const newPicks = [...context.picks, pickedCard];

  // Update color counts
  const newColorCounts = { ...context.colorCounts };
  for (const color of pickedCard.color_identity || []) {
    newColorCounts[color] = (newColorCounts[color] || 0) + 1;
  }

  // Update main colors (3+ cards)
  const newMainColors = Object.entries(newColorCounts)
    .filter(([_, count]) => count >= 3)
    .map(([color]) => color);

  // Update curve
  const newCurve = [...context.curveDistribution];
  const cmc = Math.min(7, Math.floor(pickedCard.cmc ?? 0));
  newCurve[cmc]++;

  // Determine dominant archetype
  let dominantArchetype: string | null = null;
  let maxWeight = 0;
  for (const [archId, weight] of newArchetypeWeights) {
    if (weight > maxWeight && weight >= 0.4) {
      maxWeight = weight;
      dominantArchetype = archId;
    }
  }

  // Calculate deck stats
  const deckStats = calculateDeckStats(newPicks);

  return {
    picks: newPicks,
    packNumber: context.packNumber,
    pickNumber: context.pickNumber + 1,
    totalPicks: newPicks.length,
    archetypeWeights: newArchetypeWeights,
    dominantArchetype,
    colorCounts: newColorCounts,
    mainColors: newMainColors,
    curveDistribution: newCurve,
    deckStats,
  };
}

/**
 * Calculate deck stats from picks.
 */
function calculateDeckStats(picks: CubeCard[]): DeckStats {
  let creatures = 0;
  let spells = 0;
  let lands = 0;
  let artifacts = 0;
  let removal = 0;
  let cardDraw = 0;
  let totalCmc = 0;
  let nonLandCount = 0;

  for (const card of picks) {
    const typeLine = card.type_line?.toLowerCase() || '';
    const oracleText = card.oracle_text?.toLowerCase() || '';

    if (typeLine.includes('land')) {
      lands++;
    } else {
      nonLandCount++;
      totalCmc += card.cmc ?? 0;

      if (typeLine.includes('creature')) {
        creatures++;
      } else {
        spells++;
      }

      if (typeLine.includes('artifact')) {
        artifacts++;
      }

      if (oracleText.includes('destroy') || oracleText.includes('exile target') ||
          (oracleText.includes('damage') && oracleText.includes('target'))) {
        removal++;
      }

      if (oracleText.includes('draw')) {
        cardDraw++;
      }
    }
  }

  return {
    creatures,
    spells,
    lands,
    artifacts,
    removal,
    cardDraw,
    avgCmc: nonLandCount > 0 ? totalCmc / nonLandCount : 0,
    manaHealth: 70, // Simplified - could calculate properly
  };
}
