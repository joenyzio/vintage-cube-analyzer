import { useState, useMemo } from 'react';
import type { CubeCard, Archetype } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Search, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface SynergyExplorerProps {
  cards: CubeCard[];
  archetypes: Archetype[];
}

interface SynergyCategory {
  id: string;
  name: string;
  color: string;
  cards: string[];
}

const SYNERGY_CATEGORIES: SynergyCategory[] = [
  {
    id: 'reanimator',
    name: 'Reanimator',
    color: 'bg-purple-500',
    cards: ['Entomb', 'Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Necromancy', 'Recurring Nightmare'],
  },
  {
    id: 'storm',
    name: 'Storm',
    color: 'bg-blue-500',
    cards: ['Underworld Breach', 'Brain Freeze', "Lion's Eye Diamond", 'Time Spiral', 'Frantic Search', "Yawgmoth's Will", 'Echo of Eons'],
  },
  {
    id: 'artifacts',
    name: 'Artifacts',
    color: 'bg-amber-500',
    cards: ['Tinker', 'Tolarian Academy', 'Blightsteel Colossus', 'Mana Crypt', 'Sol Ring', 'Mox Sapphire'],
  },
  {
    id: 'cheaty',
    name: 'Cheat In Play',
    color: 'bg-red-500',
    cards: ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Channel', 'Emrakul, the Aeons Torn', 'Omniscience'],
  },
  {
    id: 'blink',
    name: 'Blink',
    color: 'bg-white',
    cards: ['Ephemerate', 'Restoration Angel', 'Flickerwisp', 'Solitude', 'Skyclave Apparition'],
  },
  {
    id: 'green-ramp',
    name: 'Green Ramp',
    color: 'bg-green-500',
    cards: ['Natural Order', "Green Sun's Zenith", 'Craterhoof Behemoth', 'Survival of the Fittest', 'Birds of Paradise', 'Llanowar Elves', 'Noble Hierarch'],
  },
  {
    id: 'control',
    name: 'Control',
    color: 'bg-sky-500',
    cards: ['Jace, the Mind Sculptor', 'Force of Will', 'Counterspell', 'Mana Drain', 'Brainstorm', 'Ponder', 'Snapcaster Mage'],
  },
  {
    id: 'aggro',
    name: 'Aggro',
    color: 'bg-orange-500',
    cards: ['Ragavan, Nimble Pilferer', 'Lightning Bolt', 'Thoughtseize', 'Dark Confidant', 'Orcish Bowmasters'],
  },
];

