import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Layers, ChevronDown, ChevronUp, Sparkles, Zap, Target, Mountain } from 'lucide-react';

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
  sideboard?: string[];
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
    mainboard: [
      // Reanimation targets (4)
      'Griselbrand',
      'Archon of Cruelty',
      'Atraxa, Grand Unifier',
      'Sheoldred, the Apocalypse',
      // Reanimation spells (6)
      'Reanimate',
      'Animate Dead',
      'Necromancy',
      'Exhume',
      'Shallow Grave',
      'Recurring Nightmare',
      // Enablers (5)
      'Entomb',
      'Faithless Looting',
      'Frantic Search',
      'Brainstorm',
      'Careful Study',
      // Disruption (4)
      'Thoughtseize',
      'Duress',
      'Force of Will',
      'Grief',
      // Card advantage (4)
      'Dark Confidant',
      'Snapcaster Mage',
      'Jace, the Mind Sculptor',
      'Ponder',
      // Fast mana (3)
      'Dark Ritual',
      'Mox Jet',
      'Mox Sapphire',
    ],
    lands: [
      'Underground Sea',
      'Watery Grave',
      'Polluted Delta',
      'Bloodstained Mire',
      'Scalding Tarn',
      'Misty Rainforest',
      'Island',
      'Island',
      'Swamp',
      'Swamp',
    ],
  },
  {
    id: 'uw-control',
    name: 'UW Control',
    colors: ['W', 'U'],
    description: 'Classic draw-go control with efficient answers and powerful planeswalkers',
    powerRating: 9,
    difficulty: 'Medium',
    gameplan: 'Counter or remove everything, generate card advantage with planeswalkers, and win with a single haymaker. Balance is your best card.',
    mainboard: [
      // Counterspells (7)
      'Force of Will',
      'Force of Negation',
      'Counterspell',
      'Mana Drain',
      'Mana Leak',
      'Spell Pierce',
      'Cryptic Command',
      // Removal (5)
      'Swords to Plowshares',
      'Path to Exile',
      'Prismatic Ending',
      'Council\'s Judgment',
      'Solitude',
      // Board wipes (2)
      'Balance',
      'Wrath of God',
      // Planeswalkers (3)
      'Jace, the Mind Sculptor',
      'The Wandering Emperor',
      'Teferi, Time Raveler',
      // Card advantage (5)
      'Ancestral Recall',
      'Brainstorm',
      'Ponder',
      'Preordain',
      'Snapcaster Mage',
      // Win conditions (2)
      'Monastery Mentor',
      'True-Name Nemesis',
      // Mana (3)
      'Mox Pearl',
      'Mox Sapphire',
      'Sol Ring',
    ],
    lands: [
      'Tundra',
      'Hallowed Fountain',
      'Flooded Strand',
      'Polluted Delta',
      'Scalding Tarn',
      'Misty Rainforest',
      'Island',
      'Island',
      'Island',
      'Plains',
    ],
  },
  {
    id: 'ur-storm',
    name: 'UR Storm',
    colors: ['U', 'R'],
    description: 'Chain spells together for massive storm counts or value',
    powerRating: 9,
    difficulty: 'Expert',
    gameplan: 'Generate mana with rituals and artifact mana, draw cards, and kill with Brain Freeze or Tendrils. Underworld Breach + LED is the combo.',
    mainboard: [
      // Combo pieces (5)
      'Underworld Breach',
      'Brain Freeze',
      'Lion\'s Eye Diamond',
      'Yawgmoth\'s Will',
      'Time Spiral',
      // Fast mana (8)
      'Black Lotus',
      'Mox Ruby',
      'Mox Sapphire',
      'Sol Ring',
      'Mana Crypt',
      'Lotus Petal',
      'Dark Ritual',
      'Seething Song',
      // Card draw (8)
      'Ancestral Recall',
      'Brainstorm',
      'Ponder',
      'Preordain',
      'Gitaxian Probe',
      'Wheel of Fortune',
      'Echo of Eons',
      'Frantic Search',
      // Protection (3)
      'Force of Will',
      'Spell Pierce',
      'Daze',
      // Other (2)
      'Snapcaster Mage',
      'Time Walk',
    ],
    lands: [
      'Volcanic Island',
      'Steam Vents',
      'Scalding Tarn',
      'Polluted Delta',
      'Bloodstained Mire',
      'Tolarian Academy',
      'Island',
      'Island',
      'Mountain',
    ],
  },
  {
    id: 'artifact-combo',
    name: 'Artifact Combo',
    colors: [],
    description: 'Abuse fast mana and artifact synergies for unfair plays',
    powerRating: 10,
    difficulty: 'Hard',
    gameplan: 'Deploy artifact mana, use Tinker to find Blightsteel Colossus, or generate overwhelming value with Tolarian Academy and Memory Jar.',
    mainboard: [
      // Win conditions (3)
      'Blightsteel Colossus',
      'Wurmcoil Engine',
      'Kaldra Compleat',
      // Key spells (4)
      'Tinker',
      'Show and Tell',
      'Time Walk',
      'Ancestral Recall',
      // Fast mana (12)
      'Black Lotus',
      'Mox Sapphire',
      'Mox Pearl',
      'Mox Jet',
      'Mox Ruby',
      'Mox Emerald',
      'Sol Ring',
      'Mana Crypt',
      'Mana Vault',
      'Grim Monolith',
      'Lotus Petal',
      'Chrome Mox',
      // Card advantage (4)
      'Memory Jar',
      'Brainstorm',
      'Ponder',
      'The One Ring',
      // Support (4)
      'Goblin Welder',
      'Goblin Engineer',
      'Urza, Lord High Artificer',
      'Phyrexian Metamorph',
    ],
    lands: [
      'Tolarian Academy',
      'Mishra\'s Workshop',
      'Ancient Tomb',
      'City of Traitors',
      'Urza\'s Saga',
      'Volcanic Island',
      'Island',
      'Island',
      'Seat of the Synod',
    ],
  },
  {
    id: 'rw-aggro',
    name: 'RW Aggro (Boros)',
    colors: ['R', 'W'],
    description: 'The fastest deck in the cube - all gas, no brakes',
    powerRating: 8,
    difficulty: 'Easy',
    gameplan: 'Curve out with efficient creatures, burn blockers and face, and close with Armageddon while ahead on board.',
    mainboard: [
      // 1-drops (8)
      'Ragavan, Nimble Pilferer',
      'Dragon\'s Rage Channeler',
      'Esper Sentinel',
      'Mother of Runes',
      'Giver of Runes',
      'Goblin Guide',
      'Figure of Destiny',
      'Bomat Courier',
      // 2-drops (6)
      'Thalia, Guardian of Thraben',
      'Luminarch Aspirant',
      'Robber of the Rich',
      'Stoneforge Mystic',
      'Inti, Seneschal of the Sun',
      'Recruiter of the Guard',
      // 3-drops (4)
      'Adeline, Resplendent Cathar',
      'Goblin Rabblemaster',
      'Seasoned Pyromancer',
      'Flickerwisp',
      // Burn (5)
      'Lightning Bolt',
      'Chain Lightning',
      'Burst Lightning',
      'Fireblast',
      'Forth Eorlingas!',
      // Removal (2)
      'Swords to Plowshares',
      'Path to Exile',
      // Finisher (2)
      'Armageddon',
      'Batterskull',
    ],
    lands: [
      'Plateau',
      'Sacred Foundry',
      'Arid Mesa',
      'Bloodstained Mire',
      'Wooded Foothills',
      'Prismatic Vista',
      'Mountain',
      'Mountain',
      'Plains',
      'Plains',
    ],
  },
  {
    id: 'ug-ramp',
    name: 'UG Ramp/Channel',
    colors: ['U', 'G'],
    description: 'Accelerate into massive threats or game-ending combos',
    powerRating: 9,
    difficulty: 'Medium',
    gameplan: 'Deploy mana dorks turn 1, ramp into huge threats or combo with Channel + Emrakul. Counterspell backup protects your plays.',
    mainboard: [
      // Mana dorks (8)
      'Birds of Paradise',
      'Llanowar Elves',
      'Elvish Mystic',
      'Noble Hierarch',
      'Ignoble Hierarch',
      'Arbor Elf',
      'Delighted Halfling',
      'Rofellos, Llanowar Emissary',
      // Big threats (5)
      'Emrakul, the Aeons Torn',
      'Craterhoof Behemoth',
      'Primeval Titan',
      'Woodfall Primus',
      'Uro, Titan of Nature\'s Wrath',
      // Cheating mana (4)
      'Channel',
      'Natural Order',
      'Green Sun\'s Zenith',
      'Fastbond',
      // Card advantage (4)
      'Sylvan Library',
      'Ancestral Recall',
      'Brainstorm',
      'Ponder',
      // Protection (3)
      'Force of Will',
      'Force of Negation',
      'Endurance',
      // Support (2)
      'Oko, Thief of Crowns',
      'Lotus Cobra',
    ],
    lands: [
      'Tropical Island',
      'Breeding Pool',
      'Misty Rainforest',
      'Windswept Heath',
      'Wooded Foothills',
      'Gaea\'s Cradle',
      'Forest',
      'Forest',
      'Forest',
      'Island',
    ],
  },
  {
    id: 'br-aggro',
    name: 'BR Aggro (Rakdos)',
    colors: ['B', 'R'],
    description: 'Fast, disruptive aggro with hand disruption and burn',
    powerRating: 8,
    difficulty: 'Easy',
    gameplan: 'Disrupt their hand with Thoughtseize, deploy efficient threats, and burn them out. Grief + Reanimate is a devastating opener.',
    mainboard: [
      // Disruption (5)
      'Thoughtseize',
      'Inquisition of Kozilek',
      'Duress',
      'Grief',
      'Hymn to Tourach',
      // Creatures (10)
      'Ragavan, Nimble Pilferer',
      'Dragon\'s Rage Channeler',
      'Dark Confidant',
      'Dauthi Voidwalker',
      'Orcish Bowmasters',
      'Goblin Rabblemaster',
      'Seasoned Pyromancer',
      'Laelia, the Blade Reforged',
      'Sheoldred, the Apocalypse',
      'Archon of Cruelty',
      // Burn/removal (6)
      'Lightning Bolt',
      'Fatal Push',
      'Unholy Heat',
      'Chain Lightning',
      'Dismember',
      'Fire Covenant',
      // Reanimation package (3)
      'Reanimate',
      'Animate Dead',
      'Entomb',
      // Fast mana (2)
      'Dark Ritual',
      'Mox Jet',
    ],
    lands: [
      'Badlands',
      'Blood Crypt',
      'Bloodstained Mire',
      'Polluted Delta',
      'Scalding Tarn',
      'Verdant Catacombs',
      'Swamp',
      'Swamp',
      'Mountain',
      'Mountain',
    ],
  },
  {
    id: 'mono-white',
    name: 'Mono White Aggro',
    colors: ['W'],
    description: 'Efficient white creatures with disruption and anthem effects',
    powerRating: 7,
    difficulty: 'Easy',
    gameplan: 'Curve out with efficient white creatures, tax opponents with Thalia, and close games with Armageddon or Solitude.',
    mainboard: [
      // 1-drops (8)
      'Mother of Runes',
      'Giver of Runes',
      'Esper Sentinel',
      'Thraben Inspector',
      'Ocelot Pride',
      'Guide of Souls',
      'Isamaru, Hound of Konda',
      'Benevolent Bodyguard',
      // 2-drops (7)
      'Thalia, Guardian of Thraben',
      'Stoneforge Mystic',
      'Luminarch Aspirant',
      'Cathar Commando',
      'Lion Sash',
      'Phelia, Exuberant Shepherd',
      'Containment Priest',
      // 3-drops (5)
      'Adeline, Resplendent Cathar',
      'Skyclave Apparition',
      'Flickerwisp',
      'Recruiter of the Guard',
      'Monastery Mentor',
      // 4+ drops (4)
      'Restoration Angel',
      'Solitude',
      'The Wandering Emperor',
      'Palace Jailer',
      // Removal (2)
      'Swords to Plowshares',
      'Path to Exile',
      // Finisher (1)
      'Armageddon',
    ],
    lands: [
      'Karakas',
      'Eiganjo, Seat of the Empire',
      'Plains',
      'Plains',
      'Plains',
      'Plains',
      'Plains',
      'Plains',
      'Plains',
      'Plains',
      'Plains',
    ],
  },
  {
    id: 'show-tell',
    name: 'Show and Tell',
    colors: ['U', 'R'],
    description: 'Cheat giant creatures into play without paying their costs',
    powerRating: 9,
    difficulty: 'Medium',
    gameplan: 'Land a Show and Tell, Sneak Attack, or Through the Breach, then deploy Emrakul or Griselbrand to end the game immediately.',
    mainboard: [
      // Big threats (5)
      'Emrakul, the Aeons Torn',
      'Griselbrand',
      'Atraxa, Grand Unifier',
      'Worldspine Wurm',
      'Blightsteel Colossus',
      // Cheating spells (5)
      'Show and Tell',
      'Sneak Attack',
      'Through the Breach',
      'Tinker',
      'Oath of Druids',
      // Card selection (6)
      'Brainstorm',
      'Ponder',
      'Preordain',
      'Ancestral Recall',
      'Faithless Looting',
      'Frantic Search',
      // Protection (5)
      'Force of Will',
      'Force of Negation',
      'Spell Pierce',
      'Daze',
      'Misdirection',
      // Fast mana (5)
      'Mox Sapphire',
      'Mox Ruby',
      'Sol Ring',
      'Lotus Petal',
      'Ancient Tomb',
    ],
    lands: [
      'Volcanic Island',
      'Steam Vents',
      'Scalding Tarn',
      'Polluted Delta',
      'Bloodstained Mire',
      'City of Traitors',
      'Island',
      'Island',
      'Island',
      'Mountain',
    ],
  },
];

