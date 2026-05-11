import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { Badge } from './ui/Badge';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  formatPickCount,
  formatCubeCount,
  getEloBarWidth,
  compareByElo,
} from '../services/eloHelpers';
import { Search, ArrowUpDown, X, ExternalLink, TrendingUp, Target, Users } from 'lucide-react';

interface CardBrowserProps {
  cards: CubeCard[];
}

type SortOption = 'name' | 'cmc' | 'power' | 'color' | 'elo';
type FilterColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'Colorless' | 'Multi' | 'all';

const roleLabels: Record<string, string> = {
  fast_mana: 'Fast Mana',
  removal: 'Removal',
  counterspell: 'Counter',
  card_advantage: 'Card Draw',
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
  { value: 'all' as FilterColor, label: 'All' },
  { value: 'W' as FilterColor, label: 'W', className: 'bg-amber-100 text-amber-900' },
  { value: 'U' as FilterColor, label: 'U', className: 'bg-blue-500 text-white' },
  { value: 'B' as FilterColor, label: 'B', className: 'bg-neutral-600 text-white' },
  { value: 'R' as FilterColor, label: 'R', className: 'bg-red-500 text-white' },
  { value: 'G' as FilterColor, label: 'G', className: 'bg-green-600 text-white' },
  { value: 'Multi' as FilterColor, label: 'M', className: 'bg-amber-500 text-black' },
  { value: 'Colorless' as FilterColor, label: 'C', className: 'bg-neutral-400 text-black' },
];

const TIER_FILTERS = [
  { value: null, label: 'All Tiers' },
  { value: 'S', label: 'S', min: 10, className: 'text-amber-400 bg-amber-400/10' },
  { value: 'A', label: 'A', min: 9, className: 'text-purple-400 bg-purple-400/10' },
  { value: 'B', label: 'B', min: 7, className: 'text-blue-400 bg-blue-400/10' },
  { value: 'C', label: 'C', min: 0, className: 'text-white/40 bg-white/5' },
];

const ROLE_OPTIONS = ['All Roles', 'Fast Mana', 'Tutor', 'Removal', 'Counter', 'Card Draw', 'Combo', 'Finisher', 'Aggro', 'Midrange', 'Land'];

function getTier(power: number): string {
  if (power >= 10) return 'S';
  if (power >= 9) return 'A';
  if (power >= 7) return 'B';
  return 'C';
}

