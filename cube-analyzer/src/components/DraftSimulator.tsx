/**
 * Draft Simulator - Main Orchestrator
 *
 * Coordinates the draft simulation experience by composing extracted components.
 * This file manages state and routes to the appropriate view components.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Undo2, Lightbulb, Eye, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { CubeCard } from '../types/card';
import type {
  SimulatorMode,
  DraftState,
  DraftStats,
  DraftHistoryEntry,
  Achievement,
  PickDecision,
  CardEloHistory,
  ArchetypeCommitment,
  DraftSignals,
  EnablerPayoffBalance,
  ManaBaseStatus,
  ContextualGrade,
} from '../types/draftSimulator';
import {
  NUM_PLAYERS,
  CARDS_PER_PACK,
  ACHIEVEMENTS,
  STORAGE_KEYS,
  DEFAULT_DRAFT_STATS,
} from '../data/draftSimulatorConstants';
import {
  shuffleArray,
  loadFromStorage,
  saveToStorage,
  getDraftPhase,
  getContextualGrade,
  getCurveAnalysis as getCurveAnalysisUtil,
  getColorCounts,
  calculateDeckStats,
  getSynergyAdjustedElo,
} from '../services/draftUtilities';
import {
  playPickSound,
  playWhooshSound,
  playCelebrationSound,
  getMuted,
  setMuted,
} from '../services/sounds';
import {
  getEloData,
  getPercentile,
  calculateDeckElo,
  compareByElo,
} from '../services/eloHelpers';
import {
  rateAllCards,
  createInitialContext,
} from '../services/cardRating';

// Import extracted components
import {
  DraftMenu,
  DraftPack,
  CardDetailPanel,
  QuizMode,
  DraftResults,
  DraftCoach,
  DraftComplete,
  MobileCardDetail,
  MobileDeckDrawer,
} from './DraftSimulator/index';

interface DraftSimulatorProps {
  cards: CubeCard[];
  autoStart?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getArchetypeCommitments(picks: CubeCard[]): ArchetypeCommitment[] {
  if (picks.length === 0) return [];

  const pickNames = picks.map(p => p.name);
  const commitments: ArchetypeCommitment[] = [];

  const ARCHETYPE_DEFINITIONS = {
    'Reanimator': {
      keyCards: ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy', 'Exhume', 'Shallow Grave'],
      enablers: ['Entomb', 'Careful Study', 'Faithless Looting', 'Collective Brutality'],
      payoffs: ['Griselbrand', 'Archon of Cruelty', 'Sheoldred, Whispering One'],
      colors: ['B'],
    },
    'Storm': {
      keyCards: ['Brain Freeze', 'Tendrils of Agony', "Yawgmoth's Will", 'Underworld Breach'],
      enablers: ['Dark Ritual', 'Cabal Ritual', "Lion's Eye Diamond", 'Lotus Petal'],
      payoffs: ['Brain Freeze', 'Tendrils of Agony', 'Grapeshot'],
      colors: ['U', 'B', 'R'],
    },
    'Artifact Combo': {
      keyCards: ['Tinker', 'Tolarian Academy', 'Time Vault', 'Voltaic Key'],
      enablers: ['Sol Ring', 'Mana Crypt', 'Grim Monolith'],
      payoffs: ['Blightsteel Colossus', 'Sundering Titan'],
      colors: ['U'],
    },
    'Aggro': {
      keyCards: ['Goblin Guide', 'Monastery Swiftspear', 'Ragavan, Nimble Pilferer'],
      enablers: [],
      payoffs: [],
      colors: ['R', 'W'],
    },
    'Control': {
      keyCards: ['Counterspell', 'Force of Will', 'Jace, the Mind Sculptor'],
      enablers: ['Brainstorm', 'Ponder', 'Preordain'],
      payoffs: ['Jace, the Mind Sculptor', 'Teferi, Hero of Dominaria'],
      colors: ['U', 'W'],
    },
  };

  for (const [archName, arch] of Object.entries(ARCHETYPE_DEFINITIONS)) {
    let probability = 0;
    const keyCardsOwned: string[] = [];
    const keyCardsMissing: string[] = [];

    arch.keyCards.forEach(kc => {
      if (pickNames.includes(kc)) {
        keyCardsOwned.push(kc);
        probability += 15;
      } else {
        keyCardsMissing.push(kc);
      }
    });

    const enablersOwned = arch.enablers.filter(e => pickNames.includes(e)).length;
    const payoffsOwned = arch.payoffs.filter(p => pickNames.includes(p)).length;

    const pickColors = new Set<string>();
    picks.forEach(p => p.color_identity?.forEach(c => pickColors.add(c)));
    const colorMatch = arch.colors.filter(c => pickColors.has(c)).length / arch.colors.length;
    probability += colorMatch * 20;

    if (arch.enablers.length > 0) probability += (enablersOwned / arch.enablers.length) * 25;
    if (arch.payoffs.length > 0) probability += (payoffsOwned / arch.payoffs.length) * 20;

    if (probability >= 10) {
      commitments.push({
        archetype: archName,
        probability: Math.min(100, Math.round(probability)),
        keyCardsOwned,
        keyCardsMissing: keyCardsMissing.slice(0, 3),
        criticalMass: [],
      });
    }
  }

  const total = commitments.reduce((sum, c) => sum + c.probability, 0);
  if (total > 0) {
    commitments.forEach(c => {
      c.probability = Math.round((c.probability / total) * 100);
    });
  }

  commitments.sort((a, b) => b.probability - a.probability);
  return commitments.slice(0, 4);
}

function getDraftSignals(
  wheeledCards: Map<string, { card: CubeCard; originalPick: number; wheeledAt: number }>,
  allPlayerPicks: CubeCard[][]
): DraftSignals {
  const colorsCut: { color: string; intensity: number }[] = [];
  const colorsOpen: { color: string; confidence: number }[] = [];
  const lateSignals: { card: CubeCard; pick: number; pack: number; colors: string[] }[] = [];

  const wheeledByColor: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  wheeledCards.forEach(({ card }) => {
    const elo = getEloData(card.name)?.elo || 1500;
    if (elo >= 1600) {
      card.color_identity?.forEach(c => {
        wheeledByColor[c] = (wheeledByColor[c] || 0) + 1;
      });
      lateSignals.push({ card, pick: 0, pack: 1, colors: card.color_identity || [] });
    }
  });

  Object.entries(wheeledByColor)
    .filter(([_, count]) => count >= 1)
    .forEach(([color, count]) => {
      colorsOpen.push({ color, confidence: Math.min(100, count * 30) });
    });

  const aiColorPicks: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  allPlayerPicks.slice(1).forEach(playerPicks => {
    playerPicks.forEach(pick => {
      pick.color_identity?.forEach(c => {
        aiColorPicks[c] = (aiColorPicks[c] || 0) + 1;
      });
    });
  });

  const avgPicks = Object.values(aiColorPicks).reduce((a, b) => a + b, 0) / 5;
  Object.entries(aiColorPicks)
    .filter(([_, count]) => count > avgPicks * 1.3)
    .forEach(([color, count]) => {
      colorsCut.push({ color, intensity: Math.min(100, Math.round((count / avgPicks - 1) * 100)) });
    });

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

function getEnablerPayoffBalance(_picks: CubeCard[]): EnablerPayoffBalance[] {
  return []; // Simplified for now
}

// Helper to get card from pack by rating
function getCardByRating(pack: CubeCard[], cardName: string): CubeCard | undefined {
  return pack.find(c => c.name === cardName);
}

// Build full history for a card based on all picks made so far
function buildFullHistory(
  card: CubeCard,
  allPicks: CubeCard[]
): { pick: number; adjustedElo: number; adjustment: number }[] {
  const baseElo = getEloData(card.name)?.elo || 1500;
  const history: { pick: number; adjustedElo: number; adjustment: number }[] = [
    { pick: 0, adjustedElo: baseElo, adjustment: 0 }
  ];

  // Calculate what the card's rating would have been at each pick
  for (let i = 1; i <= allPicks.length; i++) {
    const picksAtThisPoint = allPicks.slice(0, i);
    const synergy = getSynergyAdjustedElo(card, picksAtThisPoint);
    history.push({
      pick: i,
      adjustedElo: synergy.adjustedElo,
      adjustment: synergy.adjustment
    });
  }

  return history;
}

function getManaBaseStatus(picks: CubeCard[]): ManaBaseStatus | null {
  if (picks.length < 5) return null;

  const colorCts: Record<string, number> = {};
  picks.forEach(c => c.color_identity?.forEach(col => {
    colorCts[col] = (colorCts[col] || 0) + 1;
  }));

  const mainColors = Object.entries(colorCts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([color]) => color);

  const fixingCards = picks.filter(p =>
    p.type_line?.toLowerCase().includes('land') &&
    (p.oracle_text?.toLowerCase().includes('add') || p.name.includes('Fetch'))
  );

  const colorsNeeded = Object.entries(colorCts).map(([color, count]) => ({
    color,
    sources: fixingCards.filter(f => f.oracle_text?.includes(color)).length,
    cardsRequiring: count,
  }));

  let recommendation = '';
  const needsFixing = colorsNeeded.filter(c => c.cardsRequiring >= 3 && c.sources < 3);
  if (needsFixing.length > 0) {
    recommendation = `Need more ${needsFixing.map(c => c.color).join('/')} sources.`;
  } else if (mainColors.length >= 3) {
    recommendation = '3+ color deck - prioritize dual lands.';
  }

  return {
    colorsNeeded,
    fixingCards,
    splashViability: [],
    recommendation,
  };
}

function estimateDeckWinRate(picks: CubeCard[], archetypeCommitments: ArchetypeCommitment[]) {
  if (picks.length < 10) {
    return { winRate: 50, confidence: 'low', factors: [], grade: 'C' };
  }

  const factors: { name: string; impact: number; description: string }[] = [];
  let baseWinRate = 50;

  const avgElo = picks.reduce((sum, p) => sum + (getEloData(p.name)?.elo || 1500), 0) / picks.length;
  const eloImpact = Math.round((avgElo - 1650) / 20);
  factors.push({ name: 'Card Quality', impact: eloImpact, description: `Avg ELO ${Math.round(avgElo)}` });
  baseWinRate += eloImpact;

  const topArchetype = archetypeCommitments[0];
  if (topArchetype) {
    const coherenceImpact = topArchetype.probability >= 60 ? 8 :
                            topArchetype.probability >= 40 ? 4 : 0;
    factors.push({ name: 'Archetype Focus', impact: coherenceImpact, description: `${topArchetype.archetype} ${topArchetype.probability}%` });
    baseWinRate += coherenceImpact;
  }

  const finalWinRate = Math.max(25, Math.min(75, baseWinRate));
  let grade = 'C';
  if (finalWinRate >= 65) grade = 'S';
  else if (finalWinRate >= 58) grade = 'A';
  else if (finalWinRate >= 52) grade = 'B';
  else if (finalWinRate >= 45) grade = 'C';
  else grade = 'D';

  return { winRate: Math.round(finalWinRate), confidence: picks.length >= 30 ? 'high' : 'medium', factors, grade };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DraftSimulator({ cards, autoStart = false }: DraftSimulatorProps) {
  // Core state
  const [mode, setMode] = useState<SimulatorMode>(autoStart ? 'draft' : 'menu');
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);
  const lastHoveredCardRef = useRef<CubeCard | null>(null);
  if (hoveredCard) lastHoveredCardRef.current = hoveredCard;
  const displayedCard = hoveredCard || lastHoveredCardRef.current;

  // Mobile state
  const [mobileSelectedCard, setMobileSelectedCard] = useState<CubeCard | null>(null);
  const [showMobileDeck, setShowMobileDeck] = useState(false);
  const [expandedPlayerIdx, setExpandedPlayerIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Coach and UI state
  const [coachMode, setCoachMode] = useState(true);
  const [showCoachExplanation, setShowCoachExplanation] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => getMuted());

  // Undo state - store previous draft state
  const [previousDraftState, setPreviousDraftState] = useState<DraftState | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // Passed cards drawer
  const [showPassedCards, setShowPassedCards] = useState(false);

  // Persistence state
  const [draftHistory, setDraftHistory] = useState<DraftHistoryEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.DRAFT_HISTORY, [])
  );
  const [draftStats, setDraftStats] = useState<DraftStats>(() =>
    loadFromStorage(STORAGE_KEYS.DRAFT_STATS, DEFAULT_DRAFT_STATS)
  );
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEYS.ACHIEVEMENTS, [])
  );
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  // Quiz Draft mode
  const [quizDraftMode, setQuizDraftMode] = useState(false);
  const [pendingPick, setPendingPick] = useState<CubeCard | null>(null);
  const [showPickReveal, setShowPickReveal] = useState(false);
  const [lastPickResult, setLastPickResult] = useState<{
    yourPick: CubeCard;
    optimalPick: CubeCard;
    wasCorrect: boolean;
    eloDiff: number;
  } | null>(null);

  // P1P1 Quiz state
  const [quizState, setQuizState] = useState<{
    currentPack: CubeCard[];
    correctCard: CubeCard;
    userPick: CubeCard | null;
    revealed: boolean;
    history: { correct: boolean; userPick: CubeCard; correctPick: CubeCard }[];
    totalQuestions: number;
  } | null>(null);

  // Featured cards for menu
  const featuredCards = useMemo(() => {
    return cards.filter(c => c.powerLevel >= 9).sort(() => Math.random() - 0.5).slice(0, 7);
  }, [cards]);

  // ============================================================================
  // QUIZ FUNCTIONS
  // ============================================================================

  const generateQuizPack = useCallback(() => {
    const shuffled = shuffleArray([...cards]);
    const pack = shuffled.slice(0, CARDS_PER_PACK);
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

    const newHistory = [...quizState.history, {
      correct: wasCorrect,
      userPick: quizState.userPick!,
      correctPick: quizState.correctCard,
    }];
    const correctCount = newHistory.filter(h => h.correct).length;
    const accuracy = Math.round((correctCount / newHistory.length) * 100);

    const newStats = { ...draftStats, quizTotal: newHistory.length, quizAccuracy: accuracy };
    setDraftStats(newStats);
    saveToStorage(STORAGE_KEYS.DRAFT_STATS, newStats);

    setQuizState({
      currentPack: pack,
      correctCard: correct,
      userPick: null,
      revealed: false,
      history: newHistory,
      totalQuestions: quizState.totalQuestions + 1,
    });
  }, [quizState, generateQuizPack, draftStats]);

  const quizAccuracy = useMemo(() => {
    if (!quizState || quizState.history.length === 0) return null;
    return Math.round((quizState.history.filter(h => h.correct).length / quizState.history.length) * 100);
  }, [quizState]);

  // ============================================================================
  // DRAFT FUNCTIONS
  // ============================================================================

  const rotatePacks = useCallback((packs: CubeCard[][], direction: 'left' | 'right'): CubeCard[][] => {
    if (direction === 'left') {
      const first = packs[0];
      return [...packs.slice(1), first];
    } else {
      const last = packs[packs.length - 1];
      return [last, ...packs.slice(0, -1)];
    }
  }, []);

  const startDraft = useCallback((isQuizDraft = false) => {
    const shuffled = shuffleArray(cards);
    const usedCardIds = new Set<string>();
    const tablePacks: CubeCard[][] = [];

    for (let player = 0; player < NUM_PLAYERS; player++) {
      const packStart = player * CARDS_PER_PACK;
      const pack = shuffled.slice(packStart, packStart + CARDS_PER_PACK);
      pack.forEach(card => usedCardIds.add(card.id));
      tablePacks.push(pack);
    }

    const initialSeenCards = new Set<string>();
    const initialEloHistory = new Map<string, CardEloHistory>();

    tablePacks[0].forEach(card => {
      initialSeenCards.add(card.id);
      const baseElo = getEloData(card.name)?.elo || 1500;
      initialEloHistory.set(card.id, {
        cardId: card.id,
        cardName: card.name,
        baseElo,
        history: [{ pick: 0, adjustedElo: baseElo, adjustment: 0 }],
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

    setQuizDraftMode(isQuizDraft);
    setPendingPick(null);
    setShowPickReveal(false);
    setLastPickResult(null);
    setMode('draft');
  }, [cards]);

  // Auto-start draft when prop is true
  useEffect(() => {
    if (autoStart && !hasAutoStarted && cards.length > 0) {
      setHasAutoStarted(true);
      startDraft(false);
    }
  }, [autoStart, hasAutoStarted, cards.length, startDraft]);

  const returnToMenu = useCallback(() => {
    setDraftState(null);
    setQuizState(null);
    setMode('menu');
    setQuizDraftMode(false);
    setPendingPick(null);
    setShowPickReveal(false);
    setLastPickResult(null);
    setPreviousDraftState(null);
    setCanUndo(false);
  }, []);

  // Undo last pick
  const undoLastPick = useCallback(() => {
    if (!canUndo || !previousDraftState) return;
    setDraftState(previousDraftState);
    setPreviousDraftState(null);
    setCanUndo(false);
  }, [canUndo, previousDraftState]);

  // ============================================================================
  // MAKE PICK
  // ============================================================================

  const makePick = useCallback((card: CubeCard) => {
    if (!draftState || draftState.isComplete) return;

    // Save current state for undo
    setPreviousDraftState(draftState);
    setCanUndo(true);

    const currentPack = draftState.tablePacks[0];
    const newPicks = [...draftState.picks, card];

    // Track decision
    const ratings = rateAllCards(currentPack, createInitialContext());
    const bestCardName = ratings[0]?.cardName;
    const bestCard = bestCardName ? getCardByRating(currentPack, bestCardName) || card : card;
    const wasOptimal = bestCard.id === card.id;
    const eloDiff = wasOptimal ? 0 : (getEloData(bestCard.name)?.elo || 1500) - (getEloData(card.name)?.elo || 1500);

    const decision: PickDecision = {
      pick: card,
      packNumber: draftState.packNumber,
      pickNumber: draftState.pickNumber,
      packContents: currentPack,
      bestAvailable: bestCard,
      passed: currentPack.filter(c => c.id !== card.id),
      wasOptimal,
      eloDiff: Math.max(0, eloDiff),
    };

    // Play sound effects
    playPickSound();
    if (wasOptimal) {
      // Delay celebration slightly so it doesn't overlap
      setTimeout(() => playCelebrationSound(), 100);
    }
    // Whoosh for pack rotation (after a brief delay)
    setTimeout(() => playWhooshSound(), 200);

    const newDecisions = [...draftState.decisions, decision];
    const newAllPlayerPicks = draftState.allPlayerPicks.map((picks, idx) =>
      idx === 0 ? [...picks, card] : [...picks]
    );

    // Track passed cards
    const newPassedCards = new Map(draftState.passedCards);
    currentPack.filter(c => c.id !== card.id).forEach(c => {
      newPassedCards.set(c.id, {
        card: c,
        passedAtPick: draftState.pickNumber,
        packNumber: draftState.packNumber,
      });
    });

    // Update ELO history immutably
    const newEloHistory = new Map<string, CardEloHistory>();
    const newSeenCards = new Set(draftState.seenCards);
    const pickNum = newPicks.length;

    draftState.cardEloHistory.forEach((oldHistory, cardId) => {
      const cardData = cards.find(c => c.id === cardId);
      if (cardData) {
        const synergy = getSynergyAdjustedElo(cardData, newPicks);
        newEloHistory.set(cardId, {
          ...oldHistory,
          history: [
            ...oldHistory.history,
            { pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment }
          ]
        });
      } else {
        newEloHistory.set(cardId, oldHistory);
      }
    });

    // Ensure picked card is in history
    if (!newEloHistory.has(card.id)) {
      const synergy = getSynergyAdjustedElo(card, newPicks);
      newEloHistory.set(card.id, {
        cardId: card.id,
        cardName: card.name,
        baseElo: synergy.baseElo,
        history: [{ pick: pickNum, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment }],
      });
      newSeenCards.add(card.id);
    }

    // Remove picked card from pack
    let packsAfterHumanPick = draftState.tablePacks.map((pack, idx) =>
      idx === 0 ? pack.filter(c => c.id !== card.id) : pack
    );

    // Simulate AI picks
    const packsAfterAiPicks = packsAfterHumanPick.map((pack, idx) => {
      if (idx === 0 || pack.length === 0) return pack;
      const sorted = [...pack].sort((a, b) => {
        const eloA = getEloData(a.name)?.elo || 1500;
        const eloB = getEloData(b.name)?.elo || 1500;
        return eloB - eloA;
      });
      const aiPick = sorted[0];
      newAllPlayerPicks[idx] = [...newAllPlayerPicks[idx], aiPick];
      return pack.filter(c => c.id !== aiPick.id);
    });

    const newTablePacks = rotatePacks(packsAfterAiPicks, draftState.direction);
    const newPickNumber = draftState.pickNumber + 1;

    // Add new pack cards to history with FULL trajectory from pick 0 to current
    if (newTablePacks[0]) {
      newTablePacks[0].forEach(c => {
        newSeenCards.add(c.id);
        if (!newEloHistory.has(c.id)) {
          const baseElo = getEloData(c.name)?.elo || 1500;
          newEloHistory.set(c.id, {
            cardId: c.id,
            cardName: c.name,
            baseElo: baseElo,
            history: buildFullHistory(c, newPicks),
          });
        }
      });
    }

    // Check for pack/draft completion
    if (newPickNumber > CARDS_PER_PACK) {
      if (draftState.packNumber >= 3) {
        setDraftState({
          ...draftState,
          picks: newPicks,
          isComplete: true,
          decisions: newDecisions,
          passedCards: newPassedCards,
          allPlayerPicks: newAllPlayerPicks,
          cardEloHistory: newEloHistory,
          seenCards: newSeenCards,
        });
      } else {
        const nextPackNumber = draftState.packNumber + 1;
        const nextDirection = nextPackNumber % 2 === 1 ? 'left' : 'right';
        const remainingCards = cards.filter(c => !draftState.usedCardIds.has(c.id));
        const shuffled = shuffleArray(remainingCards);
        const newPacks: CubeCard[][] = [];

        for (let player = 0; player < NUM_PLAYERS; player++) {
          const packStart = player * CARDS_PER_PACK;
          const pack = shuffled.slice(packStart, packStart + CARDS_PER_PACK);
          pack.forEach(c => draftState.usedCardIds.add(c.id));
          newPacks.push(pack);
        }

        newPacks[0].forEach(c => {
          newSeenCards.add(c.id);
          if (!newEloHistory.has(c.id)) {
            const baseElo = getEloData(c.name)?.elo || 1500;
            newEloHistory.set(c.id, {
              cardId: c.id,
              cardName: c.name,
              baseElo: baseElo,
              history: buildFullHistory(c, newPicks),
            });
          }
        });

        setDraftState({
          ...draftState,
          tablePacks: newPacks,
          picks: newPicks,
          packNumber: nextPackNumber,
          direction: nextDirection,
          pickNumber: 1,
          decisions: newDecisions,
          passedCards: newPassedCards,
          allPlayerPicks: newAllPlayerPicks,
          cardEloHistory: newEloHistory,
          seenCards: newSeenCards,
        });
      }
    } else {
      setDraftState({
        ...draftState,
        tablePacks: newTablePacks,
        picks: newPicks,
        pickNumber: newPickNumber,
        decisions: newDecisions,
        passedCards: newPassedCards,
        allPlayerPicks: newAllPlayerPicks,
        cardEloHistory: newEloHistory,
        seenCards: newSeenCards,
      });
    }
  }, [draftState, cards, rotatePacks]);

  // Handle card click (quiz mode, mobile, or regular)
  const handleCardClick = useCallback((card: CubeCard) => {
    // On mobile, open detail drawer instead of picking directly
    if (isMobile && !quizDraftMode) {
      setMobileSelectedCard(card);
      return;
    }

    if (quizDraftMode && !showPickReveal) {
      setPendingPick(card);
      const currentPack = draftState?.tablePacks[0] || [];
      const ratings = rateAllCards(currentPack, createInitialContext());
      const optimalCardName = ratings[0]?.cardName;
      const optimalPick = optimalCardName ? getCardByRating(currentPack, optimalCardName) || card : card;
      const wasCorrect = optimalPick.id === card.id;
      const eloDiff = (getEloData(optimalPick.name)?.elo || 1500) - (getEloData(card.name)?.elo || 1500);

      setLastPickResult({ yourPick: card, optimalPick, wasCorrect, eloDiff: Math.max(0, eloDiff) });
      setShowPickReveal(true);
    } else if (quizDraftMode && showPickReveal) {
      // In reveal mode, clicking commits the pick
      const pickToUse = pendingPick || card;
      makePick(pickToUse);
      setPendingPick(null);
      setShowPickReveal(false);
      setLastPickResult(null);
    } else {
      makePick(card);
    }
  }, [isMobile, quizDraftMode, showPickReveal, pendingPick, draftState, makePick]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const colorCounts = useMemo(() => {
    if (!draftState) return {};
    return getColorCounts(draftState.picks);
  }, [draftState?.picks]);

  const deckStats = useMemo(() => {
    if (!draftState || draftState.picks.length === 0) return null;
    return calculateDeckStats(draftState.picks);
  }, [draftState?.picks]);

  const draftPhase = useMemo(() => {
    if (!draftState) return null;
    return getDraftPhase(draftState.pickNumber, draftState.packNumber);
  }, [draftState?.pickNumber, draftState?.packNumber]);

  const archetypeCommitments = useMemo(() => {
    if (!draftState || draftState.picks.length === 0) return [];
    return getArchetypeCommitments(draftState.picks);
  }, [draftState?.picks]);

  const draftSignals = useMemo(() => {
    if (!draftState) return null;
    return getDraftSignals(draftState.wheeledCards, draftState.allPlayerPicks);
  }, [draftState?.wheeledCards, draftState?.allPlayerPicks]);

  const enablerPayoffBalance = useMemo(() => {
    if (!draftState || draftState.picks.length < 3) return [];
    return getEnablerPayoffBalance(draftState.picks);
  }, [draftState?.picks]);

  const manaBaseStatus = useMemo(() => {
    if (!draftState || draftState.picks.length < 5) return null;
    return getManaBaseStatus(draftState.picks);
  }, [draftState?.picks]);

  const deckWinRate = useMemo(() => {
    if (!draftState || draftState.picks.length < 10) return null;
    return estimateDeckWinRate(draftState.picks, archetypeCommitments);
  }, [draftState?.picks, archetypeCommitments]);

  const curveAnalysis = useMemo(() => {
    if (!draftState || draftState.picks.length < 8) return null;
    return getCurveAnalysisUtil(draftState.picks);
  }, [draftState?.picks]);

  const topRegrets = useMemo(() => {
    if (!draftState) return [];
    return Array.from(draftState.regrettablePasses.values()).slice(0, 3);
  }, [draftState?.regrettablePasses]);

  const draftGrade = useMemo(() => {
    if (!draftState || draftState.decisions.length === 0) return null;

    const totalDecisions = draftState.decisions.length;
    const optimalPicks = draftState.decisions.filter(d => d.wasOptimal).length;
    const optimalRate = optimalPicks / totalDecisions;

    let grade: string, color: string;
    if (optimalRate >= 0.8) { grade = 'S'; color = 'text-amber-400'; }
    else if (optimalRate >= 0.6) { grade = 'A'; color = 'text-purple-400'; }
    else if (optimalRate >= 0.4) { grade = 'B'; color = 'text-blue-400'; }
    else if (optimalRate >= 0.25) { grade = 'C'; color = 'text-green-400'; }
    else { grade = 'D'; color = 'text-white/40'; }

    const worstPicks = [...draftState.decisions]
      .filter(d => !d.wasOptimal)
      .sort((a, b) => b.eloDiff - a.eloDiff)
      .slice(0, 3);

    const bestPicks = draftState.decisions
      .filter(d => d.wasOptimal && d.packContents.length >= 10)
      .slice(0, 3);

    return {
      grade,
      color,
      optimalPicks,
      totalDecisions,
      optimalRate: Math.round(optimalRate * 100),
      avgEloDiff: 0,
      worstPicks,
      bestPicks,
    };
  }, [draftState]);

  // Recommended pick - uses synergy-adjusted ELO for consistency with displayed values
  const getRecommendedPick = useMemo(() => {
    if (!draftState || draftState.isComplete) return null;
    const currentPack = draftState.tablePacks[0];
    if (!currentPack.length) return null;

    // Get synergy-adjusted ELO for each card (same system shown on cards)
    const cardsWithAdjustedElo = currentPack.map(card => {
      const synergy = getSynergyAdjustedElo(card, draftState.picks, currentPack);
      return { card, adjustedElo: synergy.adjustedElo };
    });

    // Sort by adjusted ELO (highest first)
    cardsWithAdjustedElo.sort((a, b) => b.adjustedElo - a.adjustedElo);

    return cardsWithAdjustedElo[0]?.card || null;
  }, [draftState]);

  // Coach explanation - uses synergy-adjusted ELO for consistency
  const coachExplanation = useMemo(() => {
    if (!draftState || draftState.isComplete) return null;
    const currentPack = draftState.tablePacks[0];
    if (!currentPack.length) return null;

    const picks = draftState.picks;

    // Get synergy-adjusted ELO for each card and sort
    const cardsWithAdjustedElo = currentPack.map(card => {
      const synergy = getSynergyAdjustedElo(card, picks, currentPack);
      return { card, adjustedElo: synergy.adjustedElo, adjustment: synergy.adjustment, reasons: synergy.reasons };
    });
    cardsWithAdjustedElo.sort((a, b) => b.adjustedElo - a.adjustedElo);

    const bestCard = cardsWithAdjustedElo[0]?.card;
    if (!bestCard) return null;

    const elo = getEloData(bestCard.name)?.elo || 1500;
    const percentile = getPercentile(bestCard.name);
    const bestSynergy = cardsWithAdjustedElo[0];

    const colorCts: Record<string, number> = {};
    picks.forEach((c: CubeCard) => c.color_identity?.forEach(col => { colorCts[col] = (colorCts[col] || 0) + 1; }));
    const mainColors = Object.entries(colorCts).filter(([_, count]) => count >= 2).map(([color]) => color);

    let mainReason = 'Best card in pack';
    if (percentile >= 95) mainReason = 'Premium bomb - always take';
    else if (bestSynergy.adjustment > 50) mainReason = 'Strong synergy with your deck';
    else if (mainColors.length > 0 && bestCard.color_identity?.every(c => mainColors.includes(c))) mainReason = 'On-color and powerful';

    let currentArchetype = '';
    if (archetypeCommitments.length > 0 && archetypeCommitments[0].probability >= 30) {
      currentArchetype = archetypeCommitments[0].archetype;
    }

    const alternatives = cardsWithAdjustedElo.slice(1, 3).map(item => ({
      name: item.card.name,
      score: item.adjustedElo,
      reason: item.adjustment > 0 ? `+${item.adjustment} synergy` : 'Raw power',
    }));

    const deckNeeds: string[] = [];
    if (deckStats) {
      if (deckStats.creatures < 8) deckNeeds.push('creatures');
      if (picks.length >= 10 && picks.filter(p => p.oracle_text?.toLowerCase().includes('destroy')).length < 2) {
        deckNeeds.push('removal');
      }
    }

    return {
      card: bestCard,
      elo,
      percentile,
      reasons: bestSynergy.reasons || [],
      mainReason,
      alternatives,
      deckNeeds,
      currentArchetype,
    };
  }, [draftState, archetypeCommitments, deckStats]);

  // Helper functions for grading
  const getGrade = useCallback((card: CubeCard): { grade: ContextualGrade; reason: string } => {
    if (!draftState) return { grade: 'C', reason: '' };
    return getContextualGrade(card, draftState.picks, draftState.tablePacks[0]);
  }, [draftState]);

  const getSynergyData = useCallback((card: CubeCard) => {
    if (!draftState) return { adjustedElo: 1500, adjustment: 0, reasons: [] };
    return getSynergyAdjustedElo(card, draftState.picks, draftState.tablePacks[0]);
  }, [draftState]);

  const getSynergyAdjustment = useCallback((card: CubeCard): number => {
    if (!draftState) return 0;
    return getSynergyAdjustedElo(card, draftState.picks, draftState.tablePacks[0]).adjustment;
  }, [draftState]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Save draft results when complete
  useEffect(() => {
    if (draftState?.isComplete && draftGrade) {
      const deckElo = calculateDeckElo(draftState.picks.map(p => p.name));
      const mainColors = Object.entries(colorCounts)
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([color]) => color);

      const topPicks = draftState.picks
        .map(p => ({ name: p.name, elo: getEloData(p.name)?.elo || 0 }))
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 3);

      // Calculate tendency data
      const picks = draftState.picks;
      const decisions = draftState.decisions;

      // Average CMC
      const avgPickCmc = picks.reduce((sum, p) => sum + (p.cmc || 0), 0) / picks.length;

      // Creature vs spell count
      const creatureCount = picks.filter(p => p.type_line?.toLowerCase().includes('creature')).length;
      const spellCount = picks.filter(p =>
        !p.type_line?.toLowerCase().includes('creature') &&
        !p.type_line?.toLowerCase().includes('land')
      ).length;

      // Full color distribution
      const colorDistribution: Record<string, number> = {};
      picks.forEach(p => {
        p.color_identity?.forEach(c => {
          colorDistribution[c] = (colorDistribution[c] || 0) + 1;
        });
      });

      // High value cards passed (ELO > 1700)
      const passedHighValue: { name: string; elo: number }[] = [];
      decisions.forEach(d => {
        d.passed.forEach(card => {
          const elo = getEloData(card.name)?.elo || 0;
          if (elo > 1700) {
            passedHighValue.push({ name: card.name, elo });
          }
        });
      });
      passedHighValue.sort((a, b) => b.elo - a.elo);

      // Detect archetypes from picks
      const archetypesDrafted: string[] = [];
      const hasReanimatorTargets = picks.some(p => (getEloData(p.name)?.elo || 0) > 1800 && (p.cmc || 0) >= 6);
      const hasReanimateSpells = picks.some(p => ['Reanimate', 'Animate Dead', 'Entomb', 'Necromancy'].includes(p.name));
      if (hasReanimatorTargets && hasReanimateSpells) archetypesDrafted.push('Reanimator');

      const avgCmc = picks.reduce((sum, p) => sum + (p.cmc || 0), 0) / picks.length;
      if (avgCmc < 2.5 && creatureCount >= 12) archetypesDrafted.push('Aggro');
      if (avgCmc > 3.2) archetypesDrafted.push('Control');
      if (picks.filter(p => p.type_line?.toLowerCase().includes('artifact')).length >= 8) archetypesDrafted.push('Artifacts');

      // Pick timing pattern (early aggro vs late value)
      const firstHalfPicks = picks.slice(0, 22);
      const firstHalfAvgCmc = firstHalfPicks.reduce((sum, p) => sum + (p.cmc || 0), 0) / firstHalfPicks.length;
      const pickTimingPattern = firstHalfAvgCmc < 2.3 ? 'early-aggro' : firstHalfAvgCmc > 3.0 ? 'late-value' : 'balanced';

      // When did second color get committed (3+ cards)
      let colorCommitmentPick = 45;
      const colorCountsByPick: Record<string, number> = {};
      for (let i = 0; i < picks.length; i++) {
        picks[i].color_identity?.forEach(c => {
          colorCountsByPick[c] = (colorCountsByPick[c] || 0) + 1;
        });
        const colorsWithThree = Object.values(colorCountsByPick).filter(v => v >= 3).length;
        if (colorsWithThree >= 2) {
          colorCommitmentPick = i + 1;
          break;
        }
      }

      // Rare pick rate
      const raresAvailable = decisions.filter(d =>
        d.packContents.some(c => c.rarity === 'rare' || c.rarity === 'mythic')
      ).length;
      const raresPicked = decisions.filter(d =>
        d.pick.rarity === 'rare' || d.pick.rarity === 'mythic'
      ).length;
      const rarePickRate = raresAvailable > 0 ? Math.round((raresPicked / raresAvailable) * 100) : 0;

      // Signal ignore count (late picks where a high-value on-color card was passed)
      let signalIgnoreCount = 0;
      decisions.forEach(d => {
        if (d.pickNumber >= 6) { // Late in pack
          const onColorHighValue = d.passed.filter(card => {
            const elo = getEloData(card.name)?.elo || 0;
            const isOnColor = card.color_identity?.every(c => mainColors.includes(c));
            return elo > 1600 && isOnColor;
          });
          if (onColorHighValue.length > 0) signalIgnoreCount++;
        }
      });

      const entry: DraftHistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        deckElo: deckElo.rawAverage,
        grade: draftGrade.grade,
        optimalRate: draftGrade.optimalRate,
        mainColors,
        totalPicks: draftState.picks.length,
        topPicks,
        tendencyData: {
          avgPickCmc: Math.round(avgPickCmc * 100) / 100,
          creatureCount,
          spellCount,
          colorDistribution,
          passedHighValueCount: passedHighValue.length,
          passedHighValueCards: passedHighValue.slice(0, 3).map(p => p.name),
          archetypesDrafted,
          pickTimingPattern,
          colorCommitmentPick,
          rarePickRate,
          signalIgnoreCount,
        },
      };

      const updatedHistory = [entry, ...draftHistory].slice(0, 20);
      setDraftHistory(updatedHistory);
      saveToStorage(STORAGE_KEYS.DRAFT_HISTORY, updatedHistory);

      const newStats: DraftStats = {
        ...draftStats,
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
        bestGrade: ['S', 'A', 'B', 'C', 'D'].indexOf(draftGrade.grade) <
                   ['S', 'A', 'B', 'C', 'D'].indexOf(draftStats.bestGrade || 'D')
          ? draftGrade.grade
          : draftStats.bestGrade,
        perfectPacks: draftStats.perfectPacks,
        streakOptimal: 0,
        maxStreakOptimal: draftStats.maxStreakOptimal,
        rarePicks: draftStats.rarePicks,
        quizAccuracy: draftStats.quizAccuracy,
        quizTotal: draftStats.quizTotal,
      };
      setDraftStats(newStats);
      saveToStorage(STORAGE_KEYS.DRAFT_STATS, newStats);

      // Check achievements
      ACHIEVEMENTS.forEach(achievement => {
        if (!unlockedAchievements.includes(achievement.id) && achievement.condition(newStats)) {
          const allUnlocked = [...unlockedAchievements, achievement.id];
          setUnlockedAchievements(allUnlocked);
          saveToStorage(STORAGE_KEYS.ACHIEVEMENTS, allUnlocked);
          setNewAchievement(achievement);
          setTimeout(() => setNewAchievement(null), 4000);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftState?.isComplete]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!draftState || draftState.isComplete) return;
      const currentPack = draftState.tablePacks[0];
      if (!currentPack) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= currentPack.length) {
        handleCardClick(currentPack[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftState, handleCardClick]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Menu mode
  if (mode === 'menu') {
    return (
      <DraftMenu
        featuredCards={featuredCards}
        draftStats={draftStats}
        draftHistory={draftHistory}
        unlockedAchievements={unlockedAchievements}
        onStartDraft={startDraft}
        onStartQuiz={startQuiz}
      />
    );
  }

  // Quiz mode
  if (mode === 'quiz' && quizState) {
    return (
      <QuizMode
        quizState={quizState}
        quizAccuracy={quizAccuracy}
        hoveredCard={hoveredCard}
        onMakePick={makeQuizPick}
        onNextQuestion={nextQuizQuestion}
        onHoverCard={setHoveredCard}
        onReturnToMenu={returnToMenu}
      />
    );
  }

  // Results view
  if (mode === 'results' && draftState) {
    return (
      <DraftResults
        draftState={draftState}
        hoveredCard={hoveredCard}
        expandedPlayerIdx={expandedPlayerIdx}
        onSetExpandedPlayerIdx={setExpandedPlayerIdx}
        onHoverCard={setHoveredCard}
        onBackToDeck={() => setMode('draft')}
        onReturnToMenu={returnToMenu}
      />
    );
  }

  // Draft complete
  if (draftState?.isComplete && mode !== 'results') {
    return (
      <DraftComplete
        draftState={draftState}
        draftGrade={draftGrade}
        hoveredCard={hoveredCard}
        onHoverCard={setHoveredCard}
        onViewTable={() => setMode('results')}
        onReturnToMenu={returnToMenu}
      />
    );
  }

  // Active draft
  if (!draftState) return null;

  const currentPack = draftState.tablePacks[0];
  const progress = ((draftState.packNumber - 1) * 15 + draftState.pickNumber - 1) / 45;

  return (
    <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-64 z-[60] flex bg-black pt-[env(safe-area-inset-top)]">
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

      {/* Left Panel - Coach */}
      <DraftCoach
        draftState={draftState}
        coachMode={coachMode}
        quizDraftMode={quizDraftMode}
        showPickReveal={showPickReveal}
        showCoachExplanation={showCoachExplanation}
        coachExplanation={coachExplanation}
        draftPhase={draftPhase}
        archetypeCommitments={archetypeCommitments}
        draftSignals={draftSignals}
        enablerPayoffBalance={enablerPayoffBalance}
        manaBaseStatus={manaBaseStatus}
        curveAnalysis={curveAnalysis}
        deckWinRate={deckWinRate}
        colorCounts={colorCounts}
        deckStats={deckStats}
        topRegrets={topRegrets}
        progress={progress}
        onToggleCoachExplanation={() => setShowCoachExplanation(!showCoachExplanation)}
        onHoverCard={setHoveredCard}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Desktop */}
        <div className="hidden lg:block flex-shrink-0 px-4 py-3 border-b border-white/[0.08] bg-black/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={returnToMenu}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-white/60 hover:bg-white/10 transition-colors text-sm"
              >
                ← Exit
              </button>
              {canUndo && (
                <button
                  onClick={undoLastPick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors text-sm"
                >
                  ↩ Undo
                </button>
              )}
              <div>
                <div className="text-sm font-semibold text-white">
                  Pack {draftState.packNumber} · Pick {draftState.pickNumber}
                </div>
                <div className="text-xs text-white/40">
                  {quizDraftMode ? 'Quiz Mode' : 'Draft Mode'} · {draftState.direction === 'left' ? '← Left' : 'Right →'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newMuted = !soundMuted;
                  setSoundMuted(newMuted);
                  setMuted(newMuted);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  !soundMuted ? 'bg-white/10 text-white/60' : 'bg-white/5 text-white/30'
                }`}
                title={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {soundMuted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={() => setCoachMode(!coachMode)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  coachMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'
                }`}
              >
                Coach {coachMode ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>

        {/* Header - Mobile: Clean, focused design */}
        <div className="lg:hidden flex-shrink-0 border-b border-white/[0.08] bg-black/90 backdrop-blur-sm">
          {/* Top row: Exit + Pack/Pick + Actions */}
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={returnToMenu}
              className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg text-white/60"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Center: Pack/Pick - THE MAIN FOCUS */}
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-white">
                P{draftState.packNumber} · Pick {draftState.pickNumber}
              </div>
            </div>

            {/* Right: Quick actions */}
            <div className="flex items-center gap-1.5">
              {canUndo && (
                <button
                  onClick={undoLastPick}
                  className="w-9 h-9 flex items-center justify-center bg-amber-500/20 rounded-lg text-amber-400"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setCoachMode(!coachMode)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg ${
                  coachMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/30'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Pack Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <DraftPack
            pack={currentPack}
            draftState={draftState}
            recommendedCardId={getRecommendedPick?.id}
            showCoachVisuals={coachMode}
            isQuizMode={quizDraftMode}
            isShowingReveal={showPickReveal}
            pendingPickId={pendingPick?.id}
            lastPickResult={lastPickResult}
            onCardClick={handleCardClick}
            onCardHover={setHoveredCard}
            getGrade={getGrade}
            getSynergyAdjustment={getSynergyAdjustment}
          />
        </div>

        {/* Mobile Bottom Bar - Enhanced with key info */}
        <div className="lg:hidden flex-shrink-0 border-t border-white/[0.08] bg-black/95 backdrop-blur-sm safe-area-bottom">
          {/* Color distribution bar */}
          <div className="flex h-1">
            {Object.entries(colorCounts)
              .filter(([_, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([color, count]) => (
                <div
                  key={color}
                  className={`${
                    color === 'W' ? 'bg-amber-100' :
                    color === 'U' ? 'bg-blue-500' :
                    color === 'B' ? 'bg-gray-600' :
                    color === 'R' ? 'bg-red-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${(count / Math.max(1, draftState.picks.length)) * 100}%` }}
                />
              ))}
          </div>

          {/* Main bottom row */}
          <div className="flex items-center justify-between px-3 py-2">
            {/* Deck button with color pips */}
            <button
              onClick={() => setShowMobileDeck(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl text-white"
            >
              <span className="text-sm font-medium">Deck</span>
              <span className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-white/20 rounded-full text-sm font-bold">
                {draftState.picks.length}
              </span>
              {/* Color pips */}
              <div className="flex gap-0.5 ml-1">
                {Object.entries(colorCounts)
                  .filter(([_, count]) => count >= 3)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([color]) => (
                    <div
                      key={color}
                      className={`w-2 h-2 rounded-full ${
                        color === 'W' ? 'bg-amber-100' :
                        color === 'U' ? 'bg-blue-500' :
                        color === 'B' ? 'bg-gray-500' :
                        color === 'R' ? 'bg-red-500' :
                        'bg-green-500'
                      }`}
                    />
                  ))}
              </div>
            </button>

            {/* Archetype hint (if committed) */}
            {archetypeCommitments.length > 0 && archetypeCommitments[0].probability >= 30 && (
              <div className="text-xs text-white/50 text-center flex-1 px-2 truncate">
                {archetypeCommitments[0].archetype} {archetypeCommitments[0].probability}%
              </div>
            )}

            {/* Passed cards + direction */}
            <div className="flex items-center gap-2">
              {draftState.passedCards.size > 0 && (
                <button
                  onClick={() => setShowPassedCards(true)}
                  className="flex items-center gap-1.5 px-2.5 py-2 bg-white/5 rounded-xl text-white/50 text-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-white/30" />
                  {draftState.passedCards.size}
                </button>
              )}
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                draftState.direction === 'left' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
              }`}>
                {draftState.direction === 'left' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>
          </div>

          {/* Coach tip (when coach mode is on and we have a recommendation) */}
          {coachMode && getRecommendedPick && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-400/80 truncate">
                  Pick: <span className="font-medium text-amber-300">{getRecommendedPick.name}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Card Detail */}
      {displayedCard && (
        <CardDetailPanel
          card={displayedCard}
          picks={draftState.picks}
          cardEloHistory={draftState.cardEloHistory}
          getGrade={getGrade}
          getSynergyData={getSynergyData}
        />
      )}

      {/* Mobile Card Detail */}
      {mobileSelectedCard && (
        <MobileCardDetail
          card={mobileSelectedCard}
          picks={draftState.picks}
          isInDeck={draftState.picks.some(p => p.id === mobileSelectedCard.id)}
          cardEloHistory={draftState.cardEloHistory}
          onClose={() => setMobileSelectedCard(null)}
          onPick={() => {
            makePick(mobileSelectedCard);
            setMobileSelectedCard(null);
          }}
        />
      )}

      {/* Mobile Deck Drawer */}
      {showMobileDeck && (
        <MobileDeckDrawer
          picks={draftState.picks}
          onClose={() => setShowMobileDeck(false)}
          onCardSelect={(card: CubeCard) => {
            setMobileSelectedCard(card);
            setShowMobileDeck(false);
          }}
        />
      )}

      {/* Passed Cards Drawer */}
      {showPassedCards && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPassedCards(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Cards You Passed ({draftState.passedCards.size})</h3>
              <button onClick={() => setShowPassedCards(false)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {Array.from(draftState.passedCards.values())
                .sort((a, b) => {
                  const eloA = getEloData(a.card.name)?.elo || 0;
                  const eloB = getEloData(b.card.name)?.elo || 0;
                  return eloB - eloA;
                })
                .map(({ card, passedAtPick, packNumber }) => {
                  const elo = getEloData(card.name)?.elo || 0;
                  const wasGoodPass = elo < 1600;
                  return (
                    <div key={card.id} className={`flex items-center gap-3 p-2 rounded-lg mb-2 ${wasGoodPass ? 'bg-white/5' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <img src={`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=small`} alt={card.name} className="w-12 h-16 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{card.name}</div>
                        <div className="text-xs text-white/40">P{packNumber}P{passedAtPick} · ELO {elo}</div>
                      </div>
                      {!wasGoodPass && <div className="text-xs text-red-400">High value!</div>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
