/**
 * Card Rating Service - Public API
 *
 * The main entry point for the archetype-aware card rating system.
 * Import from this file rather than internal modules.
 *
 * Usage:
 *   import { rateCard, createInitialContext, updateContext } from '@/services/cardRating';
 */

// Core rating functions
export {
  rateCard,
  rateAllCards,
  createInitialContext,
  updateContext,
} from './contextualRating';

// Archetype definitions and helpers
export {
  VINTAGE_CUBE_ARCHETYPES,
  getArchetype,
  getArchetypeIds,
  isKeyCard,
  isSignalCard,
} from './archetypes';

// Affinity calculations
export {
  calculateCardAffinity,
  updateArchetypeWeights,
  getCardAffinities,
  EXPLICIT_AFFINITIES,
} from './archetypeAffinity';

// Tuning parameters (for calibration)
export {
  COMMITMENT_THRESHOLDS,
  AFFINITY_BOUNDS,
  ARCHETYPE_SIGNAL_WEIGHTS,
  SECONDARY_ADJUSTMENT_SCALE,
  MAX_SECONDARY_ADJUSTMENT,
  COLOR_FIT_ADJUSTMENTS,
  CURVE_FIT_ADJUSTMENTS,
  GRADING_THRESHOLDS,
  ELO_RANGE,
  DRAFT_PHASES,
  getCommitmentLevel,
  getCommitmentMultiplier,
  getColorScale,
  clamp,
} from './tuning';

// Types
export type {
  ArchetypeDefinition,
  CardAffinity,
  AffinityRole,
  AffinityMap,
  DraftContext,
  DeckStats,
  CardRating,
  CommitmentLevel,
  CommitmentThreshold,
  ValidationScenario,
  CardRatingService,
} from './types';
