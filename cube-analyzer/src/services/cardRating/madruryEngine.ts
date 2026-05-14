/**
 * Madrury Draft Bot Engine
 *
 * Direct TypeScript port of madrury's mtg-draftbot algorithm.
 * https://github.com/madrury/mtg-draftbot
 *
 * Core algorithm:
 *   1. archetype_weights: matrix (n_cards × n_archetypes) - static weights
 *   2. drafter_preferences: vector (n_archetypes) - starts at 1s, grows additively
 *   3. card_preference = dot(card_archetype_weights, drafter_preferences)
 *   4. softmax(preferences) → pick probabilities
 *   5. After pick: preferences += picked_card.archetype_weights
 *
 * Vintage Cube-specific data (archetype definitions, card affinities) comes
 * from archetypes.ts and archetypeAffinity.ts.
 */

import type { CubeCard } from '../../types/card';
import type { CardRating, DraftContext, DeckStats } from './types';
import { getEloData } from '../eloHelpers';
import { VINTAGE_CUBE_ARCHETYPES, getArchetypeIds } from './archetypes';
import { EXPLICIT_AFFINITIES, PROPERTY_RULES } from './archetypeAffinity';

// ============================================
// Constants
// ============================================

const ARCHETYPE_IDS = getArchetypeIds();
const N_ARCHETYPES = ARCHETYPE_IDS.length;

// Initial preference value (madrury uses 1.0)
const INITIAL_PREFERENCE = 1.0;

// ELO range for normalization
const ELO_RANGE = {
  min: 1240,
  max: 2377,
  median: 1650,
};

// ============================================
// Types
// ============================================

export interface MadruryContext {
  picks: CubeCard[];
  preferences: number[];  // Length = N_ARCHETYPES, drafter's archetype preferences
  packNumber: number;
  pickNumber: number;
  colorCounts: Record<string, number>;
  mainColors: string[];
  deckStats: DeckStats | null;
}

export interface MadruryRating {
  cardName: string;
  preference: number;           // Raw dot product score
  probability: number;          // Softmax probability
  normalizedScore: number;      // Scaled for display (like old contextualScore)
  archetypeContributions: { archetypeId: string; contribution: number }[];
  topArchetype: string | null;
  grade: string;
  gradeReason: string;
  reasons: string[];
  isOnPlan: boolean;
}

// ============================================
// Archetype Weights Matrix
// ============================================

// Cache for card -> archetype weights lookup
let archetypeWeightsCache: Map<string, number[]> | null = null;

/**
 * Build the archetype weights for a single card.
 * Returns array of length N_ARCHETYPES with weight for each archetype.
 */
function buildCardArchetypeWeights(card: CubeCard): number[] {
  const weights = new Array(N_ARCHETYPES).fill(0);

  // 1. Check explicit affinities
  const explicits = EXPLICIT_AFFINITIES.filter(a => a.cardName === card.name);
  for (const affinity of explicits) {
    const archetypeIndex = ARCHETYPE_IDS.indexOf(affinity.archetypeId);
    if (archetypeIndex >= 0) {
      weights[archetypeIndex] = affinity.weight;
    }
  }

  // 2. Check property rules (only if no explicit affinity for that archetype)
  for (const rule of PROPERTY_RULES) {
    const archetypeIndex = ARCHETYPE_IDS.indexOf(rule.archetypeId);
    if (archetypeIndex >= 0 && weights[archetypeIndex] === 0) {
      if (rule.check(card)) {
        weights[archetypeIndex] = rule.weight;
      }
    }
  }

  // 3. Check archetype key/signal cards
  for (let i = 0; i < VINTAGE_CUBE_ARCHETYPES.length; i++) {
    const arch = VINTAGE_CUBE_ARCHETYPES[i];
    if (weights[i] === 0) {
      if (arch.keyCards.includes(card.name)) {
        weights[i] = 1.0;  // Key cards get maximum weight
      } else if (arch.signalCards.includes(card.name)) {
        weights[i] = 0.6;  // Signal cards get good weight
      } else if (arch.antiSynergyCards.includes(card.name)) {
        weights[i] = -0.5;  // Anti-synergy cards get negative weight
      }
    }
  }

  return weights;
}

