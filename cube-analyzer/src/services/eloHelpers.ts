/**
 * ELO Helper Functions
 *
 * Provides utilities for working with CubeCobra ELO ratings data.
 * ELO ratings are based on pick data from thousands of actual drafts.
 */

import eloRatingsData from '../data/elo-ratings.json';

// Type definitions
export interface EloCardData {
  elo: number;
  pickCount: number;
  cubeCount: number;
  scryfallId?: string;
}

export interface EloMetadata {
  cubeId: string;
  fetchedAt: string;
  cardCount: number;
  eloRange: {
    min: number;
    max: number;
  };
  source: string;
}

export type WheelLikelihood = 'likely' | 'maybe' | 'unlikely';

// Extract data from JSON
const ELO_CARDS: Record<string, EloCardData> = eloRatingsData.cards;
const ELO_METADATA: EloMetadata = eloRatingsData.metadata;
const ELO_MIN = ELO_METADATA.eloRange.min;
const ELO_MAX = ELO_METADATA.eloRange.max;

// Pre-calculate all ELO values sorted for percentile lookups
const ALL_ELOS = Object.values(ELO_CARDS).map(c => c.elo).sort((a, b) => a - b);

/**
 * Normalize card name for lookup
 * Handles adventure cards (e.g., "Brazen Borrower // Petty Theft" -> "Brazen Borrower")
 */
function normalizeCardName(name: string): string {
  // Handle adventure/split cards - try front face first
  if (name.includes(' // ')) {
    return name.split(' // ')[0];
  }
  return name;
}

/**
 * Get raw ELO data for a card
 */
export function getEloData(cardName: string): EloCardData | null {
  // Try exact match first
  if (ELO_CARDS[cardName]) {
    return ELO_CARDS[cardName];
  }
  // Try normalized name (for adventure/split cards)
  const normalized = normalizeCardName(cardName);
  return ELO_CARDS[normalized] || null;
}

/**
 * Get the percentile rank of a card (0-100)
 * Higher percentile = more frequently picked
 */
export function getPercentile(cardName: string): number {
  const data = getEloData(cardName);
  if (!data) return 0;

  const rank = ALL_ELOS.filter(e => e <= data.elo).length;
  return Math.round((rank / ALL_ELOS.length) * 100);
}

/**
 * Get wheel likelihood based on ELO percentile
 * - 'likely': Cards in bottom 25% often wheel
 * - 'maybe': Cards in 25-50% sometimes wheel
 * - 'unlikely': Cards above 50% rarely wheel
 */
export function getWheelLikelihood(cardName: string): WheelLikelihood {
  const percentile = getPercentile(cardName);

  if (percentile <= 25) return 'likely';
  if (percentile <= 50) return 'maybe';
  return 'unlikely';
}

/**
 * Get pick rate (picks per cube) as a rough popularity indicator
 */
export function getPickRate(cardName: string): number {
  const data = getEloData(cardName);
  if (!data || data.cubeCount === 0) return 0;

  return data.pickCount / data.cubeCount;
}

/**
 * Calculate average ELO for a list of cards
 * Returns normalized value (0-10 scale) for display
 */
export function calculateDeckElo(cardNames: string[]): {
  rawAverage: number;
  normalized: number;
  cardCount: number;
  missingCards: string[];
} {
  const found: number[] = [];
  const missingCards: string[] = [];

  for (const name of cardNames) {
    const data = getEloData(name);
    if (data) {
      found.push(data.elo);
    } else {
      missingCards.push(name);
    }
  }

  if (found.length === 0) {
    return { rawAverage: 0, normalized: 0, cardCount: 0, missingCards };
  }

  const rawAverage = found.reduce((sum, e) => sum + e, 0) / found.length;

  // Normalize to 1-10 scale
  const normalizedPercent = (rawAverage - ELO_MIN) / (ELO_MAX - ELO_MIN);
  const normalized = Math.round((1 + normalizedPercent * 9) * 10) / 10;

  return {
    rawAverage: Math.round(rawAverage),
    normalized: Math.min(10, Math.max(1, normalized)),
    cardCount: found.length,
    missingCards
  };
}

