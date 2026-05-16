/**
 * Mobile Card Detail Component
 *
 * Bottom drawer showing card information on mobile.
 * Matches desktop panel styling with touch-optimized layout.
 */

import type { CubeCard } from '../../types/card';
import type { CardEloHistory, ContextualGrade } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';
import { getEloData, getPercentile, getWheelLikelihood } from '../../services/eloHelpers';
import { getConditionalValue } from '../../services/cardRating/archetypeAffinity';
import {
  getWheelRate,
  getWheelCategory,
  getAvgPickPosition,
  getTopArchetypesForCard,
  getCardInsightSummary,
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
  picks,
  isInDeck,
  cardEloHistory,
  onClose,
  onPick,
  onBackToDeck,
}: MobileCardDetailProps) {
  const eloData = getEloData(card.name);
  const percentile = getPercentile(card.name);
  const wheelLikelihood = getWheelLikelihood(card.name);
  const wheelRate = getWheelRate(card.name);
  const wheelCategory = getWheelCategory(card.name);
  const avgPick = getAvgPickPosition(card.name);
  const topArchetypes = getTopArchetypesForCard(card.name, 3);
  const insight = getCardInsightSummary(card.name);
  const cv = getConditionalValue(card.name, picks.map(p => p.name));

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

  // Calculate grade based on adjusted ELO
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

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[92vh]">
        {/* Drag handle */}
        <div className="flex justify-center py-2 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {/* Card Image - centered, prominent */}
          <div className="flex justify-center mb-3">
            <img
              src={getCardImage(card)}
              alt={card.name}
              className="w-52 rounded-xl shadow-2xl"
            />
          </div>

          {/* Card Info */}
          <div className="space-y-3">
            {/* Name + Grade */}
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white truncate">{card.name}</h3>
              <span className={`text-xl font-bold flex-shrink-0 ${getGradeColor(grade)}`}>
                {grade}
              </span>
            </div>

            {/* Conditional Value Badge */}
            {cv.hasConditionalValue && (
              <div className={`px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${
                cv.isArchetypeDefining
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-purple-500/10 text-purple-300'
              }`}>
                {cv.isArchetypeDefining && <span className="text-amber-400">★</span>}
                <span>{cv.inArchetypeValue}-tier in {cv.archetypeName}</span>
                {cv.poolSupportCount > 0 && !cv.isArchetypeDefining && (
                  <span className="text-white/30">· {cv.poolSupportCount} cards</span>
                )}
              </div>
            )}

            {/* Main Rating Block */}
            {eloData && (
              <div className="bg-white/5 rounded-xl p-4">
                {/* ELO + Verdict Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    {hasAdjustment ? (
                      <>
                        <span className="text-3xl font-bold text-white font-mono">
                          {Math.round(adjustedElo)}
                        </span>
                        <span className={`text-lg font-semibold ${
                          adjustment > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {adjustment > 0 ? '+' : ''}{adjustment}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-white font-mono">
                        {Math.round(baseElo)}
                      </span>
                    )}
                  </div>
                  <WheelBadge likelihood={wheelLikelihood} />
                </div>

                {/* Synergy tags */}
                {hasAdjustment && topArchetypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {topArchetypes.map(arch => (
                      <span
                        key={arch.archetypeId}
                        className={`text-xs px-2 py-1 rounded-lg ${
                          adjustment > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {arch.archetypeId}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Insight callout */}
            {insight && (
              <div className={`text-sm px-3 py-2 rounded-lg ${
                wheelCategory === 'high-wheel' ? 'bg-sky-500/10 text-sky-400' :
                wheelCategory === 'low-wheel' ? 'bg-orange-500/10 text-orange-400' :
                'bg-white/5 text-white/60'
              }`}>
                {insight}
              </div>
            )}

            {/* Stats Row - horizontal, compact */}
            <div className="flex items-center justify-center gap-6 text-sm py-1">
              <div className="text-center">
                <div className="text-white font-mono font-bold">
                  #{avgPick ? Math.round(avgPick) : '—'}
                </div>
                <div className="text-[10px] text-white/40">Avg Pick</div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <div className={`font-mono font-bold ${
                  wheelCategory === 'high-wheel' ? 'text-sky-400' :
                  wheelCategory === 'low-wheel' ? 'text-orange-400' :
                  'text-white'
                }`}>
                  {wheelRate !== null ? `${Math.round(wheelRate)}%` : '—'}
                </div>
                <div className="text-[10px] text-white/40">Wheels</div>
              </div>
            </div>

            {/* Sparkline */}
            <TrendSparkline historyPoints={historyPoints} totalPicks={picks.length} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 pb-24 border-t border-white/10 bg-black">
          {isInDeck ? (
            <button
              onClick={onBackToDeck}
              className="flex-1 py-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
            >
              Back to Deck
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
              >
                Back
              </button>
              {onPick && (
                <button
                  onClick={onPick}
                  className="flex-1 py-4 bg-white text-black rounded-xl font-bold active:scale-95 transition-transform"
                >
                  Pick Card
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
// Sub-components
// =============================================================================

function WheelBadge({ likelihood }: { likelihood: 'likely' | 'maybe' | 'unlikely' }) {
  if (likelihood === 'likely') {
    return (
      <span className="text-sm px-2.5 py-1 rounded-lg bg-white/5 text-white/50 font-medium">
        Will wheel
      </span>
    );
  }
  if (likelihood === 'maybe') {
    return (
      <span className="text-sm px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 font-medium">
        May wheel
      </span>
    );
  }
  return (
    <span className="text-sm px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 font-medium">
      Take now
    </span>
  );
}

interface TrendSparklineProps {
  historyPoints: { pick: number; adjustedElo: number; adjustment: number }[];
  totalPicks: number;
}

function TrendSparkline({ historyPoints, totalPicks }: TrendSparklineProps) {
  // Only show when there's actual trend data (2+ points)
  if (!historyPoints || historyPoints.length < 2) return null;

  const points = historyPoints;
  const currentElo = points[points.length - 1].adjustedElo;
  const startElo = points[0].adjustedElo;
  const trend = currentElo - startElo;
  const velocity = points.length > 1 ? trend / (points.length - 1) : 0;

  const remainingPicks = Math.max(0, 45 - totalPicks);
  const projectPicks = Math.min(5, remainingPicks);
  const projectedElo = currentElo + (velocity * projectPicks);
  const showProjection = points.length > 1 && projectPicks > 0 && Math.abs(velocity) > 0;

  const allElos = [...points.map(p => p.adjustedElo), ...(showProjection ? [projectedElo] : [])];
  const minElo = Math.min(...allElos) - 30;
  const maxElo = Math.max(...allElos) + 30;
  const range = maxElo - minElo || 100;
  const width = 200;
  const height = 28;
  const historyWidth = showProjection ? width * 0.75 : width;

  const trendColor = points.length === 1 ? '#6b7280' : (trend >= 0 ? '#4ade80' : '#f87171');

  return (
    <div className="pt-2 border-t border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/30">Trend</span>
        {points.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-white font-mono">{Math.round(currentElo)}</span>
            {showProjection && Math.abs(velocity) > 1 && (
              <span className={velocity > 0 ? 'text-emerald-400/60' : 'text-red-400/60'}>
                → {Math.round(projectedElo)}
              </span>
            )}
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-7">
        {showProjection && (
          <line
            x1={historyWidth}
            y1={height - ((currentElo - minElo) / range) * (height - 6) - 3}
            x2={width - 4}
            y2={height - ((projectedElo - minElo) / range) * (height - 6) - 3}
            stroke={trendColor}
            strokeWidth="1.5"
            strokeDasharray="3,3"
            opacity="0.4"
          />
        )}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke={trendColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.map((p, i) => {
              const x = (i / (points.length - 1)) * historyWidth;
              const y = height - ((p.adjustedElo - minElo) / range) * (height - 6) - 3;
              return `${x},${y}`;
            }).join(' ')}
          />
        )}
        {points.map((p, i) => {
          const x = points.length === 1 ? historyWidth / 2 : (i / (points.length - 1)) * historyWidth;
          const y = height - ((p.adjustedElo - minElo) / range) * (height - 6) - 3;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === points.length - 1 ? 3 : 2}
              fill={trendColor}
            />
          );
        })}
      </svg>
    </div>
  );
}

// =============================================================================
// Helpers
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
  return 'C-';
}

function getGradeColor(grade: ContextualGrade): string {
  if (grade === 'A+') return 'text-emerald-400';
  if (grade === 'A') return 'text-emerald-400';
  if (grade === 'A-') return 'text-emerald-500';
  if (grade === 'B+') return 'text-sky-400';
  if (grade === 'B') return 'text-sky-400';
  if (grade === 'B-') return 'text-sky-500';
  return 'text-white/50';
}
