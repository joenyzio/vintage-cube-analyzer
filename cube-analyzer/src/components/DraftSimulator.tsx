import { useState, useCallback, useMemo, useEffect } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  calculateDeckElo,
  compareByElo,
} from '../services/eloHelpers';
import { Play, RotateCcw, Trophy, Star, ArrowLeft, ArrowRight, Users, Package, Target, Clock, TrendingUp, AlertCircle, HelpCircle, CheckCircle, XCircle, Zap, History, Keyboard, Award, Lightbulb, Eye, EyeOff, Layers } from 'lucide-react';

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

// Context-aware best pick calculation - considers deck colors, synergy, not just raw ELO
function getContextAwareBestPick(
  pack: CubeCard[],
  picks: CubeCard[]
): { bestCard: CubeCard; score: number } {
  const pickNames = picks.map(p => p.name);

  // Calculate main colors (2+ cards)
  const colorCts: Record<string, number> = {};
  picks.forEach(c => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
  const mainColors = Object.entries(colorCts).filter(([_, count]) => count >= 2).map(([color]) => color);

  // Detect synergy anchors
  const hasTinker = pickNames.includes('Tinker');
  const hasReanimation = picks.some(p => ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume'].includes(p.name));
  const hasShowTell = picks.some(p => ['Show and Tell', 'Sneak Attack', 'Through the Breach'].includes(p.name));

  // Score each card
  const scored = pack.map(card => {
    let score = 0;
    const elo = getEloData(card.name)?.elo || 0;
    const percentile = getPercentile(card.name);
    const cardColors = card.color_identity || [];
    const isColorless = cardColors.length === 0;
    const isOnColor = isColorless || cardColors.every(c => mainColors.includes(c));
    const typeLine = card.type_line?.toLowerCase() || '';
    const cmc = card.cmc || 0;

    // Base ELO score (0-100 points)
    score += Math.min(100, (elo - 1200) / 10);

    // Early draft (picks 0-4): prioritize raw power, stay open
    if (picks.length < 5) {
      if (percentile >= 90) score += 50;
      // Slight bonus for colorless/artifacts early (keep options open)
      if (isColorless || typeLine.includes('artifact')) score += 10;
    } else {
      // After 5 picks: heavily weight color fit
      if (mainColors.length >= 2) {
        // We're committed to colors
        if (isOnColor) {
          score += 40; // Big bonus for on-color
        } else if (percentile >= 90) {
          score += 5; // Only splash truly elite cards
        } else {
          score -= 60; // Heavy penalty for off-color non-elite cards
        }
      } else if (mainColors.length === 1) {
        // We have one main color
        if (cardColors.includes(mainColors[0]) || isColorless) {
          score += 25;
        } else if (percentile >= 85) {
          score += 10; // Consider adding second color for premium
        } else {
          score -= 30;
        }
      }
    }

    // Synergy bonuses
    if (hasTinker && typeLine.includes('artifact')) score += 30;
    if (hasReanimation && typeLine.includes('creature') && cmc >= 6) score += 35;
    if (hasShowTell && typeLine.includes('creature') && cmc >= 7) score += 40;

    // Mana fixing always valuable if it fixes our colors
    if (typeLine.includes('land') && mainColors.length >= 2) {
      const oracleText = card.oracle_text?.toLowerCase() || '';
      const fixesBothColors = mainColors.every(c => {
        const colorWord = c === 'W' ? 'white' : c === 'U' ? 'blue' : c === 'B' ? 'black' : c === 'R' ? 'red' : 'green';
        return oracleText.includes(colorWord) || oracleText.includes(`{${c}}`);
      });
      if (fixesBothColors) score += 25;
    }

    // Premium card bonus (but less important than color fit late)
    if (percentile >= 95) score += 20;
    else if (percentile >= 85) score += 10;

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return { bestCard: scored[0].card, score: scored[0].score };
}

// Calculate synergy-adjusted ELO for a card given current picks
function getSynergyAdjustedElo(
  card: CubeCard,
  picks: CubeCard[]
): { baseElo: number; adjustedElo: number; adjustment: number; reasons: string[] } {
  const baseElo = getEloData(card.name)?.elo || 1500;
  const reasons: string[] = [];
  let adjustment = 0;

  if (picks.length === 0) {
    return { baseElo, adjustedElo: baseElo, adjustment: 0, reasons: ['P1P1 - raw power matters most'] };
  }

  const cardColors = card.color_identity || [];
  const typeLine = card.type_line?.toLowerCase() || '';
  const oracleText = card.oracle_text?.toLowerCase() || '';
  const cmc = card.cmc || 0;

  // Calculate main colors
  const colorCts: Record<string, number> = {};
  picks.forEach(c => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
  const mainColors = Object.entries(colorCts).filter(([_, count]) => count >= 1).map(([color]) => color);
  const strongColors = Object.entries(colorCts).filter(([_, count]) => count >= 2).map(([color]) => color);

  // Detect archetype direction from picks
  const hasAggro = picks.some(p => {
    const pCmc = p.cmc || 0;
    const pType = p.type_line?.toLowerCase() || '';
    return pCmc <= 3 && pType.includes('creature') && (p.color_identity?.includes('R') || p.color_identity?.includes('W'));
  });
  const hasRamp = picks.some(p => ['Channel', 'Fastbond', 'Natural Order', 'Rofellos, Llanowar Emissary'].includes(p.name) ||
    (p.oracle_text?.toLowerCase().includes('add') && p.oracle_text?.toLowerCase().includes('mana') && p.type_line?.toLowerCase().includes('creature')));
  const hasReanimator = picks.some(p => ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume', 'Shallow Grave'].includes(p.name));
  const hasStorm = picks.some(p => ['Brain Freeze', 'Tendrils of Agony', "Yawgmoth's Will", 'Underworld Breach', 'Dark Ritual'].includes(p.name));
  const hasTinker = picks.some(p => ['Tinker', 'Tolarian Academy', "Mishra's Workshop"].includes(p.name));
  const hasControl = picks.some(p => ['Counterspell', 'Force of Will', 'Jace, the Mind Sculptor', 'Wrath of God', 'Supreme Verdict'].includes(p.name));

  // COLOR FIT - scales with pick count
  const isColorless = cardColors.length === 0;
  const isOnColor = isColorless || cardColors.every(c => mainColors.includes(c));
  const isStronglyOnColor = isColorless || cardColors.every(c => strongColors.includes(c));
  const addsNewColor = cardColors.length > 0 && cardColors.some(c => !mainColors.includes(c));

  // Scale factor: small early, bigger later (0.3 at pick 1, 1.0 at pick 5+)
  const colorScale = Math.min(1, 0.3 + (picks.length * 0.15));

  if (mainColors.length > 0) {
    if (isStronglyOnColor) {
      const bonus = Math.round(80 * colorScale);
      adjustment += bonus;
      reasons.push(`+${bonus} on-color`);
    } else if (isOnColor) {
      const bonus = Math.round(40 * colorScale);
      adjustment += bonus;
      reasons.push(`+${bonus} fits colors`);
    } else if (addsNewColor) {
      const percentile = getPercentile(card.name);
      if (percentile >= 90) {
        const penalty = Math.round(20 * colorScale);
        adjustment -= penalty;
        reasons.push(`-${penalty} splash`);
      } else if (percentile >= 75) {
        const penalty = Math.round(60 * colorScale);
        adjustment -= penalty;
        reasons.push(`-${penalty} off-color`);
      } else {
        const penalty = Math.round(100 * colorScale);
        adjustment -= penalty;
        reasons.push(`-${penalty} off-color`);
      }
    }
  }

  // Artifact synergy from first artifact pick
  const hasArtifacts = picks.some(p => p.type_line?.toLowerCase().includes('artifact'));
  if (hasArtifacts && typeLine.includes('artifact')) {
    adjustment += 30;
    reasons.push('+30 artifact synergy');
  }

  // ARCHETYPE SYNERGY BONUSES
  if (hasAggro) {
    if (typeLine.includes('creature') && cmc <= 2) {
      adjustment += 50;
      reasons.push('+50 aggro creature');
    } else if (oracleText.includes('damage') && (oracleText.includes('any target') || oracleText.includes('target player'))) {
      adjustment += 40;
      reasons.push('+40 burn spell');
    } else if (cmc >= 5 && !['Channel', 'Natural Order', 'Tinker'].includes(card.name)) {
      adjustment -= 40;
      reasons.push('-40 too slow for aggro');
    }
    // Ramp doesn't fit aggro
    if (['Fastbond', 'Oracle of Mul Daya', 'Exploration'].includes(card.name)) {
      adjustment -= 80;
      reasons.push('-80 ramp in aggro deck');
    }
  }

  if (hasRamp) {
    if (cmc >= 6 && typeLine.includes('creature')) {
      adjustment += 60;
      reasons.push('+60 ramp payoff');
    } else if (oracleText.includes('add') && oracleText.includes('mana')) {
      adjustment += 40;
      reasons.push('+40 mana acceleration');
    } else if (oracleText.includes('search') && oracleText.includes('land')) {
      adjustment += 30;
      reasons.push('+30 land search');
    }
  }

  if (hasReanimator) {
    if (typeLine.includes('creature') && cmc >= 6) {
      adjustment += 70;
      reasons.push('+70 reanimation target');
    } else if (['Entomb', 'Faithless Looting', 'Careful Study', 'Collective Brutality'].includes(card.name)) {
      adjustment += 60;
      reasons.push('+60 enables reanimator');
    } else if (oracleText.includes('discard') && oracleText.includes('card')) {
      adjustment += 30;
      reasons.push('+30 discard outlet');
    }
  }

  if (hasStorm) {
    if (oracleText.includes('add {') || ['Dark Ritual', 'Cabal Ritual', 'Seething Song', 'Lotus Petal'].includes(card.name)) {
      adjustment += 50;
      reasons.push('+50 storm mana');
    } else if (oracleText.includes('draw') && cmc <= 2) {
      adjustment += 40;
      reasons.push('+40 cantrip for storm');
    }
  }

  if (hasTinker) {
    if (typeLine.includes('artifact') && !typeLine.includes('creature')) {
      adjustment += 40;
      reasons.push('+40 artifact for Tinker');
    } else if (['Blightsteel Colossus', 'Myr Battlesphere', 'Sundering Titan', 'Inkwell Leviathan'].includes(card.name)) {
      adjustment += 80;
      reasons.push('+80 Tinker target');
    }
  }

  if (hasControl) {
    if (oracleText.includes('counter target spell')) {
      adjustment += 40;
      reasons.push('+40 counterspell');
    } else if (oracleText.includes('destroy all creatures')) {
      adjustment += 50;
      reasons.push('+50 board wipe');
    } else if (typeLine.includes('planeswalker')) {
      adjustment += 30;
      reasons.push('+30 planeswalker for control');
    }
  }

  // Universal cards get bonus everywhere
  if (['Black Lotus', 'Ancestral Recall', 'Time Walk', 'Sol Ring', 'Mana Crypt'].includes(card.name)) {
    if (adjustment < 0) {
      adjustment = Math.max(adjustment, -30); // Cap the penalty for power 9
      reasons.push('Power 9 penalty capped');
    }
  }

  const adjustedElo = Math.round(baseElo + adjustment);
  return { baseElo: Math.round(baseElo), adjustedElo, adjustment, reasons };
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

  // Detect synergies between a card and current picks
  const getCardSynergies = useCallback((card: CubeCard): string[] => {
    if (!draftState || draftState.picks.length === 0) return [];

    const synergies: string[] = [];
    const pickNames = draftState.picks.map(p => p.name);
    const pickTags = new Set(draftState.picks.flatMap(p => p.synergyTags || []));
    const cardTags = card.synergyTags || [];
    const cardText = (card.oracle_text || '').toLowerCase();

    // Check for direct synergy tag matches
    const matchingTags = cardTags.filter(tag => pickTags.has(tag));
    if (matchingTags.length > 0) {
      synergies.push(...matchingTags.slice(0, 2)); // Max 2 tags
    }

    // Reanimator synergy
    if (card.role === 'reanimation_target') {
      const hasReanimate = draftState.picks.some(p =>
        p.oracle_text?.toLowerCase().includes('return') &&
        p.oracle_text?.toLowerCase().includes('graveyard')
      );
      if (hasReanimate) synergies.push('reanimate target');
    }

    // Artifact synergy
    if (card.type_line?.toLowerCase().includes('artifact')) {
      const hasArtifactSynergy = draftState.picks.some(p =>
        p.name === 'Tinker' || p.name === 'Tolarian Academy' || p.name === "Urza's Saga"
      );
      if (hasArtifactSynergy) synergies.push('artifact synergy');
    }

    // Creature count for Natural Order / Craterhoof
    if (card.type_line?.toLowerCase().includes('creature')) {
      const hasNaturalOrder = pickNames.includes('Natural Order');
      const hasCraterhoof = pickNames.includes('Craterhoof Behemoth');
      if (hasNaturalOrder && card.color_identity?.includes('G')) synergies.push('Natural Order');
      if (hasCraterhoof) synergies.push('Craterhoof food');
    }

    // Storm / spell count
    if (cardText.includes('storm') || card.name === 'Brain Freeze') {
      const spellCount = draftState.picks.filter(p =>
        p.type_line?.toLowerCase().includes('instant') ||
        p.type_line?.toLowerCase().includes('sorcery')
      ).length;
      if (spellCount >= 5) synergies.push('storm enabler');
    }

    return synergies.slice(0, 3); // Max 3 synergies shown
  }, [draftState]);

  // Wheel prediction - check if a card we passed might come back
  const getWheelPrediction = useCallback((card: CubeCard): { mightWheel: boolean; passedAtPick: number } | null => {
    if (!draftState) return null;

    const passedInfo = draftState.passedCards.get(card.id);
    if (!passedInfo) return null;

    // Card might wheel if:
    // 1. We passed it early (pick 1-4)
    // 2. It has low wheel likelihood (so others might pass it too)
    const wheelLikelihood = getWheelLikelihood(card.name);
    const mightWheel = passedInfo.passedAtPick <= 4 && wheelLikelihood !== 'unlikely';

    return {
      mightWheel,
      passedAtPick: passedInfo.passedAtPick,
    };
  }, [draftState]);

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

    // Score each card in pack
    const scored = currentPack.map(card => {
      let score = 0;
      const reasons: string[] = [];
      const elo = getEloData(card.name)?.elo || 0;
      const percentile = getPercentile(card.name);
      const cardColors = card.color_identity || [];
      const isColorless = cardColors.length === 0;
      const isOnColor = isColorless || cardColors.every(c => mainColors.includes(c));
      const typeLine = card.type_line?.toLowerCase() || '';
      const oracleText = card.oracle_text?.toLowerCase() || '';
      const cmc = card.cmc || 0;

      // Base ELO score (0-100 points)
      score += Math.min(100, (elo - 1200) / 10);

      // Early draft: prioritize power (picks 1-5)
      if (picks.length < 5) {
        if (percentile >= 90) {
          score += 50;
          reasons.push('Premium card - take best available early');
        }
        // Don't penalize off-color early
      } else {
        // Later draft: prioritize synergy and color
        if (isOnColor) {
          score += 30;
          reasons.push(`Fits your ${mainColors.join('')} colors`);
        } else if (percentile >= 85) {
          score += 10;
          reasons.push('Powerful enough to splash');
        } else {
          score -= 40;
          reasons.push('Off-color');
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

  const simulateOtherPlayersPicks = (packs: CubeCard[][]): { newPacks: CubeCard[][]; aiPicks: (CubeCard | null)[] } => {
    const aiPicks: (CubeCard | null)[] = Array(NUM_PLAYERS).fill(null);
    const newPacks = packs.map((pack, playerIndex) => {
      if (playerIndex === 0 || pack.length === 0) return pack;
      const prefs = aiPreferences[playerIndex] || [];
      const scoredCards = pack.map(card => {
        let score = card.powerLevel * 10;
        if ((card.color_identity?.length || 0) === 0) score += 15;
        const cardColors = card.color_identity || [];
        const matchingColors = cardColors.filter(c => prefs.includes(c)).length;
        if (matchingColors > 0) score += matchingColors * 20;
        if (cardColors.length > 0 && matchingColors === 0 && card.powerLevel < 9) score -= 30;
        score += Math.random() * 10;
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

  const startNewPack = useCallback((currentPicks: CubeCard[], nextPackNumber: number, currentUsedCardIds: Set<string>, currentPassedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>, currentDecisions: PickDecision[], currentAllPlayerPicks: CubeCard[][]): DraftState => {
    // Filter out ALL cards that have been dealt in previous packs
    const availableCards = cards.filter(c => !currentUsedCardIds.has(c.id));
    const shuffled = shuffleArray(availableCards);
    const tablePacks: CubeCard[][] = [];
    const newUsedCardIds = new Set(currentUsedCardIds);

    // Deal new packs and track the cards
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const pack = shuffled.slice(i * CARDS_PER_PACK, (i + 1) * CARDS_PER_PACK);
      tablePacks.push(pack);
      pack.forEach(c => newUsedCardIds.add(c.id));
    }

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
    };
  }, [cards]);

  // Core pick logic - separated so it can be called from quiz draft confirm
  const executePickLogic = useCallback((card: CubeCard) => {
    if (!draftState || draftState.isComplete) return null;

    const currentPack = draftState.tablePacks[0];

    // Find the best available card considering deck context (colors, synergy)
    const { bestCard: bestAvailable } = getContextAwareBestPick(currentPack, draftState.picks);
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

    let packsAfterHumanPick = draftState.tablePacks.map((pack, idx) =>
      idx === 0 ? pack.filter(c => c.id !== card.id) : pack
    );

    // AI players make their picks
    const { newPacks: packsAfterAiPicks, aiPicks } = simulateOtherPlayersPicks(packsAfterHumanPick);

    // Record AI picks
    aiPicks.forEach((aiPick, playerIdx) => {
      if (aiPick && playerIdx > 0) {
        newAllPlayerPicks[playerIdx] = [...newAllPlayerPicks[playerIdx], aiPick];
      }
    });

    const newTablePacks = rotatePacks(packsAfterAiPicks, draftState.direction);
    const newPickNumber = draftState.pickNumber + 1;

    // Return the result for quiz draft mode
    const result = {
      yourPick: card,
      optimalPick: bestAvailable,
      wasCorrect: card.id === bestAvailable.id,
      eloDiff: Math.max(0, bestElo - pickedElo),
    };

    if (newPickNumber > CARDS_PER_PACK) {
      if (draftState.packNumber >= 3) {
        setDraftState({ ...draftState, picks: newPicks, isComplete: true, passedCards: newPassedCards, decisions: newDecisions, allPlayerPicks: newAllPlayerPicks });
      } else {
        setDraftState(startNewPack(newPicks, draftState.packNumber + 1, draftState.usedCardIds, newPassedCards, newDecisions, newAllPlayerPicks));
      }
    } else {
      setDraftState({ ...draftState, tablePacks: newTablePacks, picks: newPicks, pickNumber: newPickNumber, passedCards: newPassedCards, decisions: newDecisions, allPlayerPicks: newAllPlayerPicks });
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
    const { bestCard: bestAvailable } = getContextAwareBestPick(currentPack, draftState.picks);
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

  // Check if a card synergizes with current picks
  const getCardSynergy = useCallback((card: CubeCard): 'high' | 'medium' | 'low' | null => {
    if (!draftState || draftState.picks.length < 2) return null;

    const cardColors = card.color_identity || [];
    const mainColors = Object.entries(colorCounts)
      .filter(([_, count]) => count >= 3)
      .map(([color]) => color);

    // Check if on-color
    const isOnColor = cardColors.length === 0 || cardColors.every(c => mainColors.includes(c));

    // Check for synergies with archetypes
    const hasArchetypeSynergy = archetypeMatches.some(arch =>
      arch.keyCards.includes(card.name)
    );

    if (hasArchetypeSynergy) return 'high';
    if (isOnColor && card.powerLevel >= 8) return 'high';
    if (isOnColor && card.powerLevel >= 6) return 'medium';
    if (!isOnColor && cardColors.length > 0) return 'low';
    return null;
  }, [draftState, colorCounts, archetypeMatches]);

  // Analyze current pack for archetype signposts - useful from P1P1
  const packArchetypeSignals = useMemo(() => {
    if (!draftState) return [];
    const currentPack = draftState.tablePacks[0];
    if (!currentPack || currentPack.length === 0) return [];

    // Find archetype-defining cards in the pack
    const signals: { archetype: typeof ARCHETYPES[0]; cards: { card: CubeCard; isKeyCard: boolean; percentile: number }[] }[] = [];

    for (const arch of ARCHETYPES) {
      const matchingCards: { card: CubeCard; isKeyCard: boolean; percentile: number }[] = [];

      for (const card of currentPack) {
        const isKeyCard = arch.keyCards.includes(card.name);
        const fitsArchetype = arch.detectCard(card);

        if (isKeyCard || fitsArchetype) {
          const percentile = getPercentile(card.name);
          // Prioritize key cards and high-percentile cards
          if (isKeyCard || percentile >= 60) {
            matchingCards.push({ card, isKeyCard, percentile });
          }
        }
      }

      if (matchingCards.length > 0) {
        // Sort by key card first, then percentile
        matchingCards.sort((a, b) => {
          if (a.isKeyCard && !b.isKeyCard) return -1;
          if (!a.isKeyCard && b.isKeyCard) return 1;
          return b.percentile - a.percentile;
        });
        signals.push({ archetype: arch, cards: matchingCards.slice(0, 3) });
      }
    }

    // Sort archetypes by best card quality and number of options
    return signals
      .map(s => ({
        ...s,
        score: s.cards.reduce((sum, c) => sum + (c.isKeyCard ? 50 : 0) + c.percentile, 0) / s.cards.length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4); // Show top 4 archetypes available
  }, [draftState, ARCHETYPES]);

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
                onMouseLeave={() => setHoveredCard(null)}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black border border-white/[0.06] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{deckElo.rawAverage}</div>
            <div className="text-xs text-white/40 mt-1">Deck ELO</div>
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
                  onMouseLeave={() => setHoveredCard(null)}
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

      const topCards = picks
        .map(p => ({ card: p, elo: getEloData(p.name)?.elo || 0 }))
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 5);

      return {
        playerIdx,
        name: AI_PLAYERS[playerIdx].name,
        picks,
        deckElo: deckElo.rawAverage,
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
                              onMouseLeave={() => setHoveredCard(null)}
                            >
                              <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ELO Score */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        rank === 0 ? 'text-amber-400' : isYou ? 'text-purple-300' : 'text-white'
                      }`}>
                        {player.deckElo}
                      </div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wide">Deck ELO</div>
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
                            onMouseLeave={() => setHoveredCard(null)}
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
    <div className="flex gap-5">
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

      {/* Left Panel - Draft Guidance */}
      <div className="w-56 flex-shrink-0 hidden lg:block">
        <div className="sticky top-20 space-y-3">
          {/* Coach Panel - Enhanced (also shows during quiz reveal) */}
          {(coachMode || (quizDraftMode && showPickReveal)) && coachExplanation && (
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowCoachExplanation(!showCoachExplanation)}
                className="w-full p-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">AI Coach</span>
                </div>
                <span className="text-white/30 text-xs">{showCoachExplanation ? '▼' : '▶'}</span>
              </button>

              {/* Always show the main recommendation */}
              <div className="px-3 pb-3 space-y-3">
                {/* Current Archetype Badge */}
                {coachExplanation.currentArchetype && (
                  <div className="px-2 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <div className="text-[9px] text-purple-300/70 uppercase tracking-wider">Building</div>
                    <div className="text-sm font-semibold text-purple-300">{coachExplanation.currentArchetype}</div>
                  </div>
                )}

                {/* Main Pick Recommendation */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-amber-400/50">
                    <img src={getCardImage(coachExplanation.card)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{coachExplanation.card.name}</div>
                    <div className="text-[10px] text-amber-400 font-medium">ELO {Math.round(coachExplanation.elo)} · Top {100 - coachExplanation.percentile}%</div>
                    <div className="mt-1 text-[11px] text-white/80 leading-tight">
                      {coachExplanation.mainReason}
                    </div>
                  </div>
                </div>

                {/* Deck Needs Alert */}
                {coachExplanation.deckNeeds && coachExplanation.deckNeeds.length > 0 && (
                  <div className="p-2 bg-white/[0.03] rounded-lg">
                    <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Your deck needs</div>
                    <div className="flex flex-wrap gap-1">
                      {coachExplanation.deckNeeds.map((need, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] rounded font-medium">
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {showCoachExplanation && (
                  <>
                    {/* Additional Reasons */}
                    {coachExplanation.reasons.length > 1 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-white/40 uppercase tracking-wider">Why this pick</div>
                        {coachExplanation.reasons.map((reason, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px] text-white/60">
                            <span className="text-green-400 mt-0.5">✓</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alternatives */}
                    {coachExplanation.alternatives && coachExplanation.alternatives.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.06]">
                        <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5">Also consider</div>
                        <div className="space-y-1.5">
                          {coachExplanation.alternatives.slice(0, 2).map((alt, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                              <span className="text-white/70 truncate">{alt.name}</span>
                              <span className="text-white/30 text-[9px] truncate ml-2">{alt.reason}</span>
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

          {/* Archetypes Panel - "Building Toward" */}
          <div className="bg-black border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                {buildingToward ? 'Building Toward' : draftState.picks.length < 3 ? 'Archetypes in Pack' : 'Archetype Direction'}
              </span>
            </div>
            <div className="p-2">
              {draftState.picks.length < 3 && packArchetypeSignals.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-[10px] text-amber-400/80 mb-2">Signpost cards in this pack:</p>
                  {packArchetypeSignals.map((signal) => (
                    <div key={signal.archetype.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-white/90">{signal.archetype.name}</span>
                        <div className="flex gap-0.5">
                          {signal.archetype.colors.map(c => (
                            <span key={c} className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center
                              ${c === 'W' ? 'bg-amber-100 text-amber-900' : ''}
                              ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                              ${c === 'B' ? 'bg-neutral-600 text-white' : ''}
                              ${c === 'R' ? 'bg-red-500 text-white' : ''}
                              ${c === 'G' ? 'bg-green-600 text-white' : ''}
                            `}>{c}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {signal.cards.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            {c.isKeyCard && <span className="text-amber-400">★</span>}
                            <span className={c.isKeyCard ? 'text-amber-300 font-medium' : 'text-white/60'}>{c.card.name}</span>
                            <span className={`ml-auto px-1 py-0.5 rounded text-[8px] font-medium
                              ${c.percentile >= 75 ? 'bg-amber-500/30 text-amber-300' :
                                c.percentile >= 50 ? 'bg-purple-500/30 text-purple-300' :
                                'bg-white/10 text-white/50'}
                            `}>
                              {c.percentile >= 75 ? 'Premium' : c.percentile >= 50 ? 'Solid' : 'Role'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : draftState.picks.length < 3 ? (
                <p className="text-xs text-white/30 text-center py-3">No strong archetype signals in this pack</p>
              ) : buildingToward ? (
                <div className="space-y-2">
                  {/* Primary archetype - prominent */}
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-purple-300">{buildingToward.name}</span>
                      <span className="text-[10px] font-mono text-purple-400">{buildingToward.score}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/50">
                      {buildingToward.keyCardsFound > 0 && (
                        <span className="px-1.5 py-0.5 bg-purple-500/30 rounded text-purple-300">
                          {buildingToward.keyCardsFound} key card{buildingToward.keyCardsFound > 1 ? 's' : ''}
                        </span>
                      )}
                      <span>{buildingToward.fittingCards} cards fit</span>
                    </div>
                  </div>
                  {/* Other possible archetypes */}
                  {archetypeMatches.slice(1).map((arch) => (
                    <div key={arch.id} className="p-2 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">{arch.name}</span>
                        <span className="text-[10px] font-mono text-white/40">{arch.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : archetypeMatches.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-amber-400/70 mb-2">Not strongly committed yet. Options:</p>
                  {archetypeMatches.map((arch) => (
                    <div key={arch.id} className="p-2 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">{arch.name}</span>
                        <span className="text-[10px] font-mono text-white/40">{arch.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30 text-center py-3">No clear archetype yet - stay open!</p>
              )}
            </div>
          </div>

          {/* Deck Stats Panel */}
          <div className="bg-black border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Deck Stats</span>
                <span className="text-xs text-white/40 font-mono">{draftState.picks.length}/45</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-white/40 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            {/* Colors */}
            <div className="p-2 border-b border-white/[0.06]">
              <div className="flex gap-1 justify-center">
                {['W', 'U', 'B', 'R', 'G'].map(c => {
                  const count = colorCounts[c] || 0;
                  return (
                    <div
                      key={c}
                      className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-all
                        ${count === 0 ? 'opacity-20' : count >= 5 ? 'ring-2 ring-white/30' : ''}
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
            </div>

            {/* Stats */}
            {deckStats && (
              <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-white/40">Creatures</span><span className="text-white font-mono">{deckStats.creatures}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Spells</span><span className="text-white font-mono">{deckStats.spells}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Artifacts</span><span className="text-white font-mono">{deckStats.artifacts}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Lands</span><span className="text-white font-mono">{deckStats.lands}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Avg CMC</span><span className="text-white font-mono">{deckStats.avgCmc.toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Avg Power</span><span className="text-white font-mono">{deckStats.avgPower.toFixed(1)}</span></div>
              </div>
            )}
          </div>

          {/* Picks Panel */}
          <div className="bg-black border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-2 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Your Picks</span>
            </div>
            <div className="p-1.5 max-h-48 overflow-y-auto">
              {draftState.picks.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">Click a card to draft it</p>
              ) : (
                <div className="grid grid-cols-4 gap-0.5">
                  {draftState.picks.map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      className="relative aspect-[488/680] rounded overflow-hidden hover:scale-110 transition-transform cursor-pointer hover:z-10"
                      onMouseEnter={() => setHoveredCard(card)}
                      onMouseLeave={() => setHoveredCard(null)}
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

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                P{draftState.packNumber}P{draftState.pickNumber}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-white/40 mt-0.5">
                {draftState.direction === 'left' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Passing {draftState.direction}</span>
              </div>
            </div>

            {/* Color counts - visible on smaller screens */}
            <div className="flex gap-1.5 lg:hidden">
              {['W', 'U', 'B', 'R', 'G'].map(c => {
                const count = colorCounts[c] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={c}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm
                      ${c === 'W' ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900' : ''}
                      ${c === 'U' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' : ''}
                      ${c === 'B' ? 'bg-gradient-to-br from-neutral-500 to-neutral-700 text-white' : ''}
                      ${c === 'R' ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' : ''}
                      ${c === 'G' ? 'bg-gradient-to-br from-green-500 to-green-700 text-white' : ''}
                    `}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress - visible on smaller screens */}
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-20 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/50 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="text-xs text-white/40 font-mono tabular-nums">{draftState.picks.length}/45</span>
            </div>

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
                  hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
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

        {/* Pack ELO Summary - only in coach mode */}
        {coachMode && packEloStats && (
          <div className="flex items-center gap-4 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs">
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
                {draftState.picks.map((card, index) => {
                  return (
                    <div
                      key={`pick-${card.id}-${index}`}
                      onMouseEnter={() => setHoveredCard(card)}
                      onMouseLeave={() => setHoveredCard(null)}
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
          /* Pack Grid */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
            {currentPack.map((card, index) => {
            const isRecommended = recommendedCard?.id === card.id;
            const synergy = getCardSynergy(card);
            const wheelLikelihood = getWheelLikelihood(card.name);
            const percentile = getPercentile(card.name);
            const isPremium = percentile >= 75;
            const cardSynergies = getCardSynergies(card);
            const wheelPrediction = getWheelPrediction(card);
            const keyboardNum = index + 1;
            const cardArchetypes = getCardArchetypes(card);
            const fitsCurrentArchetype = buildingToward && cardArchetypes.some(a => a.id === buildingToward.id);
            const isPendingPick = quizDraftMode && pendingPick?.id === card.id;
            // Calculate synergy-adjusted ELO
            const synergyData = getSynergyAdjustedElo(card, draftState.picks);
            const hasSignificantAdjustment = Math.abs(synergyData.adjustment) >= 30;

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
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative aspect-[488/680] rounded-xl overflow-hidden shadow-lg
                  transition-all duration-200
                  ${!(quizDraftMode && showPickReveal) ? 'hover:scale-[1.04] hover:-translate-y-1 hover:z-10 hover:shadow-xl' : 'hover:ring-2 hover:ring-white/30'}
                  cursor-pointer
                  ${isPendingPick && !showPickReveal ? 'ring-4 ring-purple-500 shadow-purple-500/30 scale-[1.02]' : ''}
                  ${isQuizCorrectPick ? 'ring-4 ring-green-500 shadow-green-500/40 scale-[1.02]' : ''}
                  ${isQuizWrongPick ? 'ring-4 ring-red-500 shadow-red-500/40 scale-[1.02]' : ''}
                  ${isSwitchedSelection ? 'ring-4 ring-blue-500 shadow-blue-500/40 scale-[1.02]' : ''}
                  ${wasOriginalButSwitched ? 'ring-2 ring-red-500/40 opacity-60' : ''}
                  ${showCoachVisuals && isRecommended && !isCurrentSelection && !isOriginalPick ? 'ring-2 ring-amber-400/60 shadow-amber-400/20' : ''}
                  ${showCoachVisuals && !isRecommended && !isCurrentSelection && !isOriginalPick && synergy === 'high' ? 'ring-2 ring-green-400/50' : ''}
                  ${showCoachVisuals && !isRecommended && !isCurrentSelection && !isOriginalPick && synergy === 'low' ? 'ring-2 ring-red-400/30 opacity-75' : ''}
                  ${showCoachVisuals && !isCurrentSelection && !isOriginalPick && wheelPrediction?.mightWheel ? 'ring-2 ring-cyan-400/50' : ''}
                `}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

                {/* Keyboard shortcut hint */}
                {keyboardNum <= 9 && (
                  <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] font-mono text-white/50">
                    {keyboardNum}
                  </div>
                )}

                {/* Wheeled back indicator */}
                {showCoachVisuals && wheelPrediction?.mightWheel && (
                  <div className="absolute top-8 left-1.5 px-1.5 py-0.5 rounded bg-cyan-500/90 text-white text-[8px] font-bold flex items-center gap-1">
                    <History className="w-2.5 h-2.5" />
                    Wheeled!
                  </div>
                )}

                {/* Synergy tags */}
                {showCoachVisuals && cardSynergies.length > 0 && (
                  <div className="absolute bottom-7 left-1.5 right-1.5 flex flex-wrap gap-0.5 justify-start">
                    {cardSynergies.slice(0, 2).map((syn, i) => (
                      <span key={i} className="px-1 py-0.5 rounded bg-purple-500/80 text-white text-[7px] font-medium truncate max-w-[60px]">
                        {syn}
                      </span>
                    ))}
                  </div>
                )}

                {/* Archetype fit indicator - only shown when building toward an archetype */}
                {showCoachVisuals && fitsCurrentArchetype && buildingToward && (
                  <div className="absolute top-8 right-1.5 px-1.5 py-0.5 rounded bg-purple-500/90 text-white text-[8px] font-bold flex items-center gap-1">
                    <Layers className="w-2.5 h-2.5" />
                    {buildingToward.shortName}
                  </div>
                )}

                {/* Power badge + Synergy Adjustment - TOP RIGHT */}
                {showCoachVisuals && (
                  <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-0.5">
                    {/* Power level badge */}
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-lg
                      ${card.powerLevel >= 10 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black' : ''}
                      ${card.powerLevel === 9 ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white' : ''}
                      ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : ''}
                      ${card.powerLevel < 7 ? 'bg-black/70 text-white/80' : ''}
                    `}>
                      {card.powerLevel}
                    </div>
                    {/* Synergy adjustment indicator */}
                    {hasSignificantAdjustment && (
                      <div className={`
                        px-1 py-0.5 rounded text-[8px] font-bold shadow-lg
                        ${synergyData.adjustment > 0 ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}
                      `}>
                        {synergyData.adjustment > 0 ? '+' : ''}{synergyData.adjustment}
                      </div>
                    )}
                  </div>
                )}

                {/* Wheel likelihood indicator - BOTTOM RIGHT */}
                {showCoachVisuals && !wheelPrediction?.mightWheel && (
                  <div className={`
                    absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide
                    ${wheelLikelihood === 'likely' ? 'bg-green-500/80 text-white' : ''}
                    ${wheelLikelihood === 'maybe' ? 'bg-amber-500/80 text-black' : ''}
                    ${wheelLikelihood === 'unlikely' && isPremium ? 'bg-red-500/80 text-white' : ''}
                    ${wheelLikelihood === 'unlikely' && !isPremium ? 'hidden' : ''}
                  `}>
                    {wheelLikelihood === 'likely' ? 'Wheels' :
                     wheelLikelihood === 'maybe' ? 'Maybe' :
                     isPremium ? 'Take now' : ''}
                  </div>
                )}

                {/* Recommended indicator (star) */}
                {showCoachVisuals && isRecommended && (
                  <div className="absolute top-1.5 left-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/30">
                      <Star className="w-3.5 h-3.5 text-black fill-black" />
                    </div>
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

                {/* Archetype tags - BOTTOM RIGHT, above wheel note */}
                {showCoachVisuals && cardArchetypes.length > 0 && (
                  <div className="absolute bottom-7 right-1.5 flex gap-0.5 justify-end">
                    {cardArchetypes.slice(0, 2).map((arch) => (
                      <span
                        key={arch.id}
                        className={`
                          px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide shadow
                          ${fitsCurrentArchetype && arch.id === buildingToward?.id
                            ? 'bg-purple-500 text-white ring-1 ring-purple-300'
                            : 'bg-black/70 text-white/70'
                          }
                        `}
                      >
                        {arch.shortName}
                      </span>
                    ))}
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
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-6 right-6 z-50 hidden lg:block pointer-events-none">
          <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl w-60">
            <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-full rounded-lg" />
            <div className="mt-2 px-1 space-y-1">
              <div className="text-sm font-medium text-white">{hoveredCard.name}</div>
              <div className="text-xs text-white/40">{hoveredCard.type_line?.split('—')[0]}</div>
              {(() => {
                const eloData = getEloData(hoveredCard.name);
                if (!eloData) return null;
                const percentile = getPercentile(hoveredCard.name);
                const wheelLikelihood = getWheelLikelihood(hoveredCard.name);
                const synergyData = draftState ? getSynergyAdjustedElo(hoveredCard, draftState.picks) : null;
                const hasAdjustment = synergyData && synergyData.adjustment !== 0;
                return (
                  <div className="space-y-1.5 pt-1 border-t border-white/10">
                    {/* ELO row - base ELO, adjustment, final */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-medium ${
                          percentile >= 75 ? 'text-amber-400' :
                          percentile >= 50 ? 'text-purple-400' :
                          percentile >= 25 ? 'text-blue-400' :
                          'text-white/60'
                        }`}>
                          {Math.round(eloData.elo)}
                        </span>
                        {hasAdjustment && (
                          <>
                            <span className={`text-[10px] font-bold ${
                              synergyData.adjustment > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {synergyData.adjustment > 0 ? '+' : ''}{synergyData.adjustment}
                            </span>
                            <span className="text-[9px] text-white/30">=</span>
                            <span className={`text-[11px] font-bold ${
                              synergyData.adjustment > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {synergyData.adjustedElo}
                            </span>
                          </>
                        )}
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        wheelLikelihood === 'likely' ? 'bg-green-500/20 text-green-400' :
                        wheelLikelihood === 'maybe' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {wheelLikelihood === 'likely' ? 'Wheels' :
                         wheelLikelihood === 'maybe' ? 'Maybe' :
                         'Take now'}
                      </span>
                    </div>
                    {/* Adjustment reasons - compact */}
                    {hasAdjustment && synergyData.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {synergyData.reasons.slice(0, 2).map((reason, i) => (
                          <span key={i} className={`text-[8px] px-1 py-0.5 rounded ${
                            reason.startsWith('+') ? 'bg-green-500/20 text-green-400/80' :
                            reason.startsWith('-') ? 'bg-red-500/20 text-red-400/80' :
                            'bg-white/10 text-white/50'
                          }`}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Archetype signals */}
              {(() => {
                const archetypes = getCardArchetypes(hoveredCard);
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
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card Drawer */}
      {mobileSelectedCard && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSelectedCard(null)}
          />

          {/* Drawer - Full screen style */}
          <div className="absolute bottom-0 left-0 right-0 top-4 bg-black border-t border-white/10 rounded-t-3xl animate-in slide-in-from-bottom duration-200 flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Large Card Image - fills available space */}
            <div className="flex-1 flex items-center justify-center px-4">
              <img
                src={getCardImage(mobileSelectedCard)}
                alt={mobileSelectedCard.name}
                className="max-h-full w-auto max-w-[85vw] rounded-xl shadow-2xl"
              />
            </div>

            {/* Stats Grid - same as before */}
            <div className="px-4 py-3">
              {(() => {
                const eloData = getEloData(mobileSelectedCard.name);
                const percentile = getPercentile(mobileSelectedCard.name);
                const wheelLikelihood = getWheelLikelihood(mobileSelectedCard.name);
                const synergy = getCardSynergy(mobileSelectedCard);

                return (
                  <div className="grid grid-cols-3 gap-3">
                    {/* ELO Rating */}
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">ELO</div>
                      <div className="text-lg font-mono font-bold text-white">
                        {eloData ? Math.round(eloData.elo) : '—'}
                      </div>
                      {eloData && (
                        <div className={`text-xs mt-1 ${
                          percentile >= 75 ? 'text-amber-400' :
                          percentile >= 50 ? 'text-purple-400' :
                          'text-white/50'
                        }`}>
                          Top {100 - percentile}%
                        </div>
                      )}
                    </div>

                    {/* Wheel Likelihood */}
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Wheel</div>
                      <div className={`text-lg font-bold ${
                        wheelLikelihood === 'likely' ? 'text-green-400' :
                        wheelLikelihood === 'maybe' ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {wheelLikelihood === 'likely' ? 'Yes' :
                         wheelLikelihood === 'maybe' ? 'Maybe' :
                         'No'}
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {wheelLikelihood === 'likely' ? 'Will come back' :
                         wheelLikelihood === 'maybe' ? 'Risky' :
                         'Take now'}
                      </div>
                    </div>

                    {/* Deck Fit */}
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Fit</div>
                      <div className={`text-lg font-bold ${
                        synergy === 'high' ? 'text-green-400' :
                        synergy === 'medium' ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {synergy === 'high' ? 'Great' :
                         synergy === 'medium' ? 'OK' :
                         'Off'}
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {synergy === 'high' ? 'On-color' :
                         synergy === 'medium' ? 'Splash?' :
                         'Off-color'}
                      </div>
                    </div>
                  </div>
                );
              })()}
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

      {/* Mobile Floating Deck Button */}
      {mode === 'draft' && draftState && !draftState.isComplete && !mobileSelectedCard && (
        <button
          onClick={() => setShowMobileDeck(true)}
          className="fixed bottom-6 left-4 z-40 sm:hidden flex items-center gap-2 px-4 py-3 bg-black border border-white/20 rounded-full shadow-lg active:scale-95 transition-transform"
        >
          <Package className="w-5 h-5 text-white/70" />
          <span className="text-sm font-medium text-white">{draftState.picks.length}</span>
          <span className="text-xs text-white/50">picks</span>
        </button>
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
                <div className="grid grid-cols-4 gap-1.5">
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
