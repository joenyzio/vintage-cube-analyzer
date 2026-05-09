import { useState, useMemo } from 'react';
import type { CubeCard, Archetype } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { ArrowRight, Link2, Search, X } from 'lucide-react';

interface SynergyExplorerProps {
  cards: CubeCard[];
  archetypes: Archetype[];
}

const SYNERGY_MAP: Record<string, string[]> = {
  'Entomb': ['Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Necromancy'],
  'Reanimate': ['Entomb', 'Griselbrand', 'Archon of Cruelty', 'Atraxa, Grand Unifier', 'Dark Ritual'],
  'Griselbrand': ['Reanimate', 'Animate Dead', 'Entomb', 'Show and Tell', 'Sneak Attack'],
  'Underworld Breach': ['Brain Freeze', "Lion's Eye Diamond", 'Lotus Petal', 'Dark Ritual'],
  'Brain Freeze': ['Underworld Breach', "Lion's Eye Diamond", 'Time Spiral', 'Frantic Search'],
  "Lion's Eye Diamond": ['Underworld Breach', 'Echo of Eons', 'Brain Freeze', "Yawgmoth's Will"],
  'Tinker': ['Blightsteel Colossus', 'Mana Crypt', 'Sol Ring', 'Mox Sapphire', 'Tolarian Academy'],
  'Tolarian Academy': ['Mana Crypt', 'Sol Ring', 'Mox Sapphire', 'Time Spiral', 'Tinker'],
  'Blightsteel Colossus': ['Tinker', 'Show and Tell', 'Sneak Attack'],
  'Channel': ['Emrakul, the Aeons Torn', 'Blightsteel Colossus', 'Walking Ballista', 'Craterhoof Behemoth'],
  'Show and Tell': ['Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience', 'Atraxa, Grand Unifier'],
  'Sneak Attack': ['Emrakul, the Aeons Torn', 'Griselbrand', 'Inferno Titan', 'Through the Breach'],
  'Ephemerate': ['Solitude', 'Skyclave Apparition', 'Restoration Angel', 'Flickerwisp'],
  'Restoration Angel': ['Ephemerate', 'Solitude', 'Flickerwisp', 'Skyclave Apparition'],
  'Ragavan, Nimble Pilferer': ['Lightning Bolt', 'Thoughtseize', 'Dark Confidant', 'Orcish Bowmasters'],
  'Jace, the Mind Sculptor': ['Force of Will', 'Counterspell', 'Brainstorm', 'Ponder'],
  'Force of Will': ['Brainstorm', 'Jace, the Mind Sculptor', 'Mana Drain', 'Snapcaster Mage'],
  'Recurring Nightmare': ['Griselbrand', 'Archon of Cruelty', 'Eternal Witness', 'Woodfall Primus'],
  'Survival of the Fittest': ['Recurring Nightmare', 'Vengevine', 'Craterhoof Behemoth', 'Griselbrand'],
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
        <div className="w-10 h-10 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center">
          <Link2 className="w-5 h-5 text-white/60" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Synergy Explorer</h2>
          <p className="text-white/40 text-sm">Discover powerful card combinations</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search for a card to explore synergies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-[#111] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}

        {filteredCards.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-lg shadow-xl z-50 max-h-80 overflow-auto">
            {filteredCards.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedCard(card);
                  setSearchTerm('');
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-10 h-14 rounded object-cover"
                />
                <div>
                  <div className="text-white text-sm">{card.name}</div>
                  <div className="text-xs text-white/30">{card.type_line?.split('—')[0]}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCard ? (
        <div className="space-y-6">
          {/* Selected Card Display */}
          <Card className="p-6 bg-[#111] border-white/8">
            <div className="flex gap-6">
              <img
                src={getCardImage(selectedCard)}
                alt={selectedCard.name}
                className="w-40 rounded-lg"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedCard.name}</h3>
                    <p className="text-white/40 text-sm">{selectedCard.type_line}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="p-2 hover:bg-white/5 rounded-lg"
                  >
                    <X className="w-5 h-5 text-white/40" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedCard.synergyTags.map(tag => (
                    <Badge key={tag} variant="info">{tag}</Badge>
                  ))}
                </div>

                {selectedCard.oracle_text && (
                  <p className="mt-4 text-sm text-white/50 whitespace-pre-wrap">
                    {selectedCard.oracle_text}
                  </p>
                )}

                <div className="mt-4 text-sm text-white/40">
                  Power Level: <span className="text-white font-mono">{selectedCard.powerLevel}/10</span>
                </div>
              </div>
            </div>
          </Card>

          {synergisticCards.length > 0 && (
            <Card className="bg-[#111] border-white/8">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-white/40" />
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
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-white">
                        {card.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {synergizesWithSelected.length > 0 && (
            <Card className="bg-[#111] border-white/8">
              <CardHeader>
                <CardTitle>Wants {selectedCard.name}</CardTitle>
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
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-white">
                        {card.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {tagBasedSynergies.length > 0 && (
            <Card className="bg-[#111] border-white/8">
              <CardHeader>
                <CardTitle>Similar Theme Cards</CardTitle>
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
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-white">
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
        <Card className="bg-[#111] border-white/8">
          <CardHeader>
            <CardTitle>Popular Build-Around Cards</CardTitle>
            <CardDescription>Click a card to explore its synergies</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {popularSynergyCards.map(card => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="group relative aspect-[488/680] rounded-xl overflow-hidden hover:scale-105 transition-all"
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="text-xs text-white truncate">{card.name}</div>
                    <div className="text-xs text-white/40">Click to explore</div>
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