/**
 * Get archetype weights for a card (cached).
 */
export function getCardArchetypeWeights(card: CubeCard): number[] {
  if (!archetypeWeightsCache) {
    archetypeWeightsCache = new Map();
  }

  let weights = archetypeWeightsCache.get(card.name);
  if (!weights) {
    weights = buildCardArchetypeWeights(card);
    archetypeWeightsCache.set(card.name, weights);
  }

  return weights;
}

/**
 * Clear the archetype weights cache.
 */
export function clearWeightsCache(): void {
  archetypeWeightsCache = null;
}

// ============================================
// Core Algorithm Functions
// ============================================

/**
 * Compute dot product of two vectors.
 */
function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Softmax function with numerical stability.
 * Returns probabilities that sum to 1.
 */
function softmax(values: number[]): number[] {
  // Find max for numerical stability
  const maxVal = Math.max(...values);

  // Compute exp(x - max) for each value
  const exps = values.map(v => Math.exp(v - maxVal));

  // Sum of all exps
  const sumExps = exps.reduce((a, b) => a + b, 0);

  // Return normalized probabilities
  return exps.map(e => e / sumExps);
}

/**
 * Compute preference scores for all cards in a pack.
 * This is the core madrury algorithm.
 *
 * preference[card] = dot(card_archetype_weights, drafter_preferences)
 */
export function computePackPreferences(
  pack: CubeCard[],
  preferences: number[]
): { card: CubeCard; preference: number; contributions: { archetypeId: string; contribution: number }[] }[] {
  return pack.map(card => {
    const weights = getCardArchetypeWeights(card);
    const preference = dot(weights, preferences);

    // Track which archetypes contributed
    const contributions: { archetypeId: string; contribution: number }[] = [];
    for (let i = 0; i < N_ARCHETYPES; i++) {
      const contribution = weights[i] * preferences[i];
      if (Math.abs(contribution) > 0.01) {
        contributions.push({
          archetypeId: ARCHETYPE_IDS[i],
          contribution,
        });
      }
    }
    contributions.sort((a, b) => b.contribution - a.contribution);

    return { card, preference, contributions };
  });
}

interface PackPreference {
  card: CubeCard;
  preference: number;
  contributions: { archetypeId: string; contribution: number }[];
}

interface PackPreferenceWithProb extends PackPreference {
  probability: number;
}

/**
 * Compute pick probabilities using softmax.
 */
export function computePickProbabilities(
  packPreferences: PackPreference[]
): PackPreferenceWithProb[] {
  const preferences = packPreferences.map(p => p.preference);
  const probs = softmax(preferences);

  return packPreferences.map((p, i) => ({
    ...p,
    probability: probs[i],
  }));
}

/**
 * Update drafter preferences after picking a card.
 * This is the additive update from madrury's algorithm.
 *
 * preferences += picked_card_archetype_weights
 */
export function updatePreferences(
  currentPreferences: number[],
  pickedCard: CubeCard
): number[] {
  const cardWeights = getCardArchetypeWeights(pickedCard);
  return currentPreferences.map((p, i) => p + cardWeights[i]);
}

// ============================================
// Context Management
// ============================================

/**
 * Create initial drafter context.
 */
export function createInitialContext(): MadruryContext {
  return {
    picks: [],
    preferences: new Array(N_ARCHETYPES).fill(INITIAL_PREFERENCE),
    packNumber: 1,
    pickNumber: 1,
    colorCounts: {},
    mainColors: [],
    deckStats: null,
  };
}

/**
 * Update context after picking a card.
 */
