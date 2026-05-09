import { useState, useCallback, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Play, RotateCcw, Trophy, Star, ArrowLeft, ArrowRight } from 'lucide-react';

interface DraftSimulatorProps {
  cards: CubeCard[];
}

interface DraftState {
  tablePacks: CubeCard[][];
  picks: CubeCard[];
  packNumber: number;
  pickNumber: number;
  direction: 'left' | 'right';
  isComplete: boolean;
}

const NUM_PLAYERS = 8;
const CARDS_PER_PACK = 15;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function DraftSimulator({ cards }: DraftSimulatorProps) {
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const startDraft = useCallback(() => {
    const shuffled = shuffleArray([...cards]);
    const tablePacks: CubeCard[][] = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      tablePacks.push(shuffled.slice(i * CARDS_PER_PACK, (i + 1) * CARDS_PER_PACK));
    }
    setDraftState({
      tablePacks,
      picks: [],
      packNumber: 1,
      direction: 'left',
      pickNumber: 1,
      isComplete: false,
    });
  }, [cards]);

  const aiPreferences = useMemo(() => [
    null, ['U', 'B'], ['R', 'W'], ['U', 'G'],
    ['B', 'R'], ['U', 'W'], ['G', 'W'], ['U', 'R'],
  ], []);

  const simulateOtherPlayersPicks = (packs: CubeCard[][]): CubeCard[][] => {
    return packs.map((pack, playerIndex) => {
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
      return pack.filter(c => c.id !== scoredCards[0].card.id);
    });
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

  const startNewPack = useCallback((currentPicks: CubeCard[], nextPackNumber: number): DraftState => {
    const shuffled = shuffleArray([...cards].filter(c => !currentPicks.some(p => p.id === c.id)));
    const tablePacks: CubeCard[][] = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      tablePacks.push(shuffled.slice(i * CARDS_PER_PACK, (i + 1) * CARDS_PER_PACK));
    }
    return {
      tablePacks,
      picks: currentPicks,
      packNumber: nextPackNumber,
      direction: nextPackNumber === 2 ? 'right' : 'left',
      pickNumber: 1,
      isComplete: false,
    };
  }, [cards]);

  const makePick = useCallback((card: CubeCard) => {
    if (!draftState || draftState.isComplete) return;
    const newPicks = [...draftState.picks, card];
    let newTablePacks = draftState.tablePacks.map((pack, idx) =>
      idx === 0 ? pack.filter(c => c.id !== card.id) : pack
    );
    newTablePacks = simulateOtherPlayersPicks(newTablePacks);
    newTablePacks = rotatePacks(newTablePacks, draftState.direction);
    const newPickNumber = draftState.pickNumber + 1;

    if (newPickNumber > CARDS_PER_PACK) {
      if (draftState.packNumber >= 3) {
        setDraftState({ ...draftState, picks: newPicks, isComplete: true });
      } else {
        setDraftState(startNewPack(newPicks, draftState.packNumber + 1));
      }
    } else {
      setDraftState({ ...draftState, tablePacks: newTablePacks, picks: newPicks, pickNumber: newPickNumber });
    }
  }, [draftState, startNewPack]);

  // Get recommended pick based on power level and current colors
  const getRecommendedPick = useMemo(() => {
    if (!draftState) return null;
    const currentPack = draftState.tablePacks[0];
    if (!currentPack.length) return null;

    // Get current color tendencies
    const colorCounts: Record<string, number> = {};
    draftState.picks.forEach(c => {
      c.color_identity?.forEach(col => {
        colorCounts[col] = (colorCounts[col] || 0) + 1;
      });
    });
    const mainColors = Object.entries(colorCounts)
      .filter(([_, count]) => count >= 2)
      .map(([color]) => color);

    // Score each card
    let bestCard = currentPack[0];
    let bestScore = -Infinity;

    currentPack.forEach(card => {
      let score = card.powerLevel * 10;
      const cardColors = card.color_identity || [];

      // Colorless is always good
      if (cardColors.length === 0) score += 5;

      // On-color bonus
      if (mainColors.length > 0) {
        const onColor = cardColors.every(c => mainColors.includes(c));
        if (onColor) score += 15;
      }

      // Power 9+ always recommended
      if (card.powerLevel >= 9) score += 20;

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    });

    return bestCard;
  }, [draftState]);

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

  // Start screen
  if (!draftState) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <button
          onClick={startDraft}
          className="flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors text-lg"
        >
          <Play className="w-6 h-6" />
          Start Draft
        </button>
        <p className="text-white/30 text-sm mt-4">8 players · 3 packs · 45 picks</p>
      </div>
    );
  }

  // Draft complete
  if (draftState.isComplete) {
    const picks = draftState.picks;
    const avgPower = picks.reduce((sum, c) => sum + c.powerLevel, 0) / picks.length;
    const nonLands = picks.filter(c => !c.type_line?.toLowerCase().includes('land'));
    const avgCmc = nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length;

    const mainColors = Object.entries(colorCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([color]) => color);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Draft Complete</h2>
              <p className="text-sm text-white/40">
                {mainColors.join('')} · {avgPower.toFixed(1)} avg power · {avgCmc.toFixed(1)} avg CMC
              </p>
            </div>
          </div>
          <button
            onClick={startDraft}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/15 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Draft Again
          </button>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2">
          {picks.map((card, idx) => (
            <div
              key={`${card.id}-${idx}`}
              className="relative aspect-[488/680] rounded-lg overflow-hidden bg-white/5 group cursor-pointer hover:scale-105 transition-transform"
              onMouseEnter={() => setHoveredCard(card)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>

        {hoveredCard && (
          <div className="fixed bottom-4 right-4 z-50 hidden lg:block">
            <div className="bg-[#111] border border-white/10 p-2 rounded-xl">
              <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-56 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active draft
  const currentPack = draftState.tablePacks[0];
  const progress = ((draftState.packNumber - 1) * 15 + draftState.pickNumber - 1) / 45;
  const recommendedCard = getRecommendedPick;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              P{draftState.packNumber}P{draftState.pickNumber}
            </h2>
            <div className="flex items-center gap-1 text-xs text-white/40">
              {draftState.direction === 'left' ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
              <span>Passing {draftState.direction}</span>
            </div>
          </div>

          {/* Color counts */}
          <div className="flex gap-1">
            {['W', 'U', 'B', 'R', 'G'].map(c => {
              const count = colorCounts[c] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={c}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono
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

        <div className="flex items-center gap-3">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/40 transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="text-xs text-white/40 font-mono">{draftState.picks.length}/45</span>
          </div>

          <button
            onClick={startDraft}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pack Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {currentPack.map((card) => {
          const isRecommended = recommendedCard?.id === card.id;
          return (
            <div
              key={card.id}
              onClick={() => makePick(card)}
              onMouseEnter={() => setHoveredCard(card)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                relative aspect-[488/680] rounded-lg overflow-hidden cursor-pointer
                transition-all duration-150 hover:scale-[1.03] hover:z-10
                ${isRecommended ? 'ring-2 ring-amber-400/50' : ''}
              `}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

              {/* Power badge */}
              <div className={`
                absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : ''}
                ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-white/90 text-black' : ''}
                ${card.powerLevel < 7 ? 'bg-black/70 text-white/80' : ''}
              `}>
                {card.powerLevel}
              </div>

              {/* Recommended indicator */}
              {isRecommended && (
                <div className="absolute top-1 left-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Picks Strip */}
      {draftState.picks.length > 0 && (
        <div className="flex gap-1 overflow-x-auto py-2">
          {draftState.picks.map((card, idx) => (
            <div
              key={`${card.id}-${idx}`}
              className="relative w-10 flex-shrink-0 aspect-[488/680] rounded overflow-hidden opacity-80 hover:opacity-100 transition-opacity"
              onMouseEnter={() => setHoveredCard(card)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 hidden lg:block">
          <div className="bg-[#111] border border-white/10 p-2 rounded-xl">
            <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-52 rounded-lg" />
            <div className="mt-2 px-1">
              <div className="text-sm font-medium text-white">{hoveredCard.name}</div>
              <div className="text-xs text-white/40">{hoveredCard.type_line?.split('—')[0]}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
