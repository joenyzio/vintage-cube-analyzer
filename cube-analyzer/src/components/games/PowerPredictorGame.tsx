import { useState, useEffect, useCallback } from 'react';
import type { CubeCard } from '../../types/card';
import { getEloData, getPercentile } from '../../services/eloHelpers';
import { getCardImage } from '../../services/scryfall';
import { ChevronLeft, Shuffle, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface MechanicData {
  name: string;
  category: string;
  avgPercentile: number;
  count: number;
  exampleCards: { name: string; imageUrl: string }[];
  delta: number;
}

// Text patterns to search in oracle text
const TEXT_PATTERNS: { name: string; pattern: RegExp; category: string }[] = [
  // Card advantage
  { name: 'Draw cards', pattern: /draw (a |one |two |three |\d+ )?cards?/i, category: 'Card Advantage' },
  { name: 'Cantrip', pattern: /draw a card\./i, category: 'Card Advantage' },
  { name: 'Tutor', pattern: /search your library/i, category: 'Card Advantage' },
  { name: 'Scry', pattern: /scry \d/i, category: 'Card Advantage' },
  { name: 'Surveil', pattern: /surveil \d/i, category: 'Card Advantage' },
  { name: 'Impulse draw', pattern: /exile the top.*you may (play|cast)/i, category: 'Card Advantage' },
  // Mana
  { name: 'Mana dork', pattern: /add \{[WUBRGC]\}/i, category: 'Mana' },
  { name: 'Mana rock', pattern: /\{T\}: Add/i, category: 'Mana' },
  { name: 'Cost reduction', pattern: /costs? \{\d\} less/i, category: 'Mana' },
  { name: 'Free spell', pattern: /without paying (its |their )?mana cost/i, category: 'Mana' },
  { name: 'Treasure', pattern: /treasure token/i, category: 'Mana' },
  // Removal
  { name: 'Destroy creature', pattern: /destroy target (creature|permanent)/i, category: 'Removal' },
  { name: 'Exile', pattern: /exile target/i, category: 'Removal' },
  { name: 'Damage-based', pattern: /deals? \d+ damage to (any target|target creature)/i, category: 'Removal' },
  { name: 'Board wipe', pattern: /destroy all (creatures|nonland permanents|permanents)/i, category: 'Removal' },
  { name: '-X/-X', pattern: /gets? -\d\/-\d/i, category: 'Removal' },
  { name: 'Bounce', pattern: /return target.*to (its owner's|their owner's) hand/i, category: 'Removal' },
  // Disruption
  { name: 'Counter spell', pattern: /counter target spell/i, category: 'Disruption' },
  { name: 'Counter unless', pattern: /counter.*unless/i, category: 'Disruption' },
  { name: 'Discard', pattern: /(target player|opponent) discards/i, category: 'Disruption' },
  // Protection
  { name: 'Hexproof', pattern: /hexproof/i, category: 'Protection' },
  { name: 'Indestructible', pattern: /indestructible/i, category: 'Protection' },
  { name: 'Protection from', pattern: /protection from/i, category: 'Protection' },
  { name: 'Ward', pattern: /ward \{/i, category: 'Protection' },
  { name: 'Can\'t be countered', pattern: /can't be countered/i, category: 'Protection' },
  // Recursion
  { name: 'Return from graveyard', pattern: /return.*from (your )?graveyard/i, category: 'Recursion' },
  { name: 'Reanimate', pattern: /put.*creature card.*onto the battlefield/i, category: 'Recursion' },
  { name: 'Flashback', pattern: /flashback/i, category: 'Recursion' },
  { name: 'Unearth', pattern: /unearth/i, category: 'Recursion' },
  { name: 'Escape', pattern: /escape—/i, category: 'Recursion' },
  { name: 'Dredge', pattern: /\bdredge \d/i, category: 'Recursion' },
  // Combat
  { name: 'Pump spell', pattern: /gets? \+\d\/\+\d/i, category: 'Combat' },
  { name: 'First strike', pattern: /first strike/i, category: 'Combat' },
  { name: 'Double strike', pattern: /double strike/i, category: 'Combat' },
  { name: 'Trample', pattern: /\btrample\b/i, category: 'Combat' },
  { name: 'Flying', pattern: /\bflying\b/i, category: 'Combat' },
  { name: 'Haste', pattern: /\bhaste\b/i, category: 'Combat' },
  { name: 'Vigilance', pattern: /\bvigilance\b/i, category: 'Combat' },
  { name: 'Lifelink', pattern: /\blifelink\b/i, category: 'Combat' },
  { name: 'Deathtouch', pattern: /\bdeathtouch\b/i, category: 'Combat' },
  { name: 'Menace', pattern: /\bmenace\b/i, category: 'Combat' },
  { name: 'Reach', pattern: /\breach\b/i, category: 'Combat' },
  { name: 'Prowess', pattern: /\bprowess\b/i, category: 'Combat' },
  // Tokens
  { name: 'Create token', pattern: /create.*token/i, category: 'Tokens' },
  { name: 'Token on ETB', pattern: /enters.*create.*token/i, category: 'Tokens' },
  // Enters Play
  { name: 'Enters the Battlefield', pattern: /when .* enters (the battlefield)?/i, category: 'Enters Play' },
  { name: 'Blink/Flicker', pattern: /exile.*return.*to the battlefield/i, category: 'Enters Play' },
  // Combo
  { name: 'Storm', pattern: /\bstorm\b/i, category: 'Combo' },
  { name: 'Copy spell', pattern: /copy (that |target )?spell/i, category: 'Combo' },
  { name: 'Untap', pattern: /untap (target|all|each)/i, category: 'Combo' },
  { name: 'Extra turn', pattern: /extra turn/i, category: 'Combo' },
  { name: 'Cascade', pattern: /\bcascade\b/i, category: 'Combo' },
  // Special mechanics
  { name: 'Initiative', pattern: /take the initiative|the initiative/i, category: 'Special' },
  { name: 'Monarch', pattern: /become the monarch|you're the monarch/i, category: 'Special' },
  { name: 'Annihilator', pattern: /annihilator \d/i, category: 'Special' },
  { name: 'Phyrexian mana', pattern: /\{[WUBRG]\/P\}/i, category: 'Special' },
  { name: 'Delve', pattern: /\bdelve\b/i, category: 'Special' },
  { name: 'Affinity', pattern: /\baffinity\b/i, category: 'Special' },
  { name: 'Convoke', pattern: /\bconvoke\b/i, category: 'Special' },
  { name: 'Channel', pattern: /\bchannel\b.*discard this card/i, category: 'Special' },
  { name: 'Ninjutsu', pattern: /\bninjutsu\b/i, category: 'Special' },
  { name: 'Evoke', pattern: /\bevoke\b/i, category: 'Special' },
  { name: 'Miracle', pattern: /\bmiracle\b/i, category: 'Special' },
  { name: 'Suspend', pattern: /\bsuspend \d/i, category: 'Special' },
  { name: 'Madness', pattern: /\bmadness\b/i, category: 'Special' },
  { name: 'Foretell', pattern: /\bforetell\b/i, category: 'Special' },
  { name: 'Companion', pattern: /\bcompanion\b/i, category: 'Special' },
  { name: 'Adventure', pattern: /\badventure\b/i, category: 'Special' },
  { name: 'Cycling', pattern: /\bcycling\b/i, category: 'Card Advantage' },
  { name: 'Landfall', pattern: /\blandfall\b/i, category: 'Special' },
  { name: 'Kicker', pattern: /\bkicker\b/i, category: 'Special' },
  { name: 'Undying', pattern: /\bundying\b/i, category: 'Recursion' },
  { name: 'Persist', pattern: /\bpersist\b/i, category: 'Recursion' },
  { name: 'Blitz', pattern: /\bblitz\b/i, category: 'Special' },
  { name: 'Connive', pattern: /\bconnive\b/i, category: 'Card Advantage' },
  { name: 'Exploit', pattern: /\bexploit\b/i, category: 'Special' },
  { name: 'Crew', pattern: /\bcrew \d/i, category: 'Special' },
  { name: 'Embalm', pattern: /\bembalm\b/i, category: 'Recursion' },
  { name: 'Eternalize', pattern: /\beternalize\b/i, category: 'Recursion' },
  { name: 'Retrace', pattern: /\bretrace\b/i, category: 'Recursion' },
  { name: 'Jump-start', pattern: /\bjump-start\b/i, category: 'Recursion' },
  { name: 'Overload', pattern: /\boverload\b/i, category: 'Special' },
  { name: 'Spectacle', pattern: /\bspectacle\b/i, category: 'Special' },
  { name: 'Dash', pattern: /\bdash\b/i, category: 'Combat' },
  { name: 'Modular', pattern: /\bmodular\b/i, category: 'Special' },
  { name: 'Fabricate', pattern: /\bfabricate\b/i, category: 'Tokens' },
  { name: 'Riot', pattern: /\briot\b/i, category: 'Combat' },
  // Planeswalker
  { name: 'PW +ability', pattern: /\+\d+:/i, category: 'Planeswalker' },
  { name: 'PW -ability', pattern: /-\d+:/i, category: 'Planeswalker' },
  { name: 'PW ultimate', pattern: /-[6-9]\d*:|−1[0-9]:/i, category: 'Planeswalker' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Mana': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Card Advantage': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Removal': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Disruption': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Combat': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Protection': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Recursion': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Combo': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Enters Play': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'Tokens': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Special': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Planeswalker': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'Keyword': 'bg-white/10 text-white/70 border-white/20',
};

export function PowerPredictorGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentMechanic, setCurrentMechanic] = useState<MechanicData | null>(null);
  const [allMechanics, setAllMechanics] = useState<MechanicData[]>([]);
  const [baselinePercentile, setBaselinePercentile] = useState(50);
  const [selected, setSelected] = useState<'above' | 'average' | 'below' | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Analyze mechanics on mount
  useEffect(() => {
    let total = 0;
    let count = 0;
    cards.forEach(card => {
      const percentile = getPercentile(card.name);
      if (percentile > 0) {
        total += percentile;
        count++;
      }
    });
    const baseline = count > 0 ? total / count : 50;
    setBaselinePercentile(baseline);

    const stats: Record<string, { cards: CubeCard[]; totalPercentile: number; category: string }> = {};

    cards.forEach(card => {
      const text = card.oracle_text || '';
      const percentile = getPercentile(card.name);
      if (percentile === 0) return;

      (card.keywords || []).forEach(keyword => {
        if (!stats[keyword]) {
          stats[keyword] = { cards: [], totalPercentile: 0, category: 'Keyword' };
        }
        stats[keyword].cards.push(card);
        stats[keyword].totalPercentile += percentile;
      });

      TEXT_PATTERNS.forEach(({ name, pattern, category }) => {
        if (pattern.test(text)) {
          if (!stats[name]) {
            stats[name] = { cards: [], totalPercentile: 0, category };
          }
          if (!stats[name].cards.find(c => c.name === card.name)) {
            stats[name].cards.push(card);
            stats[name].totalPercentile += percentile;
          }
        }
      });
    });

    const mechanics: MechanicData[] = Object.entries(stats)
      .filter(([_, data]) => data.cards.length >= 6) // Need enough cards for 3x3 grid
      .map(([name, data]) => {
        const avgPercentile = data.totalPercentile / data.cards.length;
        const topCards = data.cards
          .map(c => ({ name: c.name, elo: getEloData(c.name)?.elo || 0 }))
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 9);

        return {
          name,
          category: data.category,
          avgPercentile: Math.round(avgPercentile),
          count: data.cards.length,
          exampleCards: topCards.map(c => ({
            name: c.name,
            imageUrl: getCardImage(cards.find(card => card.name === c.name)!)
          })),
          delta: Math.round(avgPercentile - baseline),
        };
      })
      .filter(m => Math.abs(m.delta) >= 3);

    setAllMechanics(mechanics);
  }, [cards]);

  const newRound = useCallback(() => {
    if (allMechanics.length === 0) return;
    const randomMechanic = allMechanics[Math.floor(Math.random() * allMechanics.length)];
    setCurrentMechanic(randomMechanic);
    setSelected(null);
    setRevealed(false);
  }, [allMechanics]);

  useEffect(() => {
    if (allMechanics.length > 0 && !currentMechanic) {
      newRound();
    }
  }, [allMechanics, currentMechanic, newRound]);

  const handleGuess = useCallback((guess: 'above' | 'average' | 'below') => {
    if (revealed || !currentMechanic) return;

    setSelected(guess);
    setRevealed(true);

    let correct: 'above' | 'average' | 'below';
    if (currentMechanic.delta >= 5) {
      correct = 'above';
    } else if (currentMechanic.delta <= -5) {
      correct = 'below';
    } else {
      correct = 'average';
    }

    const isCorrect = guess === correct;

    if (isCorrect) {
      setScore(s => s + 1);
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
    } else {
      setStreak(0);
    }
  }, [revealed, currentMechanic, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    newRound();
  }, [newRound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed) {
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleGuess('above');
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleGuess('average');
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleGuess('below');
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, handleGuess, handleNext]);

  if (!currentMechanic) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Loading mechanics data...</div>
      </div>
    );
  }

  const correctAnswer = currentMechanic.delta >= 5 ? 'above' : currentMechanic.delta <= -5 ? 'below' : 'average';
  const isCorrect = selected === correctAnswer;
  const categoryColor = CATEGORY_COLORS[currentMechanic.category] || CATEGORY_COLORS['Keyword'];

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">Round {round}</span>
          <div className="text-sm font-bold text-white">{score}/{round - (revealed ? 0 : 1)}</div>
          {streak > 1 && (
            <span className="text-xs text-amber-400 font-medium">{streak} streak</span>
          )}
        </div>

        {onShuffle && (
          <button
            onClick={onShuffle}
            className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
            title="Random game (P)"
          >
            <Shuffle className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-4 overflow-auto">
        {/* Mechanic Badge */}
        <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full border ${categoryColor}`}>
          <span className="text-sm uppercase tracking-wider opacity-70">{currentMechanic.category}</span>
          <span className="text-base font-semibold">{currentMechanic.name}</span>
          <span className="text-sm opacity-50">×{currentMechanic.count}</span>
        </div>

        {/* Cards Grid - 3x2 */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-2xl px-4">
          {currentMechanic.exampleCards.slice(0, 6).map((card, i) => (
            <img
              key={i}
              src={card.imageUrl}
              alt={card.name}
              className="w-full aspect-[5/7] rounded-xl object-cover shadow-xl"
              title={card.name}
            />
          ))}
        </div>

        {/* Question */}
        {!revealed && (
          <p className="text-white/50 text-base text-center">
            Is <span className="text-white font-medium">{currentMechanic.name}</span> above, average, or below the {Math.round(baselinePercentile)}% baseline?
          </p>
        )}

        {/* Options */}
        {!revealed && (
          <div className="flex gap-4 w-full max-w-lg px-4">
            {[
              { key: 'above', label: 'Above', icon: TrendingUp, color: 'text-green-400', hint: 'A' },
              { key: 'average', label: 'Average', icon: Minus, color: 'text-yellow-400', hint: 'S' },
              { key: 'below', label: 'Below', icon: TrendingDown, color: 'text-red-400', hint: 'D' },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  onClick={() => handleGuess(option.key as 'above' | 'average' | 'below')}
                  className="flex-1 flex flex-col items-center gap-2 py-4 px-4 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] transition-all active:scale-95"
                >
                  <Icon className={`w-6 h-6 ${option.color}`} />
                  <span className="text-base font-medium text-white">{option.label}</span>
                  <span className="text-xs text-white/30 font-mono">{option.hint}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Result */}
        {revealed && (
          <div className="w-full max-w-lg px-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`flex items-center justify-center gap-3 py-4 px-6 rounded-xl ${
              isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div className="text-center">
                <span className={`text-lg font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? 'Correct!' : 'Wrong'}
                </span>
                <span className="text-white/50 mx-2">·</span>
                <span className={`text-lg font-mono font-bold ${
                  currentMechanic.delta >= 5 ? 'text-green-400' :
                  currentMechanic.delta <= -5 ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {currentMechanic.delta > 0 ? '+' : ''}{currentMechanic.delta}%
                </span>
                <span className="text-white/40 ml-1">vs baseline</span>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-lg font-medium transition-all"
            >
              Next <span className="text-white/40 text-base ml-2">Enter</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 h-1 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-white/40 to-white/60 transition-all duration-300"
          style={{ width: `${Math.min(100, (round / 20) * 100)}%` }}
        />
      </div>
    </div>
  );
}
