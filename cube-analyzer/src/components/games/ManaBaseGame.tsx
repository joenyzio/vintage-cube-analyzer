import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { ChevronLeft, Shuffle, Droplets, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface DeckScenario {
  spells: CubeCard[];
  colorCounts: Record<string, number>; // W: 8, U: 12, etc
  question: string;
  options: { label: string; sources: Record<string, number> }[];
  correctIdx: number;
  explanation: string;
}

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

const COLOR_STYLES: Record<string, string> = {
  W: 'bg-amber-100 text-amber-900',
  U: 'bg-blue-500 text-white',
  B: 'bg-gray-800 text-white',
  R: 'bg-red-500 text-white',
  G: 'bg-green-600 text-white',
};

function getColorPips(card: CubeCard): Record<string, number> {
  const cost = card.mana_cost || '';
  const pips: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  const matches = cost.match(/\{([WUBRG])\}/g) || [];
  matches.forEach(m => {
    const color = m.replace(/[{}]/g, '');
    if (pips[color] !== undefined) {
      pips[color]++;
    }
  });

  return pips;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function ManaBaseGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [scenario, setScenario] = useState<DeckScenario | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Get all nonland cards
  const nonlandCards = useMemo(() => {
    return cards.filter(c =>
      !c.type_line?.includes('Land') &&
      c.mana_cost &&
      c.mana_cost.length > 0
    );
  }, [cards]);

  const generateScenario = useCallback(() => {
    if (nonlandCards.length < 10) return;

    // Pick a two-color combination
    const colorPairs = [
      ['W', 'U'], ['U', 'B'], ['B', 'R'], ['R', 'G'], ['G', 'W'],
      ['W', 'B'], ['U', 'R'], ['B', 'G'], ['R', 'W'], ['G', 'U']
    ];
    const [color1, color2] = colorPairs[Math.floor(Math.random() * colorPairs.length)];

    // Find cards in these colors
    const coloredCards = nonlandCards.filter(c => {
      const colors = c.colors || [];
      return colors.some(col => col === color1 || col === color2) &&
             !colors.some(col => col !== color1 && col !== color2);
    });

    if (coloredCards.length < 8) {
      generateScenario();
      return;
    }

    // Pick 8 spells
    const selectedSpells = shuffleArray(coloredCards).slice(0, 8);

    // Count pips
    const pipCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    selectedSpells.forEach(card => {
      const pips = getColorPips(card);
      Object.keys(pips).forEach(c => {
        pipCounts[c] += pips[c];
      });
    });

    const c1Pips = pipCounts[color1];
    const c2Pips = pipCounts[color2];
    const totalPips = c1Pips + c2Pips;

    // Calculate ideal split (assuming 17 lands)
    const totalLands = 17;
    const c1Ideal = Math.round((c1Pips / totalPips) * totalLands);
    const c2Ideal = totalLands - c1Ideal;

    // Generate options
    const options = [
      { label: `${c1Ideal} ${COLOR_NAMES[color1]}, ${c2Ideal} ${COLOR_NAMES[color2]}`, sources: { [color1]: c1Ideal, [color2]: c2Ideal } },
      { label: `${c1Ideal + 3} ${COLOR_NAMES[color1]}, ${c2Ideal - 3} ${COLOR_NAMES[color2]}`, sources: { [color1]: c1Ideal + 3, [color2]: c2Ideal - 3 } },
      { label: `${c1Ideal - 3} ${COLOR_NAMES[color1]}, ${c2Ideal + 3} ${COLOR_NAMES[color2]}`, sources: { [color1]: c1Ideal - 3, [color2]: c2Ideal + 3 } },
      { label: `${Math.round(totalLands / 2)} each`, sources: { [color1]: Math.round(totalLands / 2), [color2]: Math.round(totalLands / 2) } },
    ];

    // Shuffle options but track correct one
    const correctOption = options[0];
    const shuffledOptions = shuffleArray(options);
    const correctIdx = shuffledOptions.findIndex(o => o.label === correctOption.label);

    setScenario({
      spells: selectedSpells,
      colorCounts: { [color1]: c1Pips, [color2]: c2Pips },
      question: `With ${c1Pips} ${COLOR_NAMES[color1]} pips and ${c2Pips} ${COLOR_NAMES[color2]} pips, how should you split 17 lands?`,
      options: shuffledOptions,
      correctIdx,
      explanation: `${c1Pips} ${COLOR_NAMES[color1]} pips vs ${c2Pips} ${COLOR_NAMES[color2]} pips = ~${Math.round((c1Pips / totalPips) * 100)}% to ${Math.round((c2Pips / totalPips) * 100)}% ratio`
    });
    setSelected(null);
    setRevealed(false);
  }, [nonlandCards]);

  useEffect(() => {
    if (nonlandCards.length > 0 && !scenario) {
      generateScenario();
    }
  }, [nonlandCards, scenario, generateScenario]);

  const handlePick = useCallback((idx: number) => {
    if (revealed || !scenario) return;

    setSelected(idx);
    setRevealed(true);

    const isCorrect = idx === scenario.correctIdx;

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
  }, [revealed, scenario, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    generateScenario();
  }, [generateScenario]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed && scenario) {
        const keyMap: Record<string, number> = { 'q': 0, 'w': 1, 'e': 2, 'r': 3 };
        const idx = keyMap[e.key.toLowerCase()];
        if (idx !== undefined && scenario.options[idx]) {
          e.preventDefault();
          handlePick(idx);
        }
      } else if (revealed) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, handlePick, handleNext, scenario]);

  if (!scenario) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Building deck...</div>
      </div>
    );
  }

  const isCorrect = selected === scenario.correctIdx;

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
          >
            <Shuffle className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-4 overflow-auto">
        {/* Title */}
        <div className="flex items-center gap-2 text-white/50">
          <Droplets className="w-5 h-5 text-blue-400" />
          <span>Build the mana base</span>
        </div>

        {/* Pip counts */}
        <div className="flex gap-4">
          {Object.entries(scenario.colorCounts).filter(([_, count]) => count > 0).map(([color, count]) => (
            <div key={color} className={`px-4 py-2 rounded-lg ${COLOR_STYLES[color]}`}>
              <span className="font-bold">{count}</span> {COLOR_NAMES[color]} pips
            </div>
          ))}
        </div>

        {/* Spells Grid */}
        <div className="grid grid-cols-4 gap-2 w-full max-w-lg">
          {scenario.spells.map(card => (
            <div key={card.name} className="relative">
              <img
                src={getCardImage(card)}
                alt={card.name}
                className="w-full rounded-lg"
              />
            </div>
          ))}
        </div>

        {/* Question */}
        <p className="text-sm text-white/60 text-center max-w-md">
          {scenario.question}
        </p>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {scenario.options.map((option, idx) => {
            const keys = ['Q', 'W', 'E', 'R'];
            const isThis = selected === idx;
            const isCorrectOption = idx === scenario.correctIdx;

            let btnClass = 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.1]';
            if (revealed) {
              if (isCorrectOption) {
                btnClass = 'bg-green-500/20 border-green-500/40';
              } else if (isThis) {
                btnClass = 'bg-red-500/20 border-red-500/40';
              } else {
                btnClass = 'bg-white/[0.02] border-white/[0.04] opacity-50';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handlePick(idx)}
                disabled={revealed}
                className={`py-4 px-4 rounded-xl border text-center transition-all ${btnClass}`}
              >
                <div className="text-sm font-medium text-white">{option.label}</div>
                {!revealed && (
                  <div className="text-xs text-white/30 mt-1 font-mono">{keys[idx]}</div>
                )}
                {revealed && isCorrectOption && (
                  <div className="flex justify-center mt-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Result */}
        {revealed && (
          <div className="w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl ${
              isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? 'Correct!' : 'Wrong'}
                </span>
              </div>
              <p className="text-sm text-white/60 text-center">{scenario.explanation}</p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all"
            >
              Next <span className="text-white/40 text-sm ml-2">Enter</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex-shrink-0 h-1 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-white/40 to-white/60 transition-all duration-300"
          style={{ width: `${Math.min(100, (round / 20) * 100)}%` }}
        />
      </div>
    </div>
  );
}
