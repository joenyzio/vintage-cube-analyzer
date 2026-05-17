/**
 * Archetype Mode - Context-Aware Card Ratings
 *
 * This module provides archetype-aware rating adjustments:
 * 1. Floor/Ceiling calculations - shows variance across archetypes
 * 2. Archetype-weighted ratings - reweights cards based on selected archetype
 * 3. Drift detection - identifies emerging archetype signals from picks
 *
 * The key insight: Yawgmoth's Will has a C- general rating but S-tier in Storm.
 * This module surfaces that difference explicitly.
 */

import { getEloData } from '../eloHelpers';
import { COMPREHENSIVE_AFFINITIES } from './comprehensiveAffinities';
import { VINTAGE_CUBE_ARCHETYPES } from './archetypes';
import type { CardAffinity, InArchetypeValue, ArchetypeDefinition } from './types';
import type { CubeCard } from '../../types/card';

// Re-export for convenience
export const ARCHETYPES = VINTAGE_CUBE_ARCHETYPES;

// ============================================================================
// TYPES
// ============================================================================

export type DraftMode = 'open' | 'leaning' | 'committed';

export interface FloorCeiling {
  baseElo: number;
  floor: {
    elo: number;
    archetype: string;
    tier: InArchetypeValue | null;
  };
  ceiling: {
    elo: number;
    archetype: string;
    tier: InArchetypeValue | null;
  };
  spread: number;  // ceiling.elo - floor.elo
  isHighVariance: boolean;  // spread > 300 = build-around signal
}

export interface ArchetypeRating {
  archetypeId: string;
  archetypeName: string;
  adjustedElo: number;
  tier: InArchetypeValue | null;
  isArchetypeDefining: boolean;
  role: string | null;
  boost: number;  // How much ELO was added/removed
}

export interface DriftSignal {
  archetypeId: string;
  archetypeName: string;
  strength: number;  // 0-100
  supportingCards: string[];
  keyCardsMissing: string[];
  canCommit: boolean;  // Strength >= 40
}

// ============================================================================
// FLOOR/CEILING CALCULATION
// ============================================================================

// Cache for affinity lookups
const affinityCache = new Map<string, CardAffinity[]>();

function getCardAffinities(cardName: string): CardAffinity[] {
  if (affinityCache.has(cardName)) {
    return affinityCache.get(cardName)!;
  }

  const affinities = COMPREHENSIVE_AFFINITIES.filter(a => a.cardName === cardName);
  affinityCache.set(cardName, affinities);
  return affinities;
}

/**
 * Calculate floor (worst archetype) and ceiling (best archetype) for a card.
 * This reveals build-around potential - high spread = high variance card.
 */
export function getFloorCeiling(cardName: string): FloorCeiling {
  const baseElo = getEloData(cardName)?.elo || 1500;
  const affinities = getCardAffinities(cardName);

  // Default: no variance
  if (affinities.length === 0) {
    return {
      baseElo,
      floor: { elo: baseElo, archetype: 'general', tier: null },
      ceiling: { elo: baseElo, archetype: 'general', tier: null },
      spread: 0,
      isHighVariance: false,
    };
  }

  // Calculate adjusted ELO for each archetype affinity
  const archetypeElos = affinities.map(aff => {
    // Weight to ELO adjustment: 1.0 weight = +200 ELO, -1.0 = -200 ELO
    const eloAdjustment = aff.weight * 200;

    // Archetype-defining cards get extra boost
    const definingBonus = aff.isArchetypeDefining ? 150 : 0;

    // S-tier cards get bonus
    const tierBonus = aff.inArchetypeValue === 'S' ? 100 :
                      aff.inArchetypeValue === 'A' ? 50 : 0;

    return {
      archetypeId: aff.archetypeId,
      elo: baseElo + eloAdjustment + definingBonus + tierBonus,
      tier: aff.inArchetypeValue || null,
    };
  });

  // Find floor (worst) and ceiling (best)
  archetypeElos.sort((a, b) => a.elo - b.elo);

  const floor = archetypeElos[0];
  const ceiling = archetypeElos[archetypeElos.length - 1];

  // Check for anti-synergy archetypes (negative weights)
  const antiSynergies = affinities.filter(a => a.weight < 0);
  let actualFloor = floor;

  if (antiSynergies.length > 0) {
    const worstAnti = antiSynergies.reduce((worst, curr) =>
      curr.weight < worst.weight ? curr : worst
    );
    const antiElo = baseElo + (worstAnti.weight * 200);
    if (antiElo < floor.elo) {
      actualFloor = {
        archetypeId: worstAnti.archetypeId,
        elo: antiElo,
        tier: null,
      };
    }
  }

  // If no explicit floor archetype, use base ELO as floor
  const finalFloor = actualFloor || { archetypeId: 'general', elo: baseElo - 50, tier: null };

  const spread = ceiling.elo - finalFloor.elo;

  return {
    baseElo,
    floor: {
      elo: Math.round(finalFloor.elo),
      archetype: getArchetypeName(finalFloor.archetypeId),
      tier: finalFloor.tier,
    },
    ceiling: {
      elo: Math.round(ceiling.elo),
      archetype: getArchetypeName(ceiling.archetypeId),
      tier: ceiling.tier,
    },
    spread: Math.round(spread),
    isHighVariance: spread > 250,
  };
}

// ============================================================================
// ARCHETYPE-WEIGHTED RATINGS
// ============================================================================

/**
 * Get card rating adjusted for a specific archetype.
 * When user commits to an archetype, ratings should reflect that context.
 */
