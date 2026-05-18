/**
 * Simulation & Win Rate Insights Service
 *
 * Provides access to:
 * 1. Draft simulation data (from bot drafts) - pick patterns, wheel rates, archetype fit
 * 2. 17lands win rate data (from Arena) - IWD (Improvement When Drawn), GIH WR
 *
 * Key insight: ELO (what drafters believe) and IWD (what actually wins) can diverge.
 * When they agree = high confidence. When they disagree = trap or steal signal.
 */

import simulationData from '../data/simulation-data.json';
import winRateData from '../data/17lands-winrates.json';
import { getEloData, getPercentile } from './eloHelpers';

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

// ============================================================================
// 17LANDS WIN RATE TYPES
// ============================================================================

interface WinRateCardData {
  gihWR: number | null;
  iwd: number | null;
  avgPick: number | null;
  gameCount: number;
  playRate: number | null;
  iwdByColor: Record<string, { iwd: number | null; games: number }>;
}

interface WinRateDataFile {
  metadata: {
    fetchedAt: string;
    expansion: string;
    totalCards: number;
    cardsWithIWD: number;
  };
  cards: Record<string, WinRateCardData>;
  missingCards: { name: string; reason: string }[];
}

// ============================================================================
// CARD SIGNAL TYPES (Combined ELO + IWD)
// ============================================================================

export type AffinityTier = 'S' | 'A' | 'B' | 'C' | null;
export type SignalConfidence = 'aligned' | 'divergent' | 'unknown';
export type DivergenceDirection = 'trap' | 'steal';
export type IWDSource = 'color-filtered' | 'global' | 'none';

export interface IWDData {
  value: number | null;
  source: IWDSource;
  gameCount: number;
  colorCombo?: string;
}

export interface DivergenceInfo {
  direction: DivergenceDirection;
  magnitude: number;
  explanation: string;
}

export interface CardSignal {
  cardName: string;
  elo: number | null;
  eloPercentile: number | null;
  affinityTier: AffinityTier;
  iwd: IWDData;
  gihWR: number | null;
  confidence: SignalConfidence;
  divergence?: DivergenceInfo;
}

// ============================================================================
// DATA LOADING
// ============================================================================

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

// 17lands win rate data
const WIN_RATE_DATA = winRateData as WinRateDataFile;
const WIN_RATE_CARDS = WIN_RATE_DATA.cards;
const WIN_RATE_MISSING = new Set(WIN_RATE_DATA.missingCards.map(m => m.name));

// Thresholds for win rate signal reliability
const MIN_GAMES_GLOBAL = 500;
const MIN_GAMES_COLOR = 100;

// Thresholds for divergence detection
const IWD_TRAP_THRESHOLD = 0.01;   // <1% IWD = weak card
const IWD_STEAL_THRESHOLD = 0.03;  // >3% IWD = strong card
const ELO_HIGH_PERCENTILE = 75;    // Top 25% by ELO
const ELO_LOW_PERCENTILE = 50;     // Bottom 50% by ELO

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

// ============================================================================
// 17LANDS WIN RATE FUNCTIONS
// ============================================================================

/**
 * Get raw win rate data for a card
 */
export function getWinRateData(cardName: string): WinRateCardData | null {
  // Try direct lookup
  if (WIN_RATE_CARDS[cardName]) return WIN_RATE_CARDS[cardName];

  // Try normalized name (front face of split cards)
  const normalized = normalizeCardName(cardName);
  if (WIN_RATE_CARDS[normalized]) return WIN_RATE_CARDS[normalized];

  return null;
}

/**
 * Check if card is missing from 17lands (falls back to ELO)
 */
export function isMissingWinRateData(cardName: string): boolean {
  return WIN_RATE_MISSING.has(cardName) || getWinRateData(cardName) === null;
}

/**
 * Get why a card is missing from 17lands
 */
export function getMissingReason(cardName: string): string | null {
  const missing = WIN_RATE_DATA.missingCards.find(m => m.name === cardName);
  if (!missing) return null;

  if (missing.reason === 'not_in_arena') {
    return 'Not in Arena Powered Cube — using ELO and affinity matrix';
  }
  if (missing.reason === 'low_sample') {
    return 'Low sample size (<500 games) — using ELO only';
  }
  return 'No win rate data available';
}

/**
 * Get IWD (Improvement When Drawn) for a card, optionally filtered by colors.
 * Handles sample size thresholds and falls back to global IWD when needed.
 */
export function getIWD(cardName: string, colors?: string[]): IWDData {
  const data = getWinRateData(cardName);

  // No data at all
  if (!data) {
    return { value: null, source: 'none', gameCount: 0 };
  }

  // Try color-filtered IWD if colors provided
  if (colors && colors.length > 0) {
    // Sort colors in WUBRG order for lookup
    const wubrgOrder = ['W', 'U', 'B', 'R', 'G'];
    const sortedColors = [...colors].sort((a, b) =>
      wubrgOrder.indexOf(a) - wubrgOrder.indexOf(b)
    ).join('');

    const colorData = data.iwdByColor[sortedColors];
    if (colorData && colorData.games >= MIN_GAMES_COLOR && colorData.iwd !== null) {
      return {
        value: colorData.iwd,
        source: 'color-filtered',
        gameCount: colorData.games,
        colorCombo: sortedColors,
      };
    }

    // Try two-color subsets if three-color didn't match
    if (colors.length >= 2) {
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const pair = [colors[i], colors[j]].sort((a, b) =>
            wubrgOrder.indexOf(a) - wubrgOrder.indexOf(b)
          ).join('');
          const pairData = data.iwdByColor[pair];
          if (pairData && pairData.games >= MIN_GAMES_COLOR && pairData.iwd !== null) {
            return {
              value: pairData.iwd,
              source: 'color-filtered',
              gameCount: pairData.games,
              colorCombo: pair,
            };
          }
        }
      }
    }
  }

  // Fall back to global IWD
  if (data.iwd !== null && data.gameCount >= MIN_GAMES_GLOBAL) {
    return {
      value: data.iwd,
      source: 'global',
      gameCount: data.gameCount,
    };
  }

  // No reliable data
  return { value: null, source: 'none', gameCount: data.gameCount };
}