const SYNERGY_MAP: Record<string, { partners: string[]; strength: 'core' | 'strong' | 'good' }[]> = {
  'Entomb': [
    { partners: ['Reanimate', 'Animate Dead', 'Necromancy', 'Shallow Grave'], strength: 'core' },
    { partners: ['Griselbrand', 'Archon of Cruelty', 'Atraxa, Grand Unifier'], strength: 'strong' },
  ],
  'Reanimate': [
    { partners: ['Entomb', 'Griselbrand', 'Archon of Cruelty'], strength: 'core' },
    { partners: ['Dark Ritual', 'Atraxa, Grand Unifier'], strength: 'strong' },
  ],
  'Griselbrand': [
    { partners: ['Reanimate', 'Animate Dead', 'Entomb'], strength: 'core' },
    { partners: ['Show and Tell', 'Sneak Attack'], strength: 'strong' },
  ],
  'Underworld Breach': [
    { partners: ["Lion's Eye Diamond", 'Brain Freeze'], strength: 'core' },
    { partners: ['Lotus Petal', 'Dark Ritual', 'Frantic Search'], strength: 'strong' },
  ],
  'Brain Freeze': [
    { partners: ['Underworld Breach', "Lion's Eye Diamond"], strength: 'core' },
    { partners: ['Time Spiral', 'Frantic Search'], strength: 'strong' },
  ],
  "Lion's Eye Diamond": [
    { partners: ['Underworld Breach', 'Echo of Eons'], strength: 'core' },
    { partners: ['Brain Freeze', "Yawgmoth's Will"], strength: 'strong' },
  ],
  'Tinker': [
    { partners: ['Blightsteel Colossus'], strength: 'core' },
    { partners: ['Mana Crypt', 'Sol Ring', 'Mox Sapphire', 'Tolarian Academy'], strength: 'strong' },
  ],
  'Tolarian Academy': [
    { partners: ['Mana Crypt', 'Sol Ring', 'Mox Sapphire'], strength: 'core' },
    { partners: ['Time Spiral', 'Tinker'], strength: 'strong' },
  ],
  'Blightsteel Colossus': [
    { partners: ['Tinker'], strength: 'core' },
    { partners: ['Show and Tell', 'Sneak Attack'], strength: 'strong' },
  ],
  'Channel': [
    { partners: ['Emrakul, the Aeons Torn', 'Blightsteel Colossus'], strength: 'core' },
    { partners: ['Walking Ballista', 'Craterhoof Behemoth'], strength: 'strong' },
  ],
  'Show and Tell': [
    { partners: ['Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience'], strength: 'core' },
    { partners: ['Atraxa, Grand Unifier'], strength: 'strong' },
  ],
  'Sneak Attack': [
    { partners: ['Emrakul, the Aeons Torn', 'Griselbrand'], strength: 'core' },
    { partners: ['Inferno Titan', 'Through the Breach'], strength: 'strong' },
  ],
  'Ephemerate': [
    { partners: ['Solitude', 'Skyclave Apparition'], strength: 'core' },
    { partners: ['Restoration Angel', 'Flickerwisp'], strength: 'strong' },
  ],
  'Restoration Angel': [
    { partners: ['Ephemerate', 'Solitude'], strength: 'core' },
    { partners: ['Flickerwisp', 'Skyclave Apparition'], strength: 'strong' },
  ],
  'Natural Order': [
    { partners: ['Craterhoof Behemoth'], strength: 'core' },
    { partners: ['Birds of Paradise', 'Llanowar Elves', 'Noble Hierarch'], strength: 'strong' },
  ],
  "Green Sun's Zenith": [
    { partners: ['Dryad Arbor'], strength: 'core' },
    { partners: ['Llanowar Elves', 'Craterhoof Behemoth', 'Scavenging Ooze'], strength: 'strong' },
  ],
  'Recurring Nightmare': [
    { partners: ['Griselbrand', 'Archon of Cruelty'], strength: 'core' },
    { partners: ['Eternal Witness', 'Woodfall Primus'], strength: 'strong' },
  ],
  'Survival of the Fittest': [
    { partners: ['Recurring Nightmare', 'Vengevine'], strength: 'core' },
    { partners: ['Craterhoof Behemoth', 'Griselbrand'], strength: 'strong' },
  ],
  'Jace, the Mind Sculptor': [
    { partners: ['Brainstorm', 'Force of Will'], strength: 'core' },
    { partners: ['Counterspell', 'Mana Drain', 'Snapcaster Mage'], strength: 'strong' },
  ],
  'Force of Will': [
    { partners: ['Brainstorm', 'Jace, the Mind Sculptor'], strength: 'core' },
    { partners: ['Mana Drain', 'Snapcaster Mage'], strength: 'strong' },
  ],
  'Ragavan, Nimble Pilferer': [
    { partners: ['Lightning Bolt', 'Thoughtseize'], strength: 'core' },
    { partners: ['Dark Confidant', 'Orcish Bowmasters'], strength: 'strong' },
  ],
};

