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

const colorLetters: Record<string, string> = {
  W: 'W',
  U: 'U',
  B: 'B',
  R: 'R',
  G: 'G',
};

const colorClasses: Record<string, string> = {
  W: 'text-amber-100',
  U: 'text-blue-400',
  B: 'text-neutral-400',
  R: 'text-red-400',
  G: 'text-green-400',
};

export function ArchetypeCard({ archetype, onSelect }: ArchetypeCardProps) {
  const colorString = archetype.colors.length > 0
    ? archetype.colors.map(c => colorLetters[c] || '').join('')
    : 'C';

  return (
    <Card hover className="cursor-pointer bg-[#111] border-white/8" onClick={() => onSelect?.(archetype)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono tracking-wider">
              {archetype.colors.map((c, i) => (
                <span key={i} className={colorClasses[c]}>{colorLetters[c]}</span>
              ))}
              {archetype.colors.length === 0 && <span className="text-white/40">C</span>}
            </span>
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
          <Star className="w-4 h-4 text-white/40" />
          <span className="text-sm text-white/40">Power:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-3 rounded-sm ${
                  i < archetype.powerRating
                    ? 'bg-white/60'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-white/60 font-mono text-sm ml-1">{archetype.powerRating}</span>
        </div>

        {/* Strategy */}
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-white/60">{archetype.strategy}</p>
        </div>

        {/* Key Cards */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/50">Key Cards:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {archetype.keyCards.slice(0, 7).map((card) => (
              <span
                key={card}
                className="text-xs px-2 py-1 bg-white/5 border border-white/8 rounded text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                {card}
              </span>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/50">Draft Tips:</span>
          </div>
          <ul className="space-y-1">
            {archetype.tips.slice(0, 2).map((tip, idx) => (
              <li key={idx} className="text-xs text-white/40 flex items-start gap-2">
                <span className="text-white/30">-</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
