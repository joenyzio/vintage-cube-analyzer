import { useMemo, useState, useRef, useCallback } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { TrendingUp, Users, Zap, Target, AlertTriangle, CheckCircle, X, Database } from 'lucide-react';
import simulationData8p from '../data/simulation-data.json';
import simulationData6p from '../data/simulation-data-6p.json';

// Both simulation datasets
const SIMULATIONS = {
  '8': simulationData8p,
  '6': simulationData6p,
} as const;

type PlayerCount = '8' | '6';

interface Props {
  cards: CubeCard[];
}

interface SimulationArchetypeData {
  count: number;
  avgCommitment: number;
  avgDeckQuality: number;
}

interface CardStats {
  pickCount: number;
  avgPickPosition: number;
  archetypeBreakdown: Record<string, number>;
  sideboardCount: number;
}

// Archetype metadata - all 10 archetypes from simulation
interface ArchetypeMeta {
  id: string;
  name: string;
  description: string;
  strategy: string;
  colors: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  // NEW: Honest metrics
  consistency: 'stable' | 'variable' | 'matchup-dependent';
  riskLevel: 'low' | 'medium' | 'high';
  criticalPieces: string[]; // Cards that MUST be present for archetype to function
  idealPieces: string[]; // Cards that significantly improve the archetype
  pivotsTo: string[]; // Backup archetypes if this doesn't come together
  matchupProfile: {
    vsCreature: 'favored' | 'even' | 'unfavored';
    vsControl: 'favored' | 'even' | 'unfavored';
    vsCombo: 'favored' | 'even' | 'unfavored';
    notes: string;
  };
  cardPoolSize: number; // Approximate number of cards in cube that fit this archetype
  failureModes: string[]; // Common ways this archetype fails
}

const ARCHETYPE_META: Record<string, ArchetypeMeta> = {
  midrange: {
    id: 'midrange',
    name: 'Midrange',
    description: 'Value-oriented decks with efficient threats and disruption',
    strategy: 'Aim for Sultai (BGU) — the best fair deck. Black is essential: Liliana, Thoughtseize, Dark Confidant. Avoid GW-based variants.',
    colors: ['B', 'G', 'U'],
    difficulty: 'Easy',
    consistency: 'stable',
    riskLevel: 'low',
    criticalPieces: [], // No single card required
    idealPieces: ['Oko, Thief of Crowns', 'Uro, Titan of Nature\'s Wrath', 'Dark Confidant', 'Liliana of the Veil'],
    pivotsTo: ['tempo', 'control', 'ramp'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'even',
      vsCombo: 'unfavored',
      notes: 'Solid across the board but lacks speed vs combo'
    },
    cardPoolSize: 80,
    failureModes: ['Drafting GW instead of BUG', 'No card advantage engines', 'Curve too high']
  },
  aggro: {
    id: 'aggro',
    name: 'Aggro',
    description: 'Fast, aggressive decks that win before opponents stabilize',
    strategy: 'Jeskai (RUW) beats Boros by 100 ELO points. Splash Blue for Daze and Spell Pierce to protect your clock.',
    colors: ['R', 'W', 'U'],
    difficulty: 'Easy',
    consistency: 'variable',
    riskLevel: 'medium',
    criticalPieces: [], // No single card required
    idealPieces: ['Ragavan, Nimble Pilferer', 'Monastery Swiftspear', 'Lightning Bolt', 'Goblin Guide'],
    pivotsTo: ['tempo', 'artifacts'],
    matchupProfile: {
      vsCreature: 'even',
      vsControl: 'favored',
      vsCombo: 'favored',
      notes: 'Fast enough to race combo, but folds to Wrath effects'
    },
    cardPoolSize: 45,
    failureModes: ['No reach/burn to close', 'Opponent lands Wrath', 'Pure Boros without blue protection']
  },
  reanimator: {
    id: 'reanimator',
    name: 'Reanimator',
    description: 'Cheat massive creatures from graveyard to battlefield',
    strategy: 'Need the trifecta: discard outlet (Entomb/looting), reanimate spell (Animate Dead/Reanimate), and fatty (Griselbrand/Archon).',
    colors: ['B', 'U'],
    difficulty: 'Medium',
    consistency: 'stable',
    riskLevel: 'medium',
    criticalPieces: ['Reanimate', 'Animate Dead', 'Entomb'],
    idealPieces: ['Griselbrand', 'Archon of Cruelty', 'Faithless Looting', 'Unmarked Grave'],
    pivotsTo: ['oath', 'sneak', 'control'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'even',
      vsCombo: 'even',
      notes: 'Consistent when assembled. Graveyard hate is the counter.'
    },
    cardPoolSize: 25,
    failureModes: ['Missing reanimate spell', 'Missing discard outlet', 'Opponent has graveyard hate']
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo',
    description: 'Efficient threats backed by cheap interaction',
    strategy: 'Sultai Tempo (BGU) is tier-1. Black adds Thoughtseize for combo protection. True-Name Nemesis is core.',
    colors: ['U', 'B', 'G'],
    difficulty: 'Medium',
    consistency: 'stable',
    riskLevel: 'low',
    criticalPieces: [],
    idealPieces: ['True-Name Nemesis', 'Daze', 'Force of Will', 'Ragavan, Nimble Pilferer'],
    pivotsTo: ['midrange', 'control', 'aggro'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'even',
      vsCombo: 'favored',
      notes: 'Cheap threats + disruption beats most strategies'
    },
    cardPoolSize: 50,
    failureModes: ['Threats too slow', 'Not enough cheap interaction', 'Curve too high']
  },
  ramp: {
    id: 'ramp',
    name: 'Ramp',
    description: 'Accelerate mana to cast powerful threats ahead of curve',
    strategy: 'Prioritize mana dorks and ramp spells. Need payoffs (6+ mana cards) to make ramp worthwhile.',
    colors: ['G'],
    difficulty: 'Medium',
    consistency: 'stable',
    riskLevel: 'low',
    criticalPieces: [],
    idealPieces: ['Channel', 'Natural Order', 'Craterhoof Behemoth', 'Primeval Titan'],
    pivotsTo: ['midrange', 'oath'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'unfavored',
      vsCombo: 'unfavored',
      notes: 'Goes over creature decks but too slow vs counters/combo'
    },
    cardPoolSize: 40,
    failureModes: ['No payoffs', 'Opponent counters key threat', 'Too many dorks not enough gas']
  },
  control: {
    id: 'control',
    name: 'Control',
    description: 'Answer everything, win with card advantage',
    strategy: 'Prioritize removal, counterspells, and card draw. Win conditions can come late.',
    colors: ['U', 'W', 'B'],
    difficulty: 'Hard',
    consistency: 'stable',
    riskLevel: 'medium',
    criticalPieces: [],
    idealPieces: ['Jace, the Mind Sculptor', 'Force of Will', 'Mana Drain', 'Supreme Verdict'],
    pivotsTo: ['tempo', 'midrange'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'even',
      vsCombo: 'unfavored',
      notes: 'Beats fair decks, struggles vs fast combo'
    },
    cardPoolSize: 35,
    failureModes: ['Not enough win conditions', 'Wrong answers for threats', 'Too slow vs combo']
  },
  artifacts: {
    id: 'artifacts',
    name: 'Artifacts',
    description: 'Synergy-driven artifact deck with Tinker and artifact creatures',
    strategy: 'Build around artifact synergies. Tinker, Welder, and artifact lands are key. Often colorless-heavy.',
    colors: [],
    difficulty: 'Hard',
    consistency: 'variable',
    riskLevel: 'medium',
    criticalPieces: ['Tinker'],
    idealPieces: ['Goblin Welder', 'Tolarian Academy', 'Blightsteel Colossus', 'Time Vault', 'Voltaic Key'],
    pivotsTo: ['control', 'ramp'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'even',
      vsCombo: 'even',
      notes: 'Tinker into Blightsteel is often game over'
    },
    cardPoolSize: 46,
    failureModes: ['No Tinker', 'No good Tinker targets', 'Artifact hate in sideboard']
  },
  oath: {
    id: 'oath',
    name: 'Oath of Druids',
    description: 'Oath of Druids + creature-light deck = free fatties',
    strategy: 'Need Oath of Druids + very few creatures. CRITICAL: Cube lacks Forbidden Orchard — you\'re dependent on opponent playing creatures.',
    colors: ['G', 'U'],
    difficulty: 'Expert',
    consistency: 'matchup-dependent',
    riskLevel: 'high',
    criticalPieces: ['Oath of Druids'],
    idealPieces: ['Forbidden Orchard', 'Griselbrand', 'Emrakul, the Aeons Torn', 'Show and Tell'],
    pivotsTo: ['reanimator', 'sneak', 'control'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'unfavored',
      vsCombo: 'unfavored',
      notes: 'WITHOUT ORCHARD: ~90% vs creatures, ~30% vs creatureless. Matchup lottery.'
    },
    cardPoolSize: 8,
    failureModes: ['Opponent plays no creatures', 'Oath not drawn', 'Only copy taken by someone else', 'Missing Forbidden Orchard (NOT IN CUBE)']
  },
  sneak: {
    id: 'sneak',
    name: 'Sneak & Show',
    description: 'Cheat Emrakul/Griselbrand into play with Sneak Attack or Show and Tell',
    strategy: 'Need enabler (Sneak Attack/Show and Tell/Through the Breach) + target (Emrakul/Griselbrand). Only ~5 total enablers in cube.',
    colors: ['R', 'U'],
    difficulty: 'Expert',
    consistency: 'variable',
    riskLevel: 'high',
    criticalPieces: ['Sneak Attack', 'Show and Tell', 'Through the Breach'],
    idealPieces: ['Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience'],
    pivotsTo: ['reanimator', 'oath', 'ramp'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'unfavored',
      vsCombo: 'even',
      notes: 'Fast kills but folds to Force of Will'
    },
    cardPoolSize: 12,
    failureModes: ['No enabler', 'No fatty', 'Opponent has Force of Will', 'Enablers all taken']
  },
  storm: {
    id: 'storm',
    name: 'Storm',
    description: 'Chain spells together, win with Tendrils of Agony or Brain Freeze',
    strategy: 'Need payoff (Tendrils/Brain Freeze) + enablers (rituals, draw spells, Yawgmoth\'s Will). Only 9 storm-specific cards in cube.',
    colors: ['B', 'U'],
    difficulty: 'Expert',
    consistency: 'variable',
    riskLevel: 'high',
    criticalPieces: ['Tendrils of Agony', 'Brain Freeze', "Yawgmoth's Will"],
    idealPieces: ['Dark Ritual', 'Lion\'s Eye Diamond', 'Wheel of Fortune', 'Time Spiral'],
    pivotsTo: ['reanimator', 'control'],
    matchupProfile: {
      vsCreature: 'favored',
      vsControl: 'unfavored',
      vsCombo: 'even',
      notes: 'Goldfish fast but folds to any disruption'
    },
    cardPoolSize: 9,
    failureModes: ['No payoff drawn', 'Opponent has Thalia/disruption', 'Fizzle mid-combo', 'Only 9 cards in cube — high variance']
  },
};