export function updateContext(
  context: MadruryContext,
  pickedCard: CubeCard
): MadruryContext {
  const newPicks = [...context.picks, pickedCard];
  const newPreferences = updatePreferences(context.preferences, pickedCard);

  // Update color counts
  const newColorCounts = { ...context.colorCounts };
  for (const color of pickedCard.color_identity || []) {
    newColorCounts[color] = (newColorCounts[color] || 0) + 1;
  }

  // Update main colors (3+ cards)
  const newMainColors = Object.entries(newColorCounts)
    .filter(([_, count]) => count >= 3)
    .map(([color]) => color);

  // Calculate deck stats
  const deckStats = calculateDeckStats(newPicks);

  return {
    picks: newPicks,
    preferences: newPreferences,
    packNumber: context.packNumber,
    pickNumber: context.pickNumber + 1,
    colorCounts: newColorCounts,
    mainColors: newMainColors,
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
    manaHealth: 70,
  };
}

// ============================================
// Rating Functions (UI-compatible output)
// ============================================

/**
 * Get the dominant archetype based on ENABLERS in picked cards.
 * Enablers are more important than payoffs for archetype identification.
 * Having big creatures doesn't make you reanimator - having Reanimate does.
 */
export function getDominantArchetype(preferences: number[], picks?: CubeCard[]): { id: string; name: string; strength: number } | null {
  if (!picks || picks.length === 0) {
    // Fallback to preference-based if no picks provided
    let maxIndex = 0;
    let maxValue = preferences[0];
    for (let i = 1; i < preferences.length; i++) {
      if (preferences[i] > maxValue) {
        maxValue = preferences[i];
        maxIndex = i;
      }
    }
    if (maxValue > INITIAL_PREFERENCE + 0.5) {
      const arch = VINTAGE_CUBE_ARCHETYPES[maxIndex];
      return { id: arch.id, name: arch.name, strength: maxValue };
    }
    return null;
  }

  // Count explicit affinity cards for each archetype, weighting ENABLERS heavily
  const archetypeScores: Record<string, { enablers: number; payoffs: number; support: number }> = {};

  for (const card of picks) {
    // Check explicit affinities with role
    const explicits = EXPLICIT_AFFINITIES.filter(a => a.cardName === card.name && a.weight > 0.5);
    for (const affinity of explicits) {
      if (!archetypeScores[affinity.archetypeId]) {
        archetypeScores[affinity.archetypeId] = { enablers: 0, payoffs: 0, support: 0 };
      }
      // Weight by role: enablers are critical, payoffs are secondary
      if (affinity.role === 'enabler') {
        archetypeScores[affinity.archetypeId].enablers += affinity.weight;
      } else if (affinity.role === 'payoff') {
        archetypeScores[affinity.archetypeId].payoffs += affinity.weight * 0.3;  // Payoffs count less
      } else {
        archetypeScores[affinity.archetypeId].support += affinity.weight * 0.2;
      }
    }

    // Also check KEY cards from archetype definitions (these are always important)
    for (const arch of VINTAGE_CUBE_ARCHETYPES) {
      if (arch.keyCards.includes(card.name)) {
        if (!archetypeScores[arch.id]) {
          archetypeScores[arch.id] = { enablers: 0, payoffs: 0, support: 0 };
        }
        archetypeScores[arch.id].enablers += 1.0;  // Key cards are treated as enablers
      }
    }
  }

  // Calculate total score for each archetype
  // Require at least 1 enabler to be considered for combo archetypes
  const comboArchetypes = ['reanimator', 'storm', 'sneak', 'oath', 'artifacts'];

  let bestArchetype: string | null = null;
  let bestScore = 0;

  for (const [archId, scores] of Object.entries(archetypeScores)) {
    const totalScore = scores.enablers + scores.payoffs + scores.support;

    // Combo archetypes need MULTIPLE enablers to be viable
    // Having one Reanimate doesn't make you a reanimator deck
    if (comboArchetypes.includes(archId) && scores.enablers < 1.5) {
      continue;  // Skip if fewer than ~2 enablers
    }

    // Fair archetypes (midrange, aggro, control, tempo, ramp) just need enough cards
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestArchetype = archId;
    }
  }

  if (bestArchetype && bestScore >= 0.5) {
    const arch = VINTAGE_CUBE_ARCHETYPES.find(a => a.id === bestArchetype);
    if (arch) {
      // Normalize strength to 0-1 range
      const strength = Math.min(1, bestScore / 3);
      return { id: arch.id, name: arch.name, strength };
    }
  }

  return null;
}

