import { useMemo, useState, useRef, useCallback } from 'react';
import type { CubeCard, Archetype } from '../types/card';
import { getEloData, getPercentile } from '../services/eloHelpers';
import { getCardImage } from '../services/scryfall';
import { TrendingUp, Users, Zap, Target, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  archetypes: Archetype[];
}

interface ArchetypeStats {
  archetype: Archetype;
  coreCards: CubeCard[];
  supportCards: CubeCard[];
  coreCount: number;
  supportCount: number;
  avgElo: number;
  contestedness: number; // 0-100, higher = more contested
  redundancy: number; // 0-100, higher = more backup options
  draftOdds: number; // 0-100 percentage
  signalCost: 'early' | 'mid' | 'late'; // when you must commit
}

// Cards that go in EVERY deck (highly contested)
const UNIVERSAL_CARDS = new Set([
  'Black Lotus', 'Ancestral Recall', 'Time Walk', 'Mox Pearl', 'Mox Sapphire',
  'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Sol Ring', 'Mana Crypt', 'Mana Vault',
  'Demonic Tutor', 'Vampiric Tutor', 'Force of Will'
]);

function getArchetypeCards(cards: CubeCard[], archetype: Archetype): { core: CubeCard[]; support: CubeCard[] } {
  const keyCardNames = new Set(archetype.keyCards.map(n => n.toLowerCase()));

  const core: CubeCard[] = [];
  const support: CubeCard[] = [];

  for (const card of cards) {
    const name = card.name.toLowerCase();
    const cardArchetypes = card.archetypes || [];

    // Core cards: explicitly listed as key cards
    if (keyCardNames.has(name) || archetype.keyCards.some(k => name.includes(k.toLowerCase()))) {
      core.push(card);
    }
    // Support cards: tagged with this archetype but not key
    else if (cardArchetypes.some(a => a.toLowerCase().includes(archetype.name.split(' ')[0].toLowerCase()) ||
                                      archetype.name.toLowerCase().includes(a.toLowerCase()))) {
      support.push(card);
    }
  }

  return { core, support };
}

function calculateContestedness(coreCards: CubeCard[]): number {
  if (coreCards.length === 0) return 100;

  let totalContested = 0;

  for (const card of coreCards) {
    // Universal cards are 100% contested
    if (UNIVERSAL_CARDS.has(card.name)) {
      totalContested += 100;
      continue;
    }

    // Count how many archetypes want this card
    const archetypeCount = (card.archetypes || []).length;

    // Also factor in ELO - high ELO cards are more contested
    const percentile = getPercentile(card.name);

    // Contestedness = (archetypes wanting it / 3) * 50 + (percentile / 100) * 50
    const cardContestedness = Math.min(100, (archetypeCount / 3) * 50 + (percentile / 100) * 50);
    totalContested += cardContestedness;
  }

  return Math.round(totalContested / coreCards.length);
}

function calculateRedundancy(coreCards: CubeCard[], archetype: Archetype): number {
  // Check if there are backup options for key effects
  const keyCardCount = archetype.keyCards.length;
  const foundCount = coreCards.length;

  // More core cards than key cards = redundancy
  const redundancyRatio = Math.min(2, foundCount / Math.max(1, keyCardCount));

  return Math.round(redundancyRatio * 50);
}

function calculateDraftOdds(
  coreCount: number,
  supportCount: number,
  contestedness: number,
  redundancy: number,
  difficulty: string
): number {
  // Base odds from difficulty
  const difficultyBase: Record<string, number> = {
    'Easy': 45,
    'Medium': 30,
    'Hard': 20,
    'Expert': 12
  };

  let odds = difficultyBase[difficulty] || 25;

  // Adjust for core card count (more pieces = harder to assemble)
  if (coreCount > 8) odds -= 10;
  else if (coreCount < 5) odds += 10;

  // Adjust for support (more support = easier)
  if (supportCount > 15) odds += 10;
  else if (supportCount < 5) odds -= 5;

  // Adjust for contestedness (more contested = harder)
  odds -= (contestedness - 50) / 5;

  // Adjust for redundancy (more redundancy = easier)
  odds += (redundancy - 50) / 5;

  return Math.max(5, Math.min(60, Math.round(odds)));
}

