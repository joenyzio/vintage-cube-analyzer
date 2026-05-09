import { useState, useMemo } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  Lightbulb, Zap, Target, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Sparkles, Search, X
} from 'lucide-react';

interface BuildAroundProps {
  cards: CubeCard[];
}

interface BuildAroundGuide {
  cardName: string;
  whyItsBroken: string;
  keyStrategy: string;
  synergies: {
    category: string;
    explanation: string;
    cards: string[];
  }[];
  antiSynergies: string[];
  sampleDeck: {
    mainboard: string[];
    lands: string[];
  };
  draftTips: string[];
  openingHands: string[];
}

const BUILD_AROUND_GUIDES: BuildAroundGuide[] = [
  {
    cardName: 'Balance',
    whyItsBroken: `Balance is a 2-mana spell that equalizes lands, cards in hand, AND creatures. The trick is: you build your deck so YOU have the fewest of each, then Balance destroys everything your opponent has. It's essentially a one-sided Armageddon + Mind Twist + Wrath of God combined.`,
    keyStrategy: `Play out your hand using artifact mana (Moxen, Sol Ring), then cast Balance when you have 0-1 lands, 0 cards in hand, and 0 creatures. Your opponent sacrifices all their lands, discards their hand, and loses all creatures. You keep your artifacts and planeswalkers (Balance doesn't touch them). Then win with whatever's left.`,
    synergies: [
      {
        category: 'Fast Artifact Mana',
        explanation: `These let you cast spells without lands. After Balance, you still have all your Moxen while opponent has nothing.`,
        cards: ['Mox Pearl', 'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Sol Ring', 'Mana Crypt', 'Mana Vault', 'Chrome Mox', 'Mox Diamond', 'Lotus Petal', 'Black Lotus'],
      },
      {
        category: 'Planeswalkers',
        explanation: `Balance doesn't affect planeswalkers! Deploy Jace or Teferi, Balance away their board, then win with your walker.`,
        cards: ['Jace, the Mind Sculptor', 'The Wandering Emperor', 'Teferi, Time Raveler', 'Narset, Parter of Veils', 'Liliana of the Veil', 'Chandra, Torch of Defiance', 'Dack Fayden'],
      },
      {
        category: 'Win Conditions That Survive',
        explanation: `Artifacts and enchantments survive Balance. These can close the game after you've devastated them.`,
        cards: ['Batterskull', 'The One Ring', 'Bolas\'s Citadel', 'Treachery', 'Parallax Wave', 'Umezawa\'s Jitte', 'Retrofitter Foundry'],
      },
      {
        category: 'Card Draw to Empty Hand',
        explanation: `Draw cards, play them all out, then Balance. Opponent discards their hand, you already spent yours.`,
        cards: ['Ancestral Recall', 'Brainstorm', 'Ponder', 'Preordain', 'Gitaxian Probe', 'Night\'s Whisper'],
      },
      {
        category: 'Counterspell Backup',
        explanation: `Protect your Balance from their counters, or counter their attempts to rebuild.`,
        cards: ['Force of Will', 'Force of Negation', 'Mana Drain', 'Counterspell', 'Spell Pierce', 'Daze'],
      },
      {
        category: 'Creature-Light Win Cons',
        explanation: `If you must play creatures, use these that either come back or you play AFTER Balance.`,
        cards: ['Monastery Mentor', 'Snapcaster Mage', 'True-Name Nemesis', 'Solitude'],
      },
    ],
    antiSynergies: [
      'Creature-heavy strategies',
      'Expensive spells that clog your hand',
      'Land-based ramp (you want artifact ramp)',
      'Cards that require a board presence',
    ],
    sampleDeck: {
      mainboard: [
        // The star
        'Balance',
        // Fast mana (12)
        'Black Lotus', 'Mox Pearl', 'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald',
        'Sol Ring', 'Mana Crypt', 'Mana Vault', 'Chrome Mox', 'Lotus Petal', 'Grim Monolith',
        // Card draw (6)
        'Ancestral Recall', 'Brainstorm', 'Ponder', 'Preordain', 'Gitaxian Probe', 'Time Walk',
        // Planeswalkers (4)
        'Jace, the Mind Sculptor', 'The Wandering Emperor', 'Teferi, Time Raveler', 'Narset, Parter of Veils',
        // Protection (5)
        'Force of Will', 'Force of Negation', 'Mana Drain', 'Counterspell', 'Spell Pierce',
        // Win cons (4)
        'Batterskull', 'Monastery Mentor', 'True-Name Nemesis', 'The One Ring',
        // Removal (2)
        'Swords to Plowshares', 'Council\'s Judgment',
      ],
      lands: [
        'Tundra', 'Hallowed Fountain', 'Flooded Strand', 'Polluted Delta',
        'Scalding Tarn', 'Misty Rainforest', 'Prismatic Vista',
        'Island', 'Island', 'Plains',
      ],
    },
    draftTips: [
      'P1P1 Balance is incredible - you can build around it in UW, Esper, or Jeskai',
      'Prioritize Moxen and Sol Ring even higher than usual',
      'Take planeswalkers over creatures when possible',
      'Avoid creature-heavy cards even if they\'re good',
      'Late-pick artifact mana is great because other decks want lands',
    ],
    openingHands: [
      'Mox, Mox, Land, Balance, Jace, Counterspell, Brainstorm → Turn 2 Balance into Jace = GG',
      'Sol Ring, Mox, Balance, Force of Will, blue card, Teferi, Land → Protected turn 2 Balance',
      'Black Lotus, Balance, Ancestral, Land, Force, Jace, Ponder → Turn 1 Balance is possible!',
    ],
  },
  {
    cardName: 'Tinker',
    whyItsBroken: `Tinker lets you sacrifice any artifact (even a Mox or Lotus Petal) and search your library for ANY artifact and put it directly into play. For 3 mana, you get Blightsteel Colossus (an 11/11 infect trampler that kills in one hit).`,
    keyStrategy: `Play artifact mana, then Tinker a cheap artifact into Blightsteel Colossus. Attack once, opponent dies to infect. The whole combo costs just 3 mana and can happen turn 1 with Black Lotus.`,
    synergies: [
      {
        category: 'Tinker Targets',
        explanation: `The fatties you're searching for. Blightsteel is the best because it's an instant kill.`,
        cards: ['Blightsteel Colossus', 'Kaldra Compleat', 'Wurmcoil Engine', 'Myr Battlesphere', 'Portal to Phyrexia', 'Batterskull', 'The One Ring'],
      },
      {
        category: 'Tinker Fodder',
        explanation: `Cheap artifacts to sacrifice. You don't care about losing a Mox if you get Blightsteel.`,
        cards: ['Lotus Petal', 'Mox Sapphire', 'Mox Pearl', 'Chrome Mox', 'Mishra\'s Bauble', 'Urza\'s Bauble', 'Chromatic Star', 'Sol Ring'],
      },
      {
        category: 'Protection',
        explanation: `Make sure Tinker resolves and Blightsteel connects.`,
        cards: ['Force of Will', 'Force of Negation', 'Spell Pierce', 'Daze', 'Lightning Greaves'],
      },
      {
        category: 'Plan B',
        explanation: `If Blightsteel gets answered, have backup plans.`,
        cards: ['Show and Tell', 'Sneak Attack', 'Goblin Welder', 'Goblin Engineer', 'Daretti, Scrap Savant'],
      },
    ],
    antiSynergies: [
      'Creature removal (they can still kill Blightsteel before it attacks)',
      'Artifact hate like Null Rod',
      'Not having enough artifacts to sacrifice',
    ],
    sampleDeck: {
      mainboard: [
        'Tinker',
        // Targets (3)
        'Blightsteel Colossus', 'Kaldra Compleat', 'Wurmcoil Engine',
        // Fodder/Mana (11)
        'Black Lotus', 'Mox Sapphire', 'Mox Pearl', 'Mox Jet', 'Sol Ring', 'Mana Crypt',
        'Mana Vault', 'Lotus Petal', 'Chrome Mox', 'Grim Monolith', 'Mishra\'s Bauble',
        // Protection (5)
        'Force of Will', 'Force of Negation', 'Spell Pierce', 'Daze', 'Mana Drain',
        // Card draw (6)
        'Ancestral Recall', 'Brainstorm', 'Ponder', 'Preordain', 'Time Walk', 'Gitaxian Probe',
        // Backup plans (4)
        'Show and Tell', 'Goblin Welder', 'Goblin Engineer', 'Urza, Lord High Artificer',
      ],
      lands: [
        'Tolarian Academy', 'Volcanic Island', 'Steam Vents', 'Scalding Tarn',
        'Polluted Delta', 'Misty Rainforest', 'Ancient Tomb',
        'Island', 'Island', 'Mountain',
      ],
    },
    draftTips: [
      'P1P1 Tinker is a signal to go all-in on artifacts',
      'Blightsteel is the #1 priority after Tinker',
      'Any Mox or cheap artifact becomes premium',
      'Tolarian Academy is insane in this deck',
      'Goblin Welder provides recursion if they answer Blightsteel',
    ],
    openingHands: [
      'Tinker, Mox, Sol Ring, Land, Force of Will, Blightsteel, Brainstorm → Turn 2 Blightsteel with protection',
      'Black Lotus, Tinker, Blightsteel, Land, Force → Turn 1 Blightsteel!',
      'Tinker, Lotus Petal, Island, Island, Spell Pierce, Ponder, Time Walk → Setup into protected Tinker',
    ],
  },
  {
    cardName: 'Channel',
    whyItsBroken: `Channel lets you pay life instead of mana. With 20 life, you can generate 19 mana on turn 1 or 2. Cast Emrakul, attack with annihilator 6, and they lose. It's a 2-card combo that wins the game instantly.`,
    keyStrategy: `Cast Channel (GG), pay 15+ life, cast Emrakul, the Aeons Torn (15 mana but you paid life). Emrakul gives you an extra turn, you attack, annihilator 6 makes them sacrifice 6 permanents, and the 15 damage usually kills them.`,
    synergies: [
      {
        category: 'Channel Targets',
        explanation: `Huge threats you can cast by paying life. Emrakul is the best because it can't be countered and gives an extra turn.`,
        cards: ['Emrakul, the Aeons Torn', 'Blightsteel Colossus', 'Craterhoof Behemoth', 'Walking Ballista', 'Wurmcoil Engine'],
      },
      {
        category: 'Fast Mana for GG',
        explanation: `You need GG on turn 1-2 to cast Channel. Green dorks and Moxen help.`,
        cards: ['Mox Emerald', 'Birds of Paradise', 'Llanowar Elves', 'Elvish Mystic', 'Noble Hierarch', 'Black Lotus', 'Fastbond'],
      },
      {
        category: 'Finding the Combo',
        explanation: `Card selection to find Channel + payoff.`,
        cards: ['Sylvan Library', 'Once Upon a Time', 'Green Sun\'s Zenith', 'Ponder', 'Brainstorm', 'Demonic Tutor'],
      },
    ],
    antiSynergies: [
      'Paying too much life against aggro',
      'Counterspells (except Emrakul can\'t be countered)',
      'Not having a big enough payoff',
    ],
    sampleDeck: {
      mainboard: [
        'Channel',
        // Payoffs (4)
        'Emrakul, the Aeons Torn', 'Blightsteel Colossus', 'Walking Ballista', 'Craterhoof Behemoth',
        // Green mana (10)
        'Mox Emerald', 'Black Lotus', 'Birds of Paradise', 'Llanowar Elves', 'Elvish Mystic',
        'Noble Hierarch', 'Ignoble Hierarch', 'Arbor Elf', 'Lotus Cobra', 'Rofellos, Llanowar Emissary',
        // Card selection (6)
        'Once Upon a Time', 'Green Sun\'s Zenith', 'Sylvan Library', 'Ponder', 'Brainstorm', 'Ancestral Recall',
        // Protection/Backup (5)
        'Force of Will', 'Force of Negation', 'Natural Order', 'Show and Tell', 'Fastbond',
      ],
      lands: [
        'Tropical Island', 'Breeding Pool', 'Gaea\'s Cradle', 'Misty Rainforest',
        'Windswept Heath', 'Wooded Foothills',
        'Forest', 'Forest', 'Forest', 'Island',
      ],
    },
    draftTips: [
      'P1P1 Channel is great but you NEED payoffs',
      'Emrakul is the #1 priority - it can\'t be countered',
      'Take mana dorks highly to enable turn 2 Channel',
      'Walking Ballista is a flexible backup that kills with X=10',
    ],
    openingHands: [
      'Forest, Mox Emerald, Channel, Emrakul → Turn 1 Emrakul, take extra turn, they die',
      'Forest, Elf, Channel, Emrakul, Force → Turn 2 Emrakul with protection',
      'Forest, Forest, Birds, Channel, Walking Ballista → Turn 2 Ballista X=17 to the face',
    ],
  },
  {
    cardName: 'Entomb',
    whyItsBroken: `Entomb is a 1-mana instant that puts ANY creature from your deck into your graveyard. Combine with Reanimate (1 mana) and you have a 2-mana combo that puts Griselbrand into play on turn 1. Griselbrand draws 14 cards and you win from there.`,
    keyStrategy: `Turn 1: Swamp, Dark Ritual, Entomb (get Griselbrand), Reanimate (pay 8 life). You now have a 7/7 flying lifelink that draws 7 cards per activation. Draw 14, find more action, win.`,
    synergies: [
      {
        category: 'Reanimation Targets',
        explanation: `The creatures you're putting in the graveyard. Griselbrand is best because it refills your hand.`,
        cards: ['Griselbrand', 'Archon of Cruelty', 'Atraxa, Grand Unifier', 'Sheoldred, the Apocalypse', 'Emrakul, the Aeons Torn'],
      },
      {
        category: 'Reanimation Spells',
        explanation: `Ways to get the creature from graveyard to play.`,
        cards: ['Reanimate', 'Animate Dead', 'Necromancy', 'Exhume', 'Shallow Grave', 'Recurring Nightmare'],
      },
      {
        category: 'Fast Mana',
        explanation: `Enable turn 1 kills with Dark Ritual.`,
        cards: ['Dark Ritual', 'Mox Jet', 'Lotus Petal', 'Black Lotus', 'Cabal Ritual'],
      },
      {
        category: 'Backup Enablers',
        explanation: `Other ways to get creatures in the graveyard.`,
        cards: ['Faithless Looting', 'Frantic Search', 'Careful Study', 'Brainstorm', 'Grief'],
      },
    ],
    antiSynergies: [
      'Graveyard hate (Leyline, Surgical)',
      'Not having enough reanimation spells',
      'Too many reanimation targets clogging your hand',
    ],
    sampleDeck: {
      mainboard: [
        'Entomb',
        // Targets (4)
        'Griselbrand', 'Archon of Cruelty', 'Atraxa, Grand Unifier', 'Sheoldred, the Apocalypse',
        // Reanimation (6)
        'Reanimate', 'Animate Dead', 'Necromancy', 'Exhume', 'Shallow Grave', 'Recurring Nightmare',
        // Fast mana (5)
        'Dark Ritual', 'Mox Jet', 'Mox Sapphire', 'Lotus Petal', 'Black Lotus',
        // Disruption (5)
        'Thoughtseize', 'Grief', 'Force of Will', 'Force of Negation', 'Duress',
        // Card selection (5)
        'Brainstorm', 'Ponder', 'Faithless Looting', 'Frantic Search', 'Vampiric Tutor',
      ],
      lands: [
        'Underground Sea', 'Watery Grave', 'Polluted Delta', 'Bloodstained Mire',
        'Scalding Tarn', 'Verdant Catacombs',
        'Swamp', 'Swamp', 'Island', 'Island',
      ],
    },
    draftTips: [
      'P1P1 Entomb means you\'re in Reanimator',
      'Griselbrand is the best target by far',
      'Prioritize Reanimate and Animate Dead highly',
      'Dark Ritual enables the broken turn 1 draws',
      'Grief is amazing - Evoke it, then Reanimate it',
    ],
    openingHands: [
      'Swamp, Dark Ritual, Entomb, Reanimate → Turn 1 Griselbrand, draw 14',
      'Underground Sea, Entomb, Reanimate, Force, blue card → Turn 2 protected Griselbrand',
      'Swamp, Entomb, Shallow Grave, Dark Ritual → Turn 1 instant-speed Griselbrand on their end step',
    ],
  },
];