export function SampleDecks({ cards }: SampleDecksProps) {
  const [expandedDeck, setExpandedDeck] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const getCard = (name: string): CubeCard | undefined => cardsByName.get(name);

  const getAvailableCards = (deckList: DeckList) => {
    const mainboard = deckList.mainboard
      .map(name => getCard(name))
      .filter((c): c is CubeCard => c !== undefined);
    const lands = deckList.lands
      .map(name => getCard(name))
      .filter((c): c is CubeCard => c !== undefined);
    return { mainboard, lands };
  };

  const getDeckStats = (mainboard: CubeCard[], lands: CubeCard[]) => {
    const allCards = [...mainboard, ...lands];
    const nonLands = mainboard.filter(c => !c.type_line?.toLowerCase().includes('land'));

    const avgCmc = nonLands.length > 0
      ? nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length
      : 0;

    const avgPower = allCards.length > 0
      ? allCards.reduce((sum, c) => sum + c.powerLevel, 0) / allCards.length
      : 0;

    const creatures = mainboard.filter(c => c.type_line?.toLowerCase().includes('creature')).length;
    const spells = mainboard.filter(c =>
      c.type_line?.toLowerCase().includes('instant') ||
      c.type_line?.toLowerCase().includes('sorcery')
    ).length;

    return { avgCmc, avgPower, creatures, spells, lands: lands.length, total: allCards.length };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center">
          <Layers className="w-5 h-5 text-white/60" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Sample Decklists</h2>
          <p className="text-white/40 text-sm">Optimized builds for each archetype using cards from this cube</p>
        </div>
      </div>

      {/* Deck List */}
      <div className="space-y-4">
        {SAMPLE_DECKLISTS.map(deck => {
          const { mainboard, lands } = getAvailableCards(deck);
          const stats = getDeckStats(mainboard, lands);
          const isExpanded = expandedDeck === deck.id;
          const allCards = [...mainboard, ...lands];

          return (
            <Card key={deck.id} className="overflow-hidden bg-[#111] border-white/8">
              {/* Deck Header - Clickable */}
              <button
                onClick={() => setExpandedDeck(isExpanded ? null : deck.id)}
                className="w-full p-6 flex items-start justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex -space-x-1">
                      {deck.colors.length > 0 ? deck.colors.map(c => (
                        <div
                          key={c}
                          className={`w-5 h-5 rounded-full border border-[#111]
                            ${c === 'W' ? 'bg-amber-100' : ''}
                            ${c === 'U' ? 'bg-blue-500' : ''}
                            ${c === 'B' ? 'bg-neutral-500' : ''}
                            ${c === 'R' ? 'bg-red-500' : ''}
                            ${c === 'G' ? 'bg-green-500' : ''}
                          `}
                        />
                      )) : (
                        <div className="w-5 h-5 rounded-full border border-[#111] bg-neutral-500" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">{deck.name}</h3>
                    <Badge variant={deck.difficulty === 'Easy' ? 'success' : deck.difficulty === 'Expert' ? 'info' : 'warning'}>
                      {deck.difficulty}
                    </Badge>
                  </div>
                  <p className="text-white/40 text-sm mb-3">{deck.description}</p>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40">Power:</span>
                      <span className="font-mono text-white">{deck.powerRating}/10</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40">Avg CMC:</span>
                      <span className="font-mono text-white">{stats.avgCmc.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40">Cards:</span>
                      <span className="font-mono text-white">{stats.total}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40">Lands:</span>
                      <span className="font-mono text-white">{stats.lands}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Mini card preview */}
                  <div className="hidden sm:flex -space-x-8">
                    {mainboard.slice(0, 4).map((card, i) => (
                      <div
                        key={card.id}
                        className="w-12 h-16 rounded overflow-hidden border-2 border-gray-900 shadow-lg"
                        style={{ zIndex: 4 - i }}
                      >
                        <img
                          src={getCardImage(card)}
                          alt={card.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    ))}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </button>

              {/* Expanded Deck Content */}
              {isExpanded && (
                <div className="border-t border-white/5 p-6 space-y-6 animate-in fade-in duration-200">
                  {/* Gameplan */}
                  <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
                    <h4 className="font-medium text-white/60 mb-1 text-sm">Gameplan</h4>
                    <p className="text-white/80 text-sm">{deck.gameplan}</p>
                  </div>

                  {/* Mainboard */}
                  <div>
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      Mainboard ({mainboard.length} cards)
                    </h4>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                      {mainboard.map((card, idx) => (
                        <div
                          key={`${card.id}-${idx}`}
                          className="relative aspect-[488/680] rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:scale-105 hover:z-10 transition-transform"
                          onMouseEnter={() => setHoveredCard(card)}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                          <img
                            src={getCardImage(card)}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className={`
                            absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono
                            ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : ''}
                            ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-white/80 text-black' : ''}
                            ${card.powerLevel < 7 ? 'bg-black/60 text-white/70' : ''}
                          `}>
                            {card.powerLevel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lands */}
                  <div>
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      <Mountain className="w-4 h-4 text-amber-400" />
                      Lands ({lands.length} cards)
                    </h4>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                      {lands.map((card, idx) => (
                        <div
                          key={`${card.id}-land-${idx}`}
                          className="relative aspect-[488/680] rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:scale-105 hover:z-10 transition-transform"
                          onMouseEnter={() => setHoveredCard(card)}
                          onMouseLeave={() => setHoveredCard(null)}
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
                  </div>

                  {/* Missing Cards Warning */}
                  {(() => {
                    const missing = [...deck.mainboard, ...deck.lands].filter(name => !getCard(name));
                    if (missing.length > 0) {
                      return (
                        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                          <p className="text-yellow-400 text-sm">
                            <strong>Note:</strong> {missing.length} cards from this list aren't in the cube: {missing.slice(0, 5).join(', ')}{missing.length > 5 ? '...' : ''}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in hidden lg:block">
          <div className="bg-[#111] border border-white/10 p-2 rounded-xl">
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="w-56 rounded-lg"
            />
            <div className="mt-2 px-1">
              <h4 className="font-medium text-white text-sm">{hoveredCard.name}</h4>
              <p className="text-xs text-white/40">{hoveredCard.type_line}</p>
              <span className="text-xs text-white/30 font-mono">{hoveredCard.powerLevel}/10</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
