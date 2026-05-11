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
    },
    {
      label: 'Avg. Mana Value',
      value: avgCmc.toFixed(2),
      icon: Zap,
    },
    {
      label: 'Avg. Power Level',
      value: avgPower.toFixed(1) + '/10',
      icon: Sparkles,
    },
    {
      label: 'Creatures',
      value: typeDistribution.Creature || 0,
      icon: Swords,
    },
    {
      label: 'Spells',
      value: (typeDistribution.Instant || 0) + (typeDistribution.Sorcery || 0),
      icon: Palette,
    },
    {
      label: 'Lands',
      value: typeDistribution.Land || 0,
      icon: Mountain,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center bg-black border-white/[0.06]">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white/5 flex items-center justify-center">
              <stat.icon className="w-5 h-5 text-white/60" />
            </div>
            <div className="text-2xl font-semibold text-white">{stat.value}</div>
            <div className="text-sm text-white/40">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Power 9 Badge */}
      {power9Count > 0 && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <span className="text-amber-400 font-medium text-sm">
              {power9Count} of 9 Power cards
            </span>
          </div>
        </div>
      )}

      {/* Color Balance Indicator */}
      <Card className="bg-black border-white/[0.06]">
        <h3 className="text-sm font-medium text-white/60 mb-4">Color Balance</h3>
        <div className="flex gap-1 h-6">
          {Object.entries(colorDistribution)
            .filter(([key]) => ['W', 'U', 'B', 'R', 'G'].includes(key))
            .map(([color, count]) => {
              const total = Object.entries(colorDistribution)
                .filter(([k]) => ['W', 'U', 'B', 'R', 'G'].includes(k))
                .reduce((sum, [_, v]) => sum + v, 0);
              const percentage = (count / total) * 100;
              const colors: Record<string, string> = {
                W: 'bg-amber-100',
                U: 'bg-blue-500',
                B: 'bg-neutral-500',
                R: 'bg-red-500',
                G: 'bg-green-500',
              };
              return (
                <div
                  key={color}
                  className={`${colors[color]} rounded relative overflow-hidden group`}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                    <span className="text-xs font-medium text-white">{count}</span>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/30">
          <span>W</span>
          <span>U</span>
          <span>B</span>
          <span>R</span>
          <span>G</span>
        </div>
      </Card>
    </div>
  );
}