/**
 * Get GIH WR (Games In Hand Win Rate) for a card
 */
export function getGIHWR(cardName: string): number | null {
  const data = getWinRateData(cardName);
  if (!data || data.gameCount < MIN_GAMES_GLOBAL) return null;
  return data.gihWR;
}

// ============================================================================
// CARD SIGNAL - Combined ELO + IWD Analysis
// ============================================================================

/**
 * Get combined card signal with ELO, IWD, and divergence detection.
 * This is the primary function for Phase 3 (UI) and Phase 4 (coach) to consume.
 *
 * @param cardName - Card name to analyze
 * @param colors - User's current colors for archetype-filtered IWD
 * @param affinityTier - Optional affinity tier from comprehensiveAffinities
 */
export function getCardSignal(
  cardName: string,
  colors?: string[],
  affinityTier?: AffinityTier
): CardSignal {
  // Get ELO data
  const eloData = getEloData(cardName);
  const elo = eloData?.elo ?? null;
  const eloPercentile = elo !== null ? getPercentile(cardName) : null;

  // Get IWD data (with color filtering)
  const iwdData = getIWD(cardName, colors);

  // Get GIH WR
  const gihWR = getGIHWR(cardName);

  // Determine confidence and divergence
  let confidence: SignalConfidence = 'unknown';
  let divergence: DivergenceInfo | undefined;

  if (iwdData.source === 'none' || iwdData.value === null) {
    // No win rate data - confidence is unknown
    confidence = 'unknown';
  } else if (eloPercentile !== null) {
    const iwd = iwdData.value;

    // Check for TRAP: High ELO but low IWD
    if (eloPercentile >= ELO_HIGH_PERCENTILE && iwd < IWD_TRAP_THRESHOLD) {
      confidence = 'divergent';
      divergence = {
        direction: 'trap',
        magnitude: Math.abs(iwd - IWD_TRAP_THRESHOLD),
        explanation: `High pick priority (top ${100 - eloPercentile}% by ELO) but weak performance (${(iwd * 100).toFixed(1)}% IWD). Often picked too early.`,
      };
    }
    // Check for STEAL: Low ELO but high IWD
    else if (eloPercentile < ELO_LOW_PERCENTILE && iwd > IWD_STEAL_THRESHOLD) {
      confidence = 'divergent';
      divergence = {
        direction: 'steal',
        magnitude: iwd - IWD_STEAL_THRESHOLD,
        explanation: `Lower pick priority (${eloPercentile}th percentile ELO) but strong performance (+${(iwd * 100).toFixed(1)}% IWD). Often available late.`,
      };
    }
    // Signals agree
    else {
      confidence = 'aligned';
    }
  }

  return {
    cardName,
    elo,
    eloPercentile,
    affinityTier: affinityTier ?? null,
    iwd: iwdData,
    gihWR,
    confidence,
    divergence,
  };
}

/**
 * Get card signals for multiple cards (e.g., a pack)
 */
export function getPackSignals(
  cardNames: string[],
  colors?: string[],
  affinityTiers?: Record<string, AffinityTier>
): CardSignal[] {
  return cardNames.map(name =>
    getCardSignal(name, colors, affinityTiers?.[name])
  );
}

/**
 * Format IWD for display
 */
export function formatIWD(iwd: IWDData): string {
  if (iwd.source === 'none' || iwd.value === null) {
    return 'N/A';
  }
  const sign = iwd.value >= 0 ? '+' : '';
  const suffix = iwd.source === 'color-filtered' && iwd.colorCombo
    ? ` (${iwd.colorCombo})`
    : '';
  return `${sign}${(iwd.value * 100).toFixed(1)}%${suffix}`;
}

/**
 * Format GIH WR for display
 */
export function formatGIHWR(gihWR: number | null): string {
  if (gihWR === null) return 'N/A';
  return `${(gihWR * 100).toFixed(1)}%`;
}

/**
 * Get a brief divergence summary for UI display
 */
export function getDivergenceSummary(signal: CardSignal): string | null {
  if (!signal.divergence) return null;

  if (signal.divergence.direction === 'trap') {
    return `⚠️ Trap: ${signal.divergence.explanation}`;
  }
  if (signal.divergence.direction === 'steal') {
    return `💎 Steal: ${signal.divergence.explanation}`;
  }
  return null;
}

/**
 * Get win rate metadata for UI display
 */
export function getWinRateMetadata(): {
  fetchedAt: string;
  totalCards: number;
  cardsWithIWD: number;
} {
  return {
    fetchedAt: WIN_RATE_DATA.metadata.fetchedAt,
    totalCards: WIN_RATE_DATA.metadata.totalCards,
    cardsWithIWD: WIN_RATE_DATA.metadata.cardsWithIWD,
  };
}

