/**
 * Draft Results Component
 *
 * Shows the results after a draft is complete - all 8 player decks with stats.
 */

// React is used for JSX
import { Users, ArrowLeft, RotateCcw } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import type { DraftState } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';
import { getEloData, calculateDeckElo } from '../../services/eloHelpers';
import { getSynergyAdjustedElo } from '../../services/draftUtilities';

const AI_PLAYERS = [
  { name: 'You', colors: [] as string[] },
  { name: 'Dimir Drafter', colors: ['U', 'B'] },
  { name: 'Boros Drafter', colors: ['R', 'W'] },
  { name: 'Simic Drafter', colors: ['U', 'G'] },
  { name: 'Rakdos Drafter', colors: ['B', 'R'] },
  { name: 'Azorius Drafter', colors: ['U', 'W'] },
  { name: 'Selesnya Drafter', colors: ['G', 'W'] },
  { name: 'Izzet Drafter', colors: ['U', 'R'] },
];

interface DraftResultsProps {
  draftState: DraftState;
  hoveredCard: CubeCard | null;
  expandedPlayerIdx: number | null;
  onSetExpandedPlayerIdx: (idx: number | null) => void;
  onHoverCard: (card: CubeCard) => void;
  onBackToDeck: () => void;
  onReturnToMenu: () => void;
}

export function DraftResults({
  draftState,
  hoveredCard,
  expandedPlayerIdx,
  onSetExpandedPlayerIdx,
  onHoverCard,
  onBackToDeck,
  onReturnToMenu,
}: DraftResultsProps) {
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
            onClick={onBackToDeck}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-medium hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deck
          </button>
          <button
            onClick={onReturnToMenu}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/20 border border-purple-500/30 rounded-xl text-white font-medium hover:bg-purple-500/30 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
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

    // Calculate average synergy-adjusted ELO
    const adjustedElos = picks.map(card => getSynergyAdjustedElo(card, picks).adjustedElo);
    const avgAdjustedElo = Math.round(adjustedElos.reduce((sum, e) => sum + e, 0) / picks.length);

    // Calculate archetype coherence
    let coherenceScore = 0;

    const colorCount = Object.keys(colorCts).length;
    if (colorCount <= 2) coherenceScore += 35;
    else if (colorCount === 3) coherenceScore += 20;
    else coherenceScore += 5;

    const totalColored = picks.filter(p => (p.color_identity?.length || 0) > 0).length;
    const inMainColors = picks.filter(p =>
      p.color_identity?.every(c => mainColors.includes(c)) ?? true
    ).length;
    const colorFocus = totalColored > 0 ? (inMainColors / totalColored) * 30 : 30;
    coherenceScore += colorFocus;

    if (archetype === 'Channel Combo' && (hasChannel && hasEmrakul)) coherenceScore += 35;
    else if (archetype === 'Reanimator' && hasReanimation && picks.some(p => (p.cmc || 0) >= 7)) coherenceScore += 35;
    else if (archetype === 'Artifact Combo' && hasTinker && picks.filter(p => p.type_line?.toLowerCase().includes('artifact')).length >= 8) coherenceScore += 35;
    else if (archetype === 'Aggro' && avgCmc < 2.8 && creatureCount >= 15) coherenceScore += 35;
    else if (archetype === 'Control' && picks.filter(p => p.oracle_text?.toLowerCase().includes('counter') || p.oracle_text?.toLowerCase().includes('destroy target')).length >= 6) coherenceScore += 35;
    else if (archetype !== 'Unknown' && archetype !== 'Goodstuff') coherenceScore += 20;
    else coherenceScore += 10;

    const archetypeCoherence = Math.min(100, Math.round(coherenceScore));

    const topCards = picks
      .map(p => ({ card: p, elo: getEloData(p.name)?.elo || 0 }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 5);

    return {
      playerIdx,
      name: AI_PLAYERS[playerIdx].name,
      picks,
      deckElo: deckElo.rawAverage,
      avgAdjustedElo,
      archetypeCoherence,
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

  const colorMap: Record<string, string> = {
    W: 'bg-amber-100 text-amber-900',
    U: 'bg-blue-500 text-white',
    B: 'bg-purple-900 text-purple-100',
    R: 'bg-red-500 text-white',
    G: 'bg-green-600 text-white',
  };

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
            onClick={onBackToDeck}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white font-medium hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Your Deck
          </button>
          <button
            onClick={onReturnToMenu}
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
                onClick={() => onSetExpandedPlayerIdx(isExpanded ? null : player.playerIdx)}
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
                            onMouseEnter={() => onHoverCard(card)}
                          >
                            <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ELO Scores */}
                  <div className="text-right flex items-center gap-4">
                    {/* Synergy-Adjusted ELO */}
                    <div className="hidden sm:block">
                      <div className={`text-lg font-semibold ${
                        player.avgAdjustedElo > player.deckElo
                          ? 'text-green-400'
                          : player.avgAdjustedElo < player.deckElo
                            ? 'text-red-400'
                            : 'text-white/70'
                      }`}>
                        {player.avgAdjustedElo}
                        {player.avgAdjustedElo !== player.deckElo && (
                          <span className="text-xs ml-1">
                            ({player.avgAdjustedElo > player.deckElo ? '+' : ''}{player.avgAdjustedElo - player.deckElo})
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-white/30 uppercase tracking-wide">Synergy ELO</div>
                    </div>
                    {/* Coherence */}
                    <div className="hidden md:block">
                      <div className={`text-lg font-semibold ${
                        player.archetypeCoherence >= 80 ? 'text-green-400' :
                        player.archetypeCoherence >= 60 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {player.archetypeCoherence}%
                      </div>
                      <div className="text-[9px] text-white/30 uppercase tracking-wide">Coherence</div>
                    </div>
                    {/* Raw Deck ELO */}
                    <div>
                      <div className={`text-2xl font-bold ${
                        rank === 0 ? 'text-amber-400' : isYou ? 'text-purple-300' : 'text-white'
                      }`}>
                        {player.deckElo}
                      </div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wide">Deck ELO</div>
                    </div>
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
                          onMouseEnter={() => onHoverCard(card)}
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
