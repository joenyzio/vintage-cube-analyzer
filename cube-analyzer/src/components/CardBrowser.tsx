import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { getCardImage } from '../services/scryfall';
import { Search, Filter, SortAsc, X, ExternalLink, Sparkles } from 'lucide-react';

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

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (card) =>
          card.name.toLowerCase().includes(term) ||
          card.type_line?.toLowerCase().includes(term) ||
          card.oracle_text?.toLowerCase().includes(term)
      );
    }

    // Color filter
    if (filterColor !== 'all') {
      result = result.filter((card) => {
        const colors = card.color_identity || [];
        if (filterColor === 'Colorless') return colors.length === 0;
        if (filterColor === 'Multi') return colors.length > 1;
        return colors.length === 1 && colors[0] === filterColor;
      });
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter((card) =>
        card.type_line?.toLowerCase().includes(filterType.toLowerCase())
      );
    }

    // Sort
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
    { value: 'all', label: 'All', color: 'bg-gray-600' },
    { value: 'W', label: 'W', color: 'bg-amber-100 text-black' },
    { value: 'U', label: 'U', color: 'bg-blue-600' },
    { value: 'B', label: 'B', color: 'bg-gray-800 border border-gray-600' },
    { value: 'R', label: 'R', color: 'bg-red-600' },
    { value: 'G', label: 'G', color: 'bg-green-600' },
    { value: 'Multi', label: 'Multi', color: 'bg-gradient-to-r from-yellow-500 to-amber-600' },
    { value: 'Colorless', label: 'C', color: 'bg-gray-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Color Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterColor(opt.value)}
                  className={`
                    w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center
                    ${opt.color}
                    ${filterColor === opt.value ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''}
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
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
            <SortAsc className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="power">Power Level</option>
              <option value="name">Name</option>
              <option value="cmc">Mana Value</option>
              <option value="color">Color</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-400">
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
            <div className="aspect-[488/680] rounded-xl overflow-hidden bg-gray-800 shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-purple-500/30 group-hover:scale-105 group-hover:-translate-y-1">
              {getCardImage(card) ? (
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm p-2 text-center">
                  {card.name}
                </div>
              )}
            </div>
            {/* Power indicator */}
            <div className={`
              absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${card.powerLevel >= 9 ? 'bg-red-500 text-white' : ''}
              ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-yellow-500 text-black' : ''}
              ${card.powerLevel < 7 ? 'bg-gray-700 text-white' : ''}
            `}>
              {card.powerLevel}
            </div>
          </div>
        ))}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCard.name}</h2>
                  <p className="text-gray-400">{selectedCard.type_line}</p>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Image */}
                <div className="aspect-[488/680] rounded-lg overflow-hidden bg-gray-800">
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
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <p className="text-gray-300 whitespace-pre-wrap">{selectedCard.oracle_text}</p>
                    </div>
                  )}

                  {selectedCard.power && selectedCard.toughness && (
                    <div className="text-lg font-bold text-white">
                      {selectedCard.power}/{selectedCard.toughness}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">Analysis</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Power Level:</span>
                      <div className="flex">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-4 mx-0.5 rounded-sm ${
                              i < selectedCard.powerLevel
                                ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                                : 'bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-purple-400 font-bold">{selectedCard.powerLevel}/10</span>
                    </div>
                  </div>

                  {selectedCard.archetypes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-2">Archetypes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCard.archetypes.map((arch) => (
                          <Badge key={arch} variant="info">{arch}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCard.synergyTags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-2">Synergy Tags</h4>
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
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
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
        <div className="fixed bottom-6 right-6 z-50 hidden lg:block animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-gray-900 p-4 rounded-2xl border border-gray-700 shadow-2xl">
              <img
                src={getCardImage(hoveredCard)}
                alt={hoveredCard.name}
                className="w-64 rounded-xl shadow-lg"
              />
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white truncate max-w-[200px]">{hoveredCard.name}</h4>
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${hoveredCard.powerLevel >= 9 ? 'bg-yellow-500 text-black' : ''}
                    ${hoveredCard.powerLevel >= 7 && hoveredCard.powerLevel < 9 ? 'bg-purple-500 text-white' : ''}
                    ${hoveredCard.powerLevel < 7 ? 'bg-gray-700 text-white' : ''}
                  `}>
                    {hoveredCard.powerLevel}
                  </div>
                </div>
                <p className="text-sm text-gray-400">{hoveredCard.type_line}</p>
                {hoveredCard.archetypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hoveredCard.archetypes.slice(0, 3).map(arch => (
                      <span key={arch} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                        {arch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
