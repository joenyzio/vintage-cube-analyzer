import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Search, ArrowUpDown } from 'lucide-react';
import { getCardImage } from '../services/scryfall';

interface PowerRankingsProps {
  cards: CubeCard[];
}

const roleLabels: Record<string, string> = {
  fast_mana: 'Fast Mana',
  removal: 'Removal',
  counterspell: 'Counter',
  card_advantage: 'Card Advantage',
  finisher: 'Finisher',
  combo_piece: 'Combo',
  aggro_creature: 'Aggro',
  midrange_threat: 'Midrange',
  control_finisher: 'Control',
  enabler: 'Enabler',
  tutor: 'Tutor',
  reanimation_target: 'Reanimate',
  land: 'Land',
  utility: 'Utility',
};

const COLOR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'W', label: 'W', className: 'bg-amber-100 text-amber-900' },
  { id: 'U', label: 'U', className: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', className: 'bg-neutral-600 text-white' },
  { id: 'R', label: 'R', className: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', className: 'bg-green-600 text-white' },
  { id: 'C', label: 'C', className: 'bg-neutral-400 text-black' },
];

const TIER_CONFIG = {
  S: { min: 10, label: 'S Tier', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  A: { min: 9, label: 'A Tier', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  B: { min: 7, label: 'B Tier', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  C: { min: 0, label: 'C Tier', color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' },
};

function getTier(power: number): keyof typeof TIER_CONFIG {
  if (power >= 10) return 'S';
  if (power >= 9) return 'A';
  if (power >= 7) return 'B';
  return 'C';
}

const ROLE_FILTERS = ['All', 'Fast Mana', 'Tutor', 'Removal', 'Counter', 'Card Advantage', 'Combo', 'Finisher'];

export function PowerRankings({ cards }: PowerRankingsProps) {
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'power' | 'name' | 'color'>('power');
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  // Stats
  const tierCounts = useMemo(() => {
    const counts = { S: 0, A: 0, B: 0, C: 0 };
    cards.forEach(c => {
      counts[getTier(c.powerLevel)]++;
    });
    return counts;
  }, [cards]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.type_line?.toLowerCase().includes(lower)
      );
    }

    // Color filter
    if (colorFilter !== 'all') {
      if (colorFilter === 'C') {
        result = result.filter(c => !c.colors || c.colors.length === 0);
      } else {
        result = result.filter(c => c.colors?.includes(colorFilter) || c.color_identity?.includes(colorFilter));
      }
    }

    // Role filter
    if (roleFilter !== 'All') {
      const roleKey = Object.entries(roleLabels).find(([, v]) => v === roleFilter)?.[0];
      if (roleKey) {
        result = result.filter(c => c.role === roleKey);
      }
    }

    // Tier filter
    if (tierFilter) {
      result = result.filter(c => getTier(c.powerLevel) === tierFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'power') return b.powerLevel - a.powerLevel;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'color') {
        const colorOrder = 'WUBRGC';
        const aColor = a.colors?.[0] || 'C';
        const bColor = b.colors?.[0] || 'C';
        return colorOrder.indexOf(aColor) - colorOrder.indexOf(bColor);
      }
      return 0;
    });

    return result;
  }, [cards, search, colorFilter, roleFilter, tierFilter, sortBy]);

  // Group by tier for display
  const groupedByTier = useMemo(() => {
    const groups: Record<string, CubeCard[]> = { S: [], A: [], B: [], C: [] };
    filteredCards.forEach(c => {
      groups[getTier(c.powerLevel)].push(c);
    });
    return groups;
  }, [filteredCards]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search cards..."
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

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 focus:outline-none"
        >
          {ROLE_FILTERS.map(r => (
            <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>
          ))}
        </select>

        {/* Sort */}
        <button
          onClick={() => setSortBy(sortBy === 'power' ? 'name' : sortBy === 'name' ? 'color' : 'power')}
          className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'power' ? 'Power' : sortBy === 'name' ? 'Name' : 'Color'}
        </button>
      </div>

      {/* Tier Stats */}
      <div className="flex gap-2">
        {(['S', 'A', 'B', 'C'] as const).map(tier => {
          const config = TIER_CONFIG[tier];
          const isActive = tierFilter === tier;
          return (
            <button
              key={tier}
              onClick={() => setTierFilter(isActive ? null : tier)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                ${isActive
                  ? `${config.bg} ${config.color} ring-1 ${config.border}`
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
                }
              `}
            >
              <span className={`font-bold ${isActive ? '' : config.color}`}>{tier}</span>
              <span className="font-mono text-xs">{tierCounts[tier]}</span>
            </button>
          );
        })}
        <div className="ml-auto text-xs text-white/30 self-center">
          {filteredCards.length} cards
        </div>
      </div>

      {/* Card List by Tier */}
      <div className="space-y-6">
        {(['S', 'A', 'B', 'C'] as const).map(tier => {
          const tierCards = groupedByTier[tier];
          if (tierCards.length === 0) return null;
          const config = TIER_CONFIG[tier];

          return (
            <div key={tier}>
              {/* Tier Header */}
              <div className={`flex items-center gap-3 mb-2 pb-2 border-b ${config.border}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${config.bg} ${config.color}`}>
                  {tier}
                </div>
                <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                <span className="text-xs text-white/30">{tierCards.length} cards</span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {tierCards.map((card, idx) => (
                  <Card
                    key={card.id}
                    className="bg-[#111] border-white/8 p-2 hover:bg-white/5 transition-all cursor-pointer group"
                    onMouseEnter={() => setHoveredCard(card)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Card Image */}
                    <div className="aspect-[488/680] rounded-lg overflow-hidden mb-2 relative">
                      <img
                        src={getCardImage(card)}
                        alt={card.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      {/* Power Badge */}
                      <div className={`
                        absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${card.powerLevel >= 10 ? 'bg-amber-400 text-black' : card.powerLevel >= 9 ? 'bg-purple-400 text-white' : 'bg-black/70 text-white'}
                      `}>
                        {card.powerLevel}
                      </div>
                      {/* Rank for top 3 in tier */}
                      {idx < 3 && tier === 'S' && (
                        <div className={`
                          absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-neutral-300 text-black' : 'bg-amber-700 text-white'}
                        `}>
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Card Info */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-white truncate">{card.name}</h4>
                      <div className="flex items-center gap-1">
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          {roleLabels[card.role] || card.role}
                        </Badge>
                        {/* Color dots */}
                        {card.colors && card.colors.length > 0 && (
                          <div className="flex gap-0.5 ml-auto">
                            {card.colors.map(c => (
                              <div
                                key={c}
                                className={`w-2.5 h-2.5 rounded-full
                                  ${c === 'W' ? 'bg-amber-100' : ''}
                                  ${c === 'U' ? 'bg-blue-500' : ''}
                                  ${c === 'B' ? 'bg-neutral-500' : ''}
                                  ${c === 'R' ? 'bg-red-500' : ''}
                                  ${c === 'G' ? 'bg-green-500' : ''}
                                `}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No cards match your filters</p>
          <button
            onClick={() => {
              setSearch('');
              setColorFilter('all');
              setRoleFilter('All');
              setTierFilter(null);
            }}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 hidden lg:block pointer-events-none">
          <div className="bg-[#111] border border-white/10 p-2 rounded-xl shadow-2xl">
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="w-56 rounded-lg"
            />
            <div className="mt-2 px-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white text-sm">{hoveredCard.name}</h4>
                <span className={`text-sm font-bold ${
                  hoveredCard.powerLevel >= 10 ? 'text-amber-400' :
                  hoveredCard.powerLevel >= 9 ? 'text-purple-400' :
                  hoveredCard.powerLevel >= 7 ? 'text-blue-400' : 'text-white/40'
                }`}>
                  {hoveredCard.powerLevel}
                </span>
              </div>
              <p className="text-xs text-white/40">{hoveredCard.type_line}</p>
              <Badge variant="default" className="mt-1 text-xs">
                {roleLabels[hoveredCard.role] || hoveredCard.role}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
