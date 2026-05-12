import { useState, useEffect, useCallback, useRef } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { ChevronLeft, Shuffle, Zap, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

const PACK_SIZE = 15;
const TIME_PER_PICK = 8; // seconds

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function SpeedDraftGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [pack, setPack] = useState<CubeCard[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_PICK);
  const [selected, setSelected] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [bestCard, setBestCard] = useState<CubeCard | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generatePack = useCallback(() => {
    const withElo = cards.filter(c => getEloData(c.name));
    const shuffled = shuffleArray(withElo);
    const newPack = shuffled.slice(0, PACK_SIZE);

    // Find the best card by ELO
    const sorted = [...newPack].sort((a, b) => {
      const eloA = getEloData(a.name)?.elo || 0;
      const eloB = getEloData(b.name)?.elo || 0;
      return eloB - eloA;
    });

    setPack(newPack);
    setBestCard(sorted[0]);
    setSelected(null);
    setRevealed(false);
    setTimedOut(false);
    setTimeLeft(TIME_PER_PICK);
  }, [cards]);

  useEffect(() => {
    if (cards.length > 0 && pack.length === 0) {
      generatePack();
    }
  }, [cards, pack.length, generatePack]);

  // Timer
  useEffect(() => {
    if (revealed || pack.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time's up!
          clearInterval(timerRef.current!);
          setTimedOut(true);
          setRevealed(true);
          setStreak(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, pack.length, round]);

  const handlePick = useCallback((card: CubeCard) => {
    if (revealed) return;

    if (timerRef.current) clearInterval(timerRef.current);

    setSelected(card);
    setRevealed(true);

    const isCorrect = card.name === bestCard?.name;

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
  }, [revealed, bestCard, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    generatePack();
  }, [generatePack]);

  // Keyboard: 1-9, 0 for 10, etc.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed) {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 0) {
          const idx = num === 0 ? 9 : num - 1;
          if (pack[idx]) {
            e.preventDefault();
            handlePick(pack[idx]);
          }
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
  }, [revealed, handlePick, handleNext, pack]);

  if (pack.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Loading pack...</div>
      </div>
    );
  }

  const isCorrect = selected?.name === bestCard?.name;
  const timerPercent = (timeLeft / TIME_PER_PICK) * 100;
  const timerColor = timeLeft <= 3 ? 'bg-red-500' : timeLeft <= 5 ? 'bg-yellow-500' : 'bg-green-500';

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
          <div className="flex items-center gap-1 text-white/40">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Pack {round}</span>
          </div>
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

      {/* Timer Bar */}
      {!revealed && (
        <div className="flex-shrink-0 h-2 bg-white/[0.06]">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Timer Display */}
      {!revealed && (
        <div className="flex justify-center py-2">
          <div className={`flex items-center gap-2 px-4 py-1 rounded-full ${
            timeLeft <= 3 ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.06] text-white/60'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{timeLeft}s</span>
          </div>
        </div>
      )}

      {/* Pack Grid */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 overflow-auto">
        <div className="grid grid-cols-5 gap-2 w-full max-w-4xl">
          {pack.map((card, idx) => {
            const isThis = selected?.name === card.name;
            const isBest = card.name === bestCard?.name;

            let borderClass = 'border-transparent hover:border-white/30';
            if (revealed) {
              if (isBest) {
                borderClass = 'border-green-500 ring-2 ring-green-500/30';
              } else if (isThis) {
                borderClass = 'border-red-500 ring-2 ring-red-500/30';
              } else {
                borderClass = 'border-transparent opacity-40';
              }
            }

            return (
              <button
                key={card.name}
                onClick={() => handlePick(card)}
                disabled={revealed}
                className={`relative rounded-lg border-2 overflow-hidden transition-all active:scale-95 ${borderClass}`}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full aspect-[5/7] object-cover"
                />
                {!revealed && idx < 10 && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded bg-black/70 flex items-center justify-center text-[10px] text-white/70 font-mono">
                    {idx + 1 === 10 ? '0' : idx + 1}
                  </div>
                )}
                {revealed && isBest && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
                {revealed && isThis && !isBest && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                {revealed && isBest && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-center">
                    <span className="text-xs text-green-400 font-mono">
                      {getEloData(card.name)?.elo || '?'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Result */}
        {revealed && (
          <div className="mt-4 w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl ${
              timedOut ? 'bg-orange-500/10 border border-orange-500/20' :
              isCorrect ? 'bg-green-500/10 border border-green-500/20' :
              'bg-red-500/10 border border-red-500/20'
            }`}>
              {timedOut ? (
                <>
                  <Clock className="w-5 h-5 text-orange-400" />
                  <span className="text-orange-400 font-medium">Time's up!</span>
                </>
              ) : isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">
                    {bestCard?.name} was the pick ({getEloData(bestCard?.name || '')?.elo})
                  </span>
                </>
              )}
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
