import { useState } from 'react';
import type { Archetype } from '../types/card';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Swords, Shield, TrendingUp, TrendingDown, Minus, Info, X } from 'lucide-react';

interface MatchupMatrixProps {
  archetypes: Archetype[];
}

// Matchup data: positive = first archetype favored, negative = second favored
const MATCHUP_DATA: Record<string, Record<string, number>> = {
  'ub-reanimator': {
    'uw-control': 0.6,
    'ur-storm': 0.4,
    'mono-white': 0.7,
    'br-aggro': 0.5,
    'ug-ramp': 0.55,
    'artifact-combo': 0.45,
    'bg-midrange': 0.6,
    'rw-aggro': 0.55,
    'show-tell': 0.5,
    'uw-blink': 0.65,
  },
  'uw-control': {
    'ur-storm': 0.55,
    'mono-white': 0.45,
    'br-aggro': 0.5,
    'ug-ramp': 0.55,
    'artifact-combo': 0.4,
    'bg-midrange': 0.6,
    'rw-aggro': 0.45,
    'show-tell': 0.5,
    'uw-blink': 0.55,
  },
  'ur-storm': {
    'mono-white': 0.35,
    'br-aggro': 0.4,
    'ug-ramp': 0.55,
    'artifact-combo': 0.5,
    'bg-midrange': 0.6,
    'rw-aggro': 0.35,
    'show-tell': 0.5,
    'uw-blink': 0.55,
  },
  'mono-white': {
    'br-aggro': 0.45,
    'ug-ramp': 0.5,
    'artifact-combo': 0.4,
    'bg-midrange': 0.55,
    'rw-aggro': 0.5,
    'show-tell': 0.45,
    'uw-blink': 0.4,
  },
  'br-aggro': {
    'ug-ramp': 0.55,
    'artifact-combo': 0.45,
    'bg-midrange': 0.5,
    'rw-aggro': 0.5,
    'show-tell': 0.6,
    'uw-blink': 0.5,
  },
  'ug-ramp': {
    'artifact-combo': 0.45,
    'bg-midrange': 0.5,
    'rw-aggro': 0.4,
    'show-tell': 0.5,
    'uw-blink': 0.45,
  },
  'artifact-combo': {
    'bg-midrange': 0.65,
    'rw-aggro': 0.4,
    'show-tell': 0.5,
    'uw-blink': 0.6,
  },
  'bg-midrange': {
    'rw-aggro': 0.45,
    'show-tell': 0.4,
    'uw-blink': 0.5,
  },
  'rw-aggro': {
    'show-tell': 0.55,
    'uw-blink': 0.55,
  },
  'show-tell': {
    'uw-blink': 0.6,
  },
};

// Matchup explanations
const MATCHUP_EXPLANATIONS: Record<string, Record<string, string>> = {
  'ub-reanimator': {
    'uw-control': 'Reanimator can go under control before they establish counters. Solitude is problematic.',
    'ur-storm': 'Both fast combo decks. Storm is slightly faster but Reanimator has disruption.',
    'mono-white': 'Thalia slows Reanimator but they can still combo through it.',
  },
  'artifact-combo': {
    'rw-aggro': 'Aggro can get under Tinker draws. Need fast mana to race.',
    'ur-storm': 'Both degenerate but Artifacts more consistent.',
  },
  'ur-storm': {
    'mono-white': 'Thalia is a nightmare. Storm struggles against tax effects.',
    'rw-aggro': 'Too fast, too much pressure. Need to combo turn 2-3.',
  },
};

function getMatchup(arch1: string, arch2: string): number {
  if (arch1 === arch2) return 0.5;
  if (MATCHUP_DATA[arch1]?.[arch2]) return MATCHUP_DATA[arch1][arch2];
  if (MATCHUP_DATA[arch2]?.[arch1]) return 1 - MATCHUP_DATA[arch2][arch1];
  return 0.5;
}

function getExplanation(arch1: string, arch2: string): string | null {
  if (MATCHUP_EXPLANATIONS[arch1]?.[arch2]) return MATCHUP_EXPLANATIONS[arch1][arch2];
  if (MATCHUP_EXPLANATIONS[arch2]?.[arch1]) return MATCHUP_EXPLANATIONS[arch2][arch1];
  return null;
}

