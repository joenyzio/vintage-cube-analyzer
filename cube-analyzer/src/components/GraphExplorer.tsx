import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getEloData } from '../services/eloHelpers';
import { getCardImage } from '../services/scryfall';

interface Props {
  cards: CubeCard[];
}

const THEMES = [
  { id: 'reanimator', name: 'Reanimator', color: '#a855f7', keywords: ['graveyard', 'reanimate', 'entomb', 'buried alive', 'exhume', 'unburial', 'animate dead'] },
  { id: 'storm', name: 'Storm', color: '#f59e0b', keywords: ['storm', 'ritual', 'tendrils', 'brain freeze', 'past in flames', 'yawgmoth'] },
  { id: 'artifacts', name: 'Artifacts/Tinker', color: '#64748b', keywords: ['artifact', 'tinker', 'metalcraft', 'affinity', 'tolarian', 'mox', 'colossus'] },
  { id: 'control', name: 'Control', color: '#3b82f6', keywords: ['counter', 'wrath', 'destroy all', 'verdict', 'terminus'] },
  { id: 'aggro', name: 'Aggro', color: '#ef4444', keywords: ['haste', 'prowess', 'goblin guide', 'monastery', 'rabblemaster'] },
  { id: 'ramp', name: 'Ramp/Big Mana', color: '#22c55e', keywords: ['add {g}', 'search your library for a basic', 'channel', 'rofellos', 'cradle', 'primeval'] },
  { id: 'tempo', name: 'Tempo/Bounce', color: '#06b6d4', keywords: ['flash', 'return target', 'snapcaster', 'clique'] },
  { id: 'tokens', name: 'Tokens/Go Wide', color: '#fbbf24', keywords: ['create', 'token', 'bitterblossom', 'lingering', 'mentor'] },
  { id: 'cheaty', name: 'Cheat Into Play', color: '#ec4899', keywords: ['show and tell', 'sneak', 'oath', 'natural order', 'through the breach'] },
  { id: 'lands', name: 'Lands', color: '#84cc16', keywords: ['land', 'fetch', 'dual', 'shock'] },
];

function getCardThemes(card: CubeCard): string[] {
  const text = (card.oracle_text || '').toLowerCase();
  const name = card.name.toLowerCase();
  const type = (card.type_line || '').toLowerCase();

  const themes = THEMES.filter(theme =>
    theme.keywords.some(kw => text.includes(kw) || name.includes(kw))
  ).map(t => t.id);

  // Add lands theme for land cards
  if (type.includes('land')) themes.push('lands');

  return themes;
}

function detectSynergy(card1: CubeCard, card2: CubeCard): { hasSynergy: boolean; reason: string } {
  const text1 = (card1.oracle_text || '').toLowerCase();
  const text2 = (card2.oracle_text || '').toLowerCase();
  const types1 = (card1.type_line || '').toLowerCase();
  const types2 = (card2.type_line || '').toLowerCase();
  const name1 = card1.name.toLowerCase();

  // Reanimator synergies
  if ((text1.includes('graveyard') || text1.includes('reanimate')) &&
      types2.includes('creature') && (card2.cmc || 0) >= 5) {
    return { hasSynergy: true, reason: 'Reanimate target' };
  }
  if ((text2.includes('graveyard') || text2.includes('reanimate')) &&
      types1.includes('creature') && (card1.cmc || 0) >= 5) {
    return { hasSynergy: true, reason: 'Reanimate target' };
  }

  // Artifact synergies
  if (text1.includes('artifact') && types2.includes('artifact')) {
    return { hasSynergy: true, reason: 'Artifact synergy' };
  }
  if (text2.includes('artifact') && types1.includes('artifact')) {
    return { hasSynergy: true, reason: 'Artifact synergy' };
  }

  // Sacrifice synergies
  if (text1.includes('sacrifice') && (text2.includes('token') || text2.includes('when') && text2.includes('dies'))) {
    return { hasSynergy: true, reason: 'Sacrifice synergy' };
  }

  // Spell synergies
  if ((text1.includes('instant') || text1.includes('sorcery') || name1.includes('bolt') || name1.includes('ritual')) &&
      (text2.includes('prowess') || text2.includes('magecraft') || text2.includes('storm'))) {
    return { hasSynergy: true, reason: 'Spells matter' };
  }

  // Cheat into play
  if ((name1.includes('show and tell') || name1.includes('sneak') || name1.includes('through the breach')) &&
      types2.includes('creature') && (card2.cmc || 0) >= 7) {
    return { hasSynergy: true, reason: 'Cheat into play' };
  }

  return { hasSynergy: false, reason: '' };
}

