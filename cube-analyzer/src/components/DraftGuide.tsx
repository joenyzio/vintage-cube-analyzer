import type { DraftStrategy } from '../types/card';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Target, Eye, XCircle, Palette } from 'lucide-react';

interface DraftGuideProps {
  strategies: DraftStrategy[];
}

export function DraftGuide({ strategies }: DraftGuideProps) {
  return (
    <div className="space-y-8">
      {/* Strategies Grid - All visible */}
      <div className="grid gap-6 md:grid-cols-2">
        {strategies.map((strategy, idx) => (
          <Card key={idx} className="p-5 bg-black border-white/[0.06]">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-1">{strategy.name}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{strategy.description}</p>
            </div>

            <div className="space-y-5">
              {/* First Pick Priority */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wide">First Pick Priority</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {strategy.firstPickPriority.map((card) => (
                    <span
                      key={card}
                      className="text-sm px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              {/* Signal Cards */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Read the Signals</span>
                </div>
                <ul className="space-y-2">
                  {strategy.signalCards.map((signal, i) => (
                    <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                      <span className="text-blue-400/60 mt-0.5">→</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Avoid */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <XCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Avoid</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {strategy.avoidCards.map((card) => (
                    <span
                      key={card}
                      className="text-sm px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              {/* Color Preferences */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Color Preferences</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {strategy.colorPreferences.map((pref) => (
                    <Badge key={pref} variant="info" className="text-sm px-3 py-1">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* General Tips */}
      <Card className="p-5 bg-black border-white/[0.06]">
        <h3 className="text-lg font-semibold text-white mb-4">General Draft Wisdom</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">P1</span>
              <h4 className="font-medium text-white">Stay Open</h4>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              Take the most powerful card regardless of color. Power 9, Sol Ring, and Mana Crypt go in every deck.
            </p>
          </div>
          <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">P2</span>
              <h4 className="font-medium text-white">Find Your Lane</h4>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              By now you should know what's open. Commit to 2 colors or a specific strategy. Grab key lands.
            </p>
          </div>
          <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">P3</span>
              <h4 className="font-medium text-white">Fill Gaps</h4>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              Complete your curve, grab removal, and shore up weaknesses. Don't get distracted by off-color bombs.
            </p>
          </div>
          <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
            <h4 className="font-medium text-white mb-2">Mana Base Matters</h4>
            <p className="text-sm text-white/50 leading-relaxed">
              Fetch lands are premium picks. A deck with good mana will outperform a deck with better cards but worse mana.
            </p>
          </div>
          <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
            <h4 className="font-medium text-white mb-2">Respect the Combo</h4>
            <p className="text-sm text-white/50 leading-relaxed">
              Even if you're not the combo deck, hate-draft key pieces. Don't let someone assemble Tinker + Blightsteel uncontested.
            </p>
          </div>
          <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
            <h4 className="font-medium text-white mb-2">Speed Kills</h4>
            <p className="text-sm text-white/50 leading-relaxed">
              Fast mana is the great equalizer. A turn 1 Sol Ring or Mana Crypt puts you ahead of any "fair" deck.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
