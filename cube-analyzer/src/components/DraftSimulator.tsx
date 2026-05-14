import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  calculateDeckElo,
  compareByElo,
} from '../services/eloHelpers';
import {
  getCardSimStats,
  getWheelRate,
  getWheelCategory,
  getAvgPickPosition,
  getTopArchetypesForCard,
  getArchetypeContext,
  getCardInsightSummary,
} from '../services/simulationInsights';
import {
  rateCard,
  rateAllCards,
  createInitialContext,
  updateContext,
  updateArchetypeWeights,
  type DraftContext,
  type CardRating,
} from '../services/cardRating';
import { Play, RotateCcw, Trophy, Star, ArrowLeft, ArrowRight, Users, Package, Target, Clock, TrendingUp, AlertCircle, HelpCircle, CheckCircle, XCircle, Zap, History, Keyboard, Award, Lightbulb, Eye, EyeOff } from 'lucide-react';

type SimulatorMode = 'menu' | 'draft' | 'quiz' | 'results';

// Draft history for persistence
interface DraftHistoryEntry {
  id: string;
  date: string;
  deckElo: number;
  grade: string;
  optimalRate: number;
  mainColors: string[];
  totalPicks: number;
  topPicks: { name: string; elo: number }[];
}

// Achievement definitions
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: DraftStats) => boolean;
}

interface DraftStats {
  totalDrafts: number;
  totalPicks: number;
  avgOptimalRate: number;
  avgDeckElo: number;
  bestGrade: string;
  perfectPacks: number; // All picks optimal in a pack
  streakOptimal: number; // Current streak of optimal picks
  maxStreakOptimal: number;
  rarePicks: number; // Cards with <25% pick rate
  quizAccuracy: number;
  quizTotal: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-draft', name: 'First Draft', description: 'Complete your first draft', icon: '🎯', condition: (s) => s.totalDrafts >= 1 },
  { id: 'deck-builder', name: 'Deck Builder', description: 'Complete 5 drafts', icon: '🏗️', condition: (s) => s.totalDrafts >= 5 },
  { id: 'veteran', name: 'Draft Veteran', description: 'Complete 25 drafts', icon: '🎖️', condition: (s) => s.totalDrafts >= 25 },
  { id: 's-tier', name: 'S Tier', description: 'Get an S grade on a draft', icon: '🏆', condition: (s) => s.bestGrade === 'S' },
  { id: 'perfectionist', name: 'Perfectionist', description: '80%+ optimal pick rate', icon: '💎', condition: (s) => s.avgOptimalRate >= 80 },
  { id: 'streak-5', name: 'Hot Streak', description: '5 optimal picks in a row', icon: '🔥', condition: (s) => s.maxStreakOptimal >= 5 },
  { id: 'streak-10', name: 'On Fire', description: '10 optimal picks in a row', icon: '⚡', condition: (s) => s.maxStreakOptimal >= 10 },
  { id: 'gem-hunter', name: 'Gem Hunter', description: 'Pick 10 underrated cards', icon: '💠', condition: (s) => s.rarePicks >= 10 },
  { id: 'quiz-master', name: 'Quiz Master', description: '90%+ quiz accuracy (10+ questions)', icon: '🧠', condition: (s) => s.quizTotal >= 10 && s.quizAccuracy >= 90 },
  { id: 'elite-deck', name: 'Elite Deck', description: 'Build a deck with 1700+ avg ELO', icon: '👑', condition: (s) => s.avgDeckElo >= 1700 },
];

interface DraftSimulatorProps {
  cards: CubeCard[];
}

// Track each pick decision for analysis
interface PickDecision {
  pick: CubeCard;
  packNumber: number;
  pickNumber: number;
  packContents: CubeCard[]; // What was in the pack
  bestAvailable: CubeCard; // Highest ELO card
  passed: CubeCard[]; // What we passed
  wasOptimal: boolean; // Did we pick the best ELO?
  eloDiff: number; // How much ELO we left on the table (if any)
}

// Track how a card's adjusted ELO changes over the draft
interface CardEloHistory {
  cardId: string;
  cardName: string;
  baseElo: number;
  history: { pick: number; adjustedElo: number; adjustment: number }[];
}

// Track archetype commitment probabilities
interface ArchetypeCommitment {
  archetype: string;
  probability: number; // 0-100
  keyCardsOwned: string[];
  keyCardsMissing: string[];
  criticalMass: { current: number; needed: number; category: string }[];
}

// Track signals about what's open at the table
interface DraftSignals {
  // Colors being cut (high pick rate by others)
  colorsCut: { color: string; intensity: number }[]; // intensity 0-100
  // Colors that are open (wheeling consistently)
  colorsOpen: { color: string; confidence: number }[];
  // Late picks that signal openness
  lateSignals: { card: CubeCard; pick: number; pack: number; colors: string[] }[];
  // What the player to our right seems to be drafting
  rightNeighborColors: string[];
  // What the player to our left seems to be drafting
  leftNeighborColors: string[];
}

// Track enabler/payoff balance for combo archetypes
interface EnablerPayoffBalance {
  archetype: string;
  enablers: { card: CubeCard; role: string }[];
  payoffs: { card: CubeCard; role: string }[];
  balance: 'needs-enablers' | 'needs-payoffs' | 'balanced' | 'not-applicable';
  recommendation: string;
}

// Track mana base requirements
interface ManaBaseStatus {
  colorsNeeded: { color: string; sources: number; cardsRequiring: number }[];
  fixingCards: CubeCard[];
  splashViability: { color: string; viable: boolean; reason: string }[];
  recommendation: string;
}

// Draft phase for contextual advice
type DraftPhase = 'speculation' | 'exploration' | 'commitment' | 'completion';

interface DraftState {
  tablePacks: CubeCard[][];
  picks: CubeCard[];
  packNumber: number;
  pickNumber: number;
  direction: 'left' | 'right';
  isComplete: boolean;
  // Track all cards used in draft (dealt to any player) to prevent repeats
  usedCardIds: Set<string>;
  // New: Pack memory for wheel predictions
  passedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>;
  // New: Decision history for recap
  decisions: PickDecision[];
  // Track all 8 players' picks for post-draft analysis
  allPlayerPicks: CubeCard[][];
  // Track adjusted ELO history for cards we've seen
  cardEloHistory: Map<string, CardEloHistory>;
  // All cards we've seen in packs (for tracking)
  seenCards: Set<string>;
  // NEW: Track what we passed and might regret
  regrettablePasses: Map<string, { card: CubeCard; passedAt: number; whyRegret: string }>;
  // NEW: Track cards that wheeled back to us
  wheeledCards: Map<string, { card: CubeCard; originalPick: number; wheeledAt: number }>;
}

interface QuizState {
  currentPack: CubeCard[];
  correctCard: CubeCard;
  userPick: CubeCard | null;
  revealed: boolean;
  history: { correct: boolean; userPick: CubeCard; correctPick: CubeCard }[];
  totalQuestions: number;
}

const NUM_PLAYERS = 8;
const CARDS_PER_PACK = 15;

