/**
 * Draft Utilities
 *
 * Pure utility functions for the draft simulator.
 */

import type { CubeCard } from '../types/card';
import type {
  DraftPhase,
  ContextualGrade,
  CurveAnalysis,
  DeckNeeds,
} from '../types/draftSimulator';
import { getPercentile } from './eloHelpers';
import {
  rateCard,
  createInitialContext,
  updateContext,
  updateArchetypeWeights,
} from './cardRating';

// =============================================================================
// Array Utilities
// =============================================================================

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// Storage Utilities
// =============================================================================

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

// =============================================================================
// Draft Phase Analysis
// =============================================================================

export function getDraftPhase(
  pickNumber: number,
  packNumber: number
): { phase: DraftPhase; description: string; priority: string } {
  const totalPick = (packNumber - 1) * 15 + pickNumber;

  if (totalPick <= 5) {
    return {
      phase: 'speculation',
      description: 'Speculation Phase',
      priority: "Take the most powerful cards. Stay flexible. Don't commit to colors yet.",
    };
  } else if (totalPick <= 15) {
    return {
      phase: 'exploration',
      description: 'Exploration Phase',
      priority: 'Find your lane. Look for signals. Start favoring 1-2 colors.',
    };
  } else if (totalPick <= 30) {
    return {
      phase: 'commitment',
      description: 'Commitment Phase',
      priority: 'Lock in your archetype. Take synergy over raw power. Fill holes.',
    };
  } else {
    return {
      phase: 'completion',
      description: 'Completion Phase',
      priority: 'Complete the deck. Prioritize curve, fixing, and sideboard.',
    };
  }
}

// =============================================================================
// Grade Calculation
// =============================================================================