function getSignalCost(contestedness: number, coreCount: number): 'early' | 'mid' | 'late' {
  if (contestedness > 70 || coreCount < 5) return 'early';
  if (contestedness > 40) return 'mid';
  return 'late';
}

export function ArchetypeOddsPage({ cards, archetypes }: Props) {
  const stats = useMemo(() => {
    const results: ArchetypeStats[] = [];

    for (const archetype of archetypes) {
      const { core, support } = getArchetypeCards(cards, archetype);

      const avgElo = core.length > 0
        ? core.reduce((sum, c) => sum + (getEloData(c.name)?.elo || 1500), 0) / core.length
        : 1500;

      const contestedness = calculateContestedness(core);
      const redundancy = calculateRedundancy(core, archetype);
      const draftOdds = calculateDraftOdds(core.length, support.length, contestedness, redundancy, archetype.difficulty);
      const signalCost = getSignalCost(contestedness, core.length);

      results.push({
        archetype,
        coreCards: core.sort((a, b) => (getEloData(b.name)?.elo || 0) - (getEloData(a.name)?.elo || 0)),
        supportCards: support.sort((a, b) => (getEloData(b.name)?.elo || 0) - (getEloData(a.name)?.elo || 0)),
        coreCount: core.length,
        supportCount: support.length,
        avgElo: Math.round(avgElo),
        contestedness,
        redundancy,
        draftOdds,
        signalCost,
      });
    }

    // Sort by draft odds descending
    return results.sort((a, b) => b.draftOdds - a.draftOdds);
  }, [cards, archetypes]);

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

  const selectedStat = stats.find(s => s.archetype.id === selectedArchetype);

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
    if (odds >= 40) return 'text-green-400';
    if (odds >= 25) return 'text-yellow-400';
    if (odds >= 15) return 'text-orange-400';
    return 'text-red-400';
  };

  const getOddsBarColor = (odds: number) => {
    if (odds >= 40) return 'bg-green-500';
    if (odds >= 25) return 'bg-yellow-500';
    if (odds >= 15) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Archetype Draft Odds</h1>
          <p className="text-white/50 mt-1">
            How likely you are to draft a good version of each archetype in an 8 player pod
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

      {/* Scatter Chart: Power vs Odds vs Difficulty */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Power vs Draft Odds</h2>
            <p className="text-sm text-white/40">Bubble color = difficulty to pilot</p>
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
          {/* Y axis (Power) */}
          <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-white/30">
            <span>10</span>
            <span>9</span>
            <span>8</span>
            <span>7</span>
            <span>6</span>
          </div>
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-white/40 whitespace-nowrap">
            Power Rating
          </div>

          {/* X axis (Odds) */}
          <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between text-xs text-white/30 px-2">
            <span>5%</span>
            <span>15%</span>
            <span>25%</span>
            <span>35%</span>
            <span>45%</span>
            <span>55%</span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-xs text-white/40">
            Draft Success Odds
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
              // X: odds 5-55% mapped to 0-100%
              const x = ((stat.draftOdds - 5) / 50) * 100;
              // Y: power 6-10 mapped to 100-0%
              const y = ((10 - stat.archetype.powerRating) / 4) * 100;

              const difficultyColor = {
                'Easy': '#22c55e',
                'Medium': '#eab308',
                'Hard': '#f97316',
                'Expert': '#ef4444'
              }[stat.archetype.difficulty] || '#888';

              const isSelected = selectedArchetype === stat.archetype.id;

              return (
                <div
                  key={stat.archetype.id}
                  onClick={() => handleBubbleClick(stat.archetype.id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{
                    left: `${Math.max(5, Math.min(95, x))}%`,
                    top: `${Math.max(5, Math.min(95, y))}%`,
                  }}
                >
                  {/* Bubble */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg transition-all group-hover:scale-125 ${isSelected ? 'ring-4 ring-white scale-125' : ''}`}
                    style={{ backgroundColor: difficultyColor }}
                  >
                    {stat.draftOdds}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-medium">{stat.archetype.name}</div>
                    <div className="text-white/60">Power {stat.archetype.powerRating} · {stat.draftOdds}% odds</div>
                  </div>
                </div>
              );
            })}

            {/* Quadrant labels */}
            <div className="absolute top-2 right-2 text-[10px] text-green-400/60 font-medium">
              Easy wins
            </div>
            <div className="absolute top-2 left-2 text-[10px] text-red-400/60 font-medium">
              High risk, high reward
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] text-yellow-400/60 font-medium">
              Safe but weaker
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] text-white/30 font-medium">
              Avoid
            </div>
          </div>
        </div>
      </div>

      {/* Selected archetype info (shows when bubble clicked) */}
      {selectedStat && (
        <div className="bg-white/5 border-2 border-white/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedStat.archetype.name}</h2>
              <p className="text-white/50">{selectedStat.archetype.description}</p>
            </div>
            <button
              onClick={() => setSelectedArchetype(null)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-4 mb-4 text-sm">
            <div className="px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-white/40">Power</span>{' '}
              <span className="text-white font-medium">{selectedStat.archetype.powerRating}/10</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-white/40">Odds</span>{' '}
              <span className={`font-medium ${getOddsColor(selectedStat.draftOdds)}`}>{selectedStat.draftOdds}%</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg ${getDifficultyColor(selectedStat.archetype.difficulty)}`}>
              {selectedStat.archetype.difficulty}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-white/40">Contested</span>{' '}
              <span className={`font-medium ${selectedStat.contestedness > 60 ? 'text-red-400' : 'text-white'}`}>{selectedStat.contestedness}%</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Strategy</div>
            <p className="text-sm text-white/70">{selectedStat.archetype.strategy}</p>
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

          {selectedStat.archetype.tips.length > 0 && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Tips</div>
              <ul className="text-sm text-white/60 space-y-1">
                {selectedStat.archetype.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-white/30">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Archetype Cards */}
      <div className="space-y-4">
        {stats.map((stat) => {
          const isSelected = selectedArchetype === stat.archetype.id;
          return (
          <div
            key={stat.archetype.id}
            ref={(el) => { cardRefs.current[stat.archetype.id] = el; }}
            className={`bg-white/5 border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-white/40 ring-2 ring-white/20' : 'border-white/10'}`}
          >
            {/* Main row */}
            <div className="p-4">
              <div className="flex items-start gap-4">
                {/* Odds bar */}
                <div className="w-20 flex-shrink-0">
                  <div className={`text-2xl font-bold ${getOddsColor(stat.draftOdds)}`}>
                    {stat.draftOdds}%
                  </div>
                  <div className="h-2 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getOddsBarColor(stat.draftOdds)}`}
                      style={{ width: `${stat.draftOdds}%` }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-white">{stat.archetype.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      stat.archetype.powerRating >= 9 ? 'bg-amber-400/20 text-amber-400' :
                      stat.archetype.powerRating >= 8 ? 'bg-purple-400/20 text-purple-400' :
                      'bg-white/10 text-white/60'
                    }`}>
                      Power {stat.archetype.powerRating}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(stat.archetype.difficulty)}`}>
                      {stat.archetype.difficulty}
                    </span>
                    <div className="flex gap-1">
                      {stat.archetype.colors.map(c => (
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
                  <p className="text-sm text-white/50 mb-3">{stat.archetype.description}</p>

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
                      <span className={`${stat.contestedness > 60 ? 'text-red-400' : stat.contestedness > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
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
                      <span className="text-white/60">Avg ELO {stat.avgElo}</span>
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
                {stat.draftOdds >= 40 && `${stat.archetype.name} is one of the more open archetypes. Cards are less contested and you can stay flexible.`}
                {stat.draftOdds >= 25 && stat.draftOdds < 40 && `${stat.archetype.name} is draftable when open. Watch for signals in pack 1 picks 4-7.`}
                {stat.draftOdds >= 15 && stat.draftOdds < 25 && `${stat.archetype.name} requires commitment. Key pieces are contested and you need to commit ${stat.signalCost}.`}
                {stat.draftOdds < 15 && `${stat.archetype.name} is hard to assemble. Core pieces are highly contested. Only force if you open key cards.`}
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
