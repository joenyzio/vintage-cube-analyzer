/**
 * Sequence Game: "Pick Order"
 *
 * Cognitive loop: SEQUENCE
 * Show 3 cards, rank them best to worst by ELO.
 * Trains: Relative card evaluation, pick priority.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ListTree } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { shuffleArray } from './gameUtils';

interface SequenceGameProps {
  cards: CubeCard[];
  onBack: () => void;
}

interface RoundResult {
  cards: CubeCard[];
  correctOrder: number[];
  userOrder: number[];
  score: number;
  responseTimeMs: number;
}

const TOTAL_ROUNDS = 10;

export function SequenceGame({ cards, onBack }: SequenceGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [packCards, setPackCards] = useState<CubeCard[]>([]);
  const [userOrder, setUserOrder] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Session state
  const [results, setResults] = useState<RoundResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get cards with ELO data
  const cardsWithElo = cards.filter(c => getEloData(c.name));

  // Generate a new round
  const newRound = useCallback(() => {
    if (cardsWithElo.length < 3) return;

    const selected = shuffleArray(cardsWithElo).slice(0, 3);
    setPackCards(selected);
    setUserOrder([]);
    setRevealed(false);
    setRoundStartTime(Date.now());
    setElapsedTime(0);
  }, [cardsWithElo]);

  // Start first round
  useEffect(() => {
    newRound();
  }, []);

  // Timer - informational only, no timeout
  useEffect(() => {
    if (revealed || gameOver || packCards.length === 0) return;

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - roundStartTime);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, gameOver, packCards, roundStartTime]);

  // Get correct order (indices sorted by ELO descending)
  const getCorrectOrder = useCallback(() => {
    return packCards
      .map((card, idx) => ({ idx, elo: getEloData(card.name)?.elo || 0 }))
      .sort((a, b) => b.elo - a.elo)
      .map(item => item.idx);
  }, [packCards]);

  // Handle picking a card
  const handlePick = useCallback((idx: number) => {
    if (revealed || userOrder.includes(idx)) return;

    const newOrder = [...userOrder, idx];
    setUserOrder(newOrder);

    // Auto-submit when all 3 picked
    if (newOrder.length === 3) {
      submitOrder(newOrder);
    }
  }, [revealed, userOrder]);

  // Submit the order
  const submitOrder = useCallback((order: number[]) => {
    if (revealed) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTime;
    const correctOrder = getCorrectOrder();

    // Calculate score
    // Perfect: 200 points
    // Top pick correct: 100 points
    // Each position correct: 50 points
    let roundScore = 0;
    let positionsCorrect = 0;

    for (let i = 0; i < 3; i++) {
      if (order[i] === correctOrder[i]) {
        positionsCorrect++;
        roundScore += 50;
      }
    }

    // Bonus for perfect
    if (positionsCorrect === 3) {
      roundScore += 50; // 200 total
    }

    // Bonus for getting first pick right
    if (order[0] === correctOrder[0]) {
      roundScore += 25;
    }

    // Speed bonus: up to 50 extra points for fast answers (under 5 seconds)
    if (responseTime < 5000) {
      roundScore += Math.round((1 - responseTime / 5000) * 50);
    }

    // Streak bonus
    const isPerfect = positionsCorrect === 3;
    const newStreak = isPerfect ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    roundScore += Math.min(50, streak * 10);

    setTotalScore(prev => prev + roundScore);
    setRevealed(true);

    // Record result
    setResults(prev => [...prev, {
      cards: packCards,
      correctOrder,
      userOrder: order,
      score: roundScore,
      responseTimeMs: responseTime,
    }]);
  }, [revealed, roundStartTime, getCorrectOrder, streak, bestStreak, packCards]);

  // Advance to next round
  const nextRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
    } else {
      setRound(r => r + 1);
      newRound();
    }
  }, [round, newRound]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      const key = e.key.toLowerCase();

      if (!revealed && packCards.length === 3) {
        // Q, W, E for left, middle, right card
        const keyMap: Record<string, number> = { q: 0, w: 1, e: 2 };
        if (key in keyMap) {
          e.preventDefault();
          handlePick(keyMap[key]);
        }
      } else if (revealed && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        nextRound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, packCards, handlePick, nextRound]);

  // Restart game
  const restart = () => {
    setRound(1);
    setResults([]);
    setStreak(0);
    setBestStreak(0);
    setTotalScore(0);
    setGameOver(false);
    newRound();
  };

  // Game over screen
  if (gameOver) {
    const perfectRounds = results.filter(r =>
      r.userOrder.every((v, i) => v === r.correctOrder[i])
    ).length;
    const firstPickCorrect = results.filter(r => r.userOrder[0] === r.correctOrder[0]).length;

    const getSummary = () => {
      if (perfectRounds >= 8) return "Exceptional sequencing. You see the pick order clearly.";
      if (perfectRounds >= 6) return "Strong pick order intuition. Keep drilling edge cases.";
      if (firstPickCorrect >= 7) return "You nail the first pick. Work on distinguishing 2nd from 3rd.";
      if (perfectRounds >= 4) return "Solid foundation. More reps will sharpen your ranking.";
      return "Building your intuition. Focus on the top picks first.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <ListTree className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Pick Order</p>
          </div>

          {/* Score */}
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-white">{totalScore}</div>
            <div className="text-white/40 text-sm mt-1">total score</div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{perfectRounds}/{TOTAL_ROUNDS}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Perfect</div>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{firstPickCorrect}/{TOTAL_ROUNDS}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">1st Pick ✓</div>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{bestStreak}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Best Streak</div>
            </div>
          </div>

          {/* Visual history */}
          <div className="mb-6">
            <div className="text-[11px] text-white/40 mb-2 uppercase tracking-wide">Round History</div>
            <div className="flex gap-1">
              {results.map((r, i) => {
                const isPerfect = r.userOrder.every((v, j) => v === r.correctOrder[j]);
                const firstCorrect = r.userOrder[0] === r.correctOrder[0];
                return (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded-sm ${
                      isPerfect ? 'bg-white/70' : firstCorrect ? 'bg-white/40' : 'bg-white/20'
                    }`}
                    title={`Round ${i + 1}: ${isPerfect ? 'Perfect!' : firstCorrect ? '1st correct' : 'Missed'}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="text-center text-white/50 text-sm mb-8 px-4">
            {getSummary()}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-4 bg-white/[0.06] border border-white/[0.08] text-white/70 rounded-xl font-medium hover:bg-white/[0.1] active:scale-[0.98] transition-all"
            >
              Back
            </button>
            <button
              onClick={restart}
              className="flex-1 py-4 bg-white text-black rounded-xl font-semibold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (packCards.length === 0) return null;

  const formatTime = (ms: number) => (ms / 1000).toFixed(1) + 's';
  const correctOrder = getCorrectOrder();

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Pick Order</div>
          <div className="text-white/40 text-xs">Round {round}/{TOTAL_ROUNDS}</div>
        </div>
        <div className="text-right min-w-[60px]">
          <div className="text-white font-bold">{totalScore}</div>
          {streak > 1 && (
            <div className="text-amber-400 text-xs">🔥 {streak}</div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center py-3 text-white/50 text-sm">
        {!revealed ? (
          userOrder.length === 0 ? 'Tap cards in order: Best → Worst' :
          userOrder.length === 1 ? 'Pick 2nd best' :
          'Pick 3rd (worst)'
        ) : 'Review the correct order'}
      </div>

      {/* User's picks display */}
      {!revealed && userOrder.length > 0 && (
        <div className="flex justify-center gap-2 pb-2">
          {userOrder.map((idx, pos) => (
            <div key={pos} className="text-center">
              <div className="text-xs text-white/30 mb-1">{pos + 1}{pos === 0 ? 'st' : pos === 1 ? 'nd' : 'rd'}</div>
              <div className="text-xs text-white/70 truncate max-w-[80px]">
                {packCards[idx].name.split(',')[0]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex gap-4 max-w-3xl">
          {packCards.map((card, idx) => {
            const elo = getEloData(card.name)?.elo || 0;
            const correctPos = correctOrder.indexOf(idx);
            const userPos = userOrder.indexOf(idx);
            const isPicked = userOrder.includes(idx);

            return (
              <div key={card.id} className="flex-1 text-center">
                <button
                  onClick={() => handlePick(idx)}
                  disabled={revealed || isPicked}
                  className={`relative rounded-xl overflow-hidden transition-all ${
                    revealed
                      ? correctPos === 0
                        ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(74,222,128,0.3)]'
                        : 'opacity-70'
                      : isPicked
                        ? 'opacity-40 scale-95'
                        : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                  }`}
                >
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-full"
                  />
                  {/* Position badge when picked */}
                  {!revealed && isPicked && (
                    <div className="absolute top-2 left-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-lg">
                      {userPos + 1}
                    </div>
                  )}
                  {/* Correct position after reveal */}
                  {revealed && (
                    <div className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${
                      correctPos === 0 ? 'bg-green-500 text-white' :
                      correctPos === 1 ? 'bg-amber-500 text-white' :
                      'bg-white/20 text-white'
                    }`}>
                      {correctPos + 1}
                    </div>
                  )}
                </button>

                {/* Card info */}
                <div className="mt-2">
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/40 font-mono">
                    {['Q', 'W', 'E'][idx]}
                  </kbd>
                </div>

                {/* ELO reveal */}
                {revealed && (
                  <div className={`mt-1 text-sm font-bold ${
                    correctPos === 0 ? 'text-green-400' : 'text-white/60'
                  }`}>
                    {Math.round(elo)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom */}
      <div className="px-4 pb-8 shrink-0">
        {revealed ? (
          <div className="max-w-md mx-auto">
            {/* Result summary */}
            <div className="text-center mb-4">
              {userOrder.every((v, i) => v === correctOrder[i]) ? (
                <div className="text-green-400 text-xl font-bold">Perfect!</div>
              ) : userOrder[0] === correctOrder[0] ? (
                <div className="text-amber-400 text-xl font-bold">First pick correct!</div>
              ) : (
                <div className="text-red-400 text-xl font-bold">
                  Best pick was {packCards[correctOrder[0]].name.split(',')[0]}
                </div>
              )}
            </div>

            <button
              onClick={nextRound}
              className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              {round >= TOTAL_ROUNDS ? 'See Results' : 'Next Round'}
            </button>
            <div className="text-center text-white/30 text-xs mt-3">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> to continue
            </div>
          </div>
        ) : (
          <div className="text-center text-white/40 text-sm">
            Pick {3 - userOrder.length} more · {formatTime(elapsedTime)}
          </div>
        )}
      </div>
    </div>
  );
}