export function MatchupMatrix({ archetypes }: MatchupMatrixProps) {
  const [selectedMatchup, setSelectedMatchup] = useState<{
    arch1: Archetype;
    arch2: Archetype;
    winRate: number;
  } | null>(null);

  const getMatchupColor = (winRate: number): string => {
    if (winRate >= 0.6) return 'bg-green-500/80 text-white';
    if (winRate >= 0.55) return 'bg-green-500/50 text-white';
    if (winRate <= 0.4) return 'bg-red-500/80 text-white';
    if (winRate <= 0.45) return 'bg-red-500/50 text-white';
    return 'bg-gray-700 text-gray-300';
  };

  const getMatchupIcon = (winRate: number) => {
    if (winRate >= 0.55) return <TrendingUp className="w-3 h-3" />;
    if (winRate <= 0.45) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  // Sort archetypes by power rating
  const sortedArchetypes = [...archetypes].sort((a, b) => b.powerRating - a.powerRating);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
          <Swords className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Matchup Matrix</h2>
          <p className="text-gray-400">See how archetypes match up against each other</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/80" />
          <span className="text-gray-400">Favored (60%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/50" />
          <span className="text-gray-400">Slight Edge (55-60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-700" />
          <span className="text-gray-400">Even (45-55%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/50" />
          <span className="text-gray-400">Slight Underdog (40-45%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/80" />
          <span className="text-gray-400">Unfavored (&lt;40%)</span>
        </div>
      </div>

      {/* Matrix */}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="p-2 text-left text-sm text-gray-400 font-medium sticky left-0 bg-gray-900/95">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Defending
                </div>
              </th>
              {sortedArchetypes.map(arch => (
                <th key={arch.id} className="p-2 text-center">
                  <div className="text-xs text-gray-400 font-medium whitespace-nowrap transform -rotate-45 origin-left translate-x-4">
                    {arch.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedArchetypes.map(arch1 => (
              <tr key={arch1.id} className="border-t border-gray-800">
                <td className="p-2 text-sm text-white font-medium sticky left-0 bg-gray-900/95 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {arch1.colors.map(c => (
                        <div
                          key={c}
                          className={`w-4 h-4 rounded-full border-2 border-gray-900
                            ${c === 'W' ? 'bg-amber-100' : ''}
                            ${c === 'U' ? 'bg-blue-500' : ''}
                            ${c === 'B' ? 'bg-gray-700' : ''}
                            ${c === 'R' ? 'bg-red-500' : ''}
                            ${c === 'G' ? 'bg-green-500' : ''}
                          `}
                        />
                      ))}
                    </div>
                    {arch1.name}
                  </div>
                </td>
                {sortedArchetypes.map(arch2 => {
                  const winRate = getMatchup(arch1.id, arch2.id);
                  const isSelf = arch1.id === arch2.id;

                  return (
                    <td key={arch2.id} className="p-1 text-center">
                      {isSelf ? (
                        <div className="w-12 h-8 mx-auto bg-gray-800 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-xs">—</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedMatchup({ arch1, arch2, winRate })}
                          className={`
                            w-12 h-8 mx-auto rounded flex items-center justify-center gap-1
                            transition-all hover:scale-110 hover:shadow-lg cursor-pointer
                            ${getMatchupColor(winRate)}
                          `}
                        >
                          {getMatchupIcon(winRate)}
                          <span className="text-xs font-bold">{Math.round(winRate * 100)}%</span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Best/Worst Matchups Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <CardTitle>Best Matchups by Archetype</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {sortedArchetypes.slice(0, 5).map(arch => {
              const matchups = sortedArchetypes
                .filter(a => a.id !== arch.id)
                .map(a => ({ archetype: a, winRate: getMatchup(arch.id, a.id) }))
                .sort((a, b) => b.winRate - a.winRate);

              const best = matchups[0];
              if (!best) return null;

              return (
                <div key={arch.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                  <span className="text-white font-medium">{arch.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">beats</span>
                    <Badge variant="success">{best.archetype.name}</Badge>
                    <span className="text-green-400 font-bold">{Math.round(best.winRate * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <CardTitle>Worst Matchups by Archetype</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {sortedArchetypes.slice(0, 5).map(arch => {
              const matchups = sortedArchetypes
                .filter(a => a.id !== arch.id)
                .map(a => ({ archetype: a, winRate: getMatchup(arch.id, a.id) }))
                .sort((a, b) => a.winRate - b.winRate);

              const worst = matchups[0];
              if (!worst) return null;

              return (
                <div key={arch.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                  <span className="text-white font-medium">{arch.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">loses to</span>
                    <Badge variant="danger">{worst.archetype.name}</Badge>
                    <span className="text-red-400 font-bold">{Math.round(worst.winRate * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Selected Matchup Detail Modal */}
      {selectedMatchup && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMatchup(null)}
        >
          <Card
            className="max-w-lg w-full"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Matchup Analysis</h3>
              <button
                onClick={() => setSelectedMatchup(null)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{selectedMatchup.arch1.name}</div>
                <Badge variant="mana" color={selectedMatchup.arch1.colors[0] as any}>
                  {selectedMatchup.arch1.colors.join('')}
                </Badge>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-white">
                  {Math.round(selectedMatchup.winRate * 100)}%
                </div>
                <div className="text-sm text-gray-400">win rate</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-white">{selectedMatchup.arch2.name}</div>
                <Badge variant="mana" color={selectedMatchup.arch2.colors[0] as any}>
                  {selectedMatchup.arch2.colors.join('')}
                </Badge>
              </div>
            </div>

            {/* Win rate bar */}
            <div className="h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                style={{ width: `${selectedMatchup.winRate * 100}%` }}
              />
            </div>

            {/* Explanation */}
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">
                  {getExplanation(selectedMatchup.arch1.id, selectedMatchup.arch2.id) ||
                    `${selectedMatchup.winRate >= 0.5 ? selectedMatchup.arch1.name : selectedMatchup.arch2.name} is favored in this matchup. The ${selectedMatchup.winRate >= 0.5 ? 'faster clock' : 'better inevitability'} gives them an edge.`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
