import { useMemo, useState, useRef, useCallback } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import { TrendingUp, Users, Zap, Target, AlertTriangle, CheckCircle, X, Database } from 'lucide-react';
import simulationData from '../data/simulation-data.json';

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
}

const ARCHETYPE_META: Record<string, ArchetypeMeta> = {
  midrange: {
    id: 'midrange',
    name: 'Midrange',
    description: 'Value-oriented decks with efficient threats and disruption',
    strategy: 'Draft flexible, powerful cards. This is the "good stuff" fallback when combo doesn\'t come together.',
    colors: ['B', 'G', 'U'],
    difficulty: 'Easy',
  },
  aggro: {
    id: 'aggro',
    name: 'Aggro',
    description: 'Fast, aggressive decks that win before opponents stabilize',
    strategy: 'Prioritize cheap, efficient creatures and burn. Keep your curve low. Ignore most cards over 4 mana.',
    colors: ['R', 'W'],
    difficulty: 'Easy',
  },
  reanimator: {
    id: 'reanimator',
    name: 'Reanimator',
    description: 'Cheat massive creatures from graveyard to battlefield',
    strategy: 'Need the trifecta: discard outlet (Entomb/looting), reanimate spell (Animate Dead/Reanimate), and fatty (Griselbrand/Archon).',
    colors: ['B', 'U'],
    difficulty: 'Medium',
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo',
    description: 'Efficient threats backed by cheap interaction',
    strategy: 'Deploy threats early, protect them with counters and bounce. Win before opponent recovers.',
    colors: ['U', 'W', 'R'],
    difficulty: 'Medium',
  },
  ramp: {
    id: 'ramp',
    name: 'Ramp',
    description: 'Accelerate mana to cast powerful threats ahead of curve',
    strategy: 'Prioritize mana dorks and ramp spells. Need payoffs (6+ mana cards) to make ramp worthwhile.',
    colors: ['G'],
    difficulty: 'Medium',
  },
  control: {
    id: 'control',
    name: 'Control',
    description: 'Answer everything, win with card advantage',
    strategy: 'Prioritize removal, counterspells, and card draw. Win conditions can come late.',
    colors: ['U', 'W', 'B'],
    difficulty: 'Hard',
  },
  artifacts: {
    id: 'artifacts',
    name: 'Artifacts',
    description: 'Synergy-driven artifact deck with Tinker and artifact creatures',
    strategy: 'Build around artifact synergies. Tinker, Welder, and artifact lands are key. Often colorless-heavy.',
    colors: [],
    difficulty: 'Hard',
  },
  oath: {
    id: 'oath',
    name: 'Oath of Druids',
    description: 'Oath of Druids + creature-light deck = free fatties',
    strategy: 'Need Oath of Druids + very few creatures (so Oath always hits). Run 1-2 massive threats.',
    colors: ['G', 'U'],
    difficulty: 'Expert',
  },
  sneak: {
    id: 'sneak',
    name: 'Sneak & Show',
    description: 'Cheat Emrakul/Griselbrand into play with Sneak Attack or Show and Tell',
    strategy: 'Need enabler (Sneak Attack/Show and Tell/Through the Breach) + target (Emrakul/Griselbrand). Only ~5 total enablers in cube.',
    colors: ['R', 'U'],
    difficulty: 'Expert',
  },
  storm: {
    id: 'storm',
    name: 'Storm',
    description: 'Chain spells together, win with Tendrils of Agony or Brain Freeze',
    strategy: 'Need payoff (Tendrils/Brain Freeze) + enablers (rituals, draw spells, Yawgmoth\'s Will). Only 9 storm cards in cube.',
    colors: ['B', 'U'],
    difficulty: 'Expert',
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

// Get simulation data
const simArchetypes = simulationData.archetypeDistribution as Record<string, SimulationArchetypeData>;
const simCardStats = simulationData.cardStats as Record<string, CardStats>;
const totalDecks = simulationData.totalDecks;

// Get cards that actually appear in this archetype based on simulation data
function getSimulatedArchetypeCards(
  cards: CubeCard[],
  archetypeId: string
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
function calculateSimContestedness(coreCards: CubeCard[], myArchetypeId: string): number {
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
  const stats = useMemo(() => {
    const results: ArchetypeStats[] = [];

    // Iterate over all simulation archetypes
    for (const [archetypeId, simData] of Object.entries(simArchetypes)) {
      const meta = ARCHETYPE_META[archetypeId];
      if (!meta) continue; // Skip if no metadata defined

      // Get REAL draft odds from simulation
      const realDraftOdds = (simData.count / totalDecks) * 100;

      // Get cards that ACTUALLY appear in this archetype
      const { core, support, avgPickPosition } = getSimulatedArchetypeCards(cards, archetypeId);

      // Calculate contestedness from simulation
      const contestedness = calculateSimContestedness(core, archetypeId);

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
  }, [cards]);

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
      <div className="flex items-start justify-between">
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
          </p>
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

      {showRealistic && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm text-green-400">
          Showing realistic builds - excludes Power 9+ cards (Moxen, Lotus, Sol Ring, etc.) that everyone fights over. This is closer to what you'll actually draft.
        </div>
      )}

      {/* Scatter Chart: Deck Quality vs Draft Frequency */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Deck Quality vs Draft Frequency</h2>
            <p className="text-sm text-white/40">Higher = stronger decks. Right = more commonly drafted.</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-white/50">Easy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-white/50">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-white/50">Hard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-white/50">Expert</span>
            </div>
          </div>
        </div>

        <div className="relative" style={{ height: 320 }}>
          {/* Y axis (Deck Quality) */}
          <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-white/30">
            <span>1950</span>
            <span>1920</span>
            <span>1890</span>
            <span>1860</span>
            <span>1830</span>
          </div>
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-white/40 whitespace-nowrap">
            Avg Deck Quality
          </div>

          {/* X axis (Draft %) */}
          <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between text-xs text-white/30 px-2">
            <span>0%</span>
            <span>5%</span>
            <span>10%</span>
            <span>15%</span>
            <span>20%</span>
            <span>25%</span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-xs text-white/40">
            Draft Frequency (% of all decks)
          </div>

          {/* Chart area */}
          <div className="absolute left-12 right-0 top-0 bottom-8 border-l border-b border-white/10">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={`h-${i}`}
                className="absolute left-0 right-0 border-t border-white/5"
                style={{ top: `${i * 25}%` }}
              />
            ))}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={`v-${i}`}
                className="absolute top-0 bottom-0 border-l border-white/5"
                style={{ left: `${i * 20}%` }}
              />
            ))}

            {/* Data points */}
            {stats.map((stat) => {
              // X: draft odds 0-25% mapped to 0-100%
              const x = (stat.draftOdds / 25) * 100;
              // Y: deck quality 1830-1950 mapped to 100-0%
              const y = ((1950 - stat.avgDeckQuality) / 120) * 100;

              const difficultyColor = {
                'Easy': '#22c55e',
                'Medium': '#eab308',
                'Hard': '#f97316',
                'Expert': '#ef4444'
              }[stat.meta.difficulty] || '#888';

              const isSelected = selectedArchetype === stat.meta.id;

              return (
                <div
                  key={stat.meta.id}
                  onClick={() => handleBubbleClick(stat.meta.id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{
                    left: `${Math.max(5, Math.min(95, x))}%`,
                    top: `${Math.max(5, Math.min(95, y))}%`,
                  }}
                >
                  {/* Bubble */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg transition-all group-hover:scale-125 ${isSelected ? 'ring-4 ring-white scale-125' : ''}`}
                    style={{ backgroundColor: difficultyColor }}
                  >
                    {stat.draftOdds.toFixed(1)}%
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-medium">{stat.meta.name}</div>
                    <div className="text-white/60">Quality {stat.avgDeckQuality} · {stat.draftOdds.toFixed(1)}% of decks</div>
                  </div>
                </div>
              );
            })}

            {/* Quadrant labels */}
            <div className="absolute top-2 right-2 text-[10px] text-green-400/60 font-medium">
              Strong & Common
            </div>
            <div className="absolute top-2 left-2 text-[10px] text-purple-400/60 font-medium">
              Strong but Rare
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] text-yellow-400/60 font-medium">
              Common fallback
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] text-white/30 font-medium">
              Rare & Weak
            </div>
          </div>
        </div>
      </div>

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

            {/* Why this odds */}
            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
              <p className="text-sm text-white/40">
                {stat.draftOdds >= 15 && `${stat.meta.name} appears in ${stat.draftOdds.toFixed(1)}% of simulated decks — a common archetype. Cards are less contested and you can stay flexible.`}
                {stat.draftOdds >= 8 && stat.draftOdds < 15 && `${stat.meta.name} appears in ${stat.draftOdds.toFixed(1)}% of simulated decks — roughly 1 drafter per pod. Watch for signals in pack 1.`}
                {stat.draftOdds >= 4 && stat.draftOdds < 8 && `${stat.meta.name} appears in only ${stat.draftOdds.toFixed(1)}% of decks — key pieces are contested. Commit ${stat.signalCost} if you see enablers.`}
                {stat.draftOdds < 4 && `${stat.meta.name} is rare at ${stat.draftOdds.toFixed(1)}%. Only 1 drafter can build this per pod. If you see the pieces, you're likely alone.`}
              </p>
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
