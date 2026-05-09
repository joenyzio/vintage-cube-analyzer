import { useState, useCallback } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  Play, RotateCcw, ChevronRight, Sparkles, Trophy,
  Target, Package, CheckCircle2, Users, ArrowLeftRight
} from 'lucide-react';

interface DraftSimulatorProps {
  cards: CubeCard[];
}

interface DraftState {
  // All 8 players' current packs (index 0 is you)
  tablePacks: CubeCard[][];
  picks: CubeCard[];
  packNumber: number; // 1, 2, or 3
  pickNumber: number; // 1-15 within the pack
  direction: 'left' | 'right'; // Pack 1 & 3 go left, Pack 2 goes right
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
    // Shuffle all cards and create packs for all 8 players (pack 1)
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

  // Each AI player has a preferred color pair (simulates real drafters with preferences)
  const aiPreferences = useMemo(() => [
    null, // Player 0 is human
    ['U', 'B'], // Player 1 likes UB
    ['R', 'W'], // Player 2 likes RW aggro
    ['U', 'G'], // Player 3 likes UG ramp
    ['B', 'R'], // Player 4 likes BR
    ['U', 'W'], // Player 5 likes UW control
    ['G', 'W'], // Player 6 likes GW
    ['U', 'R'], // Player 7 likes UR
  ], []);

  const simulateOtherPlayersPicks = (packs: CubeCard[][]): CubeCard[][] => {
    return packs.map((pack, playerIndex) => {
      if (playerIndex === 0 || pack.length === 0) return pack;

      const prefs = aiPreferences[playerIndex] || [];

      // Score each card: base power + bonus for matching colors + small random factor
      const scoredCards = pack.map(card => {
        let score = card.powerLevel * 10; // Base score

        // Bonus for colorless cards (go in any deck)
        if ((card.color_identity?.length || 0) === 0) {
          score += 15;
        }

        // Bonus for matching AI's color preferences
        const cardColors = card.color_identity || [];
        const matchingColors = cardColors.filter(c => prefs.includes(c)).length;
        if (matchingColors > 0) {
          score += matchingColors * 20;
        }

        // Penalty for off-color cards (AI won't splash for medium cards)
        if (cardColors.length > 0 && matchingColors === 0 && card.powerLevel < 9) {
          score -= 30;
        }

        // Small random factor to break ties and add variety
        score += Math.random() * 10;

        return { card, score };
      });

      // Pick highest scored card
      scoredCards.sort((a, b) => b.score - a.score);
      const picked = scoredCards[0].card;
      return pack.filter(c => c.id !== picked.id);
    });
  };

  const rotatePacks = (packs: CubeCard[][], direction: 'left' | 'right'): CubeCard[][] => {
    const newPacks = [...packs];
    if (direction === 'left') {
      // Each player passes to the left (lower index, wrapping)
      const first = newPacks[0];
      for (let i = 0; i < NUM_PLAYERS - 1; i++) {
        newPacks[i] = newPacks[i + 1];
      }
      newPacks[NUM_PLAYERS - 1] = first;
    } else {
      // Each player passes to the right (higher index, wrapping)
      const last = newPacks[NUM_PLAYERS - 1];
      for (let i = NUM_PLAYERS - 1; i > 0; i--) {
        newPacks[i] = newPacks[i - 1];
      }
      newPacks[0] = last;
    }
    return newPacks;
  };

