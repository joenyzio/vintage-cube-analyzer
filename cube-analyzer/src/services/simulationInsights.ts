/**
 * Simulation Insights Service
 *
 * Provides access to draft simulation data for UI display.
 * Data comes from running 10,000 simulated drafts with 8 bot drafters.
 *
 * Key insight: Color combinations matter significantly within archetypes:
 * - Midrange: Sultai (1929 ELO) >> Selesnya (1729 ELO)
 * - Aggro: Jeskai (1893 ELO) >> Boros (1795 ELO)
 * - Tempo: Sultai (1907 ELO) >> Mardu (1788 ELO)
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

export interface ArchetypeSubtype {
  colorCombo: string;
  name: string;
  count: number;
  avgDeckQuality: number;
  avgCmc: number;
  topCards: string[];
}

export interface SimulationMetadata {
  draftCount: number;
  totalDecks: number;
}

// Extract data from JSON
const CARD_STATS: Record<string, CardSimStats> = simulationData.cardStats;
const ARCHETYPE_DISTRIBUTION: Record<string, ArchetypeStats> = simulationData.archetypeDistribution;
const MIDRANGE_SUBTYPES: Record<string, ArchetypeSubtype> = (simulationData as any).midrangeSubtypes || {};
const AGGRO_SUBTYPES: Record<string, ArchetypeSubtype> = (simulationData as any).aggroSubtypes || {};
const TEMPO_SUBTYPES: Record<string, ArchetypeSubtype> = (simulationData as any).tempoSubtypes || {};
const METADATA: SimulationMetadata = {
  draftCount: simulationData.draftCount,
  totalDecks: simulationData.totalDecks,
};

// Pre-computed best variants for each archetype
const BEST_VARIANTS: Record<string, { name: string; colors: string; elo: number }> = {
  midrange: { name: 'Sultai', colors: 'BGU', elo: 1929 },
  aggro: { name: 'Jeskai', colors: 'RUW', elo: 1893 },
  tempo: { name: 'Sultai', colors: 'BGU', elo: 1907 },
};

const WORST_VARIANTS: Record<string, { name: string; colors: string; elo: number }> = {
  midrange: { name: 'Selesnya', colors: 'GW', elo: 1729 },
  aggro: { name: 'Boros', colors: 'RW', elo: 1795 },
  tempo: { name: 'Mardu', colors: 'BRW', elo: 1788 },
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

/**
 * Get the archetype subtypes for a given archetype
 */
export function getArchetypeSubtypes(archetypeId: string): Record<string, ArchetypeSubtype> {
  switch (archetypeId) {
    case 'midrange': return MIDRANGE_SUBTYPES;
    case 'aggro': return AGGRO_SUBTYPES;
    case 'tempo': return TEMPO_SUBTYPES;
    default: return {};
  }
}

/**
 * Get the best variant for an archetype
 */
export function getBestVariant(archetypeId: string): { name: string; colors: string; elo: number } | null {
  return BEST_VARIANTS[archetypeId] || null;
}

/**
 * Get the worst variant for an archetype
 */
export function getWorstVariant(archetypeId: string): { name: string; colors: string; elo: number } | null {
  return WORST_VARIANTS[archetypeId] || null;
}

/**
 * Get color-specific advice for an archetype based on current colors
 */
export function getColorAdvice(archetypeId: string, currentColors: string[]): string | null {
  const subtypes = getArchetypeSubtypes(archetypeId);
  if (Object.keys(subtypes).length === 0) return null;

  const sortedColors = [...currentColors].sort().join('');
  const currentSubtype = subtypes[sortedColors];
  const best = getBestVariant(archetypeId);
  const worst = getWorstVariant(archetypeId);

  // If we have an exact match, show its ELO
  if (currentSubtype) {
    const delta = best ? currentSubtype.avgDeckQuality - best.elo : 0;
    if (delta >= -20) {
      return `${currentSubtype.name} variant: ${currentSubtype.avgDeckQuality} ELO`;
    }
  }

  if (!best) return null;

  // Check if current colors match best variant
  const hasAllBestColors = best.colors.split('').every(c => currentColors.includes(c));

  if (hasAllBestColors) {
    return `Optimal colors for ${archetypeId}! ${best.name} averages ${best.elo} ELO.`;
  }

  // Check if current colors are heading toward worst variant
  if (worst) {
    const hasWorstColors = worst.colors.split('').every(c => currentColors.includes(c));
    const missingBestColors = best.colors.split('').filter(c => !currentColors.includes(c));

    if (hasWorstColors && missingBestColors.length > 0) {
      const colorNames: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
      const missingNames = missingBestColors.map(c => colorNames[c]).join('/');
      return `Consider adding ${missingNames}. ${best.name} (${best.elo} ELO) beats ${worst.name} (${worst.elo} ELO) by ${best.elo - worst.elo} points.`;
    }
  }

  // General advice based on what's missing
  if (archetypeId === 'midrange' || archetypeId === 'tempo') {
    if (!currentColors.includes('B')) {
      return 'Black is key for top variants. Thoughtseize and Liliana elevate fair decks.';
    }
    if (!currentColors.includes('U')) {
      return 'Blue adds card selection and protection. Top variants are Sultai/Grixis.';
    }
  }

  if (archetypeId === 'aggro') {
    if (!currentColors.includes('U') && currentColors.includes('R') && currentColors.includes('W')) {
      return 'Splash Blue for Jeskai Aggro. Daze and counters protect your clock (+100 ELO over Boros).';
    }
  }

  return null;
}

/**
 * Get ELO for a specific color combination within an archetype
 */
export function getSubtypeElo(archetypeId: string, colors: string[]): number | null {
  const subtypes = getArchetypeSubtypes(archetypeId);
  const sortedColors = [...colors].sort().join('');
  const subtype = subtypes[sortedColors];
  return subtype?.avgDeckQuality || null;
}

/**
 * Get a ranked list of variants for an archetype
 */
export function getRankedVariants(archetypeId: string, limit = 5): ArchetypeSubtype[] {
  const subtypes = getArchetypeSubtypes(archetypeId);
  return Object.values(subtypes)
    .sort((a, b) => b.avgDeckQuality - a.avgDeckQuality)
    .slice(0, limit);
}
