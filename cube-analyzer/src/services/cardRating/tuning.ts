/**
 * Card Rating Tuning Parameters
 *
 * All calibratable constants in one place.
 * Adjust these during calibration to tune the rating system.
 */

import type { CommitmentThreshold } from './types';

// ============================================
// Commitment Thresholds
// ============================================

/**
 * How archetype commitment translates to multiplier strength.
 *
 * The multiplier amplifies archetype affinity:
 *   contextualScore = baseElo * (1 + archetypeFit * multiplier) + secondary
 *
 * Higher multiplier = archetype fit matters more relative to base ELO.
 */
export const COMMITMENT_THRESHOLDS: Record<string, CommitmentThreshold> = {
  locked: { threshold: 0.8, multiplier: 2.0 },     // 8+ archetype signals
  committed: { threshold: 0.6, multiplier: 1.5 },  // 6-7 signals
  leaning: { threshold: 0.4, multiplier: 0.75 },   // 4-5 signals
  exploring: { threshold: 0.2, multiplier: 0.25 }, // 2-3 signals
  open: { threshold: 0, multiplier: 0 },           // <2 signals, trust base ELO
};

// ============================================
// Affinity Bounds
// ============================================

/**
 * Bounds for card affinity weights.
 */
export const AFFINITY_BOUNDS = {
  minWeight: -1.0,      // Maximum anti-synergy (hurts archetype)
  maxWeight: 1.0,       // Perfect fit
  maxMultiplier: 3.0,   // Cap on total archetype multiplier (safety)
};

// ============================================
// Archetype Detection
// ============================================

/**
 * How much weight different card types add to archetype detection.
 */
export const ARCHETYPE_SIGNAL_WEIGHTS = {
  keyCard: 0.25,        // Key cards are strong signals
  signalCard: 0.12,     // Signal cards are medium signals
  affinityCard: 0.08,   // Cards with positive affinity (from data)
};

/**
 * Minimum weight to consider an archetype "dominant"
 */
export const DOMINANT_ARCHETYPE_THRESHOLD = 0.4;

// ============================================
// Secondary Adjustment Scales
// ============================================

/**
 * Multipliers on secondary (additive) adjustments.
 * Set to 0 to disable, >1 to amplify, <1 to diminish.
 */
export const SECONDARY_ADJUSTMENT_SCALE = {
  colorFit: 1.0,       // How much color fit matters
  curveFit: 0.8,       // How much mana curve matters
  typeBalance: 0.6,    // How much creature/spell balance matters
  roleNeeds: 0.7,      // How much missing roles (removal, etc.) matters
};

/**
 * Maximum additive adjustment from secondary factors.
 * Prevents secondary adjustments from overwhelming the system.
 */
export const MAX_SECONDARY_ADJUSTMENT = 150;

// ============================================
// Color Fit Parameters (MULTIPLICATIVE)
// ============================================

/**
 * Color fit MULTIPLIERS (applied to base ELO).
 *
 * TUNED v3: Multiplicative penalties scale with card power.
 * A 30% penalty on a 2000 ELO card = 600 points lost.
 * A 30% penalty on a 1400 ELO card = 420 points lost.
 *
 * Key insight: The penalty for adding a 3rd color should be based on
 * how many colors you already have, not how many the card adds.
 */
export const COLOR_MULTIPLIERS = {
  colorless: 1.03,            // Slight bonus for colorless (artifacts are flexible)
  onColor: 1.10,              // Moderate bonus for on-color
  touchedColor: 1.02,         // Slight bonus for extending colors you've touched

  // Adding a NEW color when you have N colors:
  // TUNED v7: Final adjustment for 25-30% 2-color target
  addingSecondColor: 0.92,    // Going from 1→2 colors - mild penalty (expected)
  addingThirdColor: 0.55,     // Going from 2→3 colors - moderate-strong penalty (45% reduction)
  addingFourthPlusColor: 0.30, // Going from 3+→more - harsh penalty (70% reduction)
};

/**
 * Premium card adjustment: top cards get lighter penalties.
 * Added to multiplier for off-color picks.
 */
export const PREMIUM_MULTIPLIER_BONUS = {
  top5Percent: 0.10,          // Top 5% cards get +10% on their multiplier
  top15Percent: 0.05,         // 85-95% cards get +5% bonus
};