interface ArchetypeStats {
  meta: ArchetypeMeta;
  coreCards: CubeCard[];
  supportCards: CubeCard[];
  coreCount: number;
  supportCount: number;
  avgDeckQuality: number;
  contestedness: number;
  draftOdds: number;
  signalCost: 'early' | 'mid' | 'late';
  totalDecksInArchetype: number;
  avgPickPosition: number;
}

// Get cards that actually appear in this archetype based on simulation data
function getSimulatedArchetypeCards(
  cards: CubeCard[],
  archetypeId: string,
  simCardStats: Record<string, CardStats>
): { core: CubeCard[]; support: CubeCard[]; avgPickPosition: number } {
  const cardsByAffinity: { card: CubeCard; affinity: number; pickPos: number }[] = [];

  for (const card of cards) {
    const stats = simCardStats[card.name];
    if (!stats || !stats.archetypeBreakdown) continue;

    const picksInArchetype = stats.archetypeBreakdown[archetypeId] || 0;
    if (picksInArchetype === 0) continue;

    // Affinity = what % of this card's picks go to this archetype
    const affinity = (picksInArchetype / stats.pickCount) * 100;

    cardsByAffinity.push({
      card,
      affinity,
      pickPos: stats.avgPickPosition
    });
  }

  // Sort by affinity (how much this archetype "owns" the card)
  cardsByAffinity.sort((a, b) => b.affinity - a.affinity);

  // Core cards: >12% affinity (this archetype picks it disproportionately)
  // Support cards: 5-12% affinity
  const core: CubeCard[] = [];
  const support: CubeCard[] = [];
  let totalPickPos = 0;
  let coreCount = 0;

  for (const { card, affinity, pickPos } of cardsByAffinity) {
    if (affinity >= 12) {
      core.push(card);
      totalPickPos += pickPos;
      coreCount++;
    } else if (affinity >= 5) {
      support.push(card);
    }
  }

  // Sort core by pick position (earlier = more important)
  core.sort((a, b) => {
    const aPos = simCardStats[a.name]?.avgPickPosition || 99;
    const bPos = simCardStats[b.name]?.avgPickPosition || 99;
    return aPos - bPos;
  });

  return {
    core,
    support,
    avgPickPosition: coreCount > 0 ? totalPickPos / coreCount : 30
  };
}

// Calculate contestedness from simulation: how many other archetypes want these core cards
function calculateSimContestedness(
  coreCards: CubeCard[],
  myArchetypeId: string,
  simCardStats: Record<string, CardStats>
): number {
  if (coreCards.length === 0) return 50;

  let totalContestedness = 0;

  for (const card of coreCards) {
    const stats = simCardStats[card.name];
    if (!stats || !stats.archetypeBreakdown) {
      totalContestedness += 50;
      continue;
    }

    // Count how many archetypes take this card significantly
    const breakdown = stats.archetypeBreakdown;
    const myPicks = breakdown[myArchetypeId] || 0;
    const otherPicks = stats.pickCount - myPicks;

    // Contestedness = what % of picks go to OTHER archetypes
    const contestedness = (otherPicks / stats.pickCount) * 100;
    totalContestedness += contestedness;
  }

  return Math.round(totalContestedness / coreCards.length);
}

function getSignalCost(draftOdds: number, coreCount: number): 'early' | 'mid' | 'late' {
  // Low draft odds + few core cards = must commit early
  if (draftOdds < 5 || coreCount < 5) return 'early';
  if (draftOdds < 10) return 'mid';
  return 'late';
}

