import type { Archetype } from '../types/card';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Star, Zap, BookOpen, Lightbulb } from 'lucide-react';

interface ArchetypeCardProps {
  archetype: Archetype;
  onSelect?: (archetype: Archetype) => void;
}

const difficultyColors = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
  Expert: 'info',
} as const;

const colorEmoji: Record<string, string> = {
  W: '⚪',
  U: '🔵',
  B: '⚫',
  R: '🔴',
  G: '🟢',
};

export function ArchetypeCard({ archetype, onSelect }: ArchetypeCardProps) {
  const colorString = archetype.colors.length > 0
    ? archetype.colors.map(c => colorEmoji[c] || '').join('')
    : '⬜';

  return (
    <Card hover className="cursor-pointer" onClick={() => onSelect?.(archetype)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{colorString}</span>
            <CardTitle>{archetype.name}</CardTitle>
          </div>
          <Badge variant={difficultyColors[archetype.difficulty]}>
            {archetype.difficulty}
          </Badge>
        </div>
        <CardDescription>{archetype.description}</CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {/* Power Rating */}
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-400">Power Rating:</span>
          <div className="flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-4 mx-0.5 rounded-sm ${
                  i < archetype.powerRating
                    ? 'bg-gradient-to-t from-yellow-600 to-yellow-400'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <span className="text-yellow-500 font-bold ml-1">{archetype.powerRating}/10</span>
        </div>

        {/* Strategy */}
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-300">{archetype.strategy}</p>
        </div>

        {/* Key Cards */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-gray-300">Key Cards:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {archetype.keyCards.slice(0, 7).map((card) => (
              <span
                key={card}
                className="text-xs px-2 py-1 bg-gray-800 rounded-md text-gray-300 hover:bg-purple-900/50 hover:text-purple-300 transition-colors"
              >
                {card}
              </span>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-gray-300">Draft Tips:</span>
          </div>
          <ul className="space-y-1">
            {archetype.tips.slice(0, 2).map((tip, idx) => (
              <li key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                <span className="text-purple-400">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
