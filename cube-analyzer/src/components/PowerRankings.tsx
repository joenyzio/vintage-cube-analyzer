import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  formatPickCount,
  formatCubeCount,
  getEloBarWidth,
} from '../services/eloHelpers';
import { Search, TrendingUp, Users, Target } from 'lucide-react';

interface PowerRankingsProps {
  cards: CubeCard[];
}

// Define tiers with more realistic thresholds
const TIERS = [
  { id: 'S', label: 'S Tier - First Picks', min: 10, max: 10, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', description: 'Always take these P1P1' },
  { id: 'A', label: 'A Tier - Premium', min: 8, max: 9, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', description: 'Top-tier playables' },
  { id: 'B', label: 'B Tier - Strong', min: 6, max: 7, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', description: 'Solid picks for any deck' },
  { id: 'C', label: 'C Tier - Playable', min: 4, max: 5, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', description: 'Role players and fillers' },
  { id: 'D', label: 'D Tier - Situational', min: 0, max: 3, color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10', description: 'Only in specific archetypes' },
];

const COLOR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'W', label: 'W', className: 'bg-amber-100 text-amber-900' },
  { id: 'U', label: 'U', className: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', className: 'bg-neutral-600 text-white' },
  { id: 'R', label: 'R', className: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', className: 'bg-green-600 text-white' },
  { id: 'C', label: 'C', className: 'bg-neutral-400 text-black' },
];

function getTier(power: number): typeof TIERS[number] {
  return TIERS.find(t => power >= t.min && power <= t.max) || TIERS[TIERS.length - 1];
}

export function PowerRankings({ cards }: PowerRankingsProps) {
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<string>>(new Set());

  // Filter cards
  const filteredCards = useMemo(() => {
    let result = [...cards];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.type_line?.toLowerCase().includes(lower)
      );
    }

    if (colorFilter !== 'all') {
      if (colorFilter === 'C') {
        result = result.filter(c => !c.colors || c.colors.length === 0);
      } else {
        result = result.filter(c => c.colors?.includes(colorFilter) || c.color_identity?.includes(colorFilter));
      }
    }

    if (typeFilter !== 'all') {
      result = result.filter(c => c.type_line?.toLowerCase().includes(typeFilter));
    }

    // Sort by power level descending
    result.sort((a, b) => b.powerLevel - a.powerLevel);

    return result;
  }, [cards, search, colorFilter, typeFilter]);

  // Group by tier
  const cardsByTier = useMemo(() => {
    const groups: Record<string, CubeCard[]> = {};
    TIERS.forEach(t => groups[t.id] = []);

    filteredCards.forEach(card => {
      const tier = getTier(card.powerLevel);
      groups[tier.id].push(card);
    });

    return groups;
  }, [filteredCards]);

  // Tier counts and ELO stats for summary
  const tierStats = useMemo(() => {
    const stats: Record<string, { count: number; avgElo: number; totalPicks: number }> = {};
    TIERS.forEach(t => {
      const tierCards = cardsByTier[t.id];
      let totalElo = 0;
      let totalPicks = 0;
      let eloCount = 0;

      tierCards.forEach(card => {
        const eloData = getEloData(card.name);
        if (eloData) {
          totalElo += eloData.elo;
          totalPicks += eloData.pickCount;
          eloCount++;
        }
      });

      stats[t.id] = {
        count: tierCards.length,
        avgElo: eloCount > 0 ? Math.round(totalElo / eloCount) : 0,
        totalPicks
      };
    });
    return stats;
  }, [cardsByTier]);

  const toggleTier = (tierId: string) => {
    const next = new Set(collapsedTiers);
    if (next.has(tierId)) next.delete(tierId);
    else next.add(tierId);
    setCollapsedTiers(next);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-3 sm:py-2 bg-black border border-white/10 rounded-xl sm:rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="flex gap-3 sm:gap-1 justify-between sm:justify-start">
          <div className="flex gap-1">
            {COLOR_FILTERS.map(c => (
              <button
                key={c.id}
                onClick={() => setColorFilter(c.id)}
                className={`
                  w-9 h-9 sm:w-7 sm:h-7 rounded-lg sm:rounded flex items-center justify-center text-xs font-bold transition-all active:scale-90
                  ${c.id === 'all'
                    ? colorFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
                    : colorFilter === c.id ? c.className + ' ring-2 ring-white/30' : c.className + ' opacity-40 hover:opacity-70'
                  }
                `}
              >
                {c.label}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-black border border-white/10 rounded-xl sm:rounded-lg text-sm text-white/60 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="creature">Creature</option>
            <option value="instant">Instant</option>
            <option value="sorcery">Sorcery</option>
            <option value="artifact">Artifact</option>
            <option value="enchantment">Enchantment</option>
            <option value="planeswalker">Planeswalker</option>
            <option value="land">Land</option>
          </select>
        </div>

        <span className="text-xs text-white/30 text-center sm:text-left sm:ml-auto">{filteredCards.length} cards</span>
      </div>

      {/* Tier Summary Bar */}
      <div className="flex gap-2 flex-wrap">
        {TIERS.map(tier => {
          const stats = tierStats[tier.id];
          return (
            <button
              key={tier.id}
              onClick={() => toggleTier(tier.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                ${tier.bg} ${tier.border} border
                ${collapsedTiers.has(tier.id) ? 'opacity-50' : ''}
              `}
              title={stats.avgElo > 0 ? `Avg ELO: ${stats.avgElo} | ${formatPickCount(stats.totalPicks)} picks` : undefined}
            >
              <span className={`font-bold ${tier.color}`}>{tier.id}</span>
              <span className="text-white/50 font-mono text-xs">{stats.count}</span>
              {stats.avgElo > 0 && (
                <span className="text-white/30 font-mono text-[10px] hidden sm:inline">
                  {stats.avgElo}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tier Lists */}
      <div className="space-y-6">
        {TIERS.map(tier => {
          const tierCards = cardsByTier[tier.id];
          if (tierCards.length === 0) return null;
          const isCollapsed = collapsedTiers.has(tier.id);

          return (
            <div key={tier.id} className="bg-black border border-white/[0.06] rounded-xl overflow-hidden">
              {/* Tier Header */}
              <button
                onClick={() => toggleTier(tier.id)}
                className={`w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors ${tier.border} border-b`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl ${tier.bg} ${tier.color}`}>
                  {tier.id}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${tier.color}`}>{tier.label}</div>
                  <div className="text-xs text-white/40">{tier.description}</div>
                </div>
                <span className="text-sm text-white/40 font-mono">{tierCards.length} cards</span>
                <span className="text-white/30 text-xs">{isCollapsed ? '▶' : '▼'}</span>
              </button>

              {/* Cards Grid */}
              {!isCollapsed && (
                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 gap-2">
                    {tierCards.map((card) => (
                      <div
                        key={card.id}
                        className="relative aspect-[488/680] rounded-lg overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform hover:z-10 shadow-lg"
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img
                          src={getCardImage(card)}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className={`
                          absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${card.powerLevel >= 10 ? 'bg-amber-400 text-black' : ''}
                          ${card.powerLevel >= 8 && card.powerLevel < 10 ? 'bg-purple-400 text-white' : ''}
                          ${card.powerLevel >= 6 && card.powerLevel < 8 ? 'bg-blue-400 text-white' : ''}
                          ${card.powerLevel < 6 ? 'bg-black/70 text-white' : ''}
                        `}>
                          {card.powerLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No cards match your filters</p>
          <button
            onClick={() => { setSearch(''); setColorFilter('all'); setTypeFilter('all'); }}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 hidden lg:block pointer-events-none">
          <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl w-64">
            <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-full rounded-lg" />
            <div className="mt-2 px-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white truncate">{hoveredCard.name}</span>
                <span className={`text-sm font-bold ${getTier(hoveredCard.powerLevel).color}`}>
                  {hoveredCard.powerLevel}
                </span>
              </div>
              <div className="text-xs text-white/40">{hoveredCard.type_line}</div>

              {/* ELO Stats Section */}
              {(() => {
                const eloData = getEloData(hoveredCard.name);
                if (!eloData) return null;

                const percentile = getPercentile(hoveredCard.name);
                const wheelLikelihood = getWheelLikelihood(hoveredCard.name);
                const barWidth = getEloBarWidth(hoveredCard.name);

                return (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    {/* ELO Rating with bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          ELO Rating
                        </span>
                        <span className="text-xs font-mono text-white/70">{Math.round(eloData.elo)}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentile >= 75 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                            percentile >= 50 ? 'bg-gradient-to-r from-purple-400 to-purple-500' :
                            percentile >= 25 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                            'bg-gradient-to-r from-white/30 to-white/40'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Percentile and Wheel */}
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${
                        percentile >= 75 ? 'text-amber-400' :
                        percentile >= 50 ? 'text-purple-400' :
                        percentile >= 25 ? 'text-blue-400' :
                        'text-white/50'
                      }`}>
                        Top {100 - percentile}%
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        wheelLikelihood === 'likely' ? 'bg-green-500/20 text-green-400' :
                        wheelLikelihood === 'maybe' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {wheelLikelihood === 'likely' ? 'Likely wheels' :
                         wheelLikelihood === 'maybe' ? 'May wheel' :
                         'Won\'t wheel'}
                      </span>
                    </div>

                    {/* Pick Stats */}
                    <div className="flex items-center gap-3 text-[10px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {formatPickCount(eloData.pickCount)} picks
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {formatCubeCount(eloData.cubeCount)} cubes
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
