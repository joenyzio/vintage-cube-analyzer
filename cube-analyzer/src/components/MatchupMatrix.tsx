import { useState, useMemo } from 'react';
import type { Archetype, CubeCard } from '../types/card';
import { Card } from './ui/Card';
import { getEloData, getPercentile } from '../services/eloHelpers';
import { ChevronRight, Zap, Shield, Clock, Crosshair, TrendingUp, AlertTriangle } from 'lucide-react';

interface MatchupMatrixProps {
  archetypes: Archetype[];
  cards: CubeCard[];
}

// Strategy types for rock-paper-scissors dynamics
type StrategyType = 'fast-combo' | 'slow-combo' | 'aggro' | 'midrange' | 'control' | 'prison';

interface ArchetypeAnalysis {
  archetype: Archetype;
  avgElo: number;
  avgPercentile: number;
  keyCardElos: { name: string; elo: number; percentile: number }[];
  strategyType: StrategyType;
  goldfish: string; // Average turn to win uncontested
  interactionLevel: 'low' | 'medium' | 'high';
}

// Categorize each archetype
const ARCHETYPE_META: Record<string, { strategy: StrategyType; goldfish: string; interaction: 'low' | 'medium' | 'high' }> = {
  'ub-reanimator': { strategy: 'fast-combo', goldfish: 'T1-2', interaction: 'medium' },
  'ur-storm': { strategy: 'fast-combo', goldfish: 'T2-3', interaction: 'low' },
  'artifact-combo': { strategy: 'fast-combo', goldfish: 'T2-3', interaction: 'low' },
  'show-tell': { strategy: 'slow-combo', goldfish: 'T3-4', interaction: 'medium' },
  'oath': { strategy: 'slow-combo', goldfish: 'T3-4', interaction: 'medium' },
  'ug-ramp': { strategy: 'slow-combo', goldfish: 'T3-4', interaction: 'medium' },
  'mono-white': { strategy: 'aggro', goldfish: 'T4-5', interaction: 'medium' },
  'rw-aggro': { strategy: 'aggro', goldfish: 'T4-5', interaction: 'low' },
  'br-aggro': { strategy: 'aggro', goldfish: 'T4-5', interaction: 'medium' },
  'bg-midrange': { strategy: 'midrange', goldfish: 'T5-6', interaction: 'high' },
  'uw-control': { strategy: 'control', goldfish: 'T8+', interaction: 'high' },
  'uw-blink': { strategy: 'midrange', goldfish: 'T5-6', interaction: 'medium' },
};

// Strategic matchup dynamics - these are established Magic theory
const STRATEGY_MATCHUPS: Record<StrategyType, { beats: StrategyType[]; losesTo: StrategyType[]; reason: string }> = {
  'fast-combo': {
    beats: ['control', 'midrange', 'slow-combo'],
    losesTo: ['aggro'],
    reason: 'Goes under slow decks before they can interact, but folds to fast pressure'
  },
  'slow-combo': {
    beats: ['midrange', 'control'],
    losesTo: ['fast-combo', 'aggro'],
    reason: 'Powerful inevitability but needs time to set up'
  },
  'aggro': {
    beats: ['fast-combo', 'slow-combo'],
    losesTo: ['midrange', 'control'],
    reason: 'Pressure prevents combo from assembling, but gets outvalued by interaction'
  },
  'midrange': {
    beats: ['aggro'],
    losesTo: ['fast-combo', 'slow-combo', 'control'],
    reason: 'Grinds out aggro but can\'t pressure combo or match control\'s card advantage'
  },
  'control': {
    beats: ['aggro', 'midrange'],
    losesTo: ['fast-combo'],
    reason: 'Answers everything eventually but can\'t stop T1-2 combo without specific hate'
  },
  'prison': {
    beats: ['fast-combo', 'slow-combo', 'control'],
    losesTo: ['aggro'],
    reason: 'Locks out spell-based decks but folds to creatures under lock pieces'
  }
};

