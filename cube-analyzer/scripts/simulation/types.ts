/**
 * Draft Simulation Types
 *
 * Type definitions for the draft simulation system.
 */

import type { CubeCard } from '../../src/types/card';
import type { DraftContext } from '../../src/services/cardRating/types';

// ============================================
// Draft Simulation Types
// ============================================

export interface DrafterState {
  id: number;
  pool: CubeCard[];
  context: DraftContext;
}

export interface PackState {
  cards: CubeCard[];
  originalDrafterId: number;  // Who opened this pack
  round: number;
}

export interface PickLogEntry {
  round: number;
  pick: number;
  drafterId: number;
  cardPicked: string;
  packContents: string[];        // Full pack contents before pick
  topRatings: { card: string; score: number }[];
}

export interface DraftResult {
  seed: number;
  decks: BuiltDeck[];
  pickLog: PickLogEntry[];
}

// ============================================
// Deck Building Types
// ============================================

export interface BuiltDeck {
  drafterId: number;
  mainDeck: CubeCard[];          // 40 cards
  sideboard: CubeCard[];         // Remaining cards

  // Composition
  lands: number;                  // Always 17
  spells: number;                 // Always 23
  colors: string[];               // ['U', 'W'] etc.

  // Stats
  avgCmc: number;
  creatureCount: number;
  removalCount: number;
  cardDrawCount: number;

  // Archetype
  finalArchetype: string | null;
  archetypeCommitment: number;    // 0-1

  // Quality
  deckQuality: number;            // Avg contextualScore of 23 non-land main deck cards

  // Build metadata
  draftedLandsUsed: number;       // How many lands from pool made main deck
  basicsAdded: number;            // How many basics added
  insufficientPoolDepth: boolean; // True if < 17 castable non-lands
}

// ============================================
// Analysis Types
// ============================================

export interface CardStats {
  pickCount: number;              // Times picked across all drafts
  totalAppearances: number;       // Times appeared in a pack
  avgPickPosition: number;        // Average pick # (1-45)
  wheelCount: number;             // Times it wheeled back to same drafter
  wheelOpportunities: number;     // Times it could have wheeled
  archetypeBreakdown: Record<string, number>;  // Which archetypes take this card
  sideboardCount: number;         // Times it ended in sideboard
}

export interface ArchetypeStats {
  count: number;                  // Decks with this as dominant archetype
  avgCommitment: number;          // Average commitment level
  avgDeckQuality: number;         // Average deck quality
}

export interface DeckProfileStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface ArchetypeSubtype {
  colorCombo: string;           // "BGU", "BRG", etc.
  name: string;                 // "Sultai", "Jund", etc.
  count: number;
  avgDeckQuality: number;
  avgCmc: number;
  topCards: string[];           // Most common cards in this variant
}

// Legacy alias for backwards compatibility
export type MidrangeSubtype = ArchetypeSubtype;

export interface AggregateAnalysis {
  draftCount: number;
  totalDecks: number;

  // Archetype emergence
  archetypeDistribution: Record<string, ArchetypeStats>;

  // Archetype breakdowns by color
  midrangeSubtypes: Record<string, ArchetypeSubtype>;
  aggroSubtypes: Record<string, ArchetypeSubtype>;
  tempoSubtypes: Record<string, ArchetypeSubtype>;

  // Card-level data
  cardStats: Record<string, CardStats>;

  // Color balance
  colorDistribution: Record<string, number>;      // Single colors
  colorPairDistribution: Record<string, number>;  // Color combinations

  // Deck composition stats
  deckProfiles: {
    creatures: DeckProfileStats;
    removal: DeckProfileStats;
    cardDraw: DeckProfileStats;
    avgCmc: DeckProfileStats;
    deckQuality: DeckProfileStats;
  };

  // Anomalies
  consistentWheelers: string[];     // Cards that wheel > 80%
  neverWheelers: string[];          // Cards that wheel < 5%
  consistentSideboards: string[];   // Cards in sideboard > 50%
  colorImbalances: string[];        // Colors appearing < 30% or > 70%
  insufficientPoolCount: number;    // Decks with pool depth issues

  // Sanity check results
  sanityChecks: {
    allDecks40Cards: boolean;
    allDecks17Lands: boolean;
    noDuplicatesInDraft: boolean;
    allCardsPickedAtLeastOnce: boolean;
    archetyesDiverse: boolean;      // At least 5 archetypes > 1%
  };
}

// ============================================
// Configuration Types
// ============================================

export interface SimulationConfig {
  draftCount: number;
  seed?: number;
  verbose?: boolean;
}

// ============================================
// Deck Analysis Types (re-exported)
// ============================================

export type {
  DeckQualityMetrics,
  PoolAnalysis,
  CardInclusion,
  DraftVsDeckComparison,
  AggregatedDeckAnalysis,
  CardCutPattern,
  CardInclusionPattern,
  DeckOutlier,
} from './deck-analysis';