export function getContextualGrade(
  card: CubeCard,
  picks: CubeCard[],
  _currentPack?: CubeCard[]
): { grade: ContextualGrade; reason: string } {
  const percentile = getPercentile(card.name);
  const totalPicks = picks.length;

  // Color analysis
  const colorCts: Record<string, number> = {};
  picks.forEach(c => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
  const mainColors = Object.entries(colorCts).filter(([_, count]) => count >= 2).map(([color]) => color);

  const cardColors = card.color_identity || [];
  const isColorless = cardColors.length === 0;
  const isOnColor = isColorless || cardColors.every(c => mainColors.includes(c));
  const isSplash = !isOnColor && cardColors.some(c => mainColors.includes(c));

  // Base grade from percentile
  let baseGrade: ContextualGrade;
  if (percentile >= 98) baseGrade = 'A+';
  else if (percentile >= 93) baseGrade = 'A';
  else if (percentile >= 85) baseGrade = 'A-';
  else if (percentile >= 75) baseGrade = 'B+';
  else if (percentile >= 65) baseGrade = 'B';
  else if (percentile >= 55) baseGrade = 'B-';
  else if (percentile >= 45) baseGrade = 'C+';
  else if (percentile >= 35) baseGrade = 'C';
  else if (percentile >= 25) baseGrade = 'C-';
  else if (percentile >= 15) baseGrade = 'D';
  else baseGrade = 'F';

  let reason = '';

  // Early draft - power matters most
  if (totalPicks < 5) {
    reason = 'Raw power';
    return { grade: baseGrade, reason };
  }

  // Color adjustment
  if (!isOnColor && totalPicks >= 10) {
    // Downgrade off-color cards
    const grades: ContextualGrade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
    const idx = grades.indexOf(baseGrade);
    const downgrade = isSplash ? 2 : 4;
    const newIdx = Math.min(grades.length - 1, idx + downgrade);
    reason = isSplash ? 'Splash' : 'Off-color';
    return { grade: grades[newIdx], reason };
  }

  reason = isOnColor ? 'On-color' : 'Flexible';
  return { grade: baseGrade, reason };
}

// =============================================================================
// Curve Analysis
// =============================================================================

export function getCurveAnalysis(picks: CubeCard[]): CurveAnalysis {
  const nonLands = picks.filter(p => !p.type_line?.toLowerCase().includes('land'));

  const distribution: { cmc: number; count: number; ideal: number }[] = [];
  const idealCurve: Record<number, number> = { 0: 1, 1: 4, 2: 6, 3: 5, 4: 3, 5: 2, 6: 2 };

  for (let cmc = 0; cmc <= 6; cmc++) {
    const count = nonLands.filter(p => {
      const cardCmc = p.cmc || 0;
      return cmc === 6 ? cardCmc >= 6 : cardCmc === cmc;
    }).length;
    distribution.push({ cmc, count, ideal: idealCurve[cmc] || 0 });
  }

  const totalCmc = nonLands.reduce((sum, p) => sum + (p.cmc || 0), 0);
  const avgCmc = nonLands.length > 0 ? totalCmc / nonLands.length : 0;

  let assessment: 'too-low' | 'good' | 'too-high';
  let recommendation: string;

  if (avgCmc < 2.3) {
    assessment = 'too-low';
    recommendation = 'Consider some higher-impact cards';
  } else if (avgCmc > 3.5) {
    assessment = 'too-high';
    recommendation = 'Need more early plays';
  } else {
    assessment = 'good';
    recommendation = 'Curve looks healthy';
  }

  return { distribution, avgCmc, assessment, recommendation };
}

// =============================================================================
// Deck Needs Analysis
// =============================================================================

export function getDeckNeeds(picks: CubeCard[]): DeckNeeds {
  const creatures = picks.filter(p => p.type_line?.toLowerCase().includes('creature')).length;
  const removal = picks.filter(p => {
    const t = p.oracle_text?.toLowerCase() || '';
    return t.includes('destroy target') || t.includes('exile target') ||
           (t.includes('damage') && t.includes('any target'));
  }).length;
  const cardDraw = picks.filter(p => (p.oracle_text?.toLowerCase() || '').includes('draw a card')).length;
  const lands = picks.filter(p => p.type_line?.toLowerCase().includes('land')).length;

  const recommendations: string[] = [];

  const creatureStatus = creatures < 8 ? 'low' : creatures > 15 ? 'high' : 'good';
  const removalStatus = removal < 2 ? 'low' : removal > 6 ? 'high' : 'good';
  const cardDrawStatus = cardDraw < 2 ? 'low' : cardDraw > 8 ? 'high' : 'good';
  const landStatus = lands < 1 ? 'low' : lands > 5 ? 'high' : 'good';

  if (creatureStatus === 'low') recommendations.push('Prioritize creatures');
  if (removalStatus === 'low') recommendations.push('Need removal spells');
  if (cardDrawStatus === 'low') recommendations.push('Add card draw');

  return {
    creatures: { current: creatures, ideal: 12, status: creatureStatus },
    removal: { current: removal, ideal: 4, status: removalStatus },
    cardDraw: { current: cardDraw, ideal: 4, status: cardDrawStatus },
    lands: { current: lands, status: landStatus },
    recommendations,
  };
}

// =============================================================================
// Color Analysis
// =============================================================================

export function getColorCounts(picks: CubeCard[]): Record<string, number> {
  const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  picks.forEach(card => {
    card.color_identity?.forEach(color => {
      if (counts[color] !== undefined) {
        counts[color]++;
      }
    });
  });
  return counts;
}

export function getMainColors(picks: CubeCard[]): string[] {
  const counts = getColorCounts(picks);
  return Object.entries(counts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);
}

// =============================================================================
// Deck Stats
// =============================================================================

export function calculateDeckStats(picks: CubeCard[]): {
  creatures: number;
  spells: number;
  lands: number;
  avgCmc: number;
} {
  const creatures = picks.filter(p => p.type_line?.toLowerCase().includes('creature')).length;
  const lands = picks.filter(p => p.type_line?.toLowerCase().includes('land')).length;
  const spells = picks.length - creatures - lands;

  const nonLands = picks.filter(p => !p.type_line?.toLowerCase().includes('land'));
  const totalCmc = nonLands.reduce((sum, p) => sum + (p.cmc || 0), 0);
  const avgCmc = nonLands.length > 0 ? totalCmc / nonLands.length : 0;

  return { creatures, spells, lands, avgCmc };
}

// =============================================================================
// Synergy-Adjusted ELO
// =============================================================================

/**
 * Calculate synergy-adjusted ELO for a card given current picks.
 * Uses the multiplicative archetype-aware rating system.
 */
export function getSynergyAdjustedElo(
  card: CubeCard,
  picks: CubeCard[],
  currentPack?: CubeCard[]
): { baseElo: number; adjustedElo: number; adjustment: number; reasons: string[] } {
  // Build draft context from picks
  let context = createInitialContext();

  // Infer pack/pick numbers from total picks
  const totalPicks = picks.length;
  context.packNumber = Math.floor(totalPicks / 15) + 1;
  context.pickNumber = (totalPicks % 15) + 1;

  // Rebuild context by processing all prior picks
  for (const pick of picks) {
    const newWeights = updateArchetypeWeights(context.archetypeWeights, pick);
    context = updateContext(context, pick, newWeights);
  }

  // Rate the card using the new system
  const rating = rateCard(card, context, currentPack);

  // Map to legacy interface for compatibility
  const adjustment = Math.round(rating.contextualScore - rating.baseElo);

  return {
    baseElo: Math.round(rating.baseElo),
    adjustedElo: Math.round(rating.contextualScore),
    adjustment,
    reasons: rating.reasons.length > 0 ? rating.reasons :
      rating.archetypeBoost > 1.1 ? [`×${rating.archetypeBoost.toFixed(2)} archetype fit`] :
      ['Base ELO']
  };
}
