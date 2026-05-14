/**
 * Draft Complete Component
 *
 * Shows the player's final pool after draft completion with stats and grading.
 */

// React is used for JSX
import { Trophy, RotateCcw, Users, XCircle, CheckCircle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import type { DraftState, PickDecision } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';
import { calculateDeckElo } from '../../services/eloHelpers';
import { getSynergyAdjustedElo, getColorCounts } from '../../services/draftUtilities';

interface DraftGrade {
  grade: string;
  color: string;
  optimalPicks: number;
  totalDecisions: number;
  optimalRate: number;
  avgEloDiff: number;
  worstPicks: PickDecision[];
  bestPicks: PickDecision[];
}

interface DraftCompleteProps {
  draftState: DraftState;
  draftGrade: DraftGrade | null;
  hoveredCard: CubeCard | null;
  onHoverCard: (card: CubeCard) => void;
  onViewTable: () => void;
  onReturnToMenu: () => void;
}

export function DraftComplete({
  draftState,
  draftGrade,
  hoveredCard,
  onHoverCard,
  onViewTable,
  onReturnToMenu,
}: DraftCompleteProps) {
  const picks = draftState.picks;
  const avgPower = picks.reduce((sum, c) => sum + c.powerLevel, 0) / picks.length;
  const nonLands = picks.filter(c => !c.type_line?.toLowerCase().includes('land'));
  const avgCmc = nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length;
  const deckElo = calculateDeckElo(picks.map(p => p.name));

  // Calculate synergy-adjusted ELO for the final deck
  const adjustedElos = picks.map(card => getSynergyAdjustedElo(card, picks).adjustedElo);
  const avgAdjustedElo = Math.round(adjustedElos.reduce((sum, e) => sum + e, 0) / picks.length);
  const synergyBonus = avgAdjustedElo - deckElo.rawAverage;

  const colorCounts = getColorCounts(picks);
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header with Grade - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title + Grade Row on Mobile */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">Draft Complete</h2>
              <p className="text-xs sm:text-sm text-white/40">
                {mainColors.join('')} · {avgPower.toFixed(1)} power · {avgCmc.toFixed(1)} CMC
              </p>
            </div>
          </div>

          {/* Draft Grade - visible in header on mobile */}
          {draftGrade && (
            <div className="text-center sm:hidden">
              <div className={`text-3xl font-bold ${draftGrade.color}`}>{draftGrade.grade}</div>
              <div className="text-[10px] text-white/30">{draftGrade.optimalRate}%</div>
            </div>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Draft Grade - Desktop only */}
          {draftGrade && (
            <div className="hidden sm:block text-center px-4">
              <div className="text-xs text-white/40 mb-1">Draft Grade</div>
              <div className={`text-4xl font-bold ${draftGrade.color}`}>{draftGrade.grade}</div>
              <div className="text-[10px] text-white/30">{draftGrade.optimalRate}% optimal picks</div>
            </div>
          )}

          <button
            onClick={onViewTable}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl text-white text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">View</span> Table
          </button>

          <button
            onClick={onReturnToMenu}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">New</span> Draft
          </button>
        </div>
      </div>

      {/* Stats Row - Mobile optimized grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-black border border-white/[0.06] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-white">{deckElo.rawAverage}</div>
          <div className="text-[10px] sm:text-xs text-white/40 mt-1">Raw ELO</div>
        </div>
        <div className="bg-black border border-white/[0.06] rounded-xl p-3 sm:p-4 text-center">
          <div className={`text-xl sm:text-2xl font-bold ${synergyBonus > 0 ? 'text-green-400' : synergyBonus < 0 ? 'text-red-400' : 'text-white'}`}>
            {avgAdjustedElo}
            {synergyBonus !== 0 && (
              <span className="text-xs sm:text-sm ml-1">({synergyBonus > 0 ? '+' : ''}{synergyBonus})</span>
            )}
          </div>
          <div className="text-[10px] sm:text-xs text-white/40 mt-1">Synergy ELO</div>
        </div>
        <div className="bg-black border border-white/[0.06] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-white">{draftGrade?.optimalPicks || 0}/{draftGrade?.totalDecisions || 0}</div>
          <div className="text-[10px] sm:text-xs text-white/40 mt-1">Optimal Picks</div>
        </div>
        <div className="bg-black border border-white/[0.06] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-white">{picks.length}</div>
          <div className="text-[10px] sm:text-xs text-white/40 mt-1">Total Cards</div>
        </div>
        {/* Mana Curve - Full width on mobile */}
        <div className="col-span-2 bg-black border border-white/[0.06] rounded-xl p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs text-white/40 mb-2 text-center">Mana Curve</div>
          <div className="flex items-end justify-center gap-1.5 sm:gap-2 h-10 sm:h-8">
            {curveData.map((count, cmc) => (
              <div key={cmc} className="flex flex-col items-center">
                <div
                  className="w-4 sm:w-3 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                  style={{ height: `${(count / maxCurve) * 32}px`, minHeight: count > 0 ? '4px' : '0' }}
                />
                <span className="text-[9px] sm:text-[8px] text-white/30 mt-0.5">{cmc === 7 ? '7+' : cmc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decision Analysis - Stacked on mobile */}
      {draftGrade && (draftGrade.worstPicks.length > 0 || draftGrade.bestPicks.length > 0) && (
        <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
          {/* Missed Opportunities */}
          {draftGrade.worstPicks.length > 0 && (
            <div className="bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/10 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <XCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-xs sm:text-sm font-medium text-red-400">Missed Opportunities</h3>
              </div>
              <div className="space-y-2">
                {draftGrade.worstPicks.map((decision, i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 bg-white/[0.02] rounded-lg">
                    <div className="w-7 h-10 sm:w-8 sm:h-11 rounded overflow-hidden flex-shrink-0">
                      <img src={getCardImage(decision.pick)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] sm:text-xs text-white/60 truncate">Picked: {decision.pick.name}</div>
                      <div className="text-[10px] text-red-400 truncate">
                        Better: {decision.bestAvailable.name}
                      </div>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-white/30 flex-shrink-0">P{decision.packNumber}P{decision.pickNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Great Picks */}
          {draftGrade.bestPicks.length > 0 && (
            <div className="bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <h3 className="text-xs sm:text-sm font-medium text-green-400">Great Picks</h3>
              </div>
              <div className="space-y-2">
                {draftGrade.bestPicks.map((decision, i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 bg-white/[0.02] rounded-lg">
                    <div className="w-7 h-10 sm:w-8 sm:h-11 rounded overflow-hidden flex-shrink-0">
                      <img src={getCardImage(decision.pick)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] sm:text-xs text-white/80 truncate">{decision.pick.name}</div>
                      <div className="text-[10px] text-green-400">
                        Best from {decision.packContents.length} cards
                      </div>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-white/30 flex-shrink-0">P{decision.packNumber}P{decision.pickNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Pool */}
      <div>
        <h3 className="text-[10px] sm:text-xs font-medium text-white/40 uppercase tracking-wide mb-2 sm:mb-3">Your Pool ({picks.length} cards)</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-1.5 sm:gap-2">
          {picks.map((card, idx) => {
            const decision = draftState.decisions[idx];
            const wasOptimal = decision?.wasOptimal;

            return (
              <div
                key={`${card.id}-${idx}`}
                className={`relative aspect-[488/680] rounded-lg sm:rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform ${
                  wasOptimal === false ? 'ring-2 ring-red-400/30' : ''
                }`}
                onMouseEnter={() => onHoverCard(card)}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                {wasOptimal === false && (
                  <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500/80 flex items-center justify-center">
                    <XCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
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