// Key interaction cards that swing matchups
const HATE_CARDS: Record<string, { hates: string[]; reason: string }> = {
  'Thalia, Guardian of Thraben': {
    hates: ['ur-storm', 'artifact-combo', 'uw-control'],
    reason: 'Taxes all non-creature spells, devastating vs spell-heavy decks'
  },
  'Force of Will': {
    hates: ['ub-reanimator', 'ur-storm', 'artifact-combo', 'show-tell'],
    reason: 'Free counter stops T1-2 combo'
  },
  'Grief': {
    hates: ['uw-control', 'ur-storm', 'show-tell'],
    reason: 'T1 Thoughtseize effect strips key pieces'
  },
  'Endurance': {
    hates: ['ub-reanimator', 'ur-storm'],
    reason: 'Instant speed graveyard exile stops reanimation and Breach lines'
  },
  'Null Rod': {
    hates: ['artifact-combo'],
    reason: 'Shuts off all artifact mana and abilities'
  },
  'Pyroblast': {
    hates: ['uw-control', 'ur-storm', 'show-tell'],
    reason: '1-mana answer to blue spells and permanents'
  },
  'Collector Ouphe': {
    hates: ['artifact-combo'],
    reason: 'Shuts off artifact abilities on a body'
  },
  'Containment Priest': {
    hates: ['ub-reanimator', 'show-tell'],
    reason: 'Prevents creatures entering without being cast'
  },
};

function analyzeArchetype(archetype: Archetype): ArchetypeAnalysis {
  const meta = ARCHETYPE_META[archetype.id] || { strategy: 'midrange' as StrategyType, goldfish: 'T5-6', interaction: 'medium' as const };

  // Get ELO data for key cards
  const keyCardElos = archetype.keyCards.map(name => {
    const eloData = getEloData(name);
    return {
      name,
      elo: eloData?.elo || 0,
      percentile: getPercentile(name)
    };
  }).filter(c => c.elo > 0).sort((a, b) => b.elo - a.elo);

  const avgElo = keyCardElos.length > 0
    ? keyCardElos.reduce((sum, c) => sum + c.elo, 0) / keyCardElos.length
    : 0;

  const avgPercentile = keyCardElos.length > 0
    ? keyCardElos.reduce((sum, c) => sum + c.percentile, 0) / keyCardElos.length
    : 0;

  return {
    archetype,
    avgElo,
    avgPercentile,
    keyCardElos,
    strategyType: meta.strategy,
    goldfish: meta.goldfish,
    interactionLevel: meta.interaction
  };
}

function getMatchupAnalysis(arch1: ArchetypeAnalysis, arch2: ArchetypeAnalysis): {
  favored: 'arch1' | 'arch2' | 'even';
  reason: string;
  keyCards: string[];
} {
  const strat1 = STRATEGY_MATCHUPS[arch1.strategyType];
  const strat2 = STRATEGY_MATCHUPS[arch2.strategyType];

  // Check if strategy type gives clear advantage
  if (strat1.beats.includes(arch2.strategyType)) {
    return {
      favored: 'arch1',
      reason: strat1.reason,
      keyCards: Object.entries(HATE_CARDS)
        .filter(([_, v]) => v.hates.includes(arch2.archetype.id))
        .map(([k]) => k)
        .slice(0, 3)
    };
  }
  if (strat1.losesTo.includes(arch2.strategyType)) {
    return {
      favored: 'arch2',
      reason: strat2.reason,
      keyCards: Object.entries(HATE_CARDS)
        .filter(([_, v]) => v.hates.includes(arch1.archetype.id))
        .map(([k]) => k)
        .slice(0, 3)
    };
  }

  // Same strategy type or neutral - compare power levels
  if (Math.abs(arch1.avgPercentile - arch2.avgPercentile) > 10) {
    return {
      favored: arch1.avgPercentile > arch2.avgPercentile ? 'arch1' : 'arch2',
      reason: 'Higher average card quality gives edge in similar strategies',
      keyCards: []
    };
  }

  return {
    favored: 'even',
    reason: 'Similar strategies and power levels - comes down to draws and play',
    keyCards: []
  };
}

