import { useState, useMemo } from 'react';
import type { CubeCard, Archetype } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Sparkles, ArrowRight, Link2, Zap, Search, X } from 'lucide-react';

interface SynergyExplorerProps {
  cards: CubeCard[];
  archetypes: Archetype[];
}

// Define synergy relationships
const SYNERGY_MAP: Record<string, string[]> = {
  // Reanimator Package
  'Entomb': ['Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Necromancy'],
  'Reanimate': ['Entomb', 'Griselbrand', 'Archon of Cruelty', 'Atraxa, Grand Unifier', 'Dark Ritual'],
  'Griselbrand': ['Reanimate', 'Animate Dead', 'Entomb', 'Show and Tell', 'Sneak Attack'],

  // Storm Package
  'Underworld Breach': ['Brain Freeze', "Lion's Eye Diamond", 'Lotus Petal', 'Dark Ritual'],
  'Brain Freeze': ['Underworld Breach', "Lion's Eye Diamond", 'Time Spiral', 'Frantic Search'],
  "Lion's Eye Diamond": ['Underworld Breach', 'Echo of Eons', 'Brain Freeze', "Yawgmoth's Will"],

  // Artifact Package
  'Tinker': ['Blightsteel Colossus', 'Mana Crypt', 'Sol Ring', 'Mox Sapphire', 'Tolarian Academy'],
  'Tolarian Academy': ['Mana Crypt', 'Sol Ring', 'Mox Sapphire', 'Time Spiral', 'Tinker'],
  'Blightsteel Colossus': ['Tinker', 'Show and Tell', 'Sneak Attack'],

  // Channel Package
  'Channel': ['Emrakul, the Aeons Torn', 'Blightsteel Colossus', 'Walking Ballista', 'Craterhoof Behemoth'],

  // Show and Tell Package
  'Show and Tell': ['Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience', 'Atraxa, Grand Unifier'],
  'Sneak Attack': ['Emrakul, the Aeons Torn', 'Griselbrand', 'Inferno Titan', 'Through the Breach'],

  // Blink Package
  'Ephemerate': ['Solitude', 'Skyclave Apparition', 'Restoration Angel', 'Flickerwisp'],
  'Restoration Angel': ['Ephemerate', 'Solitude', 'Flickerwisp', 'Skyclave Apparition'],

  // Aggro Package
  'Ragavan, Nimble Pilferer': ['Lightning Bolt', 'Thoughtseize', 'Dark Confidant', 'Orcish Bowmasters'],

  // Control Package
  'Jace, the Mind Sculptor': ['Force of Will', 'Counterspell', 'Brainstorm', 'Ponder'],
  'Force of Will': ['Brainstorm', 'Jace, the Mind Sculptor', 'Mana Drain', 'Snapcaster Mage'],

  // Value Engines
  'Recurring Nightmare': ['Griselbrand', 'Archon of Cruelty', 'Eternal Witness', 'Woodfall Primus'],
  'Survival of the Fittest': ['Recurring Nightmare', 'Vengevine', 'Craterhoof Behemoth', 'Griselbrand'],

  // Mana Dorks
  'Natural Order': ['Craterhoof Behemoth', 'Birds of Paradise', 'Llanowar Elves', 'Noble Hierarch'],
  "Green Sun's Zenith": ['Dryad Arbor', 'Llanowar Elves', 'Craterhoof Behemoth', 'Scavenging Ooze'],
};