const COLOR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'W', label: 'W', className: 'bg-amber-100 text-amber-900' },
  { id: 'U', label: 'U', className: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', className: 'bg-neutral-600 text-white' },
  { id: 'R', label: 'R', className: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', className: 'bg-green-600 text-white' },
];

export function SynergyExplorer({ cards, archetypes }: SynergyExplorerProps) {
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['reanimator', 'storm', 'artifacts']));

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const getCard = (name: string) => cardsByName.get(name);

  // Get synergy count for a card
  const getSynergyCount = (cardName: string): number => {
    const synergies = SYNERGY_MAP[cardName];
    if (!synergies) return 0;
    return synergies.reduce((sum, s) => sum + s.partners.length, 0);
  };

  // Get all synergies for selected card
  const selectedCardSynergies = useMemo(() => {
    if (!selectedCard) return { core: [], strong: [], good: [] };
    const synergies = SYNERGY_MAP[selectedCard.name];
    if (!synergies) return { core: [], strong: [], good: [] };

    const core: CubeCard[] = [];
    const strong: CubeCard[] = [];

    synergies.forEach(s => {
      s.partners.forEach(name => {
        const card = getCard(name);
        if (card) {
          if (s.strength === 'core') core.push(card);
          else strong.push(card);
        }
      });
    });

    return { core, strong, good: [] };
  }, [selectedCard, cardsByName]);

  // Cards that want the selected card
  const wantsSelectedCard = useMemo(() => {
    if (!selectedCard) return [];
    const results: CubeCard[] = [];
    Object.entries(SYNERGY_MAP).forEach(([cardName, synergies]) => {
      synergies.forEach(s => {
        if (s.partners.includes(selectedCard.name)) {
          const card = getCard(cardName);
          if (card && card.id !== selectedCard.id && !results.some(r => r.id === card.id)) {
            results.push(card);
          }
        }
      });
    });
    return results;
  }, [selectedCard, cardsByName]);

  // Search results
  const filteredCards = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return cards
      .filter(c => c.name.toLowerCase().includes(term))
      .slice(0, 12);
  }, [cards, searchTerm]);

  // Categories with their cards filtered
  const filteredCategories = useMemo(() => {
    return SYNERGY_CATEGORIES.map(cat => {
      let catCards = cat.cards
        .map(name => getCard(name))
        .filter((c): c is CubeCard => c !== undefined);

      if (colorFilter !== 'all') {
        catCards = catCards.filter(c => c.colors?.includes(colorFilter) || c.color_identity?.includes(colorFilter));
      }

      return { ...cat, cardObjects: catCards };
    }).filter(cat => cat.cardObjects.length > 0);
  }, [cardsByName, colorFilter]);

  const toggleCategory = (id: string) => {
    const next = new Set(expandedCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCategories(next);
  };

  // Stats
  const totalSynergies = Object.values(SYNERGY_MAP).reduce((sum, s) => sum + s.reduce((ss, syn) => ss + syn.partners.length, 0), 0);
  const mostConnected = Object.entries(SYNERGY_MAP)
    .map(([name, syn]) => ({ name, count: syn.reduce((s, ss) => s + ss.partners.length, 0) }))
    .sort((a, b) => b.count - a.count)[0];

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded"
            >
              <X className="w-3 h-3 text-white/40" />
            </button>
          )}

          {/* Search Dropdown */}
          {filteredCards.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-lg shadow-xl z-50 max-h-64 overflow-auto">
              {filteredCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => {
                    setSelectedCard(card);
                    setSearchTerm('');
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-white/5 transition-colors text-left"
                >
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-8 h-11 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{card.name}</div>
                    <div className="text-xs text-white/30">{card.type_line?.split('—')[0]}</div>
                  </div>
                  {SYNERGY_MAP[card.name] && (
                    <div className="text-xs text-white/40 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {getSynergyCount(card.name)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
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

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 ml-auto text-xs text-white/40">
          <span>{totalSynergies} synergies</span>
          <span>·</span>
          <span>Most connected: <span className="text-white/60">{mostConnected?.name}</span></span>
        </div>
      </div>

      {/* Selected Card Detail */}
      {selectedCard && (
        <Card className="bg-[#0a0a0a] border-white/10 p-4">
          <div className="flex gap-4">
            {/* Card Image */}
            <div className="flex-shrink-0">
              <img
                src={getCardImage(selectedCard)}
                alt={selectedCard.name}
                className="w-32 rounded-lg"
              />
            </div>

            {/* Card Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedCard.name}</h3>
                  <p className="text-sm text-white/40">{selectedCard.type_line}</p>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-1.5 hover:bg-white/5 rounded-lg flex-shrink-0"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Synergy Tags */}
              {selectedCard.synergyTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedCard.synergyTags.map(tag => (
                    <Badge key={tag} variant="info" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Core Synergies */}
              {selectedCardSynergies.core.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-amber-400/80 font-medium mb-1.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Core Synergies
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedCardSynergies.core.map(card => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="w-12 aspect-[488/680] rounded overflow-hidden hover:scale-110 transition-transform ring-1 ring-amber-400/30"
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Strong Synergies */}
              {selectedCardSynergies.strong.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-white/40 font-medium mb-1.5">Strong Synergies</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedCardSynergies.strong.map(card => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="w-12 aspect-[488/680] rounded overflow-hidden hover:scale-110 transition-transform ring-1 ring-white/10"
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wants This Card */}
              {wantsSelectedCard.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-white/40 font-medium mb-1.5">Cards that want {selectedCard.name}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {wantsSelectedCard.slice(0, 8).map(card => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="w-12 aspect-[488/680] rounded overflow-hidden hover:scale-110 transition-transform ring-1 ring-white/10"
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No synergies message */}
              {selectedCardSynergies.core.length === 0 && selectedCardSynergies.strong.length === 0 && wantsSelectedCard.length === 0 && (
                <p className="text-sm text-white/30 mt-3">No documented synergies for this card.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Synergy Categories */}
      <div className="space-y-2">
        {filteredCategories.map(cat => {
          const isExpanded = expandedCategories.has(cat.id);

          return (
            <Card key={cat.id} className="bg-[#111] border-white/8 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/2 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                <span className="font-medium text-white flex-1">{cat.name}</span>
                <span className="text-xs text-white/40">{cat.cardObjects.length} cards</span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40" />
                )}
              </button>

              {/* Category Cards */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {cat.cardObjects.map(card => {
                      const synergyCount = getSynergyCount(card.name);
                      return (
                        <button
                          key={card.id}
                          onClick={() => setSelectedCard(card)}
                          className={`
                            relative aspect-[488/680] rounded-lg overflow-hidden transition-all
                            hover:scale-105 hover:z-10
                            ${selectedCard?.id === card.id ? 'ring-2 ring-white scale-105 z-10' : ''}
                          `}
                        >
                          <img
                            src={getCardImage(card)}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                          {synergyCount > 0 && (
                            <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center">
                              <span className="text-[9px] text-white font-bold">{synergyCount}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No synergy cards match your filters</p>
          <button
            onClick={() => {
              setColorFilter('all');
              setCategoryFilter(null);
            }}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
