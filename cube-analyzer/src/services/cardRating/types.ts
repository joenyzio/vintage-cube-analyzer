/**
 * Card Rating System Types
 *
 * Core types for the archetype-aware card rating system.
 * Adapted from madrury's mtg-draftbot framework.
 */

import type { CubeCard } from '../../types/card';

// ============================================
// Archetype Definitions
// ============================================

export interface ArchetypeDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  primaryColors: string[];      // Main colors for this archetype
  keyCards: string[];           // Cards that define this archetype (high signal)
  signalCards: string[];        // Cards that suggest this archetype (medium signal)
  antiSynergyCards: string[];   // Cards that actively hurt this archetype
}

// ============================================
// Card Affinity (Card → Archetype Mapping)
// ============================================

export type AffinityRole = 'enabler' | 'payoff' | 'support' | 'utility';

export interface CardAffinity {
  cardName: string;
  archetypeId: string;
  weight: number;         // -1.0 (anti-synergy) to 1.0 (perfect fit)
  role?: AffinityRole;    // What role does this card play in the archetype?
}

// Map structure: cardName → array of affinities
export type AffinityMap = Map<string, CardAffinity[]>;

// ============================================
// Draft Context (Current Draft State)
// ============================================

export interface DraftContext {
  picks: CubeCard[];
  packNumber: number;
  pickNumber: number;
  totalPicks: number;                       // picks.length for convenience
  archetypeWeights: Map<string, number>;    // Current archetype commitment (0-1)
  dominantArchetype: string | null;         // Highest weighted archetype if > threshold
  colorCounts: Record<string, number>;      // Cards per color
  mainColors: string[];                     // Colors with 3+ cards
  curveDistribution: number[];              // Cards at each CMC [0-7+]
  deckStats: DeckStats | null;
}

export interface DeckStats {
  creatures: number;
  spells: number;
  lands: number;
  artifacts: number;
  removal: number;
  cardDraw: number;
  avgCmc: number;
  manaHealth: number;                       // 0-100, how good is the mana base
}

// ============================================
// Card Rating Output
// ============================================

export interface CardRating {
  cardName: string;

  // Core scores
  baseElo: number;              // Raw CubeCobra ELO
  contextualScore: number;      // Final score after all adjustments

  // Breakdown
  archetypeBoost: number;       // Multiplier applied (e.g., 1.5 = 50% boost)
  archetypeFit: number;         // Raw affinity score before commitment scaling
  colorFit: number;             // Additive color adjustment
  curveFit: number;             // Additive curve adjustment

  // Display
  grade: string;                // A+, A, B+, etc.
  gradeReason: string;          // Why this grade
  reasons: string[];            // All adjustment reasons

  // Metadata
  percentile: number;           // Where this card ranks in current context
  isOnPlan: boolean;            // Does this card fit the current archetype?
}

// ============================================
// Commitment Levels
// ============================================

export type CommitmentLevel = 'locked' | 'committed' | 'leaning' | 'exploring' | 'open';

export interface CommitmentThreshold {
  threshold: number;    // Minimum archetype weight to reach this level
  multiplier: number;   // How much to amplify archetype affinity
}

// ============================================
// Validation Scenario (for calibration harness)
// ============================================

export interface ValidationScenario {
  name: string;
  description: string;
  packNumber: number;
  pickNumber: number;
  currentPicks: string[];       // Card names already picked
  packCards: string[];          // Card names in current pack
  expectedTop3: string[];       // Expected top 3 picks in order
  archetype?: string;           // Expected dominant archetype (optional check)
}

// ============================================
// Service Interface
// ============================================

export interface CardRatingService {
  rateCard(card: CubeCard, context: DraftContext, pack?: CubeCard[]): CardRating;
  rateAllCards(cards: CubeCard[], context: DraftContext): CardRating[];
  updateArchetypeWeights(context: DraftContext, pickedCard: CubeCard): DraftContext;
  createInitialContext(): DraftContext;
}
