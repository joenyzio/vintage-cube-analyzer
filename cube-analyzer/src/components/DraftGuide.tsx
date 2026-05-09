import type { DraftStrategy } from '../types/card';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Target, Eye, XCircle, Palette, BookMarked } from 'lucide-react';

interface DraftGuideProps {
  strategies: DraftStrategy[];
}

export function DraftGuide({ strategies }: DraftGuideProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center">
          <BookMarked className="w-5 h-5 text-white/60" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Draft Strategies</h2>
          <p className="text-white/40 text-sm">Master the art of drafting this Vintage cube</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {strategies.map((strategy, idx) => (
          <Card key={idx} hover className="bg-[#111] border-white/8">
            <CardHeader>
              <CardTitle>{strategy.name}</CardTitle>
              <CardDescription>{strategy.description}</CardDescription>
            </CardHeader>

            <div className="space-y-4">
              {/* First Pick Priority */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/50">First Pick Priority:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.firstPickPriority.map((card) => (
                    <span
                      key={card}
                      className="text-xs px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-400"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              {/* Signal Cards */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/50">Read the Signals:</span>
                </div>
                <ul className="space-y-1">
                  {strategy.signalCards.map((signal, i) => (
                    <li key={i} className="text-xs text-white/40 flex items-start gap-2">
                      <span className="text-white/20">-</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Avoid */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/50">Avoid:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.avoidCards.map((card) => (
                    <span
                      key={card}
                      className="text-xs px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              {/* Color Preferences */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/50">Color Preferences:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.colorPreferences.map((pref) => (
                    <Badge key={pref} variant="info">{pref}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* General Tips */}
      <Card className="bg-[#111] border-white/8">
        <CardHeader>
          <CardTitle>General Draft Wisdom for Vintage Cube</CardTitle>
        </CardHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Pack 1: Stay Open</h4>
            <p className="text-sm text-white/40">
              Take the most powerful card regardless of color. Power 9, Sol Ring, and Mana Crypt
              go in every deck.
            </p>
          </div>
          <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Pack 2: Find Your Lane</h4>
            <p className="text-sm text-white/40">
              By now you should know what's open. Commit to 2 colors or a specific strategy.
              Grab key lands.
            </p>
          </div>
          <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Pack 3: Fill Gaps</h4>
            <p className="text-sm text-white/40">
              Complete your curve, grab removal, and shore up weaknesses. Don't get distracted
              by off-color bombs.
            </p>
          </div>
          <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Mana Base Matters</h4>
            <p className="text-sm text-white/40">
              Fetch lands are premium picks. A deck with good mana will outperform a deck with
              better cards but worse mana.
            </p>
          </div>
          <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Respect the Combo</h4>
            <p className="text-sm text-white/40">
              Even if you're not the combo deck, hate-draft key pieces. Don't let someone
              assemble Tinker + Blightsteel uncontested.
            </p>
          </div>
          <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Speed Kills</h4>
            <p className="text-sm text-white/40">
              Fast mana is the great equalizer. A turn 1 Sol Ring or Mana Crypt puts you
              ahead of any "fair" deck.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
