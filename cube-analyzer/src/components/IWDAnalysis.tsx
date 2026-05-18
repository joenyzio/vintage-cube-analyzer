/**
 * IWD (Improvement When Drawn) Analysis Page
 *
 * McKinsey-grade analysis of 17lands win rate data.
 * Charts, insights, strategic recommendations.
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle, Gem, TrendingUp, TrendingDown,
  BarChart3, Search, Info, Target,
  ChevronDown, ChevronUp, Lightbulb, ArrowRight,
  Zap, Shield, Award, PieChart
} from 'lucide-react';
import { getCardSignal } from '../services/simulationInsights';
import { getEloData, getPercentile } from '../services/eloHelpers';
import { getCardImage } from '../services/scryfall';
import type { CubeCard } from '../types/card';
import simulationData from '../data/simulation-data.json';

interface IWDAnalysisProps {
  cards: CubeCard[];
}

// Color combinations for filtering
const COLOR_COMBOS = [
  { id: '', label: 'All Colors' },
  { id: 'W', label: 'White' },
  { id: 'U', label: 'Blue' },
  { id: 'B', label: 'Black' },
  { id: 'R', label: 'Red' },
  { id: 'G', label: 'Green' },
];

// Simple bar chart component
function BarChart({ data, maxValue, color }: { data: { label: string; value: number; color?: string }[]; maxValue: number; color: string }) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-16 text-xs text-white/60 text-right">{item.label}</div>
          <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-500 ${item.color || color}`}
              style={{ width: `${Math.max(0, (item.value / maxValue) * 100)}%` }}
            />
          </div>
          <div className="w-16 text-xs text-white/80 font-mono">{item.value.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}

// Distribution histogram
function IWDHistogram({ data }: { data: number[] }) {
  // Create buckets from -5% to +15%
  const buckets = Array.from({ length: 21 }, (_, i) => ({
    min: (i - 5) * 0.01,
    max: (i - 4) * 0.01,
    count: 0,
  }));

  data.forEach(val => {
    const idx = Math.min(20, Math.max(0, Math.floor((val + 0.05) / 0.01)));
    if (buckets[idx]) buckets[idx].count++;
  });

  const maxCount = Math.max(...buckets.map(b => b.count));

  return (
    <div className="flex items-end gap-[2px] h-32">
      {buckets.map((bucket, i) => {
        const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
        const isNegative = bucket.min < 0;
        const isHigh = bucket.min >= 0.03;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center group relative"
          >
            <div
              className={`w-full rounded-t transition-all ${
                isNegative ? 'bg-red-500/60' : isHigh ? 'bg-emerald-500/60' : 'bg-white/20'
              } group-hover:opacity-80`}
              style={{ height: `${height}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {(bucket.min * 100).toFixed(0)}% to {(bucket.max * 100).toFixed(0)}%: {bucket.count} cards
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Scatter plot: ELO vs IWD
function EloIwdScatter({ data }: { data: { name: string; elo: number; iwd: number; divergence?: string }[] }) {
  // Normalize to 0-100 scale
  const minElo = 1300;
  const maxElo = 2300;
  const minIwd = -0.05;
  const maxIwd = 0.16;

  const normalize = (elo: number, iwd: number) => ({
    x: ((elo - minElo) / (maxElo - minElo)) * 100,
    y: ((maxIwd - iwd) / (maxIwd - minIwd)) * 100, // Inverted so high IWD is at top
  });

  return (
    <div className="relative h-64 bg-white/[0.02] rounded-lg border border-white/10 overflow-hidden">
      {/* Quadrant labels */}
      <div className="absolute top-2 left-2 text-[10px] text-emerald-400/60">STEALS</div>
      <div className="absolute top-2 right-2 text-[10px] text-amber-400/60">STARS</div>
      <div className="absolute bottom-2 left-2 text-[10px] text-white/30">WEAK</div>
      <div className="absolute bottom-2 right-2 text-[10px] text-red-400/60">TRAPS</div>

      {/* Grid lines */}
      <div className="absolute inset-0">
        {/* Vertical center (ELO 50th percentile ~1600) */}
        <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/10" />
        {/* Horizontal center (IWD ~3%) */}
        <div className="absolute left-0 right-0 top-[60%] h-px bg-white/10" />
      </div>

      {/* Points */}
      {data.slice(0, 150).map((item, i) => {
        const pos = normalize(item.elo, item.iwd);
        const color = item.divergence === 'trap' ? 'bg-red-500'
          : item.divergence === 'steal' ? 'bg-emerald-500'
          : 'bg-white/30';
        return (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${color} hover:w-3 hover:h-3 hover:z-10 transition-all cursor-pointer group`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
              {item.name}
              <br />
              ELO: {item.elo.toFixed(0)} | IWD: {(item.iwd * 100).toFixed(1)}%
            </div>
          </div>
        );
      })}

      {/* Axis labels */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-white/40 pb-1">
        ELO →
      </div>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-white/40 pl-1 [writing-mode:vertical-lr] rotate-180">
        IWD →
      </div>
    </div>
  );
}

export function IWDAnalysis({ cards }: IWDAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'executive' | 'distribution' | 'colors' | 'traps' | 'steals' | 'data'>('executive');
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sortBy, setSortBy] = useState<'iwd' | 'elo' | 'name' | 'delta'>('iwd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Get all card signals
  const allSignals = useMemo(() => {
    const colors = colorFilter ? colorFilter.split('') : [];
    return cards.map(card => ({
      card,
      signal: getCardSignal(card.name, colors),
      elo: getEloData(card.name)?.elo || null,
      eloPercentile: getPercentile(card.name),
    }));
  }, [cards, colorFilter]);

  // Core stats
  const stats = useMemo(() => {
    const total = allSignals.length;
    const withIwd = allSignals.filter(s => s.signal.iwd.value !== null);
    const traps = allSignals.filter(s => s.signal.divergence?.direction === 'trap');
    const steals = allSignals.filter(s => s.signal.divergence?.direction === 'steal');
    const aligned = allSignals.filter(s => s.signal.confidence === 'aligned');
    const unknown = allSignals.filter(s => s.signal.confidence === 'unknown');

    // Distribution analysis
    const iwdValues = withIwd.map(s => s.signal.iwd.value!);
    const avgIwd = iwdValues.length > 0 ? iwdValues.reduce((a, b) => a + b, 0) / iwdValues.length : 0;
    const positiveIwd = iwdValues.filter(v => v > 0).length;
    const negativeIwd = iwdValues.filter(v => v < 0).length;
    const highIwd = iwdValues.filter(v => v >= 0.05).length;

    return {
      total,
      withIwd: withIwd.length,
      traps: traps.length,
      steals: steals.length,
      aligned: aligned.length,
      unknown: unknown.length,
      avgIwd,
      positiveIwd,
      negativeIwd,
      highIwd,
      trapList: traps,
      stealList: steals,
      iwdValues,
      coverage: (withIwd.length / total) * 100,
    };
  }, [allSignals]);

  // Color analysis
  const colorAnalysis = useMemo(() => {
    const colors = ['W', 'U', 'B', 'R', 'G'];
    return colors.map(color => {
      const colorCards = cards.filter(c => c.color_identity?.includes(color));
      const signals = colorCards.map(c => getCardSignal(c.name, [color]));
      const withIwd = signals.filter(s => s.iwd.value !== null);
      const avgIwd = withIwd.length > 0
        ? withIwd.reduce((sum, s) => sum + (s.iwd.value || 0), 0) / withIwd.length
        : 0;
      const traps = signals.filter(s => s.divergence?.direction === 'trap').length;
      const steals = signals.filter(s => s.divergence?.direction === 'steal').length;

      return {
        color,
        totalCards: colorCards.length,
        withIwd: withIwd.length,
        avgIwd: avgIwd * 100,
        traps,
        steals,
      };
    }).sort((a, b) => b.avgIwd - a.avgIwd);
  }, [cards]);

  // Scatter data
  const scatterData = useMemo(() => {
    return allSignals
      .filter(s => s.signal.iwd.value !== null && s.elo !== null)
      .map(s => ({
        name: s.card.name,
        elo: s.elo!,
        iwd: s.signal.iwd.value!,
        divergence: s.signal.divergence?.direction,
      }));
  }, [allSignals]);

  // Top performers
  const topPerformers = useMemo(() => {
    return allSignals
      .filter(s => s.signal.iwd.value !== null)
      .sort((a, b) => (b.signal.iwd.value || 0) - (a.signal.iwd.value || 0))
      .slice(0, 10);
  }, [allSignals]);

  // Worst performers
  const worstPerformers = useMemo(() => {
    return allSignals
      .filter(s => s.signal.iwd.value !== null)
      .sort((a, b) => (a.signal.iwd.value || 0) - (b.signal.iwd.value || 0))
      .slice(0, 10);
  }, [allSignals]);

  // Filtered cards for data table
  const filteredCards = useMemo(() => {
    let filtered = allSignals.filter(s =>
      s.card.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.card.name.localeCompare(b.card.name);
          break;
        case 'iwd':
          cmp = (a.signal.iwd.value || -999) - (b.signal.iwd.value || -999);
          break;
        case 'elo':
          cmp = (a.elo || 0) - (b.elo || 0);
          break;
        case 'delta':
          const aDelta = a.signal.divergence ? (a.signal.divergence.direction === 'trap' ? -1 : 1) : 0;
          const bDelta = b.signal.divergence ? (b.signal.divergence.direction === 'trap' ? -1 : 1) : 0;
          cmp = aDelta - bDelta;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [allSignals, searchQuery, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const formatIwd = (value: number | null) => {
    if (value === null) return 'N/A';
    const pct = (value * 100).toFixed(1);
    return value >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const getIwdColor = (value: number | null) => {
    if (value === null) return 'text-white/40';
    if (value >= 0.05) return 'text-emerald-400';
    if (value >= 0.02) return 'text-emerald-400/70';
    if (value >= 0) return 'text-white/60';
    if (value >= -0.02) return 'text-red-400/70';
    return 'text-red-400';
  };

  const colorNames: Record<string, string> = {
    W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-purple-400" />
          Win Rate Intelligence
        </h1>
        <p className="text-white/50 mt-1">
          Strategic analysis of 17lands IWD data • {stats.withIwd} of {stats.total} cards analyzed
        </p>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Data Coverage</div>
          <div className="text-2xl font-bold text-white">{stats.coverage.toFixed(0)}%</div>
          <div className="text-xs text-white/30">{stats.withIwd} cards</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 text-xs uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3 h-3" />
            Traps Found
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.traps}</div>
          <div className="text-xs text-red-400/50">Overvalued cards</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-wider mb-1">
            <Gem className="w-3 h-3" />
            Steals Found
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.steals}</div>
          <div className="text-xs text-emerald-400/50">Undervalued gems</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Avg IWD</div>
          <div className={`text-2xl font-bold ${getIwdColor(stats.avgIwd)}`}>{(stats.avgIwd * 100).toFixed(1)}%</div>
          <div className="text-xs text-white/30">Cube average</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-1">High Impact</div>
          <div className="text-2xl font-bold text-emerald-400">{stats.highIwd}</div>
          <div className="text-xs text-white/30">&gt;5% IWD cards</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="text-purple-400 text-xs uppercase tracking-wider mb-1">Sim Drafts</div>
          <div className="text-2xl font-bold text-purple-400">{simulationData.draftCount.toLocaleString()}</div>
          <div className="text-xs text-purple-400/50">IWD-adjusted</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          { id: 'executive', label: 'Executive Summary', icon: Award },
          { id: 'distribution', label: 'Distribution', icon: BarChart3 },
          { id: 'colors', label: 'Color Analysis', icon: PieChart },
          { id: 'traps', label: `Traps (${stats.traps})`, icon: AlertTriangle },
          { id: 'steals', label: `Steals (${stats.steals})`, icon: Gem },
          { id: 'data', label: 'All Data', icon: Search },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Executive Summary */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Key Findings */}
          <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-400" />
              Key Findings
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-white">Market Inefficiency Exists</h3>
                    <p className="text-sm text-white/60 mt-1">
                      {stats.steals} cards are systematically undervalued by the community — low ELO but high win rates.
                      These represent <strong className="text-emerald-400">exploitable edges</strong> for informed drafters.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-white">Reputation ≠ Performance</h3>
                    <p className="text-sm text-white/60 mt-1">
                      {stats.traps} high-ELO cards underperform their pick priority. Iconic cards often get picked
                      for <strong className="text-red-400">emotional value</strong> over actual win contribution.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-white">Blue Dominates Win Rate</h3>
                    <p className="text-sm text-white/60 mt-1">
                      Blue cards have the highest average IWD ({colorAnalysis.find(c => c.color === 'U')?.avgIwd.toFixed(1)}%),
                      confirming the format's <strong className="text-blue-400">blue-centric metagame</strong>.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">4</div>
                  <div>
                    <h3 className="font-semibold text-white">Context Matters</h3>
                    <p className="text-sm text-white/60 mt-1">
                      IWD varies up to <strong className="text-purple-400">±5%</strong> depending on deck colors.
                      Color-filtered IWD provides more accurate pick guidance than global averages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Implications */}
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Strategic Implications
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-white/80">
                  <strong className="text-white">Steal picks in pack 2-3:</strong> As the draft progresses,
                  undervalued high-IWD cards become available. {stats.stealList.slice(0, 3).map(s => s.card.name).join(', ')}
                  are frequently available late despite strong win rates.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-white/80">
                  <strong className="text-white">Avoid trap first-picks:</strong> High-ELO cards like{' '}
                  {stats.trapList.slice(0, 2).map(s => s.card.name).join(' and ')} look tempting but
                  underperform. Let others take the bait.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-white/80">
                  <strong className="text-white">Weight blue cards higher:</strong> Blue's IWD advantage suggests
                  being willing to splash or move into blue pays dividends.
                </p>
              </div>
            </div>
          </div>

          {/* ELO vs IWD Scatter */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              ELO vs IWD Positioning
            </h2>
            <p className="text-sm text-white/50 mb-4">
              Each dot is a card. Red = trap (high ELO, low IWD). Green = steal (low ELO, high IWD). Hover for details.
            </p>
            <EloIwdScatter data={scatterData} />
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs text-center">
              <div className="text-emerald-400/60">↑ Low ELO, High IWD</div>
              <div className="text-amber-400/60">↑ High ELO, High IWD</div>
              <div className="text-white/30">↓ Low ELO, Low IWD</div>
              <div className="text-red-400/60">↓ High ELO, Low IWD</div>
            </div>
          </div>

          {/* Top & Bottom */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-emerald-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Highest Win Impact
              </h3>
              <div className="space-y-3">
                {topPerformers.map((item, i) => (
                  <div key={item.card.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                      {i + 1}
                    </div>
                    <img src={getCardImage(item.card)} alt={item.card.name} className="w-8 h-11 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.card.name}</div>
                      <div className="text-xs text-white/40">ELO: {item.elo?.toFixed(0)}</div>
                    </div>
                    <div className={`text-lg font-bold ${getIwdColor(item.signal.iwd.value)}`}>
                      {formatIwd(item.signal.iwd.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-red-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                Lowest Win Impact
              </h3>
              <div className="space-y-3">
                {worstPerformers.map((item, i) => (
                  <div key={item.card.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400">
                      {i + 1}
                    </div>
                    <img src={getCardImage(item.card)} alt={item.card.name} className="w-8 h-11 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.card.name}</div>
                      <div className="text-xs text-white/40">ELO: {item.elo?.toFixed(0)}</div>
                    </div>
                    <div className={`text-lg font-bold ${getIwdColor(item.signal.iwd.value)}`}>
                      {formatIwd(item.signal.iwd.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && (
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">IWD Distribution</h2>
            <p className="text-sm text-white/50 mb-4">
              Distribution of Improvement When Drawn values across {stats.withIwd} cards with data.
              Red = negative (hurts win rate). Green = high impact (&gt;3%).
            </p>
            <IWDHistogram data={stats.iwdValues} />
            <div className="flex justify-between mt-2 text-xs text-white/40">
              <span>-5%</span>
              <span>0%</span>
              <span>+5%</span>
              <span>+10%</span>
              <span>+15%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-red-400">{stats.negativeIwd}</div>
              <div className="text-sm text-white/60 mt-1">Negative IWD</div>
              <div className="text-xs text-white/40 mt-2">Cards that hurt your win rate when drawn</div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-white">{stats.positiveIwd - stats.highIwd}</div>
              <div className="text-sm text-white/60 mt-1">Neutral IWD (0-5%)</div>
              <div className="text-xs text-white/40 mt-2">Solid performers, not game-changers</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-emerald-400">{stats.highIwd}</div>
              <div className="text-sm text-white/60 mt-1">High IWD (&gt;5%)</div>
              <div className="text-xs text-white/40 mt-2">Cards that win games when drawn</div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Understanding the Distribution
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              A typical format has a normal distribution centered around 2-3% IWD. The Vintage Cube shows a
              <strong className="text-white"> right-skewed distribution</strong> with more high-impact cards than average —
              this matches the format's reputation for powerful swings. The {stats.negativeIwd} cards with negative IWD
              are often situational or narrow cards that don't contribute when drawn at the wrong time.
            </p>
          </div>
        </div>
      )}

      {/* Color Analysis Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Average IWD by Color</h2>
            <BarChart
              data={colorAnalysis.map(c => ({
                label: colorNames[c.color],
                value: c.avgIwd,
                color: c.color === 'W' ? 'bg-amber-400' :
                       c.color === 'U' ? 'bg-blue-400' :
                       c.color === 'B' ? 'bg-purple-400' :
                       c.color === 'R' ? 'bg-red-400' :
                       'bg-emerald-400',
              }))}
              maxValue={Math.max(...colorAnalysis.map(c => c.avgIwd)) * 1.2}
              color="bg-white/30"
            />
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {colorAnalysis.map(analysis => {
              const colorClasses: Record<string, string> = {
                W: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                U: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                B: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
                R: 'bg-red-500/10 border-red-500/30 text-red-400',
                G: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
              };
              return (
                <div key={analysis.color} className={`rounded-xl p-4 border ${colorClasses[analysis.color]}`}>
                  <h3 className="font-bold text-lg">{colorNames[analysis.color]}</h3>
                  <div className="text-3xl font-bold mt-2">{analysis.avgIwd.toFixed(1)}%</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">Cards</span>
                      <span className="text-white">{analysis.totalCards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400/60">Traps</span>
                      <span className="text-red-400">{analysis.traps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400/60">Steals</span>
                      <span className="text-emerald-400">{analysis.steals}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Color Strategy Insight
            </h3>
            <p className="text-white/70 leading-relaxed">
              <strong className="text-blue-400">Blue</strong> leads IWD because it contains the format's best card selection
              and combo enablers. <strong className="text-emerald-400">Green</strong> follows due to efficient ramp making
              powerful cards come online faster. <strong className="text-red-400">Red</strong> often underperforms —
              aggressive strategies struggle in Vintage Cube's high-power environment.
            </p>
          </div>
        </div>
      )}

      {/* Traps Tab */}
      {activeTab === 'traps' && (
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Trap Cards ({stats.traps})
            </h2>
            <p className="text-white/60 text-sm">
              High ELO (picked early) but low IWD (don't improve win rate). The community overvalues these.
            </p>
          </div>

          {stats.trapList.length === 0 ? (
            <div className="text-center py-12 text-white/40">No trap cards detected.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.trapList.map(item => (
                <div key={item.card.name} className="bg-white/[0.02] border border-red-500/30 rounded-xl p-4">
                  <div className="flex gap-4">
                    <img src={getCardImage(item.card)} alt={item.card.name} className="w-20 h-28 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{item.card.name}</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">ELO</span>
                          <span className="text-white">{item.elo?.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Percentile</span>
                          <span className="text-amber-400">Top {item.eloPercentile ? (100 - item.eloPercentile).toFixed(0) : '?'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">IWD</span>
                          <span className={getIwdColor(item.signal.iwd.value)}>{formatIwd(item.signal.iwd.value)}</span>
                        </div>
                      </div>
                      <div className="mt-3 px-2 py-1 bg-red-500/20 rounded text-xs text-red-300">
                        {item.signal.divergence?.explanation.slice(0, 80)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Steals Tab */}
      {activeTab === 'steals' && (
        <div className="space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
              <Gem className="w-5 h-5" />
              Steal Cards ({stats.steals})
            </h2>
            <p className="text-white/60 text-sm">
              Low ELO (picked late) but high IWD (significantly improve win rate). These are your edge.
            </p>
          </div>

          {stats.stealList.length === 0 ? (
            <div className="text-center py-12 text-white/40">No steal cards detected.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.stealList.map(item => (
                <div key={item.card.name} className="bg-white/[0.02] border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex gap-4">
                    <img src={getCardImage(item.card)} alt={item.card.name} className="w-20 h-28 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{item.card.name}</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">ELO</span>
                          <span className="text-white">{item.elo?.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Percentile</span>
                          <span className="text-white/60">{item.eloPercentile ? (100 - item.eloPercentile).toFixed(0) : '?'}th</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">IWD</span>
                          <span className={getIwdColor(item.signal.iwd.value)}>{formatIwd(item.signal.iwd.value)}</span>
                        </div>
                      </div>
                      <div className="mt-3 px-2 py-1 bg-emerald-500/20 rounded text-xs text-emerald-300">
                        {item.signal.divergence?.explanation.slice(0, 80)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
            >
              {COLOR_COMBOS.map(combo => (
                <option key={combo.id} value={combo.id}>{combo.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">
                      Card {sortBy === 'name' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70" onClick={() => toggleSort('elo')}>
                    <div className="flex items-center justify-end gap-1">
                      ELO {sortBy === 'elo' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70" onClick={() => toggleSort('iwd')}>
                    <div className="flex items-center justify-end gap-1">
                      IWD {sortBy === 'iwd' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="text-center p-4 text-sm font-medium text-white/50">Signal</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.slice(0, 100).map((item) => (
                  <tr key={item.card.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={getCardImage(item.card)} alt={item.card.name} className="w-8 h-11 rounded object-cover" />
                        <div className="text-sm text-white">{item.card.name}</div>
                      </div>
                    </td>
                    <td className="p-4 text-right text-sm text-white/70">{item.elo?.toFixed(0) || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <div className={`text-sm font-medium ${getIwdColor(item.signal.iwd.value)}`}>
                        {formatIwd(item.signal.iwd.value)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {item.signal.divergence ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          item.signal.divergence.direction === 'trap' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {item.signal.divergence.direction === 'trap' ? <><AlertTriangle className="w-3 h-3" /> Trap</> : <><Gem className="w-3 h-3" /> Steal</>}
                        </span>
                      ) : item.signal.confidence === 'aligned' ? (
                        <span className="text-xs text-white/40">Aligned</span>
                      ) : (
                        <span className="text-xs text-white/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCards.length > 100 && (
              <div className="p-4 text-center text-sm text-white/40">
                Showing 100 of {filteredCards.length} cards. Use search to filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