export function getArchetypeWeightedRating(
  cardName: string,
  archetypeId: string
): ArchetypeRating | null {
  const baseElo = getEloData(cardName)?.elo || 1500;
  const affinities = getCardAffinities(cardName);

  // Find affinity for this specific archetype
  const affinity = affinities.find(a => a.archetypeId === archetypeId);

  if (!affinity) {
    // Card has no affinity for this archetype - slight penalty
    return {
      archetypeId,
      archetypeName: getArchetypeName(archetypeId),
      adjustedElo: baseElo - 50,
      tier: null,
      isArchetypeDefining: false,
      role: null,
      boost: -50,
    };
  }

  // Calculate boost
  const weightBoost = affinity.weight * 200;
  const definingBonus = affinity.isArchetypeDefining ? 150 : 0;
  const tierBonus = affinity.inArchetypeValue === 'S' ? 100 :
                    affinity.inArchetypeValue === 'A' ? 50 : 0;

  const totalBoost = weightBoost + definingBonus + tierBonus;

  return {
    archetypeId,
    archetypeName: getArchetypeName(archetypeId),
    adjustedElo: Math.round(baseElo + totalBoost),
    tier: affinity.inArchetypeValue || null,
    isArchetypeDefining: affinity.isArchetypeDefining || false,
    role: affinity.role || null,
    boost: Math.round(totalBoost),
  };
}

/**
 * Get all archetype ratings for a card.
 * Shows how the card performs in each archetype context.
 */
export function getAllArchetypeRatings(cardName: string): ArchetypeRating[] {
  return ARCHETYPES.map((arch: ArchetypeDefinition) => {
    const rating = getArchetypeWeightedRating(cardName, arch.id);
    return rating || {
      archetypeId: arch.id,
      archetypeName: arch.name,
      adjustedElo: getEloData(cardName)?.elo || 1500,
      tier: null,
      isArchetypeDefining: false,
      role: null,
      boost: 0,
    };
  }).sort((a: ArchetypeRating, b: ArchetypeRating) => b.adjustedElo - a.adjustedElo);
}

// ============================================================================
// DRIFT DETECTION
// ============================================================================

/**
 * Analyze picks to detect emerging archetype signals.
 * Returns archetypes the user is drifting toward based on their picks.
 */
export function detectArchetypeDrift(picks: CubeCard[]): DriftSignal[] {
  if (picks.length === 0) return [];

  const pickNames = picks.map(p => p.name);
  const signals: DriftSignal[] = [];

  for (const archetype of ARCHETYPES as ArchetypeDefinition[]) {
    let strength = 0;
    const supportingCards: string[] = [];
    const keyCardsMissing: string[] = [];

    // Check for key cards
    const keyCardsOwned = archetype.keyCards.filter((kc: string) => pickNames.includes(kc));
    keyCardsOwned.forEach((kc: string) => {
      supportingCards.push(kc);
      strength += 20; // Key cards are strong signals
    });

    // Track missing key cards
    archetype.keyCards.filter((kc: string) => !pickNames.includes(kc))
      .slice(0, 3)
      .forEach((kc: string) => keyCardsMissing.push(kc));

    // Check for signal cards
    const signalCardsOwned = archetype.signalCards.filter((sc: string) => pickNames.includes(sc));
    signalCardsOwned.forEach((sc: string) => {
      if (!supportingCards.includes(sc)) {
        supportingCards.push(sc);
      }
      strength += 8; // Signal cards are medium signals
    });

    // Check affinities from picks
    picks.forEach(pick => {
      const affinities = getCardAffinities(pick.name);
      const matchingAff = affinities.find(a => a.archetypeId === archetype.id);
      if (matchingAff && matchingAff.weight > 0) {
        if (!supportingCards.includes(pick.name)) {
          supportingCards.push(pick.name);
        }
        strength += matchingAff.weight * 5;

        // Archetype-defining cards are huge signals
        if (matchingAff.isArchetypeDefining) {
          strength += 15;
        }
      }
    });

    // Cap strength at 100
    strength = Math.min(100, Math.round(strength));

    if (strength >= 15) {
      signals.push({
        archetypeId: archetype.id,
        archetypeName: archetype.name,
        strength,
        supportingCards: supportingCards.slice(0, 5),
        keyCardsMissing: keyCardsMissing.slice(0, 3),
        canCommit: strength >= 40,
      });
    }
  }

  // Sort by strength descending
  return signals.sort((a: DriftSignal, b: DriftSignal) => b.strength - a.strength);
}

/**
 * Get the dominant drift signal if any.
 * Returns the strongest archetype signal if it's above threshold.
 */
export function getDominantDrift(picks: CubeCard[]): DriftSignal | null {
  const signals = detectArchetypeDrift(picks);
  if (signals.length === 0) return null;

  const dominant = signals[0];
  return dominant.strength >= 30 ? dominant : null;
}

// ============================================================================
// HELPERS
// ============================================================================

function getArchetypeName(archetypeId: string): string {
  const archetype = ARCHETYPES.find(a => a.id === archetypeId);
  return archetype?.name || archetypeId;
}

/**
 * Get a grade string based on in-archetype tier.
 */
export function getTierGrade(tier: InArchetypeValue | null): string {
  switch (tier) {
    case 'S': return 'S-tier';
    case 'A': return 'A-tier';
    case 'B': return 'B-tier';
    case 'C': return 'C-tier';
    default: return 'Neutral';
  }
}

/**
 * Get color class for tier display.
 */
export function getTierColor(tier: InArchetypeValue | null): string {
  switch (tier) {
    case 'S': return 'text-amber-400';
    case 'A': return 'text-purple-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-white/60';
    default: return 'text-white/40';
  }
}