/**
 * How color penalties scale with draft progress.
 * Early picks allow some exploration, penalties ramp up.
 */
export const COLOR_SCALE = {
  base: 0.70,          // Start at 70% penalty strength
  perPick: 0.06,       // Additional scale per pick
  max: 1.0,            // Maximum scale (reached at pick 5)
};

// Legacy additive adjustments (kept for curve fit display)
export const COLOR_FIT_ADJUSTMENTS = {
  colorless: 20,
  onColor: 100,
  touchedColor: 5,
  offColorPremium: -60,
  offColorGood: -150,
  offColorBad: -250,
};

// ============================================
// Curve Fit Parameters
// ============================================

/**
 * Mana curve adjustments (additive, in ELO points).
 */
export const CURVE_FIT_ADJUSTMENTS = {
  highPriorityNeed: 40,       // Deck desperately needs this CMC
  mediumPriorityNeed: 20,     // Deck could use this CMC
  curveGlut: -25,             // Already have 4+ cards at this CMC
};

/**
 * Archetype-specific curve modifiers.
 */
export const ARCHETYPE_CURVE_MODIFIERS = {
  aggro: {
    lowCmcBonus: 20,          // CMC <= 2 gets bonus
    highCmcPenalty: -40,      // CMC >= 5 gets penalty
  },
  control: {
    lowCmcPenalty: 0,         // Control doesn't mind low CMC
    finisherBonus: 15,        // High CMC finishers are good
  },
  ramp: {
    highCmcBonus: 25,         // Big stuff is the point
  },
};

// ============================================
// Grading Thresholds
// ============================================

/**
 * Percentile thresholds for letter grades.
 * Based on contextual score percentile within the current pack.
 */
export const GRADING_THRESHOLDS = {
  'A+': 0.95,
  'A': 0.88,
  'A-': 0.82,
  'B+': 0.75,
  'B': 0.65,
  'B-': 0.55,
  'C+': 0.45,
  'C': 0.35,
  'C-': 0.25,
  'D': 0.15,
  'F': 0,
};

// ============================================
// ELO Range (from CubeCobra data)
// ============================================

export const ELO_RANGE = {
  min: 1240,
  max: 2377,
  spread: 1137,        // max - min
  median: 1650,        // Approximate median
};

// ============================================
// Draft Phase Thresholds
// ============================================

/**
 * Draft phases based on pick number.
 */
export const DRAFT_PHASES = {
  power: { start: 1, end: 3 },        // Take best cards
  direction: { start: 4, end: 8 },    // Find archetype
  building: { start: 9, end: 35 },    // Build the deck
  filling: { start: 36, end: 45 },    // Fill remaining slots
};

// ============================================
// Affinity Role Bonuses
// ============================================

/**
 * Extra weight for cards that fill specific roles in an archetype.
 * Applied on top of base affinity weight.
 */
export const ROLE_WEIGHT_MULTIPLIERS = {
  enabler: 1.2,        // Enablers (Entomb) are slightly more valuable
  payoff: 1.1,         // Payoffs (Griselbrand) are valuable
  support: 1.0,        // Support cards at base weight
  utility: 0.9,        // Utility cards slightly less important
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get commitment level from archetype weight.
 */
export function getCommitmentLevel(weight: number): string {
  if (weight >= COMMITMENT_THRESHOLDS.locked.threshold) return 'locked';
  if (weight >= COMMITMENT_THRESHOLDS.committed.threshold) return 'committed';
  if (weight >= COMMITMENT_THRESHOLDS.leaning.threshold) return 'leaning';
  if (weight >= COMMITMENT_THRESHOLDS.exploring.threshold) return 'exploring';
  return 'open';
}

/**
 * Get multiplier for a given archetype weight.
 */
export function getCommitmentMultiplier(weight: number): number {
  const level = getCommitmentLevel(weight);
  return COMMITMENT_THRESHOLDS[level].multiplier;
}

/**
 * Calculate color scale based on pick number.
 */
export function getColorScale(pickNumber: number): number {
  return Math.min(
    COLOR_SCALE.max,
    COLOR_SCALE.base + (pickNumber * COLOR_SCALE.perPick)
  );
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
