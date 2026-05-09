import { useState, useCallback, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  Play, RotateCcw, ChevronRight,
  Target, Package, CheckCircle2, Users, ArrowLeftRight, Trophy
} from 'lucide-react';

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
  const [selectedForPick, setSelectedForPick] = useState<CubeCard | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

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
    setShowAnalysis(false);
    setSelectedForPick(null);
  }, [cards]);

  const aiPreferences = useMemo(() => [
    null,
    ['U', 'B'],
    ['R', 'W'],
    ['U', 'G'],
    ['B', 'R'],
    ['U', 'W'],
    ['G', 'W'],
    ['U', 'R'],
  ], []);

  const simulateOtherPlayersPicks = (packs: CubeCard[][]): CubeCard[][] => {
    return packs.map((pack, playerIndex) => {
      if (playerIndex === 0 || pack.length === 0) return pack;

      const prefs = aiPreferences[playerIndex] || [];

      const scoredCards = pack.map(card => {
        let score = card.powerLevel * 10;

        if ((card.color_identity?.length || 0) === 0) {
          score += 15;
        }

        const cardColors = card.color_identity || [];
        const matchingColors = cardColors.filter(c => prefs.includes(c)).length;
        if (matchingColors > 0) {
          score += matchingColors * 20;
        }

        if (cardColors.length > 0 && matchingColors === 0 && card.powerLevel < 9) {
          score -= 30;
        }

        score += Math.random() * 10;

        return { card, score };
      });

      scoredCards.sort((a, b) => b.score - a.score);
      const picked = scoredCards[0].card;
      return pack.filter(c => c.id !== picked.id);
    });
  };

  const rotatePacks = (packs: CubeCard[][], direction: 'left' | 'right'): CubeCard[][] => {
    const newPacks = [...packs];
    if (direction === 'left') {
      const first = newPacks[0];
      for (let i = 0; i < NUM_PLAYERS - 1; i++) {
        newPacks[i] = newPacks[i + 1];
      }
      newPacks[NUM_PLAYERS - 1] = first;
    } else {
      const last = newPacks[NUM_PLAYERS - 1];
      for (let i = NUM_PLAYERS - 1; i > 0; i--) {
        newPacks[i] = newPacks[i - 1];
      }
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
        setDraftState({
          ...draftState,
          picks: newPicks,
          isComplete: true,
        });
        setShowAnalysis(true);
      } else {
        setDraftState(startNewPack(newPicks, draftState.packNumber + 1));
      }
    } else {
      setDraftState({
        ...draftState,
        tablePacks: newTablePacks,
        picks: newPicks,
        pickNumber: newPickNumber,
      });
    }

    setSelectedForPick(null);
  }, [draftState, startNewPack]);

  const getDraftAnalysis = () => {
    if (!draftState) return null;

    const picks = draftState.picks;
    const colors: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let totalPower = 0;
    let totalCmc = 0;
    let nonLandCount = 0;
    const types: Record<string, number> = {};

    picks.forEach(card => {
      card.color_identity?.forEach(c => {
        colors[c] = (colors[c] || 0) + 1;
      });

      const mainType = card.type_line?.split('—')[0].trim().split(' ').pop() || 'Other';
      types[mainType] = (types[mainType] || 0) + 1;

      totalPower += card.powerLevel;

      if (!card.type_line?.toLowerCase().includes('land')) {
        totalCmc += card.cmc || 0;
        nonLandCount++;
      }
    });

    const mainColors = Object.entries(colors)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([color]) => color);

    const avgPower = picks.length > 0 ? totalPower / picks.length : 0;
    const avgCmc = nonLandCount > 0 ? totalCmc / nonLandCount : 0;

    let archetype = 'Goodstuff';
    const hasCard = (name: string) => picks.some(c => c.name === name);

    if (mainColors.includes('U') && mainColors.includes('B')) {
      if (hasCard('Reanimate') || hasCard('Animate Dead') || hasCard('Entomb')) {
        archetype = 'UB Reanimator';
      } else {
        archetype = 'UB Control';
      }
    } else if (mainColors.includes('U') && mainColors.includes('R')) {
      if (hasCard('Underworld Breach') || hasCard('Brain Freeze')) {
        archetype = 'UR Storm';
      } else {
        archetype = 'UR Spells';
      }
    } else if (mainColors.includes('R') && mainColors.includes('W')) {
      archetype = 'RW Aggro';
    } else if (mainColors.includes('U') && mainColors.includes('G')) {
      archetype = 'UG Ramp';
    } else if (mainColors.includes('U') && mainColors.includes('W')) {
      archetype = 'UW Control';
    } else if (mainColors.includes('B') && mainColors.includes('G')) {
      archetype = 'BG Midrange';
    } else if (mainColors.includes('B') && mainColors.includes('R')) {
      archetype = 'BR Aggro';
    }

    return {
      mainColors,
      types,
      avgPower,
      avgCmc,
      archetype,
      deckRating: Math.min(10, Math.round(avgPower + (mainColors.length <= 2 ? 1 : 0))),
    };
  };

  // Not started yet
  if (!draftState) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-8">
        <div className="bg-[#111] border border-white/10 p-8 rounded-xl">
          <Package className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white text-center mb-2">Draft Simulator</h2>
          <p className="text-white/40 text-center max-w-md text-sm">
            Experience a realistic 8-player draft. Packs rotate around the table just like a real draft pod.
          </p>
        </div>

        <button
          onClick={startDraft}
          className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg font-medium text-white hover:bg-white/15 transition-all"
        >
          <span className="flex items-center gap-3">
            <Play className="w-5 h-5" />
            Start Draft
          </span>
        </button>

        <div className="flex items-center gap-6 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>8 Players</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>3 Packs</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span>15 Cards/Pack</span>
          </div>
        </div>

        <Card className="max-w-lg bg-[#111] border-white/8">
          <CardHeader>
            <CardTitle className="text-sm">How It Works</CardTitle>
          </CardHeader>
          <div className="text-sm text-white/40 space-y-2">
            <p>- <span className="text-white/60">Pack 1:</span> Open 15 cards, pick 1, pass left</p>
            <p>- <span className="text-white/60">Pack 2:</span> Open 15 new cards, pick 1, pass right</p>
            <p>- <span className="text-white/60">Pack 3:</span> Open 15 new cards, pick 1, pass left</p>
            <p>- AI opponents have color preferences and prioritize power</p>
          </div>
        </Card>
      </div>
    );
  }

  // Draft complete - show analysis
  if (showAnalysis) {
    const analysis = getDraftAnalysis();
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Draft Complete
            </h2>
            <p className="text-white/40 text-sm">{draftState.picks.length} cards drafted</p>
          </div>
          <button
            onClick={startDraft}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Draft Again
          </button>
        </div>

        {/* Analysis Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center p-4 bg-[#111] border-white/8">
            <div className="text-2xl font-semibold text-white">{analysis.deckRating}/10</div>
            <div className="text-xs text-white/40">Deck Rating</div>
          </Card>
          <Card className="text-center p-4 bg-[#111] border-white/8">
            <div className="text-2xl font-semibold">
              {analysis.mainColors.map(c => (
                <span key={c} className={`
                  ${c === 'W' ? 'text-amber-200' : ''}
                  ${c === 'U' ? 'text-blue-400' : ''}
                  ${c === 'B' ? 'text-neutral-400' : ''}
                  ${c === 'R' ? 'text-red-400' : ''}
                  ${c === 'G' ? 'text-green-400' : ''}
                `}>{c}</span>
              ))}
              {analysis.mainColors.length === 0 && <span className="text-white/30">?</span>}
            </div>
            <div className="text-xs text-white/40">Main Colors</div>
          </Card>
          <Card className="text-center p-4 bg-[#111] border-white/8">
            <div className="text-2xl font-semibold text-white">{analysis.avgCmc.toFixed(1)}</div>
            <div className="text-xs text-white/40">Avg CMC</div>
          </Card>
          <Card className="text-center p-4 bg-[#111] border-white/8">
            <div className="text-base font-semibold text-white">{analysis.archetype}</div>
            <div className="text-xs text-white/40">Archetype</div>
          </Card>
        </div>

        {/* Picks Grid */}
        <Card className="bg-[#111] border-white/8">
          <CardHeader>
            <CardTitle className="text-sm">Your {draftState.picks.length} Picks</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {draftState.picks.map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                className="relative aspect-[488/680] rounded-lg overflow-hidden bg-white/5 group cursor-pointer hover:scale-105 transition-transform"
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center text-[9px] font-mono text-white">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Hover Preview */}
        {hoveredCard && (
          <div className="fixed bottom-4 right-4 z-50 animate-in fade-in hidden lg:block">
            <div className="bg-[#111] border border-white/10 p-2 rounded-xl">
              <img
                src={getCardImage(hoveredCard)}
                alt={hoveredCard.name}
                className="w-56 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active draft
  const currentPack = draftState.tablePacks[0];
  const cardsInPack = currentPack.length;

  return (
    <div className="space-y-6">
      {/* Draft Progress Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Pack {draftState.packNumber}, Pick {draftState.pickNumber}
            <span className="text-sm font-normal text-white/40 ml-2">
              ({cardsInPack} cards)
            </span>
          </h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-white/40">
            <span className="flex items-center gap-1">
              <ArrowLeftRight className="w-4 h-4" />
              Passing {draftState.direction}
            </span>
            <span>{draftState.picks.length} picked</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {[1, 2, 3].map(p => (
              <div key={p} className="flex flex-col items-center gap-1">
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-sm font-mono
                  ${p < draftState.packNumber ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
                  ${p === draftState.packNumber ? 'bg-white/10 text-white border border-white/30' : ''}
                  ${p > draftState.packNumber ? 'bg-white/5 text-white/30 border border-white/10' : ''}
                `}>
                  {p < draftState.packNumber ? '✓' : p}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={startDraft}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
        </div>
      </div>

      {/* Pick Progress Bar */}
      <div className="relative">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/30 transition-all duration-300"
            style={{ width: `${((draftState.pickNumber - 1) / CARDS_PER_PACK) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-white/20">
          {Array.from({ length: 15 }).map((_, i) => (
            <span key={i} className={i < draftState.pickNumber - 1 ? 'text-white/40' : ''}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Current Pack */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {currentPack.map((card) => (
          <div
            key={card.id}
            onClick={() => setSelectedForPick(card)}
            onDoubleClick={() => makePick(card)}
            onMouseEnter={() => setHoveredCard(card)}
            onMouseLeave={() => setHoveredCard(null)}
            className={`
              relative aspect-[488/680] rounded-xl overflow-hidden cursor-pointer
              transition-all duration-200 hover:scale-105 hover:z-10
              ${selectedForPick?.id === card.id ? 'ring-2 ring-white/50 scale-105 z-10' : ''}
            `}
          >
            <img
              src={getCardImage(card)}
              alt={card.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            <div className={`
              absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono
              ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : ''}
              ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-white/80 text-black' : ''}
              ${card.powerLevel < 7 ? 'bg-black/60 text-white/70' : ''}
            `}>
              {card.powerLevel}
            </div>

            {selectedForPick?.id === card.id && (
              <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pick Button */}
      {selectedForPick && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in">
          <button
            onClick={() => makePick(selectedForPick)}
            className="flex items-center gap-3 px-5 py-2.5 bg-white/10 border border-white/20 rounded-lg font-medium text-white hover:bg-white/15 transition-all"
          >
            <Target className="w-4 h-4" />
            Pick {selectedForPick.name}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Picks Sidebar */}
      {draftState.picks.length > 0 && (
        <Card className="mt-6 bg-[#111] border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Your Picks ({draftState.picks.length}/45)</span>
              <div className="flex gap-1">
                {['W', 'U', 'B', 'R', 'G'].map(color => {
                  const count = draftState.picks.filter(c =>
                    c.color_identity?.length === 1 && c.color_identity[0] === color
                  ).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={color} variant="mana" color={color as any}>
                      {count}
                    </Badge>
                  );
                })}
              </div>
            </CardTitle>
          </CardHeader>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {draftState.picks.map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                className="relative w-12 flex-shrink-0 aspect-[488/680] rounded overflow-hidden hover:scale-110 transition-transform cursor-pointer"
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[7px] text-center text-white py-0.5 font-mono">
                  P{Math.ceil((idx + 1) / 15)}P{((idx) % 15) + 1}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Hovered Card Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in hidden lg:block">
          <div className="bg-[#111] border border-white/10 p-2 rounded-xl">
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="w-48 rounded-lg"
            />
            <div className="mt-2 px-1">
              <div className="text-sm font-medium text-white truncate">{hoveredCard.name}</div>
              <div className="text-xs text-white/40">{hoveredCard.type_line?.split('—')[0]}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
