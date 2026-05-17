/**
 * Card Detail Panel Component
 *
 * Desktop sidebar and mobile drawer showing card information.
 * Redesigned for quick scannability while preserving all data.
 */

import type { CubeCard } from '../../types/card';
import type { CardEloHistory, ContextualGrade } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';
import { getEloData, getWheelLikelihood } from '../../services/eloHelpers';
import { getConditionalValue } from '../../services/cardRating/archetypeAffinity';
import { getFloorCeiling, getArchetypeWeightedRating, type DraftMode } from '../../services/cardRating/archetypeMode';
import {
  getCardSimStats,
  getWheelRate,
  getWheelCategory,
  getAvgPickPosition,
  getTopArchetypesForCard,
  getCardInsightSummary,
} from '../../services/simulationInsights';

interface CardDetailPanelProps {
  card: CubeCard;
  picks: CubeCard[];
  cardEloHistory: Map<string, CardEloHistory>;
  getGrade: (card: CubeCard) => { grade: ContextualGrade; reason: string };
  getSynergyData: (card: CubeCard) => { adjustedElo: number; adjustment: number; reasons: string[] };
  draftMode?: DraftMode;
  selectedArchetype?: string | null;
}

export function CardDetailPanel({
  card,
  picks,
  cardEloHistory,
  getGrade,
  getSynergyData,
  draftMode = 'open',
  selectedArchetype = null,
}: CardDetailPanelProps) {
  const eloData = getEloData(card.name);
  const wheelLikelihood = getWheelLikelihood(card.name);
  const synergyData = getSynergyData(card);
  const hasAdjustment = synergyData && Math.abs(synergyData.adjustment) >= 10;
  const cardGrade = getGrade(card);
  const cv = getConditionalValue(card.name, picks.map(p => p.name));

  // Floor/Ceiling data
  const floorCeiling = getFloorCeiling(card.name);

  // Archetype-specific rating (when committed or leaning)
  const archetypeRating = selectedArchetype
    ? getArchetypeWeightedRating(card.name, selectedArchetype)
    : null;

  return (
    <div className="w-[300px] flex-shrink-0 hidden lg:flex flex-col bg-white/[0.02] border-l border-white/[0.08]">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Card Image */}
        <img src={getCardImage(card)} alt={card.name} className="w-full rounded-lg shadow-lg" />

        {/* Header: Name + Grade + Type */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white truncate">{card.name}</h2>
            <span className={`text-lg font-bold flex-shrink-0 ${getGradeColor(cardGrade.grade)}`}>
              {cardGrade.grade}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span>{card.type_line?.split('—')[0]?.trim()}</span>
            {cardGrade.reason && cardGrade.reason !== 'Raw power' && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-white/50">{cardGrade.reason}</span>
              </>
            )}
          </div>
        </div>

        {/* Conditional Value Badge - only shows when relevant */}
        {cv.hasConditionalValue && (
          <div className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${
            cv.isArchetypeDefining
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-purple-500/10 text-purple-300'
          }`}>
            {cv.isArchetypeDefining && <span className="text-amber-400">★</span>}
            <span>{cv.inArchetypeValue}-tier in {cv.archetypeName}</span>
            {cv.poolSupportCount > 0 && !cv.isArchetypeDefining && (
              <span className="text-white/30 font-normal">· {cv.poolSupportCount} cards</span>
            )}
          </div>
        )}

        {/* Main Rating Block */}
        {eloData && (
          <div className="bg-white/[0.03] rounded-lg p-3 space-y-2">
            {/* ELO + Verdict */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                {/* Show archetype-adjusted ELO when committed/leaning */}
                {archetypeRating && draftMode !== 'open' ? (
                  <>
                    <span className="text-2xl font-bold text-white font-mono">
                      {Math.round(archetypeRating.adjustedElo)}
                    </span>
                    <span className={`text-sm font-semibold ${
                      archetypeRating.boost > 0 ? 'text-emerald-400' :
                      archetypeRating.boost < 0 ? 'text-red-400' : 'text-white/40'
                    }`}>
                      {archetypeRating.boost > 0 ? '+' : ''}{archetypeRating.boost}
                    </span>
                    <span className="text-[10px] text-white/30 ml-1">
                      (base: {Math.round(eloData.elo)})
                    </span>
                  </>
                ) : hasAdjustment ? (
                  <>
                    <span className="text-2xl font-bold text-white font-mono">
                      {Math.round(synergyData.adjustedElo)}
                    </span>
                    <span className={`text-sm font-semibold ${
                      synergyData.adjustment > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {synergyData.adjustment > 0 ? '+' : ''}{synergyData.adjustment}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-white font-mono">
                    {Math.round(eloData.elo)}
                  </span>
                )}
              </div>
              <WheelBadge likelihood={wheelLikelihood} />
            </div>

            {/* Archetype Tier Badge (when in archetype mode) */}
            {archetypeRating && draftMode !== 'open' && archetypeRating.tier && (
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                archetypeRating.isArchetypeDefining
                  ? 'bg-amber-500/15 text-amber-300'
                  : archetypeRating.tier === 'S' ? 'bg-purple-500/15 text-purple-300'
                  : archetypeRating.tier === 'A' ? 'bg-blue-500/15 text-blue-300'
                  : 'bg-white/5 text-white/60'
              }`}>
                {archetypeRating.isArchetypeDefining && <span className="text-amber-400">*</span>}
                {archetypeRating.tier}-tier in {archetypeRating.archetypeName}
                {archetypeRating.role && (
                  <span className="text-white/30 font-normal">({archetypeRating.role})</span>
                )}
              </div>
            )}

            {/* Synergy Reasons - inline, compact */}
            {hasAdjustment && synergyData.reasons.length > 0 && draftMode === 'open' && (
              <div className="flex flex-wrap gap-1">
                {synergyData.reasons.map((reason, i) => (
                  <span key={i} className={`text-[11px] px-1.5 py-0.5 rounded ${
                    reason.startsWith('+') ? 'text-emerald-400/90 bg-emerald-500/10' :
                    reason.startsWith('-') ? 'text-red-400/90 bg-red-500/10' :
                    'text-white/50 bg-white/5'
                  }`}>
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Floor/Ceiling Spread - shows build-around potential */}
        {floorCeiling.spread > 100 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Floor / Ceiling</span>
              {floorCeiling.isHighVariance && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
                  Build-Around
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Floor */}
              <div className="flex-1">
                <div className="text-xs text-red-400/70 font-mono">{floorCeiling.floor.elo}</div>
                <div className="text-[10px] text-white/30 truncate">{floorCeiling.floor.archetype}</div>
              </div>
              {/* Visual bar */}
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/30 to-emerald-500/30 rounded-full"
                  style={{ width: '100%' }}
                />
                <div
                  className="absolute inset-y-0 bg-white/20 rounded-full"
                  style={{
                    left: `${((floorCeiling.baseElo - floorCeiling.floor.elo) / floorCeiling.spread) * 100}%`,
                    width: '4px',
                  }}
                />
              </div>
              {/* Ceiling */}
              <div className="flex-1 text-right">
                <div className="text-xs text-emerald-400/70 font-mono">{floorCeiling.ceiling.elo}</div>
                <div className="text-[10px] text-white/30 truncate">{floorCeiling.ceiling.archetype}</div>
              </div>
            </div>
            {floorCeiling.ceiling.tier && (
              <div className="text-[10px] text-white/40">
                {floorCeiling.ceiling.tier}-tier in {floorCeiling.ceiling.archetype}
              </div>
            )}
          </div>
        )}

        {/* Simulation Stats - compact row */}
        <SimulationStats card={card} />

        {/* Trajectory Sparkline */}
        <TrajectoryChart
          cardId={card.id}
          cardEloHistory={cardEloHistory}
          totalPicks={picks.length}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Wheel Badge - The key decision signal
// =============================================================================

function WheelBadge({ likelihood }: { likelihood: 'likely' | 'maybe' | 'unlikely' }) {
  if (likelihood === 'likely') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-white/5 text-white/50 font-medium">
        Will wheel
      </span>
    );
  }
  if (likelihood === 'maybe') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-400 font-medium">
        May wheel
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 font-medium">
      Take now
    </span>
  );
}

// =============================================================================
// Simulation Stats - Compact horizontal layout
// =============================================================================

function SimulationStats({ card }: { card: CubeCard }) {
  const simStats = getCardSimStats(card.name);
  if (!simStats) return null;

  const wheelRate = getWheelRate(card.name);
  const avgPick = getAvgPickPosition(card.name);
  const wheelCategory = getWheelCategory(card.name);
  const topArchetypes = getTopArchetypesForCard(card.name, 3);
  const insight = getCardInsightSummary(card.name);

  return (
    <div className="space-y-2">
      {/* Insight callout - only if actionable */}
      {insight && (
        <div className={`text-xs px-2.5 py-1.5 rounded-md ${
          wheelCategory === 'high-wheel' ? 'bg-sky-500/10 text-sky-400' :
          wheelCategory === 'low-wheel' ? 'bg-orange-500/10 text-orange-400' :
          'bg-white/5 text-white/60'
        }`}>
          {insight}
        </div>
      )}

      {/* Stats row - minimal labels */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-white/30">Pick</span>
          <span className="text-white font-mono font-medium">
            #{avgPick ? Math.round(avgPick) : '—'}
          </span>
        </div>
        <span className="text-white/10">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-white/30">Wheels</span>
          <span className={`font-mono font-medium ${
            wheelCategory === 'high-wheel' ? 'text-sky-400' :
            wheelCategory === 'low-wheel' ? 'text-orange-400' :
            'text-white'
          }`}>
            {wheelRate !== null ? `${Math.round(wheelRate)}%` : '—'}
          </span>
        </div>
        <span className="text-white/10">|</span>
        <span className="text-[10px] text-white/25">500 sims</span>
      </div>

      {/* Archetypes - subtle */}
      {topArchetypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topArchetypes.map(arch => (
            <span
              key={arch.archetypeId}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/40"
            >
              {arch.archetypeId} {Math.round(arch.percentage)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Trajectory Chart - Compact sparkline
// =============================================================================

interface TrajectoryChartProps {
  cardId: string;
  cardEloHistory: Map<string, CardEloHistory>;
  totalPicks: number;
}

function TrajectoryChart({ cardId, cardEloHistory, totalPicks }: TrajectoryChartProps) {
  const history = cardEloHistory.get(cardId);
  const points = history?.history || [];

  // Only show when there's actual trend data (2+ points)
  if (points.length < 2) return null;

  const currentElo = points[points.length - 1].adjustedElo;
  const startElo = points[0].adjustedElo;
  const trend = currentElo - startElo;
  const velocity = points.length > 1 ? trend / (points.length - 1) : 0;

  const remainingPicks = Math.max(0, 45 - totalPicks);
  const projectPicks = Math.min(5, remainingPicks);
  const projectedElo = currentElo + (velocity * projectPicks);
  const showProjection = points.length > 1 && projectPicks > 0 && Math.abs(velocity) > 0;

  const allValues = [...points.map(p => p.adjustedElo), ...(showProjection ? [projectedElo] : [])];
  const minElo = Math.min(...allValues) - 20;
  const maxElo = Math.max(...allValues) + 20;
  const range = maxElo - minElo || 100;
  const width = 260;
  const height = 32;
  const historyWidth = showProjection ? width * 0.8 : width;

  const trendColor = points.length === 1 ? '#6b7280' : (trend >= 0 ? '#4ade80' : '#f87171');

  return (
    <div className="pt-2 border-t border-white/[0.05]">
      {/* Header */}
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

      {/* Sparkline */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8">
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

      {/* Velocity - only if significant */}
      {points.length > 1 && Math.abs(velocity) > 5 && (
        <div className={`text-[10px] ${velocity > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
          {velocity > 0 ? '↑' : '↓'} {Math.abs(Math.round(velocity))}/pick
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getGradeColor(grade: ContextualGrade): string {
  if (grade === 'A+') return 'text-emerald-400';
  if (grade === 'A') return 'text-emerald-400';
  if (grade === 'A-') return 'text-emerald-500';
  if (grade === 'B+') return 'text-sky-400';
  if (grade === 'B') return 'text-sky-400';
  if (grade === 'B-') return 'text-sky-500';
  if (grade === 'C+') return 'text-white/60';
  if (grade === 'C') return 'text-white/50';
  return 'text-white/40';
}
