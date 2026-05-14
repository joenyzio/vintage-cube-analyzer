/**
 * Simulation Insights Service
 *
 * Provides access to draft simulation data for UI display.
 * Data comes from running 500 simulated drafts with 8 bot drafters.
 */

import simulationData from '../data/simulation-data.json';

// Type definitions
export interface CardSimStats {
  pickCount: number;
  totalAppearances: number;
  avgPickPosition: number;
  wheelCount: number;
  wheelOpportunities: number;
  archetypeBreakdown: Record<string, number>;
  sideboardCount: number;
}

export interface ArchetypeStats {
  count: number;
  avgCommitment: number;
  avgDeckQuality: number;
}

export interface SimulationMetadata {
  draftCount: number;
  totalDecks: number;
}

// Extract data from JSON
const CARD_STATS: Record<string, CardSimStats> = simulationData.cardStats;
const ARCHETYPE_DISTRIBUTION: Record<string, ArchetypeStats> = simulationData.archetypeDistribution;
const METADATA: SimulationMetadata = {
  draftCount: simulationData.draftCount,
  totalDecks: simulationData.totalDecks,
};

/**
 * Normalize card name for lookup
 */
function normalizeCardName(name: string): string {
  if (name.includes(' // ')) {
    return name.split(' // ')[0];
  }
  return name;
}

/**
 * Get simulation stats for a card
 */
export function getCardSimStats(cardName: string): CardSimStats | null {
  const normalized = normalizeCardName(cardName);
  return CARD_STATS[normalized] || CARD_STATS[cardName] || null;
}

/**
 * Calculate wheel rate (% of opportunities where card wheeled)
 */
export function getWheelRate(cardName: string): number | null {
  const stats = getCardSimStats(cardName);
  if (!stats || stats.wheelOpportunities === 0) return null;
  return (stats.wheelCount / stats.wheelOpportunities) * 100;
}

/**
 * Get wheel rate category for visual indicators
 */
export type WheelCategory = 'high-wheel' | 'low-wheel' | 'normal';

export function getWheelCategory(cardName: string): WheelCategory {
  const rate = getWheelRate(cardName);
  if (rate === null) return 'normal';
  if (rate >= 80) return 'high-wheel';
  if (rate <= 5) return 'low-wheel';
  return 'normal';
}

/**
 * Calculate pick rate (% of drafts where card was picked)
 */
export function getPickRate(cardName: string): number | null {
  const stats = getCardSimStats(cardName);
  if (!stats) return null;
  // pickCount / draftCount * 100
  return (stats.pickCount / METADATA.draftCount) * 100;
}

/**
 * Get average pick position (1-45)
 */
export function getAvgPickPosition(cardName: string): number | null {
  const stats = getCardSimStats(cardName);
  if (!stats) return null;
  return stats.avgPickPosition;
}

/**
 * Get top archetypes for a card (sorted by frequency)
 */
export interface ArchetypePickInfo {
  archetypeId: string;
  count: number;
  percentage: number;
}

export function getTopArchetypesForCard(cardName: string, limit = 3): ArchetypePickInfo[] {
  const stats = getCardSimStats(cardName);
  if (!stats) return [];

  const breakdown = stats.archetypeBreakdown;
  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

  return Object.entries(breakdown)
    .map(([archetypeId, count]) => ({
      archetypeId,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get archetype emergence rate (% of total decks)
 */
export function getArchetypeEmergence(archetypeId: string): number | null {
  const stats = ARCHETYPE_DISTRIBUTION[archetypeId];
  if (!stats) return null;
  return (stats.count / METADATA.totalDecks) * 100;
}

/**
 * Get archetype stats
 */
export function getArchetypeStats(archetypeId: string): ArchetypeStats | null {
  return ARCHETYPE_DISTRIBUTION[archetypeId] || null;
}

/**
 * Get all archetype emergence rates sorted by frequency
 */
export function getAllArchetypeEmergence(): { archetypeId: string; emergence: number; stats: ArchetypeStats }[] {
  return Object.entries(ARCHETYPE_DISTRIBUTION)
    .map(([archetypeId, stats]) => ({
      archetypeId,
      emergence: (stats.count / METADATA.totalDecks) * 100,
      stats,
    }))
    .sort((a, b) => b.emergence - a.emergence);
}

/**
 * Format wheel rate for display
 */
export function formatWheelRate(rate: number | null): string {
  if (rate === null) return 'N/A';
  return `${Math.round(rate)}%`;
}

/**
 * Format pick position for display
 */
export function formatPickPosition(position: number | null): string {
  if (position === null) return 'N/A';
  return `Pick ${Math.round(position)}`;
}

/**
 * Get a brief insight string for a card
 */
export function getCardInsightSummary(cardName: string): string | null {
  const stats = getCardSimStats(cardName);
  if (!stats) return null;

  const wheelRate = getWheelRate(cardName);
  const avgPick = stats.avgPickPosition;

  if (wheelRate !== null && wheelRate >= 80) {
    return `Wheels ${Math.round(wheelRate)}% of the time`;
  }
  if (wheelRate !== null && wheelRate <= 5) {
    return `Rarely wheels - take it if you want it`;
  }
  if (avgPick <= 8) {
    return `First-pick quality (avg pick ${Math.round(avgPick)})`;
  }
  return null;
}

/**
 * Check if this archetype has limited support (is a "ceiling" archetype)
 */
export function isLimitedSupportArchetype(archetypeId: string): boolean {
  // These archetypes have limited card support in this cube
  const limitedArchetypes = ['tempo', 'oath', 'sneak', 'control'];
  return limitedArchetypes.includes(archetypeId);
}

/**
 * Get archetype context message
 */
export function getArchetypeContext(archetypeId: string): string | null {
  const emergence = getArchetypeEmergence(archetypeId);
  if (emergence === null) return null;

  const limited = isLimitedSupportArchetype(archetypeId);

  if (archetypeId === 'tempo') {
    return `${emergence.toFixed(1)}% emergence - natural ceiling for this cube`;
  }
  if (archetypeId === 'oath') {
    return `${emergence.toFixed(1)}% emergence - single enabler (Oath of Druids)`;
  }
  if (limited) {
    return `${emergence.toFixed(1)}% emergence - limited support in cube`;
  }
  return `${emergence.toFixed(1)}% emergence`;
}

// Export metadata for components that need it
export const SIMULATION_METADATA = METADATA;
