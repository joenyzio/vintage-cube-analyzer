import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ManaCurveChartProps {
  data: Record<number, Record<string, number>>;
}

const COLORS: Record<string, string> = {
  W: '#f8f6d8',
  U: '#0e68ab',
  B: '#4a4a4a',
  R: '#d32029',
  G: '#00733e',
  Multicolor: '#c9a227',
  Colorless: '#9ca3af',
};

export function ManaCurveChart({ data }: ManaCurveChartProps) {
  const chartData = Object.entries(data).map(([cmc, colors]) => ({
    cmc: cmc === '7' ? '7+' : cmc,
    ...colors,
    total: Object.values(colors).reduce((a, b) => a + b, 0),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="custom-tooltip">
          <p className="text-white font-semibold mb-2">CMC {label}</p>
          {payload.filter((p: any) => p.value > 0).map((entry: any, idx: number) => (
            <p key={idx} style={{ color: entry.fill }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
          <p className="text-white/40 mt-2 pt-2 border-t border-white/10">
            Total: {total}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <XAxis
          dataKey="cmc"
          tick={{ fill: 'rgba(255,255,255,0.4)' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.4)' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(value) => <span className="text-white/60 text-sm">{value}</span>} />
        {Object.keys(COLORS).map((color) => (
          <Bar
            key={color}
            dataKey={color}
            stackId="a"
            fill={COLORS[color]}
            name={color === 'W' ? 'White' : color === 'U' ? 'Blue' : color === 'B' ? 'Black' : color === 'R' ? 'Red' : color === 'G' ? 'Green' : color}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