export function CardBrowser({ cards }: CardBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('power');
  const [filterColor, setFilterColor] = useState<FilterColor>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('All Roles');
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const filteredAndSortedCards = useMemo(() => {
    let result = [...cards];

    // Search
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

    // Role filter
    if (filterRole !== 'All Roles') {
      const roleKey = Object.entries(roleLabels).find(([, v]) => v === filterRole)?.[0];
      if (roleKey) {
        result = result.filter((card) => card.role === roleKey);
      }
    }

    // Tier filter
    if (filterTier) {
      result = result.filter((card) => getTier(card.powerLevel) === filterTier);
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
        case 'elo':
          return compareByElo(a.name, b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [cards, searchTerm, sortBy, filterColor, filterType, filterRole, filterTier]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Color Filter */}
        <div className="flex gap-1">
          {COLOR_FILTERS.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterColor(c.value)}
              className={`
                w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-all
                ${c.value === 'all'
                  ? filterColor === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
                  : filterColor === c.value ? c.className + ' ring-2 ring-white/30' : c.className + ' opacity-40 hover:opacity-70'
                }
              `}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Tier Filter */}
        <div className="flex gap-1">
          {TIER_FILTERS.map((t) => (
            <button
              key={t.label}
              onClick={() => setFilterTier(t.value === filterTier ? null : t.value)}
              className={`
                px-2.5 py-1.5 rounded text-xs font-bold transition-all
                ${t.value === null
                  ? filterTier === null ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  : filterTier === t.value ? t.className + ' ring-1 ring-current' : 'bg-white/5 text-white/40 hover:bg-white/10'
                }
              `}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white/60 focus:outline-none"
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

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white/60 focus:outline-none"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Sort */}
        <button
          onClick={() => setSortBy(
            sortBy === 'power' ? 'elo' :
            sortBy === 'elo' ? 'name' :
            sortBy === 'name' ? 'cmc' :
            sortBy === 'cmc' ? 'color' : 'power'
          )}
          className="flex items-center gap-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'power' ? 'Power' :
           sortBy === 'elo' ? 'ELO' :
           sortBy === 'name' ? 'Name' :
           sortBy === 'cmc' ? 'CMC' : 'Color'}
        </button>
      </div>

      {/* Results count */}
      <div className="text-xs text-white/30">
        {filteredAndSortedCards.length} of {cards.length} cards
      </div>

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
              absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${card.powerLevel >= 10 ? 'bg-amber-400 text-black' : ''}
              ${card.powerLevel === 9 ? 'bg-purple-400 text-white' : ''}
              ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-blue-400 text-white' : ''}
              ${card.powerLevel < 7 ? 'bg-black/70 text-white/70' : ''}
            `}>
              {card.powerLevel}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedCards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No cards match your filters</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterColor('all');
              setFilterType('all');
              setFilterRole('All Roles');
              setFilterTier(null);
            }}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-black border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{selectedCard.name}</h2>
                    <span className={`
                      px-2 py-0.5 rounded text-sm font-bold
                      ${selectedCard.powerLevel >= 10 ? 'bg-amber-400/20 text-amber-400' : ''}
                      ${selectedCard.powerLevel === 9 ? 'bg-purple-400/20 text-purple-400' : ''}
                      ${selectedCard.powerLevel >= 7 && selectedCard.powerLevel < 9 ? 'bg-blue-400/20 text-blue-400' : ''}
                      ${selectedCard.powerLevel < 7 ? 'bg-white/10 text-white/50' : ''}
                    `}>
                      {getTier(selectedCard.powerLevel)} Tier
                    </span>
                  </div>
                  <p className="text-white/40 text-sm mt-1">{selectedCard.type_line}</p>
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
                <div className="aspect-[488/680] rounded-xl overflow-hidden bg-white/5">
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
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{selectedCard.mana_cost || 'No cost'}</Badge>
                    <Badge variant="default">CMC {selectedCard.cmc}</Badge>
                    <Badge variant="info">{roleLabels[selectedCard.role] || selectedCard.role}</Badge>
                  </div>

                  {selectedCard.oracle_text && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">{selectedCard.oracle_text}</p>
                    </div>
                  )}

                  {selectedCard.power && selectedCard.toughness && (
                    <div className="text-lg font-mono text-white">
                      {selectedCard.power}/{selectedCard.toughness}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide">Power Level</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-5 rounded-sm ${
                              i < selectedCard.powerLevel
                                ? selectedCard.powerLevel >= 10 ? 'bg-amber-400' :
                                  selectedCard.powerLevel >= 9 ? 'bg-purple-400' :
                                  selectedCard.powerLevel >= 7 ? 'bg-blue-400' : 'bg-white/40'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-white font-mono">{selectedCard.powerLevel}/10</span>
                    </div>
                  </div>

                  {/* Draft Stats Section */}
                  {(() => {
                    const eloData = getEloData(selectedCard.name);
                    if (!eloData) return null;

                    const percentile = getPercentile(selectedCard.name);
                    const wheelLikelihood = getWheelLikelihood(selectedCard.name);
                    const barWidth = getEloBarWidth(selectedCard.name);

                    return (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-white/40" />
                          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide">Draft Stats</h4>
                        </div>

                        {/* ELO Rating with bar */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white/60">ELO Rating</span>
                            <span className="text-lg font-mono font-semibold text-white">{Math.round(eloData.elo)}</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Percentile</div>
                            <div className={`text-lg font-semibold ${
                              percentile >= 75 ? 'text-amber-400' :
                              percentile >= 50 ? 'text-purple-400' :
                              percentile >= 25 ? 'text-blue-400' :
                              'text-white/60'
                            }`}>
                              Top {100 - percentile}%
                            </div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Wheel Likelihood</div>
                            <div className={`text-lg font-semibold ${
                              wheelLikelihood === 'likely' ? 'text-green-400' :
                              wheelLikelihood === 'maybe' ? 'text-amber-400' :
                              'text-red-400'
                            }`}>
                              {wheelLikelihood === 'likely' ? 'Likely' :
                               wheelLikelihood === 'maybe' ? 'Maybe' :
                               'Unlikely'}
                            </div>
                          </div>
                        </div>

                        {/* Pick & Cube Stats */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-white/50">
                            <Target className="w-4 h-4" />
                            <span>Picked <span className="font-semibold text-white">{formatPickCount(eloData.pickCount)}</span> times</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/50">
                            <Users className="w-4 h-4" />
                            <span>In <span className="font-semibold text-white">{formatCubeCount(eloData.cubeCount)}</span> cubes</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedCard.archetypes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Archetypes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCard.archetypes.map((arch) => (
                          <Badge key={arch} variant="info">{arch}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCard.synergyTags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Synergy Tags</h4>
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
                    className="inline-flex items-center gap-2 text-white/50 hover:text-white/70 text-sm mt-2"
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
        <div className="fixed bottom-6 right-6 z-50 hidden lg:block pointer-events-none">
          <div className="bg-black border border-white/10 p-3 rounded-xl shadow-2xl w-64">
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="w-full rounded-lg"
            />
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white text-sm truncate max-w-[140px]">{hoveredCard.name}</h4>
                <span className={`
                  text-xs font-bold px-1.5 py-0.5 rounded
                  ${hoveredCard.powerLevel >= 10 ? 'bg-amber-400/20 text-amber-400' : ''}
                  ${hoveredCard.powerLevel === 9 ? 'bg-purple-400/20 text-purple-400' : ''}
                  ${hoveredCard.powerLevel >= 7 && hoveredCard.powerLevel < 9 ? 'bg-blue-400/20 text-blue-400' : ''}
                  ${hoveredCard.powerLevel < 7 ? 'bg-white/10 text-white/50' : ''}
                `}>
                  {hoveredCard.powerLevel}
                </span>
              </div>
              <p className="text-xs text-white/40">{hoveredCard.type_line}</p>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px]">
                  {roleLabels[hoveredCard.role] || hoveredCard.role}
                </Badge>
                {(() => {
                  const eloData = getEloData(hoveredCard.name);
                  if (!eloData) return null;
                  const percentile = getPercentile(hoveredCard.name);
                  return (
                    <span className={`text-[10px] font-medium ${
                      percentile >= 75 ? 'text-amber-400' :
                      percentile >= 50 ? 'text-purple-400' :
                      percentile >= 25 ? 'text-blue-400' :
                      'text-white/40'
                    }`}>
                      ELO {Math.round(eloData.elo)}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
