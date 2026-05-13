import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getEloData } from '../services/eloHelpers';
import { getCardImage } from '../services/scryfall';
import { Search, X } from 'lucide-react';

interface Props {
  cards: CubeCard[];
}

const ARCHETYPES = [
  { id: 'reanimator', name: 'Reanimator', color: '#a855f7', description: 'Cheat creatures from graveyard', keywords: ['graveyard', 'reanimate', 'entomb', 'buried alive', 'exhume', 'unburial', 'animate dead', 'persist', 'shallow grave'] },
  { id: 'storm', name: 'Storm', color: '#f59e0b', description: 'Chain spells for a big finish', keywords: ['storm', 'ritual', 'tendrils', 'brain freeze', 'past in flames', 'yawgmoth', 'dark petition', 'minds desire'] },
  { id: 'artifacts', name: 'Artifacts', color: '#64748b', description: 'Artifact synergies and Tinker', keywords: ['artifact', 'tinker', 'metalcraft', 'affinity', 'tolarian', 'mox', 'colossus', 'welder', 'daretti'] },
  { id: 'control', name: 'Control', color: '#3b82f6', description: 'Counter, remove, win late', keywords: ['counter', 'wrath', 'destroy all', 'verdict', 'terminus', 'cryptic', 'dissolve'] },
  { id: 'aggro', name: 'Aggro', color: '#ef4444', description: 'Fast creatures, burn face', keywords: ['haste', 'prowess', 'goblin guide', 'monastery', 'rabblemaster', 'guide', 'swiftspear'] },
  { id: 'ramp', name: 'Ramp', color: '#22c55e', description: 'Accelerate into big threats', keywords: ['add {g}', 'search your library for a basic', 'channel', 'rofellos', 'cradle', 'primeval', 'oracle of mul daya'] },
  { id: 'tempo', name: 'Tempo', color: '#06b6d4', description: 'Cheap threats + disruption', keywords: ['flash', 'return target', 'snapcaster', 'clique', 'vendilion', 'remand'] },
  { id: 'cheaty', name: 'Cheaty', color: '#ec4899', description: 'Cheat big things into play', keywords: ['show and tell', 'sneak', 'oath', 'natural order', 'through the breach', 'eureka'] },
  { id: 'midrange', name: 'Midrange', color: '#84cc16', description: 'Efficient threats + removal', keywords: ['planeswalker', 'liliana', 'thoughtseize', 'tarmogoyf', 'siege rhino'] },
];

interface Synergy {
  card: CubeCard;
  reason: string;
  strength: 'strong' | 'medium';
}

function getCardArchetypes(card: CubeCard): string[] {
  const text = (card.oracle_text || '').toLowerCase();
  const name = card.name.toLowerCase();
  const type = (card.type_line || '').toLowerCase();

  const archetypes: string[] = [];

  for (const arch of ARCHETYPES) {
    if (arch.keywords.some(kw => text.includes(kw) || name.includes(kw))) {
      archetypes.push(arch.id);
    }
  }

  // Special cases
  if (type.includes('creature') && (card.cmc || 0) >= 6) {
    archetypes.push('reanimator', 'cheaty');
  }
  if (type.includes('artifact') && !archetypes.includes('artifacts')) {
    archetypes.push('artifacts');
  }

  return [...new Set(archetypes)];
}

