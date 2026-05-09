import { useState } from 'react';
import type { Archetype } from '../types/card';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Swords, TrendingUp, TrendingDown, Minus, Info, X } from 'lucide-react';

interface MatchupMatrixProps {
  archetypes: Archetype[];
}

const MATCHUP_DATA: Record<string, Record<string, number>> = {
  'ub-reanimator': {
    'uw-control': 0.6, 'ur-storm': 0.4, 'mono-white': 0.7, 'br-aggro': 0.5,
    'ug-ramp': 0.55, 'artifact-combo': 0.45, 'bg-midrange': 0.6, 'rw-aggro': 0.55,
    'show-tell': 0.5, 'uw-blink': 0.65,
  },
  'uw-control': {
    'ur-storm': 0.55, 'mono-white': 0.45, 'br-aggro': 0.5, 'ug-ramp': 0.55,
    'artifact-combo': 0.4, 'bg-midrange': 0.6, 'rw-aggro': 0.45, 'show-tell': 0.5, 'uw-blink': 0.55,
  },
  'ur-storm': {
    'mono-white': 0.35, 'br-aggro': 0.4, 'ug-ramp': 0.55, 'artifact-combo': 0.5,
    'bg-midrange': 0.6, 'rw-aggro': 0.35, 'show-tell': 0.5, 'uw-blink': 0.55,
  },
  'mono-white': {
    'br-aggro': 0.45, 'ug-ramp': 0.5, 'artifact-combo': 0.4, 'bg-midrange': 0.55,
    'rw-aggro': 0.5, 'show-tell': 0.45, 'uw-blink': 0.4,
  },
  'br-aggro': {
    'ug-ramp': 0.55, 'artifact-combo': 0.45, 'bg-midrange': 0.5, 'rw-aggro': 0.5,
    'show-tell': 0.6, 'uw-blink': 0.5,
  },
  'ug-ramp': {
    'artifact-combo': 0.45, 'bg-midrange': 0.5, 'rw-aggro': 0.4, 'show-tell': 0.5, 'uw-blink': 0.45,
  },
  'artifact-combo': {
    'bg-midrange': 0.65, 'rw-aggro': 0.4, 'show-tell': 0.5, 'uw-blink': 0.6,
  },
  'bg-midrange': { 'rw-aggro': 0.45, 'show-tell': 0.4, 'uw-blink': 0.5 },
  'rw-aggro': { 'show-tell': 0.55, 'uw-blink': 0.55 },
  'show-tell': { 'uw-blink': 0.6 },
};

