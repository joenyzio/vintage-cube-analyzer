import { useState, useMemo } from 'react';
import type { Archetype, CubeCard } from '../types/card';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { getCardImage } from '../services/scryfall';
import { Search, ChevronDown, ChevronUp, X, Filter, ArrowUpDown } from 'lucide-react';

interface ArchetypesPageProps {
  archetypes: Archetype[];
  cards: CubeCard[];
}

const TIER_CONFIG = {
  S: { min: 10, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  A: { min: 9, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  B: { min: 7, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  C: { min: 0, color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' },
};

const COLOR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'W', label: 'W', className: 'bg-amber-100 text-amber-900' },
  { id: 'U', label: 'U', className: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', className: 'bg-neutral-600 text-white' },
  { id: 'R', label: 'R', className: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', className: 'bg-green-600 text-white' },
];

const DIFFICULTY_FILTERS = ['All', 'Easy', 'Medium', 'Hard', 'Expert'];

function getTier(power: number): keyof typeof TIER_CONFIG {
  if (power >= 10) return 'S';
  if (power >= 9) return 'A';
  if (power >= 7) return 'B';
  return 'C';
}

export function ArchetypesPage({ archetypes, cards }: ArchetypesPageProps) {
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'power' | 'name' | 'difficulty'>('power');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const filteredArchetypes = useMemo(() => {
    let result = [...archetypes];

    // Search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower) ||
        a.keyCards.some(c => c.toLowerCase().includes(lower))
      );
    }

    // Color filter
    if (colorFilter !== 'all') {
      result = result.filter(a => a.colors.includes(colorFilter));
    }

    // Difficulty filter
    if (difficultyFilter !== 'All') {
      result = result.filter(a => a.difficulty === difficultyFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'power') return b.powerRating - a.powerRating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'difficulty') {
        const order = { Easy: 1, Medium: 2, Hard: 3, Expert: 4 };
        return order[a.difficulty] - order[b.difficulty];
      }
      return 0;
    });

    return result;
  }, [archetypes, search, colorFilter, difficultyFilter, sortBy]);

  const getCard = (name: string) => cardsByName.get(name);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
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

        {/* Color Filter */}
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

        {/* Difficulty Filter */}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 focus:outline-none"
        >
          {DIFFICULTY_FILTERS.map(d => (
            <option key={d} value={d}>{d === 'All' ? 'All Difficulties' : d}</option>
          ))}
        </select>

        {/* Sort */}
        <button
          onClick={() => setSortBy(sortBy === 'power' ? 'name' : sortBy === 'name' ? 'difficulty' : 'power')}
          className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'power' ? 'Power' : sortBy === 'name' ? 'Name' : 'Difficulty'}
        </button>
      </div>

      {/* Results count */}
      <div className="text-xs text-white/30">
        {filteredArchetypes.length} archetype{filteredArchetypes.length !== 1 ? 's' : ''}
      </div>

      {/* Archetypes List */}
      <div className="space-y-2">
        {filteredArchetypes.map((arch) => {
          const tier = getTier(arch.powerRating);
          const tierConfig = TIER_CONFIG[tier];
          const isExpanded = expandedId === arch.id;
          const keyCardObjects = arch.keyCards.map(name => getCard(name)).filter(Boolean) as CubeCard[];

          return (
            <Card
              key={arch.id}
              className={`bg-[#111] border-white/8 overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-white/20' : ''}`}
            >
              {/* Header Row - Always Visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : arch.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/2 transition-colors"
              >
                {/* Tier Badge */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${tierConfig.bg} ${tierConfig.color} ${tierConfig.border} border`}>
                  {tier}
                </div>

                {/* Colors */}
                <div className="flex gap-0.5">
                  {arch.colors.map(c => (
                    <div
                      key={c}
                      className={`w-5 h-5 rounded-full
                        ${c === 'W' ? 'bg-amber-100' : ''}
                        ${c === 'U' ? 'bg-blue-500' : ''}
                        ${c === 'B' ? 'bg-neutral-500' : ''}
                        ${c === 'R' ? 'bg-red-500' : ''}
                        ${c === 'G' ? 'bg-green-500' : ''}
                      `}
                    />
                  ))}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{arch.name}</h3>
                    <Badge variant={arch.difficulty === 'Easy' ? 'success' : arch.difficulty === 'Expert' ? 'info' : arch.difficulty === 'Hard' ? 'danger' : 'warning'}>
                      {arch.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/40 truncate">{arch.description}</p>
                </div>

                {/* Power */}
                <div className="text-right hidden sm:block">
                  <div className="text-lg font-mono text-white">{arch.powerRating}</div>
                  <div className="text-[10px] text-white/30 uppercase">Power</div>
                </div>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-5">
                  {/* Top Row: Power + Description */}
                  <div className="pt-4 flex gap-6">
                    {/* Power Rating */}
                    <div className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{arch.powerRating}</span>
                      </div>
                      <div className="text-[10px] text-white/30 mt-1 uppercase">Power</div>
                    </div>

                    {/* Description + Strategy */}
                    <div className="flex-1 space-y-3">
                      <p className="text-sm text-white/60">{arch.description}</p>
                      <div>
                        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">Gameplan</h4>
                        <p className="text-sm text-white/80">{arch.strategy}</p>
                      </div>
                    </div>
                  </div>

                  {/* Key Cards with Images */}
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Key Cards ({arch.keyCards.length})</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {keyCardObjects.map((card) => (
                        <div
                          key={card.id}
                          className="relative w-20 flex-shrink-0 aspect-[488/680] rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:scale-105 transition-transform"
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
                            absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold
                            ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : 'bg-black/70 text-white'}
                          `}>
                            {card.powerLevel}
                          </div>
                        </div>
                      ))}
                      {/* Show missing cards as text if not in cube */}
                      {arch.keyCards.filter(name => !getCard(name)).length > 0 && (
                        <div className="flex-shrink-0 flex items-center px-3 text-xs text-white/30">
                          +{arch.keyCards.filter(name => !getCard(name)).length} not in cube
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Draft Tips */}
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Draft Tips</h4>
                    <ul className="space-y-1.5">
                      {arch.tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-white/60 flex items-start gap-2">
                          <span className="text-green-400/60 mt-0.5">✓</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Matchup hint */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-white/30">
                      Tier {tier} • {arch.difficulty} difficulty
                    </span>
                    <span className="text-white/40">
                      Hover cards for preview
                    </span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredArchetypes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No archetypes match your filters</p>
          <button
            onClick={() => {
              setSearch('');
              setColorFilter('all');
              setDifficultyFilter('All');
            }}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 hidden lg:block">
          <div className="bg-[#111] border border-white/10 p-2 rounded-xl shadow-2xl">
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="w-56 rounded-lg"
            />
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
