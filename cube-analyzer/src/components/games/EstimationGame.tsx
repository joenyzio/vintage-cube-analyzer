/**
 * Estimation Game: "Guess the ELO"
 *
 * Cognitive loop: ESTIMATION
 * Show a card, guess its ELO rating.
 * Trains: Power level calibration, quantitative intuition.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, Gauge, Shuffle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData, getPercentile } from '../../services/eloHelpers';
import { shuffleArray } from './gameUtils';

interface EstimationGameProps {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface RoundResult {
  card: CubeCard;
  actualElo: number;
  guessedElo: number;
  error: number;
  responseTimeMs: number;
}

const TOTAL_ROUNDS = 10;

// ELO zones for quick selection
const ELO_ZONES = [
  { label: 'Low', range: [1200, 1400], center: 1300, desc: 'Below average' },
  { label: 'Mid', range: [1400, 1600], center: 1500, desc: 'Average' },
  { label: 'High', range: [1600, 1800], center: 1700, desc: 'Above average' },
  { label: 'Elite', range: [1800, 2400], center: 2000, desc: 'Premium' },
];

export function EstimationGame({ cards, onBack, onShuffle }: EstimationGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [targetCard, setTargetCard] = useState<CubeCard | null>(null);
  const [sliderValue, setSliderValue] = useState(1500);
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
    if (cardsWithElo.length === 0) return;

    const target = shuffleArray(cardsWithElo)[0];
    setTargetCard(target);
    setSliderValue(1500); // Reset to middle
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
    if (revealed || gameOver || !targetCard) return;

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - roundStartTime);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, gameOver, targetCard, roundStartTime]);

  // Handle submission
  const handleSubmit = useCallback(() => {
    if (revealed || !targetCard) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTime;
    const actualElo = getEloData(targetCard.name)?.elo || 1500;
    const error = Math.abs(sliderValue - actualElo);

    // Consider it "correct" if within 150 ELO
    const isClose = error <= 150;

    setRevealed(true);

    // Update streak
    const newStreak = isClose ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    // Score based on proximity (up to 200 points for exact, 0 for 400+ off)
    const proximityScore = Math.max(0, Math.round(200 * (1 - error / 400)));
    // Speed bonus: up to 50 extra points for fast answers (under 5 seconds)
    const speedBonus = responseTime < 5000 ? Math.round((1 - responseTime / 5000) * 50) : 0;
    // Streak bonus
    const streakBonus = Math.min(50, streak * 10);

    const roundScore = proximityScore + speedBonus + streakBonus;
    setTotalScore(prev => prev + roundScore);

    // Record result
    setResults(prev => [...prev, {
      card: targetCard,
      actualElo: Math.round(actualElo),
      guessedElo: sliderValue,
      error: Math.round(error),
      responseTimeMs: responseTime,
    }]);
  }, [revealed, targetCard, sliderValue, roundStartTime, streak, bestStreak]);

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
        // A, S, D, F keys for zones
        const keyMap: Record<string, number> = { a: 0, s: 1, d: 2, f: 3 };
        if (key in keyMap) {
          e.preventDefault();
          const zone = ELO_ZONES[keyMap[key]];
          setSliderValue(zone.center);
        }
        // Arrow keys for fine adjustment
        if (key === 'arrowup' || key === 'arrowright') {
          e.preventDefault();
          setSliderValue(v => Math.min(2400, v + 50));
        }
        if (key === 'arrowdown' || key === 'arrowleft') {
          e.preventDefault();
          setSliderValue(v => Math.max(1200, v - 50));
        }
        // Enter to submit
        if (key === 'enter') {
          e.preventDefault();
          handleSubmit();
        }
      } else if (revealed && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        nextRound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, targetCard, handleSubmit, nextRound]);

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
    const avgError = results.reduce((sum, r) => sum + r.error, 0) / results.length;
    const closeGuesses = results.filter(r => r.error <= 150).length;

    const getSummary = () => {
      if (avgError < 100) return "Exceptional calibration. You have expert-level card evaluation.";
      if (avgError < 150) return "Strong calibration. Your power level intuition is well-developed.";
      if (avgError < 200) return "Solid calibration. Keep drilling to tighten your estimates.";
      if (avgError < 300) return "Getting there. Focus on distinguishing premium from average cards.";
      return "Early calibration phase. More reps will sharpen your intuition.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Gauge className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Guess the ELO</p>
          </div>

          {/* Score */}
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-white">{totalScore}</div>
            <div className="text-white/40 text-sm mt-1">total score</div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{closeGuesses}/{TOTAL_ROUNDS}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Within 150</div>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">±{Math.round(avgError)}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Avg Error</div>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{bestStreak}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Best Streak</div>
            </div>
          </div>

          {/* Error visualization */}
          <div className="mb-6">
            <div className="text-[11px] text-white/40 mb-2 uppercase tracking-wide">Accuracy</div>
            <div className="flex gap-1">
              {results.map((r, i) => {
                const accuracy = Math.max(0, 1 - r.error / 400);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: '24px',
                      background: `linear-gradient(to top, rgba(255,255,255,${accuracy * 0.8}) 0%, rgba(255,255,255,${accuracy * 0.3}) 100%)`
                    }}
                    title={`${r.card.name}: guessed ${r.guessedElo}, actual ${r.actualElo}`}
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

  if (!targetCard) return null;

  const formatTime = (ms: number) => (ms / 1000).toFixed(1) + 's';
  const actualElo = getEloData(targetCard.name)?.elo || 1500;
  const percentile = getPercentile(targetCard.name);
  const error = Math.abs(sliderValue - actualElo);
  const isClose = error <= 150;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Guess the ELO</div>
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
        {/* Card display */}
        <img
          src={getCardImage(targetCard)}
          alt={targetCard.name}
          className="max-h-[40vh] w-auto rounded-xl shadow-2xl"
        />

        {/* Input area */}
        {!revealed ? (
          <div className="max-w-md w-full">
            {/* Timer display */}
            <div className="text-center text-white/40 text-sm mb-2">
              {formatTime(elapsedTime)}
            </div>

            {/* Current guess display */}
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-white">{sliderValue}</div>
              <div className="text-white/40 text-sm">Your estimate</div>
            </div>

            {/* Slider */}
            <div className="mb-4">
              <input
                type="range"
                min="1200"
                max="2400"
                step="25"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>1200</span>
                <span>1800</span>
                <span>2400</span>
              </div>
            </div>

            {/* Quick zone buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {ELO_ZONES.map((zone, idx) => (
                <button
                  key={zone.label}
                  onClick={() => setSliderValue(zone.center)}
                  className={`py-2 px-2 rounded-lg text-sm transition-all ${
                    sliderValue >= zone.range[0] && sliderValue < zone.range[1]
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/[0.06] text-white/60 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium">{zone.label}</div>
                  <kbd className="text-[10px] text-white/30">{['A', 'S', 'D', 'F'][idx]}</kbd>
                </button>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Lock In
            </button>
            <div className="text-center text-white/30 text-xs mt-3">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">A S D F</kbd> zones ·
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-1">↑↓</kbd> adjust ·
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-1">Enter</kbd> submit
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full">
            {/* Result */}
            <div className={`text-center mb-4 ${isClose ? 'text-green-400' : 'text-amber-400'}`}>
              <div className="text-xl font-bold mb-2">
                {isClose ? 'Close!' : error <= 300 ? 'Not bad' : 'Off target'}
              </div>
              <div className="flex items-center justify-center gap-4 text-white">
                <div>
                  <div className="text-white/40 text-xs">Your guess</div>
                  <div className="text-2xl font-bold">{sliderValue}</div>
                </div>
                <div className="text-white/20">→</div>
                <div>
                  <div className="text-white/40 text-xs">Actual</div>
                  <div className="text-2xl font-bold">{Math.round(actualElo)}</div>
                </div>
              </div>
              <div className="text-white/50 text-sm mt-2">
                Off by {Math.round(error)} · Top {100 - percentile}%
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
