import { useState, useCallback, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Play, RotateCcw, Trophy, Star, ArrowLeft, ArrowRight, Users, Package, Target } from 'lucide-react';

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

  // Get some featured cards for the start screen
  const featuredCards = useMemo(() => {
    return cards
      .filter(c => c.powerLevel >= 9)
      .sort(() => Math.random() - 0.5)
      .slice(0, 7);
  }, [cards]);

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

  const getRecommendedPick = useMemo(() => {
    if (!draftState) return null;
    const currentPack = draftState.tablePacks[0];
    if (!currentPack.length) return null;

    const colorCounts: Record<string, number> = {};
    draftState.picks.forEach(c => {
      c.color_identity?.forEach(col => {
        colorCounts[col] = (colorCounts[col] || 0) + 1;
      });
    });
    const mainColors = Object.entries(colorCounts)
      .filter(([_, count]) => count >= 2)
      .map(([color]) => color);

    let bestCard = currentPack[0];
    let bestScore = -Infinity;

    currentPack.forEach(card => {
      let score = card.powerLevel * 10;
      const cardColors = card.color_identity || [];
      if (cardColors.length === 0) score += 5;
      if (mainColors.length > 0) {
        const onColor = cardColors.every(c => mainColors.includes(c));
        if (onColor) score += 15;
      }
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

  // Start screen with visual interest
  if (!draftState) {
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

            <button
              onClick={startDraft}
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all duration-300 group active:scale-95"
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Start Draft
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
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
        </div>

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
          <button
            onClick={startDraft}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-medium hover:bg-white/15 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Draft Again
          </button>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2">
          {picks.map((card, idx) => (
            <div
              key={`${card.id}-${idx}`}
              className="relative aspect-[488/680] rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform"
              onMouseEnter={() => setHoveredCard(card)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
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

  // Active draft
  const currentPack = draftState.tablePacks[0];
  const progress = ((draftState.packNumber - 1) * 15 + draftState.pickNumber - 1) / 45;
  const recommendedCard = getRecommendedPick;

  return (
    <div className="flex gap-5">
      {/* Left Panel - Picks */}
      <div className="w-52 flex-shrink-0 hidden lg:block">
        <div className="sticky top-20 bg-black border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Panel Header */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Your Picks</span>
              <span className="text-xs text-white/40 font-mono">{draftState.picks.length}/45</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/40 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Color Summary */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex gap-1.5 justify-center">
              {['W', 'U', 'B', 'R', 'G'].map(c => {
                const count = colorCounts[c] || 0;
                return (
                  <div
                    key={c}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                      ${count === 0 ? 'opacity-30' : ''}
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

          {/* Picks Grid */}
          <div className="p-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {draftState.picks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-white/30">No picks yet</p>
                <p className="text-xs text-white/20 mt-1">Click a card to draft it</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {draftState.picks.map((card, idx) => (
                  <div
                    key={`${card.id}-${idx}`}
                    className="relative aspect-[488/680] rounded-md overflow-hidden hover:scale-105 transition-transform cursor-pointer hover:z-10 shadow-sm"
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

            <button
              onClick={startDraft}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pack Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
          {currentPack.map((card) => {
            const isRecommended = recommendedCard?.id === card.id;
            return (
              <div
                key={card.id}
                onClick={() => makePick(card)}
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative aspect-[488/680] rounded-xl overflow-hidden cursor-pointer shadow-lg
                  transition-all duration-200 hover:scale-[1.04] hover:-translate-y-1 hover:z-10 hover:shadow-xl
                  ${isRecommended ? 'ring-2 ring-amber-400/60 shadow-amber-400/20' : ''}
                `}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

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

                {/* Recommended indicator */}
                {isRecommended && (
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
          <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl">
            <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-56 rounded-lg" />
            <div className="mt-2 px-1">
              <div className="text-sm font-medium text-white">{hoveredCard.name}</div>
              <div className="text-xs text-white/40 mt-0.5">{hoveredCard.type_line?.split('—')[0]}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
