/**
 * Constraint Game: "Deck Doctor"
 *
 * Cognitive loop: CONSTRAINT
 * Show a 7-card hand with a clear flaw. Diagnose what's wrong.
 * Trains: Recognizing structural deck issues, knowing what "good" looks like.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, Stethoscope } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { shuffleArray } from './gameUtils';

interface ConstraintGameProps {
  cards: CubeCard[];
  onBack: () => void;
}

interface RoundResult {
  hand: CubeCard[];
  problem: string;
  userPick: string;
  correct: boolean;
  responseTimeMs: number;
}

// Problem types with generation logic
type Problem = 'no-early-plays' | 'too-many-lands' | 'too-few-lands' | 'all-expensive' | 'color-screw' | 'looks-fine';

const PROBLEMS: { id: Problem; label: string; desc: string }[] = [
  { id: 'no-early-plays', label: 'No early plays', desc: 'Nothing to do turns 1-2' },
  { id: 'too-many-lands', label: 'Too many lands', desc: '5+ lands, flood risk' },
  { id: 'too-few-lands', label: 'Too few lands', desc: '0-1 lands, can\'t cast spells' },
  { id: 'all-expensive', label: 'All expensive', desc: 'Every spell costs 4+' },
  { id: 'color-screw', label: 'Color problems', desc: 'Lands don\'t cast spells' },
  { id: 'looks-fine', label: 'Looks keepable', desc: 'This hand is fine' },
];

const TOTAL_ROUNDS = 10;

export function ConstraintGame({ cards, onBack }: ConstraintGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [hand, setHand] = useState<CubeCard[]>([]);
  const [problem, setProblem] = useState<Problem>('looks-fine');
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

  // Separate cards by type
  const lands = cards.filter(c => c.type_line?.toLowerCase().includes('land') && getEloData(c.name));
  const spells = cards.filter(c => !c.type_line?.toLowerCase().includes('land') && getEloData(c.name));
  const cheapSpells = spells.filter(c => (c.cmc || 0) <= 2);
  const expensiveSpells = spells.filter(c => (c.cmc || 0) >= 4);
  const midSpells = spells.filter(c => (c.cmc || 0) >= 2 && (c.cmc || 0) <= 4);

  // Generate a hand with a specific problem
  const generateProblemHand = useCallback((problemType: Problem): CubeCard[] => {
    switch (problemType) {
      case 'no-early-plays': {
        // 2-3 lands, all spells cost 3+
        const handLands = shuffleArray(lands).slice(0, 3);
        const expensive = spells.filter(c => (c.cmc || 0) >= 3);
        const handSpells = shuffleArray(expensive).slice(0, 4);
        return shuffleArray([...handLands, ...handSpells]);
      }

      case 'too-many-lands': {
        // 5-6 lands, 1-2 spells
        const handLands = shuffleArray(lands).slice(0, 5);
        const handSpells = shuffleArray(spells).slice(0, 2);
        return shuffleArray([...handLands, ...handSpells]);
      }

      case 'too-few-lands': {
        // 0-1 lands, 6-7 spells
        const handLands = shuffleArray(lands).slice(0, 1);
        const handSpells = shuffleArray(spells).slice(0, 6);
        return shuffleArray([...handLands, ...handSpells]);
      }

      case 'all-expensive': {
        // 3 lands, all spells 4+ CMC
        const handLands = shuffleArray(lands).slice(0, 3);
        const handSpells = shuffleArray(expensiveSpells).slice(0, 4);
        return shuffleArray([...handLands, ...handSpells]);
      }

      case 'color-screw': {
        // Get lands of one color, spells of another
        const whiteLands = lands.filter(c => {
          const produced = c.produced_mana || [];
          return produced.includes('W') && !produced.includes('U') && !produced.includes('B');
        });
        const blueSpells = spells.filter(c => {
          const colors = c.color_identity || [];
          return colors.includes('U') && !colors.includes('W');
        });

        if (whiteLands.length >= 3 && blueSpells.length >= 4) {
          const handLands = shuffleArray(whiteLands).slice(0, 3);
          const handSpells = shuffleArray(blueSpells).slice(0, 4);
          return shuffleArray([...handLands, ...handSpells]);
        }

        // Fallback: just make mismatched hand
        const handLands = shuffleArray(lands).slice(0, 3);
        const wrongColorSpells = spells.filter(c => {
          const colors = c.color_identity || [];
          const landColors = handLands.flatMap(l => l.produced_mana || []);
          return colors.length > 0 && !colors.some(col => landColors.includes(col));
        });
        const handSpells = shuffleArray(wrongColorSpells.length >= 4 ? wrongColorSpells : spells).slice(0, 4);
        return shuffleArray([...handLands, ...handSpells]);
      }

      case 'looks-fine': {
        // 2-3 lands, mix of cheap and mid spells
        const handLands = shuffleArray(lands).slice(0, 3);
        const cheap = shuffleArray(cheapSpells).slice(0, 2);
        const mid = shuffleArray(midSpells).slice(0, 2);
        return shuffleArray([...handLands, ...cheap, ...mid]);
      }

      default:
        return shuffleArray(spells).slice(0, 7);
    }
  }, [lands, spells, cheapSpells, expensiveSpells, midSpells]);

  // Generate a new round
  const newRound = useCallback(() => {
    // Pick a random problem (weighted toward actual problems)
    const problemWeights: Problem[] = [
      'no-early-plays', 'no-early-plays',
      'too-many-lands',
      'too-few-lands', 'too-few-lands',
      'all-expensive',
      'color-screw',
      'looks-fine',
    ];
    const selectedProblem = problemWeights[Math.floor(Math.random() * problemWeights.length)];

    const generatedHand = generateProblemHand(selectedProblem);
    setHand(generatedHand);
    setProblem(selectedProblem);

    // Generate options (always include the correct one + 3 others)
    const correctLabel = PROBLEMS.find(p => p.id === selectedProblem)!.label;
    const otherLabels = PROBLEMS
      .filter(p => p.id !== selectedProblem)
      .map(p => p.label);
    const distractors = shuffleArray(otherLabels).slice(0, 3);
    setOptions(shuffleArray([correctLabel, ...distractors]));

    setPicked(null);
    setRevealed(false);
    setRoundStartTime(Date.now());
    setElapsedTime(0);
  }, [generateProblemHand]);

  // Start first round
  useEffect(() => {
    newRound();
  }, []);

  // Timer - informational only, no timeout
  useEffect(() => {
    if (revealed || gameOver || hand.length === 0) return;

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - roundStartTime);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, gameOver, hand, roundStartTime]);

  // Handle pick
  const handlePick = useCallback((answer: string | null) => {
    if (revealed) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTime;
    const correctLabel = PROBLEMS.find(p => p.id === problem)!.label;
    const correct = answer === correctLabel;

    setPicked(answer);
    setRevealed(true);

    // Update streak
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    // Calculate score
    let roundScore = 0;
    if (correct) {
      roundScore = 100;
      // Speed bonus: up to 50 extra points for fast answers (under 4 seconds)
      if (responseTime < 4000) {
        roundScore += Math.round((1 - responseTime / 4000) * 50);
      }
      roundScore += Math.min(50, streak * 10);
    }

    setTotalScore(prev => prev + roundScore);

    // Record result
    setResults(prev => [...prev, {
      hand,
      problem: correctLabel,
      userPick: answer || '(timeout)',
      correct,
      responseTimeMs: responseTime,
    }]);
  }, [revealed, problem, roundStartTime, streak, bestStreak, hand]);

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

      if (!revealed && hand.length > 0) {
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
  }, [revealed, hand, options, handlePick, nextRound]);

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
    const correct = results.filter(r => r.correct).length;
    const avgTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;

    const getSummary = () => {
      if (correct >= 9) return "Expert diagnostician. You see hand problems instantly.";
      if (correct >= 7) return "Strong hand evaluation. Keep practicing edge cases.";
      if (correct >= 5) return "Developing your eye. Learn to spot the common flaws.";
      return "Building intuition. Focus on land count and curve first.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Deck Doctor</p>
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
              <div className="text-2xl font-bold text-white">{(avgTime / 1000).toFixed(1)}s</div>
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
                  title={`Problem: ${r.problem} - ${r.correct ? '✓' : '✗'}`}
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

  if (hand.length === 0) return null;

  const formatTime = (ms: number) => (ms / 1000).toFixed(1) + 's';
  const correctLabel = PROBLEMS.find(p => p.id === problem)!.label;
  const isCorrect = picked === correctLabel;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Deck Doctor</div>
          <div className="text-white/40 text-xs">Round {round}/{TOTAL_ROUNDS}</div>
        </div>
        <div className="text-right min-w-[60px]">
          <div className="text-white font-bold">{totalScore}</div>
          {streak > 1 && (
            <div className="text-amber-400 text-xs">🔥 {streak}</div>
          )}
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Instructions */}
        <div className="text-center text-white/60 text-sm">
          What's wrong with this opening hand? · {formatTime(elapsedTime)}
        </div>

        {/* Hand display - 4+3 stacked layout with larger cards */}
        <div className="flex flex-col gap-3">
          {/* Top row: 4 cards */}
          <div className="flex justify-center gap-3">
            {hand.slice(0, 4).map((card) => {
              const isLand = card.type_line?.toLowerCase().includes('land');
              const cmc = card.cmc || 0;

              return (
                <div key={card.id} className="relative w-[150px] flex-shrink-0">
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-full rounded-xl shadow-lg"
                  />
                  {/* CMC or Land indicator */}
                  <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded text-xs font-bold ${
                    isLand ? 'bg-amber-500/80 text-black' : 'bg-black/80 text-white'
                  }`}>
                    {isLand ? 'Land' : cmc}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Bottom row: 3 cards */}
          <div className="flex justify-center gap-3">
            {hand.slice(4, 7).map((card) => {
              const isLand = card.type_line?.toLowerCase().includes('land');
              const cmc = card.cmc || 0;

              return (
                <div key={card.id} className="relative w-[150px] flex-shrink-0">
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-full rounded-xl shadow-lg"
                  />
                  {/* CMC or Land indicator */}
                  <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded text-xs font-bold ${
                    isLand ? 'bg-amber-500/80 text-black' : 'bg-black/80 text-white'
                  }`}>
                    {isLand ? 'Land' : cmc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Options */}
        {!revealed ? (
          <div className="grid grid-cols-2 gap-3 max-w-md w-full">
            {options.map((opt, idx) => {
              const keys = ['A', 'S', 'D', 'F'];
              return (
                <button
                  key={opt}
                  onClick={() => handlePick(opt)}
                  className="py-3 px-4 bg-white/[0.06] border border-white/[0.08] rounded-xl hover:bg-white/[0.1] active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">{opt}</span>
                    <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/40 font-mono">
                      {keys[idx]}
                    </kbd>
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
              <div className="text-sm text-white/60">
                {isCorrect ? (
                  PROBLEMS.find(p => p.id === problem)!.desc
                ) : (
                  <>The problem was: <span className="text-white font-medium">{correctLabel}</span></>
                )}
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
