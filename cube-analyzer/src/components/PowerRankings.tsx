import type { CubeCard } from '../types/card';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Crown, Sparkles, TrendingUp } from 'lucide-react';
import { getCardImage } from '../services/scryfall';

interface PowerRankingsProps {
  cards: CubeCard[];
}

const roleLabels: Record<string, string> = {
  fast_mana: 'Fast Mana',
  removal: 'Removal',
  counterspell: 'Counter',
  card_advantage: 'Card Advantage',
  finisher: 'Finisher',
  combo_piece: 'Combo',
  aggro_creature: 'Aggro',
  midrange_threat: 'Midrange',
  control_finisher: 'Control',
  enabler: 'Enabler',
  tutor: 'Tutor',
  reanimation_target: 'Reanimate Target',
  land: 'Land',
  utility: 'Utility',
};

export function PowerRankings({ cards }: PowerRankingsProps) {
  const topCards = cards.slice(0, 25);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" />
          <CardTitle>Power Rankings</CardTitle>
        </div>
        <CardDescription>
          The most powerful cards in the cube - prioritize these in draft
        </CardDescription>
      </CardHeader>

      <div className="space-y-2">
        {topCards.map((card, index) => (
          <div
            key={card.id}
            className="group flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-all cursor-pointer"
          >
            {/* Rank */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
              ${index === 0 ? 'bg-yellow-500 text-black' : ''}
              ${index === 1 ? 'bg-gray-300 text-black' : ''}
              ${index === 2 ? 'bg-amber-700 text-white' : ''}
              ${index > 2 ? 'bg-gray-700 text-gray-300' : ''}
            `}>
              {index + 1}
            </div>

            {/* Card Image Thumbnail */}
            <div className="relative w-12 h-16 rounded overflow-hidden bg-gray-700 flex-shrink-0">
              {getCardImage(card) && (
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Card Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{card.name}</span>
                {index < 3 && <Sparkles className="w-4 h-4 text-yellow-500" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{card.type_line?.split('—')[0]}</span>
                <Badge variant="default">{roleLabels[card.role] || card.role}</Badge>
              </div>
            </div>

            {/* Power Level */}
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${card.powerLevel >= 9 ? 'text-red-500' : 'text-green-500'}`} />
              <div className="flex">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-4 mx-px rounded-sm ${
                      i < card.powerLevel
                        ? card.powerLevel >= 9
                          ? 'bg-gradient-to-t from-red-600 to-red-400'
                          : 'bg-gradient-to-t from-green-600 to-green-400'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
