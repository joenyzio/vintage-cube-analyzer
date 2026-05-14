/**
 * Draft Simulator Types
 *
 * All type definitions for the draft simulator system.
 */

import type { CubeCard } from './card';

// =============================================================================
// Core Mode Types
// =============================================================================

export type SimulatorMode = 'menu' | 'draft' | 'quiz' | 'results';

export type DraftPhase = 'speculation' | 'exploration' | 'commitment' | 'completion';

export type ContextualGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

// =============================================================================
// Draft History & Stats
// =============================================================================

export interface DraftHistoryEntry {
  id: string;
  date: string;
  deckElo: number;
  grade: string;
  optimalRate: number;
  mainColors: string[];
  totalPicks: number;
  topPicks: { name: string; elo: number }[];
}

export interface DraftStats {
  totalDrafts: number;
  totalPicks: number;
  avgOptimalRate: number;
  avgDeckElo: number;
  bestGrade: string;
  perfectPacks: number;
  streakOptimal: number;
  maxStreakOptimal: number;
  rarePicks: number;
  quizAccuracy: number;
  quizTotal: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: DraftStats) => boolean;
}

// =============================================================================
// Pick Tracking
// =============================================================================

export interface PickDecision {
  pick: CubeCard;
  packNumber: number;
  pickNumber: number;
  packContents: CubeCard[];
  bestAvailable: CubeCard;
  passed: CubeCard[];
  wasOptimal: boolean;
  eloDiff: number;
}

export interface CardEloHistory {
  cardId: string;
  cardName: string;
  baseElo: number;
  history: { pick: number; adjustedElo: number; adjustment: number }[];
}

// =============================================================================
// Archetype & Analysis
// =============================================================================

export interface ArchetypeCommitment {
  archetype: string;
  probability: number;
  keyCardsOwned: string[];
  keyCardsMissing: string[];
  criticalMass: { current: number; needed: number; category: string }[];
}

export interface DraftSignals {
  colorsCut: { color: string; intensity: number }[];
  colorsOpen: { color: string; confidence: number }[];
  lateSignals: { card: CubeCard; pick: number; pack: number; colors: string[] }[];
  rightNeighborColors: string[];
  leftNeighborColors: string[];
}

export interface EnablerPayoffBalance {
  archetype: string;
  enablers: { card: CubeCard; role: string }[];
  payoffs: { card: CubeCard; role: string }[];
  balance: 'needs-enablers' | 'needs-payoffs' | 'balanced' | 'not-applicable';
  recommendation: string;
}

export interface ManaBaseStatus {
  colorsNeeded: { color: string; sources: number; cardsRequiring: number }[];
  fixingCards: CubeCard[];
  splashViability: { color: string; viable: boolean; reason: string }[];
  recommendation: string;
}

// =============================================================================
// Draft State
// =============================================================================

export interface DraftState {
  tablePacks: CubeCard[][];
  picks: CubeCard[];
  packNumber: number;
  pickNumber: number;
  direction: 'left' | 'right';
  isComplete: boolean;
  usedCardIds: Set<string>;
  passedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>;
  decisions: PickDecision[];
  allPlayerPicks: CubeCard[][];
  cardEloHistory: Map<string, CardEloHistory>;
  seenCards: Set<string>;
  regrettablePasses: Map<string, { card: CubeCard; passedAt: number; whyRegret: string }>;
  wheeledCards: Map<string, { card: CubeCard; originalPick: number; wheeledAt: number }>;
}

export interface QuizState {
  currentPack: CubeCard[];
  correctCard: CubeCard;
  userPick: CubeCard | null;
  revealed: boolean;
  history: { correct: boolean; userPick: CubeCard; correctPick: CubeCard }[];
  totalQuestions: number;
}

export interface QuizDraftStats {
  correct: number;
  total: number;
  totalEloDiff: number;
  history: { pick: CubeCard; best: CubeCard; wasCorrect: boolean; eloDiff: number }[];
}

// =============================================================================
// Deck Analysis
// =============================================================================

export interface DeckWinRateEstimate {
  estimate: number;
  confidence: 'low' | 'medium' | 'high';
  factors: { factor: string; impact: number; description: string }[];
}

export interface CurveAnalysis {
  distribution: { cmc: number; count: number; ideal: number }[];
  avgCmc: number;
  assessment: 'too-low' | 'good' | 'too-high';
  recommendation: string;
}

export interface DeckNeeds {
  creatures: { current: number; ideal: number; status: 'low' | 'good' | 'high' };
  removal: { current: number; ideal: number; status: 'low' | 'good' | 'high' };
  cardDraw: { current: number; ideal: number; status: 'low' | 'good' | 'high' };
  lands: { current: number; status: 'low' | 'good' | 'high' };
  recommendations: string[];
}

export interface DraftGrade {
  grade: string;
  deckElo: number;
  optimalPicks: number;
  totalDecisions: number;
  optimalRate: number;
  totalEloDiff: number;
  assessment: string;
  worstPicks: PickDecision[];
  bestPicks: PickDecision[];
}

// =============================================================================
// Coach System
// =============================================================================

export interface CoachExplanation {
  recommendation: CubeCard | null;
  reasons: string[];
  alternatives: { card: CubeCard; reason: string }[];
  deckContext: string;
  phaseAdvice: string;
}

// =============================================================================
// Props
// =============================================================================

export interface DraftSimulatorProps {
  cards: CubeCard[];
}

// =============================================================================
// AI Players
// =============================================================================

export interface AIPlayer {
  name: string;
  colors: string[];
}

// =============================================================================
// Pack Stats
// =============================================================================

export interface PackEloStats {
  avg: number;
  best: number;
  worst: number;
  spread: number;
}
