/**
 * IWD (Improvement When Drawn) Analysis Page
 *
 * Deep analysis of 17lands win rate data integrated with simulation results.
 * Shows trap/steal cards, color-filtered IWD, and actionable insights.
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle, Gem, TrendingUp, TrendingDown,
  BarChart3, Search, Filter, Info,
  ChevronDown, ChevronUp
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
  { id: 'WU', label: 'Azorius' },
  { id: 'UB', label: 'Dimir' },
  { id: 'BR', label: 'Rakdos' },
  { id: 'RG', label: 'Gruul' },
  { id: 'WG', label: 'Selesnya' },
  { id: 'WB', label: 'Orzhov' },
  { id: 'UR', label: 'Izzet' },
  { id: 'BG', label: 'Golgari' },
  { id: 'WR', label: 'Boros' },
  { id: 'UG', label: 'Simic' },
];

export function IWDAnalysis({ cards }: IWDAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'traps' | 'steals' | 'bycolor' | 'compare'>('overview');
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

  // Stats summary
  const stats = useMemo(() => {
    const total = allSignals.length;
    const withIwd = allSignals.filter(s => s.signal.iwd.value !== null).length;
    const traps = allSignals.filter(s => s.signal.divergence?.direction === 'trap').length;
    const steals = allSignals.filter(s => s.signal.divergence?.direction === 'steal').length;
    const aligned = allSignals.filter(s => s.signal.confidence === 'aligned').length;
    const unknown = allSignals.filter(s => s.signal.confidence === 'unknown').length;

    return { total, withIwd, traps, steals, aligned, unknown };
  }, [allSignals]);

  // Trap cards (high ELO, low IWD)
  const trapCards = useMemo(() => {
    return allSignals
      .filter(s => s.signal.divergence?.direction === 'trap')
      .sort((a, b) => (a.signal.iwd.value || 0) - (b.signal.iwd.value || 0));
  }, [allSignals]);

  // Steal cards (low ELO, high IWD)
  const stealCards = useMemo(() => {
    return allSignals
      .filter(s => s.signal.divergence?.direction === 'steal')
      .sort((a, b) => (b.signal.iwd.value || 0) - (a.signal.iwd.value || 0));
  }, [allSignals]);

  // Top IWD performers
  const topPerformers = useMemo(() => {
    return allSignals
      .filter(s => s.signal.iwd.value !== null)
      .sort((a, b) => (b.signal.iwd.value || 0) - (a.signal.iwd.value || 0))
      .slice(0, 20);
  }, [allSignals]);

  // Worst IWD performers
  const worstPerformers = useMemo(() => {
    return allSignals
      .filter(s => s.signal.iwd.value !== null)
      .sort((a, b) => (a.signal.iwd.value || 0) - (b.signal.iwd.value || 0))
      .slice(0, 20);
  }, [allSignals]);

  // Filtered and sorted cards
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

  // IWD by color analysis
  const colorAnalysis = useMemo(() => {
    const colors = ['W', 'U', 'B', 'R', 'G'];
    return colors.map(color => {
      const colorCards = cards.filter(c => c.color_identity?.includes(color));
      const signals = colorCards.map(c => getCardSignal(c.name, [color]));
      const withIwd = signals.filter(s => s.iwd.value !== null);
      const avgIwd = withIwd.length > 0
        ? withIwd.reduce((sum, s) => sum + (s.iwd.value || 0), 0) / withIwd.length
        : null;
      const traps = signals.filter(s => s.divergence?.direction === 'trap').length;
      const steals = signals.filter(s => s.divergence?.direction === 'steal').length;

      return {
        color,
        totalCards: colorCards.length,
        withIwd: withIwd.length,
        avgIwd,
        traps,
        steals,
      };
    });
  }, [cards]);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-purple-400" />
          Win Rate Analysis (IWD)
        </h1>
        <p className="text-white/50 mt-1">
          17lands Improvement When Drawn data • {stats.withIwd} of {stats.total} cards with data
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-white/40 text-sm mb-1">Cards with IWD</div>
          <div className="text-2xl font-bold text-white">{stats.withIwd}</div>
          <div className="text-xs text-white/30">{((stats.withIwd / stats.total) * 100).toFixed(0)}% coverage</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            Traps
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.traps}</div>
          <div className="text-xs text-red-400/50">High ELO, low win%</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
            <Gem className="w-4 h-4" />
            Steals
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.steals}</div>
          <div className="text-xs text-emerald-400/50">Low ELO, high win%</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-white/40 text-sm mb-1">Aligned</div>
          <div className="text-2xl font-bold text-white">{stats.aligned}</div>
          <div className="text-xs text-white/30">ELO matches win%</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-white/40 text-sm mb-1">Unknown</div>
          <div className="text-2xl font-bold text-white/50">{stats.unknown}</div>
          <div className="text-xs text-white/30">No 17lands data</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="text-purple-400 text-sm mb-1">Sim Drafts</div>
          <div className="text-2xl font-bold text-purple-400">{simulationData.draftCount.toLocaleString()}</div>
          <div className="text-xs text-purple-400/50">IWD-informed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: '📊 Overview', icon: BarChart3 },
          { id: 'traps', label: '⚠️ Traps', icon: AlertTriangle },
          { id: 'steals', label: '💎 Steals', icon: Gem },
          { id: 'bycolor', label: '🎨 By Color', icon: Filter },
          { id: 'compare', label: '📈 All Cards', icon: Search },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* What is IWD */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-400" />
              What is IWD?
            </h2>
            <p className="text-white/70 leading-relaxed">
              <strong className="text-white">Improvement When Drawn (IWD)</strong> measures how much your win rate improves when you draw a card.
              A card with +5% IWD means drawing it increases your chances of winning by 5 percentage points.
              This is different from ELO, which measures how early cards are picked — IWD measures actual performance.
            </p>
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm font-medium text-emerald-400 mb-1">High IWD (&gt;3%)</div>
                <div className="text-xs text-white/50">Cards that actually win games when drawn</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm font-medium text-white/60 mb-1">Neutral IWD (0-3%)</div>
                <div className="text-xs text-white/50">Solid contributors, not game-changers</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm font-medium text-red-400 mb-1">Negative IWD (&lt;0%)</div>
                <div className="text-xs text-white/50">Drawing this hurts your win rate</div>
              </div>
            </div>
          </div>

          {/* Top and Bottom Performers */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top IWD */}
            <div className="bg-white/[0.02] border border-emerald-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Highest Win Rate Impact
              </h3>
              <div className="space-y-3">
                {topPerformers.slice(0, 10).map((item, i) => (
                  <div key={item.card.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                      {i + 1}
                    </div>
                    <img
                      src={getCardImage(item.card)}
                      alt={item.card.name}
                      className="w-8 h-11 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.card.name}</div>
                      <div className="text-xs text-white/40">ELO: {item.elo?.toFixed(0) || 'N/A'}</div>
                    </div>
                    <div className={`text-lg font-bold ${getIwdColor(item.signal.iwd.value)}`}>
                      {formatIwd(item.signal.iwd.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom IWD */}
            <div className="bg-white/[0.02] border border-red-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                Lowest Win Rate Impact
              </h3>
              <div className="space-y-3">
                {worstPerformers.slice(0, 10).map((item, i) => (
                  <div key={item.card.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400">
                      {i + 1}
                    </div>
                    <img
                      src={getCardImage(item.card)}
                      alt={item.card.name}
                      className="w-8 h-11 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.card.name}</div>
                      <div className="text-xs text-white/40">ELO: {item.elo?.toFixed(0) || 'N/A'}</div>
                    </div>
                    <div className={`text-lg font-bold ${getIwdColor(item.signal.iwd.value)}`}>
                      {formatIwd(item.signal.iwd.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Insight */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-amber-400 mb-3">💡 Key Insight</h3>
            <p className="text-white/80">
              The simulation now uses IWD data to adjust bot picks. <strong className="text-white">Trap cards</strong> (high ELO but low IWD)
              get a -100 penalty, while <strong className="text-white">steal cards</strong> (low ELO but high IWD) get a +50 bonus.
              This means the bots now make smarter picks based on actual win rate data, not just community perception.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'traps' && (
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Trap Cards ({trapCards.length})
            </h2>
            <p className="text-white/60 text-sm">
              These cards have high ELO (picked early) but low IWD (don't improve win rate).
              The community overvalues them — be cautious.
            </p>
          </div>

          {trapCards.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              No trap cards detected with current filters.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trapCards.map(item => (
                <div key={item.card.name} className="bg-white/[0.02] border border-red-500/30 rounded-xl p-4">
                  <div className="flex gap-4">
                    <img
                      src={getCardImage(item.card)}
                      alt={item.card.name}
                      className="w-20 h-28 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{item.card.name}</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">ELO</span>
                          <span className="text-white">{item.elo?.toFixed(0) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Percentile</span>
                          <span className="text-amber-400">{item.eloPercentile ? `Top ${(100 - item.eloPercentile).toFixed(0)}%` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">IWD</span>
                          <span className={getIwdColor(item.signal.iwd.value)}>{formatIwd(item.signal.iwd.value)}</span>
                        </div>
                      </div>
                      <div className="mt-3 px-2 py-1 bg-red-500/20 rounded text-xs text-red-300">
                        {item.signal.divergence?.explanation.slice(0, 60)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'steals' && (
        <div className="space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
              <Gem className="w-5 h-5" />
              Steal Cards ({stealCards.length})
            </h2>
            <p className="text-white/60 text-sm">
              These cards have low ELO (picked late) but high IWD (significantly improve win rate).
              The community undervalues them — grab these when you can.
            </p>
          </div>

          {stealCards.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              No steal cards detected with current filters.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stealCards.map(item => (
                <div key={item.card.name} className="bg-white/[0.02] border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex gap-4">
                    <img
                      src={getCardImage(item.card)}
                      alt={item.card.name}
                      className="w-20 h-28 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{item.card.name}</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">ELO</span>
                          <span className="text-white">{item.elo?.toFixed(0) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Percentile</span>
                          <span className="text-white/60">{item.eloPercentile ? `Top ${(100 - item.eloPercentile).toFixed(0)}%` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">IWD</span>
                          <span className={getIwdColor(item.signal.iwd.value)}>{formatIwd(item.signal.iwd.value)}</span>
                        </div>
                      </div>
                      <div className="mt-3 px-2 py-1 bg-emerald-500/20 rounded text-xs text-emerald-300">
                        {item.signal.divergence?.explanation.slice(0, 60)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bycolor' && (
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">IWD Analysis by Color</h2>
            <div className="grid md:grid-cols-5 gap-4">
              {colorAnalysis.map(analysis => {
                const colorNames: Record<string, string> = {
                  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green'
                };
                const colorClasses: Record<string, string> = {
                  W: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
                  U: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
                  B: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
                  R: 'bg-red-500/20 border-red-500/30 text-red-400',
                  G: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
                };
                return (
                  <div key={analysis.color} className={`rounded-xl p-4 border ${colorClasses[analysis.color]}`}>
                    <h3 className="font-bold text-lg">{colorNames[analysis.color]}</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/40">Cards</span>
                        <span className="text-white">{analysis.totalCards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">With IWD</span>
                        <span className="text-white">{analysis.withIwd}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Avg IWD</span>
                        <span className={getIwdColor(analysis.avgIwd)}>
                          {analysis.avgIwd !== null ? formatIwd(analysis.avgIwd) : 'N/A'}
                        </span>
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
          </div>

          {/* Color-Filtered IWD Note */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-2">Color Context Matters</h3>
            <p className="text-white/70 text-sm">
              IWD varies significantly by deck color. For example, <strong className="text-white">Lightning Bolt</strong> has
              +4.6% IWD in UR (Izzet) decks but -0.5% IWD in RG (Gruul) decks. The draft coach uses color-filtered IWD
              based on your current deck colors for more accurate recommendations.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-4">
          {/* Filters */}
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

          {/* Table */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    className="text-left p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Card
                      {sortBy === 'name' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="text-right p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70"
                    onClick={() => toggleSort('elo')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      ELO
                      {sortBy === 'elo' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="text-right p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70"
                    onClick={() => toggleSort('iwd')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      IWD
                      {sortBy === 'iwd' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="text-center p-4 text-sm font-medium text-white/50">
                    Signal
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.slice(0, 100).map((item) => (
                  <tr key={item.card.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getCardImage(item.card)}
                          alt={item.card.name}
                          className="w-8 h-11 rounded object-cover"
                        />
                        <div className="text-sm text-white">{item.card.name}</div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-sm text-white/70">{item.elo?.toFixed(0) || 'N/A'}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className={`text-sm font-medium ${getIwdColor(item.signal.iwd.value)}`}>
                        {formatIwd(item.signal.iwd.value)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {item.signal.divergence ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          item.signal.divergence.direction === 'trap'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {item.signal.divergence.direction === 'trap' ? (
                            <><AlertTriangle className="w-3 h-3" /> Trap</>
                          ) : (
                            <><Gem className="w-3 h-3" /> Steal</>
                          )}
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
