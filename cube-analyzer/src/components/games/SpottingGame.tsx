/**
 * Spotting Game: "Odd One Out"
 *
 * Cognitive loop: SPOTTING
 * Show 6 cards - 5 from one archetype, 1 intruder.
 * Trains: Deck coherence recognition, spotting misfits.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { shuffleArray } from './gameUtils';

interface SpottingGameProps {
  cards: CubeCard[];
  onBack: () => void;
}

interface RoundResult {
  cards: CubeCard[];
  intruderIdx: number;
  pickedIdx: number;
  correct: boolean;
  archetype: string;
  responseTimeMs: number;
}

// Simplified archetype definitions for grouping
const ARCHETYPES = [
  {
    id: 'white-aggro',
    name: 'White Aggro',
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const cmc = c.cmc || 0;
      return colors.includes('W') && !colors.includes('U') && !colors.includes('B') &&
             cmc <= 3 && c.type_line?.toLowerCase().includes('creature');
    },
  },
  {
    id: 'blue-control',
    name: 'Blue Control',
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      const typeLine = c.type_line?.toLowerCase() || '';
      return colors.includes('U') &&
             (oracle.includes('counter') || oracle.includes('draw') ||
              typeLine.includes('instant') || typeLine.includes('sorcery'));
    },
  },
  {
    id: 'black-midrange',
    name: 'Black Midrange',
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      return colors.includes('B') && !colors.includes('W') &&
             (oracle.includes('sacrifice') || oracle.includes('graveyard') ||
              oracle.includes('discard') || oracle.includes('destroy'));
    },
  },
  {
    id: 'red-aggro',
    name: 'Red Aggro',
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const cmc = c.cmc || 0;
      const keywords = c.keywords || [];
      return colors.includes('R') && !colors.includes('U') &&
             cmc <= 3 &&
             (keywords.some(k => k.toLowerCase() === 'haste') ||
              c.type_line?.toLowerCase().includes('creature'));
    },
  },
  {
    id: 'green-ramp',
    name: 'Green Ramp',
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      return colors.includes('G') &&
             (oracle.includes('add') || oracle.includes('land') ||
              oracle.includes('mana') || (c.cmc || 0) >= 5);
    },
  },
  {
    id: 'artifacts',
    name: 'Artifacts',
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const typeLine = c.type_line?.toLowerCase() || '';
      return colors.length === 0 && typeLine.includes('artifact');
    },
  },
];

const TOTAL_ROUNDS = 10;

export function SpottingGame({ cards, onBack }: SpottingGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [packCards, setPackCards] = useState<CubeCard[]>([]);
  const [intruderIdx, setIntruderIdx] = useState(-1);
  const [archetypeName, setArchetypeName] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
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

  // Pre-filter cards by archetype
  const cardsByArchetype = ARCHETYPES.map(arch => ({
    ...arch,
    cards: cards.filter(c => getEloData(c.name) && arch.filter(c)),
  })).filter(a => a.cards.length >= 5);

  // Generate a new round
  const newRound = useCallback(() => {
    if (cardsByArchetype.length < 2) return;

    // Pick a random archetype with enough cards
    const mainArch = cardsByArchetype[Math.floor(Math.random() * cardsByArchetype.length)];

    // Pick 5 cards from that archetype
    const mainCards = shuffleArray(mainArch.cards).slice(0, 5);

    // Pick an intruder from a different archetype
    const otherArchs = cardsByArchetype.filter(a => a.id !== mainArch.id);
    const intruderArch = otherArchs[Math.floor(Math.random() * otherArchs.length)];

    // Make intruder subtle - pick one that shares some characteristics
    // (similar CMC or at least different color)
    const intruderCandidates = intruderArch.cards.filter(c => {
      const mainCmcs = mainCards.map(mc => mc.cmc || 0);
      const avgCmc = mainCmcs.reduce((a, b) => a + b, 0) / mainCmcs.length;
      const intruderCmc = c.cmc || 0;
      // Prefer intruders with similar CMC to blend in better
      return Math.abs(intruderCmc - avgCmc) <= 2;
    });

    const intruder = intruderCandidates.length > 0
      ? shuffleArray(intruderCandidates)[0]
      : shuffleArray(intruderArch.cards)[0];

    // Combine and shuffle
    const allCards = [...mainCards, intruder];
    const shuffledIndices = shuffleArray([0, 1, 2, 3, 4, 5]);
    const finalCards = shuffledIndices.map(i => allCards[i]);
    const intruderPosition = shuffledIndices.indexOf(5); // Original intruder was at index 5

    setPackCards(finalCards);
    setIntruderIdx(intruderPosition);
    setArchetypeName(mainArch.name);
    setPicked(null);
    setRevealed(false);
    setRoundStartTime(Date.now());
    setElapsedTime(0);
  }, [cardsByArchetype]);

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

  // Handle pick
  const handlePick = useCallback((idx: number) => {
    if (revealed) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTime;
    const correct = idx === intruderIdx;

    setPicked(idx);
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
      // Streak bonus
      roundScore += Math.min(50, streak * 10);
    }

    setTotalScore(prev => prev + roundScore);

    // Record result
    setResults(prev => [...prev, {
      cards: packCards,
      intruderIdx,
      pickedIdx: idx,
      correct,
      archetype: archetypeName,
      responseTimeMs: responseTime,
    }]);
  }, [revealed, intruderIdx, roundStartTime, streak, bestStreak, packCards, archetypeName]);

  // Advance to next round
  const nextRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
    } else {
      setRound(r => r + 1);
      newRound();
    }
  }, [round, newRound]);

  // Keyboard shortcuts (1-6 for cards)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      const key = e.key;

      if (!revealed && packCards.length === 6) {
        if (key >= '1' && key <= '6') {
          e.preventDefault();
          handlePick(parseInt(key) - 1);
        }
      } else if (revealed && (key === 'Enter' || key === ' ')) {
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
    const correct = results.filter(r => r.correct).length;
    const avgTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;

    const getSummary = () => {
      if (correct >= 9) return "Sharp eyes. You spot misfits instantly.";
      if (correct >= 7) return "Good pattern recognition. Keep training the edge cases.";
      if (correct >= 5) return "Developing your eye. Focus on what makes cards fit or not fit.";
      return "Learning the patterns. Study archetype characteristics.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Search className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Odd One Out</p>
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
                  title={`${r.archetype}: ${r.correct ? 'Found it!' : 'Missed'}`}
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

  if (packCards.length === 0) return null;

  const formatTime = (ms: number) => (ms / 1000).toFixed(1) + 's';
  const isCorrect = picked === intruderIdx;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Odd One Out</div>
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
      <div className="text-center py-3 text-white/60 text-sm">
        Find the card that doesn't belong in <span className="text-white font-medium">{archetypeName}</span>
      </div>

      {/* Cards grid */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-3 gap-3 max-w-2xl">
          {packCards.map((card, idx) => {
            const isIntruder = idx === intruderIdx;
            const isPicked = picked === idx;

            return (
              <button
                key={card.id}
                onClick={() => handlePick(idx)}
                disabled={revealed}
                className={`relative rounded-xl overflow-hidden transition-all ${
                  revealed
                    ? isIntruder
                      ? 'ring-4 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : isPicked
                        ? 'ring-4 ring-amber-500 opacity-60'
                        : 'opacity-40'
                    : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full"
                />
                {/* Position indicator */}
                <div className="absolute bottom-2 left-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white/60 text-xs font-mono">
                  {idx + 1}
                </div>
                {/* Intruder label on reveal */}
                {revealed && isIntruder && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 rounded text-white text-xs font-bold">
                    Intruder
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom */}
      <div className="px-4 pb-8 shrink-0">
        {revealed ? (
          <div className="max-w-md mx-auto">
            <div className={`text-center mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {isCorrect ? 'Found it!' : 'Wrong!'}
              </div>
              {!isCorrect && (
                <div className="text-sm text-white/60">
                  The intruder was <span className="text-white font-medium">{packCards[intruderIdx].name}</span>
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
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">1</kbd>-<kbd className="px-1.5 py-0.5 bg-white/10 rounded">6</kbd> to pick · {formatTime(elapsedTime)}
          </div>
        )}
      </div>
    </div>
  );
}
