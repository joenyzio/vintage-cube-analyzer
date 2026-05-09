import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TypeDistributionChartProps {
  data: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  Creature: '#22c55e',
  Instant: '#3b82f6',
  Sorcery: '#8b5cf6',
  Artifact: '#9ca3af',
  Enchantment: '#f59e0b',
  Planeswalker: '#ec4899',
  Land: '#78716c',
};

export function TypeDistributionChart({ data }: TypeDistributionChartProps) {
  const chartData = Object.entries(data)
    .map(([type, count]) => ({ type, count, color: TYPE_COLORS[type] || '#666' }))
    .sort((a, b) => b.count - a.count);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="text-white font-semibold">{payload[0].payload.type}</p>
          <p className="text-white/60">{payload[0].value} cards</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
        <YAxis
          type="category"
          dataKey="type"
          tick={{ fill: 'rgba(255,255,255,0.4)' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          width={75}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
