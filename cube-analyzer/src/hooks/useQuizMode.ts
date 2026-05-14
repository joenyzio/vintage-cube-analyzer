/**
 * Quiz Mode Hook
 *
 * Manages the P1P1 quiz state - generating packs, tracking answers,
 * and calculating accuracy.
 */

import { useState, useCallback, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { compareByElo } from '../services/eloHelpers';
import { STORAGE_KEYS, CARDS_PER_PACK } from '../data/draftSimulatorConstants';
import { saveToStorage } from '../services/draftUtilities';
import type { DraftStats } from '../types/draftSimulator';

export interface QuizState {
  currentPack: CubeCard[];
  correctCard: CubeCard;
  userPick: CubeCard | null;
  revealed: boolean;
  history: { correct: boolean; userPick: CubeCard; correctPick: CubeCard }[];
  totalQuestions: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface UseQuizModeReturn {
  quizState: QuizState | null;
  quizAccuracy: number | null;
  startQuiz: () => void;
  makeQuizPick: (card: CubeCard) => void;
  nextQuizQuestion: () => void;
  endQuiz: () => void;
}

export function useQuizMode(
  cards: CubeCard[],
  draftStats: DraftStats,
  setDraftStats: (stats: DraftStats) => void
): UseQuizModeReturn {
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  // Generate a random pack with the correct answer (highest ELO card)
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
    saveToStorage(STORAGE_KEYS.DRAFT_STATS, newStats);

    setQuizState(prev => prev ? {
      currentPack: pack,
      correctCard: correct,
      userPick: null,
      revealed: false,
      history: newHistory,
      totalQuestions: prev.totalQuestions + 1,
    } : null);
  }, [quizState, generateQuizPack, draftStats, setDraftStats]);

  const endQuiz = useCallback(() => {
    setQuizState(null);
  }, []);

  const quizAccuracy = useMemo(() => {
    if (!quizState || quizState.history.length === 0) return null;
    const correct = quizState.history.filter(h => h.correct).length;
    return Math.round((correct / quizState.history.length) * 100);
  }, [quizState]);

  return {
    quizState,
    quizAccuracy,
    startQuiz,
    makeQuizPick,
    nextQuizQuestion,
    endQuiz,
  };
}
