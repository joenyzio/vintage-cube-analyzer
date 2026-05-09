import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { getCardImage } from '../services/scryfall';
import { Search, Filter, SortAsc, X, ExternalLink } from 'lucide-react';

interface CardBrowserProps {
  cards: CubeCard[];
}

type SortOption = 'name' | 'cmc' | 'power' | 'color';
type FilterColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'Colorless' | 'Multi' | 'all';

export function CardBrowser({ cards }: CardBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('power');
  const [filterColor, setFilterColor] = useState<FilterColor>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const filteredAndSortedCards = useMemo(() => {
    let result = [...cards];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (card) =>
          card.name.toLowerCase().includes(term) ||
          card.type_line?.toLowerCase().includes(term) ||
          card.oracle_text?.toLowerCase().includes(term)
      );
    }

    if (filterColor !== 'all') {
      result = result.filter((card) => {
        const colors = card.color_identity || [];
        if (filterColor === 'Colorless') return colors.length === 0;
        if (filterColor === 'Multi') return colors.length > 1;
        return colors.length === 1 && colors[0] === filterColor;
      });
    }

    if (filterType !== 'all') {
      result = result.filter((card) =>
        card.type_line?.toLowerCase().includes(filterType.toLowerCase())
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cmc':
          return (a.cmc || 0) - (b.cmc || 0);
        case 'power':
          return b.powerLevel - a.powerLevel;
        case 'color':
          return (a.color_identity?.join('') || 'Z').localeCompare(
            b.color_identity?.join('') || 'Z'
          );
        default:
          return 0;
      }
    });

    return result;
  }, [cards, searchTerm, sortBy, filterColor, filterType]);

  const colorOptions: { value: FilterColor; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'bg-white/20' },
    { value: 'W', label: 'W', color: 'bg-amber-100 text-black' },
    { value: 'U', label: 'U', color: 'bg-blue-500' },
    { value: 'B', label: 'B', color: 'bg-neutral-600 border border-neutral-500' },
    { value: 'R', label: 'R', color: 'bg-red-500' },
    { value: 'G', label: 'G', color: 'bg-green-600' },
    { value: 'Multi', label: 'M', color: 'bg-amber-500' },
    { value: 'Colorless', label: 'C', color: 'bg-neutral-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="bg-[#111] border-white/8">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Color Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/30" />
            <div className="flex gap-1">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterColor(opt.value)}
                  className={`
                    w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-all
                    ${opt.color}
                    ${filterColor === opt.value ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-black' : 'opacity-60 hover:opacity-100'}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20"
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

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-white/30" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20"
            >
              <option value="power">Power Level</option>
              <option value="name">Name</option>
              <option value="cmc">Mana Value</option>
              <option value="color">Color</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-white/30">
          Showing {filteredAndSortedCards.length} of {cards.length} cards
        </div>
      </Card>

      {/* Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredAndSortedCards.map((card) => (
          <div
            key={card.id}
            className="group relative cursor-pointer"
            onClick={() => setSelectedCard(card)}
            onMouseEnter={() => setHoveredCard(card)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="aspect-[488/680] rounded-xl overflow-hidden bg-white/5 shadow-lg transition-all duration-200 group-hover:scale-[1.02] group-hover:-translate-y-1">
              {getCardImage(card) ? (
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30 text-sm p-2 text-center">
                  {card.name}
                </div>
              )}
            </div>
            {/* Power indicator */}
            <div className={`
              absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono
              ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : ''}
              ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-white/80 text-black' : ''}
              ${card.powerLevel < 7 ? 'bg-black/60 text-white/70' : ''}
            `}>
              {card.powerLevel}
            </div>
          </div>
        ))}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-[#111] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedCard.name}</h2>
                  <p className="text-white/40 text-sm">{selectedCard.type_line}</p>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Image */}
                <div className="aspect-[488/680] rounded-lg overflow-hidden bg-white/5">
                  {getCardImage(selectedCard) && (
                    <img
                      src={getCardImage(selectedCard)}
                      alt={selectedCard.name}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Card Details */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="mana" color={selectedCard.color_identity?.[0] as any || 'colorless'}>
                      {selectedCard.mana_cost || 'No cost'}
                    </Badge>
                    <Badge variant="default">CMC {selectedCard.cmc}</Badge>
                  </div>

                  {selectedCard.oracle_text && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <p className="text-white/70 text-sm whitespace-pre-wrap">{selectedCard.oracle_text}</p>
                    </div>
                  )}

                  {selectedCard.power && selectedCard.toughness && (
                    <div className="text-lg font-mono text-white">
                      {selectedCard.power}/{selectedCard.toughness}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium text-white/60 text-sm">Power Level</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-4 rounded-sm ${
                              i < selectedCard.powerLevel
                                ? 'bg-white/60'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-white/60 font-mono text-sm">{selectedCard.powerLevel}/10</span>
                    </div>
                  </div>

                  {selectedCard.archetypes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-white/60 text-sm mb-2">Archetypes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCard.archetypes.map((arch) => (
                          <Badge key={arch} variant="info">{arch}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCard.synergyTags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-white/60 text-sm mb-2">Synergy Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCard.synergyTags.map((tag) => (
                          <Badge key={tag} variant="default">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <a
                    href={`https://scryfall.com/search?q=${encodeURIComponent(selectedCard.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white/50 hover:text-white/70 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Scryfall
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Hover Preview */}
      {hoveredCard && !selectedCard && (
        <div className="fixed bottom-6 right-6 z-50 hidden lg:block animate-in fade-in duration-150">
          <div className="bg-[#111] border border-white/10 p-3 rounded-xl shadow-2xl">
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="w-56 rounded-lg"
            />
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white text-sm truncate max-w-[180px]">{hoveredCard.name}</h4>
                <span className="text-white/40 font-mono text-xs">{hoveredCard.powerLevel}</span>
              </div>
              <p className="text-xs text-white/30">{hoveredCard.type_line}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