function findSynergies(card: CubeCard, allCards: CubeCard[]): Synergy[] {
  const synergies: Synergy[] = [];
  const text = (card.oracle_text || '').toLowerCase();
  const types = (card.type_line || '').toLowerCase();
  const name = card.name.toLowerCase();
  const cmc = card.cmc || 0;

  for (const other of allCards) {
    if (other.id === card.id) continue;

    const otherText = (other.oracle_text || '').toLowerCase();
    const otherTypes = (other.type_line || '').toLowerCase();
    const otherName = other.name.toLowerCase();
    const otherCmc = other.cmc || 0;

    // Reanimator: enablers + fatties
    if ((text.includes('graveyard') || text.includes('reanimate') || name.includes('entomb') || name.includes('buried alive')) &&
        otherTypes.includes('creature') && otherCmc >= 5) {
      synergies.push({ card: other, reason: 'Reanimate this', strength: 'strong' });
      continue;
    }
    if ((otherText.includes('graveyard') || otherText.includes('reanimate') || otherName.includes('entomb')) &&
        types.includes('creature') && cmc >= 5) {
      synergies.push({ card: other, reason: 'Reanimates you', strength: 'strong' });
      continue;
    }

    // Artifact synergies
    if ((text.includes('artifact') || name.includes('tinker') || name.includes('welder')) && otherTypes.includes('artifact')) {
      synergies.push({ card: other, reason: 'Artifact synergy', strength: 'medium' });
      continue;
    }

    // Storm: rituals + payoffs
    if ((name.includes('ritual') || text.includes('add {')) &&
        (otherText.includes('storm') || otherName.includes('tendrils') || otherName.includes('brain freeze'))) {
      synergies.push({ card: other, reason: 'Storm payoff', strength: 'strong' });
      continue;
    }
    if ((text.includes('storm') || name.includes('tendrils')) &&
        (otherName.includes('ritual') || otherText.includes('add {'))) {
      synergies.push({ card: other, reason: 'Fuels storm', strength: 'strong' });
      continue;
    }

    // Cheat into play
    if ((name.includes('show and tell') || name.includes('sneak') || name.includes('through the breach') || name.includes('oath')) &&
        otherTypes.includes('creature') && otherCmc >= 7) {
      synergies.push({ card: other, reason: 'Cheat this in', strength: 'strong' });
      continue;
    }

    // Spells matter
    if ((otherText.includes('prowess') || otherText.includes('magecraft') || otherName.includes('young pyromancer')) &&
        (types.includes('instant') || types.includes('sorcery'))) {
      synergies.push({ card: other, reason: 'Triggers on cast', strength: 'medium' });
      continue;
    }

    // Sacrifice synergies
    if (text.includes('sacrifice') && (otherText.includes('when') && otherText.includes('dies'))) {
      synergies.push({ card: other, reason: 'Sac fodder', strength: 'medium' });
      continue;
    }
  }

  // Sort by strength then ELO
  return synergies
    .sort((a, b) => {
      if (a.strength !== b.strength) return a.strength === 'strong' ? -1 : 1;
      return (getEloData(b.card.name)?.elo || 0) - (getEloData(a.card.name)?.elo || 0);
    })
    .slice(0, 20);
}

