import type { CubeCard } from '../types/card';
import { Card } from './ui/Card';
import { LayoutGrid, Palette, Zap, Swords, Sparkles, Mountain } from 'lucide-react';

interface StatsOverviewProps {
  cards: CubeCard[];
  colorDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
}

export function StatsOverview({ cards, colorDistribution, typeDistribution }: StatsOverviewProps) {
  const avgCmc = cards
    .filter(c => !c.type_line?.toLowerCase().includes('land'))
    .reduce((sum, c) => sum + (c.cmc || 0), 0) / cards.filter(c => !c.type_line?.toLowerCase().includes('land')).length;

  const avgPower = cards.reduce((sum, c) => sum + c.powerLevel, 0) / cards.length;

  const power9Count = cards.filter(c =>
    ['Black Lotus', 'Ancestral Recall', 'Time Walk', 'Mox Pearl', 'Mox Sapphire',
     'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Timetwister'].includes(c.name)
  ).length;

  const stats = [
    {
      label: 'Total Cards',
      value: cards.length,
      icon: LayoutGrid,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Avg. Mana Value',
      value: avgCmc.toFixed(2),
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Avg. Power Level',
      value: avgPower.toFixed(1) + '/10',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Creatures',
      value: typeDistribution.Creature || 0,
      icon: Swords,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Spells',
      value: (typeDistribution.Instant || 0) + (typeDistribution.Sorcery || 0),
      icon: Palette,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Lands',
      value: typeDistribution.Land || 0,
      icon: Mountain,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Power 9 Badge */}
      {power9Count > 0 && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-900/30 via-amber-900/30 to-yellow-900/30 border border-yellow-600/30 rounded-full">
            <span className="text-2xl">👑</span>
            <span className="text-yellow-400 font-semibold">
              This cube contains {power9Count} of 9 Power cards!
            </span>
            <span className="text-2xl">💎</span>
          </div>
        </div>
      )}

      {/* Color Balance Indicator */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Color Balance</h3>
        <div className="flex gap-2 h-8">
          {Object.entries(colorDistribution)
            .filter(([key]) => ['W', 'U', 'B', 'R', 'G'].includes(key))
            .map(([color, count]) => {
              const total = Object.entries(colorDistribution)
                .filter(([k]) => ['W', 'U', 'B', 'R', 'G'].includes(k))
                .reduce((sum, [_, v]) => sum + v, 0);
              const percentage = (count / total) * 100;
              const colors: Record<string, string> = {
                W: 'bg-amber-100',
                U: 'bg-blue-600',
                B: 'bg-gray-700',
                R: 'bg-red-600',
                G: 'bg-green-600',
              };
              return (
                <div
                  key={color}
                  className={`${colors[color]} rounded relative overflow-hidden group`}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>White</span>
          <span>Blue</span>
          <span>Black</span>
          <span>Red</span>
          <span>Green</span>
        </div>
      </Card>
    </div>
  );
}
