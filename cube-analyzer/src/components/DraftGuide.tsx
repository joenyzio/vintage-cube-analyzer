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
        <BookMarked className="w-8 h-8 text-purple-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Draft Strategies</h2>
          <p className="text-gray-400">Master the art of drafting this Vintage cube</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {strategies.map((strategy, idx) => (
          <Card key={idx} hover>
            <CardHeader>
              <CardTitle>{strategy.name}</CardTitle>
              <CardDescription>{strategy.description}</CardDescription>
            </CardHeader>

            <div className="space-y-4">
              {/* First Pick Priority */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-gray-300">First Pick Priority:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.firstPickPriority.map((card) => (
                    <span
                      key={card}
                      className="text-xs px-2 py-1 bg-red-900/30 border border-red-800/50 rounded text-red-300"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              {/* Signal Cards */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-gray-300">Read the Signals:</span>
                </div>
                <ul className="space-y-1">
                  {strategy.signalCards.map((signal, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                      <span className="text-blue-400">→</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Avoid */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-gray-300">Avoid:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.avoidCards.map((card) => (
                    <span
                      key={card}
                      className="text-xs px-2 py-1 bg-orange-900/30 border border-orange-800/50 rounded text-orange-300"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              {/* Color Preferences */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-gray-300">Color Preferences:</span>
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
      <Card>
        <CardHeader>
          <CardTitle>General Draft Wisdom for Vintage Cube</CardTitle>
        </CardHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-semibold text-white mb-2">🎯 Pack 1: Stay Open</h4>
            <p className="text-sm text-gray-400">
              Take the most powerful card regardless of color. Power 9, Sol Ring, and Mana Crypt
              go in every deck.
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-semibold text-white mb-2">🔮 Pack 2: Find Your Lane</h4>
            <p className="text-sm text-gray-400">
              By now you should know what's open. Commit to 2 colors or a specific strategy.
              Grab key lands.
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-semibold text-white mb-2">⚡ Pack 3: Fill Gaps</h4>
            <p className="text-sm text-gray-400">
              Complete your curve, grab removal, and shore up weaknesses. Don't get distracted
              by off-color bombs.
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-semibold text-white mb-2">🌈 Mana Base Matters</h4>
            <p className="text-sm text-gray-400">
              Fetch lands are premium picks. A deck with good mana will outperform a deck with
              better cards but worse mana.
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-semibold text-white mb-2">💀 Respect the Combo</h4>
            <p className="text-sm text-gray-400">
              Even if you're not the combo deck, hate-draft key pieces. Don't let someone
              assemble Tinker + Blightsteel uncontested.
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-semibold text-white mb-2">🏃 Speed Kills</h4>
            <p className="text-sm text-gray-400">
              Fast mana is the great equalizer. A turn 1 Sol Ring or Mana Crypt puts you
              ahead of any "fair" deck.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
