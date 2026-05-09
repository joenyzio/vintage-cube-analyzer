import type { CubeCard } from '../types/card';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Crown } from 'lucide-react';
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
    <Card className="bg-[#111] border-white/8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <CardTitle>Power Rankings</CardTitle>
        </div>
        <CardDescription>
          The most powerful cards in the cube - prioritize these in draft
        </CardDescription>
      </CardHeader>

      <div className="space-y-1">
        {topCards.map((card, index) => (
          <div
            key={card.id}
            className="group flex items-center gap-4 p-2.5 rounded-lg bg-white/2 hover:bg-white/5 transition-all cursor-pointer"
          >
            {/* Rank */}
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center font-mono text-sm
              ${index === 0 ? 'bg-amber-400 text-black' : ''}
              ${index === 1 ? 'bg-neutral-300 text-black' : ''}
              ${index === 2 ? 'bg-amber-700 text-white' : ''}
              ${index > 2 ? 'bg-white/10 text-white/60' : ''}
            `}>
              {index + 1}
            </div>

            {/* Card Image Thumbnail */}
            <div className="relative w-10 h-14 rounded overflow-hidden bg-white/5 flex-shrink-0">
              {getCardImage(card) && (
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              )}
            </div>

            {/* Card Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm truncate">{card.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/30">{card.type_line?.split('—')[0]}</span>
                <Badge variant="default">{roleLabels[card.role] || card.role}</Badge>
              </div>
            </div>

            {/* Power Level */}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-3 rounded-sm ${
                      i < card.powerLevel
                        ? 'bg-white/50'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <span className="text-white/40 font-mono text-xs w-4">{card.powerLevel}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
