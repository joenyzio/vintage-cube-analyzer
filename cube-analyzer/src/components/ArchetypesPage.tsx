import { useState, useMemo } from 'react';
import type { Archetype, CubeCard } from '../types/card';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { getCardImage } from '../services/scryfall';
import { Search, X, ArrowUpDown } from 'lucide-react';

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
      if (sortBy === 'power') return b.powerRating - a.powerRating;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [archetypes, search, colorFilter, sortBy]);

  const getCard = (name: string) => cardsByName.get(name);

  // Get featured cards for an archetype (first 4 key cards that exist in cube)
  const getFeaturedCards = (arch: Archetype): CubeCard[] => {
    return arch.keyCards
      .map(name => getCard(name))
      .filter((c): c is CubeCard => c !== undefined)
      .slice(0, 4);
  };

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
            className="w-full pl-9 pr-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
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
          className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
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

          return (
            <Card
              key={arch.id}
              className="group bg-[#0a0a0a] border-white/8 overflow-hidden cursor-pointer hover:border-white/20 transition-all duration-300"
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

                {/* Power Badge */}
                <div className={`
                  absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg
                  ${arch.powerRating >= 10 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black' : ''}
                  ${arch.powerRating === 9 ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white' : ''}
                  ${arch.powerRating >= 7 && arch.powerRating < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : ''}
                  ${arch.powerRating < 7 ? 'bg-white/10 text-white/70 backdrop-blur-sm' : ''}
                `}>
                  {arch.powerRating}
                </div>

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
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto"
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
                    <span className={`font-bold ${
                      selectedArchetype.powerRating >= 10 ? 'text-amber-400' :
                      selectedArchetype.powerRating >= 9 ? 'text-purple-400' :
                      'text-blue-400'
                    }`}>
                      Power {selectedArchetype.powerRating}
                    </span>
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
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Key Cards</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {selectedArchetype.keyCards.map((name) => {
                    const card = getCard(name);
                    if (!card) return null;
                    return (
                      <div
                        key={card.id}
                        className="relative aspect-[488/680] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform hover:z-10 shadow-lg"
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className={`
                          absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : 'bg-black/70 text-white'}
                        `}>
                          {card.powerLevel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
          <div className="bg-[#111] border border-white/10 p-2 rounded-xl shadow-2xl">
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
