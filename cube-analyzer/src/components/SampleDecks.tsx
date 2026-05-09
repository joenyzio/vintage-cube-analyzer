import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Search, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

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
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'power' | 'name'>('power');
  const [expandedDeck, setExpandedDeck] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const getCard = (name: string): CubeCard | undefined => cardsByName.get(name);

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

    if (difficultyFilter !== 'All') {
      result = result.filter(d => d.difficulty === difficultyFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'power') return b.powerRating - a.powerRating;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [search, colorFilter, difficultyFilter, sortBy]);

  const getDeckStats = (deck: DeckList) => {
    const mainboard = deck.mainboard.map(name => getCard(name)).filter(Boolean) as CubeCard[];
    const lands = deck.lands.map(name => getCard(name)).filter(Boolean) as CubeCard[];
    const allCards = [...mainboard, ...lands];
    const nonLands = mainboard.filter(c => !c.type_line?.toLowerCase().includes('land'));

    const avgCmc = nonLands.length > 0 ? nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length : 0;
    const creatures = mainboard.filter(c => c.type_line?.toLowerCase().includes('creature')).length;
    const spells = mainboard.filter(c => c.type_line?.toLowerCase().includes('instant') || c.type_line?.toLowerCase().includes('sorcery')).length;

    return { mainboard, lands, total: allCards.length, avgCmc, creatures, spells };
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search decks or cards..."
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

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 focus:outline-none"
        >
          <option value="All">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
          <option value="Expert">Expert</option>
        </select>

        <button
          onClick={() => setSortBy(sortBy === 'power' ? 'name' : 'power')}
          className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'power' ? 'Power' : 'Name'}
        </button>
      </div>

      <div className="text-xs text-white/30">{filteredDecks.length} deck{filteredDecks.length !== 1 ? 's' : ''}</div>

      {/* Deck List */}
      <div className="space-y-2">
        {filteredDecks.map(deck => {
          const stats = getDeckStats(deck);
          const isExpanded = expandedDeck === deck.id;
          const missing = [...deck.mainboard, ...deck.lands].filter(name => !getCard(name));

          return (
            <Card key={deck.id} className={`bg-[#111] border-white/8 overflow-hidden ${isExpanded ? 'ring-1 ring-white/20' : ''}`}>
              {/* Header Row */}
              <button
                onClick={() => setExpandedDeck(isExpanded ? null : deck.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/2 transition-colors"
              >
                {/* Power */}
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white">
                  {deck.powerRating}
                </div>

                {/* Colors */}
                <div className="flex gap-0.5">
                  {deck.colors.length > 0 ? deck.colors.map(c => (
                    <div
                      key={c}
                      className={`w-5 h-5 rounded-full
                        ${c === 'W' ? 'bg-amber-100' : ''}
                        ${c === 'U' ? 'bg-blue-500' : ''}
                        ${c === 'B' ? 'bg-neutral-500' : ''}
                        ${c === 'R' ? 'bg-red-500' : ''}
                        ${c === 'G' ? 'bg-green-500' : ''}
                      `}
                    />
                  )) : (
                    <div className="w-5 h-5 rounded-full bg-gray-500" />
                  )}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{deck.name}</h3>
                    <Badge variant={deck.difficulty === 'Easy' ? 'success' : deck.difficulty === 'Expert' ? 'info' : deck.difficulty === 'Hard' ? 'danger' : 'warning'}>
                      {deck.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/40 truncate">{deck.description}</p>
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-4 text-xs text-white/40">
                  <span>{stats.total} cards</span>
                  <span>{stats.avgCmc.toFixed(1)} avg</span>
                </div>

                {/* Mini Preview */}
                <div className="hidden sm:flex -space-x-6">
                  {stats.mainboard.slice(0, 3).map((card, i) => (
                    <div
                      key={card.id}
                      className="w-10 h-14 rounded overflow-hidden border-2 border-[#111]"
                      style={{ zIndex: 3 - i }}
                    >
                      <img src={getCardImage(card)} alt="" className="w-full h-full object-cover object-top" />
                    </div>
                  ))}
                </div>

                {isExpanded ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 space-y-5">
                  {/* Stats + Gameplan */}
                  <div className="pt-4 flex gap-6">
                    <div className="flex-shrink-0 grid grid-cols-2 gap-2 text-center">
                      <div className="px-3 py-2 bg-white/5 rounded-lg">
                        <div className="text-lg font-bold text-white">{stats.total}</div>
                        <div className="text-[10px] text-white/30">Cards</div>
                      </div>
                      <div className="px-3 py-2 bg-white/5 rounded-lg">
                        <div className="text-lg font-bold text-white">{stats.avgCmc.toFixed(1)}</div>
                        <div className="text-[10px] text-white/30">Avg CMC</div>
                      </div>
                      <div className="px-3 py-2 bg-white/5 rounded-lg">
                        <div className="text-lg font-bold text-white">{stats.creatures}</div>
                        <div className="text-[10px] text-white/30">Creatures</div>
                      </div>
                      <div className="px-3 py-2 bg-white/5 rounded-lg">
                        <div className="text-lg font-bold text-white">{stats.spells}</div>
                        <div className="text-[10px] text-white/30">Spells</div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">Gameplan</h4>
                      <p className="text-sm text-white/80">{deck.gameplan}</p>
                    </div>
                  </div>

                  {/* Mainboard */}
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
                      Mainboard ({stats.mainboard.length} cards)
                    </h4>
                    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 gap-1.5">
                      {stats.mainboard.map((card, idx) => (
                        <div
                          key={`${card.id}-${idx}`}
                          className="relative aspect-[488/680] rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:scale-105 hover:z-10 transition-transform"
                          onMouseEnter={() => setHoveredCard(card)}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                          <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                          <div className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                            ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : 'bg-black/70 text-white'}
                          `}>
                            {card.powerLevel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lands */}
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
                      Lands ({stats.lands.length} cards)
                    </h4>
                    <div className="flex gap-1.5 overflow-x-auto pb-2">
                      {stats.lands.map((card, idx) => (
                        <div
                          key={`${card.id}-land-${idx}`}
                          className="relative w-16 flex-shrink-0 aspect-[488/680] rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:scale-105 transition-transform"
                          onMouseEnter={() => setHoveredCard(card)}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                          <img src={getCardImage(card)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing warning */}
                  {missing.length > 0 && (
                    <div className="text-xs text-white/30 pt-2 border-t border-white/5">
                      {missing.length} cards not in cube: {missing.slice(0, 5).join(', ')}{missing.length > 5 ? '...' : ''}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredDecks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No decks match your filters</p>
          <button onClick={() => { setSearch(''); setColorFilter('all'); setDifficultyFilter('All'); }} className="mt-2 text-sm text-white/60 hover:text-white">
            Clear filters
          </button>
        </div>
      )}

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 hidden lg:block">
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
