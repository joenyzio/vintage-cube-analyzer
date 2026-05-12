import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData, getWheelLikelihood } from '../../services/eloHelpers';
import { ChevronLeft, Shuffle, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

const PACK_SIZE = 9; // Show 9 cards, pick which will wheel

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function WheelPredictionGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [pack, setPack] = useState<CubeCard[]>([]);
  const [wheelCards, setWheelCards] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const cardsWithElo = useMemo(() => {
    return cards.filter(c => getEloData(c.name));
  }, [cards]);

  const generatePack = useCallback(() => {
    const shuffled = shuffleArray(cardsWithElo);

    // Create a pack with a mix of wheel and non-wheel cards
    // Sort by ELO to ensure variety
    const sorted = [...shuffled].sort((a, b) => {
      const eloA = getEloData(a.name)?.elo || 0;
      const eloB = getEloData(b.name)?.elo || 0;
      return eloB - eloA;
    });

    // Take some from top (won't wheel), some from bottom (will wheel)
    const topCards = sorted.slice(0, 100);
    const bottomCards = sorted.slice(-100);

    const packTop = shuffleArray(topCards).slice(0, 5); // 5 good cards
    const packBottom = shuffleArray(bottomCards).slice(0, 4); // 4 wheelers
    const newPack = shuffleArray([...packTop, ...packBottom]);

    // Determine which cards actually wheel (bottom ~40% ELO in pack)
    const packSorted = [...newPack].sort((a, b) => {
      const eloA = getEloData(a.name)?.elo || 0;
      const eloB = getEloData(b.name)?.elo || 0;
      return eloA - eloB;
    });

    const wheelSet = new Set<string>();
    // Bottom 3-4 cards by ELO will wheel
    const wheelCount = 3 + Math.floor(Math.random() * 2);
    packSorted.slice(0, wheelCount).forEach(c => wheelSet.add(c.name));

    setPack(newPack);
    setWheelCards(wheelSet);
    setSelected(new Set());
    setRevealed(false);
  }, [cardsWithElo]);

  useEffect(() => {
    if (cardsWithElo.length > 0 && pack.length === 0) {
      generatePack();
    }
  }, [cardsWithElo, pack.length, generatePack]);

  const toggleCard = useCallback((cardName: string) => {
    if (revealed) return;

    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cardName)) {
        next.delete(cardName);
      } else {
        next.add(cardName);
      }
      return next;
    });
  }, [revealed]);

  const handleSubmit = useCallback(() => {
    if (revealed) return;

    setRevealed(true);

    // Score: how many did they get right?
    let correct = 0;
    let total = pack.length;

    pack.forEach(card => {
      const isWheel = wheelCards.has(card.name);
      const guessedWheel = selected.has(card.name);
      if (isWheel === guessedWheel) {
        correct++;
      }
    });

    const accuracy = correct / total;
    if (accuracy >= 0.8) {
      setScore(s => s + 1);
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
    } else {
      setStreak(0);
    }
  }, [revealed, pack, wheelCards, selected, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    generatePack();
  }, [generatePack]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed) {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          const idx = num - 1;
          if (pack[idx]) {
            e.preventDefault();
            toggleCard(pack[idx].name);
          }
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSubmit();
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
  }, [revealed, toggleCard, handleSubmit, handleNext, pack]);

  if (pack.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Loading pack...</div>
      </div>
    );
  }

  // Calculate score
  let correct = 0;
  pack.forEach(card => {
    const isWheel = wheelCards.has(card.name);
    const guessedWheel = selected.has(card.name);
    if (isWheel === guessedWheel) correct++;
  });
  const accuracy = Math.round((correct / pack.length) * 100);

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
        {/* Instructions */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-medium">Which cards will wheel?</span>
          </div>
          <p className="text-sm text-white/50">
            Click cards you think will table (come back around)
          </p>
        </div>

        {/* Pack Grid - 3x3 */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-xl">
          {pack.map((card, idx) => {
            const isSelected = selected.has(card.name);
            const isWheel = wheelCards.has(card.name);
            const elo = getEloData(card.name)?.elo || 0;

            let borderClass = 'border-transparent';
            let overlayClass = '';

            if (!revealed) {
              if (isSelected) {
                borderClass = 'border-cyan-500 ring-2 ring-cyan-500/30';
                overlayClass = 'bg-cyan-500/20';
              } else {
                borderClass = 'border-white/10 hover:border-white/30';
              }
            } else {
              if (isWheel && isSelected) {
                // Correct: guessed wheel and it wheels
                borderClass = 'border-green-500 ring-2 ring-green-500/30';
              } else if (!isWheel && !isSelected) {
                // Correct: didn't guess wheel and it doesn't
                borderClass = 'border-green-500/50';
              } else if (isWheel && !isSelected) {
                // Wrong: wheels but didn't guess
                borderClass = 'border-yellow-500 ring-2 ring-yellow-500/30';
              } else {
                // Wrong: guessed wheel but doesn't
                borderClass = 'border-red-500 ring-2 ring-red-500/30';
              }
            }

            return (
              <button
                key={card.name}
                onClick={() => toggleCard(card.name)}
                disabled={revealed}
                className={`relative rounded-lg border-2 overflow-hidden transition-all ${borderClass}`}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full aspect-[5/7] object-cover"
                />
                {!revealed && (
                  <div className={`absolute inset-0 ${overlayClass} transition-colors`} />
                )}
                {!revealed && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] text-white/70 font-mono">
                    {idx + 1}
                  </div>
                )}
                {!revealed && isSelected && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-white" />
                  </div>
                )}
                {revealed && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-center">
                    <span className={`text-xs font-mono ${isWheel ? 'text-cyan-400' : 'text-white/50'}`}>
                      {elo} {isWheel ? '(wheels)' : ''}
                    </span>
                  </div>
                )}
                {revealed && isWheel && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Submit / Result */}
        {!revealed && (
          <div className="w-full max-w-md space-y-2">
            <div className="text-center text-sm text-white/40">
              {selected.size} cards selected to wheel
            </div>
            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-400 font-medium transition-all"
            >
              Lock In <span className="text-cyan-400/50 text-sm ml-2">Enter</span>
            </button>
          </div>
        )}

        {revealed && (
          <div className="w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl ${
              accuracy >= 80 ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {accuracy >= 80 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-orange-400" />
                )}
                <span className={`font-medium ${accuracy >= 80 ? 'text-green-400' : 'text-orange-400'}`}>
                  {accuracy}% Accuracy ({correct}/{pack.length})
                </span>
              </div>
              <p className="text-sm text-white/50 text-center">
                {wheelCards.size} cards actually wheeled
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all"
            >
              Next Pack <span className="text-white/40 text-sm ml-2">Enter</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex-shrink-0 h-1 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-white/40 to-white/60 transition-all duration-300"
          style={{ width: `${Math.min(100, (round / 15) * 100)}%` }}
        />
      </div>
    </div>
  );
}
