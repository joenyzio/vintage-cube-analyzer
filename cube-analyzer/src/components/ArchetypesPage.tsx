import { useState, useMemo } from 'react';
import type { Archetype, CubeCard } from '../types/card';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { getCardImage } from '../services/scryfall';
import {
  calculateArchetypeElo,
  getEloData,
  getPercentile,
} from '../services/eloHelpers';
import { Search, X, ArrowUpDown, TrendingUp, Star } from 'lucide-react';

interface ArchetypesPageProps {
  archetypes: Archetype[];
  cards: CubeCard[];
}

const COLOR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'W', label: 'W', className: 'bg-amber-100 text-amber-900' },
  { id: 'U', label: 'U', className: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', className: 'bg-neutral-600 text-white' },
  { id: 'R', label: 'R', className: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', className: 'bg-green-600 text-white' },
];

export function ArchetypesPage({ archetypes, cards }: ArchetypesPageProps) {
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'power' | 'name'>('power');
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const getCard = (name: string) => cardsByName.get(name);

  // Get featured cards for an archetype (first 4 key cards that exist in cube)
  const getFeaturedCards = (arch: Archetype): CubeCard[] => {
    return arch.keyCards
      .map(name => getCard(name))
      .filter((c): c is CubeCard => c !== undefined)
      .slice(0, 4);
  };

  // Calculate ELO-based archetype stats
  const archetypeEloStats = useMemo(() => {
    const stats: Record<string, ReturnType<typeof calculateArchetypeElo>> = {};
    archetypes.forEach(arch => {
      stats[arch.id] = calculateArchetypeElo(arch.keyCards);
    });
    return stats;
  }, [archetypes]);

  const filteredArchetypes = useMemo(() => {
    let result = [...archetypes];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower)
      );
    }

    if (colorFilter !== 'all') {
      result = result.filter(a => a.colors.includes(colorFilter));
    }

    result.sort((a, b) => {
      if (sortBy === 'power') {
        // Use ELO-based power if available
        const aElo = archetypeEloStats[a.id]?.normalizedPower || a.powerRating;
        const bElo = archetypeEloStats[b.id]?.normalizedPower || b.powerRating;
        return bElo - aElo;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [archetypes, search, colorFilter, sortBy, archetypeEloStats]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search archetypes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="flex gap-1">
          {COLOR_FILTERS.map(c => (
            <button
              key={c.id}
              onClick={() => setColorFilter(c.id)}
              className={`
                w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-all
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

        <button
          onClick={() => setSortBy(sortBy === 'power' ? 'name' : 'power')}
          className="flex items-center gap-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'power' ? 'Power' : 'Name'}
        </button>

        <span className="text-xs text-white/30 ml-auto">{filteredArchetypes.length} archetypes</span>
      </div>

      {/* Archetype Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredArchetypes.map((arch) => {
          const featuredCards = getFeaturedCards(arch);
          const eloStats = archetypeEloStats[arch.id];
          const displayPower = eloStats?.normalizedPower || arch.powerRating;

          return (
            <Card
              key={arch.id}
              className="group bg-black border-white/[0.06] overflow-hidden cursor-pointer hover:border-white/20 transition-all duration-300"
              onClick={() => setSelectedArchetype(arch)}
            >
              {/* Card Image Stack - Visual Preview */}
              <div className="relative h-44 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {featuredCards.length > 0 && (
                    <div className="flex -space-x-16 transform group-hover:scale-105 transition-transform duration-500">
                      {featuredCards.slice(0, 4).map((card, i) => (
                        <div
                          key={card.id}
                          className="relative w-28 aspect-[488/680] rounded-xl overflow-hidden shadow-2xl transform transition-transform duration-300"
                          style={{
                            transform: `rotate(${(i - 1.5) * 6}deg)`,
                            zIndex: 4 - i,
                          }}
                        >
                          <img
                            src={getCardImage(card)}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Power Badge - Using ELO-based power */}
                <div className={`
                  absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg
                  ${displayPower >= 10 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black' : ''}
                  ${displayPower >= 9 && displayPower < 10 ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white' : ''}
                  ${displayPower >= 7 && displayPower < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : ''}
                  ${displayPower < 7 ? 'bg-white/10 text-white/70 backdrop-blur-sm' : ''}
                `}>
                  {displayPower.toFixed(1)}
                </div>

                {/* Premium cards indicator */}
                {eloStats && eloStats.premiumCount > 0 && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400">{eloStats.premiumCount}</span>
                  </div>
                )}

                {/* Color Pips */}
                <div className="absolute top-3 left-3 flex gap-1">
                  {arch.colors.map(c => (
                    <div
                      key={c}
                      className={`w-6 h-6 rounded-full shadow-lg border border-black/20
                        ${c === 'W' ? 'bg-gradient-to-br from-amber-100 to-amber-200' : ''}
                        ${c === 'U' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : ''}
                        ${c === 'B' ? 'bg-gradient-to-br from-neutral-500 to-neutral-700' : ''}
                        ${c === 'R' ? 'bg-gradient-to-br from-red-400 to-red-600' : ''}
                        ${c === 'G' ? 'bg-gradient-to-br from-green-500 to-green-700' : ''}
                      `}
                    />
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white text-lg">{arch.name}</h3>
                  <Badge variant={arch.difficulty === 'Easy' ? 'success' : arch.difficulty === 'Expert' ? 'info' : arch.difficulty === 'Hard' ? 'danger' : 'warning'}>
                    {arch.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">{arch.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredArchetypes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No archetypes match your filters</p>
          <button
            onClick={() => { setSearch(''); setColorFilter('all'); }}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Archetype Detail Modal */}
      {selectedArchetype && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedArchetype(null)}
        >
          <div
            className="bg-black border border-white/10 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {selectedArchetype.colors.map(c => (
                    <div
                      key={c}
                      className={`w-8 h-8 rounded-full shadow-lg
                        ${c === 'W' ? 'bg-gradient-to-br from-amber-100 to-amber-200' : ''}
                        ${c === 'U' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : ''}
                        ${c === 'B' ? 'bg-gradient-to-br from-neutral-500 to-neutral-700' : ''}
                        ${c === 'R' ? 'bg-gradient-to-br from-red-400 to-red-600' : ''}
                        ${c === 'G' ? 'bg-gradient-to-br from-green-500 to-green-700' : ''}
                      `}
                    />
                  ))}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedArchetype.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant={selectedArchetype.difficulty === 'Easy' ? 'success' : selectedArchetype.difficulty === 'Expert' ? 'info' : selectedArchetype.difficulty === 'Hard' ? 'danger' : 'warning'}>
                      {selectedArchetype.difficulty}
                    </Badge>
                    {(() => {
                      const stats = archetypeEloStats[selectedArchetype.id];
                      const power = stats?.normalizedPower || selectedArchetype.powerRating;
                      return (
                        <span className={`font-bold ${
                          power >= 10 ? 'text-amber-400' :
                          power >= 9 ? 'text-purple-400' :
                          power >= 7 ? 'text-blue-400' :
                          'text-white/60'
                        }`}>
                          Power {power.toFixed(1)}
                        </span>
                      );
                    })()}
                    {archetypeEloStats[selectedArchetype.id]?.averageElo > 0 && (
                      <span className="text-xs text-white/40 font-mono">
                        (Avg ELO: {archetypeEloStats[selectedArchetype.id].averageElo})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedArchetype(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description & Strategy */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Overview</h3>
                  <p className="text-white/70 leading-relaxed">{selectedArchetype.description}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Gameplan</h3>
                  <p className="text-white/70 leading-relaxed">{selectedArchetype.strategy}</p>
                </div>
              </div>

              {/* Key Cards - Visual Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide">Key Cards</h3>
                  {archetypeEloStats[selectedArchetype.id]?.dataConfidence && (
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      archetypeEloStats[selectedArchetype.id].dataConfidence === 'high' ? 'bg-green-500/20 text-green-400' :
                      archetypeEloStats[selectedArchetype.id].dataConfidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {archetypeEloStats[selectedArchetype.id].dataConfidence} confidence
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {selectedArchetype.keyCards.map((name) => {
                    const card = getCard(name);
                    if (!card) return null;
                    const eloData = getEloData(name);
                    const percentile = getPercentile(name);
                    const archStats = archetypeEloStats[selectedArchetype.id];
                    const isAboveAvg = eloData && archStats && eloData.elo > archStats.averageElo;

                    return (
                      <div
                        key={card.id}
                        className={`relative aspect-[488/680] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform hover:z-10 shadow-lg ${
                          isAboveAvg ? 'ring-2 ring-amber-400/50' : ''
                        }`}
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className={`
                          absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${percentile >= 75 ? 'bg-amber-400 text-black' :
                            percentile >= 50 ? 'bg-purple-400 text-white' :
                            percentile >= 25 ? 'bg-blue-400 text-white' :
                            'bg-black/70 text-white'}
                        `}>
                          {card.powerLevel}
                        </div>
                        {/* Carries indicator */}
                        {isAboveAvg && (
                          <div className="absolute bottom-1 left-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ELO Breakdown */}
              {archetypeEloStats[selectedArchetype.id]?.breakdown.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    ELO Breakdown
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {archetypeEloStats[selectedArchetype.id].breakdown.slice(0, 8).map(({ name, elo, percentile }) => (
                      <div key={name} className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-lg">
                        <span className="text-xs text-white/70 truncate pr-2">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-white/40">{elo}</span>
                          <span className={`text-[10px] font-semibold ${
                            percentile >= 75 ? 'text-amber-400' :
                            percentile >= 50 ? 'text-purple-400' :
                            percentile >= 25 ? 'text-blue-400' :
                            'text-white/40'
                          }`}>
                            Top {100 - percentile}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft Tips */}
              <div>
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Draft Tips</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedArchetype.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-green-400/70 mt-0.5">✓</span>
                      <p className="text-sm text-white/60">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-[60] hidden lg:block pointer-events-none">
          <div className="bg-black border border-white/10 p-2 rounded-xl shadow-2xl">
            <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-56 rounded-lg" />
            <div className="mt-2 px-1">
              <div className="text-sm font-medium text-white">{hoveredCard.name}</div>
              <div className="text-xs text-white/40">{hoveredCard.type_line}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