const MATCHUP_EXPLANATIONS: Record<string, Record<string, string>> = {
  'ub-reanimator': {
    'uw-control': 'Reanimator can go under control before they establish counters.',
    'ur-storm': 'Both fast combo decks. Storm is slightly faster but Reanimator has disruption.',
    'mono-white': 'Thalia slows Reanimator but they can still combo through it.',
  },
  'artifact-combo': {
    'rw-aggro': 'Aggro can get under Tinker draws. Need fast mana to race.',
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
    if (winRate >= 0.6) return 'bg-green-500/30 text-green-400';
    if (winRate >= 0.55) return 'bg-green-500/15 text-green-400';
    if (winRate <= 0.4) return 'bg-red-500/30 text-red-400';
    if (winRate <= 0.45) return 'bg-red-500/15 text-red-400';
    return 'bg-white/5 text-white/50';
  };

  const getMatchupIcon = (winRate: number) => {
    if (winRate >= 0.55) return <TrendingUp className="w-3 h-3" />;
    if (winRate <= 0.45) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const sortedArchetypes = [...archetypes].sort((a, b) => b.powerRating - a.powerRating);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center">
          <Swords className="w-5 h-5 text-white/60" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Matchup Matrix</h2>
          <p className="text-white/40 text-sm">See how archetypes match up against each other</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/30" />
          <span className="text-white/40">Favored (60%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/15" />
          <span className="text-white/40">Slight Edge</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white/5" />
          <span className="text-white/40">Even</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/15" />
          <span className="text-white/40">Slight Underdog</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/30" />
          <span className="text-white/40">Unfavored</span>
        </div>
      </div>

      {/* Matrix */}
      <Card className="overflow-x-auto bg-[#111] border-white/8">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs text-white/40 font-medium sticky left-0 bg-[#111]">
                vs
              </th>
              {sortedArchetypes.map(arch => (
                <th key={arch.id} className="p-2 text-center">
                  <div className="text-xs text-white/40 font-medium whitespace-nowrap transform -rotate-45 origin-left translate-x-4">
                    {arch.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedArchetypes.map(arch1 => (
              <tr key={arch1.id} className="border-t border-white/5">
                <td className="p-2 text-sm text-white font-medium sticky left-0 bg-[#111] whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {arch1.colors.map(c => (
                        <div
                          key={c}
                          className={`w-3 h-3 rounded-full border border-[#111]
                            ${c === 'W' ? 'bg-amber-100' : ''}
                            ${c === 'U' ? 'bg-blue-500' : ''}
                            ${c === 'B' ? 'bg-neutral-500' : ''}
                            ${c === 'R' ? 'bg-red-500' : ''}
                            ${c === 'G' ? 'bg-green-500' : ''}
                          `}
                        />
                      ))}
                    </div>
                    <span className="text-xs">{arch1.name}</span>
                  </div>
                </td>
                {sortedArchetypes.map(arch2 => {
                  const winRate = getMatchup(arch1.id, arch2.id);
                  const isSelf = arch1.id === arch2.id;

                  return (
                    <td key={arch2.id} className="p-1 text-center">
                      {isSelf ? (
                        <div className="w-10 h-6 mx-auto bg-white/5 rounded flex items-center justify-center">
                          <span className="text-white/20 text-xs">-</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedMatchup({ arch1, arch2, winRate })}
                          className={`
                            w-10 h-6 mx-auto rounded flex items-center justify-center gap-0.5
                            transition-all hover:scale-110 cursor-pointer
                            ${getMatchupColor(winRate)}
                          `}
                        >
                          {getMatchupIcon(winRate)}
                          <span className="text-xs font-mono">{Math.round(winRate * 100)}</span>
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

      {/* Best/Worst Matchups */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-[#111] border-white/8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <CardTitle>Best Matchups</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {sortedArchetypes.slice(0, 5).map(arch => {
              const matchups = sortedArchetypes
                .filter(a => a.id !== arch.id)
                .map(a => ({ archetype: a, winRate: getMatchup(arch.id, a.id) }))
                .sort((a, b) => b.winRate - a.winRate);
              const best = matchups[0];
              if (!best) return null;
              return (
                <div key={arch.id} className="flex items-center justify-between p-2 bg-white/2 rounded-lg">
                  <span className="text-white text-sm">{arch.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs">beats</span>
                    <Badge variant="success">{best.archetype.name}</Badge>
                    <span className="text-green-400 font-mono text-xs">{Math.round(best.winRate * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-[#111] border-white/8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <CardTitle>Worst Matchups</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {sortedArchetypes.slice(0, 5).map(arch => {
              const matchups = sortedArchetypes
                .filter(a => a.id !== arch.id)
                .map(a => ({ archetype: a, winRate: getMatchup(arch.id, a.id) }))
                .sort((a, b) => a.winRate - b.winRate);
              const worst = matchups[0];
              if (!worst) return null;
              return (
                <div key={arch.id} className="flex items-center justify-between p-2 bg-white/2 rounded-lg">
                  <span className="text-white text-sm">{arch.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs">loses to</span>
                    <Badge variant="danger">{worst.archetype.name}</Badge>
                    <span className="text-red-400 font-mono text-xs">{Math.round(worst.winRate * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal */}
      {selectedMatchup && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMatchup(null)}
        >
          <Card
            className="max-w-lg w-full bg-[#111] border-white/10"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-white">Matchup Analysis</h3>
              <button
                onClick={() => setSelectedMatchup(null)}
                className="p-1 hover:bg-white/5 rounded"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <div className="text-sm font-medium text-white">{selectedMatchup.arch1.name}</div>
                <Badge variant="mana" color={selectedMatchup.arch1.colors[0] as any}>
                  {selectedMatchup.arch1.colors.join('')}
                </Badge>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-2xl font-semibold text-white">
                  {Math.round(selectedMatchup.winRate * 100)}%
                </div>
                <div className="text-xs text-white/40">win rate</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-white">{selectedMatchup.arch2.name}</div>
                <Badge variant="mana" color={selectedMatchup.arch2.colors[0] as any}>
                  {selectedMatchup.arch2.colors.join('')}
                </Badge>
              </div>
            </div>

            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-white/30 transition-all"
                style={{ width: `${selectedMatchup.winRate * 100}%` }}
              />
            </div>

            <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                <p className="text-white/60 text-sm">
                  {getExplanation(selectedMatchup.arch1.id, selectedMatchup.arch2.id) ||
                    `${selectedMatchup.winRate >= 0.5 ? selectedMatchup.arch1.name : selectedMatchup.arch2.name} is favored in this matchup.`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