export function GraphExplorer({ cards }: Props) {
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

  // Cards grouped by archetype
  const cardsByArchetype = useMemo(() => {
    const groups: Record<string, CubeCard[]> = {};

    for (const arch of ARCHETYPES) {
      groups[arch.id] = [];
    }

    cards.forEach(card => {
      const archs = getCardArchetypes(card);
      archs.forEach(a => {
        if (groups[a]) groups[a].push(card);
      });
    });

    // Sort each group by ELO
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (getEloData(b.name)?.elo || 0) - (getEloData(a.name)?.elo || 0));
    }

    return groups;
  }, [cards]);

  // Synergies for selected card
  const synergies = useMemo(() => {
    if (!selectedCard) return [];
    return findSynergies(selectedCard, cards);
  }, [selectedCard, cards]);

  // Filtered cards for search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return cards
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [searchQuery, cards]);

  // Cards to display in main grid
  const displayCards = useMemo(() => {
    if (selectedArchetype) {
      return cardsByArchetype[selectedArchetype] || [];
    }
    return [];
  }, [selectedArchetype, cardsByArchetype]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search for a card..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/20"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
            <div className="grid grid-cols-4 gap-1 p-2">
              {searchResults.map(card => (
                <button
                  key={card.id}
                  onClick={() => {
                    setSelectedCard(card);
                    setSearchQuery('');
                  }}
                  className="rounded overflow-hidden hover:ring-2 ring-white/30 transition-all"
                >
                  <img src={getCardImage(card)} alt={card.name} className="w-full" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected card panel */}
      {selectedCard && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex gap-6">
            {/* Card image */}
            <div className="w-56 flex-shrink-0">
              <img
                src={getCardImage(selectedCard)}
                alt={selectedCard.name}
                className="w-full rounded-xl shadow-lg"
              />
            </div>

            {/* Card info and synergies */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedCard.name}</h2>
                  <p className="text-white/50">{selectedCard.type_line}</p>
                  {getEloData(selectedCard.name) && (
                    <p className="text-sm text-white/30 mt-1">
                      ELO {Math.round(getEloData(selectedCard.name)!.elo)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Archetype tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {getCardArchetypes(selectedCard).map(archId => {
                  const arch = ARCHETYPES.find(a => a.id === archId);
                  return arch ? (
                    <span
                      key={archId}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: arch.color + '25', color: arch.color }}
                    >
                      {arch.name}
                    </span>
                  ) : null;
                })}
              </div>

              {/* Synergies */}
              {synergies.length > 0 ? (
                <div>
                  <h3 className="text-sm text-white/40 uppercase tracking-wider mb-3">
                    Works well with ({synergies.length})
                  </h3>
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {synergies.map(({ card, reason, strength }) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="group relative rounded-lg overflow-hidden hover:ring-2 ring-white/30 transition-all"
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full" />
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5`}>
                          <span className={`text-[9px] font-medium ${strength === 'strong' ? 'text-green-400' : 'text-white/70'}`}>
                            {reason}
                          </span>
                        </div>
                        {strength === 'strong' && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-white/30">No synergies found for this card</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archetype browser */}
      {!selectedCard && (
        <>
          {/* Archetype pills */}
          <div className="flex flex-wrap gap-2">
            {ARCHETYPES.map(arch => (
              <button
                key={arch.id}
                onClick={() => setSelectedArchetype(selectedArchetype === arch.id ? null : arch.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                  selectedArchetype === arch.id
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
                style={{
                  backgroundColor: selectedArchetype === arch.id ? arch.color + '30' : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: selectedArchetype === arch.id ? arch.color : 'transparent',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: arch.color }} />
                {arch.name}
                <span className="text-white/30">{cardsByArchetype[arch.id]?.length || 0}</span>
              </button>
            ))}
          </div>

          {/* Selected archetype cards */}
          {selectedArchetype && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setSelectedArchetype(null)}
                  className="text-white/40 hover:text-white text-sm"
                >
                  ← Back
                </button>
                <div>
                  <h2 className="text-lg font-medium text-white">
                    {ARCHETYPES.find(a => a.id === selectedArchetype)?.name}
                  </h2>
                  <p className="text-sm text-white/40">
                    {ARCHETYPES.find(a => a.id === selectedArchetype)?.description}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                {displayCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="rounded-lg overflow-hidden hover:ring-2 ring-white/30 transition-all hover:scale-105"
                  >
                    <img src={getCardImage(card)} alt={card.name} className="w-full" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All archetypes overview */}
          {!selectedArchetype && (
            <div className="space-y-8">
              <p className="text-white/40">
                Click an archetype above to explore cards, or search for a specific card
              </p>

              {ARCHETYPES.slice(0, 4).map(arch => (
                <div key={arch.id}>
                  <button
                    onClick={() => setSelectedArchetype(arch.id)}
                    className="flex items-center gap-3 mb-3 group"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: arch.color }} />
                    <h3 className="font-medium text-white group-hover:text-white/80">{arch.name}</h3>
                    <span className="text-sm text-white/30">{arch.description}</span>
                    <span className="text-white/20 group-hover:text-white/40">→</span>
                  </button>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {cardsByArchetype[arch.id]?.slice(0, 10).map(card => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="flex-shrink-0 w-20 rounded-lg overflow-hidden hover:ring-2 ring-white/30 transition-all"
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
