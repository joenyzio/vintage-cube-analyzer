/**
 * Simulation Analysis Page
 *
 * Full analysis of draft simulation data from 500 simulated drafts.
 */

import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Target, Users,
  Clock, ArrowUpRight, ArrowDownRight, Search,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import simulationData from '../data/simulation-data.json';
import { getCardImage } from '../services/scryfall';
import type { CubeCard } from '../types/card';

interface SimulationAnalysisProps {
  cards: CubeCard[];
}

interface CardStats {
  name: string;
  pickCount: number;
  avgPickPosition: number;
  wheelRate: number;
  sideboardRate: number;
  topArchetype: string;
  topArchetypePercent: number;
}

export function SimulationAnalysis({ cards }: SimulationAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'archetypes' | 'cards' | 'wheelers' | 'firstpicks'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'avgPick' | 'wheelRate' | 'sideboardRate'>('avgPick');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Process card stats
  const cardStats = useMemo(() => {
    const stats: CardStats[] = [];
    const cardData = simulationData.cardStats as Record<string, any>;

    for (const [name, data] of Object.entries(cardData)) {
      const wheelRate = data.wheelOpportunities > 0
        ? (data.wheelCount / data.wheelOpportunities) * 100
        : 0;
      const sideboardRate = data.pickCount > 0
        ? (data.sideboardCount / data.pickCount) * 100
        : 0;

      // Find top archetype
      const archetypes = data.archetypeBreakdown as Record<string, number>;
      const total = Object.values(archetypes).reduce((sum: number, count: number) => sum + count, 0);
      const sorted = Object.entries(archetypes).sort((a, b) => b[1] - a[1]);
      const topArch = sorted[0] || ['none', 0];

      stats.push({
        name,
        pickCount: data.pickCount,
        avgPickPosition: data.avgPickPosition,
        wheelRate,
        sideboardRate,
        topArchetype: topArch[0],
        topArchetypePercent: total > 0 ? (topArch[1] / total) * 100 : 0,
      });
    }

    return stats;
  }, []);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let filtered = cardStats.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'avgPick':
          cmp = a.avgPickPosition - b.avgPickPosition;
          break;
        case 'wheelRate':
          cmp = a.wheelRate - b.wheelRate;
          break;
        case 'sideboardRate':
          cmp = a.sideboardRate - b.sideboardRate;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [cardStats, searchQuery, sortBy, sortDir]);

  // Archetype stats
  const archetypeStats = useMemo(() => {
    const data = simulationData.archetypeDistribution as Record<string, any>;
    return Object.entries(data)
      .map(([id, stats]) => ({
        id,
        count: stats.count,
        percentage: (stats.count / simulationData.totalDecks) * 100,
        avgCommitment: stats.avgCommitment * 100,
        avgQuality: stats.avgDeckQuality,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, []);

  // High wheelers (>80%)
  const highWheelers = useMemo(() => {
    return cardStats
      .filter(c => c.wheelRate >= 80)
      .sort((a, b) => b.wheelRate - a.wheelRate)
      .slice(0, 20);
  }, [cardStats]);

  // Never wheelers (<5%)
  const neverWheelers = useMemo(() => {
    return cardStats
      .filter(c => c.wheelRate <= 5)
      .sort((a, b) => a.avgPickPosition - b.avgPickPosition)
      .slice(0, 20);
  }, [cardStats]);

  // First picks (avg position < 18)
  const firstPicks = useMemo(() => {
    return cardStats
      .filter(c => c.avgPickPosition < 18)
      .sort((a, b) => a.avgPickPosition - b.avgPickPosition)
      .slice(0, 30);
  }, [cardStats]);

  const getCardByName = (name: string) => cards.find(c => c.name === name);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Simulation Analysis</h1>
        <p className="text-white/50 mt-1">
          Data from {simulationData.draftCount.toLocaleString()} simulated drafts • {simulationData.totalDecks.toLocaleString()} total decks
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
            <Users className="w-4 h-4" />
            Drafts Simulated
          </div>
          <div className="text-2xl font-bold text-white">{simulationData.draftCount}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
            <Target className="w-4 h-4" />
            Total Decks Built
          </div>
          <div className="text-2xl font-bold text-white">{simulationData.totalDecks.toLocaleString()}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            High Wheelers
          </div>
          <div className="text-2xl font-bold text-cyan-400">{highWheelers.length}</div>
          <div className="text-xs text-white/30">Cards with 80%+ wheel rate</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
            <TrendingDown className="w-4 h-4" />
            Never Wheelers
          </div>
          <div className="text-2xl font-bold text-orange-400">{neverWheelers.length}</div>
          <div className="text-xs text-white/30">Cards with &lt;5% wheel rate</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'archetypes', label: 'Archetypes' },
          { id: 'firstpicks', label: 'First Picks' },
          { id: 'wheelers', label: 'Wheel Analysis' },
          { id: 'cards', label: 'All Cards' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Archetypes */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Archetype Distribution</h3>
            <div className="space-y-3">
              {archetypeStats.map(arch => (
                <div key={arch.id} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-white/70 capitalize">{arch.id}</div>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500/50 to-blue-500/50 rounded-full"
                      style={{ width: `${arch.percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-white/60 text-right">{arch.percentage.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Dominant Archetype</div>
                  <div className="text-sm text-white/50">
                    {archetypeStats[0]?.id} at {archetypeStats[0]?.percentage.toFixed(1)}% - most common strategy
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Natural Ceiling</div>
                  <div className="text-sm text-white/50">
                    Tempo at ~10% is the natural ceiling due to limited card support
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Safe Passes</div>
                  <div className="text-sm text-white/50">
                    {highWheelers.length} cards wheel 80%+ of the time - safe to speculate
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Must-Takes</div>
                  <div className="text-sm text-white/50">
                    {neverWheelers.length} cards never wheel - take immediately if wanted
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 First Picks */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top 10 First Picks</h3>
            <div className="space-y-2">
              {firstPicks.slice(0, 10).map((card, i) => {
                const cardData = getCardByName(card.name);
                return (
                  <div key={card.name} className="flex items-center gap-3 py-2">
                    <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                      {i + 1}
                    </div>
                    {cardData && (
                      <img
                        src={getCardImage(cardData)}
                        alt={card.name}
                        className="w-8 h-11 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{card.name}</div>
                    </div>
                    <div className="text-sm text-white/40">
                      avg #{card.avgPickPosition.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consistent Wheelers */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Consistent Wheelers (80%+)</h3>
            <div className="space-y-2">
              {highWheelers.slice(0, 10).map((card) => {
                const cardData = getCardByName(card.name);
                return (
                  <div key={card.name} className="flex items-center gap-3 py-2">
                    {cardData && (
                      <img
                        src={getCardImage(cardData)}
                        alt={card.name}
                        className="w-8 h-11 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{card.name}</div>
                    </div>
                    <div className="text-sm text-cyan-400 font-medium">
                      {card.wheelRate.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'archetypes' && (
        <div className="space-y-6">
          {archetypeStats.map(arch => (
            <div key={arch.id} className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white capitalize">{arch.id}</h3>
                  <div className="text-sm text-white/50">
                    {arch.count} decks ({arch.percentage.toFixed(1)}% of all decks)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{arch.percentage.toFixed(1)}%</div>
                  <div className="text-xs text-white/40">emergence rate</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                <div>
                  <div className="text-xs text-white/40 uppercase">Avg Commitment</div>
                  <div className="text-lg font-semibold text-white">{arch.avgCommitment.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase">Avg Deck Quality</div>
                  <div className="text-lg font-semibold text-white">{Math.round(arch.avgQuality)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase">Decks Built</div>
                  <div className="text-lg font-semibold text-white">{arch.count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'firstpicks' && (
        <div className="space-y-4">
          <p className="text-white/50 text-sm">
            Cards with average pick position under 18 - these are first-pick quality.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {firstPicks.map((card, i) => {
              const cardData = getCardByName(card.name);
              return (
                <div key={card.name} className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                      {i + 1}
                    </div>
                    <div className="text-xs text-white/40">avg #{card.avgPickPosition.toFixed(1)}</div>
                  </div>
                  {cardData && (
                    <img
                      src={getCardImage(cardData)}
                      alt={card.name}
                      className="w-full rounded-lg"
                    />
                  )}
                  <div className="mt-2 text-sm text-white truncate">{card.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'wheelers' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* High Wheelers */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              High Wheelers (80%+ wheel rate)
            </h3>
            <p className="text-white/50 text-sm mb-4">
              These cards often come back around - safe to pass early.
            </p>
            <div className="space-y-2">
              {highWheelers.map((card) => {
                const cardData = getCardByName(card.name);
                return (
                  <div key={card.name} className="flex items-center gap-3 py-2 px-3 bg-white/[0.02] rounded-lg border border-cyan-500/20">
                    {cardData && (
                      <img
                        src={getCardImage(cardData)}
                        alt={card.name}
                        className="w-10 h-14 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{card.name}</div>
                      <div className="text-xs text-white/40">avg pick #{card.avgPickPosition.toFixed(0)}</div>
                    </div>
                    <div className="text-lg font-bold text-cyan-400">
                      {card.wheelRate.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Never Wheelers */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-400" />
              Never Wheelers (&lt;5% wheel rate)
            </h3>
            <p className="text-white/50 text-sm mb-4">
              These cards rarely come back - take them now if you want them.
            </p>
            <div className="space-y-2">
              {neverWheelers.map((card) => {
                const cardData = getCardByName(card.name);
                return (
                  <div key={card.name} className="flex items-center gap-3 py-2 px-3 bg-white/[0.02] rounded-lg border border-orange-500/20">
                    {cardData && (
                      <img
                        src={getCardImage(cardData)}
                        alt={card.name}
                        className="w-10 h-14 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{card.name}</div>
                      <div className="text-xs text-white/40">avg pick #{card.avgPickPosition.toFixed(0)}</div>
                    </div>
                    <div className="text-lg font-bold text-orange-400">
                      {card.wheelRate.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
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
                    onClick={() => toggleSort('avgPick')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Avg Pick
                      {sortBy === 'avgPick' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="text-right p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70"
                    onClick={() => toggleSort('wheelRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Wheel %
                      {sortBy === 'wheelRate' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="text-right p-4 text-sm font-medium text-white/50 cursor-pointer hover:text-white/70"
                    onClick={() => toggleSort('sideboardRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Sideboard %
                      {sortBy === 'sideboardRate' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-white/50">
                    Top Archetype
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.slice(0, 100).map((card) => (
                  <tr key={card.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="text-sm text-white">{card.name}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-sm text-white/70">#{card.avgPickPosition.toFixed(1)}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className={`text-sm font-medium ${
                        card.wheelRate >= 80 ? 'text-cyan-400' :
                        card.wheelRate <= 5 ? 'text-orange-400' :
                        'text-white/70'
                      }`}>
                        {card.wheelRate.toFixed(0)}%
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className={`text-sm ${
                        card.sideboardRate >= 80 ? 'text-red-400' :
                        card.sideboardRate <= 10 ? 'text-emerald-400' :
                        'text-white/70'
                      }`}>
                        {card.sideboardRate.toFixed(0)}%
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-xs px-2 py-1 rounded bg-white/5 text-white/60 inline-block capitalize">
                        {card.topArchetype} ({card.topArchetypePercent.toFixed(0)}%)
                      </div>
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
