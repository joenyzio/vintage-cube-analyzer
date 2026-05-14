/**
 * Draft State Hook
 *
 * Manages the core draft state and provides actions for the draft simulator.
 */

import { useState, useCallback } from 'react';
import type { CubeCard } from '../types/card';
import type {
  DraftState,
  DraftStats,
  DraftHistoryEntry,
  Achievement,
  CardEloHistory,
} from '../types/draftSimulator';
import { NUM_PLAYERS, CARDS_PER_PACK, DEFAULT_DRAFT_STATS, STORAGE_KEYS } from '../data/draftSimulatorConstants';
import { shuffleArray, loadFromStorage } from '../services/draftUtilities';
import { getEloData } from '../services/eloHelpers';

interface UseDraftStateReturn {
  // State
  draftState: DraftState | null;
  draftHistory: DraftHistoryEntry[];
  draftStats: DraftStats;
  unlockedAchievements: string[];
  newAchievement: Achievement | null;

  // Actions
  startDraft: (cards: CubeCard[], isQuizDraft?: boolean) => void;
  makePick: (card: CubeCard) => void;
  returnToMenu: () => void;
  clearNewAchievement: () => void;

  // Computed
  isComplete: boolean;
}

export function useDraftState(cards: CubeCard[]): UseDraftStateReturn {
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [draftHistory] = useState<DraftHistoryEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.DRAFT_HISTORY, [])
  );
  const [draftStats] = useState<DraftStats>(() =>
    loadFromStorage(STORAGE_KEYS.DRAFT_STATS, DEFAULT_DRAFT_STATS)
  );
  const [unlockedAchievements] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEYS.ACHIEVEMENTS, [])
  );
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  const rotatePacks = useCallback((packs: CubeCard[][], direction: 'left' | 'right'): CubeCard[][] => {
    if (direction === 'left') {
      const first = packs[0];
      return [...packs.slice(1), first];
    } else {
      const last = packs[packs.length - 1];
      return [last, ...packs.slice(0, -1)];
    }
  }, []);

  const startDraft = useCallback((allCards: CubeCard[], _isQuizDraft = false) => {
    const shuffled = shuffleArray(allCards);
    const usedCardIds = new Set<string>();
    const tablePacks: CubeCard[][] = [];

    // Create packs for all players
    for (let player = 0; player < NUM_PLAYERS; player++) {
      const packStart = player * CARDS_PER_PACK;
      const pack = shuffled.slice(packStart, packStart + CARDS_PER_PACK);
      pack.forEach(card => usedCardIds.add(card.id));
      tablePacks.push(pack);
    }

    // Initialize ELO history for pack 1 cards
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
  }, []);

  const makePick = useCallback((card: CubeCard) => {
    if (!draftState || draftState.isComplete) return;

    const currentPack = draftState.tablePacks[0];
    const newPicks = [...draftState.picks, card];

    // Update all player picks
    const newAllPlayerPicks = draftState.allPlayerPicks.map((picks, idx) =>
      idx === 0 ? [...picks, card] : [...picks]
    );

    // Track passed cards
    const passed = currentPack.filter(c => c.id !== card.id);
    const newPassedCards = new Map(draftState.passedCards);
    passed.forEach(c => {
      newPassedCards.set(c.id, {
        card: c,
        passedAtPick: draftState.pickNumber,
        packNumber: draftState.packNumber,
      });
    });

    // Update ELO history - create NEW objects (don't mutate)
    const newEloHistory = new Map<string, CardEloHistory>();
    const newSeenCards = new Set(draftState.seenCards);
    const pickNum = newPicks.length;

    // Update history for ALL cards we've ever seen
    draftState.cardEloHistory.forEach((oldHistory, cardId) => {
      const cardData = cards.find((c: CubeCard) => c.id === cardId);
      if (cardData) {
        const baseElo = getEloData(cardData.name)?.elo || 1500;
        newEloHistory.set(cardId, {
          ...oldHistory,
          history: [
            ...oldHistory.history,
            { pick: pickNum, adjustedElo: baseElo, adjustment: 0 }
          ]
        });
      } else {
        newEloHistory.set(cardId, oldHistory);
      }
    });

    // Ensure picked card is in history
    if (!newEloHistory.has(card.id)) {
      const baseElo = getEloData(card.name)?.elo || 1500;
      newEloHistory.set(card.id, {
        cardId: card.id,
        cardName: card.name,
        baseElo,
        history: [{ pick: pickNum, adjustedElo: baseElo, adjustment: 0 }],
      });
      newSeenCards.add(card.id);
    }

    // Remove picked card from pack
    let packsAfterHumanPick = draftState.tablePacks.map((pack, idx) =>
      idx === 0 ? pack.filter(c => c.id !== card.id) : pack
    );

    // Simulate AI picks (simplified)
    const packsAfterAiPicks = packsAfterHumanPick.map((pack, idx) => {
      if (idx === 0 || pack.length === 0) return pack;
      // AI picks highest ELO card
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

    // Add cards from new pack to history
    if (newTablePacks[0]) {
      newTablePacks[0].forEach(c => {
        newSeenCards.add(c.id);
        if (!newEloHistory.has(c.id)) {
          const baseElo = getEloData(c.name)?.elo || 1500;
          newEloHistory.set(c.id, {
            cardId: c.id,
            cardName: c.name,
            baseElo,
            history: [{ pick: pickNum, adjustedElo: baseElo, adjustment: 0 }],
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
          passedCards: newPassedCards,
          allPlayerPicks: newAllPlayerPicks,
          cardEloHistory: newEloHistory,
          seenCards: newSeenCards,
        });
      } else {
        // Start new pack
        const nextPackNumber = draftState.packNumber + 1;
        const nextDirection = nextPackNumber % 2 === 1 ? 'left' : 'right';

        // Generate new packs
        const remainingCards = cards.filter(c => !draftState.usedCardIds.has(c.id));
        const shuffled = shuffleArray(remainingCards);
        const newPacks: CubeCard[][] = [];

        for (let player = 0; player < NUM_PLAYERS; player++) {
          const packStart = player * CARDS_PER_PACK;
          const pack = shuffled.slice(packStart, packStart + CARDS_PER_PACK);
          pack.forEach(c => draftState.usedCardIds.add(c.id));
          newPacks.push(pack);
        }

        // Add new pack cards to history
        newPacks[0].forEach(c => {
          newSeenCards.add(c.id);
          if (!newEloHistory.has(c.id)) {
            const baseElo = getEloData(c.name)?.elo || 1500;
            newEloHistory.set(c.id, {
              cardId: c.id,
              cardName: c.name,
              baseElo,
              history: [{ pick: newPicks.length, adjustedElo: baseElo, adjustment: 0 }],
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
        passedCards: newPassedCards,
        allPlayerPicks: newAllPlayerPicks,
        cardEloHistory: newEloHistory,
        seenCards: newSeenCards,
      });
    }
  }, [draftState, cards, rotatePacks]);

  const returnToMenu = useCallback(() => {
    setDraftState(null);
  }, []);

  const clearNewAchievement = useCallback(() => {
    setNewAchievement(null);
  }, []);

  const isComplete = draftState?.isComplete ?? false;

  return {
    draftState,
    draftHistory,
    draftStats,
    unlockedAchievements,
    newAchievement,
    startDraft,
    makePick,
    returnToMenu,
    clearNewAchievement,
    isComplete,
  };
}
