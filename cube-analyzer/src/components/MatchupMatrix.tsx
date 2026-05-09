import { useState, useMemo } from 'react';
import type { Archetype } from '../types/card';
import { Card } from './ui/Card';
import { X } from 'lucide-react';

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
    'uw-control': 'Reanimator can go under control before they establish counters. Turn 1-2 Griselbrand is hard to answer.',
    'ur-storm': 'Both fast combo decks. Storm is slightly faster but Reanimator has Thoughtseize/Grief for disruption.',
    'mono-white': 'Thalia slows Reanimator but they can still combo through it. Grief evoked is devastating.',
    'mono-white': 'Thalia taxes reanimation spells but Grief + Reanimate is backbreaking. Reanimator wins the long game.',
  },
  'artifact-combo': {
    'rw-aggro': 'Aggro can get under Tinker draws. Need fast mana + Tinker by turn 2 to race.',
    'bg-midrange': 'Midrange lacks the speed to pressure and the counters to stop Tinker.',
  },
  'ur-storm': {
    'mono-white': 'Thalia is a nightmare. Storm struggles hard against tax effects and has no good removal.',
    'rw-aggro': 'Too fast, too much pressure. Storm needs to combo turn 2-3 or dies to burn.',
  },
  'uw-control': {
    'artifact-combo': 'Tinker through countermagic is tough. Academy generates too much mana.',
    'ub-reanimator': 'Hard to keep up countermagic against turn 1-2 reanimation with hand disruption backup.',
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

// Short names for column headers
const SHORT_NAMES: Record<string, string> = {
  'ub-reanimator': 'Reanimate',
  'uw-control': 'UW Ctrl',
  'ur-storm': 'Storm',
  'mono-white': 'Mono W',
  'br-aggro': 'Rakdos',
  'ug-ramp': 'Ramp',
  'artifact-combo': 'Artifacts',
  'bg-midrange': 'BG Mid',
  'rw-aggro': 'Boros',
  'show-tell': 'S&T',
  'uw-blink': 'Blink',
};

export function MatchupMatrix({ archetypes }: MatchupMatrixProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [selectedMatchup, setSelectedMatchup] = useState<{
    arch1: Archetype;
    arch2: Archetype;
    winRate: number;
  } | null>(null);

  const sortedArchetypes = useMemo(() =>
    [...archetypes].sort((a, b) => b.powerRating - a.powerRating),
    [archetypes]
  );

  const getMatchupStyle = (winRate: number, isHighlighted: boolean) => {
    const base = isHighlighted ? 'ring-1 ring-white/30' : '';
    if (winRate >= 0.6) return `bg-green-500/40 text-green-300 ${base}`;
    if (winRate >= 0.55) return `bg-green-500/20 text-green-400 ${base}`;
    if (winRate <= 0.4) return `bg-red-500/40 text-red-300 ${base}`;
    if (winRate <= 0.45) return `bg-red-500/20 text-red-400 ${base}`;
    return `bg-white/5 text-white/50 ${base}`;
  };

  // Calculate matchup summary for selected archetype
  const matchupSummary = useMemo(() => {
    if (!selectedArchetype) return null;
    const arch = sortedArchetypes.find(a => a.id === selectedArchetype);
    if (!arch) return null;

    const matchups = sortedArchetypes
      .filter(a => a.id !== selectedArchetype)
      .map(a => ({ archetype: a, winRate: getMatchup(selectedArchetype, a.id) }))
      .sort((a, b) => b.winRate - a.winRate);

    const favorable = matchups.filter(m => m.winRate >= 0.55);
    const unfavorable = matchups.filter(m => m.winRate <= 0.45);
    const even = matchups.filter(m => m.winRate > 0.45 && m.winRate < 0.55);

    return { arch, matchups, favorable, unfavorable, even };
  }, [selectedArchetype, sortedArchetypes]);

  return (
    <div className="space-y-4">
      {/* Filter + Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedArchetype(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${!selectedArchetype ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'}`}
          >
            All
          </button>
          {sortedArchetypes.map(arch => (
            <button
              key={arch.id}
              onClick={() => setSelectedArchetype(selectedArchetype === arch.id ? null : arch.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${selectedArchetype === arch.id ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'}`}
            >
              <div className="flex -space-x-0.5">
                {arch.colors.map(c => (
                  <div key={c} className={`w-2.5 h-2.5 rounded-full
                    ${c === 'W' ? 'bg-amber-100' : ''}
                    ${c === 'U' ? 'bg-blue-500' : ''}
                    ${c === 'B' ? 'bg-neutral-500' : ''}
                    ${c === 'R' ? 'bg-red-500' : ''}
                    ${c === 'G' ? 'bg-green-500' : ''}
                  `} />
                ))}
              </div>
              {SHORT_NAMES[arch.id] || arch.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 text-[10px] text-white/40">
          <span><span className="inline-block w-2 h-2 rounded bg-green-500/40 mr-1" />60%+</span>
          <span><span className="inline-block w-2 h-2 rounded bg-green-500/20 mr-1" />55%</span>
          <span><span className="inline-block w-2 h-2 rounded bg-white/10 mr-1" />50%</span>
          <span><span className="inline-block w-2 h-2 rounded bg-red-500/20 mr-1" />45%</span>
          <span><span className="inline-block w-2 h-2 rounded bg-red-500/40 mr-1" />40%-</span>
        </div>
      </div>

      {/* Matchup Summary (when archetype selected) */}
      {matchupSummary && (
        <Card className="bg-[#111] border-white/8 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-0.5">
                {matchupSummary.arch.colors.map(c => (
                  <div key={c} className={`w-4 h-4 rounded-full
                    ${c === 'W' ? 'bg-amber-100' : ''}
                    ${c === 'U' ? 'bg-blue-500' : ''}
                    ${c === 'B' ? 'bg-neutral-500' : ''}
                    ${c === 'R' ? 'bg-red-500' : ''}
                    ${c === 'G' ? 'bg-green-500' : ''}
                  `} />
                ))}
              </div>
              <span className="font-semibold text-white">{matchupSummary.arch.name}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-green-400">{matchupSummary.favorable.length} favorable</span>
              <span className="text-white/40">{matchupSummary.even.length} even</span>
              <span className="text-red-400">{matchupSummary.unfavorable.length} unfavorable</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-white/30 mb-1">Best matchups</div>
              {matchupSummary.favorable.slice(0, 3).map(m => (
                <div key={m.archetype.id} className="flex justify-between text-green-400">
                  <span>{SHORT_NAMES[m.archetype.id]}</span>
                  <span className="font-mono">{Math.round(m.winRate * 100)}%</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-white/30 mb-1">Even matchups</div>
              {matchupSummary.even.slice(0, 3).map(m => (
                <div key={m.archetype.id} className="flex justify-between text-white/50">
                  <span>{SHORT_NAMES[m.archetype.id]}</span>
                  <span className="font-mono">{Math.round(m.winRate * 100)}%</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-white/30 mb-1">Worst matchups</div>
              {matchupSummary.unfavorable.slice(0, 3).map(m => (
                <div key={m.archetype.id} className="flex justify-between text-red-400">
                  <span>{SHORT_NAMES[m.archetype.id]}</span>
                  <span className="font-mono">{Math.round(m.winRate * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Matrix */}
      <Card className="overflow-x-auto bg-[#111] border-white/8 p-0">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-white/5">
              <th className="p-2 text-left text-[10px] text-white/30 font-medium w-28" />
              {sortedArchetypes.map(arch => (
                <th key={arch.id} className="p-1.5 text-center">
                  <div className={`text-[10px] font-medium transition-colors
                    ${selectedArchetype === arch.id ? 'text-white' : 'text-white/40'}`}>
                    {SHORT_NAMES[arch.id] || arch.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedArchetypes.map(arch1 => {
              const isRowHighlighted = selectedArchetype === arch1.id;
              return (
                <tr key={arch1.id} className={`border-t border-white/5 ${isRowHighlighted ? 'bg-white/5' : ''}`}>
                  <td className="p-2 text-xs font-medium whitespace-nowrap">
                    <div className={`flex items-center gap-2 transition-colors ${isRowHighlighted ? 'text-white' : 'text-white/60'}`}>
                      <div className="flex -space-x-0.5">
                        {arch1.colors.map(c => (
                          <div key={c} className={`w-2.5 h-2.5 rounded-full
                            ${c === 'W' ? 'bg-amber-100' : ''}
                            ${c === 'U' ? 'bg-blue-500' : ''}
                            ${c === 'B' ? 'bg-neutral-500' : ''}
                            ${c === 'R' ? 'bg-red-500' : ''}
                            ${c === 'G' ? 'bg-green-500' : ''}
                          `} />
                        ))}
                      </div>
                      <span>{SHORT_NAMES[arch1.id] || arch1.name}</span>
                    </div>
                  </td>
                  {sortedArchetypes.map(arch2 => {
                    const winRate = getMatchup(arch1.id, arch2.id);
                    const isSelf = arch1.id === arch2.id;
                    const isHighlighted = selectedArchetype === arch1.id || selectedArchetype === arch2.id;

                    return (
                      <td key={arch2.id} className="p-1 text-center">
                        {isSelf ? (
                          <div className="w-9 h-6 mx-auto bg-white/5 rounded flex items-center justify-center">
                            <span className="text-white/20 text-[10px]">—</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedMatchup({ arch1, arch2, winRate })}
                            className={`w-9 h-6 mx-auto rounded flex items-center justify-center text-[11px] font-mono transition-all hover:scale-110 ${getMatchupStyle(winRate, isHighlighted)}`}
                          >
                            {Math.round(winRate * 100)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {selectedMatchup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMatchup(null)}>
          <Card className="max-w-md w-full bg-[#111] border-white/10 p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-semibold text-white">Matchup Analysis</h3>
              <button onClick={() => setSelectedMatchup(null)} className="p-1 hover:bg-white/5 rounded">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1">
                <div className="flex justify-center gap-1 mb-1">
                  {selectedMatchup.arch1.colors.map(c => (
                    <div key={c} className={`w-4 h-4 rounded-full
                      ${c === 'W' ? 'bg-amber-100' : ''}
                      ${c === 'U' ? 'bg-blue-500' : ''}
                      ${c === 'B' ? 'bg-neutral-500' : ''}
                      ${c === 'R' ? 'bg-red-500' : ''}
                      ${c === 'G' ? 'bg-green-500' : ''}
                    `} />
                  ))}
                </div>
                <div className="font-medium text-white">{selectedMatchup.arch1.name}</div>
              </div>

              <div className="px-6 text-center">
                <div className={`text-3xl font-bold ${selectedMatchup.winRate >= 0.55 ? 'text-green-400' : selectedMatchup.winRate <= 0.45 ? 'text-red-400' : 'text-white'}`}>
                  {Math.round(selectedMatchup.winRate * 100)}%
                </div>
                <div className="text-xs text-white/40">vs</div>
                <div className="text-lg text-white/60">
                  {Math.round((1 - selectedMatchup.winRate) * 100)}%
                </div>
              </div>

              <div className="text-center flex-1">
                <div className="flex justify-center gap-1 mb-1">
                  {selectedMatchup.arch2.colors.map(c => (
                    <div key={c} className={`w-4 h-4 rounded-full
                      ${c === 'W' ? 'bg-amber-100' : ''}
                      ${c === 'U' ? 'bg-blue-500' : ''}
                      ${c === 'B' ? 'bg-neutral-500' : ''}
                      ${c === 'R' ? 'bg-red-500' : ''}
                      ${c === 'G' ? 'bg-green-500' : ''}
                    `} />
                  ))}
                </div>
                <div className="font-medium text-white">{selectedMatchup.arch2.name}</div>
              </div>
            </div>

            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-6">
              <div className={`h-full transition-all ${selectedMatchup.winRate >= 0.55 ? 'bg-green-500/50' : selectedMatchup.winRate <= 0.45 ? 'bg-red-500/50' : 'bg-white/30'}`}
                style={{ width: `${selectedMatchup.winRate * 100}%` }} />
            </div>

            {getExplanation(selectedMatchup.arch1.id, selectedMatchup.arch2.id) && (
              <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
                <p className="text-sm text-white/70">
                  {getExplanation(selectedMatchup.arch1.id, selectedMatchup.arch2.id)}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
