/**
 * Mobile Card Detail Component
 *
 * Shows detailed card information in a mobile-friendly drawer.
 * Includes ELO rating, synergy adjustments, simulation data, and rating trend sparkline.
 */

// React is used for JSX
import type { CubeCard } from '../../types/card';
import type { CardEloHistory, ContextualGrade } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';
import { getEloData, getPercentile } from '../../services/eloHelpers';
import {
  getWheelRate,
  getAvgPickPosition,
  getTopArchetypesForCard,
} from '../../services/simulationInsights';

interface MobileCardDetailProps {
  card: CubeCard;
  picks: CubeCard[];
  isInDeck: boolean;
  cardEloHistory: Map<string, CardEloHistory>;
  onClose: () => void;
  onPick?: () => void;
  onBackToDeck?: () => void;
}

export function MobileCardDetail({
  card,
  picks: _picks,
  isInDeck,
  cardEloHistory,
  onClose,
  onPick,
  onBackToDeck,
}: MobileCardDetailProps) {
  const eloData = getEloData(card.name);
  const percentile = getPercentile(card.name);
  const wheelRate = getWheelRate(card.name);
  const avgPick = getAvgPickPosition(card.name);
  const topArchetypes = getTopArchetypesForCard(card.name, 2);

  // Get history for sparkline
  const history = cardEloHistory.get(card.id);
  const historyPoints = history?.history || [];

  // Calculate synergy adjustment
  const baseElo = eloData?.elo || 1500;
  const adjustment = historyPoints.length > 0
    ? historyPoints[historyPoints.length - 1].adjustment
    : 0;
  const adjustedElo = baseElo + adjustment;
  const hasAdjustment = Math.abs(adjustment) >= 10;

  // Calculate grade based on ADJUSTED ELO, not base
  // Map adjusted ELO to a percentile-like scale (1300-2000 range)
  const adjustedPercentile = hasAdjustment
    ? Math.min(100, Math.max(0, ((adjustedElo - 1300) / 700) * 100))
    : percentile;
  const grade = getGrade(adjustedPercentile);

  return (
    <div className="fixed inset-0 z-[70] sm:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer - taller to show bigger card */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[92vh]">
        {/* Drag handle */}
        <div className="flex justify-center py-2 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Content - Card on top, details below */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {/* Large Card Image */}
          <div className="flex justify-center mb-3">
            <img
              src={getCardImage(card)}
              alt={card.name}
              className="w-56 rounded-xl shadow-2xl"
            />
          </div>

          {/* Card Info */}
          <div className="space-y-3">
            {/* Name + Grade Row */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {card.name}
              </h3>
              <span className={`text-xl font-bold ${getGradeColor(grade)}`}>
                {grade}
              </span>
            </div>

            {/* ELO Rating */}
            {eloData && (
              <div className="bg-white/5 rounded-xl p-3">
                {hasAdjustment ? (
                  <>
                    {/* Base → Adjusted with clear visual flow */}
                    <div className="flex items-baseline gap-2 justify-center">
                      <span className="text-xl text-white/50 font-mono">
                        {Math.round(baseElo)}
                      </span>
                      <span className={`text-lg font-bold ${adjustment > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {adjustment > 0 ? '+' : ''}{adjustment}
                      </span>
                      <span className="text-white/30">→</span>
                      <span className="text-3xl font-bold text-white font-mono">
                        {Math.round(adjustedElo)}
                      </span>
                    </div>
                    {/* Archetype synergy tags */}
                    {topArchetypes.length > 0 && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        {topArchetypes.map(arch => (
                          <span
                            key={arch.archetypeId}
                            className={`text-xs px-2 py-1 rounded-lg font-medium ${
                              adjustment > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {arch.archetypeId}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white font-mono">
                      {Math.round(baseElo)}
                    </div>
                    <div className="text-xs text-white/40 mt-1">ELO Rating</div>
                  </div>
                )}
              </div>
            )}

            {/* Stats Row */}
            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-white font-mono font-bold">#{avgPick ? Math.round(avgPick) : '—'}</div>
                <div className="text-[10px] text-white/40">Avg Pick</div>
              </div>
              <div className="text-center">
                <div className="text-white font-mono font-bold">{wheelRate !== null ? `${Math.round(wheelRate)}%` : '—'}</div>
                <div className="text-[10px] text-white/40">Wheel Rate</div>
              </div>
            </div>

            {/* Rating Trend Sparkline */}
            <RatingTrendSparkline historyPoints={historyPoints} totalPicks={historyPoints.length > 0 ? historyPoints[historyPoints.length - 1].pick : 0} />
          </div>
        </div>

        {/* Action Buttons - pb-24 to clear mobile bottom nav */}
        <div className="flex gap-3 p-4 pb-24 border-t border-white/10 bg-black">
          {isInDeck ? (
            <button
              onClick={onBackToDeck}
              className="flex-1 py-4 px-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
            >
              Back to Deck
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-4 px-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
              >
                Back
              </button>
              {onPick && (
                <button
                  onClick={onPick}
                  className="flex-1 py-4 px-4 bg-white text-black rounded-xl font-bold active:scale-95 transition-transform"
                >
                  Pick This Card
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Rating Trend Sparkline Sub-component
// =============================================================================

interface RatingTrendSparklineProps {
  historyPoints: { pick: number; adjustedElo: number; adjustment: number }[];
  totalPicks: number;
}

function RatingTrendSparkline({ historyPoints, totalPicks }: RatingTrendSparklineProps) {
  // Always show sparkline if we have at least 1 point
  if (!historyPoints || historyPoints.length === 0) {
    return (
      <div className="mt-3 pt-2 border-t border-white/10">
        <div className="text-[10px] text-white/30">No rating data yet</div>
      </div>
    );
  }

  const points = historyPoints;
  const currentElo = points[points.length - 1].adjustedElo;
  const startElo = points[0].adjustedElo;
  const trend = currentElo - startElo;
  const velocity = points.length > 1 ? trend / (points.length - 1) : 0;

  // Project forward based on velocity
  const remainingPicks = Math.max(0, 45 - totalPicks);
  const projectPicks = Math.min(5, remainingPicks);
  const projectedElo = currentElo + (velocity * projectPicks);
  const showProjection = points.length > 1 && projectPicks > 0 && Math.abs(velocity) > 0;

  // Momentum classification
  const momentum = velocity > 8 ? 'rising-fast' :
                   velocity > 3 ? 'rising' :
                   velocity < -8 ? 'falling-fast' :
                   velocity < -3 ? 'falling' : 'stable';

  // For sparkline rendering - include projection in range calculation
  const allElos = [...points.map(p => p.adjustedElo), ...(showProjection ? [projectedElo] : [])];
  const minElo = Math.min(...allElos) - 30;
  const maxElo = Math.max(...allElos) + 30;
  const range = maxElo - minElo || 100;
  const width = 180;
  const height = 32;
  const historyWidth = showProjection ? width * 0.75 : width;

  const trendColor = points.length === 1 ? '#9ca3af' : (trend >= 0 ? '#4ade80' : '#f87171');

  return (
    <div className="mt-3 pt-2 border-t border-white/10">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">Trend</span>
          {momentum === 'rising-fast' && <span className="text-xs">🚀</span>}
          {momentum === 'rising' && <span className="text-xs">📈</span>}
          {momentum === 'falling-fast' && <span className="text-xs">📉</span>}
          {momentum === 'falling' && <span className="text-xs">📉</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {points.length > 1 && showProjection && Math.abs(velocity) > 1 ? (
            <span className={`text-xs font-medium ${velocity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              → {Math.round(projectedElo)} in 5 picks
            </span>
          ) : points.length > 1 ? (
            <span className="text-[10px] text-white/40">stable</span>
          ) : (
            <span className="text-[10px] text-white/30">building...</span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8">
        {/* Projection line (dashed) */}
        {showProjection && (
          <line
            x1={historyWidth}
            y1={height - ((currentElo - minElo) / range) * (height - 8) - 4}
            x2={width - 4}
            y2={height - ((projectedElo - minElo) / range) * (height - 8) - 4}
            stroke={trendColor}
            strokeWidth="1.5"
            strokeDasharray="3,3"
            opacity="0.5"
          />
        )}

        {/* History line */}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke={trendColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.map((p, i) => {
              const x = (i / (points.length - 1)) * historyWidth;
              const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
              return `${x},${y}`;
            }).join(' ')}
          />
        )}

        {/* History dots */}
        {points.map((p, i) => {
          const x = points.length === 1 ? historyWidth / 2 : (i / (points.length - 1)) * historyWidth;
          const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === points.length - 1 ? 4 : 3}
              fill={trendColor}
            />
          );
        })}

        {/* Projected dot */}
        {showProjection && (
          <circle
            cx={width - 4}
            cy={height - ((projectedElo - minElo) / range) * (height - 8) - 4}
            r="3"
            fill={trendColor}
            opacity="0.5"
          />
        )}
      </svg>

      {/* Velocity indicator */}
      {points.length > 1 && Math.abs(velocity) > 2 && (
        <div className={`text-[10px] ${velocity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {velocity > 0 ? '↑' : '↓'} {Math.abs(Math.round(velocity))} ELO/pick
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function getGrade(percentile: number): ContextualGrade {
  if (percentile >= 98) return 'A+';
  if (percentile >= 93) return 'A';
  if (percentile >= 85) return 'A-';
  if (percentile >= 75) return 'B+';
  if (percentile >= 65) return 'B';
  if (percentile >= 55) return 'B-';
  if (percentile >= 45) return 'C+';
  if (percentile >= 35) return 'C';
  if (percentile >= 25) return 'C-';
  if (percentile >= 15) return 'D';
  return 'F';
}

function getGradeColor(grade: ContextualGrade): string {
  if (grade === 'A+') return 'text-emerald-400';
  if (grade === 'A') return 'text-emerald-500';
  if (grade.startsWith('B')) return 'text-sky-400';
  if (grade.startsWith('C')) return 'text-amber-400';
  return 'text-white/40';
}