// AI player names and their color preferences for display
const AI_PLAYERS = [
  { name: 'You', colors: [] },
  { name: 'Dimir Drafter', colors: ['U', 'B'] },
  { name: 'Boros Drafter', colors: ['R', 'W'] },
  { name: 'Simic Drafter', colors: ['U', 'G'] },
  { name: 'Rakdos Drafter', colors: ['B', 'R'] },
  { name: 'Azorius Drafter', colors: ['U', 'W'] },
  { name: 'Selesnya Drafter', colors: ['G', 'W'] },
  { name: 'Izzet Drafter', colors: ['U', 'R'] },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// CONTEXT-AWARE PICK ALGORITHM
// Uses CUMULATIVE draft knowledge across ALL packs, trajectory analysis (EWMA),
// deck role needs, curve analysis, and archetype synergies.
// Inspired by 17lands methodology and professional draft theory.
// The algorithm treats the draft as ONE continuous session - like card counting.
// ============================================================================
function getContextAwareBestPick(
  pack: CubeCard[],
  picks: CubeCard[],
  cardEloHistory?: Map<string, { baseElo: number; history: Array<{ pick: number; adjustedElo: number; adjustment: number }> }>
): { bestCard: CubeCard; score: number } {
  const pickNames = picks.map(p => p.name);
  const totalPicks = picks.length; // CUMULATIVE across all packs

  // === CUMULATIVE DECK ANALYSIS ===
  const colorCts: Record<string, number> = {};
  picks.forEach(c => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
  const mainColors = Object.entries(colorCts).filter(([_, count]) => count >= 2).map(([color]) => color);

  // Curve analysis (cumulative)
  const cmcCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  picks.filter(p => !p.type_line?.toLowerCase().includes('land')).forEach(p => {
    const cmc = Math.min(5, p.cmc || 0);
    cmcCounts[cmc] = (cmcCounts[cmc] || 0) + 1;
  });

  // Role analysis (cumulative)
  const creatures = picks.filter(p => p.type_line?.toLowerCase().includes('creature')).length;
  const removal = picks.filter(p => {
    const t = p.oracle_text?.toLowerCase() || '';
    return t.includes('destroy target') || t.includes('exile target') || (t.includes('damage') && t.includes('any target'));
  }).length;
  const cardDraw = picks.filter(p => (p.oracle_text?.toLowerCase() || '').includes('draw a card')).length;

  // Archetype detection (cumulative)
  const hasTinker = pickNames.includes('Tinker') || pickNames.includes('Tolarian Academy');
  const hasReanimation = picks.some(p => ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume', 'Shallow Grave'].includes(p.name));
  const hasShowTell = picks.some(p => ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Omniscience'].includes(p.name));
  const hasStorm = picks.some(p => ['Brain Freeze', 'Tendrils of Agony', "Yawgmoth's Will", 'Underworld Breach', 'Mind\'s Desire'].includes(p.name));

  // === SCORE EACH CARD ===
  const scored = pack.map(card => {
    let score = 0;
    const elo = getEloData(card.name)?.elo || 1500;
    const percentile = getPercentile(card.name);
    const cardColors = card.color_identity || [];
    const isColorless = cardColors.length === 0;
    const isOnColor = isColorless || cardColors.every(c => mainColors.includes(c));
    const typeLine = card.type_line?.toLowerCase() || '';
    const oracleText = card.oracle_text?.toLowerCase() || '';
    const cmc = card.cmc || 0;

    // 1. BASE POWER (Bayesian prior from ELO, 0-100 scale)
    score += Math.min(100, Math.max(0, (elo - 1200) / 10));

    // 2. DRAFT PHASE (uses TOTAL picks, not pack picks)
    if (totalPicks < 5) {
      // SPECULATION: Power over color
      if (percentile >= 90) score += 40;
      if (isColorless || typeLine.includes('artifact')) score += 12;
    } else if (totalPicks < 15) {
      // EXPLORATION: Balance power and color
      if (isOnColor) score += 30;
      else if (percentile >= 90) score += 8;
      else score -= 35;
    } else if (totalPicks < 30) {
      // COMMITMENT: Synergy and color critical
      if (isOnColor) score += 45;
      else if (percentile >= 95) score += 5;
      else score -= 70;
    } else {
      // COMPLETION: Fill holes, curve, fixing only
      if (isOnColor) score += 50;
      else score -= 90;
    }

    // 3. CURVE NEEDS (after 10 picks)
    if (totalPicks >= 10 && !typeLine.includes('land')) {
      const ideal: Record<number, number> = { 1: 3, 2: 5, 3: 4, 4: 3, 5: 2 };
      const cardCmc = Math.min(5, cmc);
      const current = cmcCounts[cardCmc] || 0;
      const target = ideal[cardCmc] || 2;
      if (current < target) score += (target - current) * 8;
      else if (current > target + 1) score -= 8;
    }

    // 4. ROLE NEEDS
    if (creatures < 8 && typeLine.includes('creature')) score += 12;
    if (removal < 3 && (oracleText.includes('destroy target') || oracleText.includes('exile target'))) score += 18;
    if (cardDraw < 3 && oracleText.includes('draw')) score += 10;

    // 5. ARCHETYPE SYNERGIES
    if (hasTinker) {
      if (typeLine.includes('artifact')) score += 20;
      if (['Blightsteel Colossus', 'Myr Battlesphere', 'Sundering Titan'].includes(card.name)) score += 45;
    }
    if (hasReanimation) {
      if (typeLine.includes('creature') && cmc >= 6) score += 30;
      if (['Griselbrand', 'Archon of Cruelty', 'Emrakul, the Aeons Torn'].includes(card.name)) score += 55;
      if (['Entomb', 'Careful Study', 'Faithless Looting'].includes(card.name)) score += 35;
    }
    if (hasShowTell) {
      if (typeLine.includes('creature') && cmc >= 7) score += 35;
      if (['Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience'].includes(card.name)) score += 60;
    }
    if (hasStorm) {
      if (['Dark Ritual', 'Cabal Ritual', "Lion's Eye Diamond", 'Lotus Petal'].includes(card.name)) score += 40;
    }

    // 6. MANA FIXING
    if (typeLine.includes('land') && mainColors.length >= 2) {
      const fixesBoth = mainColors.every(c => {
        const word = c === 'W' ? 'white' : c === 'U' ? 'blue' : c === 'B' ? 'black' : c === 'R' ? 'red' : 'green';
        return oracleText.includes(word);
      });
      if (fixesBoth) score += 30;
    }

    // 7. TRAJECTORY (EWMA - Exponential Weighted Moving Average)
    // This uses CUMULATIVE history across ALL packs
    if (cardEloHistory) {
      const history = cardEloHistory.get(card.id);
      if (history && history.history.length >= 2) {
        const points = history.history;
        const currentElo = points[points.length - 1].adjustedElo;
        const startElo = points[0].adjustedElo;
        const trend = currentElo - startElo;
        const velocity = trend / Math.max(1, points.length - 1);

        // EWMA gives more weight to recent observations
        if (velocity > 10) score += 18;
        else if (velocity > 5) score += 10;
        else if (velocity > 2) score += 5;
        else if (velocity < -10) score -= 12;
        else if (velocity < -5) score -= 6;
        else if (velocity < -2) score -= 3;

        // Breakout bonus
        if (trend > 60 && currentElo > 1650) score += 12;
      }
    }

    // 8. ELITE BONUS
    if (percentile >= 98) score += 22;
    else if (percentile >= 95) score += 12;
    else if (percentile >= 90) score += 6;

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return { bestCard: scored[0].card, score: scored[0].score };
}

/**
 * NEW: Rate pack cards using the archetype-aware multiplicative rating system.
 * Returns all card ratings sorted by contextual score.
 * TODO: Integrate this into the main draft flow to replace getContextAwareBestPick
 */
export function getArchetypeAwareRatings(
  pack: CubeCard[],
  picks: CubeCard[],
  packNumber: number,
  pickNumber: number,
  archetypeContext?: DraftContext
): { ratings: CardRating[]; context: DraftContext } {
  // Build or use existing context
  let context: DraftContext;

  if (archetypeContext) {
    context = archetypeContext;
  } else {
    // Build fresh context from picks
    context = createInitialContext();
    context.packNumber = packNumber;
    context.pickNumber = pickNumber;

    for (const pick of picks) {
      const newWeights = updateArchetypeWeights(context.archetypeWeights, pick);
      context = updateContext(context, pick, newWeights);
    }
  }

  // Rate all pack cards
  const ratings = rateAllCards(pack, context);

  // Sort by contextual score (highest first)
  ratings.sort((a, b) => b.contextualScore - a.contextualScore);

  return { ratings, context };
}

// ============================================================================
// DRAFT INTELLIGENCE SYSTEM
// ============================================================================

// Determine current draft phase for contextual advice
function getDraftPhase(pickNumber: number, packNumber: number): { phase: DraftPhase; description: string; priority: string } {
  const totalPick = (packNumber - 1) * 15 + pickNumber;

  if (totalPick <= 5) {
    return {
      phase: 'speculation',
      description: 'Speculation Phase',
      priority: 'Take the most powerful cards. Stay flexible. Don\'t commit to colors yet.',
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

// Archetype definitions with requirements
const ARCHETYPE_DEFINITIONS = {
  'Reanimator': {
    keyCards: ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume', 'Shallow Grave', 'Life // Death'],
    enablers: ['Entomb', 'Careful Study', 'Faithless Looting', 'Collective Brutality', 'Putrid Imp', 'Oona\'s Prowler'],
    payoffs: ['Griselbrand', 'Archon of Cruelty', 'Sheoldred, Whispering One', 'Grave Titan', 'Craterhoof Behemoth', 'Emrakul, the Aeons Torn'],
    criticalMass: { enablers: 3, payoffs: 2, reanimationSpells: 2 },
    colors: ['B'],
  },
  'Storm': {
    keyCards: ['Brain Freeze', 'Tendrils of Agony', "Yawgmoth's Will", 'Underworld Breach', 'Dark Ritual', 'Cabal Ritual'],
    enablers: ['Dark Ritual', 'Cabal Ritual', 'Lion\'s Eye Diamond', 'Lotus Petal', 'Mox Diamond', 'Chrome Mox', 'Rite of Flame'],
    payoffs: ['Brain Freeze', 'Tendrils of Agony', 'Grapeshot', 'Empty the Warrens'],
    criticalMass: { rituals: 4, drawSpells: 3, wincons: 1 },
    colors: ['U', 'B', 'R'],
  },
  'Artifact Combo': {
    keyCards: ['Tinker', 'Tolarian Academy', "Mishra's Workshop", 'Time Vault', 'Voltaic Key'],
    enablers: ['Mox Sapphire', 'Mox Ruby', 'Mox Jet', 'Mox Pearl', 'Mox Emerald', 'Sol Ring', 'Mana Crypt', 'Grim Monolith'],
    payoffs: ['Blightsteel Colossus', 'Sundering Titan', 'Myr Battlesphere', 'Inkwell Leviathan', 'Bolas\'s Citadel'],
    criticalMass: { manaArtifacts: 5, tinkerTargets: 2 },
    colors: ['U'],
  },
  'Channel': {
    keyCards: ['Channel', 'Rofellos, Llanowar Emissary', 'Gaea\'s Cradle', 'Natural Order'],
    enablers: ['Channel', 'Elvish Spirit Guide', 'Birds of Paradise', 'Llanowar Elves', 'Rofellos, Llanowar Emissary'],
    payoffs: ['Emrakul, the Aeons Torn', 'Ulamog, the Ceaseless Hunger', 'Kozilek, Butcher of Truth', 'Craterhoof Behemoth'],
    criticalMass: { rampSources: 4, fatties: 2 },
    colors: ['G'],
  },
  'Sneak & Show': {
    keyCards: ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Eureka'],
    enablers: ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Eureka', 'Goryo\'s Vengeance'],
    payoffs: ['Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience', 'Progenitus'],
    criticalMass: { cheaters: 2, fatties: 3 },
    colors: ['U', 'R'],
  },
  'Aggro': {
    keyCards: ['Goblin Guide', 'Monastery Swiftspear', 'Ragavan, Nimble Pilferer', 'Lightning Bolt'],
    enablers: [] as string[], // Aggro doesn't need enablers
    payoffs: [] as string[], // Every creature is a payoff
    criticalMass: { oneDrops: 4, twoDrops: 5, burnSpells: 3 },
    colors: ['R', 'W'],
  },
  'Control': {
    keyCards: ['Counterspell', 'Force of Will', 'Jace, the Mind Sculptor', 'Wrath of God', 'Supreme Verdict'],
    enablers: ['Counterspell', 'Force of Will', 'Mana Leak', 'Cryptic Command'],
    payoffs: ['Jace, the Mind Sculptor', 'Teferi, Hero of Dominaria', 'The Scarab God'],
    criticalMass: { counterspells: 3, removal: 4, wincons: 2 },
    colors: ['U', 'W'],
  },
};

// Calculate archetype commitment probabilities
function getArchetypeCommitments(picks: CubeCard[]): ArchetypeCommitment[] {
  if (picks.length === 0) return [];

  const pickNames = picks.map(p => p.name);
  const commitments: ArchetypeCommitment[] = [];

  for (const [archName, arch] of Object.entries(ARCHETYPE_DEFINITIONS)) {
    let probability = 0;
    const keyCardsOwned: string[] = [];
    const keyCardsMissing: string[] = [];
    const criticalMass: { current: number; needed: number; category: string }[] = [];

    // Check key cards
    arch.keyCards.forEach(kc => {
      if (pickNames.includes(kc)) {
        keyCardsOwned.push(kc);
        probability += 15; // Each key card adds commitment
      } else {
        keyCardsMissing.push(kc);
      }
    });

    // Check enablers
    const enablersOwned = arch.enablers.filter(e => pickNames.includes(e)).length;
    const payoffsOwned = arch.payoffs.filter(p => pickNames.includes(p)).length;

    // Check color alignment
    const pickColors = new Set<string>();
    picks.forEach(p => p.color_identity?.forEach(c => pickColors.add(c)));
    const colorMatch = arch.colors.filter(c => pickColors.has(c)).length / arch.colors.length;
    probability += colorMatch * 20;

    // Add critical mass tracking based on archetype
    if (archName === 'Reanimator') {
      const reanimationSpells = picks.filter(p =>
        ['Reanimate', 'Animate Dead', 'Necromancy', 'Exhume', 'Life // Death', 'Shallow Grave'].includes(p.name)
      ).length;
      const fatties = picks.filter(p => (p.cmc || 0) >= 6 && p.type_line?.toLowerCase().includes('creature')).length;
      criticalMass.push({ current: reanimationSpells, needed: 2, category: 'Reanimation Spells' });
      criticalMass.push({ current: enablersOwned, needed: 3, category: 'Discard Outlets' });
      criticalMass.push({ current: fatties, needed: 2, category: 'Reanimation Targets' });
    } else if (archName === 'Aggro') {
      const oneDrops = picks.filter(p => (p.cmc || 0) === 1 && p.type_line?.toLowerCase().includes('creature')).length;
      const twoDrops = picks.filter(p => (p.cmc || 0) === 2 && p.type_line?.toLowerCase().includes('creature')).length;
      const burnSpells = picks.filter(p =>
        p.oracle_text?.toLowerCase().includes('damage') &&
        (p.oracle_text?.toLowerCase().includes('any target') || p.oracle_text?.toLowerCase().includes('target player'))
      ).length;
      criticalMass.push({ current: oneDrops, needed: 4, category: '1-Drops' });
      criticalMass.push({ current: twoDrops, needed: 5, category: '2-Drops' });
      criticalMass.push({ current: burnSpells, needed: 3, category: 'Burn Spells' });
    } else if (archName === 'Artifact Combo') {
      const manaArtifacts = picks.filter(p =>
        p.type_line?.toLowerCase().includes('artifact') &&
        p.oracle_text?.toLowerCase().includes('add')
      ).length;
      const tinkerTargets = picks.filter(p =>
        p.type_line?.toLowerCase().includes('artifact') &&
        (p.cmc || 0) >= 6
      ).length;
      criticalMass.push({ current: manaArtifacts, needed: 5, category: 'Mana Artifacts' });
      criticalMass.push({ current: tinkerTargets, needed: 2, category: 'Tinker Targets' });
    } else if (archName === 'Control') {
      const counterspells = picks.filter(p => p.oracle_text?.toLowerCase().includes('counter target')).length;
      const removal = picks.filter(p =>
        p.oracle_text?.toLowerCase().includes('destroy target') ||
        p.oracle_text?.toLowerCase().includes('exile target')
      ).length;
      criticalMass.push({ current: counterspells, needed: 3, category: 'Counterspells' });
      criticalMass.push({ current: removal, needed: 4, category: 'Removal' });
    }

    // Factor in enablers and payoffs
    if (arch.enablers.length > 0) {
      probability += (enablersOwned / arch.enablers.length) * 25;
    }
    if (arch.payoffs.length > 0) {
      probability += (payoffsOwned / arch.payoffs.length) * 20;
    }

    // Only include archetypes with some commitment
    if (probability >= 10) {
      commitments.push({
        archetype: archName,
        probability: Math.min(100, Math.round(probability)),
        keyCardsOwned,
        keyCardsMissing: keyCardsMissing.slice(0, 3), // Top 3 missing
        criticalMass,
      });
    }
  }

  // Normalize probabilities so they sum to ~100 if any commitment exists
  const total = commitments.reduce((sum, c) => sum + c.probability, 0);
  if (total > 0) {
    commitments.forEach(c => {
      c.probability = Math.round((c.probability / total) * 100);
    });
  }

  // Sort by probability
  commitments.sort((a, b) => b.probability - a.probability);

  return commitments.slice(0, 4); // Top 4 archetypes
}

// Analyze draft signals - what's open vs what's cut
function getDraftSignals(
  _passedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>,
  wheeledCards: Map<string, { card: CubeCard; originalPick: number; wheeledAt: number }>,
  _picks: CubeCard[],
  allPlayerPicks: CubeCard[][]
): DraftSignals {
  const colorsCut: { color: string; intensity: number }[] = [];
  const colorsOpen: { color: string; confidence: number }[] = [];
  const lateSignals: { card: CubeCard; pick: number; pack: number; colors: string[] }[] = [];

  // Analyze wheeled cards for open signals
  const wheeledByColor: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  wheeledCards.forEach(({ card }) => {
    const elo = getEloData(card.name)?.elo || 1500;
    // Good cards wheeling = that color is open
    if (elo >= 1600) {
      card.color_identity?.forEach(c => {
        wheeledByColor[c] = (wheeledByColor[c] || 0) + 1;
      });
      lateSignals.push({
        card,
        pick: 0, // We don't track exact pick here
        pack: 1,
        colors: card.color_identity || [],
      });
    }
  });

  // Colors with wheeled good cards are open
  Object.entries(wheeledByColor)
    .filter(([_, count]) => count >= 1)
    .forEach(([color, count]) => {
      colorsOpen.push({ color, confidence: Math.min(100, count * 30) });
    });

  // Analyze AI picks to detect what's being cut
  const aiColorPicks: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  allPlayerPicks.slice(1).forEach(playerPicks => {
    playerPicks.forEach(pick => {
      pick.color_identity?.forEach(c => {
        aiColorPicks[c] = (aiColorPicks[c] || 0) + 1;
      });
    });
  });

  // Colors with high AI pick counts are being cut
  const avgPicks = Object.values(aiColorPicks).reduce((a, b) => a + b, 0) / 5;
  Object.entries(aiColorPicks)
    .filter(([_, count]) => count > avgPicks * 1.3) // 30% above average = being cut
    .forEach(([color, count]) => {
      colorsCut.push({ color, intensity: Math.min(100, Math.round((count / avgPicks - 1) * 100)) });
    });

  // Detect neighbor colors (simplified - based on early picks)
  const rightNeighborPicks = allPlayerPicks[1] || [];
  const leftNeighborPicks = allPlayerPicks[7] || [];

  const rightColors: Record<string, number> = {};
  rightNeighborPicks.slice(0, 5).forEach(p => {
    p.color_identity?.forEach(c => { rightColors[c] = (rightColors[c] || 0) + 1; });
  });
  const rightNeighborColors = Object.entries(rightColors)
    .filter(([_, count]) => count >= 2)
    .map(([color]) => color);

  const leftColors: Record<string, number> = {};
  leftNeighborPicks.slice(0, 5).forEach(p => {
    p.color_identity?.forEach(c => { leftColors[c] = (leftColors[c] || 0) + 1; });
  });
  const leftNeighborColors = Object.entries(leftColors)
    .filter(([_, count]) => count >= 2)
    .map(([color]) => color);

  return {
    colorsCut: colorsCut.sort((a, b) => b.intensity - a.intensity),
    colorsOpen: colorsOpen.sort((a, b) => b.confidence - a.confidence),
    lateSignals: lateSignals.slice(0, 5),
    rightNeighborColors,
    leftNeighborColors,
  };
}

// Analyze enabler/payoff balance for combo archetypes
function getEnablerPayoffBalance(picks: CubeCard[]): EnablerPayoffBalance[] {
  const balances: EnablerPayoffBalance[] = [];
  const pickNames = picks.map(p => p.name);

  // Check each combo archetype
  const comboArchetypes = ['Reanimator', 'Storm', 'Artifact Combo', 'Sneak & Show'];

  for (const archName of comboArchetypes) {
    const arch = ARCHETYPE_DEFINITIONS[archName as keyof typeof ARCHETYPE_DEFINITIONS];
    if (!arch) continue;

    const enablers = picks
      .filter(p => arch.enablers.includes(p.name))
      .map(p => ({ card: p, role: 'enabler' }));

    const payoffs = picks
      .filter(p => arch.payoffs.includes(p.name))
      .map(p => ({ card: p, role: 'payoff' }));

    // Only include if we have at least one piece
    if (enablers.length > 0 || payoffs.length > 0) {
      let balance: 'needs-enablers' | 'needs-payoffs' | 'balanced' | 'not-applicable';
      let recommendation: string;

      if (enablers.length === 0 && payoffs.length === 0) {
        balance = 'not-applicable';
        recommendation = '';
      } else if (enablers.length === 0) {
        balance = 'needs-enablers';
        recommendation = `You have payoffs but no enablers! Prioritize: ${arch.enablers.slice(0, 3).join(', ')}`;
      } else if (payoffs.length === 0) {
        balance = 'needs-payoffs';
        recommendation = `You have enablers but no payoffs! Look for: ${arch.payoffs.slice(0, 3).join(', ')}`;
      } else if (enablers.length < payoffs.length) {
        balance = 'needs-enablers';
        recommendation = `More enablers would help. Consider: ${arch.enablers.filter(e => !pickNames.includes(e)).slice(0, 2).join(', ')}`;
      } else if (payoffs.length < enablers.length * 0.5) {
        balance = 'needs-payoffs';
        recommendation = `Could use more payoffs. Look for: ${arch.payoffs.filter(p => !pickNames.includes(p)).slice(0, 2).join(', ')}`;
      } else {
        balance = 'balanced';
        recommendation = 'Good balance of enablers and payoffs!';
      }

      if (balance !== 'not-applicable') {
        balances.push({
          archetype: archName,
          enablers,
          payoffs,
          balance,
          recommendation,
        });
      }
    }
  }

  return balances;
}

// Analyze mana base requirements
function getManaBaseStatus(picks: CubeCard[]): ManaBaseStatus {
  const colorRequirements: Record<string, { sources: number; cards: number }> = {};
  const fixingCards: CubeCard[] = [];

  // Count color requirements and sources
  picks.forEach(card => {
    // Check if it's a fixing land or mana source
    const typeLine = card.type_line?.toLowerCase() || '';
    const oracleText = card.oracle_text?.toLowerCase() || '';

    if (typeLine.includes('land') && (
      oracleText.includes('add') && (oracleText.match(/add \{[wubrg]\}/gi)?.length || 0) >= 2
    )) {
      fixingCards.push(card);
    }

    // Count cards requiring each color
    card.color_identity?.forEach(c => {
      if (!colorRequirements[c]) colorRequirements[c] = { sources: 0, cards: 0 };
      colorRequirements[c].cards++;
    });
  });

  // Count sources per color (simplified - lands that produce the color)
  picks.forEach(card => {
    const typeLine = card.type_line?.toLowerCase() || '';
    const oracleText = card.oracle_text?.toLowerCase() || '';

    if (typeLine.includes('land')) {
      ['W', 'U', 'B', 'R', 'G'].forEach(color => {
        const colorWord = color === 'W' ? 'white' : color === 'U' ? 'blue' : color === 'B' ? 'black' : color === 'R' ? 'red' : 'green';
        if (oracleText.includes(colorWord) || oracleText.includes(`{${color.toLowerCase()}}`)) {
          if (colorRequirements[color]) colorRequirements[color].sources++;
        }
      });
    }
  });

  const colorsNeeded = Object.entries(colorRequirements).map(([color, data]) => ({
    color,
    sources: data.sources,
    cardsRequiring: data.cards,
  }));

  // Determine splash viability
  const mainColors = colorsNeeded
    .filter(c => c.cardsRequiring >= 3)
    .map(c => c.color);

  const splashViability = colorsNeeded
    .filter(c => c.cardsRequiring > 0 && c.cardsRequiring < 3)
    .map(c => {
      const hasFetches = fixingCards.some(f => f.name.toLowerCase().includes('fetch') || f.name.toLowerCase().includes('delta') || f.name.toLowerCase().includes('tarn'));
      const hasDuals = fixingCards.some(f => f.oracle_text?.toLowerCase().includes(c.color.toLowerCase() === 'w' ? 'white' : c.color.toLowerCase() === 'u' ? 'blue' : c.color.toLowerCase() === 'b' ? 'black' : c.color.toLowerCase() === 'r' ? 'red' : 'green'));

      return {
        color: c.color,
        viable: c.sources >= 2 || hasFetches || hasDuals,
        reason: c.sources >= 2 ? `${c.sources} sources available` : hasFetches ? 'Fetchable' : 'Needs more fixing',
      };
    });

  // Generate recommendation
  let recommendation = '';
  const needsFixing = colorsNeeded.filter(c => c.cardsRequiring >= 3 && c.sources < 3);
  if (needsFixing.length > 0) {
    recommendation = `Need more ${needsFixing.map(c => c.color).join('/')} sources. Prioritize fixing lands.`;
  } else if (mainColors.length >= 3) {
    recommendation = '3+ color deck - prioritize dual lands and fetches.';
  } else if (fixingCards.length >= 3) {
    recommendation = 'Good mana base! Keep an eye out for premium fixing.';
  }

  return {
    colorsNeeded: colorsNeeded.sort((a, b) => b.cardsRequiring - a.cardsRequiring),
    fixingCards,
    splashViability,
    recommendation,
  };
}

// Get contextual letter grade for a card (A+ to F)
type ContextualGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

function getContextualGrade(card: CubeCard, picks: CubeCard[], currentPack?: CubeCard[]): { grade: ContextualGrade; reason: string } {
  const percentile = getPercentile(card.name);
  const cardColors = card.color_identity || [];

  // Check for pack synergy (even on P1P1)
  const packSynergy = currentPack ? getPackSynergyBonus(card, currentPack) : { bonus: 0, reasons: [] };

  // Early draft - grade based on power + pack synergy
  if (picks.length < 3) {
    // Boost grade if pack synergy exists
    const effectivePercentile = Math.min(99, percentile + (packSynergy.bonus / 2));
    const reason = packSynergy.reasons.length > 0 ? packSynergy.reasons[0] :
                   (percentile >= 85 ? 'Premium power' : 'Raw power');

    if (effectivePercentile >= 95 || packSynergy.bonus >= 40) return { grade: 'A+', reason };
    if (effectivePercentile >= 85 || packSynergy.bonus >= 25) return { grade: 'A', reason };
    if (effectivePercentile >= 70) return { grade: 'B+', reason };
    if (effectivePercentile >= 50) return { grade: 'B', reason: 'Solid playable' };
    if (effectivePercentile >= 30) return { grade: 'C', reason: 'Average' };
    return { grade: 'D', reason: 'Below average' };
  }

  // Calculate color fit
  const colorCts: Record<string, number> = {};
  picks.forEach(c => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
  const mainColors = Object.entries(colorCts).filter(([_, count]) => count >= 2).map(([color]) => color);
  const isColorless = cardColors.length === 0;
  const isOnColor = isColorless || cardColors.every(c => mainColors.includes(c));
  const addsThirdColor = !isColorless && cardColors.some(c => !mainColors.includes(c)) && mainColors.length >= 2;

  // Get synergy adjustment
  const synergy = getSynergyAdjustedElo(card, picks);
  const adjustedPercentile = Math.min(99, Math.max(1, percentile + (synergy.adjustment / 10)));

  // Combine factors into grade
  let score = adjustedPercentile;

  // Color penalties/bonuses
  if (!isOnColor && !isColorless) {
    if (addsThirdColor && percentile < 90) score -= 30; // Big penalty for splashing mediocre cards
    else if (addsThirdColor) score -= 15; // Smaller penalty for splashing bombs
    else score -= 10; // Minor penalty for touching a color
  }
  if (isOnColor && mainColors.length > 0) score += 5; // Bonus for being on-color

  // Convert score to grade
  if (score >= 95) return { grade: 'A+', reason: synergy.reasons[0] || 'Perfect fit' };
  if (score >= 88) return { grade: 'A', reason: synergy.reasons[0] || 'Excellent pickup' };
  if (score >= 82) return { grade: 'A-', reason: synergy.reasons[0] || 'Great for your deck' };
  if (score >= 75) return { grade: 'B+', reason: synergy.reasons[0] || 'Strong option' };
  if (score >= 65) return { grade: 'B', reason: isOnColor ? 'Solid on-color' : 'Good card' };
  if (score >= 55) return { grade: 'B-', reason: 'Playable' };
  if (score >= 45) return { grade: 'C+', reason: 'Filler' };
  if (score >= 35) return { grade: 'C', reason: 'Below average for you' };
  if (score >= 25) return { grade: 'C-', reason: 'Poor fit' };
  if (score >= 15) return { grade: 'D', reason: addsThirdColor ? 'Wrong colors' : 'Weak' };
  return { grade: 'F', reason: 'Do not pick' };
}

// Estimate deck win rate based on multiple factors
interface DeckWinRateEstimate {
  winRate: number; // 0-100
  confidence: string; // 'low' | 'medium' | 'high'
  factors: { name: string; impact: number; description: string }[];
  grade: string; // S/A/B/C/D/F
}

function estimateDeckWinRate(picks: CubeCard[], archetypeCommitments: ArchetypeCommitment[]): DeckWinRateEstimate {
  if (picks.length < 10) {
    return { winRate: 50, confidence: 'low', factors: [], grade: 'C' };
  }

  const factors: { name: string; impact: number; description: string }[] = [];
  let baseWinRate = 50;

  // Factor 1: Card Quality (ELO average)
  const avgElo = picks.reduce((sum, p) => sum + (getEloData(p.name)?.elo || 1500), 0) / picks.length;
  const eloImpact = Math.round((avgElo - 1650) / 20); // +/- based on deviation from 1650
  factors.push({ name: 'Card Quality', impact: eloImpact, description: `Avg ELO ${Math.round(avgElo)}` });
  baseWinRate += eloImpact;

  // Factor 2: Archetype Coherence
  const topArchetype = archetypeCommitments[0];
  if (topArchetype) {
    const coherenceImpact = topArchetype.probability >= 60 ? 8 :
                            topArchetype.probability >= 40 ? 4 :
                            topArchetype.probability >= 25 ? 0 : -5;
    factors.push({ name: 'Archetype Focus', impact: coherenceImpact, description: `${topArchetype.archetype} ${topArchetype.probability}%` });
    baseWinRate += coherenceImpact;
  }

  // Factor 3: Color Consistency
  const colorCts: Record<string, number> = {};
  picks.forEach(c => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
  const numColors = Object.keys(colorCts).filter(c => colorCts[c] >= 2).length;
  const colorImpact = numColors <= 2 ? 5 : numColors === 3 ? -3 : -8;
  factors.push({ name: 'Color Base', impact: colorImpact, description: `${numColors} colors` });
  baseWinRate += colorImpact;

  // Factor 4: Mana Curve
  const nonLands = picks.filter(p => !p.type_line?.toLowerCase().includes('land'));
  const avgCmc = nonLands.reduce((sum, p) => sum + (p.cmc || 0), 0) / nonLands.length;
  const curveImpact = avgCmc <= 2.5 ? 5 : avgCmc <= 3.2 ? 2 : avgCmc <= 4 ? -3 : -8;
  factors.push({ name: 'Mana Curve', impact: curveImpact, description: `${avgCmc.toFixed(1)} avg CMC` });
  baseWinRate += curveImpact;

  // Factor 5: Threat Density
  const threats = picks.filter(p => {
    const elo = getEloData(p.name)?.elo || 1500;
    return elo >= 1700 || p.type_line?.toLowerCase().includes('planeswalker');
  }).length;
  const threatImpact = threats >= 8 ? 6 : threats >= 5 ? 3 : threats >= 3 ? 0 : -4;
  factors.push({ name: 'Threat Density', impact: threatImpact, description: `${threats} premium cards` });
  baseWinRate += threatImpact;

  // Factor 6: Removal/Interaction
  const removal = picks.filter(p => {
    const text = p.oracle_text?.toLowerCase() || '';
    return text.includes('destroy target') || text.includes('exile target') ||
           (text.includes('damage') && text.includes('target'));
  }).length;
  const removalImpact = removal >= 6 ? 4 : removal >= 4 ? 2 : removal >= 2 ? 0 : -3;
  factors.push({ name: 'Interaction', impact: removalImpact, description: `${removal} removal spells` });
  baseWinRate += removalImpact;

  // Clamp win rate
  const finalWinRate = Math.max(25, Math.min(75, baseWinRate));

  // Determine grade
  let grade = 'C';
  if (finalWinRate >= 65) grade = 'S';
  else if (finalWinRate >= 58) grade = 'A';
  else if (finalWinRate >= 52) grade = 'B';
  else if (finalWinRate >= 45) grade = 'C';
  else if (finalWinRate >= 38) grade = 'D';
  else grade = 'F';

  return {
    winRate: Math.round(finalWinRate),
    confidence: picks.length >= 30 ? 'high' : picks.length >= 20 ? 'medium' : 'low',
    factors,
    grade,
  };
}

// Analyze opening hand quality
interface CurveAnalysis {
  playableHandRate: number; // % of hands that can play something T1-3
  curveScore: string; // 'Excellent' | 'Good' | 'Average' | 'Poor'
  cmc1Count: number;
  cmc2Count: number;
  cmc3Count: number;
  cmc4PlusCount: number;
  landCount: number;
  recommendation: string;
}

function getCurveAnalysis(picks: CubeCard[]): CurveAnalysis {
  const lands = picks.filter(p => p.type_line?.toLowerCase().includes('land')).length;
  const nonLands = picks.filter(p => !p.type_line?.toLowerCase().includes('land'));

  const cmc1 = nonLands.filter(p => (p.cmc || 0) <= 1).length;
  const cmc2 = nonLands.filter(p => (p.cmc || 0) === 2).length;
  const cmc3 = nonLands.filter(p => (p.cmc || 0) === 3).length;
  const cmc4Plus = nonLands.filter(p => (p.cmc || 0) >= 4).length;

  // Estimate playable hand rate (simplified)
  // A "playable" hand has 2-4 lands and at least one play by turn 3
  const earlyPlays = cmc1 + cmc2 + cmc3;

  // Rough approximation of mulligan math
  let playableRate = 70; // Base rate

  // Adjust for curve
  if (cmc1 + cmc2 >= 8) playableRate += 10; // Good early game
  if (cmc1 + cmc2 < 4) playableRate -= 15; // Bad early game
  if (earlyPlays >= 12) playableRate += 5;

  // Adjust for land count (assuming 40 card deck with 17 lands)
  if (lands >= 3 && lands <= 5) playableRate += 5;

  playableRate = Math.max(40, Math.min(90, playableRate));

  // Determine curve score
  let curveScore = 'Average';
  const avgCmc = nonLands.reduce((sum, p) => sum + (p.cmc || 0), 0) / (nonLands.length || 1);

  if (avgCmc <= 2.3 && cmc1 + cmc2 >= 10) curveScore = 'Excellent';
  else if (avgCmc <= 2.8 && cmc1 + cmc2 >= 7) curveScore = 'Good';
  else if (avgCmc >= 4.0 || cmc1 + cmc2 < 4) curveScore = 'Poor';

  // Generate recommendation
  let recommendation = '';
  if (cmc1 + cmc2 < 5) recommendation = 'Need more 1-2 drops for early game';
  else if (cmc4Plus > 10) recommendation = 'Top-heavy curve - may struggle early';
  else if (lands < 2 && picks.length >= 20) recommendation = 'Consider prioritizing fixing lands';
  else if (curveScore === 'Excellent') recommendation = 'Excellent curve - can be aggressive';
  else recommendation = 'Balanced curve';

  return {
    playableHandRate: Math.round(playableRate),
    curveScore,
    cmc1Count: cmc1,
    cmc2Count: cmc2,
    cmc3Count: cmc3,
    cmc4PlusCount: cmc4Plus,
    landCount: lands,
    recommendation,
  };
}

// Calculate pack synergy - what combos exist within this pack?
// This enables showing adjustments even on P1P1
function getPackSynergyBonus(
  card: CubeCard,
  pack: CubeCard[]
): { bonus: number; reasons: string[] } {
  const reasons: string[] = [];
  let bonus = 0;
  const cardName = card.name;
  const packNames = pack.map(p => p.name);

  // Define combo pairs - if both pieces are in the pack, both get bonuses
  const comboPairs = [
    { cards: ['Tinker', 'Blightsteel Colossus'], bonus: 40, reason: 'Tinker combo in pack!' },
    { cards: ['Tinker', 'Myr Battlesphere'], bonus: 30, reason: 'Tinker target available' },
    { cards: ['Tinker', 'Sundering Titan'], bonus: 30, reason: 'Tinker target available' },
    { cards: ['Channel', 'Emrakul, the Aeons Torn'], bonus: 50, reason: 'Channel combo in pack!' },
    { cards: ['Channel', 'Ulamog, the Ceaseless Hunger'], bonus: 40, reason: 'Channel target available' },
    { cards: ['Reanimate', 'Griselbrand'], bonus: 45, reason: 'Reanimate combo in pack!' },
    { cards: ['Reanimate', 'Archon of Cruelty'], bonus: 35, reason: 'Reanimate target available' },
    { cards: ['Entomb', 'Reanimate'], bonus: 40, reason: 'Reanimator pieces together!' },
    { cards: ['Entomb', 'Animate Dead'], bonus: 35, reason: 'Reanimator pieces together!' },
    { cards: ['Show and Tell', 'Omniscience'], bonus: 45, reason: 'Show & Tell combo!' },
    { cards: ['Show and Tell', 'Emrakul, the Aeons Torn'], bonus: 40, reason: 'Show target available' },
    { cards: ['Sneak Attack', 'Emrakul, the Aeons Torn'], bonus: 40, reason: 'Sneak Attack target!' },
    { cards: ['Natural Order', 'Craterhoof Behemoth'], bonus: 45, reason: 'Natural Order combo!' },
    { cards: ['Time Vault', 'Voltaic Key'], bonus: 50, reason: 'Infinite turns combo!' },
    { cards: ['Splinter Twin', 'Pestermite'], bonus: 45, reason: 'Twin combo in pack!' },
    { cards: ['Splinter Twin', 'Deceiver Exarch'], bonus: 45, reason: 'Twin combo in pack!' },
    { cards: ['Dark Ritual', 'Necropotence'], bonus: 25, reason: 'T1 Necro possible' },
    { cards: ['Lion\'s Eye Diamond', 'Underworld Breach'], bonus: 40, reason: 'Breach combo!' },
    { cards: ['Tolarian Academy', 'Time Spiral'], bonus: 35, reason: 'Academy combo' },
  ];

  // Check if this card is part of a combo in the pack
  for (const combo of comboPairs) {
    if (combo.cards.includes(cardName)) {
      const otherCard = combo.cards.find(c => c !== cardName);
      if (otherCard && packNames.includes(otherCard)) {
        bonus += combo.bonus;
        reasons.push(combo.reason);
      }
    }
  }

  // Archetype clustering - if multiple cards for same archetype in pack, all get small boost
  const archetypeCards: Record<string, string[]> = {
    'Reanimator': ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Exhume'],
    'Storm': ['Dark Ritual', 'Cabal Ritual', 'Brain Freeze', 'Tendrils of Agony', 'Yawgmoth\'s Will', 'Underworld Breach', 'Lion\'s Eye Diamond'],
    'Artifacts': ['Tinker', 'Tolarian Academy', 'Mishra\'s Workshop', 'Time Vault', 'Voltaic Key', 'Mana Crypt', 'Sol Ring'],
    'Channel': ['Channel', 'Emrakul, the Aeons Torn', 'Ulamog, the Ceaseless Hunger', 'Kozilek, Butcher of Truth'],
    'Sneak': ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Omniscience', 'Griselbrand'],
  };

  for (const [archetype, cards] of Object.entries(archetypeCards)) {
    if (cards.includes(cardName)) {
      const otherArchetypeCards = cards.filter(c => c !== cardName && packNames.includes(c));
      if (otherArchetypeCards.length >= 1 && bonus === 0) { // Don't stack with direct combo bonus
        bonus += 15;
        reasons.push(`${archetype} pieces in pack`);
      }
    }
  }

  return { bonus, reasons };
}

// Calculate synergy-adjusted ELO for a card given current picks
// Uses the new multiplicative archetype-aware rating system
function getSynergyAdjustedElo(
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

// LocalStorage keys
const STORAGE_KEYS = {
  history: 'cube-analyzer-draft-history',
  stats: 'cube-analyzer-draft-stats',
  achievements: 'cube-analyzer-achievements',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

const DEFAULT_STATS: DraftStats = {
  totalDrafts: 0,
  totalPicks: 0,
  avgOptimalRate: 0,
  avgDeckElo: 0,
  bestGrade: '',
  perfectPacks: 0,
  streakOptimal: 0,
  maxStreakOptimal: 0,
  rarePicks: 0,
  quizAccuracy: 0,
  quizTotal: 0,
};

export function DraftSimulator({ cards }: DraftSimulatorProps) {
  const [mode, setMode] = useState<SimulatorMode>('menu');
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);
  // Use a ref to track the last hovered card - this updates synchronously without extra renders
  const lastHoveredCardRef = useRef<CubeCard | null>(null);
  // Update ref whenever hoveredCard is set to a card (not null)
  if (hoveredCard) {
    lastHoveredCardRef.current = hoveredCard;
  }
  // displayedCard is computed synchronously - either current hover or last seen
  const displayedCard = hoveredCard || lastHoveredCardRef.current;
  const [mobileSelectedCard, setMobileSelectedCard] = useState<CubeCard | null>(null);
  const [showMobileDeck, setShowMobileDeck] = useState(false);
  const [expandedPlayerIdx, setExpandedPlayerIdx] = useState<number | null>(null);

  // New: Coach mode and history
  const [coachMode, setCoachMode] = useState(true);
  const [viewingPicks, setViewingPicks] = useState(false);
  const [showCoachExplanation, setShowCoachExplanation] = useState(false);
  const [draftHistory, setDraftHistory] = useState<DraftHistoryEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.history, [])
  );
  const [draftStats, setDraftStats] = useState<DraftStats>(() =>
    loadFromStorage(STORAGE_KEYS.stats, DEFAULT_STATS)
  );
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEYS.achievements, [])
  );
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  // Quiz Draft mode - pick blind, then see if you got it right
  const [quizDraftMode, setQuizDraftMode] = useState(false);
  const [pendingPick, setPendingPick] = useState<CubeCard | null>(null);
  const [showPickReveal, setShowPickReveal] = useState(false);
  const [lastPickResult, setLastPickResult] = useState<{
    yourPick: CubeCard;
    optimalPick: CubeCard;
    wasCorrect: boolean;
    eloDiff: number;
  } | null>(null);
  const [quizDraftStats, setQuizDraftStats] = useState<{
    correct: number;
    total: number;
    totalEloDiff: number;
    history: { yourPick: string; optimalPick: string; wasCorrect: boolean; eloDiff: number; packNum: number; pickNum: number }[];
  }>({ correct: 0, total: 0, totalEloDiff: 0, history: [] });

  // Get some featured cards for the start screen
  const featuredCards = useMemo(() => {
    return cards
      .filter(c => c.powerLevel >= 9)
      .sort(() => Math.random() - 0.5)
      .slice(0, 7);
  }, [cards]);

  // Quiz functions
  const generateQuizPack = useCallback((): { pack: CubeCard[]; correct: CubeCard } => {
    const shuffled = shuffleArray([...cards]);
    const pack = shuffled.slice(0, CARDS_PER_PACK);
    // Sort by ELO to find the "correct" pick
    const sorted = [...pack].sort((a, b) => compareByElo(a.name, b.name));
    return { pack, correct: sorted[0] };
  }, [cards]);

  const startQuiz = useCallback(() => {
    const { pack, correct } = generateQuizPack();
    setQuizState({
      currentPack: pack,
      correctCard: correct,
      userPick: null,
      revealed: false,
      history: [],
      totalQuestions: 0,
    });
    setMode('quiz');
  }, [generateQuizPack]);

  const makeQuizPick = useCallback((card: CubeCard) => {
    if (!quizState || quizState.revealed) return;
    setQuizState(prev => prev ? { ...prev, userPick: card, revealed: true } : null);
  }, [quizState]);

  const nextQuizQuestion = useCallback(() => {
    if (!quizState) return;
    const { pack, correct } = generateQuizPack();
    const wasCorrect = quizState.userPick?.id === quizState.correctCard.id;

    // Update quiz stats
    const newHistory = [...quizState.history, {
      correct: wasCorrect,
      userPick: quizState.userPick!,
      correctPick: quizState.correctCard,
    }];
    const correctCount = newHistory.filter(h => h.correct).length;
    const accuracy = Math.round((correctCount / newHistory.length) * 100);

    const newStats: DraftStats = {
      ...draftStats,
      quizTotal: newHistory.length,
      quizAccuracy: accuracy,
    };
    setDraftStats(newStats);
    saveToStorage(STORAGE_KEYS.stats, newStats);

    setQuizState(prev => prev ? {
      currentPack: pack,
      correctCard: correct,
      userPick: null,
      revealed: false,
      history: newHistory,
      totalQuestions: prev.totalQuestions + 1,
    } : null);
  }, [quizState, generateQuizPack, draftStats]);

  const quizAccuracy = useMemo(() => {
    if (!quizState || quizState.history.length === 0) return null;
    const correct = quizState.history.filter(h => h.correct).length;
    return Math.round((correct / quizState.history.length) * 100);
  }, [quizState]);

  // Calculate draft grade based on decisions
  const draftGrade = useMemo(() => {
    if (!draftState || draftState.decisions.length === 0) return null;

    const totalDecisions = draftState.decisions.length;
    const optimalPicks = draftState.decisions.filter(d => d.wasOptimal).length;
    const totalEloDiff = draftState.decisions.reduce((sum, d) => sum + d.eloDiff, 0);
    const avgEloDiff = totalEloDiff / totalDecisions;

    // Grade based on how often we picked the best card
    const optimalRate = optimalPicks / totalDecisions;
    let grade: string;
    let color: string;

    if (optimalRate >= 0.8) { grade = 'S'; color = 'text-amber-400'; }
    else if (optimalRate >= 0.6) { grade = 'A'; color = 'text-purple-400'; }
    else if (optimalRate >= 0.4) { grade = 'B'; color = 'text-blue-400'; }
    else if (optimalRate >= 0.25) { grade = 'C'; color = 'text-green-400'; }
    else { grade = 'D'; color = 'text-white/40'; }

    // Find worst picks (biggest ELO diff)
    const worstPicks = [...draftState.decisions]
      .filter(d => !d.wasOptimal)
      .sort((a, b) => b.eloDiff - a.eloDiff)
      .slice(0, 3);

    // Find best picks (optimal picks on hard decisions)
    const bestPicks = draftState.decisions
      .filter(d => d.wasOptimal && d.packContents.length >= 10)
      .slice(0, 3);

    return {
      grade,
      color,
      optimalPicks,
      totalDecisions,
      optimalRate: Math.round(optimalRate * 100),
      avgEloDiff: Math.round(avgEloDiff),
      worstPicks,
      bestPicks,
    };
  }, [draftState]);

  // Check and unlock achievements
  const checkAchievements = useCallback((stats: DraftStats) => {
    const newUnlocked: Achievement[] = [];
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id) && achievement.condition(stats)) {
        newUnlocked.push(achievement);
      }
    });
    if (newUnlocked.length > 0) {
      const allUnlocked = [...unlockedAchievements, ...newUnlocked.map(a => a.id)];
      setUnlockedAchievements(allUnlocked);
      saveToStorage(STORAGE_KEYS.achievements, allUnlocked);
      // Show the first new achievement
      setNewAchievement(newUnlocked[0]);
      setTimeout(() => setNewAchievement(null), 4000);
    }
  }, [unlockedAchievements]);

  // Save draft results to history
  const saveDraftResults = useCallback(() => {
    if (!draftState || !draftState.isComplete || !draftGrade) return;

    const deckElo = calculateDeckElo(draftState.picks.map(p => p.name));
    const colorCts: Record<string, number> = {};
    draftState.picks.forEach(c => {
      c.color_identity?.forEach(col => {
        colorCts[col] = (colorCts[col] || 0) + 1;
      });
    });
    const mainColors = Object.entries(colorCts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([color]) => color);

    const topPicks = draftState.picks
      .map(p => ({ name: p.name, elo: getEloData(p.name)?.elo || 0 }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 3);

    const entry: DraftHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      deckElo: deckElo.rawAverage,
      grade: draftGrade.grade,
      optimalRate: draftGrade.optimalRate,
      mainColors,
      totalPicks: draftState.picks.length,
      topPicks,
    };

    const updatedHistory = [entry, ...draftHistory].slice(0, 20); // Keep last 20
    setDraftHistory(updatedHistory);
    saveToStorage(STORAGE_KEYS.history, updatedHistory);

    // Calculate streak
    let currentStreak = 0;
    for (const d of draftState.decisions) {
      if (d.wasOptimal) currentStreak++;
      else break;
    }
    let maxStreak = currentStreak;
    let tempStreak = 0;
    for (const d of draftState.decisions) {
      if (d.wasOptimal) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Count rare picks (cards picked that have low pick rates)
    const rarePicks = draftState.picks.filter(p => {
      const percentile = getPercentile(p.name);
      return percentile < 25;
    }).length;

    // Update stats
    const newStats: DraftStats = {
      totalDrafts: draftStats.totalDrafts + 1,
      totalPicks: draftStats.totalPicks + draftState.picks.length,
      avgOptimalRate: Math.round(
        (draftStats.avgOptimalRate * draftStats.totalDrafts + draftGrade.optimalRate) /
        (draftStats.totalDrafts + 1)
      ),
      avgDeckElo: Math.round(
        (draftStats.avgDeckElo * draftStats.totalDrafts + deckElo.rawAverage) /
        (draftStats.totalDrafts + 1)
      ),
      bestGrade: ['S', 'A', 'B', 'C', 'D'].indexOf(draftGrade.grade) < ['S', 'A', 'B', 'C', 'D'].indexOf(draftStats.bestGrade || 'D')
        ? draftGrade.grade
        : draftStats.bestGrade,
      perfectPacks: draftStats.perfectPacks, // TODO: calculate
      streakOptimal: currentStreak,
      maxStreakOptimal: Math.max(draftStats.maxStreakOptimal, maxStreak),
      rarePicks: draftStats.rarePicks + rarePicks,
      quizAccuracy: draftStats.quizAccuracy,
      quizTotal: draftStats.quizTotal,
    };
    setDraftStats(newStats);
    saveToStorage(STORAGE_KEYS.stats, newStats);

    // Check for new achievements
    checkAchievements(newStats);
  }, [draftState, draftGrade, draftHistory, draftStats, checkAchievements]);

  // Save results when draft completes
  useEffect(() => {
    if (draftState?.isComplete && draftGrade) {
      saveDraftResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftState?.isComplete]);

  // Check quiz achievements when quiz total changes
  useEffect(() => {
    if (draftStats.quizTotal > 0) {
      checkAchievements(draftStats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStats.quizTotal]);


  // Analyze deck needs for coaching
  const deckNeeds = useMemo(() => {
    if (!draftState || draftState.picks.length === 0) return null;
    const picks = draftState.picks;

    // Count card types
    const creatures = picks.filter(c => c.type_line?.toLowerCase().includes('creature')).length;
    const removal = picks.filter(c => {
      const text = c.oracle_text?.toLowerCase() || '';
      return text.includes('destroy target') || text.includes('exile target') ||
             text.includes('deals') && text.includes('damage') || c.name === 'Swords to Plowshares' ||
             c.name === 'Path to Exile' || c.name === 'Lightning Bolt';
    }).length;
    const cardDraw = picks.filter(c => {
      const text = c.oracle_text?.toLowerCase() || '';
      return text.includes('draw') && text.includes('card');
    }).length;
    const manaAccel = picks.filter(c => {
      const name = c.name.toLowerCase();
      const text = c.oracle_text?.toLowerCase() || '';
      return name.includes('mox') || name.includes('lotus') || name === 'sol ring' ||
             name === 'mana crypt' || name === 'mana vault' || text.includes('add') && text.includes('mana');
    }).length;
    const lands = picks.filter(c => c.type_line?.toLowerCase().includes('land')).length;

    // Curve analysis
    const cmcCounts = [0, 0, 0, 0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4, 5, 6, 7+
    picks.filter(c => !c.type_line?.toLowerCase().includes('land')).forEach(c => {
      const cmc = Math.min(c.cmc || 0, 7);
      cmcCounts[cmc]++;
    });

    const avgCmc = picks.filter(c => !c.type_line?.toLowerCase().includes('land'))
      .reduce((sum, c) => sum + (c.cmc || 0), 0) / Math.max(1, picks.length - lands);

    // Determine needs
    const needs: string[] = [];
    const needsWeights: Record<string, number> = {};

    if (removal < 2 && picks.length >= 10) {
      needs.push('removal');
      needsWeights['removal'] = 25;
    }
    if (cardDraw < 3 && picks.length >= 15) {
      needs.push('card draw');
      needsWeights['card_draw'] = 20;
    }
    if (manaAccel < 3 && avgCmc > 3) {
      needs.push('mana acceleration');
      needsWeights['mana'] = 30;
    }
    if (cmcCounts[2] < 3 && picks.length >= 10) {
      needs.push('2-drops');
      needsWeights['2drop'] = 15;
    }
    if (creatures < picks.length * 0.3 && picks.length >= 15) {
      needs.push('creatures');
      needsWeights['creature'] = 10;
    }
    if (lands < 3 && picks.length >= 20) {
      needs.push('lands/fixing');
      needsWeights['land'] = 20;
    }

    return { creatures, removal, cardDraw, manaAccel, lands, avgCmc, cmcCounts, needs, needsWeights };
  }, [draftState]);

  // ============================================================================
  // DRAFT INTELLIGENCE HOOKS
  // ============================================================================

  // Current draft phase with contextual advice
  const draftPhase = useMemo(() => {
    if (!draftState) return null;
    return getDraftPhase(draftState.pickNumber, draftState.packNumber);
  }, [draftState?.pickNumber, draftState?.packNumber]);

  // Archetype commitment probabilities
  const archetypeCommitments = useMemo(() => {
    if (!draftState || draftState.picks.length === 0) return [];
    return getArchetypeCommitments(draftState.picks);
  }, [draftState?.picks]);

  // Draft signals - what's open vs cut
  const draftSignals = useMemo(() => {
    if (!draftState) return null;
    return getDraftSignals(
      draftState.passedCards,
      draftState.wheeledCards,
      draftState.picks,
      draftState.allPlayerPicks
    );
  }, [draftState?.passedCards, draftState?.wheeledCards, draftState?.picks, draftState?.allPlayerPicks]);

  // Enabler/Payoff balance for combo archetypes
  const enablerPayoffBalance = useMemo(() => {
    if (!draftState || draftState.picks.length < 3) return [];
    return getEnablerPayoffBalance(draftState.picks);
  }, [draftState?.picks]);

  // Mana base status
  const manaBaseStatus = useMemo(() => {
    if (!draftState || draftState.picks.length < 5) return null;
    return getManaBaseStatus(draftState.picks);
  }, [draftState?.picks]);

  // Deck win rate estimate
  const deckWinRate = useMemo(() => {
    if (!draftState || draftState.picks.length < 10) return null;
    return estimateDeckWinRate(draftState.picks, archetypeCommitments);
  }, [draftState?.picks, archetypeCommitments]);

  // Curve analysis
  const curveAnalysis = useMemo(() => {
    if (!draftState || draftState.picks.length < 8) return null;
    return getCurveAnalysis(draftState.picks);
  }, [draftState?.picks]);

  // Regrettable passes (cards we passed that we now want)
  const topRegrets = useMemo(() => {
    if (!draftState) return [];
    const regrets = Array.from(draftState.regrettablePasses.values());
    return regrets.slice(0, 3);
  }, [draftState?.regrettablePasses]);

  // Generate smart coach recommendation
  const coachExplanation = useMemo(() => {
    if (!draftState || draftState.isComplete) return null;

    const currentPack = draftState.tablePacks[0];
    if (!currentPack.length) return null;

    const picks = draftState.picks;
    const pickNames = picks.map(p => p.name);

    // Main colors (2+ cards)
    const colorCts: Record<string, number> = {};
    picks.forEach(c => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
    const mainColors = Object.entries(colorCts).filter(([_, count]) => count >= 2).map(([color]) => color);

    // Detect synergy anchors in our pool - these define archetype direction
    const hasTinker = pickNames.includes('Tinker') || pickNames.includes('Tolarian Academy');
    const hasNaturalOrder = pickNames.includes('Natural Order') || pickNames.includes('Craterhoof Behemoth');
    const hasReanimation = picks.some(p => ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume', 'Shallow Grave'].includes(p.name));
    const hasShowTell = picks.some(p => ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Omniscience'].includes(p.name));
    const hasChannel = pickNames.includes('Channel');
    const hasStorm = picks.some(p => ['Brain Freeze', 'Tendrils of Agony', "Yawgmoth's Will", 'Underworld Breach'].includes(p.name));
    const hasAggro = picks.filter(p => {
      const cmc = p.cmc || 0;
      const colors = p.color_identity || [];
      return colors.includes('R') && cmc <= 2 && p.type_line?.toLowerCase().includes('creature');
    }).length >= 3;

    // Determine current archetype for messaging
    let currentArchetype = '';
    if (hasTinker) currentArchetype = 'Artifact Combo';
    else if (hasReanimation) currentArchetype = 'Reanimator';
    else if (hasShowTell) currentArchetype = 'Sneak & Show';
    else if (hasChannel) currentArchetype = 'Channel Ramp';
    else if (hasStorm) currentArchetype = 'Storm';
    else if (hasNaturalOrder) currentArchetype = 'Green Ramp';
    else if (hasAggro) currentArchetype = 'Aggro';

    // Score each card in pack using synergy-adjusted ELO
    const scored = currentPack.map(card => {
      const reasons: string[] = [];
      const percentile = getPercentile(card.name);
      const cardColors = card.color_identity || [];
      const typeLine = card.type_line?.toLowerCase() || '';
      const oracleText = card.oracle_text?.toLowerCase() || '';
      const cmc = card.cmc || 0;

      // Use synergy-adjusted ELO as the primary score
      const synergyData = getSynergyAdjustedElo(card, picks);
      let score = synergyData.adjustedElo;
      const elo = synergyData.adjustedElo; // Use adjusted ELO for display

      // Add synergy reasons from adjusted ELO
      synergyData.reasons.forEach(reason => {
        if (!reason.includes('P1P1')) reasons.push(reason);
      });

      // Early draft: extra bonus for premium cards
      if (picks.length < 5 && percentile >= 90) {
        score += 50;
        if (!reasons.some(r => r.includes('Premium'))) {
          reasons.push('Premium card - prioritize power early');
        }
      }

      // Synergy bonuses - archetype-specific recommendations
      if (hasTinker && typeLine.includes('artifact')) {
        score += 35;
        reasons.push('Fits your Artifact Combo deck');
      }
      if (hasTinker && ['Blightsteel Colossus', 'Myr Battlesphere', 'Sundering Titan', 'Inkwell Leviathan'].includes(card.name)) {
        score += 50;
        reasons.push('Tinker target!');
      }
      if (hasNaturalOrder && typeLine.includes('creature') && cardColors.includes('G')) {
        score += 30;
        reasons.push('Green creature for your Ramp deck');
      }
      if (hasNaturalOrder && ['Craterhoof Behemoth', 'Primeval Titan', 'Woodfall Primus'].includes(card.name)) {
        score += 45;
        reasons.push('Natural Order payoff!');
      }
      if (hasReanimation && typeLine.includes('creature') && cmc >= 6) {
        score += 35;
        reasons.push('Reanimation target for your deck');
      }
      if (hasReanimation && ['Griselbrand', 'Archon of Cruelty', 'Sheoldred, Whispering One', 'Grave Titan'].includes(card.name)) {
        score += 50;
        reasons.push('Premium Reanimator payoff!');
      }
      if (hasReanimation && ['Entomb', 'Careful Study', 'Faithless Looting', 'Collective Brutality'].includes(card.name)) {
        score += 40;
        reasons.push('Enables your Reanimator plan');
      }
      if (hasShowTell && typeLine.includes('creature') && cmc >= 7) {
        score += 40;
        reasons.push('Sneak/Show target');
      }
      if (hasShowTell && ['Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience'].includes(card.name)) {
        score += 55;
        reasons.push('Perfect for Sneak & Show!');
      }
      if (hasChannel && (card.name.includes('Emrakul') || card.name.includes('Ulamog') || card.name === 'Kozilek, Butcher of Truth')) {
        score += 50;
        reasons.push('Channel payoff!');
      }
      if (hasStorm && (oracleText.includes('draw') || oracleText.includes('add {'))) {
        score += 30;
        reasons.push('Fuels your Storm deck');
      }
      if (hasStorm && ['Dark Ritual', 'Cabal Ritual', 'Lion\'s Eye Diamond', 'Wheel of Fortune'].includes(card.name)) {
        score += 50;
        reasons.push('Storm enabler!');
      }
      if (hasAggro && typeLine.includes('creature') && cmc <= 2 && cardColors.includes('R')) {
        score += 25;
        reasons.push('Fits your Aggro curve');
      }
      if (hasAggro && (oracleText.includes('damage') && (oracleText.includes('any target') || oracleText.includes('target player')))) {
        score += 30;
        reasons.push('Burn for your Aggro deck');
      }

      // Role-based bonuses based on deck needs
      if (deckNeeds) {
        if (deckNeeds.needsWeights['removal'] && (oracleText.includes('destroy target') || oracleText.includes('exile target') || (oracleText.includes('deals') && oracleText.includes('damage')))) {
          score += deckNeeds.needsWeights['removal'];
          reasons.push('You need removal');
        }
        if (deckNeeds.needsWeights['card_draw'] && oracleText.includes('draw') && oracleText.includes('card')) {
          score += deckNeeds.needsWeights['card_draw'];
          reasons.push('You need card draw');
        }
        if (deckNeeds.needsWeights['mana'] && (card.name.toLowerCase().includes('mox') || card.name === 'Sol Ring' || card.name === 'Mana Crypt' || oracleText.includes('add') && oracleText.includes('mana'))) {
          score += deckNeeds.needsWeights['mana'];
          reasons.push('You need mana acceleration');
        }
        if (deckNeeds.needsWeights['2drop'] && cmc === 2 && !typeLine.includes('land')) {
          score += deckNeeds.needsWeights['2drop'];
          reasons.push('Fills curve gap at 2 mana');
        }
        if (deckNeeds.needsWeights['land'] && typeLine.includes('land')) {
          const fixesColors = mainColors.some(c => oracleText.includes(c === 'W' ? 'white' : c === 'U' ? 'blue' : c === 'B' ? 'black' : c === 'R' ? 'red' : 'green'));
          if (fixesColors || card.name.includes('Fetch') || card.name.includes('Delta') || card.name.includes('Tarn')) {
            score += deckNeeds.needsWeights['land'];
            reasons.push('Fixing for your colors');
          }
        }
      }

      // Premium card bonus
      if (percentile >= 95) {
        score += 30;
        if (!reasons.some(r => r.includes('Premium'))) reasons.unshift('Top 5% card in the cube');
      } else if (percentile >= 85) {
        score += 15;
        if (!reasons.some(r => r.includes('Premium'))) reasons.unshift('High-tier card (top 15%)');
      }

      // Wheel likelihood consideration
      const wheel = getWheelLikelihood(card.name);
      if (wheel === 'unlikely' && percentile >= 70) {
        score += 10;
        reasons.push("Won't wheel");
      }

      return { card, score, elo, percentile, reasons };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const alternatives = scored.slice(1, 4);

    // Generate main explanation with archetype awareness
    let mainReason = '';
    if (picks.length < 3) {
      mainReason = 'Take the most powerful card available. Stay open.';
    } else if (picks.length < 6 && !currentArchetype) {
      mainReason = 'Still finding your lane - prioritize power.';
    } else if (currentArchetype && top.reasons.some(r => r.includes(currentArchetype) || r.includes('!'))) {
      mainReason = top.reasons.find(r => r.includes(currentArchetype) || r.includes('!')) || top.reasons[0];
    } else if (top.reasons.length > 0) {
      mainReason = top.reasons[0];
    } else {
      mainReason = 'Best available for your deck';
    }

    return {
      card: top.card,
      elo: top.elo,
      percentile: top.percentile,
      reasons: top.reasons.slice(0, 3),
      mainReason,
      alternatives: alternatives.map(a => ({ name: a.card.name, score: a.score, reason: a.reasons[0] || 'Solid option' })),
      deckNeeds: deckNeeds?.needs || [],
      currentArchetype, // Include for display in the UI
    };
  }, [draftState, deckNeeds]);

  const startDraft = useCallback((isQuizDraft = false) => {
    const shuffled = shuffleArray([...cards]);
    const tablePacks: CubeCard[][] = [];
    const usedCardIds = new Set<string>();

    // Deal 8 packs of 15 cards (120 cards total for pack 1)
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const pack = shuffled.slice(i * CARDS_PER_PACK, (i + 1) * CARDS_PER_PACK);
      tablePacks.push(pack);
      // Track all cards dealt to prevent them from appearing in pack 2/3
      pack.forEach(c => usedCardIds.add(c.id));
    }

    // Initialize ELO history for all cards in pack 1 (what we can see)
    const initialSeenCards = new Set<string>();
    const initialEloHistory = new Map<string, CardEloHistory>();

    // Record initial adjusted ELO for cards in our first pack
    // Start with pick 0 (before any picks made) - history will grow with each pick
    tablePacks[0].forEach(card => {
      initialSeenCards.add(card.id);
      const baseElo = getEloData(card.name)?.elo || 1500;
      initialEloHistory.set(card.id, {
        cardId: card.id,
        cardName: card.name,
        baseElo,
        // Single point at pick 0 - one dot per pick as draft progresses
        history: [
          { pick: 0, adjustedElo: baseElo, adjustment: 0 },
        ],
      });
    });

    setDraftState({
      tablePacks,
      picks: [],
      packNumber: 1,
      direction: 'left',
      pickNumber: 1,
      isComplete: false,
      usedCardIds,
      passedCards: new Map(),
      decisions: [],
      allPlayerPicks: Array.from({ length: NUM_PLAYERS }, () => []),
      cardEloHistory: initialEloHistory,
      seenCards: initialSeenCards,
      regrettablePasses: new Map(),
      wheeledCards: new Map(),
    });

    // Quiz draft mode: hide coach, show feedback after each pick
    setQuizDraftMode(isQuizDraft);
    if (isQuizDraft) {
      setCoachMode(false);
      setQuizDraftStats({ correct: 0, total: 0, totalEloDiff: 0, history: [] });
    }
    setPendingPick(null);
    setShowPickReveal(false);
    setLastPickResult(null);

    setMode('draft');
  }, [cards]);

  const returnToMenu = useCallback(() => {
    setMode('menu');
    setDraftState(null);
    setQuizState(null);
    setQuizDraftMode(false);
    setPendingPick(null);
    setShowPickReveal(false);
    setLastPickResult(null);
  }, []);

  const aiPreferences = useMemo(() => [
    null, ['U', 'B'], ['R', 'W'], ['U', 'G'],
    ['B', 'R'], ['U', 'W'], ['G', 'W'], ['U', 'R'],
  ], []);

  const simulateOtherPlayersPicks = (packs: CubeCard[][], allPlayerPicks: CubeCard[][]): { newPacks: CubeCard[][]; aiPicks: (CubeCard | null)[] } => {
    const aiPicks: (CubeCard | null)[] = Array(NUM_PLAYERS).fill(null);
    const newPacks = packs.map((pack, playerIndex) => {
      if (playerIndex === 0 || pack.length === 0) return pack;

      // Get this AI's current picks for synergy calculation
      const aiPlayerPicks = allPlayerPicks[playerIndex] || [];
      const prefs = aiPreferences[playerIndex] || [];

      const scoredCards = pack.map(card => {
        // Use synergy-adjusted ELO as the primary scoring mechanism
        const synergy = getSynergyAdjustedElo(card, aiPlayerPicks);
        let score = synergy.adjustedElo;

        // Add color preference bias for AI personality (slight nudge toward their preferred colors)
        const cardColors = card.color_identity || [];
        const matchingColors = cardColors.filter(c => prefs.includes(c)).length;
        if (matchingColors > 0) score += matchingColors * 15; // Slight preference bonus

        // Small random variance for variety
        score += Math.random() * 20;

        return { card, score };
      });

      scoredCards.sort((a, b) => b.score - a.score);
      const pickedCard = scoredCards[0].card;
      aiPicks[playerIndex] = pickedCard;
      return pack.filter(c => c.id !== pickedCard.id);
    });
    return { newPacks, aiPicks };
  };

  const rotatePacks = (packs: CubeCard[][], direction: 'left' | 'right'): CubeCard[][] => {
    const newPacks = [...packs];
    if (direction === 'left') {
      const first = newPacks[0];
      for (let i = 0; i < NUM_PLAYERS - 1; i++) newPacks[i] = newPacks[i + 1];
      newPacks[NUM_PLAYERS - 1] = first;
    } else {
      const last = newPacks[NUM_PLAYERS - 1];
      for (let i = NUM_PLAYERS - 1; i > 0; i--) newPacks[i] = newPacks[i - 1];
      newPacks[0] = last;
    }
    return newPacks;
  };

  const startNewPack = useCallback((
    currentPicks: CubeCard[],
    nextPackNumber: number,
    currentUsedCardIds: Set<string>,
    currentPassedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>,
    currentDecisions: PickDecision[],
    currentAllPlayerPicks: CubeCard[][],
    currentEloHistory: Map<string, CardEloHistory>,
    currentSeenCards: Set<string>,
    currentRegrettablePasses: Map<string, { card: CubeCard; passedAt: number; whyRegret: string }>,
    currentWheeledCards: Map<string, { card: CubeCard; originalPick: number; wheeledAt: number }>
  ): DraftState => {
    // Filter out ALL cards that have been dealt in previous packs
    const availableCards = cards.filter(c => !currentUsedCardIds.has(c.id));
    const shuffled = shuffleArray(availableCards);
    const tablePacks: CubeCard[][] = [];
    const newUsedCardIds = new Set(currentUsedCardIds);
    const newSeenCards = new Set(currentSeenCards);
    const newEloHistory = new Map(currentEloHistory);
    const pickNum = currentPicks.length;

    // Deal new packs and track the cards
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const pack = shuffled.slice(i * CARDS_PER_PACK, (i + 1) * CARDS_PER_PACK);
      tablePacks.push(pack);
      pack.forEach(c => newUsedCardIds.add(c.id));
    }

    // CRITICAL: Update ALL existing cards' ELO first (they carry over from previous packs!)
    newEloHistory.forEach((history, cardId) => {
      const cardData = cards.find((c: CubeCard) => c.id === cardId);
      if (cardData) {
        const synergy = getSynergyAdjustedElo(cardData, currentPicks);
        history.history.push({ pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment });
      }
    });

    // Add new cards from our pack to history
    // New cards start at current pick with their synergy-adjusted ELO
    tablePacks[0].forEach(card => {
      newSeenCards.add(card.id);
      const baseElo = getEloData(card.name)?.elo || 1500;
      const synergy = getSynergyAdjustedElo(card, currentPicks);
      if (!newEloHistory.has(card.id)) {
        newEloHistory.set(card.id, {
          cardId: card.id,
          cardName: card.name,
          baseElo,
          // Single point at current pick - history grows from here
          history: [
            { pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment },
          ],
        });
      }
    });

    return {
      tablePacks,
      picks: currentPicks,
      packNumber: nextPackNumber,
      direction: nextPackNumber === 2 ? 'right' : 'left',
      pickNumber: 1,
      isComplete: false,
      usedCardIds: newUsedCardIds,
      passedCards: currentPassedCards,
      decisions: currentDecisions,
      allPlayerPicks: currentAllPlayerPicks,
      cardEloHistory: newEloHistory,
      seenCards: newSeenCards,
      regrettablePasses: currentRegrettablePasses,
      wheeledCards: currentWheeledCards,
    };
  }, [cards]);

  // Core pick logic - separated so it can be called from quiz draft confirm
  const executePickLogic = useCallback((card: CubeCard) => {
    if (!draftState || draftState.isComplete) return null;

    const currentPack = draftState.tablePacks[0];

    // Find the best available card considering deck context (colors, synergy, trajectory)
    const { bestCard: bestAvailable } = getContextAwareBestPick(currentPack, draftState.picks, draftState.cardEloHistory);
    const bestElo = getEloData(bestAvailable.name)?.elo || 0;
    const pickedElo = getEloData(card.name)?.elo || 0;

    // Track what we passed
    const passed = currentPack.filter(c => c.id !== card.id);
    const newPassedCards = new Map(draftState.passedCards);
    passed.forEach(c => {
      newPassedCards.set(c.id, {
        card: c,
        passedAtPick: draftState.pickNumber,
        packNumber: draftState.packNumber,
      });
    });

    // Record this decision
    const decision: PickDecision = {
      pick: card,
      packNumber: draftState.packNumber,
      pickNumber: draftState.pickNumber,
      packContents: [...currentPack],
      bestAvailable,
      passed,
      wasOptimal: card.id === bestAvailable.id,
      eloDiff: Math.max(0, bestElo - pickedElo),
    };

    const newDecisions = [...draftState.decisions, decision];
    const newPicks = [...draftState.picks, card];

    // Update all player picks - player 0 is the human
    const newAllPlayerPicks = draftState.allPlayerPicks.map((picks, idx) =>
      idx === 0 ? [...picks, card] : [...picks]
    );

    // Update ELO history for ALL seen cards (track how their value shifts with EVERY pick)
    // IMPORTANT: Create deep copies to ensure React detects state changes
    const newEloHistory = new Map<string, CardEloHistory>();
    const newSeenCards = new Set(draftState.seenCards);
    const pickNum = newPicks.length;

    // Update history for ALL cards we've ever seen - this gives proper sparklines
    draftState.cardEloHistory.forEach((oldHistory, cardId) => {
      // Find the card from our cube data
      const cardData = cards.find((c: CubeCard) => c.id === cardId);
      if (cardData) {
        const synergy = getSynergyAdjustedElo(cardData, newPicks);
        // Create NEW history object with updated array (don't mutate old state)
        newEloHistory.set(cardId, {
          ...oldHistory,
          history: [
            ...oldHistory.history,
            { pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment }
          ]
        });
      } else {
        // Keep old history if card not found
        newEloHistory.set(cardId, oldHistory);
      }
    });

    // IMPORTANT: Ensure the picked card is in history (may be first time seeing it in a new pack)
    if (!newEloHistory.has(card.id)) {
      const baseElo = getEloData(card.name)?.elo || 1500;
      const synergy = getSynergyAdjustedElo(card, newPicks);
      newEloHistory.set(card.id, {
        cardId: card.id,
        cardName: card.name,
        baseElo,
        history: [
          { pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment },
        ],
      });
      newSeenCards.add(card.id);
    }

    let packsAfterHumanPick = draftState.tablePacks.map((pack, idx) =>
      idx === 0 ? pack.filter(c => c.id !== card.id) : pack
    );

    // AI players make their picks using synergy-adjusted ELO
    const { newPacks: packsAfterAiPicks, aiPicks } = simulateOtherPlayersPicks(packsAfterHumanPick, newAllPlayerPicks);

    // Record AI picks
    aiPicks.forEach((aiPick, playerIdx) => {
      if (aiPick && playerIdx > 0) {
        newAllPlayerPicks[playerIdx] = [...newAllPlayerPicks[playerIdx], aiPick];
      }
    });

    const newTablePacks = rotatePacks(packsAfterAiPicks, draftState.direction);
    const newPickNumber = draftState.pickNumber + 1;

    // Track wheeled cards and regrettable passes
    const newRegrettablePasses = new Map(draftState.regrettablePasses);
    const newWheeledCards = new Map(draftState.wheeledCards);

    // Update history for cards in our new pack (after rotation)
    if (newTablePacks[0]) {
      newTablePacks[0].forEach(c => {
        const synergy = getSynergyAdjustedElo(c, newPicks);
        const existing = newEloHistory.get(c.id);

        // Check if this card wheeled back to us (we saw it before)
        if (draftState.seenCards.has(c.id) && !newWheeledCards.has(c.id)) {
          const passedInfo = draftState.passedCards.get(c.id);
          if (passedInfo) {
            newWheeledCards.set(c.id, {
              card: c,
              originalPick: passedInfo.passedAtPick,
              wheeledAt: pickNum,
            });
          }
        }

        newSeenCards.add(c.id);
        if (existing) {
          // Only add point if we don't already have one for this pick
          const lastPick = existing.history[existing.history.length - 1]?.pick;
          if (lastPick !== pickNum) {
            // Create NEW history object (don't mutate)
            newEloHistory.set(c.id, {
              ...existing,
              history: [
                ...existing.history,
                { pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment }
              ]
            });
          }
        } else {
          // New card we haven't seen - start with single point at current pick
          const baseElo = getEloData(c.name)?.elo || 1500;
          newEloHistory.set(c.id, {
            cardId: c.id,
            cardName: c.name,
            baseElo,
            // Single point - history grows with each subsequent pick
            history: [
              { pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment },
            ],
          });
        }
      });
    }

    // Detect regrettable passes - cards we passed that would now be great for us
    passed.forEach(c => {
      const synergy = getSynergyAdjustedElo(c, newPicks);
      const elo = getEloData(c.name)?.elo || 1500;
      // High synergy bonus + good card = regrettable pass
      if (synergy.adjustment >= 60 && elo >= 1600) {
        newRegrettablePasses.set(c.id, {
          card: c,
          passedAt: pickNum,
          whyRegret: synergy.reasons.join(', '),
        });
      }
    });

    // Return the result for quiz draft mode
    const result = {
      yourPick: card,
      optimalPick: bestAvailable,
      wasCorrect: card.id === bestAvailable.id,
      eloDiff: Math.max(0, bestElo - pickedElo),
    };

    if (newPickNumber > CARDS_PER_PACK) {
      if (draftState.packNumber >= 3) {
        setDraftState({ ...draftState, picks: newPicks, isComplete: true, passedCards: newPassedCards, decisions: newDecisions, allPlayerPicks: newAllPlayerPicks, cardEloHistory: newEloHistory, seenCards: newSeenCards, regrettablePasses: newRegrettablePasses, wheeledCards: newWheeledCards });
      } else {
        setDraftState(startNewPack(newPicks, draftState.packNumber + 1, draftState.usedCardIds, newPassedCards, newDecisions, newAllPlayerPicks, newEloHistory, newSeenCards, newRegrettablePasses, newWheeledCards));
      }
    } else {
      setDraftState({ ...draftState, tablePacks: newTablePacks, picks: newPicks, pickNumber: newPickNumber, passedCards: newPassedCards, decisions: newDecisions, allPlayerPicks: newAllPlayerPicks, cardEloHistory: newEloHistory, seenCards: newSeenCards, regrettablePasses: newRegrettablePasses, wheeledCards: newWheeledCards });
    }

    return result;
  }, [draftState, startNewPack]);

  const makePick = useCallback((card: CubeCard) => {
    if (!draftState || draftState.isComplete) return;

    // In quiz draft mode, just select the card (don't pick yet)
    if (quizDraftMode && !showPickReveal) {
      setPendingPick(card);
      return;
    }

    executePickLogic(card);
  }, [draftState, quizDraftMode, showPickReveal, executePickLogic]);

  // Quiz draft: Lock in the pending pick and show result (WITHOUT progressing draft)
  const confirmQuizPick = useCallback(() => {
    if (!pendingPick || !draftState) return;

    const currentPack = draftState.tablePacks[0];
    const { bestCard: bestAvailable } = getContextAwareBestPick(currentPack, draftState.picks, draftState.cardEloHistory);
    const bestElo = getEloData(bestAvailable.name)?.elo || 0;
    const pickedElo = getEloData(pendingPick.name)?.elo || 0;

    // Check if the picked card is "premium" (percentile >= 75 = "TAKE NOW" tier)
    // Any premium card is considered a correct pick, not just THE highest ELO
    const pickedPercentile = getPercentile(pendingPick.name);
    const isPremiumPick = pickedPercentile >= 75;

    // Also check wheel likelihood - unlikely to wheel means it's a priority pick
    const pickedWheelLikelihood = getWheelLikelihood(pendingPick.name);
    const isUnlikelyToWheel = pickedWheelLikelihood === 'unlikely';

    // A pick is "correct" if it's either:
    // 1. The exact best card, OR
    // 2. A premium card (top 25%), OR
    // 3. A card unlikely to wheel that's still reasonably good (top 50%)
    const isExactBest = pendingPick.id === bestAvailable.id;
    const wasCorrect = isExactBest || isPremiumPick || (isUnlikelyToWheel && pickedPercentile >= 50);

    const result = {
      yourPick: pendingPick,
      optimalPick: bestAvailable,
      wasCorrect,
      eloDiff: Math.max(0, bestElo - pickedElo),
    };

    setLastPickResult(result);
    setShowPickReveal(true);
    // Keep pendingPick so we know which card to actually pick when continuing

    // Update quiz draft stats
    setQuizDraftStats(prev => ({
      correct: prev.correct + (result.wasCorrect ? 1 : 0),
      total: prev.total + 1,
      totalEloDiff: prev.totalEloDiff + result.eloDiff,
      history: [...prev.history, {
        yourPick: result.yourPick.name,
        optimalPick: result.optimalPick.name,
        wasCorrect: result.wasCorrect,
        eloDiff: result.eloDiff,
        packNum: draftState.packNumber,
        pickNum: draftState.pickNumber,
      }]
    }));
  }, [pendingPick, draftState]);

  // Quiz draft: Continue to next pick after viewing result - NOW execute the pick
  const continueAfterReveal = useCallback(() => {
    if (pendingPick) {
      executePickLogic(pendingPick);
    }
    setShowPickReveal(false);
    setLastPickResult(null);
    setPendingPick(null);
  }, [pendingPick, executePickLogic]);

  // Keyboard shortcuts for fast drafting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (mode === 'draft' && draftState && !draftState.isComplete) {
        // Quiz draft mode keyboard handling
        if (quizDraftMode) {
          if (showPickReveal) {
            // After reveal, Enter/Space to continue
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              continueAfterReveal();
            }
          } else if (pendingPick) {
            // With pending pick, Enter to confirm
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmQuizPick();
            }
            // Number keys to change selection
            const num = parseInt(e.key);
            const currentPack = draftState.tablePacks[0];
            if (num >= 1 && num <= Math.min(9, currentPack.length)) {
              setPendingPick(currentPack[num - 1]);
            }
          } else {
            // No pending pick, number keys to select
            const currentPack = draftState.tablePacks[0];
            const num = parseInt(e.key);
            if (num >= 1 && num <= Math.min(9, currentPack.length)) {
              setPendingPick(currentPack[num - 1]);
            }
          }
        } else {
          // Normal draft mode
          const currentPack = draftState.tablePacks[0];
          const num = parseInt(e.key);
          if (num >= 1 && num <= Math.min(9, currentPack.length)) {
            makePick(currentPack[num - 1]);
          }
        }
      }

      if (mode === 'quiz' && quizState) {
        if (!quizState.revealed) {
          const num = parseInt(e.key);
          if (num >= 1 && num <= Math.min(9, quizState.currentPack.length)) {
            makeQuizPick(quizState.currentPack[num - 1]);
          }
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          nextQuizQuestion();
        }
      }

      // Escape to return to menu
      if (e.key === 'Escape') {
        returnToMenu();
      }

      // L to toggle coach mode (not in quiz draft mode)
      if (e.key.toLowerCase() === 'l' && !quizDraftMode) {
        e.preventDefault();
        setCoachMode(c => !c);
      }

      // V to toggle viewing picks
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setViewingPicks(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, draftState, quizState, quizDraftMode, showPickReveal, pendingPick, makePick, makeQuizPick, nextQuizQuestion, returnToMenu, confirmQuizPick, continueAfterReveal]);

  // Use coach's recommended card (same logic)
  const getRecommendedPick = useMemo(() => {
    return coachExplanation?.card || null;
  }, [coachExplanation]);

  const colorCounts = useMemo(() => {
    if (!draftState) return {};
    const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    draftState.picks.forEach(c => {
      c.color_identity?.forEach(col => {
        if (counts[col] !== undefined) counts[col]++;
      });
    });
    return counts;
  }, [draftState]);

  // Deck statistics
  const deckStats = useMemo(() => {
    if (!draftState || draftState.picks.length === 0) return null;
    const picks = draftState.picks;
    const creatures = picks.filter(c => c.type_line?.toLowerCase().includes('creature')).length;
    const instants = picks.filter(c => c.type_line?.toLowerCase().includes('instant')).length;
    const sorceries = picks.filter(c => c.type_line?.toLowerCase().includes('sorcery')).length;
    const artifacts = picks.filter(c => c.type_line?.toLowerCase().includes('artifact') && !c.type_line?.toLowerCase().includes('creature')).length;
    const lands = picks.filter(c => c.type_line?.toLowerCase().includes('land')).length;
    const nonLands = picks.filter(c => !c.type_line?.toLowerCase().includes('land'));
    const avgCmc = nonLands.length > 0 ? nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length : 0;
    const avgPower = picks.reduce((sum, c) => sum + c.powerLevel, 0) / picks.length;

    return { creatures, instants, sorceries, artifacts, lands, avgCmc, avgPower, spells: instants + sorceries };
  }, [draftState]);

  // Comprehensive archetype definitions with card detection
  const ARCHETYPES = useMemo(() => [
    { id: 'reanimator', name: 'Reanimator', shortName: 'Rean', colors: ['U', 'B'],
      keyCards: ['Entomb', 'Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Exhume', 'Necromancy', 'Life // Death', 'Persist'],
      patterns: [/return.*creature.*graveyard.*battlefield/i, /put.*creature.*graveyard.*battlefield/i],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const oracle = c.oracle_text?.toLowerCase() || '';
        const cmc = c.cmc || 0;
        const type = c.type_line?.toLowerCase() || '';
        // Reanimation spells
        if (['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume', 'Life // Death', 'Persist', 'Shallow Grave', 'Corpse Dance'].includes(name)) return true;
        // Big creatures that want to be cheated
        if (type.includes('creature') && cmc >= 7) return true;
        // Discard outlets
        if (oracle.includes('discard') && oracle.includes('card')) return true;
        return false;
      }
    },
    { id: 'storm', name: 'Storm', shortName: 'Storm', colors: ['U', 'R', 'B'],
      keyCards: ['Brain Freeze', 'Underworld Breach', 'Time Spiral', "Yawgmoth's Will", 'Wheel of Fortune', "Lion's Eye Diamond", 'Dark Ritual', 'Tendrils of Agony'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const oracle = c.oracle_text?.toLowerCase() || '';
        if (['Brain Freeze', 'Tendrils of Agony', "Yawgmoth's Will", 'Underworld Breach', "Lion's Eye Diamond", 'Dark Ritual', 'Cabal Ritual', 'Wheel of Fortune', 'Time Spiral', 'Frantic Search', 'High Tide'].includes(name)) return true;
        if (oracle.includes('storm')) return true;
        if (oracle.includes('add {') && oracle.includes('add {') && !c.type_line?.toLowerCase().includes('land')) return true;
        return false;
      }
    },
    { id: 'tinker', name: 'Artifact Combo', shortName: 'Tinker', colors: ['U'],
      keyCards: ['Tinker', 'Tolarian Academy', 'Mana Vault', 'Time Vault', 'Blightsteel Colossus', "Mishra's Workshop", "Urza's Saga", 'Kuldotha Forgemaster'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const type = c.type_line?.toLowerCase() || '';
        if (['Tinker', 'Tolarian Academy', "Urza's Saga", 'Kuldotha Forgemaster', 'Blightsteel Colossus', 'Myr Battlesphere', 'Sundering Titan'].includes(name)) return true;
        if (type.includes('artifact') && !type.includes('creature')) return true;
        if (name.toLowerCase().includes('mox')) return true;
        return false;
      }
    },
    { id: 'sneak', name: 'Sneak & Show', shortName: 'Sneak', colors: ['U', 'R'],
      keyCards: ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const cmc = c.cmc || 0;
        const type = c.type_line?.toLowerCase() || '';
        if (['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Omniscience'].includes(name)) return true;
        // Huge creatures that are cheat targets
        if (type.includes('creature') && cmc >= 8) return true;
        return false;
      }
    },
    { id: 'control', name: 'UW Control', shortName: 'Ctrl', colors: ['W', 'U'],
      keyCards: ['Jace, the Mind Sculptor', 'The Wandering Emperor', 'Counterspell', 'Swords to Plowshares', 'Force of Will', 'Balance', 'Teferi, Time Raveler', 'Wrath of God', 'Supreme Verdict'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const oracle = c.oracle_text?.toLowerCase() || '';
        const type = c.type_line?.toLowerCase() || '';
        if (['Counterspell', 'Force of Will', 'Mana Drain', 'Force of Negation', 'Cryptic Command'].includes(name)) return true;
        if (['Wrath of God', 'Supreme Verdict', 'Day of Judgment', 'Terminus', 'Balance'].includes(name)) return true;
        if (oracle.includes('counter target spell')) return true;
        if (oracle.includes('destroy all creatures')) return true;
        if (type.includes('planeswalker') && (c.color_identity?.includes('U') || c.color_identity?.includes('W'))) return true;
        return false;
      }
    },
    { id: 'aggro', name: 'Mono-Red Aggro', shortName: 'Aggro', colors: ['R'],
      keyCards: ['Ragavan, Nimble Pilferer', 'Goblin Guide', 'Monastery Swiftspear', 'Lightning Bolt', "Eidolon of the Great Revel", 'Sulfuric Vortex'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const cmc = c.cmc || 0;
        const type = c.type_line?.toLowerCase() || '';
        const colors = c.color_identity || [];
        const oracle = c.oracle_text?.toLowerCase() || '';
        if (['Ragavan, Nimble Pilferer', 'Goblin Guide', 'Monastery Swiftspear', 'Lightning Bolt', "Eidolon of the Great Revel"].includes(name)) return true;
        // Cheap red creatures with haste
        if (colors.length === 1 && colors[0] === 'R' && type.includes('creature') && cmc <= 2) return true;
        // Burn spells
        if (colors.includes('R') && oracle.includes('damage') && (oracle.includes('any target') || oracle.includes('target player'))) return true;
        return false;
      }
    },
    { id: 'white-weenie', name: 'White Weenie', shortName: 'WW', colors: ['W'],
      keyCards: ['Mother of Runes', 'Thalia, Guardian of Thraben', 'Adeline, Resplendent Cathar', 'Armageddon', 'Monastery Mentor', 'Usher of the Fallen'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const cmc = c.cmc || 0;
        const type = c.type_line?.toLowerCase() || '';
        const colors = c.color_identity || [];
        if (['Mother of Runes', 'Thalia, Guardian of Thraben', 'Adeline, Resplendent Cathar', 'Armageddon'].includes(name)) return true;
        // Cheap white creatures
        if (colors.length === 1 && colors[0] === 'W' && type.includes('creature') && cmc <= 3) return true;
        return false;
      }
    },
    { id: 'ramp', name: 'Green Ramp', shortName: 'Ramp', colors: ['G', 'U'],
      keyCards: ['Channel', 'Primeval Titan', 'Craterhoof Behemoth', 'Natural Order', 'Fastbond', "Uro, Titan of Nature's Wrath", 'Oracle of Mul Daya'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const oracle = c.oracle_text?.toLowerCase() || '';
        const type = c.type_line?.toLowerCase() || '';
        if (['Channel', 'Natural Order', 'Primeval Titan', 'Craterhoof Behemoth', 'Fastbond'].includes(name)) return true;
        // Mana dorks
        if (type.includes('creature') && oracle.includes('add {g}')) return true;
        // Land searching
        if (oracle.includes('search your library') && oracle.includes('land')) return true;
        return false;
      }
    },
    { id: 'midrange', name: 'BG Midrange', shortName: 'Mid', colors: ['B', 'G'],
      keyCards: ['Deathrite Shaman', 'Grist, the Hunger Tide', 'Liliana of the Veil', 'Tireless Tracker', 'Scavenging Ooze', 'Tarmogoyf'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const cmc = c.cmc || 0;
        const type = c.type_line?.toLowerCase() || '';
        const colors = c.color_identity || [];
        if (['Deathrite Shaman', 'Tarmogoyf', 'Liliana of the Veil', 'Tireless Tracker'].includes(name)) return true;
        // Efficient creatures in the 2-4 mana range
        if ((colors.includes('B') || colors.includes('G')) && type.includes('creature') && cmc >= 2 && cmc <= 4) return true;
        return false;
      }
    },
    { id: 'tempo', name: 'UR Tempo', shortName: 'Tempo', colors: ['U', 'R'],
      keyCards: ['Dreadhorde Arcanist', 'Young Pyromancer', 'Snapcaster Mage', 'Brainstorm', 'Lightning Bolt', 'Expressive Iteration'],
      detectCard: (c: CubeCard) => {
        const name = c.name;
        const cmc = c.cmc || 0;
        const type = c.type_line?.toLowerCase() || '';
        const colors = c.color_identity || [];
        if (['Dreadhorde Arcanist', 'Young Pyromancer', 'Snapcaster Mage', 'Brainstorm'].includes(name)) return true;
        // Cheap UR creatures/spells
        if ((colors.includes('U') || colors.includes('R')) && (type.includes('instant') || type.includes('sorcery')) && cmc <= 2) return true;
        return false;
      }
    },
  ], []);

  // Universal cards that fit multiple archetypes
  const UNIVERSAL_TUTORS = ['Demonic Tutor', 'Vampiric Tutor', 'Imperial Seal', 'Mystical Tutor', 'Enlightened Tutor'];
  const UNIVERSAL_FAST_MANA = ['Black Lotus', 'Mox Pearl', 'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Sol Ring', 'Mana Crypt', 'Mana Vault', 'Chrome Mox', 'Mox Diamond', 'Lotus Petal'];
  const UNIVERSAL_DRAW = ['Ancestral Recall', 'Time Walk', 'Timetwister', 'Brainstorm', 'Ponder', 'Preordain'];

  // Get archetype tags for a card (for display on cards)
  const getCardArchetypes = useCallback((card: CubeCard): { id: string; shortName: string; isUniversal?: boolean }[] => {
    const matches: { id: string; shortName: string; isUniversal?: boolean }[] = [];

    // Check for universal cards first
    if (UNIVERSAL_TUTORS.includes(card.name)) {
      matches.push({ id: 'tutor', shortName: 'Tutor', isUniversal: true });
      // Tutors especially help combo decks
      matches.push({ id: 'storm', shortName: 'Storm' });
      matches.push({ id: 'reanimator', shortName: 'Rean' });
    } else if (UNIVERSAL_FAST_MANA.includes(card.name)) {
      matches.push({ id: 'fast-mana', shortName: 'Mana', isUniversal: true });
      matches.push({ id: 'storm', shortName: 'Storm' });
      matches.push({ id: 'tinker', shortName: 'Tinker' });
    } else if (UNIVERSAL_DRAW.includes(card.name)) {
      matches.push({ id: 'card-draw', shortName: 'Draw', isUniversal: true });
    } else {
      // Check specific archetypes
      for (const arch of ARCHETYPES) {
        if (arch.keyCards.includes(card.name) || arch.detectCard(card)) {
          matches.push({ id: arch.id, shortName: arch.shortName });
        }
      }
    }

    return matches.slice(0, 3); // Max 3 tags per card
  }, [ARCHETYPES]);

  // Archetype matching for deck - determines what you're building toward
  const archetypeMatches = useMemo(() => {
    if (!draftState || draftState.picks.length < 3) return [];

    const pickNames = draftState.picks.map(p => p.name);
    const pickColors = Object.entries(colorCounts).filter(([_, count]) => count >= 2).map(([color]) => color);

    return ARCHETYPES.map(arch => {
      let score = 0;
      // Color match (up to 30 points)
      if (arch.colors.length === 0) {
        score += 15; // Colorless archetypes get base points
      } else {
        const colorMatch = arch.colors.filter(c => pickColors.includes(c)).length;
        score += (colorMatch / arch.colors.length) * 30;
      }
      // Key card match (up to 40 points) - having key cards is very important
      const keyCardsFound = arch.keyCards.filter(kc => pickNames.includes(kc)).length;
      score += (keyCardsFound / Math.min(3, arch.keyCards.length)) * 40;

      // Count how many picks fit this archetype (up to 30 points)
      const fittingCards = draftState.picks.filter(p => arch.detectCard(p)).length;
      const fitPercent = fittingCards / draftState.picks.length;
      score += fitPercent * 30;

      return { ...arch, score: Math.round(score), keyCardsFound, fittingCards };
    })
    .filter(a => a.score > 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  }, [draftState, colorCounts, ARCHETYPES]);

  // The primary archetype we're building toward
  const buildingToward = useMemo(() => {
    if (archetypeMatches.length === 0) return null;
    const top = archetypeMatches[0];
    if (top.score < 35) return null; // Need reasonable confidence
    return top;
  }, [archetypeMatches]);

  // SPARKLINE - Simple direct lookup, no complex caching
  // The history is always in draftState.cardEloHistory - just read it directly
  const getSparklineHistory = useCallback((cardId: string) => {
    return draftState?.cardEloHistory?.get(cardId)?.history || [];
  }, [draftState?.cardEloHistory]);

  // Pack ELO statistics
  const packEloStats = useMemo(() => {
    if (!draftState) return null;
    const currentPack = draftState.tablePacks[0];
    if (!currentPack || currentPack.length === 0) return null;

    const cardNames = currentPack.map(c => c.name);
    const deckElo = calculateDeckElo(cardNames);

    // Count wheel likelihoods
    let likelyWheels = 0;
    let maybeWheels = 0;
    let premiumCards = 0;

    currentPack.forEach(card => {
      const wheel = getWheelLikelihood(card.name);
      if (wheel === 'likely') likelyWheels++;
      else if (wheel === 'maybe') maybeWheels++;

      const percentile = getPercentile(card.name);
      if (percentile >= 75) premiumCards++;
    });

    return {
      avgElo: deckElo.rawAverage,
      likelyWheels,
      maybeWheels,
      premiumCards,
      packSize: currentPack.length
    };
  }, [draftState]);

  // Start screen with visual interest
  if (mode === 'menu') {
    return (
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.06] p-6 sm:p-8">
          {/* Card fan background - hidden on mobile */}
          <div className="hidden sm:flex absolute -right-8 top-1/2 -translate-y-1/2 -space-x-20 opacity-60">
            {featuredCards.slice(0, 5).map((card, i) => (
              <div
                key={card.id}
                className="w-36 aspect-[488/680] rounded-xl overflow-hidden shadow-2xl transform"
                style={{
                  transform: `rotate(${(i - 2) * 8}deg) translateY(${Math.abs(i - 2) * 10}px)`,
                  zIndex: 5 - Math.abs(i - 2),
                }}
              >
                <img src={getCardImage(card)} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-md">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Draft Simulator</h2>
            <p className="text-white/50 mb-6 text-sm sm:text-base">
              Practice drafting against 7 AI opponents. Build the best deck from 3 packs of 15 cards each.
            </p>

            {/* Primary CTA */}
            <button
              onClick={() => startDraft(false)}
              className="flex items-center justify-center gap-3 px-10 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all duration-300 group active:scale-95"
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Start Draft
            </button>

            {/* Alternatives */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-xs text-white/30 mb-3">Want to test yourself?</div>
              <div className="flex gap-2">
                <button
                  onClick={() => startDraft(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  <Target className="w-4 h-4 text-purple-400" />
                  Quiz Draft
                </button>
                <button
                  onClick={startQuiz}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  P1P1 Quiz
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-black border border-white/[0.06] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">8 Players</h3>
            <p className="text-sm text-white/40">You plus 7 AI drafters with different color preferences</p>
          </div>

          <div className="bg-black border border-white/[0.06] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">3 Packs</h3>
            <p className="text-sm text-white/40">15 cards per pack, alternating pass directions</p>
          </div>

          <div className="bg-black border border-white/[0.06] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">45 Picks</h3>
            <p className="text-sm text-white/40">Build a 40-card deck from your drafted pool</p>
          </div>

          <div className="bg-black border border-white/[0.06] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">P1P1 Quiz</h3>
            <p className="text-sm text-white/40">Test your card evaluation skills against ELO data</p>
          </div>
        </div>

        {/* Your Stats */}
        {draftStats.totalDrafts > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Stats Summary */}
            <div className="bg-black border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">Your Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{draftStats.totalDrafts}</div>
                  <div className="text-xs text-white/40">Drafts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{draftStats.avgOptimalRate}%</div>
                  <div className="text-xs text-white/40">Avg Optimal</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{draftStats.avgDeckElo}</div>
                  <div className="text-xs text-white/40">Avg Deck ELO</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    draftStats.bestGrade === 'S' ? 'text-amber-400' :
                    draftStats.bestGrade === 'A' ? 'text-purple-400' :
                    draftStats.bestGrade === 'B' ? 'text-blue-400' :
                    'text-white'
                  }`}>{draftStats.bestGrade || '-'}</div>
                  <div className="text-xs text-white/40">Best Grade</div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-black border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">
                  Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACHIEVEMENTS.map(achievement => {
                  const isUnlocked = unlockedAchievements.includes(achievement.id);
                  return (
                    <div
                      key={achievement.id}
                      className={`
                        px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all
                        ${isUnlocked
                          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400'
                          : 'bg-white/[0.02] border border-white/[0.06] text-white/30'
                        }
                      `}
                      title={achievement.description}
                    >
                      <span className={isUnlocked ? '' : 'grayscale opacity-50'}>{achievement.icon}</span>
                      <span className={isUnlocked ? 'font-medium' : ''}>{achievement.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Drafts */}
        {draftHistory.length > 0 && (
          <div className="bg-black border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">Recent Drafts</h3>
            </div>
            <div className="space-y-2">
              {draftHistory.slice(0, 5).map(entry => (
                <div key={entry.id} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-lg">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                    ${entry.grade === 'S' ? 'bg-amber-500/20 text-amber-400' :
                      entry.grade === 'A' ? 'bg-purple-500/20 text-purple-400' :
                      entry.grade === 'B' ? 'bg-blue-500/20 text-blue-400' :
                      entry.grade === 'C' ? 'bg-green-500/20 text-green-400' :
                      'bg-white/5 text-white/40'}
                  `}>
                    {entry.grade}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{entry.mainColors.join('') || 'Colorless'}</span>
                      <span className="text-xs text-white/30">{entry.date}</span>
                    </div>
                    <div className="text-xs text-white/40">
                      ELO {entry.deckElo} · {entry.optimalRate}% optimal
                    </div>
                  </div>
                  <div className="flex -space-x-1">
                    {entry.topPicks.slice(0, 3).map((p, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-mono text-white/50 ring-1 ring-black"
                        title={p.name}
                      >
                        {Math.round(p.elo / 100)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Cards Preview */}
        <div>
          <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-3">Cards you might see</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {featuredCards.map((card) => (
              <div
                key={card.id}
                className="relative w-28 flex-shrink-0 aspect-[488/680] rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform"
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                <div className={`
                  absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${card.powerLevel >= 10 ? 'bg-amber-400 text-black' : 'bg-purple-400 text-white'}
                `}>
                  {card.powerLevel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Quiz mode
  if (mode === 'quiz' && quizState) {
    const correctElo = getEloData(quizState.correctCard.name);
    const userElo = quizState.userPick ? getEloData(quizState.userPick.name) : null;
    const isCorrect = quizState.userPick?.id === quizState.correctCard.id;

    return (
      <div className="pb-24"> {/* Padding for fixed bottom bar */}
        {/* Quiz Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">P1P1 Quiz</h2>
              <p className="text-xs text-white/40">Pick the best card based on ELO</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Score */}
            {quizState.history.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <span className="text-xs text-white/40">{quizState.history.filter(h => h.correct).length}/{quizState.history.length}</span>
                <span className={`text-sm font-bold ${
                  quizAccuracy && quizAccuracy >= 70 ? 'text-green-400' :
                  quizAccuracy && quizAccuracy >= 50 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {quizAccuracy}%
                </span>
              </div>
            )}

            <button
              onClick={returnToMenu}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium hover:bg-white/15 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
        </div>

        {/* Compact instruction */}
        {!quizState.revealed && (
          <div className="text-center text-white/30 text-xs mb-3">
            Click the card you would first-pick · Press 1-9 for quick select
          </div>
        )}

        {/* Pack Grid - More compact with 5 columns */}
        <div className="grid grid-cols-5 gap-2">
          {quizState.currentPack.map((card, index) => {
            const isThisCorrect = card.id === quizState.correctCard.id;
            const isUserPick = card.id === quizState.userPick?.id;
            const cardElo = getEloData(card.name);
            const percentile = getPercentile(card.name);
            const keyNum = index + 1;

            return (
              <div
                key={card.id}
                onClick={() => makeQuizPick(card)}
                onMouseEnter={() => setHoveredCard(card)}
                
                className={`
                  relative aspect-[488/680] rounded-lg overflow-hidden shadow-lg
                  transition-all duration-200
                  ${!quizState.revealed ? 'cursor-pointer hover:scale-105 hover:z-10 hover:shadow-xl' : ''}
                  ${quizState.revealed && isThisCorrect ? 'ring-3 ring-green-400 shadow-green-400/30 scale-105 z-10' : ''}
                  ${quizState.revealed && isUserPick && !isThisCorrect ? 'ring-3 ring-red-400 shadow-red-400/30' : ''}
                  ${quizState.revealed && !isThisCorrect && !isUserPick ? 'opacity-40 scale-95' : ''}
                `}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

                {/* Keyboard hint (before reveal) */}
                {!quizState.revealed && keyNum <= 9 && (
                  <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/60 flex items-center justify-center text-[10px] font-mono text-white/60">
                    {keyNum}
                  </div>
                )}

                {/* Power badge - ONLY show after reveal (it's derived from ELO, would give away answer) */}
                {quizState.revealed && (
                  <div className={`
                    absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow
                    ${card.powerLevel >= 10 ? 'bg-amber-400 text-black' : ''}
                    ${card.powerLevel === 9 ? 'bg-purple-400 text-white' : ''}
                    ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-blue-400 text-white' : ''}
                    ${card.powerLevel < 7 ? 'bg-black/70 text-white/80' : ''}
                  `}>
                    {card.powerLevel}
                  </div>
                )}

                {/* Revealed indicators */}
                {quizState.revealed && (
                  <>
                    {isThisCorrect && (
                      <div className="absolute top-1 left-1">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    {isUserPick && !isThisCorrect && (
                      <div className="absolute top-1 left-1">
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
                          <XCircle className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    {/* ELO overlay - only on correct/picked */}
                    {(isThisCorrect || isUserPick) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 pt-4">
                        <div className="text-center">
                          <div className="text-[10px] font-mono text-white/90">ELO {cardElo ? Math.round(cardElo.elo) : '?'}</div>
                          <div className={`text-[9px] ${
                            percentile >= 75 ? 'text-amber-400' :
                            percentile >= 50 ? 'text-purple-400' :
                            'text-white/50'
                          }`}>
                            Top {100 - percentile}%
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Fixed Bottom Result Bar */}
        {quizState.revealed && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-sm border-t border-white/10">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className={`
                flex items-center gap-3 px-4 py-2 rounded-lg flex-1
                ${isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}
              `}>
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-green-400 text-sm">Correct!</div>
                      <div className="text-xs text-white/50 truncate">
                        {quizState.correctCard.name} · ELO {correctElo ? Math.round(correctElo.elo) : '?'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-red-400 text-sm">Not quite!</div>
                      <div className="text-xs text-white/50 truncate">
                        Best: {quizState.correctCard.name} ({correctElo ? Math.round(correctElo.elo) : '?'})
                        {userElo && <span className="text-white/30"> vs {Math.round(userElo.elo)}</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={nextQuizQuestion}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all active:scale-95 flex-shrink-0"
              >
                Next Pack
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Hover Preview */}
        {hoveredCard && (
          <div className="fixed bottom-6 right-6 z-50 hidden lg:block pointer-events-none">
            <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl w-60">
              <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-full rounded-lg" />
              <div className="mt-2 px-1 space-y-1">
                <div className="text-sm font-medium text-white">{hoveredCard.name}</div>
                <div className="text-xs text-white/40">{hoveredCard.type_line?.split('—')[0]}</div>
                {!quizState.revealed && (
                  <div className="text-[10px] text-amber-400/70 pt-1 border-t border-white/10">
                    ELO hidden until you pick
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Draft complete (but not if viewing results)
  if (draftState?.isComplete && mode !== 'results') {
    const picks = draftState.picks;
    const avgPower = picks.reduce((sum, c) => sum + c.powerLevel, 0) / picks.length;
    const nonLands = picks.filter(c => !c.type_line?.toLowerCase().includes('land'));
    const avgCmc = nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length;
    const deckElo = calculateDeckElo(picks.map(p => p.name));

    // Calculate synergy-adjusted ELO for the final deck
    const adjustedElos = picks.map(card => getSynergyAdjustedElo(card, picks).adjustedElo);
    const avgAdjustedElo = Math.round(adjustedElos.reduce((sum, e) => sum + e, 0) / picks.length);
    const synergyBonus = avgAdjustedElo - deckElo.rawAverage;

    const mainColors = Object.entries(colorCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([color]) => color);

    // Mana curve data
    const curveData = [0, 0, 0, 0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4, 5, 6, 7+
    nonLands.forEach(c => {
      const cmc = Math.min(7, Math.floor(c.cmc || 0));
      curveData[cmc]++;
    });
    const maxCurve = Math.max(...curveData, 1);

    return (
      <div className="space-y-6">
        {/* Header with Grade */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">Draft Complete</h2>
              <p className="text-sm text-white/40 mt-0.5">
                {mainColors.join('')} · {avgPower.toFixed(1)} avg power · {avgCmc.toFixed(1)} avg CMC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Draft Grade */}
            {draftGrade && (
              <div className="text-center px-4">
                <div className="text-xs text-white/40 mb-1">Draft Grade</div>
                <div className={`text-4xl font-bold ${draftGrade.color}`}>{draftGrade.grade}</div>
                <div className="text-[10px] text-white/30">{draftGrade.optimalRate}% optimal picks</div>
              </div>
            )}

            <button
              onClick={() => setMode('results')}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl text-white font-medium hover:from-purple-500/30 hover:to-blue-500/30 transition-colors"
            >
              <Users className="w-4 h-4" />
              View Table
            </button>

            <button
              onClick={returnToMenu}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-medium hover:bg-white/15 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Draft
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-black border border-white/[0.06] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{deckElo.rawAverage}</div>
            <div className="text-xs text-white/40 mt-1">Raw ELO</div>
          </div>
          <div className="bg-black border border-white/[0.06] rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${synergyBonus > 0 ? 'text-green-400' : synergyBonus < 0 ? 'text-red-400' : 'text-white'}`}>
              {avgAdjustedElo}
              {synergyBonus !== 0 && (
                <span className="text-sm ml-1">({synergyBonus > 0 ? '+' : ''}{synergyBonus})</span>
              )}
            </div>
            <div className="text-xs text-white/40 mt-1">Synergy ELO</div>
          </div>
          <div className="bg-black border border-white/[0.06] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{draftGrade?.optimalPicks || 0}/{draftGrade?.totalDecisions || 0}</div>
            <div className="text-xs text-white/40 mt-1">Optimal Picks</div>
          </div>
          <div className="bg-black border border-white/[0.06] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{picks.length}</div>
            <div className="text-xs text-white/40 mt-1">Total Cards</div>
          </div>
          <div className="bg-black border border-white/[0.06] rounded-xl p-4">
            <div className="text-xs text-white/40 mb-2 text-center">Mana Curve</div>
            <div className="flex items-end justify-center gap-1 h-8">
              {curveData.map((count, cmc) => (
                <div key={cmc} className="flex flex-col items-center">
                  <div
                    className="w-3 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                    style={{ height: `${(count / maxCurve) * 24}px`, minHeight: count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-[8px] text-white/30 mt-0.5">{cmc === 7 ? '7+' : cmc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decision Analysis */}
        {draftGrade && (draftGrade.worstPicks.length > 0 || draftGrade.bestPicks.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Missed Opportunities */}
            {draftGrade.worstPicks.length > 0 && (
              <div className="bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-medium text-red-400">Missed Opportunities</h3>
                </div>
                <div className="space-y-2">
                  {draftGrade.worstPicks.map((decision, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                      <div className="w-8 h-11 rounded overflow-hidden flex-shrink-0">
                        <img src={getCardImage(decision.pick)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/60 truncate">Picked: {decision.pick.name}</div>
                        <div className="text-[10px] text-red-400">
                          Better fit: {decision.bestAvailable.name}
                        </div>
                      </div>
                      <div className="text-[10px] text-white/30">P{decision.packNumber}P{decision.pickNumber}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Great Picks */}
            {draftGrade.bestPicks.length > 0 && (
              <div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-medium text-green-400">Great Picks</h3>
                </div>
                <div className="space-y-2">
                  {draftGrade.bestPicks.map((decision, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                      <div className="w-8 h-11 rounded overflow-hidden flex-shrink-0">
                        <img src={getCardImage(decision.pick)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/80 truncate">{decision.pick.name}</div>
                        <div className="text-[10px] text-green-400">
                          Best pick from {decision.packContents.length} cards
                        </div>
                      </div>
                      <div className="text-[10px] text-white/30">P{decision.packNumber}P{decision.pickNumber}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card Pool */}
        <div>
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Your Pool ({picks.length} cards)</h3>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2">
            {picks.map((card, idx) => {
              const decision = draftState.decisions[idx];
              const wasOptimal = decision?.wasOptimal;

              return (
                <div
                  key={`${card.id}-${idx}`}
                  className={`relative aspect-[488/680] rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform ${
                    wasOptimal === false ? 'ring-2 ring-red-400/30' : ''
                  }`}
                  onMouseEnter={() => setHoveredCard(card)}
                  
                >
                  <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                  {wasOptimal === false && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center">
                      <XCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {hoveredCard && (
          <div className="fixed bottom-6 right-6 z-50 hidden lg:block pointer-events-none">
            <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl">
              <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-56 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results view - show all 8 decks
  if (mode === 'results' && draftState) {
    // Check if allPlayerPicks exists (for drafts started before this feature)
    if (!draftState.allPlayerPicks || draftState.allPlayerPicks.every(picks => picks.length === 0)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-white/30" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">Table View Not Available</h2>
            <p className="text-white/40 max-w-md">
              This draft was started before the table view feature was added. Start a new draft to see all 8 decks after completion.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setMode('draft')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-medium hover:bg-white/15 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Deck
            </button>
            <button
              onClick={returnToMenu}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/20 border border-purple-500/30 rounded-xl text-white font-medium hover:bg-purple-500/30 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start New Draft
            </button>
          </div>
        </div>
      );
    }

    // Calculate stats for each player
    const playerStats = draftState.allPlayerPicks.map((picks, playerIdx) => {
      const deckElo = calculateDeckElo(picks.map(p => p.name));
      const colorCts: Record<string, number> = {};
      picks.forEach(c => {
        c.color_identity?.forEach(col => {
          colorCts[col] = (colorCts[col] || 0) + 1;
        });
      });
      const mainColors = Object.entries(colorCts)
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([color]) => color);

      // Detect archetype based on picks
      let archetype = 'Unknown';
      const hasChannel = picks.some(p => p.name === 'Channel');
      const hasEmrakul = picks.some(p => p.name.includes('Emrakul'));
      const hasReanimation = picks.some(p => ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy'].includes(p.name));
      const hasTinker = picks.some(p => p.name === 'Tinker');
      const hasStorm = picks.some(p => p.oracle_text?.toLowerCase().includes('storm'));
      const creatureCount = picks.filter(p => p.type_line?.toLowerCase().includes('creature')).length;
      const spellCount = picks.filter(p => p.type_line?.toLowerCase().includes('instant') || p.type_line?.toLowerCase().includes('sorcery')).length;
      const avgCmc = picks.reduce((sum, p) => sum + (p.cmc || 0), 0) / picks.length;

      if (hasChannel || hasEmrakul) archetype = 'Channel Combo';
      else if (hasReanimation) archetype = 'Reanimator';
      else if (hasTinker) archetype = 'Artifact Combo';
      else if (hasStorm) archetype = 'Storm';
      else if (mainColors.includes('U') && mainColors.includes('B') && spellCount > creatureCount) archetype = 'Control';
      else if (mainColors.includes('R') && mainColors.includes('W') && avgCmc < 3) archetype = 'Aggro';
      else if (mainColors.includes('G') && creatureCount >= 20) archetype = 'Green Ramp';
      else if (mainColors.includes('U') && mainColors.includes('R')) archetype = 'Tempo';
      else if (creatureCount >= 18) archetype = 'Midrange';
      else archetype = 'Goodstuff';

      // Calculate average synergy-adjusted ELO for the final deck
      // This shows how well the cards work together, not just raw power
      const adjustedElos = picks.map(card => getSynergyAdjustedElo(card, picks).adjustedElo);
      const avgAdjustedElo = Math.round(adjustedElos.reduce((sum, e) => sum + e, 0) / picks.length);

      // Calculate archetype coherence (0-100%)
      // Based on: color focus, synergy cards, curve appropriateness
      let coherenceScore = 0;

      // Color coherence: 2 colors = best, 3 = ok, 4+ = bad
      const colorCount = Object.keys(colorCts).length;
      if (colorCount <= 2) coherenceScore += 35;
      else if (colorCount === 3) coherenceScore += 20;
      else coherenceScore += 5;

      // Color density: how concentrated picks are in main colors
      const totalColored = picks.filter(p => (p.color_identity?.length || 0) > 0).length;
      const inMainColors = picks.filter(p =>
        p.color_identity?.every(c => mainColors.includes(c)) ?? true
      ).length;
      const colorFocus = totalColored > 0 ? (inMainColors / totalColored) * 30 : 30;
      coherenceScore += colorFocus;

      // Archetype synergy: key cards present for the detected archetype
      if (archetype === 'Channel Combo' && (hasChannel && hasEmrakul)) coherenceScore += 35;
      else if (archetype === 'Reanimator' && hasReanimation && picks.some(p => (p.cmc || 0) >= 7)) coherenceScore += 35;
      else if (archetype === 'Artifact Combo' && hasTinker && picks.filter(p => p.type_line?.toLowerCase().includes('artifact')).length >= 8) coherenceScore += 35;
      else if (archetype === 'Aggro' && avgCmc < 2.8 && creatureCount >= 15) coherenceScore += 35;
      else if (archetype === 'Control' && picks.filter(p => p.oracle_text?.toLowerCase().includes('counter') || p.oracle_text?.toLowerCase().includes('destroy target')).length >= 6) coherenceScore += 35;
      else if (archetype !== 'Unknown' && archetype !== 'Goodstuff') coherenceScore += 20; // Some coherence
      else coherenceScore += 10; // Goodstuff gets some credit

      const archetypeCoherence = Math.min(100, Math.round(coherenceScore));

      const topCards = picks
        .map(p => ({ card: p, elo: getEloData(p.name)?.elo || 0 }))
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 5);

      return {
        playerIdx,
        name: AI_PLAYERS[playerIdx].name,
        picks,
        deckElo: deckElo.rawAverage,
        avgAdjustedElo,
        archetypeCoherence,
        mainColors,
        archetype,
        topCards,
        avgCmc: avgCmc.toFixed(1),
        creatureCount,
      };
    });

    // Sort by ELO (highest first)
    const rankedPlayers = [...playerStats].sort((a, b) => b.deckElo - a.deckElo);
    const yourRank = rankedPlayers.findIndex(p => p.playerIdx === 0) + 1;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">Draft Table</h2>
              <p className="text-sm text-white/40 mt-0.5">
                Your deck ranked #{yourRank} of 8
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('draft')}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-medium hover:bg-white/15 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Your Deck
            </button>
            <button
              onClick={returnToMenu}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-medium hover:bg-white/15 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Draft
            </button>
          </div>
        </div>

        {/* Deck Rankings */}
        <div className="space-y-3">
          {rankedPlayers.map((player, rank) => {
            const isYou = player.playerIdx === 0;
            const colorMap: Record<string, string> = {
              W: 'bg-amber-100 text-amber-900',
              U: 'bg-blue-500 text-white',
              B: 'bg-purple-900 text-purple-100',
              R: 'bg-red-500 text-white',
              G: 'bg-green-600 text-white',
            };

            const isExpanded = expandedPlayerIdx === player.playerIdx;

            return (
              <div
                key={player.playerIdx}
                className={`rounded-xl border transition-all ${
                  isYou
                    ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                {/* Clickable Header */}
                <div
                  className={`p-4 cursor-pointer ${!isExpanded ? 'hover:bg-white/[0.02]' : ''} rounded-xl transition-colors`}
                  onClick={() => setExpandedPlayerIdx(isExpanded ? null : player.playerIdx)}
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      rank === 0 ? 'bg-amber-500/20 text-amber-400' :
                      rank === 1 ? 'bg-gray-400/20 text-gray-300' :
                      rank === 2 ? 'bg-orange-600/20 text-orange-400' :
                      'bg-white/5 text-white/30'
                    }`}>
                      {rank + 1}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${isYou ? 'text-purple-300' : 'text-white'}`}>
                          {player.name}
                        </span>
                        {isYou && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded-full uppercase">
                            You
                          </span>
                        )}
                        <div className="flex gap-1">
                          {player.mainColors.map(color => (
                            <span
                              key={color}
                              className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${colorMap[color] || 'bg-gray-500 text-white'}`}
                            >
                              {color}
                            </span>
                          ))}
                        </div>
                        <span className="text-white/30 text-xs ml-2">
                          {isExpanded ? '▼' : '▶'} Click to {isExpanded ? 'collapse' : 'view all cards'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span className="px-2 py-0.5 bg-white/5 rounded">{player.archetype}</span>
                        <span>{player.picks.length} cards</span>
                        <span>{player.avgCmc} avg CMC</span>
                        <span>{player.creatureCount} creatures</span>
                      </div>

                      {/* Top Cards Preview (only when collapsed) */}
                      {!isExpanded && (
                        <div className="flex gap-1.5 mt-3">
                          {player.topCards.slice(0, 5).map(({ card }) => (
                            <div
                              key={card.id}
                              className="w-10 h-14 rounded overflow-hidden border border-white/10"
                              onMouseEnter={() => setHoveredCard(card)}
                              
                            >
                              <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ELO Scores */}
                    <div className="text-right flex items-center gap-4">
                      {/* Synergy-Adjusted ELO */}
                      <div className="hidden sm:block">
                        <div className={`text-lg font-semibold ${
                          player.avgAdjustedElo > player.deckElo
                            ? 'text-green-400'
                            : player.avgAdjustedElo < player.deckElo
                              ? 'text-red-400'
                              : 'text-white/70'
                        }`}>
                          {player.avgAdjustedElo}
                          {player.avgAdjustedElo !== player.deckElo && (
                            <span className="text-xs ml-1">
                              ({player.avgAdjustedElo > player.deckElo ? '+' : ''}{player.avgAdjustedElo - player.deckElo})
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wide">Synergy ELO</div>
                      </div>
                      {/* Coherence */}
                      <div className="hidden md:block">
                        <div className={`text-lg font-semibold ${
                          player.archetypeCoherence >= 80 ? 'text-green-400' :
                          player.archetypeCoherence >= 60 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {player.archetypeCoherence}%
                        </div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wide">Coherence</div>
                      </div>
                      {/* Raw Deck ELO */}
                      <div>
                        <div className={`text-2xl font-bold ${
                          rank === 0 ? 'text-amber-400' : isYou ? 'text-purple-300' : 'text-white'
                        }`}>
                          {player.deckElo}
                        </div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wide">Deck ELO</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Full Deck */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/[0.06] pt-4">
                    <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-11 lg:grid-cols-15 gap-1.5">
                      {player.picks
                        .map(card => ({ card, elo: getEloData(card.name)?.elo || 0 }))
                        .sort((a, b) => b.elo - a.elo)
                        .map(({ card }) => (
                          <div
                            key={card.id}
                            className="aspect-[488/680] rounded-lg overflow-hidden border border-white/10 hover:border-white/30 hover:scale-105 transition-all cursor-pointer"
                            onMouseEnter={() => setHoveredCard(card)}
                            
                          >
                            <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hover Preview */}
        {hoveredCard && (
          <div className="fixed bottom-6 right-6 z-50 hidden lg:block pointer-events-none">
            <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl">
              <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-56 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active draft - guard against null state
  if (!draftState) return null;

  const currentPack = draftState.tablePacks[0];
  const progress = ((draftState.packNumber - 1) * 15 + draftState.pickNumber - 1) / 45;
  const recommendedCard = getRecommendedPick;

  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-64 z-40 flex bg-black pt-[env(safe-area-inset-top)]">
      {/* Achievement Popup */}
      {newAchievement && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className="bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-2 border-amber-400/50 rounded-xl p-4 shadow-2xl shadow-amber-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="text-4xl animate-bounce">{newAchievement.icon}</div>
              <div>
                <div className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Achievement Unlocked!</div>
                <div className="text-xl font-bold text-amber-200">{newAchievement.name}</div>
                <div className="text-sm text-amber-100/70">{newAchievement.description}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel - Coaching (full-height panel with background) */}
      <div className="w-[320px] flex-shrink-0 hidden lg:flex flex-col bg-white/[0.02] border-r border-white/[0.08]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Coach Panel - Spacious design */}
          {(coachMode || (quizDraftMode && showPickReveal)) && coachExplanation && (
            <div className="space-y-4">
              <button
                onClick={() => setShowCoachExplanation(!showCoachExplanation)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-white/50" />
                  <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Recommended</span>
                </div>
                <span className="text-white/30 text-sm">{showCoachExplanation ? '−' : '+'}</span>
              </button>

              <div className="space-y-4">
                {/* Main Pick Recommendation - LARGER */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-22 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                    <img src={getCardImage(coachExplanation.card)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-white">{coachExplanation.card.name}</div>
                    <div className="text-sm text-white/40 font-mono">{Math.round(coachExplanation.elo)} ELO</div>
                    <div className="mt-1 text-sm text-white/60 leading-snug">
                      {coachExplanation.mainReason}
                    </div>
                  </div>
                </div>

                {/* Current Archetype with Emergence */}
                {coachExplanation.currentArchetype && (
                  <div className="space-y-1">
                    <div className="text-sm text-white/40">
                      Building: <span className="text-white/70 font-medium">{coachExplanation.currentArchetype}</span>
                    </div>
                    {(() => {
                      const archetypeId = coachExplanation.currentArchetype.toLowerCase();
                      const context = getArchetypeContext(archetypeId);
                      if (!context) return null;
                      return (
                        <div className="text-xs text-white/30 italic">
                          {context}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {showCoachExplanation && (
                  <>
                    {/* Deck Needs */}
                    {coachExplanation.deckNeeds && coachExplanation.deckNeeds.length > 0 && (
                      <div className="pt-4 border-t border-white/[0.08]">
                        <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Deck Needs</div>
                        <div className="flex flex-wrap gap-2">
                          {coachExplanation.deckNeeds.map((need, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white/[0.05] text-white/70 text-sm rounded-lg">
                              {need}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alternatives */}
                    {coachExplanation.alternatives && coachExplanation.alternatives.length > 0 && (
                      <div className="pt-4 border-t border-white/[0.08]">
                        <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Also Consider</div>
                        <div className="space-y-2">
                          {coachExplanation.alternatives.slice(0, 2).map((alt, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-white/70">{alt.name}</span>
                              <span className="text-white/30 text-[9px]">{alt.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Draft Intelligence Panel - clean minimal */}
          {coachMode && (
            <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
              {/* Phase Indicator - subtle */}
              {draftPhase && (
                <div className="p-2 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40 uppercase tracking-wider">{draftPhase.description}</span>
                    <span className="text-[9px] text-white/50 font-mono">
                      {draftState.pickNumber}/15
                    </span>
                  </div>
                  <div className="text-[10px] text-white/50 mt-1 leading-tight">{draftPhase.priority}</div>
                </div>
              )}

              {/* Archetype Probability - colored by archetype */}
              {archetypeCommitments.length > 0 && (
                <div className="p-2 border-b border-white/[0.06]">
                  <div className="text-[9px] text-white/30 mb-1.5">Archetypes</div>
                  <div className="space-y-1.5">
                    {archetypeCommitments.slice(0, 3).map((arch) => {
                      // Color mapping for archetypes
                      const archColors: Record<string, { text: string; bar: string }> = {
                        'Reanimator': { text: 'text-purple-400', bar: 'bg-purple-500' },
                        'Storm': { text: 'text-indigo-400', bar: 'bg-indigo-500' },
                        'Aggro': { text: 'text-red-400', bar: 'bg-red-500' },
                        'Control': { text: 'text-blue-400', bar: 'bg-blue-500' },
                        'Artifact Combo': { text: 'text-slate-300', bar: 'bg-slate-400' },
                        'Ramp': { text: 'text-green-400', bar: 'bg-green-500' },
                        'Sneak & Show': { text: 'text-rose-400', bar: 'bg-rose-500' },
                        'Midrange': { text: 'text-amber-400', bar: 'bg-amber-500' },
                      };
                      const colors = archColors[arch.archetype] || { text: 'text-white/60', bar: 'bg-white/40' };
                      return (
                        <div key={arch.archetype}>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className={colors.text}>{arch.archetype}</span>
                            <span className="text-white/50 font-mono">{arch.probability}%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bar} transition-all`}
                              style={{ width: `${arch.probability}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Signal Indicators - colored */}
              {draftSignals && (draftSignals.colorsOpen.length > 0 || draftSignals.colorsCut.length > 0) && (
                <div className="p-2 border-b border-white/[0.06]">
                  <div className="text-[9px] text-white/30 mb-1">Signals</div>
                  <div className="space-y-1.5">
                    {draftSignals.colorsOpen.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-green-400/70">Open:</span>
                        {draftSignals.colorsOpen.slice(0, 3).map(({ color }) => {
                          const colorBg: Record<string, string> = {
                            'W': 'bg-amber-100 text-amber-900',
                            'U': 'bg-blue-500 text-white',
                            'B': 'bg-neutral-600 text-white',
                            'R': 'bg-red-500 text-white',
                            'G': 'bg-green-600 text-white',
                          };
                          return (
                            <span key={color} className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${colorBg[color]}`}>
                              {color}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {draftSignals.colorsCut.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-red-400/70">Cut:</span>
                        {draftSignals.colorsCut.slice(0, 3).map(({ color }) => {
                          const colorBg: Record<string, string> = {
                            'W': 'bg-amber-100/50 text-amber-900/50',
                            'U': 'bg-blue-500/50 text-white/50',
                            'B': 'bg-neutral-600/50 text-white/50',
                            'R': 'bg-red-500/50 text-white/50',
                            'G': 'bg-green-600/50 text-white/50',
                          };
                          return (
                            <span key={color} className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${colorBg[color]} line-through`}>
                              {color}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Combo Balance - text only */}
              {enablerPayoffBalance.length > 0 && enablerPayoffBalance.some(b => b.balance !== 'balanced') && (
                <div className="p-2 border-b border-white/[0.06]">
                  {enablerPayoffBalance.filter(b => b.balance !== 'balanced').slice(0, 1).map((balance, i) => (
                    <div key={i} className="text-[10px] text-white/50">
                      <span className="text-white/70">{balance.archetype}:</span> {balance.recommendation}
                    </div>
                  ))}
                </div>
              )}

              {/* Mana Base - text only */}
              {manaBaseStatus && manaBaseStatus.recommendation && (
                <div className="p-2 border-b border-white/[0.06]">
                  <div className="text-[10px] text-white/50">{manaBaseStatus.recommendation}</div>
                </div>
              )}

              {/* Curve Analysis - minimal */}
              {curveAnalysis && (
                <div className="p-2 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-end gap-0.5">
                      {[curveAnalysis.cmc1Count, curveAnalysis.cmc2Count, curveAnalysis.cmc3Count, curveAnalysis.cmc4PlusCount].map((count, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div
                            className="w-3 bg-white/30 rounded-sm"
                            style={{ height: `${Math.max(2, count * 3)}px` }}
                          />
                          <span className="text-[7px] text-white/30 mt-0.5">{i < 3 ? i + 1 : '4+'}</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] text-white/40">{curveAnalysis.playableHandRate}% keepable</span>
                  </div>
                </div>
              )}

              {/* Passed cards - minimal */}
              {topRegrets.length > 0 && (
                <div className="p-2">
                  <div className="text-[9px] text-white/30 mb-1">Passed</div>
                  <div className="flex gap-1">
                    {topRegrets.slice(0, 3).map((regret, i) => (
                      <div key={i} className="w-6 h-8 rounded overflow-hidden opacity-50">
                        <img src={getCardImage(regret.card)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deck Power - minimal */}
          {coachMode && deckWinRate && (
            <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="p-2 flex items-center justify-between">
                <span className="text-[9px] text-white/30 uppercase tracking-wider">Power</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/40" style={{ width: `${deckWinRate.winRate}%` }} />
                  </div>
                  <span className="text-sm font-bold text-white">{deckWinRate.grade}</span>
                </div>
              </div>
            </div>
          )}

          {/* Deck Stats - minimal */}
          <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="p-2 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-white/30 uppercase tracking-wider">Deck</span>
                <span className="text-[10px] text-white/50 font-mono">{draftState.picks.length}/45</span>
              </div>
              <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/40 transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            {/* Colors - proper MTG colors + colorless */}
            <div className="p-2 border-b border-white/[0.06]">
              <div className="flex gap-1 justify-center">
                {['W', 'U', 'B', 'R', 'G', 'C'].map(c => {
                  // For colorless, count cards with no color identity or artifacts
                  const count = c === 'C'
                    ? draftState.picks.filter(p => !p.color_identity || p.color_identity.length === 0).length
                    : (colorCounts[c] || 0);
                  const colorStyles: Record<string, { bg: string; text: string; dim: string }> = {
                    'W': { bg: 'bg-amber-100', text: 'text-amber-900', dim: 'bg-amber-100/20 text-amber-200/30' },
                    'U': { bg: 'bg-blue-500', text: 'text-white', dim: 'bg-blue-500/20 text-blue-300/30' },
                    'B': { bg: 'bg-neutral-600', text: 'text-white', dim: 'bg-neutral-600/20 text-neutral-300/30' },
                    'R': { bg: 'bg-red-500', text: 'text-white', dim: 'bg-red-500/20 text-red-300/30' },
                    'G': { bg: 'bg-green-600', text: 'text-white', dim: 'bg-green-600/20 text-green-300/30' },
                    'C': { bg: 'bg-slate-400', text: 'text-slate-900', dim: 'bg-slate-400/20 text-slate-300/30' },
                  };
                  const style = colorStyles[c];
                  return (
                    <div
                      key={c}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold transition-all
                        ${count === 0 ? style.dim : `${style.bg} ${style.text}`}
                        ${count >= 5 ? 'ring-1 ring-white/40' : ''}
                      `}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats - condensed */}
            {deckStats && (
              <div className="p-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                <div className="flex justify-between"><span className="text-white/30">Creatures</span><span className="text-white/60 font-mono">{deckStats.creatures}</span></div>
                <div className="flex justify-between"><span className="text-white/30">Spells</span><span className="text-white/60 font-mono">{deckStats.spells}</span></div>
                <div className="flex justify-between"><span className="text-white/30">Lands</span><span className="text-white/60 font-mono">{deckStats.lands}</span></div>
                <div className="flex justify-between"><span className="text-white/30">CMC</span><span className="text-white/60 font-mono">{deckStats.avgCmc.toFixed(1)}</span></div>
              </div>
            )}
          </div>

          {/* Picks - minimal */}
          <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="p-2 border-b border-white/[0.06]">
              <span className="text-[9px] text-white/30 uppercase tracking-wider">Picks</span>
            </div>
            <div className="p-1.5 max-h-40 overflow-y-auto">
              {draftState.picks.length === 0 ? (
                <p className="text-[10px] text-white/20 text-center py-3">No picks yet</p>
              ) : (
                <div className="grid grid-cols-4 gap-0.5">
                  {draftState.picks.map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      className="aspect-[488/680] rounded overflow-hidden hover:scale-105 transition-transform cursor-pointer hover:z-10 opacity-80 hover:opacity-100"
                      onMouseEnter={() => setHoveredCard(card)}
                      
                    >
                      <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Cards (center panel, scrollable) */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Mobile Header - Clean and compact */}
        <div className="flex items-center justify-between flex-shrink-0 sm:hidden">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">
              P{draftState.packNumber}P{draftState.pickNumber}
            </h2>
            <span className="text-sm text-white/40 font-mono">{draftState.picks.length}/45</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile Picks Button */}
            <button
              onClick={() => setShowMobileDeck(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm font-medium text-white active:scale-95 transition-transform"
            >
              <Package className="w-4 h-4" />
              <span>{draftState.picks.length}</span>
            </button>
            <button
              onClick={returnToMenu}
              className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 active:scale-95 transition-transform"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                P{draftState.packNumber}P{draftState.pickNumber}
              </h2>
              <div className="flex items-center gap-2 text-sm text-white/40 mt-1">
                {draftState.direction === 'left' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Passing {draftState.direction}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Picks Toggle */}
            <button
              onClick={() => setViewingPicks(!viewingPicks)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
                ${viewingPicks
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                  : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                }
              `}
              title={viewingPicks ? 'View pack (V)' : 'View picks (V)'}
            >
              <Package className="w-3.5 h-3.5" />
              {viewingPicks ? 'Pack' : 'Picks'}
              <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${viewingPicks ? 'bg-purple-500/30' : 'bg-white/10'}`}>V</kbd>
            </button>

            {/* Coach Toggle - hidden in quiz draft mode */}
            {!quizDraftMode && (
              <button
                onClick={() => setCoachMode(!coachMode)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
                  ${coachMode
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                  }
                `}
                title={coachMode ? 'Disable coach (L)' : 'Enable coach (L)'}
              >
                {coachMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Coach
                <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${coachMode ? 'bg-amber-500/30' : 'bg-white/10'}`}>L</kbd>
              </button>
            )}

            {/* Quiz Draft Stats */}
            {quizDraftMode && quizDraftStats.total > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span className={`text-sm font-bold ${
                  quizDraftStats.total > 0 && (quizDraftStats.correct / quizDraftStats.total) >= 0.7 ? 'text-green-400' :
                  quizDraftStats.total > 0 && (quizDraftStats.correct / quizDraftStats.total) >= 0.5 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {quizDraftStats.correct}/{quizDraftStats.total}
                </span>
                <span className="text-xs text-white/40">
                  ({Math.round((quizDraftStats.correct / quizDraftStats.total) * 100)}%)
                </span>
              </div>
            )}

            {/* Quiz Draft Mode Indicator */}
            {quizDraftMode && quizDraftStats.total === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">Quiz Mode</span>
              </div>
            )}

            <button
              onClick={returnToMenu}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Exit to Menu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pack ELO Summary - only in coach mode, hidden on mobile */}
        {coachMode && packEloStats && (
          <div className="hidden sm:flex items-center gap-4 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-white/50">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Pack ELO: <span className="font-mono text-white">{packEloStats.avgElo}</span></span>
            </div>
            {packEloStats.premiumCards > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{packEloStats.premiumCards} premium</span>
              </div>
            )}
            {packEloStats.likelyWheels > 0 && (
              <div className="flex items-center gap-1.5 text-green-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{packEloStats.likelyWheels} likely wheel</span>
              </div>
            )}
            {draftState.pickNumber > CARDS_PER_PACK - 3 && packEloStats.premiumCards > 0 && (
              <div className="flex items-center gap-1.5 text-red-400 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Last chance for premium!</span>
              </div>
            )}
          </div>
        )}

        {/* Keyboard hint */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/30">
          <Keyboard className="w-3.5 h-3.5" />
          <span>Press 1-9 to quick pick · V to view picks · ESC to exit</span>
        </div>

        {/* Viewing Picks Mode */}
        {viewingPicks ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/60">
                Your Picks ({draftState.picks.length}/45)
              </h3>
              <button
                onClick={() => setViewingPicks(false)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Back to Pack
              </button>
            </div>
            {draftState.picks.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                No picks yet - click a card in the pack to draft it
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {draftState.picks.map((card, index) => {
                  return (
                    <div
                      key={`pick-${card.id}-${index}`}
                      onMouseEnter={() => setHoveredCard(card)}
                      className="relative aspect-[488/680] rounded-xl overflow-hidden shadow-lg transition-all duration-200 hover:scale-[1.04] hover:-translate-y-1 hover:z-10 hover:shadow-xl"
                    >
                      <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                      {/* Pick number */}
                      <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] font-mono text-white/50">
                        {index + 1}
                      </div>
                      {/* Power badge */}
                      <div className={`
                        absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-lg
                        ${card.powerLevel >= 10 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black' : ''}
                        ${card.powerLevel === 9 ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white' : ''}
                        ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : ''}
                        ${card.powerLevel < 7 ? 'bg-black/70 text-white/80' : ''}
                      `}>
                        {card.powerLevel}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Pack Grid - 3 columns on mobile, 4 on desktop */
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {currentPack.map((card, index) => {
            const isRecommended = recommendedCard?.id === card.id;
            const wheelLikelihood = getWheelLikelihood(card.name);
            const percentile = getPercentile(card.name);
            const isPremium = percentile >= 75;
            const keyboardNum = index + 1;
            const isPendingPick = quizDraftMode && pendingPick?.id === card.id;
            // Simulation-based wheel indicator
            const simWheelCategory = getWheelCategory(card.name);
            // Calculate synergy-adjusted ELO (including pack synergy for early picks)
            const synergyData = getSynergyAdjustedElo(card, draftState.picks, currentPack);
            // Check if this card actually wheeled back to us (strong open signal!)
            const actuallyWheeled = draftState.wheeledCards.has(card.id);
            // Get contextual letter grade (includes pack synergy from P1P1)
            const cardGrade = getContextualGrade(card, draftState.picks, currentPack);
            // REFINED UI: Minimal color - text only, no backgrounds
            const isTopGrade = cardGrade.grade === 'A+' || cardGrade.grade === 'A';
            const isLowGrade = cardGrade.grade.startsWith('C') || cardGrade.grade.startsWith('D') || cardGrade.grade === 'F';
            // Card opacity based on grade (dim bad cards)
            const cardOpacity = isLowGrade ? 'opacity-60' : '';

            // Show coach visuals when coach is on OR during quiz reveal
            const showCoachVisuals = coachMode || (quizDraftMode && showPickReveal);

            // Quiz reveal: highlight picks
            const isOriginalPick = quizDraftMode && showPickReveal && lastPickResult?.yourPick.id === card.id;
            const isCurrentSelection = quizDraftMode && showPickReveal && pendingPick?.id === card.id;
            const didSwitchPick = quizDraftMode && showPickReveal && pendingPick?.id !== lastPickResult?.yourPick.id;

            // If they switched, show current selection in purple, original faded
            // If they didn't switch, show green (correct) or red (wrong)
            const isQuizCorrectPick = isOriginalPick && !didSwitchPick && lastPickResult?.wasCorrect;
            const isQuizWrongPick = isOriginalPick && !didSwitchPick && !lastPickResult?.wasCorrect;
            const isSwitchedSelection = isCurrentSelection && didSwitchPick;
            const wasOriginalButSwitched = isOriginalPick && didSwitchPick;

            const handleCardClick = () => {
              // During quiz reveal, allow switching picks
              if (quizDraftMode && showPickReveal) {
                setPendingPick(card);
                return;
              }
              // On mobile (< 640px), open drawer first; on desktop, pick immediately
              if (window.innerWidth < 640) {
                setMobileSelectedCard(card);
              } else {
                makePick(card);
              }
            };

            return (
              <div
                key={card.id}
                onClick={handleCardClick}
                onMouseEnter={() => setHoveredCard(card)}
                className={`
                  relative aspect-[488/680] rounded-xl overflow-hidden
                  transition-all duration-200
                  ${!(quizDraftMode && showPickReveal) ? 'hover:scale-[1.04] hover:-translate-y-1 hover:z-10' : 'hover:ring-2 hover:ring-white/30'}
                  cursor-pointer
                  ${cardOpacity}
                  ${isPendingPick && !showPickReveal ? 'ring-4 ring-purple-500 scale-[1.02]' : ''}
                  ${isQuizCorrectPick ? 'ring-4 ring-green-500 scale-[1.02]' : ''}
                  ${isQuizWrongPick ? 'ring-4 ring-red-500 scale-[1.02]' : ''}
                  ${isSwitchedSelection ? 'ring-4 ring-blue-500 scale-[1.02]' : ''}
                  ${wasOriginalButSwitched ? 'ring-2 ring-red-500/40 opacity-60' : ''}
                  ${showCoachVisuals && isRecommended && !isCurrentSelection && !isOriginalPick ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]' : ''}
                  ${showCoachVisuals && !isRecommended && isTopGrade && !isCurrentSelection && !isOriginalPick ? 'ring-1 ring-white/40' : ''}
                `}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

                {/* Keyboard shortcut hint */}
                {keyboardNum <= 9 && (
                  <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] font-mono text-white/50">
                    {keyboardNum}
                  </div>
                )}

                {/* Wheeled back indicator - subtle */}
                {showCoachVisuals && actuallyWheeled && (
                  <div className="absolute top-8 left-1.5 flex items-center gap-1">
                    <History className="w-3 h-3 text-emerald-400" />
                  </div>
                )}

                {/* Simulation wheel indicator - colored border */}
                {showCoachVisuals && simWheelCategory !== 'normal' && (
                  <div className={`absolute inset-0 rounded-xl pointer-events-none ${
                    simWheelCategory === 'high-wheel'
                      ? 'ring-2 ring-inset ring-cyan-400/40'
                      : 'ring-2 ring-inset ring-orange-400/40'
                  }`}>
                    {/* Small indicator badge */}
                    <div className={`absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                      simWheelCategory === 'high-wheel'
                        ? 'bg-cyan-500/80 text-white'
                        : 'bg-orange-500/80 text-white'
                    }`}>
                      {simWheelCategory === 'high-wheel' ? 'Wheels' : 'Rare'}
                    </div>
                  </div>
                )}

                {/* REFINED: Minimal overlay with THOUGHTFUL color */}
                {showCoachVisuals && (
                  <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
                    {/* Grade - subtle color coding */}
                    <div className={`
                      px-1.5 py-0.5 rounded text-[11px] font-bold shadow
                      ${cardGrade.grade === 'A+' ? 'bg-emerald-500/90 text-white' : ''}
                      ${cardGrade.grade === 'A' ? 'bg-emerald-600/80 text-white' : ''}
                      ${cardGrade.grade === 'B+' ? 'bg-sky-600/70 text-white' : ''}
                      ${cardGrade.grade === 'B' ? 'bg-sky-700/60 text-white/90' : ''}
                      ${cardGrade.grade === 'C+' || cardGrade.grade === 'C' ? 'bg-black/60 text-white/70' : ''}
                      ${cardGrade.grade === 'D' || cardGrade.grade === 'F' ? 'bg-black/50 text-white/50' : ''}
                    `}>
                      {cardGrade.grade}
                    </div>
                    {/* Adjustment - only show if >= 20 for cleaner look */}
                    {Math.abs(synergyData.adjustment) >= 20 && (
                      <div className={`
                        text-[10px] font-bold px-1 rounded
                        ${synergyData.adjustment > 0 ? 'text-emerald-400 bg-black/40' : 'text-red-400 bg-black/40'}
                      `}>
                        {synergyData.adjustment > 0 ? '+' : ''}{synergyData.adjustment}
                      </div>
                    )}
                  </div>
                )}

                {/* REFINED: Simple bottom banner - only for "take now" premium cards */}
                {showCoachVisuals && wheelLikelihood === 'unlikely' && isPremium && !isRecommended && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-1">
                    <span className="text-[9px] font-medium text-white/80 uppercase tracking-wider">Take now</span>
                  </div>
                )}

                {/* REFINED: Best pick indicator - gold star, subtle */}
                {showCoachVisuals && isRecommended && (
                  <div className="absolute top-1.5 left-1.5">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-lg" />
                  </div>
                )}

                {/* Quiz result badge on user's original pick */}
                {(isQuizCorrectPick || isQuizWrongPick) && (
                  <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                    isQuizCorrectPick ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {isQuizCorrectPick ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <XCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                )}

                {/* Badge when user switches to a different card */}
                {isSwitchedSelection && (
                  <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Faded X on original pick when they've switched */}
                {wasOriginalButSwitched && (
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500/50 flex items-center justify-center">
                    <XCircle className="w-3 h-3 text-white/70" />
                  </div>
                )}

              </div>
            );
          })}
          </div>
        )}

        {/* Quiz Draft: Lock In Button */}
        {quizDraftMode && pendingPick && !showPickReveal && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={confirmQuizPick}
              className="px-8 py-3 bg-purple-500 hover:bg-purple-400 text-white font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Lock In Pick
              <kbd className="ml-2 px-2 py-0.5 bg-purple-600 rounded text-xs">Enter</kbd>
            </button>
          </div>
        )}

        {/* Quiz Draft: Result Banner + Actions */}
        {quizDraftMode && showPickReveal && lastPickResult && (
          <div className="mt-4 flex flex-col items-center gap-3">
            {/* Result indicator */}
            {pendingPick?.id === lastPickResult.yourPick.id ? (
              // Keeping original pick
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                lastPickResult.wasCorrect
                  ? 'bg-green-500/20 border border-green-500/30'
                  : 'bg-red-500/20 border border-red-500/30'
              }`}>
                {lastPickResult.wasCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-bold text-green-400">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-red-400">
                      -{Math.round(lastPickResult.eloDiff)} ELO
                    </span>
                    <span className="text-white/40 text-sm ml-2">Click a card to switch</span>
                  </>
                )}
              </div>
            ) : (
              // Switched to a different pick
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-blue-400">
                  Switching to {pendingPick?.name}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {/* Quick switch to best pick button - only show if not already selected */}
              {!lastPickResult.wasCorrect && pendingPick?.id !== lastPickResult.optimalPick.id && (
                <button
                  onClick={() => setPendingPick(lastPickResult.optimalPick)}
                  className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-medium rounded-xl transition-all flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Take Best Pick
                </button>
              )}
              <button
                onClick={continueAfterReveal}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all flex items-center gap-2"
              >
                {pendingPick?.id === lastPickResult.yourPick.id ? 'Continue' : 'Confirm Switch'}
                <kbd className="ml-1 px-2 py-0.5 bg-white/10 rounded text-xs">Enter</kbd>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Picks Strip - only visible on smaller screens */}
        {draftState.picks.length > 0 && (
          <div className="lg:hidden">
            <div className="flex gap-1.5 overflow-x-auto py-3 px-1">
              {draftState.picks.map((card, idx) => (
                <div
                  key={`${card.id}-${idx}`}
                  className="relative w-11 flex-shrink-0 aspect-[488/680] rounded-lg overflow-hidden opacity-70 hover:opacity-100 transition-all hover:scale-105 shadow-md"
                  onMouseEnter={() => setHoveredCard(card)}
                  
                >
                  <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Card Details (full-height panel with background) */}
      <div className="w-[300px] flex-shrink-0 hidden lg:flex flex-col bg-white/[0.02] border-l border-white/[0.08]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedCard ? (
            <>
              {/* Card Image - Compact */}
              <img src={getCardImage(displayedCard)} alt={displayedCard.name} className="w-full rounded-lg shadow-lg" />

              {/* Name & Grade */}
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-white truncate pr-2">{displayedCard.name}</div>
                {draftState && draftState.picks.length >= 0 && (() => {
                  const grade = getContextualGrade(displayedCard, draftState.picks, currentPack);
                  return (
                    <span className={`text-lg font-bold flex-shrink-0 ${
                      grade.grade === 'A+' ? 'text-emerald-400' :
                      grade.grade === 'A' ? 'text-emerald-500' :
                      grade.grade === 'B+' ? 'text-sky-400' :
                      grade.grade === 'B' ? 'text-sky-500' :
                      'text-white/60'
                    }`}>
                      {grade.grade}
                    </span>
                  );
                })()}
              </div>

              {/* Type Line */}
              <div className="text-sm text-white/50">{displayedCard.type_line?.split('—')[0]}</div>

              {/* ELO & Stats Section */}
              {(() => {
                const eloData = getEloData(displayedCard.name);
                if (!eloData) return null;
                const wheelLikelihood = getWheelLikelihood(displayedCard.name);
                const synergyData = draftState ? getSynergyAdjustedElo(displayedCard, draftState.picks, currentPack) : null;
                const hasAdjustment = synergyData && synergyData.adjustment !== 0;
                const cardGrade = draftState && draftState.picks.length >= 0 ? getContextualGrade(displayedCard, draftState.picks, currentPack) : null;
                return (
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    {/* Grade reason */}
                    {cardGrade && (
                      <div className="text-xs text-white/50 italic">{cardGrade.reason}</div>
                    )}

                    {/* ELO Section */}
                    <div className="bg-white/[0.04] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/40 uppercase tracking-wider">ELO Rating</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          wheelLikelihood === 'likely' ? 'bg-white/5 text-white/50' :
                          wheelLikelihood === 'maybe' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>
                          {wheelLikelihood === 'likely' ? 'Likely wheels' :
                           wheelLikelihood === 'maybe' ? 'May wheel' :
                           'Take now'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white font-mono">
                          {Math.round(eloData.elo)}
                        </span>
                        {hasAdjustment && (
                          <>
                            <span className={`text-sm font-bold ${
                              synergyData.adjustment > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {synergyData.adjustment > 0 ? '+' : ''}{synergyData.adjustment}
                            </span>
                            <span className="text-sm text-white/30">→</span>
                            <span className="text-lg font-bold text-white">
                              {Math.round(synergyData.adjustedElo)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Adjustment Reasons */}
                    {hasAdjustment && synergyData.reasons.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs text-white/40 uppercase tracking-wider">Why this adjustment:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {synergyData.reasons.map((reason, i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded font-medium ${
                              reason.startsWith('+') ? 'bg-emerald-500/15 text-emerald-400' :
                              reason.startsWith('-') ? 'bg-red-500/15 text-red-400' :
                              'bg-white/5 text-white/60'
                            }`}>
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simulation Insights */}
                    {(() => {
                      const simStats = getCardSimStats(displayedCard.name);
                      if (!simStats) return null;

                      const wheelRate = getWheelRate(displayedCard.name);
                      const avgPick = getAvgPickPosition(displayedCard.name);
                      const wheelCategory = getWheelCategory(displayedCard.name);
                      const topArchetypes = getTopArchetypesForCard(displayedCard.name, 3);
                      const insight = getCardInsightSummary(displayedCard.name);

                      return (
                        <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/40 uppercase tracking-wider">Simulation Data</span>
                            <span className="text-[10px] text-white/30">500 drafts</span>
                          </div>

                          {/* Key insight callout */}
                          {insight && (
                            <div className={`text-xs px-2 py-1.5 rounded font-medium ${
                              wheelCategory === 'high-wheel' ? 'bg-cyan-500/15 text-cyan-400' :
                              wheelCategory === 'low-wheel' ? 'bg-orange-500/15 text-orange-400' :
                              'bg-white/5 text-white/60'
                            }`}>
                              {insight}
                            </div>
                          )}

                          {/* Stats row */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/[0.03] rounded px-2 py-1.5">
                              <div className="text-white/40">Avg Pick</div>
                              <div className="text-white font-mono font-medium">
                                {avgPick ? `#${Math.round(avgPick)}` : 'N/A'}
                              </div>
                            </div>
                            <div className="bg-white/[0.03] rounded px-2 py-1.5">
                              <div className="text-white/40">Wheel Rate</div>
                              <div className={`font-mono font-medium ${
                                wheelCategory === 'high-wheel' ? 'text-cyan-400' :
                                wheelCategory === 'low-wheel' ? 'text-orange-400' :
                                'text-white'
                              }`}>
                                {wheelRate !== null ? `${Math.round(wheelRate)}%` : 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Top archetypes */}
                          {topArchetypes.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] text-white/40">Most picked by:</div>
                              <div className="flex flex-wrap gap-1">
                                {topArchetypes.map(arch => (
                                  <span
                                    key={arch.archetypeId}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60"
                                  >
                                    {arch.archetypeId} ({Math.round(arch.percentage)}%)
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Sparkline with PROJECTED TRAJECTORY - Simple direct lookup */}
                    {(() => {
                      // Direct lookup - simple and reliable
                      const historyPoints = getSparklineHistory(displayedCard.id);

                      // Show message if no history
                      if (!historyPoints || historyPoints.length === 0) {
                        return (
                          <div className="pt-2 border-t border-white/[0.06]">
                            <div className="text-[10px] text-white/30">No trajectory data yet</div>
                          </div>
                        );
                      }

                      // Even with 1 point, show it - each point = 1 pick in draft history

                      const points = historyPoints;
                      const currentElo = points[points.length - 1].adjustedElo;
                      const startElo = points[0].adjustedElo;
                      const trend = currentElo - startElo;

                      // Calculate velocity (ELO change per pick)
                      const velocity = trend / (points.length - 1);

                      // Project forward 5 picks
                      const remainingPicks = Math.max(0, 45 - (draftState?.picks.length || 0));
                      const projectPicks = Math.min(5, remainingPicks);
                      const projectedElo = currentElo + (velocity * projectPicks);

                      // Momentum classification
                      const momentum = velocity > 8 ? 'rising-fast' :
                                       velocity > 3 ? 'rising' :
                                       velocity < -8 ? 'falling-fast' :
                                       velocity < -3 ? 'falling' : 'stable';

                      // Calculate range including projection
                      const allValues = [...points.map(p => p.adjustedElo), projectedElo];
                      const minElo = Math.min(...allValues);
                      const maxElo = Math.max(...allValues);
                      const range = maxElo - minElo || 1;
                      const padding = 6;
                      const width = 260;
                      const height = 40;
                      const drawWidth = width - padding;
                      const historyWidth = drawWidth * 0.8;

                      return (
                        <div className="pt-2 mt-2 border-t border-white/[0.08]">
                          {/* Header with momentum indicator */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/40">Trajectory</span>
                              {momentum === 'rising-fast' && <span className="text-xs">🚀</span>}
                              {momentum === 'falling-fast' && <span className="text-xs">📉</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/40'}`}>
                                {trend > 0 ? '+' : ''}{Math.round(trend)}
                              </span>
                              {projectPicks > 0 && Math.abs(velocity) > 2 && (
                                <span className={`text-xs ${velocity > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                  → {Math.round(projectedElo)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Sparkline - full width */}
                          <div className="bg-white/[0.03] rounded-lg p-2">
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
                              {/* Grid lines */}
                              <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="white" strokeOpacity="0.05" strokeDasharray="4,4" />

                              {/* Solid line for actual history */}
                              {points.length > 1 && (
                                <polyline
                                  fill="none"
                                  stroke={trend >= 0 ? '#4ade80' : '#f87171'}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={points.map((p, i) => {
                                    const x = (i / Math.max(1, points.length - 1)) * historyWidth;
                                    const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
                                    return `${x},${y}`;
                                  }).join(' ')}
                                />
                              )}

                              {/* DASHED projection line */}
                              {projectPicks > 0 && Math.abs(velocity) > 2 && (
                                <line
                                  x1={historyWidth}
                                  y1={height - ((currentElo - minElo) / range) * (height - 8) - 4}
                                  x2={drawWidth}
                                  y2={height - ((projectedElo - minElo) / range) * (height - 8) - 4}
                                  stroke={velocity > 0 ? '#4ade80' : '#f87171'}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeDasharray="6,4"
                                  opacity="0.6"
                                />
                              )}

                              {/* Dots for actual data points */}
                              {points.map((p, i) => {
                                const x = points.length === 1 ? historyWidth / 2 : (i / Math.max(1, points.length - 1)) * historyWidth;
                                const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
                                return (
                                  <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    fill={trend >= 0 ? '#4ade80' : '#f87171'}
                                  />
                                );
                              })}

                              {/* Projected endpoint (hollow circle) */}
                              {projectPicks > 0 && Math.abs(velocity) > 2 && (
                                <circle
                                  cx={drawWidth}
                                  cy={height - ((projectedElo - minElo) / range) * (height - 8) - 4}
                                  r="5"
                                  fill="none"
                                  stroke={velocity > 0 ? '#4ade80' : '#f87171'}
                                  strokeWidth="2"
                                  opacity="0.6"
                                />
                              )}
                            </svg>
                          </div>

                          {/* Velocity insight - larger text */}
                          {Math.abs(velocity) > 3 && (
                            <div className={`text-xs mt-2 font-medium ${velocity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {velocity > 0 ? '↑' : '↓'} {Math.abs(Math.round(velocity))} ELO per pick
                              {momentum === 'rising-fast' && ' · Perfect fit!'}
                              {momentum === 'falling-fast' && ' · Wrong direction'}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
              {/* Archetype signals */}
              {(() => {
                const archetypes = getCardArchetypes(displayedCard);
                if (archetypes.length === 0) return null;
                const universalTags = archetypes.filter(a => a.isUniversal);
                const archetypeTags = archetypes.filter(a => !a.isUniversal);
                return (
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    {/* Universal role (Tutor, Mana, Draw) */}
                    {universalTags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-amber-400/70">★</span>
                        {universalTags.map(tag => (
                          <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                            {tag.shortName}
                          </span>
                        ))}
                        <span className="text-[8px] text-white/30 ml-1">Goes in everything</span>
                      </div>
                    )}
                    {/* Specific archetypes */}
                    {archetypeTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-white/30">Best in:</span>
                        {archetypeTags.map(arch => {
                          const isBuilding = buildingToward?.id === arch.id;
                          return (
                            <span
                              key={arch.id}
                              className={`text-[9px] px-1.5 py-0.5 rounded ${
                                isBuilding
                                  ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50'
                                  : 'bg-white/10 text-white/60'
                              }`}
                            >
                              {arch.shortName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            /* No card hovered state - centered in panel */
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-white/15 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="text-base text-white/40">Hover over a card</div>
              <div className="text-sm text-white/25 mt-1">to see details</div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card Drawer - Compact, at-a-glance design */}
      {mobileSelectedCard && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSelectedCard(null)}
          />

          {/* Drawer - Compact sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[85vh]">
            {/* Drag handle */}
            <div className="flex justify-center py-2 flex-shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Content - No tabs, just card info */}
            <div className="flex-1 overflow-y-auto px-4 pb-2">
              <div className="flex gap-4">
                {/* Card Image - Compact */}
                <div className="w-28 flex-shrink-0">
                  <img
                    src={getCardImage(mobileSelectedCard)}
                    alt={mobileSelectedCard.name}
                    className="w-full rounded-lg shadow-xl"
                  />
                </div>

                {/* Card Info - Right side */}
                <div className="flex-1 min-w-0 py-1">
                  {(() => {
                    const grade = draftState ? getContextualGrade(mobileSelectedCard, draftState.picks, currentPack) : null;
                    const eloData = getEloData(mobileSelectedCard.name);
                    const synergyData = draftState ? getSynergyAdjustedElo(mobileSelectedCard, draftState.picks, currentPack) : null;
                    const hasAdjustment = synergyData && Math.abs(synergyData.adjustment) >= 10;

                    return (
                      <>
                        {/* Name + Grade */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-base font-semibold text-white leading-tight">{mobileSelectedCard.name}</h3>
                          {grade && (
                            <span className={`text-lg font-bold flex-shrink-0 ${
                              grade.grade === 'A+' ? 'text-emerald-400' :
                              grade.grade === 'A' ? 'text-emerald-500' :
                              grade.grade.startsWith('B') ? 'text-sky-400' :
                              grade.grade.startsWith('C') ? 'text-amber-400' :
                              'text-white/40'
                            }`}>
                              {grade.grade}
                            </span>
                          )}
                        </div>

                        {/* ELO - Large and clear */}
                        {eloData && (
                          <div className="mb-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-bold text-white font-mono">
                                {Math.round(eloData.elo)}
                              </span>
                              {hasAdjustment && (
                                <span className={`text-sm font-bold ${
                                  synergyData.adjustment > 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {synergyData.adjustment > 0 ? '+' : ''}{synergyData.adjustment}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wide">ELO Rating</div>
                          </div>
                        )}

                        {/* Synergy tags */}
                        {synergyData && synergyData.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {synergyData.reasons.slice(0, 4).map((reason, i) => (
                              <span
                                key={i}
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  reason.startsWith('+') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Simulation Data - Mobile */}
                        {(() => {
                          const wheelRate = getWheelRate(mobileSelectedCard.name);
                          const avgPick = getAvgPickPosition(mobileSelectedCard.name);
                          const topArchetypes = getTopArchetypesForCard(mobileSelectedCard.name, 2);

                          return (
                            <div className="mt-3 pt-2 border-t border-white/10 space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white/5 rounded px-2 py-1.5">
                                  <div className="text-white/40 text-[10px]">Avg Pick</div>
                                  <div className="text-white font-mono font-medium">
                                    {avgPick ? `#${Math.round(avgPick)}` : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white/5 rounded px-2 py-1.5">
                                  <div className="text-white/40 text-[10px]">Wheel Rate</div>
                                  <div className="text-white font-mono font-medium">
                                    {wheelRate !== null ? `${Math.round(wheelRate)}%` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                              {topArchetypes.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {topArchetypes.map(arch => (
                                    <span
                                      key={arch.archetypeId}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60"
                                    >
                                      {arch.archetypeId} ({Math.round(arch.percentage)}%)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Trajectory Sparkline - Mobile */}
                        {(() => {
                          const historyPoints = getSparklineHistory(mobileSelectedCard.id);

                          // No history at all
                          if (!historyPoints || historyPoints.length === 0) {
                            return null;
                          }

                          const points = historyPoints;
                          const currentElo = points[points.length - 1].adjustedElo;
                          const startElo = points[0].adjustedElo;
                          const trend = currentElo - startElo;
                          const velocity = points.length > 1 ? trend / (points.length - 1) : 0;

                          // For sparkline rendering
                          const minElo = Math.min(...points.map(p => p.adjustedElo)) - 50;
                          const maxElo = Math.max(...points.map(p => p.adjustedElo)) + 50;
                          const range = maxElo - minElo || 100;
                          const width = 180;
                          const height = 32;

                          return (
                            <div className="mt-3 pt-2 border-t border-white/10">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-white/40">Rating Trend</span>
                                {points.length > 1 ? (
                                  <span className={`text-xs font-bold ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/40'}`}>
                                    {trend > 0 ? '+' : ''}{Math.round(trend)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-white/30">baseline</span>
                                )}
                              </div>
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8">
                                {/* Line - only if more than 1 point */}
                                {points.length > 1 && (
                                  <polyline
                                    fill="none"
                                    stroke={trend >= 0 ? '#4ade80' : '#f87171'}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={points.map((p, i) => {
                                      const x = (i / (points.length - 1)) * width;
                                      const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
                                      return `${x},${y}`;
                                    }).join(' ')}
                                  />
                                )}
                                {/* Dots */}
                                {points.map((p, i) => {
                                  const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
                                  const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
                                  return (
                                    <circle key={i} cx={x} cy={y} r="4" fill={points.length === 1 ? '#9ca3af' : (trend >= 0 ? '#4ade80' : '#f87171')} />
                                  );
                                })}
                              </svg>
                              {points.length > 1 && Math.abs(velocity) > 3 && (
                                <div className={`text-[10px] ${velocity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {velocity > 0 ? '↑' : '↓'} {Math.abs(Math.round(velocity))} ELO/pick
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Fixed Action Buttons at Bottom */}
            <div className="flex gap-3 p-4 pb-8 border-t border-white/10 bg-black">
              {/* Check if card is already picked */}
              {draftState?.picks.some(p => p.id === mobileSelectedCard.id) ? (
                // Card is from picks - just show back button
                <button
                  onClick={() => {
                    setMobileSelectedCard(null);
                    setShowMobileDeck(true);
                  }}
                  className="flex-1 py-4 px-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
                >
                  Back to Deck
                </button>
              ) : (
                // Card is from pack - show pick options
                <>
                  <button
                    onClick={() => setMobileSelectedCard(null)}
                    className="flex-1 py-4 px-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      makePick(mobileSelectedCard);
                      setMobileSelectedCard(null);
                    }}
                    className="flex-1 py-4 px-4 bg-white text-black rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    Pick This Card
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Mobile Deck Drawer */}
      {showMobileDeck && draftState && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMobileDeck(false)}
          />

          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 top-12 bg-black border-t border-white/10 rounded-t-3xl animate-in slide-in-from-bottom duration-200 flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Your Deck</h3>
                <span className="text-sm text-white/50 font-mono">{draftState.picks.length}/45</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/50 rounded-full transition-all" style={{ width: `${(draftState.picks.length / 45) * 100}%` }} />
              </div>
            </div>

            {/* Stats Row */}
            <div className="px-4 py-3 border-b border-white/10">
              {/* Colors */}
              <div className="flex gap-2 justify-center mb-3">
                {['W', 'U', 'B', 'R', 'G'].map(c => {
                  const count = colorCounts[c] || 0;
                  return (
                    <div
                      key={c}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
                        ${count === 0 ? 'opacity-30' : ''}
                        ${c === 'W' ? 'bg-amber-100 text-amber-900' : ''}
                        ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                        ${c === 'B' ? 'bg-neutral-600 text-white' : ''}
                        ${c === 'R' ? 'bg-red-500 text-white' : ''}
                        ${c === 'G' ? 'bg-green-600 text-white' : ''}
                      `}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
              {/* Type Stats */}
              {deckStats && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-white font-mono">{deckStats.creatures}</div>
                    <div className="text-white/40">Creatures</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-white font-mono">{deckStats.spells}</div>
                    <div className="text-white/40">Spells</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-white font-mono">{deckStats.avgCmc.toFixed(1)}</div>
                    <div className="text-white/40">Avg CMC</div>
                  </div>
                </div>
              )}
            </div>

            {/* Cards Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              {draftState.picks.length === 0 ? (
                <p className="text-center text-white/40 py-8">No cards drafted yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {draftState.picks.map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      className="relative aspect-[488/680] rounded-lg overflow-hidden active:scale-95 transition-transform"
                      onClick={() => {
                        setShowMobileDeck(false);
                        setMobileSelectedCard(card);
                      }}
                    >
                      <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-4 pb-8 border-t border-white/10 bg-black">
              <button
                onClick={() => setShowMobileDeck(false)}
                className="w-full py-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
              >
                Back to Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