export function SynergyExplorer({ cards, archetypes }: SynergyExplorerProps) {
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const synergisticCards = useMemo(() => {
    if (!selectedCard) return [];

    const synergies = SYNERGY_MAP[selectedCard.name] || [];
    return synergies
      .map(name => cardsByName.get(name))
      .filter((c): c is CubeCard => c !== undefined);
  }, [selectedCard, cardsByName]);

  // Cards that synergize with this card (reverse lookup)
  const synergizesWithSelected = useMemo(() => {
    if (!selectedCard) return [];

    const results: CubeCard[] = [];
    Object.entries(SYNERGY_MAP).forEach(([cardName, synergies]) => {
      if (synergies.includes(selectedCard.name)) {
        const card = cardsByName.get(cardName);
        if (card && card.id !== selectedCard.id) {
          results.push(card);
        }
      }
    });
    return results;
  }, [selectedCard, cardsByName]);

  // Find cards with matching synergy tags
  const tagBasedSynergies = useMemo(() => {
    if (!selectedCard) return [];

    const selectedTags = new Set(selectedCard.synergyTags);
    if (selectedTags.size === 0) return [];

    return cards
      .filter(c => c.id !== selectedCard.id)
      .filter(c => c.synergyTags.some(tag => selectedTags.has(tag)))
      .sort((a, b) => {
        const aMatches = a.synergyTags.filter(t => selectedTags.has(t)).length;
        const bMatches = b.synergyTags.filter(t => selectedTags.has(t)).length;
        return bMatches - aMatches;
      })
      .slice(0, 12);
  }, [selectedCard, cards]);

  const filteredCards = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return cards
      .filter(c => c.name.toLowerCase().includes(term))
      .slice(0, 20);
  }, [cards, searchTerm]);

  const popularSynergyCards = useMemo(() => {
    return Object.keys(SYNERGY_MAP)
      .map(name => cardsByName.get(name))
      .filter((c): c is CubeCard => c !== undefined)
      .slice(0, 12);
  }, [cardsByName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Link2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Synergy Explorer</h2>
          <p className="text-gray-400">Discover powerful card combinations</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search for a card to explore synergies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Search Results Dropdown */}
        {filteredCards.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 max-h-80 overflow-auto">
            {filteredCards.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedCard(card);
                  setSearchTerm('');
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 transition-colors text-left"
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-10 h-14 rounded object-cover"
                />
                <div>
                  <div className="text-white font-medium">{card.name}</div>
                  <div className="text-sm text-gray-500">{card.type_line?.split('—')[0]}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Card and Synergies */}
      {selectedCard ? (
        <div className="space-y-6">
          {/* Selected Card Display */}
          <Card className="p-6">
            <div className="flex gap-6">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-2 bg-purple-500/20 rounded-2xl blur-lg" />
                <img
                  src={getCardImage(selectedCard)}
                  alt={selectedCard.name}
                  className="relative w-48 rounded-xl shadow-2xl"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedCard.name}</h3>
                    <p className="text-gray-400">{selectedCard.type_line}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedCard.synergyTags.map(tag => (
                    <Badge key={tag} variant="info">{tag}</Badge>
                  ))}
                </div>

                {selectedCard.oracle_text && (
                  <p className="mt-4 text-sm text-gray-300 whitespace-pre-wrap">
                    {selectedCard.oracle_text}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-400">Power Level:</span>
                    <span className="font-bold text-yellow-500">{selectedCard.powerLevel}/10</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Direct Synergies */}
          {synergisticCards.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-green-400" />
                  <CardTitle>Works Great With</CardTitle>
                </div>
                <CardDescription>Cards that directly synergize with {selectedCard.name}</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {synergisticCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="group relative aspect-[488/680] rounded-lg overflow-hidden hover:scale-105 transition-transform"
                  >
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-white font-medium">
                        {card.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Cards That Want This */}
          {synergizesWithSelected.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <CardTitle>Wants {selectedCard.name}</CardTitle>
                </div>
                <CardDescription>Cards that synergize well when you have {selectedCard.name}</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {synergizesWithSelected.map(card => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="group relative aspect-[488/680] rounded-lg overflow-hidden hover:scale-105 transition-transform"
                  >
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-white font-medium">
                        {card.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Tag-Based Synergies */}
          {tagBasedSynergies.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-cyan-400" />
                  <CardTitle>Similar Theme Cards</CardTitle>
                </div>
                <CardDescription>Cards that share synergy themes with {selectedCard.name}</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tagBasedSynergies.map(card => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="group relative aspect-[488/680] rounded-lg overflow-hidden hover:scale-105 transition-transform"
                  >
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-white font-medium">
                        {card.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* Popular Synergy Cards */
        <Card>
          <CardHeader>
            <CardTitle>Popular Build-Around Cards</CardTitle>
            <CardDescription>Click a card to explore its synergies</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {popularSynergyCards.map(card => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="group relative aspect-[488/680] rounded-xl overflow-hidden hover:scale-105 transition-all hover:shadow-xl hover:shadow-purple-500/20"
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="text-xs text-white font-medium truncate">{card.name}</div>
                    <div className="text-xs text-purple-400">Click to explore</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