/**
 * Calculate archetype strength based on key cards
 * Includes weighting for premium cards
 */
export function calculateArchetypeElo(keyCards: string[]): {
  averageElo: number;
  normalizedPower: number;
  premiumCount: number;
  dataConfidence: 'high' | 'medium' | 'low';
  breakdown: { name: string; elo: number; percentile: number }[];
} {
  const breakdown: { name: string; elo: number; percentile: number }[] = [];
  let premiumCount = 0;

  for (const name of keyCards) {
    const data = getEloData(name);
    if (data) {
      const percentile = getPercentile(name);
      breakdown.push({ name, elo: Math.round(data.elo), percentile });
      if (data.elo >= 1700) premiumCount++;
    }
  }

  if (breakdown.length === 0) {
    return {
      averageElo: 0,
      normalizedPower: 5,
      premiumCount: 0,
      dataConfidence: 'low',
      breakdown: []
    };
  }

  const averageElo = Math.round(
    breakdown.reduce((sum, c) => sum + c.elo, 0) / breakdown.length
  );

  // Calculate normalized power (1-10 scale)
  const normalizedPercent = (averageElo - ELO_MIN) / (ELO_MAX - ELO_MIN);
  const basePower = 4 + normalizedPercent * 6; // 4-10 range

  // Bonus for premium card density
  const premiumBonus = Math.min(1, premiumCount * 0.15);
  const normalizedPower = Math.min(10, Math.round((basePower + premiumBonus) * 10) / 10);

  // Confidence based on how many key cards have data
  const dataRatio = breakdown.length / keyCards.length;
  const dataConfidence: 'high' | 'medium' | 'low' =
    dataRatio >= 0.8 ? 'high' :
    dataRatio >= 0.5 ? 'medium' : 'low';

  return {
    averageElo,
    normalizedPower,
    premiumCount,
    dataConfidence,
    breakdown: breakdown.sort((a, b) => b.elo - a.elo)
  };
}

/**
 * Get ELO tier label for display
 */
export function getEloTier(cardName: string): { tier: string; color: string } {
  const percentile = getPercentile(cardName);

  if (percentile >= 90) return { tier: 'S', color: 'text-amber-400' };
  if (percentile >= 75) return { tier: 'A', color: 'text-purple-400' };
  if (percentile >= 50) return { tier: 'B', color: 'text-blue-400' };
  if (percentile >= 25) return { tier: 'C', color: 'text-green-400' };
  return { tier: 'D', color: 'text-white/40' };
}

/**
 * Format pick count for display (e.g., "141.7k")
 */
export function formatPickCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

/**
 * Format cube count for display
 */
export function formatCubeCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

/**
 * Get ELO metadata
 */
export function getEloMetadata(): EloMetadata {
  return ELO_METADATA;
}

/**
 * Get the ELO range for reference
 */
export function getEloRange(): { min: number; max: number } {
  return { min: ELO_MIN, max: ELO_MAX };
}

/**
 * Calculate visual bar width (0-100) for ELO display
 */
export function getEloBarWidth(cardName: string): number {
  const data = getEloData(cardName);
  if (!data) return 0;

  return Math.round(((data.elo - ELO_MIN) / (ELO_MAX - ELO_MIN)) * 100);
}

/**
 * Compare two cards by ELO
 */
export function compareByElo(cardNameA: string, cardNameB: string): number {
  const eloA = getEloData(cardNameA)?.elo || 0;
  const eloB = getEloData(cardNameB)?.elo || 0;
  return eloB - eloA; // Descending order
}

/**
 * Get top N cards by ELO from a list
 */
export function getTopByElo(cardNames: string[], n: number): string[] {
  return cardNames
    .filter(name => getEloData(name))
    .sort((a, b) => compareByElo(a, b))
    .slice(0, n);
}

/**
 * Get bottom N cards by ELO from a list (potential upgrades)
 */
export function getBottomByElo(cardNames: string[], n: number): string[] {
  return cardNames
    .filter(name => getEloData(name))
    .sort((a, b) => compareByElo(b, a))
    .slice(0, n);
}