export function BuildAround({ cards }: BuildAroundProps) {
  const [selectedGuide, setSelectedGuide] = useState<BuildAroundGuide | null>(BUILD_AROUND_GUIDES[0]);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const cardsByName = useMemo(() => {
    const map = new Map<string, CubeCard>();
    cards.forEach(card => map.set(card.name, card));
    return map;
  }, [cards]);

  const getCard = (name: string): CubeCard | undefined => cardsByName.get(name);
  const mainCard = selectedGuide ? getCard(selectedGuide.cardName) : null;

  const filteredGuides = BUILD_AROUND_GUIDES.filter(g =>
    g.cardName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedGuide) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Build Around Guide</h2>
          <p className="text-gray-400">Deep dive into the cube's most powerful cards</p>
        </div>
      </div>

      {/* Card Selector */}
      <div className="flex flex-wrap gap-2">
        {BUILD_AROUND_GUIDES.map(guide => {
          const card = getCard(guide.cardName);
          return (
            <button
              key={guide.cardName}
              onClick={() => setSelectedGuide(guide)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl transition-all
                ${selectedGuide.cardName === guide.cardName
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {card && (
                <div className="w-8 h-10 rounded overflow-hidden">
                  <img src={getCardImage(card)} alt="" className="w-full h-full object-cover object-top" />
                </div>
              )}
              <span className="font-medium">{guide.cardName}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Card & Why It's Broken */}
        <div className="space-y-6">
          {/* Card Image */}
          {mainCard && (
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur-xl opacity-30" />
              <img
                src={getCardImage(mainCard)}
                alt={mainCard.name}
                className="relative w-full max-w-[300px] mx-auto rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Why It's Broken */}
          <Card className="bg-gradient-to-br from-red-900/30 to-transparent border-red-800/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Why It's Broken
              </CardTitle>
            </CardHeader>
            <p className="text-gray-300 text-sm leading-relaxed">{selectedGuide.whyItsBroken}</p>
          </Card>

          {/* Key Strategy */}
          <Card className="bg-gradient-to-br from-purple-900/30 to-transparent border-purple-800/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Target className="w-5 h-5" />
                Key Strategy
              </CardTitle>
            </CardHeader>
            <p className="text-gray-300 text-sm leading-relaxed">{selectedGuide.keyStrategy}</p>
          </Card>
        </div>

        {/* Middle Column - Synergies */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Synergies
          </h3>

          {selectedGuide.synergies.map((synergy, idx) => (
            <Card key={idx} className="p-4">
              <h4 className="font-bold text-white mb-1">{synergy.category}</h4>
              <p className="text-sm text-gray-400 mb-3">{synergy.explanation}</p>
              <div className="flex flex-wrap gap-1">
                {synergy.cards.map(cardName => {
                  const card = getCard(cardName);
                  return (
                    <span
                      key={cardName}
                      className={`
                        text-xs px-2 py-1 rounded cursor-pointer transition-colors
                        ${card ? 'bg-green-900/30 text-green-400 hover:bg-green-800/50' : 'bg-gray-800 text-gray-500 line-through'}
                      `}
                      onMouseEnter={() => card && setHoveredCard(card)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {cardName}
                      {card && <span className="ml-1 opacity-50">({card.powerLevel})</span>}
                    </span>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* Anti-Synergies */}
          <Card className="p-4 bg-red-900/10 border-red-900/30">
            <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
              <X className="w-4 h-4" />
              Avoid
            </h4>
            <ul className="space-y-1">
              {selectedGuide.antiSynergies.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-red-500">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column - Sample Deck & Tips */}
        <div className="space-y-4">
          {/* Draft Tips */}
          <Card className="p-4 bg-gradient-to-br from-cyan-900/20 to-transparent border-cyan-800/30">
            <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Draft Tips
            </h4>
            <ul className="space-y-2">
              {selectedGuide.draftTips.map((tip, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>

          {/* Nut Draws */}
          <Card className="p-4 bg-gradient-to-br from-yellow-900/20 to-transparent border-yellow-800/30">
            <h4 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Dream Opening Hands
            </h4>
            <div className="space-y-3">
              {selectedGuide.openingHands.map((hand, idx) => (
                <div key={idx} className="p-2 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-300 font-mono">{hand}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Sample Decklist Preview */}
          <Card className="p-4">
            <h4 className="font-bold text-white mb-3">Sample Decklist</h4>
            <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto scrollbar-thin">
              {[...selectedGuide.sampleDeck.mainboard, ...selectedGuide.sampleDeck.lands].map((cardName, idx) => {
                const card = getCard(cardName);
                if (!card) return null;
                return (
                  <div
                    key={`${cardName}-${idx}`}
                    className="w-10 h-14 rounded overflow-hidden cursor-pointer hover:scale-110 transition-transform"
                    onMouseEnter={() => setHoveredCard(card)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedGuide.sampleDeck.mainboard.filter(n => getCard(n)).length} spells + {selectedGuide.sampleDeck.lands.filter(n => getCard(n)).length} lands
            </p>
          </Card>
        </div>
      </div>

      {/* Hover Preview */}
      {hoveredCard && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-gray-900 p-3 rounded-2xl border border-gray-700 shadow-2xl">
              <img
                src={getCardImage(hoveredCard)}
                alt={hoveredCard.name}
                className="w-64 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
