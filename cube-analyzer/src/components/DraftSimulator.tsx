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

    // Detect synergy anchors in our pool
    const hasTinker = pickNames.includes('Tinker');
    const hasNaturalOrder = pickNames.includes('Natural Order');
    const hasReanimation = picks.some(p => ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume'].includes(p.name));
    const hasShowTell = picks.some(p => ['Show and Tell', 'Sneak Attack', 'Through the Breach'].includes(p.name));
    const hasChannel = pickNames.includes('Channel');

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

      // Synergy bonuses
      if (hasTinker && typeLine.includes('artifact')) {
        score += 35;
        reasons.push('Synergy with Tinker');
      }
      if (hasNaturalOrder && typeLine.includes('creature') && cardColors.includes('G')) {
        score += 30;
        reasons.push('Green creature for Natural Order');
      }
      if (hasReanimation && typeLine.includes('creature') && cmc >= 6) {
        score += 35;
        reasons.push('Reanimation target');
      }
      if (hasShowTell && typeLine.includes('creature') && cmc >= 7) {
        score += 40;
        reasons.push('Cheat into play target');
      }
      if (hasChannel && (card.name.includes('Emrakul') || card.name.includes('Ulamog'))) {
        score += 50;
        reasons.push('Channel payoff');
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

    // Generate main explanation
    let mainReason = '';
    if (picks.length < 3) {
      mainReason = 'Take the most powerful card available. Stay open.';
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
    };
  }, [draftState, deckNeeds]);

  const startDraft = useCallback(() => {
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
    setMode('draft');
  }, [cards]);

  const returnToMenu = useCallback(() => {
    setMode('menu');
    setDraftState(null);
    setQuizState(null);
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

  const makePick = useCallback((card: CubeCard) => {
    if (!draftState || draftState.isComplete) return;

    const currentPack = draftState.tablePacks[0];

    // Find the best available card by ELO
    const sortedByElo = [...currentPack].sort((a, b) => compareByElo(a.name, b.name));
    const bestAvailable = sortedByElo[0];
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

    if (newPickNumber > CARDS_PER_PACK) {
      if (draftState.packNumber >= 3) {
        setDraftState({ ...draftState, picks: newPicks, isComplete: true, passedCards: newPassedCards, decisions: newDecisions, allPlayerPicks: newAllPlayerPicks });
      } else {
        setDraftState(startNewPack(newPicks, draftState.packNumber + 1, draftState.usedCardIds, newPassedCards, newDecisions, newAllPlayerPicks));
      }
    } else {
      setDraftState({ ...draftState, tablePacks: newTablePacks, picks: newPicks, pickNumber: newPickNumber, passedCards: newPassedCards, decisions: newDecisions, allPlayerPicks: newAllPlayerPicks });
    }
  }, [draftState, startNewPack]);

  // Keyboard shortcuts for fast drafting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (mode === 'draft' && draftState && !draftState.isComplete) {
        const currentPack = draftState.tablePacks[0];
        const num = parseInt(e.key);
        if (num >= 1 && num <= Math.min(9, currentPack.length)) {
          makePick(currentPack[num - 1]);
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

      // L to toggle coach mode
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setCoachMode(c => !c);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, draftState, quizState, makePick, makeQuizPick, nextQuizQuestion, returnToMenu, setCoachMode]);

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

  // Archetype matching
  const archetypeMatches = useMemo(() => {
    if (!draftState || draftState.picks.length < 3) return [];

    const ARCHETYPES = [
      { id: 'uw-control', name: 'UW Control', colors: ['W', 'U'], keyCards: ['Jace, the Mind Sculptor', 'The Wandering Emperor', 'Counterspell', 'Swords to Plowshares', 'Force of Will', 'Balance', 'Teferi, Time Raveler'] },
      { id: 'ub-reanimator', name: 'UB Reanimator', colors: ['U', 'B'], keyCards: ['Entomb', 'Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Exhume'] },
      { id: 'br-aggro', name: 'BR Aggro', colors: ['B', 'R'], keyCards: ['Ragavan, Nimble Pilferer', 'Thoughtseize', 'Lightning Bolt', 'Orcish Bowmasters', 'Grief', 'Dark Confidant'] },
      { id: 'ug-ramp', name: 'UG Ramp', colors: ['U', 'G'], keyCards: ['Channel', 'Primeval Titan', 'Craterhoof Behemoth', 'Natural Order', 'Fastbond', 'Uro, Titan of Nature\'s Wrath'] },
      { id: 'ur-storm', name: 'UR Storm', colors: ['U', 'R'], keyCards: ['Brain Freeze', 'Underworld Breach', 'Time Spiral', 'Yawgmoth\'s Will', 'Wheel of Fortune', 'Lion\'s Eye Diamond'] },
      { id: 'mono-white', name: 'Mono W Aggro', colors: ['W'], keyCards: ['Mother of Runes', 'Thalia, Guardian of Thraben', 'Adeline, Resplendent Cathar', 'Armageddon', 'Monastery Mentor'] },
      { id: 'artifact-combo', name: 'Artifact Combo', colors: [], keyCards: ['Tinker', 'Tolarian Academy', 'Mana Vault', 'Time Vault', 'Blightsteel Colossus', 'Mishra\'s Workshop'] },
      { id: 'rw-aggro', name: 'RW Aggro', colors: ['R', 'W'], keyCards: ['Lightning Bolt', 'Ragavan, Nimble Pilferer', 'Forth Eorlingas!', 'Monastery Mentor', 'Adeline, Resplendent Cathar'] },
      { id: 'bg-midrange', name: 'BG Midrange', colors: ['B', 'G'], keyCards: ['Deathrite Shaman', 'Grist, the Hunger Tide', 'Liliana of the Veil', 'Tireless Tracker', 'Scavenging Ooze'] },
      { id: 'sneak-show', name: 'Sneak & Show', colors: ['U', 'R'], keyCards: ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Emrakul, the Aeons Torn', 'Griselbrand'] },
    ];

    const pickNames = draftState.picks.map(p => p.name);
    const pickColors = Object.entries(colorCounts).filter(([_, count]) => count >= 2).map(([color]) => color);

    return ARCHETYPES.map(arch => {
      let score = 0;
      // Color match (up to 40 points)
      if (arch.colors.length === 0) {
        score += 20; // Colorless archetypes get base points
      } else {
        const colorMatch = arch.colors.filter(c => pickColors.includes(c)).length;
        score += (colorMatch / arch.colors.length) * 40;
      }
      // Key card match (up to 60 points)
      const keyCardsFound = arch.keyCards.filter(kc => pickNames.includes(kc)).length;
      score += (keyCardsFound / arch.keyCards.length) * 60;

      return { ...arch, score: Math.round(score), keyCardsFound };
    })
    .filter(a => a.score > 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  }, [draftState, colorCounts]);

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

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={startDraft}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all duration-300 group active:scale-95"
              >
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Start Draft
              </button>
              <button
                onClick={startQuiz}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold rounded-xl hover:bg-amber-500/30 transition-all duration-300 group active:scale-95"
              >
                <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                P1P1 Quiz
              </button>
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
                          Should have: {decision.bestAvailable.name} (+{decision.eloDiff} ELO)
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
          {/* Coach Panel - Enhanced */}
          {coachMode && coachExplanation && (
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

          {/* Archetypes Panel */}
          <div className="bg-black border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Likely Archetypes</span>
            </div>
            <div className="p-2">
              {archetypeMatches.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-3">Pick a few cards to see archetype matches</p>
              ) : (
                <div className="space-y-1.5">
                  {archetypeMatches.map((arch, idx) => (
                    <div key={arch.id} className={`p-2 rounded-lg ${idx === 0 ? 'bg-white/[0.06]' : 'bg-white/[0.02]'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${idx === 0 ? 'text-white' : 'text-white/60'}`}>{arch.name}</span>
                        <span className={`text-[10px] font-mono ${arch.score >= 50 ? 'text-green-400' : arch.score >= 30 ? 'text-amber-400' : 'text-white/40'}`}>
                          {arch.score}%
                        </span>
                      </div>
                      {arch.keyCardsFound > 0 && (
                        <p className="text-[10px] text-white/30 mt-0.5">{arch.keyCardsFound} key card{arch.keyCardsFound > 1 ? 's' : ''}</p>
                      )}
                    </div>
                  ))}
                </div>
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

            {/* Coach Toggle */}
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
          <span>Press 1-9 to quick pick · ESC to exit</span>
        </div>

        {/* Pack Grid */}
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

            const handleCardClick = () => {
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
                  relative aspect-[488/680] rounded-xl overflow-hidden cursor-pointer shadow-lg
                  transition-all duration-200 hover:scale-[1.04] hover:-translate-y-1 hover:z-10 hover:shadow-xl
                  ${coachMode && isRecommended ? 'ring-2 ring-amber-400/60 shadow-amber-400/20' : ''}
                  ${coachMode && !isRecommended && synergy === 'high' ? 'ring-2 ring-green-400/50' : ''}
                  ${coachMode && !isRecommended && synergy === 'low' ? 'ring-2 ring-red-400/30 opacity-75' : ''}
                  ${coachMode && wheelPrediction?.mightWheel ? 'ring-2 ring-cyan-400/50' : ''}
                `}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

                {/* Keyboard shortcut hint */}
                {keyboardNum <= 9 && (
                  <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] font-mono text-white/50">
                    {keyboardNum}
                  </div>
                )}

                {/* Wheeled back indicator - only in coach mode */}
                {coachMode && wheelPrediction?.mightWheel && (
                  <div className="absolute top-8 left-1.5 px-1.5 py-0.5 rounded bg-cyan-500/90 text-white text-[8px] font-bold flex items-center gap-1">
                    <History className="w-2.5 h-2.5" />
                    Wheeled!
                  </div>
                )}

                {/* Synergy tags - only in coach mode */}
                {coachMode && cardSynergies.length > 0 && (
                  <div className="absolute bottom-7 left-1.5 right-1.5 flex flex-wrap gap-0.5 justify-start">
                    {cardSynergies.slice(0, 2).map((syn, i) => (
                      <span key={i} className="px-1 py-0.5 rounded bg-purple-500/80 text-white text-[7px] font-medium truncate max-w-[60px]">
                        {syn}
                      </span>
                    ))}
                  </div>
                )}

                {/* Wheel likelihood indicator - only in coach mode */}
                {coachMode && !isRecommended && !wheelPrediction?.mightWheel && (
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

                {/* Synergy indicator (simplified) - only in coach mode */}
                {coachMode && synergy && !isRecommended && cardSynergies.length === 0 && (
                  <div className={`
                    absolute bottom-7 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide
                    ${synergy === 'high' ? 'bg-green-500/90 text-white' : ''}
                    ${synergy === 'medium' ? 'bg-amber-500/90 text-black' : ''}
                    ${synergy === 'low' ? 'bg-red-500/80 text-white' : ''}
                  `}>
                    {synergy === 'high' ? 'Fits' : synergy === 'medium' ? 'OK' : 'Off'}
                  </div>
                )}

                {/* Power badge - only in coach mode */}
                {coachMode && (
                  <div className={`
                    absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-lg
                    ${card.powerLevel >= 10 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black' : ''}
                    ${card.powerLevel === 9 ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white' : ''}
                    ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : ''}
                    ${card.powerLevel < 7 ? 'bg-black/70 text-white/80' : ''}
                  `}>
                    {card.powerLevel}
                  </div>
                )}

                {/* Recommended indicator - only in coach mode */}
                {coachMode && isRecommended && (
                  <div className="absolute top-1.5 left-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/30">
                      <Star className="w-3.5 h-3.5 text-black fill-black" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
                return (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <span className={`text-[10px] font-medium ${
                      percentile >= 75 ? 'text-amber-400' :
                      percentile >= 50 ? 'text-purple-400' :
                      percentile >= 25 ? 'text-blue-400' :
                      'text-white/40'
                    }`}>
                      ELO {Math.round(eloData.elo)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      wheelLikelihood === 'likely' ? 'bg-green-500/20 text-green-400' :
                      wheelLikelihood === 'maybe' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {wheelLikelihood === 'likely' ? 'Will wheel' :
                       wheelLikelihood === 'maybe' ? 'May wheel' :
                       'Won\'t wheel'}
                    </span>
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