const STRATEGY_COLORS: Record<StrategyType, string> = {
  'fast-combo': 'text-red-400 bg-red-500/10',
  'slow-combo': 'text-orange-400 bg-orange-500/10',
  'aggro': 'text-amber-400 bg-amber-500/10',
  'midrange': 'text-green-400 bg-green-500/10',
  'control': 'text-blue-400 bg-blue-500/10',
  'prison': 'text-purple-400 bg-purple-500/10'
};

const STRATEGY_ICONS: Record<StrategyType, typeof Zap> = {
  'fast-combo': Zap,
  'slow-combo': Clock,
  'aggro': Crosshair,
  'midrange': TrendingUp,
  'control': Shield,
  'prison': AlertTriangle
};

export function MatchupMatrix({ archetypes, cards: _cards }: MatchupMatrixProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

  // Analyze all archetypes with ELO data
  const analyses = useMemo(() => {
    return archetypes
      .map(arch => analyzeArchetype(arch))
      .sort((a, b) => b.avgElo - a.avgElo);
  }, [archetypes]);

  const selectedAnalysis = analyses.find(a => a.archetype.id === selectedArchetype);

  return (
    <div className="space-y-6">
      {/* Power Rankings - Data Driven */}
      <Card className="bg-black border-white/[0.06] p-4">
        <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Archetype Power Rankings
          <span className="text-[10px] text-white/30 font-normal ml-2">Based on avg. key card ELO from CubeCobra</span>
        </h3>
        <div className="space-y-2">
          {analyses.map((analysis, idx) => {
            const Icon = STRATEGY_ICONS[analysis.strategyType];
            const isSelected = selectedArchetype === analysis.archetype.id;

            return (
              <button
                key={analysis.archetype.id}
                onClick={() => setSelectedArchetype(isSelected ? null : analysis.archetype.id)}
                className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-3 rounded-lg transition-all active:scale-[0.99] ${
                  isSelected ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/5 hover:bg-white/8'
                }`}
              >
                <span className="text-white/30 font-mono text-sm w-5">{idx + 1}</span>

                <div className="flex -space-x-0.5">
                  {analysis.archetype.colors.length === 0 ? (
                    <div className="w-4 h-4 rounded-full bg-gray-500" />
                  ) : (
                    analysis.archetype.colors.map(c => (
                      <div key={c} className={`w-4 h-4 rounded-full
                        ${c === 'W' ? 'bg-amber-100' : ''}
                        ${c === 'U' ? 'bg-blue-500' : ''}
                        ${c === 'B' ? 'bg-neutral-500' : ''}
                        ${c === 'R' ? 'bg-red-500' : ''}
                        ${c === 'G' ? 'bg-green-500' : ''}
                      `} />
                    ))
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="font-medium text-white">{analysis.archetype.name}</div>
                </div>

                <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded text-xs ${STRATEGY_COLORS[analysis.strategyType]}`}>
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{analysis.strategyType.replace('-', ' ')}</span>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-mono text-white">{Math.round(analysis.avgElo)}</div>
                  <div className="text-[10px] text-white/40 hidden sm:block">avg ELO</div>
                </div>

                <div className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0 ${
                  analysis.avgPercentile >= 70 ? 'bg-green-500/20 text-green-400' :
                  analysis.avgPercentile >= 50 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-white/10 text-white/50'
                }`}>
                  Top {Math.round(100 - analysis.avgPercentile)}%
                </div>

                <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Archetype Detail */}
      {selectedAnalysis && (
        <Card className="bg-black border-white/[0.06] p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-0.5">
              {selectedAnalysis.archetype.colors.length === 0 ? (
                <div className="w-6 h-6 rounded-full bg-gray-500" />
              ) : (
                selectedAnalysis.archetype.colors.map(c => (
                  <div key={c} className={`w-6 h-6 rounded-full
                    ${c === 'W' ? 'bg-amber-100' : ''}
                    ${c === 'U' ? 'bg-blue-500' : ''}
                    ${c === 'B' ? 'bg-neutral-500' : ''}
                    ${c === 'R' ? 'bg-red-500' : ''}
                    ${c === 'G' ? 'bg-green-500' : ''}
                  `} />
                ))
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedAnalysis.archetype.name}</h3>
              <p className="text-sm text-white/50">{selectedAnalysis.archetype.description}</p>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase mb-1">Speed</div>
              <div className="text-lg font-bold text-white">{selectedAnalysis.goldfish}</div>
              <div className="text-[10px] text-white/40">goldfish</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase mb-1">Interaction</div>
              <div className={`text-lg font-bold ${
                selectedAnalysis.interactionLevel === 'high' ? 'text-blue-400' :
                selectedAnalysis.interactionLevel === 'medium' ? 'text-amber-400' :
                'text-red-400'
              }`}>{selectedAnalysis.interactionLevel}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase mb-1">Avg ELO</div>
              <div className="text-lg font-bold font-mono text-white">{Math.round(selectedAnalysis.avgElo)}</div>
            </div>
          </div>

          {/* Key Cards with ELO */}
          <div className="mb-4">
            <h4 className="text-xs text-white/40 uppercase mb-2">Key Cards by ELO</h4>
            <div className="flex flex-wrap gap-2">
              {selectedAnalysis.keyCardElos.slice(0, 8).map(card => (
                <div key={card.name} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1">
                  <span className="text-sm text-white">{card.name}</span>
                  <span className="text-xs font-mono text-white/40">{Math.round(card.elo)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Matchups */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Favorable */}
            <div>
              <h4 className="text-xs text-green-400 uppercase mb-2 flex items-center gap-1">
                <Crosshair className="w-3 h-3" /> Favorable Against
              </h4>
              <div className="space-y-2">
                {analyses
                  .filter(a => a.archetype.id !== selectedAnalysis.archetype.id)
                  .map(other => {
                    const matchup = getMatchupAnalysis(selectedAnalysis, other);
                    if (matchup.favored !== 'arch1') return null;
                    return (
                      <div key={other.archetype.id} className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white">{other.archetype.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${STRATEGY_COLORS[other.strategyType]}`}>
                            {other.strategyType.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">{matchup.reason}</p>
                        {matchup.keyCards.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {matchup.keyCards.map(c => (
                              <span key={c} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/70">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Unfavorable */}
            <div>
              <h4 className="text-xs text-red-400 uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Unfavorable Against
              </h4>
              <div className="space-y-2">
                {analyses
                  .filter(a => a.archetype.id !== selectedAnalysis.archetype.id)
                  .map(other => {
                    const matchup = getMatchupAnalysis(selectedAnalysis, other);
                    if (matchup.favored !== 'arch2') return null;
                    return (
                      <div key={other.archetype.id} className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white">{other.archetype.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${STRATEGY_COLORS[other.strategyType]}`}>
                            {other.strategyType.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">{matchup.reason}</p>
                        {matchup.keyCards.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {matchup.keyCards.map(c => (
                              <span key={c} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/70">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Strategy Type Legend */}
      <Card className="bg-black border-white/[0.06] p-4">
        <h3 className="text-sm font-semibold text-white/60 mb-3">Strategy Type Guide</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(STRATEGY_MATCHUPS).map(([type, data]) => {
            const Icon = STRATEGY_ICONS[type as StrategyType];
            return (
              <div key={type} className="bg-white/5 rounded-lg p-3">
                <div className={`flex items-center gap-2 mb-2 ${STRATEGY_COLORS[type as StrategyType]}`}>
                  <Icon className="w-4 h-4" />
                  <span className="font-medium capitalize">{type.replace('-', ' ')}</span>
                </div>
                <p className="text-xs text-white/50 mb-2">{data.reason}</p>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-green-400">Beats: {data.beats.map(s => s.replace('-', ' ')).join(', ')}</span>
                </div>
                <div className="text-[10px] text-red-400">
                  Loses to: {data.losesTo.map(s => s.replace('-', ' ')).join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Hate Cards Reference */}
      <Card className="bg-black border-white/[0.06] p-4">
        <h3 className="text-sm font-semibold text-white/60 mb-3">Key Hate Cards</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(HATE_CARDS).map(([card, data]) => (
            <div key={card} className="bg-white/5 rounded-lg p-2 flex items-start gap-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{card}</div>
                <div className="text-xs text-white/50">{data.reason}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.hates.slice(0, 2).map(arch => (
                  <span key={arch} className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                    vs {arch.split('-')[0]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
