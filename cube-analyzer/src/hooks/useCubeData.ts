import { useState, useEffect, useMemo } from 'react';
import type { CubeCard, Archetype, DraftStrategy, ScryfallCard } from '../types/card';
import {
  analyzeCard,
  generateArchetypes,
  generateDraftStrategies,
  analyzeColorDistribution,
  analyzeManaCurve,
  analyzeTypeDistribution,
  getTopCardsByPower,
} from '../services/analysis';

// Import pre-fetched card data (no API calls at runtime!)
import staticCardsData from '../data/cards.json';

export interface CubeData {
  cards: CubeCard[];
  archetypes: Archetype[];
  draftStrategies: DraftStrategy[];
  colorDistribution: Record<string, number>;
  manaCurve: Record<number, Record<string, number>>;
  typeDistribution: Record<string, number>;
  powerRankings: CubeCard[];
  loading: boolean;
  error: string | null;
  progress: number;
}

export function useCubeData(): CubeData {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Analyze the static card data
  const cards = useMemo(() => {
    const scryfallCards = staticCardsData as ScryfallCard[];
    return scryfallCards.map((card) => analyzeCard(card));
  }, []);

  // Simulate brief loading for smooth UX (optional, can remove for instant)
  useEffect(() => {
    setProgress(50);
    const timer = setTimeout(() => {
      setProgress(100);
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const archetypes = useMemo(() => generateArchetypes(cards), [cards]);
  const draftStrategies = useMemo(() => generateDraftStrategies(), []);
  const colorDistribution = useMemo(() => analyzeColorDistribution(cards), [cards]);
  const manaCurve = useMemo(() => analyzeManaCurve(cards), [cards]);
  const typeDistribution = useMemo(() => analyzeTypeDistribution(cards), [cards]);
  const powerRankings = useMemo(() => getTopCardsByPower(cards, 30), [cards]);

  return {
    cards,
    archetypes,
    draftStrategies,
    colorDistribution,
    manaCurve,
    typeDistribution,
    powerRankings,
    loading,
    error: null,
    progress,
  };
}
