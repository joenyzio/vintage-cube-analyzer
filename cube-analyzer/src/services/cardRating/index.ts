/**
 * Card Rating Service - Public API
 *
 * Direct TypeScript port of madrury's mtg-draftbot algorithm.
 * https://github.com/madrury/mtg-draftbot
 *
 * The main entry point for the archetype-aware card rating system.
 * Import from this file rather than internal modules.
 *
 * Usage:
 *   import { rateCard, createInitialContext, updateContext } from '@/services/cardRating';
 */

import type { CubeCard } from '../../types/card';
import type { CardRating, DraftContext } from './types';
import {
  rateCard as madruryRateCard,
  rateAllCards as madruryRateAllCards,
  createInitialContext as madruryCreateInitialContext,
  updateContext as madruryUpdateContext,
  updatePreferences,
  toLegacyContext,
  toLegacyRating,
  getDominantArchetype,
  getCardArchetypeWeights,
  type MadruryContext,
  type MadruryRating,
} from './madruryEngine';

// ============================================
// Core API (backwards-compatible, STATELESS)
// ============================================

/**
 * Rate a single card in the current draft context.
 * Uses madrury's dot-product algorithm internally.
 */
export function rateCard(
  card: CubeCard,
  context: DraftContext,
  pack?: CubeCard[]
): CardRating {
  // Always convert from passed context (stateless)
  const madruryCtx = convertToMadruryContext(context);
  const madruryRating = madruryRateCard(card, madruryCtx, pack);
  return toLegacyRating(madruryRating);
}

/**
 * Rate all cards in a pack.
 * Returns sorted by preference (best first).
 */
export function rateAllCards(
  cards: CubeCard[],
  context: DraftContext
): CardRating[] {
  const madruryCtx = convertToMadruryContext(context);
  const madruryRatings = madruryRateAllCards(cards, madruryCtx);
  return madruryRatings.map(r => toLegacyRating(r));
}

/**
 * Create initial draft context.
 */
export function createInitialContext(): DraftContext {
  const madruryCtx = madruryCreateInitialContext();
  return toLegacyContext(madruryCtx);
}

/**
 * Update context after picking a card.
 * This is where madrury's additive preference update happens.
 */
export function updateContext(
  context: DraftContext,
  pickedCard: CubeCard,
  _newArchetypeWeights?: Map<string, number>  // Ignored - we compute internally
): DraftContext {
  // Convert to madrury format, update, convert back (stateless)
  const madruryCtx = convertToMadruryContext(context);
  const updated = madruryUpdateContext(madruryCtx, pickedCard);
  return toLegacyContext(updated);
}

/**
 * Update archetype weights after a pick.
 * In madrury's system, this is automatic (preferences += card_weights).
 * Kept for API compatibility.
 */
export function updateArchetypeWeights(
  currentWeights: Map<string, number>,
  pickedCard: CubeCard
): Map<string, number> {
  // Simulate the update
  const weights = getCardArchetypeWeights(pickedCard);
  const newWeights = new Map(currentWeights);

  const archetypeIds = ['reanimator', 'storm', 'aggro', 'control', 'ramp', 'artifacts', 'sneak', 'midrange', 'tempo', 'oath'];
  for (let i = 0; i < archetypeIds.length; i++) {
    const current = newWeights.get(archetypeIds[i]) || 0;
    // Convert madrury additive update to normalized 0-1 range
    const newValue = Math.min(1, current + (weights[i] * 0.15));
    newWeights.set(archetypeIds[i], newValue);
  }

  return newWeights;
}

// ============================================
// Helper: Convert legacy context to madrury format
// ============================================

function convertToMadruryContext(context: DraftContext): MadruryContext {
  // Convert archetype weights map back to preferences array
  const archetypeIds = ['reanimator', 'storm', 'aggro', 'control', 'ramp', 'artifacts', 'sneak', 'midrange', 'tempo', 'oath'];
  const preferences = archetypeIds.map(id => {
    const weight = context.archetypeWeights.get(id) || 0;
    // Convert from 0-1 range to additive range (1 + weight * 3)
    return 1 + (weight * 3);
  });

  return {
    picks: context.picks,
    preferences,
    packNumber: context.packNumber,
    pickNumber: context.pickNumber,
    colorCounts: context.colorCounts,
    mainColors: context.mainColors,
    deckStats: context.deckStats,
  };
}

// ============================================
// New Madrury-specific exports
// ============================================

// Import pack analysis
import { analyzePackComposition, type PackAnalysis } from './madruryEngine';

export {
  // New engine functions
  madruryRateCard,
  madruryRateAllCards,
  madruryCreateInitialContext,
  madruryUpdateContext,
  getDominantArchetype,
  getCardArchetypeWeights,
  updatePreferences,
  toLegacyContext,
  toLegacyRating,
  analyzePackComposition,

  // Types
  type MadruryContext,
  type MadruryRating,
  type PackAnalysis,
};

// ============================================
// Archetype definitions and helpers
// ============================================

export {
  VINTAGE_CUBE_ARCHETYPES,
  getArchetype,
  getArchetypeIds,
  isKeyCard,
  isSignalCard,
} from './archetypes';

// ============================================
// Affinity data (cube-specific)
// ============================================

export {
  calculateCardAffinity,
  getCardAffinities,
  EXPLICIT_AFFINITIES,
  PROPERTY_RULES,
} from './archetypeAffinity';

// ============================================
// Types
// ============================================

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