  const startNewPack = useCallback((currentPicks: CubeCard[], nextPackNumber: number): DraftState => {
    // Create new packs for all players
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

    // Add card to picks
    const newPicks = [...draftState.picks, card];

    // Remove card from player 0's pack
    let newTablePacks = draftState.tablePacks.map((pack, idx) =>
      idx === 0 ? pack.filter(c => c.id !== card.id) : pack
    );

    // Simulate other players picking
    newTablePacks = simulateOtherPlayersPicks(newTablePacks);

    // Rotate packs
    newTablePacks = rotatePacks(newTablePacks, draftState.direction);

    const newPickNumber = draftState.pickNumber + 1;

    // Check if pack is done (15 picks made)
    if (newPickNumber > CARDS_PER_PACK) {
      if (draftState.packNumber >= 3) {
        // Draft complete!
        setDraftState({
          ...draftState,
          picks: newPicks,
          isComplete: true,
        });
        setShowAnalysis(true);
      } else {
        // Start next pack
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

    // Determine suggested archetype
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
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse" />
          <div className="relative bg-gray-900 p-8 rounded-2xl border border-gray-800">
            <Package className="w-20 h-20 text-purple-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white text-center mb-2">Draft Simulator</h2>
            <p className="text-gray-400 text-center max-w-md">
              Experience a realistic 8-player draft. Packs rotate around the table just like a real draft pod.
            </p>
          </div>
        </div>

        <button
          onClick={startDraft}
          className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:scale-105"
        >
          <span className="flex items-center gap-3">
            <Play className="w-6 h-6" />
            Start Draft
          </span>
        </button>

        <div className="flex items-center gap-6 text-sm text-gray-500">
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

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-sm">How It Works</CardTitle>
          </CardHeader>
          <div className="text-sm text-gray-400 space-y-2">
            <p>• <strong className="text-white">Pack 1:</strong> Open 15 cards, pick 1, pass left. Repeat until pack is empty.</p>
            <p>• <strong className="text-white">Pack 2:</strong> Open 15 new cards, pick 1, pass right.</p>
            <p>• <strong className="text-white">Pack 3:</strong> Open 15 new cards, pick 1, pass left.</p>
            <p>• AI opponents pick the most powerful available card.</p>
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
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Draft Complete!
            </h2>
            <p className="text-gray-400">You drafted {draftState.picks.length} cards</p>
          </div>
          <button
            onClick={startDraft}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Draft Again
          </button>
        </div>

        {/* Analysis Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <div className="text-3xl font-bold text-purple-400">{analysis.deckRating}/10</div>
            <div className="text-sm text-gray-400">Deck Rating</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-3xl font-bold text-white">
              {analysis.mainColors.map(c => (
                <span key={c} className={`
                  ${c === 'W' ? 'text-amber-200' : ''}
                  ${c === 'U' ? 'text-blue-400' : ''}
                  ${c === 'B' ? 'text-gray-400' : ''}
                  ${c === 'R' ? 'text-red-400' : ''}
                  ${c === 'G' ? 'text-green-400' : ''}
                `}>{c}</span>
              ))}
              {analysis.mainColors.length === 0 && <span className="text-gray-500">?</span>}
            </div>
            <div className="text-sm text-gray-400">Main Colors</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-3xl font-bold text-yellow-400">{analysis.avgCmc.toFixed(1)}</div>
            <div className="text-sm text-gray-400">Avg CMC</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-cyan-400">{analysis.archetype}</div>
            <div className="text-sm text-gray-400">Archetype</div>
          </Card>
        </div>

        {/* Picks Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Your {draftState.picks.length} Picks</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {draftState.picks.map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                className="relative aspect-[488/680] rounded-lg overflow-hidden bg-gray-800 group cursor-pointer hover:scale-105 transition-transform"
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-[10px] font-bold text-white">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Hover Preview */}
        {hoveredCard && (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 hidden lg:block">
            <div className="relative">
              <div className="absolute -inset-2 bg-purple-500/30 rounded-2xl blur-xl" />
              <img
                src={getCardImage(hoveredCard)}
                alt={hoveredCard.name}
                className="relative w-64 rounded-xl shadow-2xl border border-white/10"
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
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            Pack {draftState.packNumber}, Pick {draftState.pickNumber}
            <span className="text-sm font-normal text-gray-400">
              ({cardsInPack} cards in pack)
            </span>
          </h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <ArrowLeftRight className="w-4 h-4" />
              Passing {draftState.direction}
            </span>
            <span>{draftState.picks.length} cards picked</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Pack progress indicators */}
          <div className="flex gap-2">
            {[1, 2, 3].map(p => (
              <div key={p} className="flex flex-col items-center gap-1">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${p < draftState.packNumber ? 'bg-green-500 text-white' : ''}
                  ${p === draftState.packNumber ? 'bg-purple-500 text-white ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-950' : ''}
                  ${p > draftState.packNumber ? 'bg-gray-800 text-gray-500' : ''}
                `}>
                  {p < draftState.packNumber ? '✓' : p}
                </div>
                <span className="text-[10px] text-gray-500">Pack {p}</span>
              </div>
            ))}
          </div>

          <button
            onClick={startDraft}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
        </div>
      </div>

      {/* Pick Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${((draftState.pickNumber - 1) / CARDS_PER_PACK) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-600">
          {Array.from({ length: 15 }).map((_, i) => (
            <span key={i} className={i < draftState.pickNumber - 1 ? 'text-purple-400' : ''}>
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
              ${selectedForPick?.id === card.id ? 'ring-4 ring-purple-500 scale-105 z-10' : ''}
            `}
          >
            <img
              src={getCardImage(card)}
              alt={card.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Power indicator */}
            <div className={`
              absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg
              ${card.powerLevel >= 9 ? 'bg-yellow-500 text-black' : ''}
              ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-purple-500 text-white' : ''}
              ${card.powerLevel < 7 ? 'bg-gray-800/90 text-white' : ''}
            `}>
              {card.powerLevel}
            </div>

            {/* Selection overlay */}
            {selectedForPick?.id === card.id && (
              <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-purple-400 drop-shadow-lg" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pick Button */}
      {selectedForPick && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <button
            onClick={() => makePick(selectedForPick)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105"
          >
            <Target className="w-5 h-5" />
            Pick {selectedForPick.name}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Picks Sidebar */}
      {draftState.picks.length > 0 && (
        <Card className="mt-6">
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
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
            {draftState.picks.map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                className="relative w-14 flex-shrink-0 aspect-[488/680] rounded overflow-hidden hover:scale-110 transition-transform cursor-pointer"
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-center text-white py-0.5">
                  P{Math.ceil((idx + 1) / 15)}P{((idx) % 15) + 1}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Hovered Card Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-2 bg-purple-500/30 rounded-2xl blur-xl" />
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="relative w-56 rounded-xl shadow-2xl border border-white/10"
            />
            <div className="absolute bottom-2 left-2 right-2 bg-black/80 rounded-lg p-2">
              <div className="text-sm font-bold text-white truncate">{hoveredCard.name}</div>
              <div className="text-xs text-gray-400">{hoveredCard.type_line?.split('—')[0]}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
