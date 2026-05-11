/**
 * Recognition Game: "Name That Card"
 *
 * Cognitive loop: RECOGNITION
 * Show full card with name blacked out, identify from 4 options.
 * Trains: Card recognition from art/text/stats.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, Eye, Shuffle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { getSimilarCards, shuffleArray } from './gameUtils';

interface RecognitionGameProps {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface RoundResult {
  card: CubeCard;
  correct: boolean;
  responseTimeMs: number;
  picked: string;
}

const TOTAL_ROUNDS = 10;

export function RecognitionGame({ cards, onBack, onShuffle }: RecognitionGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [targetCard, setTargetCard] = useState<CubeCard | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
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

  // Get cards with images
  const validCards = cards.filter(c => getCardImage(c) && getEloData(c.name));

  // Generate a new round
  const newRound = useCallback(() => {
    if (validCards.length < 4) return;

    // Pick a random target
    const target = validCards[Math.floor(Math.random() * validCards.length)];
    setTargetCard(target);

    // Get 3 similar cards as distractors
    const distractors = getSimilarCards(target, validCards, 3);
    const optionCards = shuffleArray([target, ...distractors]);
    setOptions(optionCards.map(c => c.name));

    // Reset state
    setPicked(null);
    setRevealed(false);
    setRoundStartTime(Date.now());
    setElapsedTime(0);
  }, [validCards]);

  // Start first round
  useEffect(() => {
    newRound();
  }, []);

  // Timer - informational only, no timeout
  useEffect(() => {
    if (revealed || gameOver || !targetCard) return;

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - roundStartTime);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, gameOver, targetCard, roundStartTime]);

  // Handle pick
  const handlePick = useCallback((name: string) => {
    if (revealed || !targetCard) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTime;
    const correct = name === targetCard.name;

    setPicked(name);
    setRevealed(true);

    // Update streak
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    // Calculate score: 100 base + speed bonus (faster = more points)
    let roundScore = 0;
    if (correct) {
      roundScore = 100;
      // Speed bonus: up to 100 extra points for fast answers (under 3 seconds)
      if (responseTime < 3000) {
        roundScore += Math.round((1 - responseTime / 3000) * 100);
      }
      // Streak bonus
      roundScore += Math.min(50, streak * 10);
    }
    setTotalScore(prev => prev + roundScore);

    // Record result
    setResults(prev => [...prev, {
      card: targetCard,
      correct,
      responseTimeMs: responseTime,
      picked: name,
    }]);
  }, [revealed, targetCard, roundStartTime, streak, bestStreak]);

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

      if (!revealed && targetCard) {
        const keyMap: Record<string, number> = { a: 0, s: 1, d: 2, f: 3 };
        if (key in keyMap && options[keyMap[key]]) {
          e.preventDefault();
          handlePick(options[keyMap[key]]);
        }
      } else if (revealed && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        nextRound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, targetCard, options, handlePick, nextRound]);

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

  // Format time
  const formatTime = (ms: number) => (ms / 1000).toFixed(1) + 's';

  // Game over screen
  if (gameOver) {
    const correct = results.filter(r => r.correct).length;
    const avgTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;

    const getSummary = () => {
      if (correct >= 9) return "Excellent card knowledge. You know your cube inside out.";
      if (correct >= 7) return "Strong recognition. Keep drilling to lock in the rest.";
      if (correct >= 5) return "Solid foundation. Focus on the cards you missed.";
      return "Building familiarity. More reps will cement the card pool.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Eye className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Name That Card</p>
          </div>

          {/* Score */}
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-white">{totalScore}</div>
            <div className="text-white/40 text-sm mt-1">total score</div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{correct}/{TOTAL_ROUNDS}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Correct</div>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{formatTime(avgTime)}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Avg Time</div>
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
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-sm ${r.correct ? 'bg-white/70' : 'bg-white/20'}`}
                  title={`${r.card.name}: ${r.correct ? '✓' : '✗'}`}
                />
              ))}
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

  if (!targetCard) return null;

  const isCorrect = picked === targetCard.name;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Name That Card</div>
          <div className="text-white/40 text-xs">Round {round}/{TOTAL_ROUNDS}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white font-bold">{totalScore}</div>
            {streak > 1 && (
              <div className="text-amber-400 text-xs">🔥 {streak}</div>
            )}
          </div>
          {onShuffle && (
            <button onClick={onShuffle} className="p-2 hover:bg-white/10 rounded-lg" title="Random game (P)">
              <Shuffle className="w-4 h-4 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Card display with name blacked out */}
        <div className="relative">
          <img
            src={getCardImage(targetCard)}
            alt="Identify this card"
            className="max-h-[50vh] w-auto rounded-xl shadow-2xl"
          />
          {/* Black bar over the name - positioned at top left of card */}
          {!revealed && (
            <div
              className="absolute bg-black rounded-tl-xl"
              style={{
                top: '3.8%',
                left: '4%',
                width: '70%',
                height: '6%',
              }}
            />
          )}
        </div>

        {/* Timer display */}
        <div className="text-center text-white/40 text-sm">
          {formatTime(elapsedTime)}
        </div>

        {/* Options */}
        {!revealed ? (
          <div className="grid grid-cols-2 gap-3 max-w-md w-full">
            {options.map((name, idx) => {
              const keys = ['A', 'S', 'D', 'F'];
              return (
                <button
                  key={name}
                  onClick={() => handlePick(name)}
                  className="py-4 px-4 bg-white/[0.06] border border-white/[0.08] rounded-xl text-left hover:bg-white/[0.1] active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/40 font-mono">
                      {keys[idx]}
                    </kbd>
                    <span className="text-white font-medium text-sm truncate">{name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-md w-full">
            <div className={`text-center mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {isCorrect ? 'Correct!' : 'Wrong!'}
              </div>
              {!isCorrect && (
                <div className="text-sm text-white/60">
                  It was <span className="text-white font-medium">{targetCard.name}</span>
                </div>
              )}
              <div className="text-white/40 text-sm mt-1">
                {formatTime(results[results.length - 1]?.responseTimeMs || 0)}
              </div>
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
        )}
      </div>
    </div>
  );
}
