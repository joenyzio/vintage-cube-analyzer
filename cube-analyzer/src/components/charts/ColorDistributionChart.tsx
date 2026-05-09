import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ColorDistributionChartProps {
  data: Record<string, number>;
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

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  Multicolor: 'Multicolor',
  Colorless: 'Colorless',
};

export function ColorDistributionChart({ data }: ColorDistributionChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: COLOR_NAMES[key] || key,
      value,
      color: COLORS[key] || '#666',
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="text-white font-semibold">{payload[0].name}</p>
          <p className="text-gray-300">{payload[0].value} cards</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span className="text-gray-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