export function GraphExplorer({ cards }: Props) {
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'themes' | 'connections'>('themes');

  // Group cards by theme
  const cardsByTheme = useMemo(() => {
    const groups: Record<string, CubeCard[]> = {};
    const uncategorized: CubeCard[] = [];

    cards.forEach(card => {
      const themes = getCardThemes(card);
      if (themes.length === 0) {
        uncategorized.push(card);
      } else {
        themes.forEach(theme => {
          if (!groups[theme]) groups[theme] = [];
          groups[theme].push(card);
        });
      }
    });

    return { groups, uncategorized };
  }, [cards]);

  // Find synergies for selected card
  const synergies = useMemo(() => {
    if (!selectedCard) return [];

    return cards
      .filter(c => c.id !== selectedCard.id)
      .map(c => ({ card: c, ...detectSynergy(selectedCard, c) }))
      .filter(s => s.hasSynergy)
      .sort((a, b) => (getEloData(b.card.name)?.elo || 0) - (getEloData(a.card.name)?.elo || 0));
  }, [selectedCard, cards]);

  // Get cards for current view
  const displayCards = useMemo(() => {
    if (selectedTheme) {
      return cardsByTheme.groups[selectedTheme] || [];
    }
    return [];
  }, [selectedTheme, cardsByTheme]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/5">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-medium text-white">Card Universe</h1>
              <p className="text-sm text-white/40">Explore how cards connect</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setViewMode('themes'); setSelectedCard(null); }}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  viewMode === 'themes' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                By Theme
              </button>
              <button
                onClick={() => setViewMode('connections')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  viewMode === 'connections' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                Connections
              </button>
            </div>
          </div>

          {/* Theme pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {THEMES.filter(t => cardsByTheme.groups[t.id]?.length > 0).map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  setSelectedTheme(selectedTheme === theme.id ? null : theme.id);
                  setSelectedCard(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  selectedTheme === theme.id
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
                style={{
                  backgroundColor: selectedTheme === theme.id ? theme.color + '30' : 'rgba(255,255,255,0.05)',
                  borderColor: selectedTheme === theme.id ? theme.color : 'transparent',
                  borderWidth: 1,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: theme.color }}
                />
                {theme.name}
                <span className="text-white/30">{cardsByTheme.groups[theme.id]?.length || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main content */}
        <div className="flex-1 p-6">
          {viewMode === 'themes' && !selectedTheme && (
            // Theme overview - show all themes as card clusters
            <div className="grid gap-8">
              {THEMES.filter(t => cardsByTheme.groups[t.id]?.length > 0).map(theme => (
                <div key={theme.id}>
                  <button
                    onClick={() => setSelectedTheme(theme.id)}
                    className="flex items-center gap-3 mb-3 group"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.color }}
                    />
                    <h2 className="text-lg font-medium text-white group-hover:text-white/80 transition-colors">
                      {theme.name}
                    </h2>
                    <span className="text-sm text-white/30">{cardsByTheme.groups[theme.id]?.length} cards</span>
                    <span className="text-white/20 group-hover:text-white/40 transition-colors">→</span>
                  </button>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {cardsByTheme.groups[theme.id]?.slice(0, 12).map(card => (
                      <button
                        key={card.id}
                        onClick={() => {
                          setSelectedCard(card);
                          setViewMode('connections');
                        }}
                        className="flex-shrink-0 w-24 rounded-lg overflow-hidden hover:ring-2 ring-white/30 transition-all hover:scale-105"
                      >
                        <img
                          src={getCardImage(card)}
                          alt={card.name}
                          className="w-full"
                          loading="lazy"
                        />
                      </button>
                    ))}
                    {(cardsByTheme.groups[theme.id]?.length || 0) > 12 && (
                      <button
                        onClick={() => setSelectedTheme(theme.id)}
                        className="flex-shrink-0 w-24 aspect-[488/680] rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 transition-all"
                      >
                        +{(cardsByTheme.groups[theme.id]?.length || 0) - 12}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'themes' && selectedTheme && (
            // Single theme expanded
            <div>
              <button
                onClick={() => setSelectedTheme(null)}
                className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-2"
              >
                ← All Themes
              </button>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {displayCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => {
                      setSelectedCard(card);
                      setViewMode('connections');
                    }}
                    className={`rounded-lg overflow-hidden transition-all hover:scale-105 ${
                      selectedCard?.id === card.id ? 'ring-2 ring-white' : 'hover:ring-2 ring-white/30'
                    }`}
                  >
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      className="w-full"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'connections' && (
            <div>
              {!selectedCard ? (
                <div className="text-center py-20">
                  <p className="text-white/40 mb-4">Click any card to see what it synergizes with</p>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-w-5xl mx-auto">
                    {cards.slice(0, 48).map(card => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="rounded overflow-hidden hover:ring-2 ring-white/30 transition-all hover:scale-110 hover:z-10"
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-8">
                  {/* Selected card */}
                  <div className="w-64 flex-shrink-0">
                    <img
                      src={getCardImage(selectedCard)}
                      alt={selectedCard.name}
                      className="w-full rounded-xl shadow-2xl"
                    />
                    <div className="mt-4 space-y-2">
                      <h2 className="text-lg font-medium text-white">{selectedCard.name}</h2>
                      <p className="text-sm text-white/40">{selectedCard.type_line}</p>
                      <div className="flex flex-wrap gap-1">
                        {getCardThemes(selectedCard).map(themeId => {
                          const theme = THEMES.find(t => t.id === themeId);
                          return theme ? (
                            <span
                              key={themeId}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{ backgroundColor: theme.color + '30', color: theme.color }}
                            >
                              {theme.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Synergies */}
                  <div className="flex-1">
                    <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">
                      Synergizes with ({synergies.length} cards)
                    </h3>
                    {synergies.length === 0 ? (
                      <p className="text-white/30">No strong synergies detected</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {synergies.map(({ card, reason }) => (
                          <button
                            key={card.id}
                            onClick={() => setSelectedCard(card)}
                            className="group relative rounded-lg overflow-hidden hover:ring-2 ring-white/30 transition-all hover:scale-105"
                          >
                            <img src={getCardImage(card)} alt={card.name} className="w-full" loading="lazy" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-[10px] text-white/80 truncate">{reason}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
