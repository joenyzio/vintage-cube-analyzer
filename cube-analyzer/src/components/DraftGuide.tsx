import { useState, useMemo } from 'react';
import type { DraftStrategy } from '../types/card';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Search, ChevronDown, ChevronUp, Target, Eye, XCircle, Sparkles } from 'lucide-react';

interface DraftGuideProps {
  strategies: DraftStrategy[];
}

const GENERAL_TIPS = [
  {
    title: 'Pack 1: Stay Open',
    tip: 'Take the most powerful card regardless of color. Power 9, Sol Ring, and Mana Crypt go in every deck.',
    phase: 1,
  },
  {
    title: 'Pack 2: Find Your Lane',
    tip: 'By now you should know what\'s open. Commit to 2 colors or a specific strategy. Grab key lands.',
    phase: 2,
  },
  {
    title: 'Pack 3: Fill Gaps',
    tip: 'Complete your curve, grab removal, shore up weaknesses. Don\'t get distracted by off-color bombs.',
    phase: 3,
  },
  {
    title: 'Mana Base Matters',
    tip: 'Fetch lands are premium picks. Good mana beats better cards with worse mana.',
    phase: 0,
  },
  {
    title: 'Respect the Combo',
    tip: 'Even if you\'re not combo, hate-draft key pieces. Don\'t let someone assemble Tinker + Blightsteel.',
    phase: 0,
  },
  {
    title: 'Speed Kills',
    tip: 'Fast mana is the great equalizer. Turn 1 Sol Ring puts you ahead of any "fair" deck.',
    phase: 0,
  },
];

const DIFFICULTY_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  'Stay Open Pack 1': { label: 'Beginner', variant: 'success' },
  'Force Blue': { label: 'Intermediate', variant: 'warning' },
  'Combo Draft': { label: 'Advanced', variant: 'danger' },
  'Lands Matter': { label: 'Expert', variant: 'info' },
};

export function DraftGuide({ strategies }: DraftGuideProps) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(0);
  const [showTips, setShowTips] = useState(true);

  const filteredStrategies = useMemo(() => {
    if (!search) return strategies;
    const lower = search.toLowerCase();
    return strategies.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower) ||
      s.firstPickPriority.some(c => c.toLowerCase().includes(lower)) ||
      s.colorPreferences.some(c => c.toLowerCase().includes(lower))
    );
  }, [strategies, search]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search strategies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Toggle Tips */}
        <button
          onClick={() => setShowTips(!showTips)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
            ${showTips ? 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20' : 'bg-white/5 text-white/40'}
          `}
        >
          <Sparkles className="w-4 h-4" />
          Tips
        </button>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-white/40">
          <span>{strategies.length} strategies</span>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-white/30">
        {filteredStrategies.length} strateg{filteredStrategies.length !== 1 ? 'ies' : 'y'}
      </div>

      {/* General Tips Row */}
      {showTips && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {GENERAL_TIPS.map((tip, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#111] border border-white/8 rounded-lg"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {tip.phase > 0 && (
                  <span className="text-[10px] font-mono text-amber-400/60">P{tip.phase}</span>
                )}
                <h4 className="text-xs font-medium text-white truncate">{tip.title}</h4>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed line-clamp-3">{tip.tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strategies */}
      <div className="space-y-2">
        {filteredStrategies.map((strategy, idx) => {
          const isExpanded = expandedId === idx;
          const difficulty = DIFFICULTY_MAP[strategy.name];

          return (
            <Card
              key={idx}
              className={`bg-[#111] border-white/8 overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-white/20' : ''}`}
            >
              {/* Header Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : idx)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/2 transition-colors"
              >
                {/* Color Indicators */}
                <div className="flex gap-0.5">
                  {strategy.colorPreferences.slice(0, 3).map((pref, i) => {
                    const colors = pref.split('').filter(c => 'WUBRG'.includes(c));
                    if (colors.length === 0) return null;
                    return (
                      <div key={i} className="flex gap-0.5">
                        {colors.map(c => (
                          <div
                            key={c}
                            className={`w-4 h-4 rounded-full
                              ${c === 'W' ? 'bg-amber-100' : ''}
                              ${c === 'U' ? 'bg-blue-500' : ''}
                              ${c === 'B' ? 'bg-neutral-500' : ''}
                              ${c === 'R' ? 'bg-red-500' : ''}
                              ${c === 'G' ? 'bg-green-500' : ''}
                            `}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{strategy.name}</h3>
                    {difficulty && (
                      <Badge variant={difficulty.variant} className="text-[10px]">
                        {difficulty.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/40 truncate">{strategy.description}</p>
                </div>

                {/* First Picks Count */}
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-mono text-white/60">{strategy.firstPickPriority.length}</div>
                  <div className="text-[10px] text-white/30">priorities</div>
                </div>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-white/5">
                  <div className="pt-4 grid md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Description */}
                      <div>
                        <p className="text-sm text-white/60 leading-relaxed">{strategy.description}</p>
                      </div>

                      {/* First Pick Priority */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-red-400" />
                          <span className="text-xs font-medium text-red-400 uppercase tracking-wide">First Pick Priority</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {strategy.firstPickPriority.map((card) => (
                            <span
                              key={card}
                              className="text-xs px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300"
                            >
                              {card}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Avoid */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-4 h-4 text-amber-400/60" />
                          <span className="text-xs font-medium text-amber-400/60 uppercase tracking-wide">Avoid</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {strategy.avoidCards.map((card) => (
                            <span
                              key={card}
                              className="text-xs px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300/80"
                            >
                              {card}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Signal Cards */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">Read the Signals</span>
                        </div>
                        <ul className="space-y-1.5">
                          {strategy.signalCards.map((signal, i) => (
                            <li key={i} className="text-sm text-white/50 flex items-start gap-2">
                              <span className="text-blue-400/50 mt-0.5">→</span>
                              {signal}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Color Preferences */}
                      <div>
                        <div className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">Color Preferences</div>
                        <div className="flex flex-wrap gap-1.5">
                          {strategy.colorPreferences.map((pref) => (
                            <Badge key={pref} variant="info" className="text-xs">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-white/5 text-xs text-white/30">
                    {difficulty?.label || 'Standard'} difficulty • {strategy.colorPreferences.length} color preferences
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredStrategies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40">No strategies match your search</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-sm text-white/60 hover:text-white"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
