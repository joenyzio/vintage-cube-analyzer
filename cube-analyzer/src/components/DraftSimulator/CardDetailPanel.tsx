/**
 * Card Detail Panel Component
 *
 * Desktop sidebar showing detailed card information, ELO rating,
 * simulation data, and rating trend sparkline.
 */

// React is used for JSX
import type { CubeCard } from '../../types/card';
import type { CardEloHistory, ContextualGrade } from '../../types/draftSimulator';
import { getCardImage } from '../../services/scryfall';
import { getEloData, getWheelLikelihood } from '../../services/eloHelpers';
import { getConditionalValue } from '../../services/cardRating/archetypeAffinity';
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
}

export function CardDetailPanel({
  card,
  picks,
  cardEloHistory,
  getGrade,
  getSynergyData,
}: CardDetailPanelProps) {
  const eloData = getEloData(card.name);
  const wheelLikelihood = getWheelLikelihood(card.name);
  const synergyData = getSynergyData(card);
  const hasAdjustment = synergyData && Math.abs(synergyData.adjustment) >= 10;
  const cardGrade = getGrade(card);

  return (
    <div className="w-[300px] flex-shrink-0 hidden lg:flex flex-col bg-white/[0.02] border-l border-white/[0.08]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Card Image */}
        <img src={getCardImage(card)} alt={card.name} className="w-full rounded-lg shadow-lg" />

        {/* Name & Grade */}
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-white truncate pr-2">{card.name}</div>
          <span className={`text-lg font-bold flex-shrink-0 ${getGradeColor(cardGrade.grade)}`}>
            {cardGrade.grade}
          </span>
        </div>

        {/* Type Line */}
        <div className="text-sm text-white/50">{card.type_line?.split('—')[0]}</div>

        {/* Conditional Value Badge */}
        <ConditionalValueBadge cardName={card.name} poolCardNames={picks.map(p => p.name)} />

        {/* ELO & Stats Section */}
        {eloData && (
          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
            {/* Grade reason */}
            <div className="text-xs text-white/50 italic">{cardGrade.reason}</div>

            {/* ELO Section */}
            <div className="bg-white/[0.04] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-wider">ELO Rating</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  wheelLikelihood === 'likely' ? 'bg-white/5 text-white/50' :
                  wheelLikelihood === 'maybe' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/15 text-red-400'
                }`}>
                  {wheelLikelihood === 'likely' ? 'Likely wheels' :
                   wheelLikelihood === 'maybe' ? 'May wheel' :
                   'Take now'}
                </span>
              </div>
              {hasAdjustment ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl text-white/50 font-mono">
                    {Math.round(eloData.elo)}
                  </span>
                  <span className={`text-lg font-bold ${
                    synergyData.adjustment > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {synergyData.adjustment > 0 ? '+' : ''}{synergyData.adjustment}
                  </span>
                  <span className="text-white/30">→</span>
                  <span className="text-2xl font-bold text-white font-mono">
                    {Math.round(synergyData.adjustedElo)}
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-white font-mono">
                  {Math.round(eloData.elo)}
                </div>
              )}
            </div>

            {/* Adjustment Reasons */}
            {hasAdjustment && synergyData.reasons.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-white/40 uppercase tracking-wider">Why this adjustment:</div>
                <div className="flex flex-wrap gap-1.5">
                  {synergyData.reasons.map((reason, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded font-medium ${
                      reason.startsWith('+') ? 'bg-emerald-500/15 text-emerald-400' :
                      reason.startsWith('-') ? 'bg-red-500/15 text-red-400' :
                      'bg-white/5 text-white/60'
                    }`}>
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Insights */}
            <SimulationInsights card={card} />

            {/* Rating Trend Sparkline */}
            <RatingTrendSparkline
              cardId={card.id}
              cardEloHistory={cardEloHistory}
              totalPicks={picks.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SimulationInsights({ card }: { card: CubeCard }) {
  const simStats = getCardSimStats(card.name);
  if (!simStats) return null;

  const wheelRate = getWheelRate(card.name);
  const avgPick = getAvgPickPosition(card.name);
  const wheelCategory = getWheelCategory(card.name);
  const topArchetypes = getTopArchetypesForCard(card.name, 3);
  const insight = getCardInsightSummary(card.name);

  return (
    <div className="space-y-2 pt-2 border-t border-white/[0.08]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wider">Simulation Data</span>
        <span className="text-[10px] text-white/30">500 drafts</span>
      </div>

      {/* Key insight callout */}
      {insight && (
        <div className={`text-xs px-2 py-1.5 rounded font-medium ${
          wheelCategory === 'high-wheel' ? 'bg-cyan-500/15 text-cyan-400' :
          wheelCategory === 'low-wheel' ? 'bg-orange-500/15 text-orange-400' :
          'bg-white/5 text-white/60'
        }`}>
          {insight}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/[0.03] rounded px-2 py-1.5">
          <div className="text-white/40">Avg Pick</div>
          <div className="text-white font-mono font-medium">
            {avgPick ? `#${Math.round(avgPick)}` : 'N/A'}
          </div>
        </div>
        <div className="bg-white/[0.03] rounded px-2 py-1.5">
          <div className="text-white/40">Wheel Rate</div>
          <div className={`font-mono font-medium ${
            wheelCategory === 'high-wheel' ? 'text-cyan-400' :
            wheelCategory === 'low-wheel' ? 'text-orange-400' :
            'text-white'
          }`}>
            {wheelRate !== null ? `${Math.round(wheelRate)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Top archetypes */}
      {topArchetypes.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-white/40">Most picked by:</div>
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
        </div>
      )}
    </div>
  );
}

interface RatingTrendSparklineProps {
  cardId: string;
  cardEloHistory: Map<string, CardEloHistory>;
  totalPicks: number;
}

function RatingTrendSparkline({ cardId, cardEloHistory, totalPicks }: RatingTrendSparklineProps) {
  const history = cardEloHistory.get(cardId);
  const historyPoints = history?.history || [];

  if (!historyPoints || historyPoints.length === 0) {
    return (
      <div className="pt-2 border-t border-white/[0.06]">
        <div className="text-[10px] text-white/30">No trajectory data yet</div>
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
  // Show projection when there's any meaningful velocity (lowered threshold)
  const showProjection = points.length > 1 && projectPicks > 0 && Math.abs(velocity) > 0;

  // Momentum classification
  const momentum = velocity > 8 ? 'rising-fast' :
                   velocity > 3 ? 'rising' :
                   velocity < -8 ? 'falling-fast' :
                   velocity < -3 ? 'falling' : 'stable';

  // Calculate range including projection
  const allValues = [...points.map(p => p.adjustedElo), ...(showProjection ? [projectedElo] : [])];
  const minElo = Math.min(...allValues) - 20;
  const maxElo = Math.max(...allValues) + 20;
  const range = maxElo - minElo || 100;
  const width = 260;
  const height = 40;
  const historyWidth = showProjection ? width * 0.8 : width;

  const trendColor = points.length === 1 ? '#9ca3af' : (trend >= 0 ? '#4ade80' : '#f87171');

  return (
    <div className="pt-2 mt-2 border-t border-white/[0.08]">
      {/* Header with momentum indicator */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">Trajectory</span>
          {momentum === 'rising-fast' && <span className="text-xs">🚀</span>}
          {momentum === 'falling-fast' && <span className="text-xs">📉</span>}
        </div>
        <div className="flex items-center gap-2">
          {points.length > 1 ? (
            <>
              {/* Current adjusted ELO */}
              <span className="text-xs font-bold text-white">
                {Math.round(currentElo)}
              </span>
              {/* Projection */}
              {showProjection && Math.abs(velocity) > 1 && (
                <span className={`text-xs ${velocity > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                  → {Math.round(projectedElo)}
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-white/30">baseline</span>
          )}
        </div>
      </div>

      {/* Sparkline SVG */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10">
        {/* Projection line (dashed) */}
        {showProjection && (
          <line
            x1={historyWidth}
            y1={height - ((currentElo - minElo) / range) * (height - 8) - 4}
            x2={width - 4}
            y2={height - ((projectedElo - minElo) / range) * (height - 8) - 4}
            stroke={trendColor}
            strokeWidth="1.5"
            strokeDasharray="4,4"
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
      {points.length > 1 && Math.abs(velocity) > 3 && (
        <div className={`text-[10px] ${velocity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {velocity > 0 ? '↑' : '↓'} {Math.abs(Math.round(velocity))} ELO/pick
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Conditional Value Badge
// =============================================================================

function ConditionalValueBadge({ cardName, poolCardNames }: { cardName: string; poolCardNames: string[] }) {
  const cv = getConditionalValue(cardName, poolCardNames);

  if (!cv.hasConditionalValue) return null;

  return (
    <div className={`mt-1 px-2 py-1 rounded text-xs inline-flex items-center gap-1.5 ${
      cv.isArchetypeDefining
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        : 'bg-purple-500/15 text-purple-300'
    }`}>
      {cv.isArchetypeDefining && (
        <span className="text-amber-400 font-bold">★</span>
      )}
      <span>{cv.inArchetypeValue}-tier in {cv.archetypeName}</span>
      {cv.poolSupportCount > 0 && !cv.isArchetypeDefining && (
        <span className="text-white/40">({cv.poolSupportCount} cards)</span>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getGradeColor(grade: ContextualGrade): string {
  if (grade === 'A+') return 'text-emerald-400';
  if (grade === 'A') return 'text-emerald-500';
  if (grade === 'A-') return 'text-emerald-600';
  if (grade === 'B+') return 'text-sky-400';
  if (grade === 'B') return 'text-sky-500';
  if (grade === 'B-') return 'text-sky-600';
  return 'text-white/60';
}