export function ArchetypeOddsPage({ cards }: Props) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>('8');

  // Get simulation data for selected player count
  const simulationData = SIMULATIONS[playerCount];
  const simArchetypes = simulationData.archetypeDistribution as Record<string, SimulationArchetypeData>;
  const simCardStats = simulationData.cardStats as Record<string, CardStats>;
  const totalDecks = simulationData.totalDecks;

  const stats = useMemo(() => {
    const results: ArchetypeStats[] = [];

    // Iterate over all simulation archetypes
    for (const [archetypeId, simData] of Object.entries(simArchetypes)) {
      const meta = ARCHETYPE_META[archetypeId];
      if (!meta) continue; // Skip if no metadata defined

      // Get REAL draft odds from simulation
      const realDraftOdds = (simData.count / totalDecks) * 100;

      // Get cards that ACTUALLY appear in this archetype
      const { core, support, avgPickPosition } = getSimulatedArchetypeCards(cards, archetypeId, simCardStats);

      // Calculate contestedness from simulation
      const contestedness = calculateSimContestedness(core, archetypeId, simCardStats);

      // Get deck quality from simulation (this is the real "power" metric)
      const avgDeckQuality = simData.avgDeckQuality;

      const signalCost = getSignalCost(realDraftOdds, core.length);

      results.push({
        meta,
        coreCards: core,
        supportCards: support,
        coreCount: core.length,
        supportCount: support.length,
        avgDeckQuality: Math.round(avgDeckQuality),
        contestedness,
        draftOdds: Math.round(realDraftOdds * 10) / 10, // One decimal
        signalCost,
        totalDecksInArchetype: simData.count,
        avgPickPosition: Math.round(avgPickPosition * 10) / 10,
      });
    }

    // Sort by draft odds descending (most draftable first)
    return results.sort((a, b) => b.draftOdds - a.draftOdds);
  }, [cards, simArchetypes, simCardStats, totalDecks]);

  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CubeCard | null>(null);
  const [showRealistic, setShowRealistic] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter cards for realistic view (exclude power 9+ cards that everyone fights over)
  const filterRealistic = useCallback((cardList: CubeCard[]) => {
    if (!showRealistic) return cardList;
    return cardList.filter(c => c.powerLevel < 9);
  }, [showRealistic]);

  const handleBubbleClick = useCallback((archetypeId: string) => {
    setSelectedArchetype(archetypeId);
    // Scroll to the card
    const el = cardRefs.current[archetypeId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const selectedStat = stats.find(s => s.meta.id === selectedArchetype);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'text-green-400 bg-green-400/10';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'Hard': return 'text-orange-400 bg-orange-400/10';
      case 'Expert': return 'text-red-400 bg-red-400/10';
      default: return 'text-white/50 bg-white/5';
    }
  };

  const getOddsColor = (odds: number) => {
    if (odds >= 12) return 'text-green-400';
    if (odds >= 8) return 'text-yellow-400';
    if (odds >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getOddsBarColor = (odds: number) => {
    if (odds >= 12) return 'bg-green-500';
    if (odds >= 8) return 'bg-yellow-500';
    if (odds >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Archetype Draft Odds</h1>
            <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
              <Database className="w-3 h-3" />
              Live Data
            </span>
          </div>
          <p className="text-white/50 mt-1">
            Based on {simulationData.draftCount.toLocaleString()} simulated drafts ({simulationData.totalDecks.toLocaleString()} decks)
            {playerCount === '6' && <span className="text-amber-400"> • 90 cards undrafted per draft</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Player Count Toggle */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setPlayerCount('8')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1.5 ${
                playerCount === '8' ? 'bg-purple-500/20 text-purple-400' : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              8 Players
            </button>
            <button
              onClick={() => setPlayerCount('6')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1.5 ${
                playerCount === '6' ? 'bg-purple-500/20 text-purple-400' : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              6 Players
            </button>
          </div>

          {/* Build Mode Toggle */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setShowRealistic(false)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                !showRealistic ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
              }`}
            >
              Ideal Build
            </button>
            <button
              onClick={() => setShowRealistic(true)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                showRealistic ? 'bg-green-500/20 text-green-400' : 'text-white/50 hover:text-white/70'
              }`}
            >
              Realistic Build
            </button>
          </div>
        </div>
      </div>

      {showRealistic && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm text-green-400">
          Showing realistic builds - excludes Power 9+ cards (Moxen, Lotus, Sol Ring, etc.) that everyone fights over. This is closer to what you'll actually draft.
        </div>
      )}

      {/* Scatter Chart: Deck Quality vs Draft Frequency - Enhanced */}
      <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Archetype Landscape</h2>
            <p className="text-sm text-white/40 mt-1">Quality vs Frequency — includes all color variants</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-4 px-3 py-2 bg-white/5 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border-2 border-white/40" />
                <span className="text-white/50">Main</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                <span className="text-white/50">Variant</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-white/40">Mid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-white/40">Aggro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-white/40">Tempo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-visible" style={{ height: 520 }}>
          {/* Y axis (Deck Quality) */}
          <div className="absolute left-0 top-0 bottom-10 w-14 flex flex-col justify-between text-[11px] text-white/30 font-mono pr-2 text-right">
            <span>2000</span>
            <span>1960</span>
            <span>1920</span>
            <span>1880</span>
            <span>1840</span>
            <span>1800</span>
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-white/30 uppercase tracking-widest whitespace-nowrap" style={{ transformOrigin: 'center center', marginLeft: '-24px' }}>
            Avg Card Power
          </div>

          {/* X axis (Draft %) */}
          <div className="absolute left-14 right-0 bottom-0 h-10 flex justify-between text-[11px] text-white/30 font-mono px-1 items-start pt-2">
            <span>0%</span>
            <span>5%</span>
            <span>10%</span>
            <span>15%</span>
            <span>20%</span>
            <span>25%</span>
            <span>30%</span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-[10px] text-white/30 uppercase tracking-widest">
            Draft Frequency
          </div>

          {/* Chart area */}
          <div className="absolute left-14 right-0 top-0 bottom-10 border-l border-b border-white/[0.08] bg-gradient-to-br from-white/[0.02] to-transparent rounded-br-lg">
            {/* Grid lines - more subtle */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={`h-${i}`}
                className="absolute left-0 right-0 border-t border-white/[0.04]"
                style={{ top: `${i * 20}%` }}
              />
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={`v-${i}`}
                className="absolute top-0 bottom-0 border-l border-white/[0.04]"
                style={{ left: `${i * (100/6)}%` }}
              />
            ))}

            {/* Quadrant zones - subtle background */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-green-500/[0.03]" />
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-purple-500/[0.03]" />
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-yellow-500/[0.02]" />

            {/* Subtype data points - FIRST (behind main archetypes) */}
            {/* Midrange subtypes */}
            {simulationData.midrangeSubtypes && Object.values(simulationData.midrangeSubtypes as Record<string, any>)
              .filter((s: any) => s.count >= 10)
              .map((subtype: any) => {
                const pctOfTotal = (subtype.count / totalDecks) * 100;
                const x = (pctOfTotal / 30) * 100;
                const y = ((2000 - subtype.avgDeckQuality) / 200) * 100;

                return (
                  <div
                    key={`mid-${subtype.colorCombo}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                    style={{
                      left: `${Math.max(2, Math.min(98, x))}%`,
                      top: `${Math.max(2, Math.min(98, y))}%`,
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-amber-500/80 ring-1 ring-amber-400/30 transition-all duration-200 group-hover:scale-[2] group-hover:ring-2 group-hover:ring-amber-400/60 group-hover:z-[90]" />

                    {/* Rich tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[100]">
                      <div className="bg-black/95 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-2xl min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-0.5">
                            {subtype.colorCombo.split('').map((c: string) => (
                              <span
                                key={c}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                                  ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                                  ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                                  ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                                  ${c === 'R' ? 'bg-red-500 text-white' : ''}
                                  ${c === 'G' ? 'bg-green-600 text-white' : ''}
                                `}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <span className="font-semibold text-white text-sm">{subtype.name}</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-white/50">ELO</span>
                            <span className="text-amber-400 font-mono font-medium">{subtype.avgDeckQuality}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Decks</span>
                            <span className="text-white/80 font-mono">{subtype.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Rate</span>
                            <span className="text-white/80 font-mono">{pctOfTotal.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">CMC</span>
                            <span className="text-white/60 font-mono">{subtype.avgCmc}</span>
                          </div>
                        </div>
                        {subtype.topCards?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Top Cards</div>
                            <div className="text-[10px] text-white/60">{subtype.topCards.slice(0, 2).join(', ')}</div>
                          </div>
                        )}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45" />
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Aggro subtypes */}
            {(simulationData as any).aggroSubtypes && Object.values((simulationData as any).aggroSubtypes as Record<string, any>)
              .filter((s: any) => s.count >= 10)
              .map((subtype: any) => {
                const pctOfTotal = (subtype.count / totalDecks) * 100;
                const x = (pctOfTotal / 30) * 100;
                const y = ((2000 - subtype.avgDeckQuality) / 200) * 100;

                return (
                  <div
                    key={`aggro-${subtype.colorCombo}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                    style={{
                      left: `${Math.max(2, Math.min(98, x))}%`,
                      top: `${Math.max(2, Math.min(98, y))}%`,
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500/80 ring-1 ring-red-400/30 transition-all duration-200 group-hover:scale-[2] group-hover:ring-2 group-hover:ring-red-400/60 group-hover:z-[90]" />

                    {/* Rich tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[100]">
                      <div className="bg-black/95 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-2xl min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-0.5">
                            {subtype.colorCombo.split('').map((c: string) => (
                              <span
                                key={c}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                                  ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                                  ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                                  ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                                  ${c === 'R' ? 'bg-red-500 text-white' : ''}
                                  ${c === 'G' ? 'bg-green-600 text-white' : ''}
                                `}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <span className="font-semibold text-white text-sm">{subtype.name} Aggro</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-white/50">ELO</span>
                            <span className="text-red-400 font-mono font-medium">{subtype.avgDeckQuality}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Decks</span>
                            <span className="text-white/80 font-mono">{subtype.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Rate</span>
                            <span className="text-white/80 font-mono">{pctOfTotal.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">CMC</span>
                            <span className="text-white/60 font-mono">{subtype.avgCmc}</span>
                          </div>
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45" />
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Tempo subtypes */}
            {(simulationData as any).tempoSubtypes && Object.values((simulationData as any).tempoSubtypes as Record<string, any>)
              .filter((s: any) => s.count >= 10)
              .map((subtype: any) => {
                const pctOfTotal = (subtype.count / totalDecks) * 100;
                const x = (pctOfTotal / 30) * 100;
                const y = ((2000 - subtype.avgDeckQuality) / 200) * 100;

                return (
                  <div
                    key={`tempo-${subtype.colorCombo}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                    style={{
                      left: `${Math.max(2, Math.min(98, x))}%`,
                      top: `${Math.max(2, Math.min(98, y))}%`,
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-500/80 ring-1 ring-blue-400/30 transition-all duration-200 group-hover:scale-[2] group-hover:ring-2 group-hover:ring-blue-400/60 group-hover:z-[90]" />

                    {/* Rich tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[100]">
                      <div className="bg-black/95 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-2xl min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-0.5">
                            {subtype.colorCombo.split('').map((c: string) => (
                              <span
                                key={c}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                                  ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                                  ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                                  ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                                  ${c === 'R' ? 'bg-red-500 text-white' : ''}
                                  ${c === 'G' ? 'bg-green-600 text-white' : ''}
                                `}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <span className="font-semibold text-white text-sm">{subtype.name} Tempo</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-white/50">ELO</span>
                            <span className="text-blue-400 font-mono font-medium">{subtype.avgDeckQuality}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Decks</span>
                            <span className="text-white/80 font-mono">{subtype.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Rate</span>
                            <span className="text-white/80 font-mono">{pctOfTotal.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">CMC</span>
                            <span className="text-white/60 font-mono">{subtype.avgCmc}</span>
                          </div>
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45" />
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Main archetype data points - ON TOP */}
            {stats.map((stat) => {
              // X: draft odds 0-30% mapped to 0-100%
              const x = (stat.draftOdds / 30) * 100;
              // Y: deck quality 1800-2000 mapped to 100-0%
              const y = ((2000 - stat.avgDeckQuality) / 200) * 100;

              const difficultyColor = {
                'Easy': 'from-green-400 to-green-600',
                'Medium': 'from-yellow-400 to-yellow-600',
                'Hard': 'from-orange-400 to-orange-600',
                'Expert': 'from-red-400 to-red-600'
              }[stat.meta.difficulty] || 'from-gray-400 to-gray-600';

              const borderColor = {
                'Easy': 'border-green-400/50',
                'Medium': 'border-yellow-400/50',
                'Hard': 'border-orange-400/50',
                'Expert': 'border-red-400/50'
              }[stat.meta.difficulty] || 'border-gray-400/50';

              const isSelected = selectedArchetype === stat.meta.id;

              return (
                <div
                  key={stat.meta.id}
                  onClick={() => handleBubbleClick(stat.meta.id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
                  style={{
                    left: `${Math.max(4, Math.min(96, x))}%`,
                    top: `${Math.max(4, Math.min(96, y))}%`,
                  }}
                >
                  {/* Main bubble - hollow circle with gradient border */}
                  <div
                    className={`w-7 h-7 rounded-full bg-black/80 border-2 ${borderColor} flex items-center justify-center transition-all duration-200 group-hover:scale-125 group-hover:bg-black ${isSelected ? 'ring-2 ring-white scale-125' : ''}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${difficultyColor}`} />
                  </div>

                  {/* Rich tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[100]">
                    <div className="bg-black/95 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl min-w-[220px]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-white text-base">{stat.meta.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getDifficultyColor(stat.meta.difficulty)}`}>
                          {stat.meta.difficulty}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <div className="text-white/40 text-[10px] uppercase tracking-wider">ELO</div>
                          <div className="text-white font-mono font-semibold text-lg">{stat.avgDeckQuality}</div>
                        </div>
                        <div>
                          <div className="text-white/40 text-[10px] uppercase tracking-wider">Rate</div>
                          <div className={`font-mono font-semibold text-lg ${getOddsColor(stat.draftOdds)}`}>{stat.draftOdds.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-white/40 text-[10px] uppercase tracking-wider">Contested</div>
                          <div className="text-white/70 font-mono">{stat.contestedness}%</div>
                        </div>
                        <div>
                          <div className="text-white/40 text-[10px] uppercase tracking-wider">Decks</div>
                          <div className="text-white/70 font-mono">{stat.totalDecksInArchetype.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10 flex gap-1">
                        {stat.meta.colors.map(c => (
                          <span
                            key={c}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                              ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                              ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                              ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                              ${c === 'R' ? 'bg-red-500 text-white' : ''}
                              ${c === 'G' ? 'bg-green-600 text-white' : ''}
                            `}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quadrant labels - more subtle */}
            <div className="absolute top-3 right-3 text-[9px] text-green-400/40 font-medium uppercase tracking-wider">
              Strong & Common
            </div>
            <div className="absolute top-3 left-3 text-[9px] text-purple-400/40 font-medium uppercase tracking-wider">
              Strong & Rare
            </div>
            <div className="absolute bottom-3 right-3 text-[9px] text-yellow-400/30 font-medium uppercase tracking-wider">
              Common Fallback
            </div>
            <div className="absolute bottom-3 left-3 text-[9px] text-white/20 font-medium uppercase tracking-wider">
              Avoid
            </div>
          </div>
        </div>

        {/* Quick insight bar */}
        <div className="mt-4 flex items-center gap-4 text-[11px] text-white/40 px-2">
          <span>
            <span className="text-white/60 font-medium">{stats.length}</span> archetypes
          </span>
          <span className="text-white/20">•</span>
          <span>
            <span className="text-amber-400/80 font-medium">{simulationData.midrangeSubtypes ? Object.keys(simulationData.midrangeSubtypes).length : 0}</span> midrange variants
          </span>
          <span className="text-white/20">•</span>
          <span>
            <span className="text-red-400/80 font-medium">{(simulationData as any).aggroSubtypes ? Object.keys((simulationData as any).aggroSubtypes).length : 0}</span> aggro variants
          </span>
          <span className="text-white/20">•</span>
          <span>
            <span className="text-blue-400/80 font-medium">{(simulationData as any).tempoSubtypes ? Object.keys((simulationData as any).tempoSubtypes).length : 0}</span> tempo variants
          </span>
          <span className="flex-1" />
          <span className="text-white/30">Hover for details</span>
        </div>
      </div>

      {/* Game Day Strategy - Draft Priority */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Game Day Draft Priority</h2>
          <p className="text-sm text-white/50 mt-1">Archetypes ranked by expected value — <span className="text-amber-400/80">now with risk & consistency metrics</span></p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="text-left p-3 text-white/40 w-12">#</th>
                <th className="text-left p-3 text-white/40">Archetype</th>
                <th className="text-center p-3 text-white/40">Power</th>
                <th className="text-center p-3 text-white/40">Rate</th>
                <th className="text-center p-3 text-white/40">Risk</th>
                <th className="text-center p-3 text-white/40">Consistency</th>
                <th className="text-left p-3 text-white/40">Strategy</th>
              </tr>
            </thead>
            <tbody>
              {[...stats]
                .sort((a, b) => {
                  // Sort by composite score: ELO weight + frequency penalty for extremes
                  const scoreA = a.avgDeckQuality - (a.draftOdds > 20 ? 50 : 0) - (a.draftOdds < 4 ? 20 : 0);
                  const scoreB = b.avgDeckQuality - (b.draftOdds > 20 ? 50 : 0) - (b.draftOdds < 4 ? 20 : 0);
                  return scoreB - scoreA;
                })
                .map((stat, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  const isBottom2 = rank >= 9;

                  return (
                    <tr
                      key={stat.meta.id}
                      className={`border-b border-white/5 hover:bg-white/[0.02] ${isTop3 ? 'bg-green-500/5' : ''} ${isBottom2 ? 'bg-red-500/5' : ''}`}
                    >
                      <td className="p-3">
                        <span className={`font-bold ${isTop3 ? 'text-green-400' : isBottom2 ? 'text-red-400' : 'text-white/50'}`}>
                          {rank}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{stat.meta.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            stat.meta.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                            stat.meta.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            stat.meta.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {stat.meta.difficulty}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-medium ${
                          stat.avgDeckQuality >= 1920 ? 'text-amber-400' :
                          stat.avgDeckQuality >= 1890 ? 'text-purple-400' :
                          'text-white/60'
                        }`}>
                          {stat.avgDeckQuality}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-medium ${getOddsColor(stat.draftOdds)}`}>
                          {stat.draftOdds.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          stat.meta.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                          stat.meta.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {stat.meta.riskLevel === 'low' ? '✓ Low' : stat.meta.riskLevel === 'medium' ? '~ Med' : '! High'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          stat.meta.consistency === 'stable' ? 'bg-blue-500/20 text-blue-400' :
                          stat.meta.consistency === 'variable' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {stat.meta.consistency === 'stable' ? 'Stable' : stat.meta.consistency === 'variable' ? 'Variable' : 'Matchup'}
                        </span>
                      </td>
                      <td className="p-3 text-white/50 text-xs max-w-xs">
                        {stat.meta.matchupProfile.notes !== stat.meta.strategy ? stat.meta.matchupProfile.notes : stat.meta.strategy}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Critical Warnings */}
        <div className="p-4 bg-red-500/5 border-t border-red-500/20">
          <div className="text-xs font-medium text-red-400/80 uppercase tracking-wider mb-3">Critical Warnings — What Our Data Can't Tell You</div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-orange-400 font-medium mb-1">Oath of Druids: Matchup Lottery</div>
              <p className="text-white/50 text-xs">Cube lacks Forbidden Orchard. Without it, Oath does nothing vs creatureless decks (Storm, Control, some Combo). ~30% of matchups are auto-loss.</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-orange-400 font-medium mb-1">Storm: Only 9 Cards in Cube</div>
              <p className="text-white/50 text-xs">Tendrils, Brain Freeze, rituals, Yawg Will — that's it. High variance. If payoff is taken, archetype is dead.</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-orange-400 font-medium mb-1">Sneak & Show: ~5 Enablers Total</div>
              <p className="text-white/50 text-xs">Sneak Attack, Show and Tell, Through the Breach. If these are gone, you can't draft this archetype.</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-purple-400 font-medium mb-1">"Avg Card Power" ≠ Win Rate</div>
              <p className="text-white/50 text-xs">Our ELO shows average power of cards drafted, NOT actual win probability. High-power cards in a bad shell still lose.</p>
            </div>
          </div>
        </div>

        {/* Pivot Paths */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">Pivot Paths — When Plan A Fails</div>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
              <div className="text-purple-400 font-medium mb-1">Oath → Reanimator</div>
              <p className="text-white/50 text-xs">Same fatties, same card draw. Add Entomb + Reanimate as backup plan. 80% card overlap.</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="text-blue-400 font-medium mb-1">Storm → Reanimator</div>
              <p className="text-white/50 text-xs">Same blue/black shell, same card selection. Griselbrand is both a storm engine and reanimate target.</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="text-green-400 font-medium mb-1">Sneak → Ramp</div>
              <p className="text-white/50 text-xs">Same fatties, but hardcast them. Channel, Natural Order, green ramp as backup enablers.</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
              <div className="text-amber-400 font-medium mb-1">Aggro → Tempo</div>
              <p className="text-white/50 text-xs">Same cheap threats, add blue for protection. Daze and Spell Pierce make aggro more resilient.</p>
            </div>
            <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
              <div className="text-cyan-400 font-medium mb-1">Control → Midrange</div>
              <p className="text-white/50 text-xs">Same card advantage, add proactive threats. Pivot when you're light on answers.</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <div className="text-red-400 font-medium mb-1">Artifacts → Control</div>
              <p className="text-white/50 text-xs">Same Tinker target quality, pivot to blue control shell when artifact synergies don't come.</p>
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">Draft Principles</div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-green-400 font-medium mb-1">P1P1-P1P3: Look for combo enablers</div>
              <p className="text-white/50 text-xs">Oath, Sneak Attack, Entomb, Reanimate, Tendrils — if you see them, commit hard.</p>
            </div>
            <div>
              <div className="text-yellow-400 font-medium mb-1">No combo pieces? Pivot to value</div>
              <p className="text-white/50 text-xs">Artifacts and Ramp are both strong and underdrafted. Control is often open.</p>
            </div>
            <div>
              <div className="text-orange-400 font-medium mb-1">Avoid intentionally drafting Midrange</div>
              <p className="text-white/50 text-xs">25% of decks end up here — it's where you land when combo fails, not where you aim.</p>
            </div>
            <div>
              <div className="text-purple-400 font-medium mb-1">Top-left quadrant = opportunity</div>
              <p className="text-white/50 text-xs">High power, low frequency = if you get the pieces, you're probably alone at the table.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Midrange Breakdown */}
      {simulationData.midrangeSubtypes && Object.keys(simulationData.midrangeSubtypes).length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Midrange Breakdown</h2>
                <p className="text-sm text-white/50 mt-1">
                  {((simulationData.archetypeDistribution as any)?.midrange?.count / simulationData.totalDecks * 100).toFixed(0)}% of decks end up in midrange — here's which variants actually win
                </p>
              </div>
              <div className="text-xs text-amber-400/60 bg-amber-500/10 px-2 py-1 rounded">
                Not all midrange is equal
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="text-left p-3 text-white/40 w-12">#</th>
                  <th className="text-left p-3 text-white/40">Variant</th>
                  <th className="text-center p-3 text-white/40">Decks</th>
                  <th className="text-center p-3 text-white/40">ELO</th>
                  <th className="text-center p-3 text-white/40">CMC</th>
                  <th className="text-left p-3 text-white/40">Key Cards</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(simulationData.midrangeSubtypes as Record<string, any>)
                  .sort((a, b) => b.avgDeckQuality - a.avgDeckQuality)
                  .slice(0, 12)
                  .map((subtype: any, idx: number) => {
                    const rank = idx + 1;
                    const isTop3 = rank <= 3;
                    const isWeak = subtype.avgDeckQuality < 1820;
                    const midrangeTotal = (simulationData.archetypeDistribution as any)?.midrange?.count || 1;
                    const pctOfMidrange = ((subtype.count / midrangeTotal) * 100).toFixed(1);

                    return (
                      <tr
                        key={subtype.colorCombo}
                        className={`border-b border-white/5 hover:bg-white/[0.02] ${isTop3 ? 'bg-green-500/5' : ''} ${isWeak ? 'bg-red-500/5' : ''}`}
                      >
                        <td className="p-3">
                          <span className={`font-bold ${isTop3 ? 'text-green-400' : isWeak ? 'text-red-400' : 'text-white/50'}`}>
                            {rank}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{subtype.name}</span>
                            <span className="text-white/30 text-xs">({subtype.colorCombo})</span>
                            <div className="flex gap-0.5">
                              {subtype.colorCombo.split('').map((c: string) => (
                                <span
                                  key={c}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                                    ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                                    ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                                    ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                                    ${c === 'R' ? 'bg-red-500 text-white' : ''}
                                    ${c === 'G' ? 'bg-green-600 text-white' : ''}
                                  `}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-white/70">{subtype.count.toLocaleString()}</span>
                          <span className="text-white/30 text-xs ml-1">({pctOfMidrange}%)</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-medium ${
                            subtype.avgDeckQuality >= 1920 ? 'text-amber-400' :
                            subtype.avgDeckQuality >= 1870 ? 'text-purple-400' :
                            subtype.avgDeckQuality >= 1830 ? 'text-white/70' :
                            'text-red-400'
                          }`}>
                            {subtype.avgDeckQuality}
                          </span>
                        </td>
                        <td className="p-3 text-center text-white/50">
                          {subtype.avgCmc}
                        </td>
                        <td className="p-3 text-white/50 text-xs">
                          {subtype.topCards?.slice(0, 3).join(', ')}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Midrange Insights */}
          <div className="p-4 bg-white/[0.02] border-t border-white/10">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-green-500/10 rounded-lg p-3">
                <div className="text-green-400 font-medium mb-1">Best Midrange: Sultai</div>
                <p className="text-white/50 text-xs">BGU with Uro, Oko, Dark Confidant. Actually rivals combo decks at 1930 ELO.</p>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-3">
                <div className="text-purple-400 font-medium mb-1">Black is Key</div>
                <p className="text-white/50 text-xs">Top 5 midrange variants all include Black. Liliana, Thoughtseize, and Dark Confidant are core.</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <div className="text-red-400 font-medium mb-1">Avoid: GW-based</div>
                <p className="text-white/50 text-xs">Naya, Selesnya, Boros are the weakest. No disruption, no card advantage.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggro Breakdown */}
      {(simulationData as any).aggroSubtypes && Object.keys((simulationData as any).aggroSubtypes).length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Aggro Breakdown</h2>
                <p className="text-sm text-white/50 mt-1">
                  {((simulationData.archetypeDistribution as any)?.aggro?.count / simulationData.totalDecks * 100).toFixed(0)}% of decks are aggro — color choice matters more than you think
                </p>
              </div>
              <div className="text-xs text-red-400/60 bg-red-500/10 px-2 py-1 rounded">
                Blue aggro &gt; pure Boros
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="text-left p-3 text-white/40 w-12">#</th>
                  <th className="text-left p-3 text-white/40">Variant</th>
                  <th className="text-center p-3 text-white/40">Decks</th>
                  <th className="text-center p-3 text-white/40">ELO</th>
                  <th className="text-center p-3 text-white/40">CMC</th>
                  <th className="text-left p-3 text-white/40">Key Cards</th>
                </tr>
              </thead>
              <tbody>
                {Object.values((simulationData as any).aggroSubtypes as Record<string, any>)
                  .sort((a, b) => b.avgDeckQuality - a.avgDeckQuality)
                  .slice(0, 10)
                  .map((subtype: any, idx: number) => {
                    const rank = idx + 1;
                    const isTop3 = rank <= 3;
                    const isWeak = subtype.avgDeckQuality < 1820;
                    const aggroTotal = (simulationData.archetypeDistribution as any)?.aggro?.count || 1;
                    const pctOfAggro = ((subtype.count / aggroTotal) * 100).toFixed(1);

                    return (
                      <tr
                        key={subtype.colorCombo}
                        className={`border-b border-white/5 hover:bg-white/[0.02] ${isTop3 ? 'bg-green-500/5' : ''} ${isWeak ? 'bg-red-500/5' : ''}`}
                      >
                        <td className="p-3">
                          <span className={`font-bold ${isTop3 ? 'text-green-400' : isWeak ? 'text-red-400' : 'text-white/50'}`}>
                            {rank}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{subtype.name}</span>
                            <span className="text-white/30 text-xs">({subtype.colorCombo})</span>
                            <div className="flex gap-0.5">
                              {subtype.colorCombo.split('').map((c: string) => (
                                <span
                                  key={c}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                                    ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                                    ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                                    ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                                    ${c === 'R' ? 'bg-red-500 text-white' : ''}
                                    ${c === 'G' ? 'bg-green-600 text-white' : ''}
                                  `}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-white/70">{subtype.count.toLocaleString()}</span>
                          <span className="text-white/30 text-xs ml-1">({pctOfAggro}%)</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-medium ${
                            subtype.avgDeckQuality >= 1880 ? 'text-amber-400' :
                            subtype.avgDeckQuality >= 1850 ? 'text-purple-400' :
                            subtype.avgDeckQuality >= 1820 ? 'text-white/70' :
                            'text-red-400'
                          }`}>
                            {subtype.avgDeckQuality}
                          </span>
                        </td>
                        <td className="p-3 text-center text-white/50">
                          {subtype.avgCmc}
                        </td>
                        <td className="p-3 text-white/50 text-xs">
                          {subtype.topCards?.slice(0, 3).join(', ')}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Aggro Insights */}
          <div className="p-4 bg-white/[0.02] border-t border-white/10">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-green-500/10 rounded-lg p-3">
                <div className="text-green-400 font-medium mb-1">Best Aggro: Jeskai</div>
                <p className="text-white/50 text-xs">RUW with Ragavan, DRC, and counterspell backup. Blue adds protection.</p>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-3">
                <div className="text-purple-400 font-medium mb-1">Splash Blue or Black</div>
                <p className="text-white/50 text-xs">Top 3 aggro variants all include Blue. Daze and Spell Pierce protect your clock.</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <div className="text-red-400 font-medium mb-1">Pure Boros is weak</div>
                <p className="text-white/50 text-xs">Classic RW aggro underperforms. Add a third color for interaction.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tempo Breakdown */}
      {(simulationData as any).tempoSubtypes && Object.keys((simulationData as any).tempoSubtypes).length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Tempo Breakdown</h2>
                <p className="text-sm text-white/50 mt-1">
                  {((simulationData.archetypeDistribution as any)?.tempo?.count / simulationData.totalDecks * 100).toFixed(0)}% of decks are tempo — the best tempo decks add Black
                </p>
              </div>
              <div className="text-xs text-blue-400/60 bg-blue-500/10 px-2 py-1 rounded">
                Sultai tempo is tier-1
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="text-left p-3 text-white/40 w-12">#</th>
                  <th className="text-left p-3 text-white/40">Variant</th>
                  <th className="text-center p-3 text-white/40">Decks</th>
                  <th className="text-center p-3 text-white/40">ELO</th>
                  <th className="text-center p-3 text-white/40">CMC</th>
                  <th className="text-left p-3 text-white/40">Key Cards</th>
                </tr>
              </thead>
              <tbody>
                {Object.values((simulationData as any).tempoSubtypes as Record<string, any>)
                  .sort((a, b) => b.avgDeckQuality - a.avgDeckQuality)
                  .slice(0, 10)
                  .map((subtype: any, idx: number) => {
                    const rank = idx + 1;
                    const isTop3 = rank <= 3;
                    const isWeak = subtype.avgDeckQuality < 1850;
                    const tempoTotal = (simulationData.archetypeDistribution as any)?.tempo?.count || 1;
                    const pctOfTempo = ((subtype.count / tempoTotal) * 100).toFixed(1);

                    return (
                      <tr
                        key={subtype.colorCombo}
                        className={`border-b border-white/5 hover:bg-white/[0.02] ${isTop3 ? 'bg-green-500/5' : ''} ${isWeak ? 'bg-red-500/5' : ''}`}
                      >
                        <td className="p-3">
                          <span className={`font-bold ${isTop3 ? 'text-green-400' : isWeak ? 'text-red-400' : 'text-white/50'}`}>
                            {rank}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{subtype.name}</span>
                            <span className="text-white/30 text-xs">({subtype.colorCombo})</span>
                            <div className="flex gap-0.5">
                              {subtype.colorCombo.split('').map((c: string) => (
                                <span
                                  key={c}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                                    ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                                    ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                                    ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                                    ${c === 'R' ? 'bg-red-500 text-white' : ''}
                                    ${c === 'G' ? 'bg-green-600 text-white' : ''}
                                  `}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-white/70">{subtype.count.toLocaleString()}</span>
                          <span className="text-white/30 text-xs ml-1">({pctOfTempo}%)</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-medium ${
                            subtype.avgDeckQuality >= 1890 ? 'text-amber-400' :
                            subtype.avgDeckQuality >= 1870 ? 'text-purple-400' :
                            subtype.avgDeckQuality >= 1850 ? 'text-white/70' :
                            'text-red-400'
                          }`}>
                            {subtype.avgDeckQuality}
                          </span>
                        </td>
                        <td className="p-3 text-center text-white/50">
                          {subtype.avgCmc}
                        </td>
                        <td className="p-3 text-white/50 text-xs">
                          {subtype.topCards?.slice(0, 3).join(', ')}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Tempo Insights */}
          <div className="p-4 bg-white/[0.02] border-t border-white/10">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-green-500/10 rounded-lg p-3">
                <div className="text-green-400 font-medium mb-1">Best Tempo: Sultai</div>
                <p className="text-white/50 text-xs">BGU with Daze, TNN, and discard. Black adds Thoughtseize for combo protection.</p>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-3">
                <div className="text-purple-400 font-medium mb-1">True-Name Nemesis is core</div>
                <p className="text-white/50 text-xs">TNN appears in every top tempo variant. It's the best tempo threat in the cube.</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <div className="text-red-400 font-medium mb-1">Avoid non-Blue tempo</div>
                <p className="text-white/50 text-xs">Jund, Naya, Mardu tempo are weak. Blue is essential for Daze and protection.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected archetype info (shows when bubble clicked) */}
      {selectedStat && (
        <div className="bg-white/5 border-2 border-white/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedStat.meta.name}</h2>
              <p className="text-white/50">{selectedStat.meta.description}</p>
            </div>
            <button
              onClick={() => setSelectedArchetype(null)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <div className="px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-white/40">Draft Rate</span>{' '}
              <span className={`font-medium ${getOddsColor(selectedStat.draftOdds)}`}>{selectedStat.draftOdds.toFixed(1)}%</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-white/40">Deck Quality</span>{' '}
              <span className="text-white font-medium">{selectedStat.avgDeckQuality}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg ${getDifficultyColor(selectedStat.meta.difficulty)}`}>
              {selectedStat.meta.difficulty}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-white/40">Contested</span>{' '}
              <span className={`font-medium ${selectedStat.contestedness > 70 ? 'text-red-400' : 'text-white'}`}>{selectedStat.contestedness}%</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400">
              <span className="text-green-400/60">Decks Built</span>{' '}
              <span className="font-medium">{selectedStat.totalDecksInArchetype.toLocaleString()}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Strategy</div>
            <p className="text-sm text-white/70">{selectedStat.meta.strategy}</p>
          </div>

          <div className="mb-4">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
              Key Cards ({filterRealistic(selectedStat.coreCards).length})
              {showRealistic && selectedStat.coreCards.length !== filterRealistic(selectedStat.coreCards).length && (
                <span className="text-white/20 ml-2">({selectedStat.coreCards.length - filterRealistic(selectedStat.coreCards).length} contested cards hidden)</span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filterRealistic(selectedStat.coreCards).slice(0, 12).map(card => (
                <div
                  key={card.id}
                  className="flex-shrink-0 w-24 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-white/30"
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <img src={getCardImage(card)} alt={card.name} className="w-full" />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Archetype Cards */}
      <div className="space-y-4">
        {stats.map((stat) => {
          const isSelected = selectedArchetype === stat.meta.id;
          return (
          <div
            key={stat.meta.id}
            ref={(el) => { cardRefs.current[stat.meta.id] = el; }}
            className={`bg-white/5 border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-white/40 ring-2 ring-white/20' : 'border-white/10'}`}
          >
            {/* Main row */}
            <div className="p-4">
              <div className="flex items-start gap-4">
                {/* Odds bar */}
                <div className="w-24 flex-shrink-0">
                  <div className={`text-2xl font-bold ${getOddsColor(stat.draftOdds)}`}>
                    {stat.draftOdds.toFixed(1)}%
                  </div>
                  <div className="h-2 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getOddsBarColor(stat.draftOdds)}`}
                      style={{ width: `${Math.min(100, (stat.draftOdds / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-white">{stat.meta.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      stat.avgDeckQuality >= 1920 ? 'bg-amber-400/20 text-amber-400' :
                      stat.avgDeckQuality >= 1890 ? 'bg-purple-400/20 text-purple-400' :
                      'bg-white/10 text-white/60'
                    }`}>
                      ELO {stat.avgDeckQuality}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(stat.meta.difficulty)}`}>
                      {stat.meta.difficulty}
                    </span>
                    <div className="flex gap-1">
                      {stat.meta.colors.map(c => (
                        <span
                          key={c}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                            ${c === 'W' ? 'bg-amber-100 text-amber-800' : ''}
                            ${c === 'U' ? 'bg-blue-500 text-white' : ''}
                            ${c === 'B' ? 'bg-gray-800 text-white border border-white/20' : ''}
                            ${c === 'R' ? 'bg-red-500 text-white' : ''}
                            ${c === 'G' ? 'bg-green-600 text-white' : ''}
                          `}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mb-3">{stat.meta.description}</p>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-white/40" />
                      <span className="text-white/60">{stat.coreCount} core</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-white/40" />
                      <span className="text-white/60">{stat.supportCount} support</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-white/40" />
                      <span className={`${stat.contestedness > 70 ? 'text-red-400' : stat.contestedness > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {stat.contestedness}% contested
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {stat.signalCost === 'early' ? (
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      <span className="text-white/60">
                        Commit {stat.signalCost}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-white/40" />
                      <span className="text-white/60">Avg ELO {stat.avgDeckQuality}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core cards */}
              {filterRealistic(stat.coreCards).length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
                    Core Cards ({filterRealistic(stat.coreCards).length})
                    {showRealistic && stat.coreCards.length !== filterRealistic(stat.coreCards).length && (
                      <span className="text-white/20 ml-2">({stat.coreCards.length - filterRealistic(stat.coreCards).length} hidden)</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {filterRealistic(stat.coreCards).map(card => (
                      <div
                        key={card.id}
                        className="flex-shrink-0 w-16 rounded overflow-hidden cursor-pointer hover:ring-2 ring-white/30 relative group"
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full" />
                        <div className={`absolute bottom-0 right-0 px-1 text-[9px] font-bold rounded-tl
                          ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : ''}
                          ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-purple-400 text-white' : ''}
                          ${card.powerLevel < 7 ? 'bg-black/70 text-white/70' : ''}
                        `}>
                          {card.powerLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Support cards */}
              {filterRealistic(stat.supportCards).length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
                    Support Cards ({filterRealistic(stat.supportCards).length})
                    {showRealistic && stat.supportCards.length !== filterRealistic(stat.supportCards).length && (
                      <span className="text-white/20 ml-2">({stat.supportCards.length - filterRealistic(stat.supportCards).length} hidden)</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {filterRealistic(stat.supportCards).map(card => (
                      <div
                        key={card.id}
                        className="flex-shrink-0 w-14 rounded overflow-hidden cursor-pointer hover:ring-2 ring-white/30 opacity-80 hover:opacity-100 relative group"
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <img src={getCardImage(card)} alt={card.name} className="w-full" />
                        <div className={`absolute bottom-0 right-0 px-1 text-[8px] font-bold rounded-tl
                          ${card.powerLevel >= 9 ? 'bg-amber-400 text-black' : ''}
                          ${card.powerLevel >= 7 && card.powerLevel < 9 ? 'bg-purple-400 text-white' : ''}
                          ${card.powerLevel < 7 ? 'bg-black/70 text-white/70' : ''}
                        `}>
                          {card.powerLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Matchup Profile & Risk */}
            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
              <div className="flex flex-wrap gap-4 mb-2">
                {/* Matchup badges */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/30">vs Creature:</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${
                    stat.meta.matchupProfile.vsCreature === 'favored' ? 'bg-green-500/20 text-green-400' :
                    stat.meta.matchupProfile.vsCreature === 'unfavored' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {stat.meta.matchupProfile.vsCreature === 'favored' ? '✓' : stat.meta.matchupProfile.vsCreature === 'unfavored' ? '✗' : '~'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/30">vs Control:</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${
                    stat.meta.matchupProfile.vsControl === 'favored' ? 'bg-green-500/20 text-green-400' :
                    stat.meta.matchupProfile.vsControl === 'unfavored' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {stat.meta.matchupProfile.vsControl === 'favored' ? '✓' : stat.meta.matchupProfile.vsControl === 'unfavored' ? '✗' : '~'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/30">vs Combo:</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${
                    stat.meta.matchupProfile.vsCombo === 'favored' ? 'bg-green-500/20 text-green-400' :
                    stat.meta.matchupProfile.vsCombo === 'unfavored' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {stat.meta.matchupProfile.vsCombo === 'favored' ? '✓' : stat.meta.matchupProfile.vsCombo === 'unfavored' ? '✗' : '~'}
                  </span>
                </div>
                {/* Risk & Consistency */}
                <div className="flex items-center gap-2 text-xs ml-auto">
                  <span className={`px-2 py-0.5 rounded font-medium ${
                    stat.meta.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                    stat.meta.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {stat.meta.riskLevel === 'low' ? 'Low Risk' : stat.meta.riskLevel === 'medium' ? 'Med Risk' : 'High Risk'}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-medium ${
                    stat.meta.consistency === 'stable' ? 'bg-blue-500/20 text-blue-400' :
                    stat.meta.consistency === 'variable' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {stat.meta.consistency === 'stable' ? 'Stable' : stat.meta.consistency === 'variable' ? 'Variable' : 'Matchup Dep.'}
                  </span>
                </div>
              </div>

              {/* Failure modes - only show for high-risk archetypes */}
              {stat.meta.riskLevel === 'high' && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Failure Modes</div>
                  <p className="text-xs text-white/40">{stat.meta.failureModes.slice(0, 2).join(' • ')}</p>
                </div>
              )}

              {/* Pivots */}
              {stat.meta.pivotsTo.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-purple-400/70 uppercase tracking-wider mb-1">Pivots To</div>
                  <div className="flex gap-1.5">
                    {stat.meta.pivotsTo.map(pivot => (
                      <span key={pivot} className="px-2 py-0.5 bg-purple-500/10 text-purple-400/80 rounded text-xs">
                        {ARCHETYPE_META[pivot]?.name || pivot}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Hover preview - fixed bottom right */}
      {hoveredCard && (
        <div className="fixed bottom-6 right-6 z-50 hidden lg:block pointer-events-none">
          <div className="bg-black/95 p-3 rounded-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <img
              src={getCardImage(hoveredCard)}
              alt={hoveredCard.name}
              className="w-56 rounded-lg"
            />
            <div className="mt-2">
              <div className="text-sm font-medium text-white">{hoveredCard.name}</div>
              <div className="text-xs text-white/40">{hoveredCard.type_line}</div>
              {hoveredCard.powerLevel && (
                <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium
                  ${hoveredCard.powerLevel >= 9 ? 'bg-amber-400/20 text-amber-400' : ''}
                  ${hoveredCard.powerLevel >= 7 && hoveredCard.powerLevel < 9 ? 'bg-purple-400/20 text-purple-400' : ''}
                  ${hoveredCard.powerLevel < 7 ? 'bg-white/10 text-white/50' : ''}
                `}>
                  Power {hoveredCard.powerLevel}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