/**
 * Convert preference to letter grade.
 */
function preferenceToGrade(probability: number): { grade: string; gradeReason: string } {
  if (probability >= 0.25) return { grade: 'A+', gradeReason: 'Top pick (>25% prob)' };
  if (probability >= 0.15) return { grade: 'A', gradeReason: 'Excellent (15-25% prob)' };
  if (probability >= 0.10) return { grade: 'A-', gradeReason: 'Very good (10-15% prob)' };
  if (probability >= 0.07) return { grade: 'B+', gradeReason: 'Good (7-10% prob)' };
  if (probability >= 0.05) return { grade: 'B', gradeReason: 'Solid (5-7% prob)' };
  if (probability >= 0.03) return { grade: 'B-', gradeReason: 'Playable (3-5% prob)' };
  if (probability >= 0.02) return { grade: 'C+', gradeReason: 'Filler (2-3% prob)' };
  if (probability >= 0.01) return { grade: 'C', gradeReason: 'Weak (1-2% prob)' };
  return { grade: 'F', gradeReason: 'Bottom of pack (<1% prob)' };
}

/**
 * Rate all cards in a pack.
 * Main entry point for UI integration.
 */
export function rateAllCards(
  pack: CubeCard[],
  context: MadruryContext
): MadruryRating[] {
  // Compute preferences for all cards
  const packPrefs = computePackPreferences(pack, context.preferences);

  // Compute softmax probabilities
  const withProbs = computePickProbabilities(packPrefs);

  // Get dominant archetype for "on plan" calculation
  const dominant = getDominantArchetype(context.preferences, context.picks);

  // Convert to rating format
  return withProbs.map(({ card, preference, probability, contributions }) => {
    const { grade, gradeReason } = preferenceToGrade(probability);

    // Build reasons list
    const reasons: string[] = [];
    const topContrib = contributions[0];
    if (topContrib && topContrib.contribution > 0.1) {
      const arch = VINTAGE_CUBE_ARCHETYPES.find(a => a.id === topContrib.archetypeId);
      reasons.push(`+${topContrib.contribution.toFixed(2)} ${arch?.shortName || topContrib.archetypeId}`);
    }

    // Check for anti-synergy
    const negContrib = contributions.find(c => c.contribution < -0.1);
    if (negContrib) {
      const arch = VINTAGE_CUBE_ARCHETYPES.find(a => a.id === negContrib.archetypeId);
      reasons.push(`${negContrib.contribution.toFixed(2)} anti-${arch?.shortName || negContrib.archetypeId}`);
    }

    // Determine if on plan
    const isOnPlan = dominant === null || contributions.some(
      c => c.archetypeId === dominant.id && c.contribution > 0
    );

    // Normalize score for display (scale preference to ELO-like range)
    // Base ELO + preference contribution
    const baseElo = getEloData(card.name)?.elo ?? ELO_RANGE.median;
    const normalizedScore = baseElo + (preference * 200);

    return {
      cardName: card.name,
      preference,
      probability,
      normalizedScore,
      archetypeContributions: contributions,
      topArchetype: topContrib?.archetypeId || null,
      grade,
      gradeReason,
      reasons,
      isOnPlan,
    };
  }).sort((a, b) => b.preference - a.preference);
}

/**
 * Rate a single card.
 */
