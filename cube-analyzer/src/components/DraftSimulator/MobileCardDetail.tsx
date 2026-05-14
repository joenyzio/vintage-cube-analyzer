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

  // Calculate grade
  const grade = getGrade(percentile);

  // Calculate synergy adjustment (simplified)
  const baseElo = eloData?.elo || 1500;
  const adjustment = historyPoints.length > 0
    ? historyPoints[historyPoints.length - 1].adjustment
    : 0;
  const hasAdjustment = Math.abs(adjustment) >= 10;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[85vh]">
        {/* Drag handle */}
        <div className="flex justify-center py-2 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="flex gap-4">
            {/* Card Image */}
            <div className="w-28 flex-shrink-0">
              <img
                src={getCardImage(card)}
                alt={card.name}
                className="w-full rounded-lg shadow-xl"
              />
            </div>

            {/* Card Info */}
            <div className="flex-1 min-w-0 py-1">
              {/* Name + Grade */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold text-white leading-tight">
                  {card.name}
                </h3>
                <span className={`text-lg font-bold flex-shrink-0 ${getGradeColor(grade)}`}>
                  {grade}
                </span>
              </div>

              {/* ELO Rating */}
              {eloData && (
                <div className="mb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white font-mono">
                      {Math.round(baseElo)}
                    </span>
                    {hasAdjustment && (
                      <span className={`text-sm font-bold ${adjustment > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {adjustment > 0 ? '+' : ''}{adjustment}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">ELO Rating</div>
                </div>
              )}

              {/* Simulation Data */}
              <div className="mt-3 pt-2 border-t border-white/10 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded px-2 py-1.5">
                    <div className="text-white/40 text-[10px]">Avg Pick</div>
                    <div className="text-white font-mono font-medium">
                      {avgPick ? `#${Math.round(avgPick)}` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded px-2 py-1.5">
                    <div className="text-white/40 text-[10px]">Wheel Rate</div>
                    <div className="text-white font-mono font-medium">
                      {wheelRate !== null ? `${Math.round(wheelRate)}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Top Archetypes */}
                {topArchetypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {topArchetypes.map(arch => (
                      <span
                        key={arch.archetypeId}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60"
                      >
                        {arch.archetypeId} ({Math.round(arch.percentage)}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating Trend Sparkline */}
              <RatingTrendSparkline historyPoints={historyPoints} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 pb-8 border-t border-white/10 bg-black">
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
}

function RatingTrendSparkline({ historyPoints }: RatingTrendSparklineProps) {
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

  // For sparkline rendering - add padding to prevent flat lines
  const allElos = points.map(p => p.adjustedElo);
  const minElo = Math.min(...allElos) - 50;
  const maxElo = Math.max(...allElos) + 50;
  const range = maxElo - minElo || 100;
  const width = 180;
  const height = 32;

  const trendColor = points.length === 1 ? '#9ca3af' : (trend >= 0 ? '#4ade80' : '#f87171');

  return (
    <div className="mt-3 pt-2 border-t border-white/10">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/40">Rating Trend</span>
        {points.length > 1 ? (
          <span className={`text-xs font-bold ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/40'}`}>
            {trend > 0 ? '+' : ''}{Math.round(trend)}
          </span>
        ) : (
          <span className="text-[10px] text-white/30">baseline</span>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8">
        {/* Line - only if more than 1 point */}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke={trendColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.map((p, i) => {
              const x = (i / (points.length - 1)) * width;
              const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
              return `${x},${y}`;
            }).join(' ')}
          />
        )}

        {/* Dots */}
        {points.map((p, i) => {
          const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
          const y = height - ((p.adjustedElo - minElo) / range) * (height - 8) - 4;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={trendColor}
            />
          );
        })}
      </svg>

      {/* Velocity indicator */}
      {points.length > 1 && Math.abs(velocity) > 3 && (
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
