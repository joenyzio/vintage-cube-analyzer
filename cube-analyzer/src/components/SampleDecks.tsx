import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  calculateDeckElo,
  getEloData,
  getPercentile,
  getTopByElo,
  getBottomByElo,
} from '../services/eloHelpers';
import { Search, X, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

interface SampleDecksProps {
  cards: CubeCard[];
}

interface DeckList {
  id: string;
  name: string;
  colors: string[];
  description: string;
  powerRating: number;
  difficulty: string;
  gameplan: string;
  mainboard: string[];
  lands: string[];
}

const SAMPLE_DECKLISTS: DeckList[] = [
  {
    id: 'ub-reanimator',
    name: 'UB Reanimator',
    colors: ['U', 'B'],
    description: 'Cheat massive creatures into play from the graveyard as early as turn 1-2',
    powerRating: 10,
    difficulty: 'Medium',
    gameplan: 'Entomb or discard a huge creature, then Reanimate it immediately. Griselbrand draws 14 cards and usually wins. Backup plan is fair UB control.',
    mainboard: ['Griselbrand', 'Archon of Cruelty', 'Atraxa, Grand Unifier', 'Sheoldred, the Apocalypse', 'Reanimate', 'Animate Dead', 'Necromancy', 'Exhume', 'Shallow Grave', 'Recurring Nightmare', 'Entomb', 'Faithless Looting', 'Frantic Search', 'Brainstorm', 'Thoughtseize', 'Duress', 'Force of Will', 'Grief', 'Dark Confidant', 'Snapcaster Mage', 'Jace, the Mind Sculptor', 'Ponder', 'Dark Ritual', 'Mox Jet', 'Mox Sapphire'],
    lands: ['Underground Sea', 'Watery Grave', 'Polluted Delta', 'Bloodstained Mire', 'Scalding Tarn', 'Misty Rainforest', 'Island', 'Island', 'Swamp', 'Swamp'],
  },
  {
    id: 'uw-control',
    name: 'UW Control',
    colors: ['W', 'U'],
    description: 'Classic draw-go control with efficient answers and powerful planeswalkers',
    powerRating: 9,
    difficulty: 'Medium',
    gameplan: 'Counter or remove everything, generate card advantage with planeswalkers, and win with a single haymaker. Balance is your best card.',
    mainboard: ['Force of Will', 'Force of Negation', 'Counterspell', 'Mana Drain', 'Mana Leak', 'Spell Pierce', 'Swords to Plowshares', 'Path to Exile', 'Prismatic Ending', "Council's Judgment", 'Solitude', 'Balance', 'Wrath of God', 'Jace, the Mind Sculptor', 'The Wandering Emperor', 'Teferi, Time Raveler', 'Ancestral Recall', 'Brainstorm', 'Ponder', 'Preordain', 'Snapcaster Mage', 'Monastery Mentor', 'True-Name Nemesis', 'Mox Pearl', 'Mox Sapphire', 'Sol Ring'],
    lands: ['Tundra', 'Hallowed Fountain', 'Flooded Strand', 'Polluted Delta', 'Scalding Tarn', 'Misty Rainforest', 'Island', 'Island', 'Island', 'Plains'],
  },
  {
    id: 'ur-storm',
    name: 'UR Storm',
    colors: ['U', 'R'],
    description: 'Chain spells together for massive storm counts or value',
    powerRating: 9,
    difficulty: 'Expert',
    gameplan: 'Generate mana with rituals and artifact mana, draw cards, and kill with Brain Freeze. Underworld Breach + LED is the combo.',
    mainboard: ['Underworld Breach', 'Brain Freeze', "Lion's Eye Diamond", "Yawgmoth's Will", 'Time Spiral', 'Black Lotus', 'Mox Ruby', 'Mox Sapphire', 'Sol Ring', 'Mana Crypt', 'Lotus Petal', 'Dark Ritual', 'Seething Song', 'Ancestral Recall', 'Brainstorm', 'Ponder', 'Preordain', 'Gitaxian Probe', 'Wheel of Fortune', 'Echo of Eons', 'Frantic Search', 'Force of Will', 'Spell Pierce', 'Daze', 'Snapcaster Mage', 'Time Walk'],
    lands: ['Volcanic Island', 'Steam Vents', 'Scalding Tarn', 'Polluted Delta', 'Bloodstained Mire', 'Tolarian Academy', 'Island', 'Island', 'Mountain'],
  },
  {
    id: 'artifact-combo',
    name: 'Artifact Combo',
    colors: [],
    description: 'Abuse fast mana and artifact synergies for unfair plays',
    powerRating: 10,
    difficulty: 'Hard',
    gameplan: 'Deploy artifact mana, use Tinker to find Blightsteel Colossus, or generate overwhelming value with Tolarian Academy and Memory Jar.',
    mainboard: ['Blightsteel Colossus', 'Wurmcoil Engine', 'Kaldra Compleat', 'Tinker', 'Show and Tell', 'Time Walk', 'Ancestral Recall', 'Black Lotus', 'Mox Sapphire', 'Mox Pearl', 'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Sol Ring', 'Mana Crypt', 'Mana Vault', 'Grim Monolith', 'Lotus Petal', 'Chrome Mox', 'Memory Jar', 'Brainstorm', 'Ponder', 'The One Ring', 'Goblin Welder', 'Goblin Engineer', 'Urza, Lord High Artificer', 'Phyrexian Metamorph'],
    lands: ['Tolarian Academy', "Mishra's Workshop", 'Ancient Tomb', 'City of Traitors', "Urza's Saga", 'Volcanic Island', 'Island', 'Island'],
  },
  {
    id: 'rw-aggro',
    name: 'RW Aggro (Boros)',
    colors: ['R', 'W'],
    description: 'The fastest deck in the cube - all gas, no brakes',
    powerRating: 8,
    difficulty: 'Easy',
    gameplan: 'Curve out with efficient creatures, burn blockers and face, and close with Armageddon while ahead on board.',
    mainboard: ['Ragavan, Nimble Pilferer', "Dragon's Rage Channeler", 'Esper Sentinel', 'Mother of Runes', 'Giver of Runes', 'Thalia, Guardian of Thraben', 'Luminarch Aspirant', 'Robber of the Rich', 'Stoneforge Mystic', 'Inti, Seneschal of the Sun', 'Recruiter of the Guard', 'Adeline, Resplendent Cathar', 'Goblin Rabblemaster', 'Seasoned Pyromancer', 'Flickerwisp', 'Lightning Bolt', 'Chain Lightning', 'Burst Lightning', 'Fireblast', 'Forth Eorlingas!', 'Swords to Plowshares', 'Path to Exile', 'Armageddon', 'Batterskull'],
    lands: ['Plateau', 'Sacred Foundry', 'Arid Mesa', 'Bloodstained Mire', 'Wooded Foothills', 'Prismatic Vista', 'Mountain', 'Mountain', 'Plains', 'Plains'],
  },
  {
    id: 'ug-ramp',
    name: 'UG Ramp/Channel',
    colors: ['U', 'G'],
    description: 'Accelerate into massive threats or game-ending combos',
    powerRating: 9,
    difficulty: 'Medium',
    gameplan: 'Deploy mana dorks turn 1, ramp into huge threats or combo with Channel + Emrakul. Counterspell backup protects your plays.',
    mainboard: ['Birds of Paradise', 'Llanowar Elves', 'Elvish Mystic', 'Noble Hierarch', 'Ignoble Hierarch', 'Arbor Elf', 'Delighted Halfling', 'Rofellos, Llanowar Emissary', 'Emrakul, the Aeons Torn', 'Craterhoof Behemoth', 'Primeval Titan', 'Woodfall Primus', "Uro, Titan of Nature's Wrath", 'Channel', 'Natural Order', "Green Sun's Zenith", 'Fastbond', 'Sylvan Library', 'Ancestral Recall', 'Brainstorm', 'Ponder', 'Force of Will', 'Force of Negation', 'Endurance', 'Oko, Thief of Crowns', 'Lotus Cobra'],
    lands: ['Tropical Island', 'Breeding Pool', 'Misty Rainforest', 'Windswept Heath', 'Wooded Foothills', "Gaea's Cradle", 'Forest', 'Forest', 'Forest', 'Island'],
  },
  {
    id: 'br-aggro',
    name: 'BR Aggro (Rakdos)',
    colors: ['B', 'R'],
    description: 'Fast, disruptive aggro with hand disruption and burn',
    powerRating: 8,
    difficulty: 'Easy',
    gameplan: 'Disrupt their hand with Thoughtseize, deploy efficient threats, and burn them out. Grief + Reanimate is a devastating opener.',
    mainboard: ['Thoughtseize', 'Inquisition of Kozilek', 'Duress', 'Grief', 'Hymn to Tourach', 'Ragavan, Nimble Pilferer', "Dragon's Rage Channeler", 'Dark Confidant', 'Dauthi Voidwalker', 'Orcish Bowmasters', 'Goblin Rabblemaster', 'Seasoned Pyromancer', 'Laelia, the Blade Reforged', 'Sheoldred, the Apocalypse', 'Archon of Cruelty', 'Lightning Bolt', 'Fatal Push', 'Unholy Heat', 'Chain Lightning', 'Dismember', 'Fire Covenant', 'Reanimate', 'Animate Dead', 'Entomb', 'Dark Ritual', 'Mox Jet'],
    lands: ['Badlands', 'Blood Crypt', 'Bloodstained Mire', 'Polluted Delta', 'Scalding Tarn', 'Verdant Catacombs', 'Swamp', 'Swamp', 'Mountain', 'Mountain'],
  },
  {
    id: 'mono-white',
    name: 'Mono White Aggro',
    colors: ['W'],
    description: 'Efficient white creatures with disruption and anthem effects',
    powerRating: 7,
    difficulty: 'Easy',
    gameplan: 'Curve out with efficient white creatures, tax opponents with Thalia, and close games with Armageddon or Solitude.',
    mainboard: ['Mother of Runes', 'Giver of Runes', 'Esper Sentinel', 'Thraben Inspector', 'Ocelot Pride', 'Guide of Souls', 'Thalia, Guardian of Thraben', 'Stoneforge Mystic', 'Luminarch Aspirant', 'Cathar Commando', 'Lion Sash', 'Phelia, Exuberant Shepherd', 'Containment Priest', 'Adeline, Resplendent Cathar', 'Skyclave Apparition', 'Flickerwisp', 'Recruiter of the Guard', 'Monastery Mentor', 'Restoration Angel', 'Solitude', 'The Wandering Emperor', 'Palace Jailer', 'Swords to Plowshares', 'Path to Exile', 'Armageddon'],
    lands: ['Karakas', 'Plains', 'Plains', 'Plains', 'Plains', 'Plains', 'Plains', 'Plains', 'Plains', 'Plains'],
  },
  {
    id: 'show-tell',
    name: 'Show and Tell',
    colors: ['U', 'R'],
    description: 'Cheat giant creatures into play without paying their costs',
    powerRating: 9,
    difficulty: 'Medium',
    gameplan: 'Land a Show and Tell, Sneak Attack, or Through the Breach, then deploy Emrakul or Griselbrand to end the game immediately.',
    mainboard: ['Emrakul, the Aeons Torn', 'Griselbrand', 'Atraxa, Grand Unifier', 'Worldspine Wurm', 'Blightsteel Colossus', 'Show and Tell', 'Sneak Attack', 'Through the Breach', 'Tinker', 'Oath of Druids', 'Brainstorm', 'Ponder', 'Preordain', 'Ancestral Recall', 'Faithless Looting', 'Frantic Search', 'Force of Will', 'Force of Negation', 'Spell Pierce', 'Daze', 'Mox Sapphire', 'Mox Ruby', 'Sol Ring', 'Lotus Petal'],
    lands: ['Volcanic Island', 'Steam Vents', 'Scalding Tarn', 'Polluted Delta', 'Bloodstained Mire', 'City of Traitors', 'Island', 'Island', 'Island', 'Mountain'],
  },
];

const COLOR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'W', label: 'W', className: 'bg-amber-100 text-amber-900' },
  { id: 'U', label: 'U', className: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', className: 'bg-neutral-600 text-white' },
  { id: 'R', label: 'R', className: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', className: 'bg-green-600 text-white' },
  { id: 'C', label: 'C', className: 'bg-gray-500 text-white' },
];

export function SampleDecks({ cards }: SampleDecksProps) {
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'power' | 'name'>('power');
  const [selectedDeck, setSelectedDeck] = useState<DeckList | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const getCard = (name: string): CubeCard | undefined => cardsByName.get(name);

  // Get featured cards for a deck (first 5 key cards that exist)
  const getFeaturedCards = (deck: DeckList): CubeCard[] => {
    return deck.mainboard
      .map(name => getCard(name))
      .filter((c): c is CubeCard => c !== undefined)
      .slice(0, 5);
  };

  const getDeckStats = (deck: DeckList) => {
    const mainboard = deck.mainboard.map(name => getCard(name)).filter(Boolean) as CubeCard[];
    const lands = deck.lands.map(name => getCard(name)).filter(Boolean) as CubeCard[];
    const nonLands = mainboard.filter(c => !c.type_line?.toLowerCase().includes('land'));
    const avgCmc = nonLands.length > 0 ? nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length : 0;

    return { mainboard, lands, total: mainboard.length + lands.length, avgCmc };
  };

  // Calculate ELO-based deck stats
  const deckEloStats = useMemo(() => {
    const stats: Record<string, ReturnType<typeof calculateDeckElo> & {
      strongest5: string[];
      weakest5: string[];
    }> = {};

    SAMPLE_DECKLISTS.forEach(deck => {
      const allCards = [...deck.mainboard, ...deck.lands];
      const eloCalc = calculateDeckElo(allCards);
      stats[deck.id] = {
        ...eloCalc,
        strongest5: getTopByElo(allCards, 5),
        weakest5: getBottomByElo(allCards, 5),
      };
    });

    return stats;
  }, []);

  const filteredDecks = useMemo(() => {
    let result = [...SAMPLE_DECKLISTS];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(lower) ||
        d.description.toLowerCase().includes(lower) ||
        d.mainboard.some(c => c.toLowerCase().includes(lower))
      );
    }

    if (colorFilter !== 'all') {
      if (colorFilter === 'C') {
        result = result.filter(d => d.colors.length === 0);
      } else {
        result = result.filter(d => d.colors.includes(colorFilter));
      }
    }

    result.sort((a, b) => {
      if (sortBy === 'power') {
        // Use ELO-based power
        const aElo = deckEloStats[a.id]?.normalized || a.powerRating;
        const bElo = deckEloStats[b.id]?.normalized || b.powerRating;
        return bElo - aElo;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [search, colorFilter, sortBy, deckEloStats]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search decks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

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

        <button
          onClick={() => setSortBy(sortBy === 'power' ? 'name' : 'power')}
          className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'power' ? 'Power' : 'Name'}
        </button>

        <span className="text-xs text-white/30 ml-auto">{filteredDecks.length} decks</span>
      </div>

      {/* Deck Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDecks.map((deck) => {
          const featuredCards = getFeaturedCards(deck);
          const stats = getDeckStats(deck);
          const eloStats = deckEloStats[deck.id];
          const displayPower = eloStats?.normalized || deck.powerRating;

          return (
            <Card
              key={deck.id}
              className="group bg-[#0a0a0a] border-white/8 overflow-hidden cursor-pointer hover:border-white/20 transition-all duration-300"
              onClick={() => setSelectedDeck(deck)}
            >
              {/* Card Fan Preview */}
              <div className="relative h-48 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {featuredCards.length > 0 && (
                    <div className="flex -space-x-14 transform group-hover:scale-105 transition-transform duration-500">
                      {featuredCards.map((card, i) => (
                        <div
                          key={card.id}
                          className="relative w-24 aspect-[488/680] rounded-xl overflow-hidden shadow-2xl transform transition-transform duration-300"
                          style={{
                            transform: `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 4}px)`,
                            zIndex: 5 - Math.abs(i - 2),
                          }}
                        >
                          <img
                            src={getCardImage(card)}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Power Badge - Using ELO-calculated power */}
                <div className={`
                  absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg
                  ${displayPower >= 10 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black' : ''}
                  ${displayPower >= 9 && displayPower < 10 ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white' : ''}
                  ${displayPower >= 7 && displayPower < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : ''}
                  ${displayPower < 7 ? 'bg-white/10 text-white/70 backdrop-blur-sm' : ''}
                `}>
                  {displayPower.toFixed(1)}
                </div>

                {/* ELO indicator */}
                {eloStats?.rawAverage > 0 && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                    <TrendingUp className="w-3 h-3 text-white/50" />
                    <span className="text-[10px] font-mono text-white/50">{eloStats.rawAverage}</span>
                  </div>
                )}

                {/* Color Pips */}
                <div className="absolute top-3 left-3 flex gap-1">
                  {deck.colors.length > 0 ? deck.colors.map(c => (
                    <div
                      key={c}
                      className={`w-6 h-6 rounded-full shadow-lg border border-black/20
                        ${c === 'W' ? 'bg-gradient-to-br from-amber-100 to-amber-200' : ''}
                        ${c === 'U' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : ''}
                        ${c === 'B' ? 'bg-gradient-to-br from-neutral-500 to-neutral-700' : ''}
                        ${c === 'R' ? 'bg-gradient-to-br from-red-400 to-red-600' : ''}
                        ${c === 'G' ? 'bg-gradient-to-br from-green-500 to-green-700' : ''}
                      `}
                    />
                  )) : (
                    <div className="w-6 h-6 rounded-full shadow-lg bg-gradient-to-br from-neutral-400 to-neutral-600" />
                  )}
                </div>

                {/* Stats overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-4 text-xs text-white/50">
                  <span>{stats.total} cards</span>
                  <span>{stats.avgCmc.toFixed(1)} avg CMC</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white text-lg">{deck.name}</h3>
                  <Badge variant={deck.difficulty === 'Easy' ? 'success' : deck.difficulty === 'Expert' ? 'info' : deck.difficulty === 'Hard' ? 'danger' : 'warning'}>
                    {deck.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">{deck.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDecks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No decks match your filters</p>
          <button
            onClick={() => { setSearch(''); setColorFilter('all'); }}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Deck Detail Modal */}
      {selectedDeck && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDeck(null)}
        >
          <div
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {selectedDeck.colors.length > 0 ? selectedDeck.colors.map(c => (
                    <div
                      key={c}
                      className={`w-8 h-8 rounded-full shadow-lg
                        ${c === 'W' ? 'bg-gradient-to-br from-amber-100 to-amber-200' : ''}
                        ${c === 'U' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : ''}
                        ${c === 'B' ? 'bg-gradient-to-br from-neutral-500 to-neutral-700' : ''}
                        ${c === 'R' ? 'bg-gradient-to-br from-red-400 to-red-600' : ''}
                        ${c === 'G' ? 'bg-gradient-to-br from-green-500 to-green-700' : ''}
                      `}
                    />
                  )) : (
                    <div className="w-8 h-8 rounded-full shadow-lg bg-gradient-to-br from-neutral-400 to-neutral-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedDeck.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant={selectedDeck.difficulty === 'Easy' ? 'success' : selectedDeck.difficulty === 'Expert' ? 'info' : selectedDeck.difficulty === 'Hard' ? 'danger' : 'warning'}>
                      {selectedDeck.difficulty}
                    </Badge>
                    {(() => {
                      const stats = deckEloStats[selectedDeck.id];
                      const power = stats?.normalized || selectedDeck.powerRating;
                      return (
                        <span className={`font-bold ${
                          power >= 10 ? 'text-amber-400' :
                          power >= 9 ? 'text-purple-400' :
                          power >= 7 ? 'text-blue-400' :
                          'text-white/60'
                        }`}>
                          Power {power.toFixed(1)}
                        </span>
                      );
                    })()}
                    {deckEloStats[selectedDeck.id]?.rawAverage > 0 && (
                      <span className="text-xs text-white/40 font-mono">
                        (Avg ELO: {deckEloStats[selectedDeck.id].rawAverage})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeck(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Gameplan */}
              <div>
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Gameplan</h3>
                <p className="text-white/70 leading-relaxed">{selectedDeck.gameplan}</p>
              </div>

              {/* ELO Analysis */}
              {deckEloStats[selectedDeck.id]?.strongest5.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Strongest Cards */}
                  <div className="p-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wide">Strongest by ELO</h3>
                    </div>
                    <div className="space-y-2">
                      {deckEloStats[selectedDeck.id].strongest5.map((name, i) => {
                        const eloData = getEloData(name);
                        const percentile = getPercentile(name);
                        return (
                          <div key={name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/30 w-4">{i + 1}.</span>
                              <span className="text-sm text-white/80">{name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-white/40">{eloData ? Math.round(eloData.elo) : '-'}</span>
                              <span className={`text-[10px] font-semibold ${
                                percentile >= 75 ? 'text-amber-400' :
                                percentile >= 50 ? 'text-purple-400' :
                                'text-blue-400'
                              }`}>
                                Top {100 - percentile}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weakest Cards */}
                  <div className="p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide">Potential Upgrades</h3>
                    </div>
                    <div className="space-y-2">
                      {deckEloStats[selectedDeck.id].weakest5.map((name, i) => {
                        const eloData = getEloData(name);
                        const percentile = getPercentile(name);
                        return (
                          <div key={name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/30 w-4">{i + 1}.</span>
                              <span className="text-sm text-white/50">{name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-white/30">{eloData ? Math.round(eloData.elo) : '-'}</span>
                              <span className="text-[10px] text-white/30">
                                Top {100 - percentile}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Mainboard */}
              <div>
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
                  Mainboard ({getDeckStats(selectedDeck).mainboard.length} cards)
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {selectedDeck.mainboard.map((name, idx) => {
                    const card = getCard(name);
                    if (!card) return null;
                    return (
                      <div
                        key={`${card.id}-${idx}`}
                        className="relative aspect-[488/680] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform hover:z-10 shadow-lg"
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className={`
                          absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : 'bg-black/70 text-white'}
                        `}>
                          {card.powerLevel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lands */}
              <div>
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
                  Lands ({getDeckStats(selectedDeck).lands.length} cards)
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {selectedDeck.lands.map((name, idx) => {
                    const card = getCard(name);
                    if (!card) return null;
                    return (
                      <div
                        key={`${card.id}-land-${idx}`}
                        className="relative w-20 aspect-[488/680] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-lg"
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-[60] hidden lg:block pointer-events-none">
          <div className="bg-[#111] border border-white/10 p-2 rounded-xl shadow-2xl">
            <img src={getCardImage(hoveredCard)} alt={hoveredCard.name} className="w-56 rounded-lg" />
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