export function rateCard(
  card: CubeCard,
  context: MadruryContext,
  pack?: CubeCard[]
): MadruryRating {
  // If we have the full pack, rate all and find this card
  if (pack) {
    const ratings = rateAllCards(pack, context);
    const rating = ratings.find(r => r.cardName === card.name);
    if (rating) return rating;
  }

  // Otherwise compute standalone (less accurate without pack context)
  const weights = getCardArchetypeWeights(card);
  const preference = dot(weights, context.preferences);

  const contributions: { archetypeId: string; contribution: number }[] = [];
  for (let i = 0; i < N_ARCHETYPES; i++) {
    const contribution = weights[i] * context.preferences[i];
    if (Math.abs(contribution) > 0.01) {
      contributions.push({ archetypeId: ARCHETYPE_IDS[i], contribution });
    }
  }
  contributions.sort((a, b) => b.contribution - a.contribution);

  const dominant = getDominantArchetype(context.preferences, context.picks);
  const baseElo = getEloData(card.name)?.elo ?? ELO_RANGE.median;
  const normalizedScore = baseElo + (preference * 200);

  // Estimate probability (rough without full pack)
  const probability = 1 / (pack?.length || 15);
  const { grade, gradeReason } = preferenceToGrade(probability);

  const reasons: string[] = [];
  const topContrib = contributions[0];
  if (topContrib && topContrib.contribution > 0.1) {
    const arch = VINTAGE_CUBE_ARCHETYPES.find(a => a.id === topContrib.archetypeId);
    reasons.push(`+${topContrib.contribution.toFixed(2)} ${arch?.shortName || topContrib.archetypeId}`);
  }

  const isOnPlan = dominant === null || contributions.some(
    c => c.archetypeId === dominant.id && c.contribution > 0
  );

  return {
    cardName: card.name,
    preference,
    probability,
    normalizedScore,
    archetypeContributions: contributions,
    topArchetype: topContrib?.archetypeId || null,
    grade,
    gradeReason,
    reasons,
    isOnPlan,
  };
}

// ============================================
// Compatibility Layer
// ============================================

/**
 * Convert MadruryContext to legacy DraftContext format.
 * For backwards compatibility with existing code.
 */
export function toLegacyContext(context: MadruryContext): DraftContext {
  // Convert preferences array to Map
  const archetypeWeights = new Map<string, number>();
  for (let i = 0; i < N_ARCHETYPES; i++) {
    // Normalize to 0-1 range (subtract initial, divide by reasonable max)
    const normalized = Math.max(0, Math.min(1, (context.preferences[i] - INITIAL_PREFERENCE) / 3));
    archetypeWeights.set(ARCHETYPE_IDS[i], normalized);
  }

  const dominant = getDominantArchetype(context.preferences, context.picks);

  // Build curve distribution
  const curveDistribution = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const card of context.picks) {
    const cmc = Math.min(7, Math.floor(card.cmc ?? 0));
    curveDistribution[cmc]++;
  }

  return {
    picks: context.picks,
    packNumber: context.packNumber,
    pickNumber: context.pickNumber,
    totalPicks: context.picks.length,
    archetypeWeights,
    dominantArchetype: dominant?.id || null,
    colorCounts: context.colorCounts,
    mainColors: context.mainColors,
    curveDistribution,
    deckStats: context.deckStats,
  };
}

/**
 * Convert MadruryRating to legacy CardRating format.
 * For backwards compatibility with existing UI.
 */
export function toLegacyRating(rating: MadruryRating, baseElo?: number): CardRating {
  const elo = baseElo ?? getEloData(rating.cardName)?.elo ?? ELO_RANGE.median;

  // Map preference to archetypeBoost (how much the archetype is helping)
  const archetypeBoost = rating.preference > 0 ? 1 + (rating.preference / 2) : 1 / (1 - rating.preference);

  return {
    cardName: rating.cardName,
    baseElo: elo,
    contextualScore: rating.normalizedScore,
    archetypeBoost,
    archetypeFit: rating.preference,
    colorFit: 0,  // Madrury doesn't use separate color fit
    curveFit: 0,  // Madrury doesn't use separate curve fit
    grade: rating.grade,
    gradeReason: rating.gradeReason,
    reasons: rating.reasons,
    percentile: rating.probability,
    isOnPlan: rating.isOnPlan,
  };
}

// ============================================
// Exports for Simulation
// ============================================

export { ARCHETYPE_IDS, N_ARCHETYPES };
