/**
 * Reconstruction Game: "Complete the Curve"
 *
 * Cognitive loop: RECONSTRUCTION
 * Show a partial curve with one slot missing. Fill it in.
 * Trains: Curve construction, understanding deck composition.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, Puzzle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { shuffleArray } from './gameUtils';

interface ReconstructionGameProps {
  cards: CubeCard[];
  onBack: () => void;
}

interface RoundResult {
  curve: (CubeCard | null)[];
  missingSlot: number;
  correctCard: CubeCard;
  pickedCard: CubeCard | null;
  correct: boolean;
  archetype: string;
  responseTimeMs: number;
}

// Archetypes with color/style preferences
const ARCHETYPES = [
  {
    id: 'white-aggro',
    name: 'White Aggro',
    colors: ['W'],
    preferLowCurve: true,
    keywords: ['haste', 'first strike', 'lifelink'],
  },
  {
    id: 'blue-control',
    name: 'Blue Control',
    colors: ['U'],
    preferLowCurve: false,
    keywords: ['flash', 'flying'],
  },
  {
    id: 'red-aggro',
    name: 'Red Aggro',
    colors: ['R'],
    preferLowCurve: true,
    keywords: ['haste', 'prowess'],
  },
  {
    id: 'green-ramp',
    name: 'Green Ramp',
    colors: ['G'],
    preferLowCurve: false,
    keywords: [],
  },
  {
    id: 'black-midrange',
    name: 'Black Midrange',
    colors: ['B'],
    preferLowCurve: false,
    keywords: ['deathtouch', 'lifelink'],
  },
];

const TOTAL_ROUNDS = 10;

export function ReconstructionGame({ cards, onBack }: ReconstructionGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [curve, setCurve] = useState<(CubeCard | null)[]>([]);
  const [missingSlot, setMissingSlot] = useState(-1);
  const [correctCard, setCorrectCard] = useState<CubeCard | null>(null);
  const [options, setOptions] = useState<CubeCard[]>([]);
  const [archetype, setArchetype] = useState('');
  const [picked, setPicked] = useState<CubeCard | null>(null);
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

  // Get non-land cards with ELO
  const nonLandCards = cards.filter(c =>
    !c.type_line?.toLowerCase().includes('land') &&
    getEloData(c.name) &&
    c.type_line?.toLowerCase().includes('creature')
  );

  // Generate a new round
  const newRound = useCallback(() => {
    if (nonLandCards.length < 20) return;

    // Pick a random archetype
    const arch = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    setArchetype(arch.name);

    // Filter cards that fit this archetype
    const archCards = nonLandCards.filter(c => {
      const colors = c.color_identity || [];
      return arch.colors.some(col => colors.includes(col));
    });

    if (archCards.length < 10) {
      // Fallback to all cards if not enough archetype cards
      generateCurveFromCards(nonLandCards, arch.name);
    } else {
      generateCurveFromCards(archCards, arch.name);
    }

    setPicked(null);
    setRevealed(false);
    setRoundStartTime(Date.now());
    setElapsedTime(0);
  }, [nonLandCards]);

  const generateCurveFromCards = (pool: CubeCard[], _archName: string) => {
    // Build a curve: 1-drop, 2-drop, 3-drop, 4-drop, 5-drop
    const cmcSlots = [1, 2, 3, 4, 5];
    const curveCards: CubeCard[] = [];

    for (const targetCmc of cmcSlots) {
      const candidates = pool.filter(c => c.cmc === targetCmc);
      if (candidates.length > 0) {
        const card = shuffleArray(candidates)[0];
        curveCards.push(card);
        // Remove from pool to avoid duplicates
        pool = pool.filter(c => c.id !== card.id);
      } else {
        // Find closest CMC
        const closest = pool.reduce((best, c) => {
          const diff = Math.abs((c.cmc || 0) - targetCmc);
          const bestDiff = Math.abs((best.cmc || 0) - targetCmc);
          return diff < bestDiff ? c : best;
        }, pool[0]);
        if (closest) {
          curveCards.push(closest);
          pool = pool.filter(c => c.id !== closest.id);
        }
      }
    }

    if (curveCards.length < 5) return;

    // Pick a random slot to hide (prefer middle slots for more interesting choices)
    const slotWeights = [1, 2, 3, 2, 1]; // Favor 2, 3, 4 drops
    const totalWeight = slotWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let hiddenSlot = 0;
    for (let i = 0; i < slotWeights.length; i++) {
      random -= slotWeights[i];
      if (random <= 0) {
        hiddenSlot = i;
        break;
      }
    }

    const hiddenCard = curveCards[hiddenSlot];
    const hiddenCmc = cmcSlots[hiddenSlot];

    // Create curve with null for hidden slot
    const displayCurve = curveCards.map((c, i) => i === hiddenSlot ? null : c);

    // Generate distractors: same CMC, different cards
    const distractorPool = nonLandCards.filter(c =>
      c.cmc === hiddenCmc &&
      c.id !== hiddenCard.id &&
      !curveCards.some(cc => cc.id === c.id)
    );

    const distractors = shuffleArray(distractorPool).slice(0, 3);

    // If not enough distractors at exact CMC, add nearby CMC
    if (distractors.length < 3) {
      const nearbyPool = nonLandCards.filter(c =>
        Math.abs((c.cmc || 0) - hiddenCmc) <= 1 &&
        c.id !== hiddenCard.id &&
        !curveCards.some(cc => cc.id === c.id) &&
        !distractors.some(d => d.id === c.id)
      );
      distractors.push(...shuffleArray(nearbyPool).slice(0, 3 - distractors.length));
    }

    setCurve(displayCurve);
    setMissingSlot(hiddenSlot);
    setCorrectCard(hiddenCard);
    setOptions(shuffleArray([hiddenCard, ...distractors.slice(0, 3)]));
  };

  // Start first round
  useEffect(() => {
    newRound();
  }, []);

  // Timer - informational only, no timeout
  useEffect(() => {
    if (revealed || gameOver || curve.length === 0) return;

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - roundStartTime);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, gameOver, curve, roundStartTime]);

  // Handle pick
  const handlePick = useCallback((card: CubeCard | null) => {
    if (revealed || !correctCard) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTime;
    const correct = card?.id === correctCard.id;

    setPicked(card);
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
      curve,
      missingSlot,
      correctCard,
      pickedCard: card,
      correct,
      archetype,
      responseTimeMs: responseTime,
    }]);
  }, [revealed, correctCard, roundStartTime, streak, bestStreak, curve, missingSlot, archetype]);

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

      if (!revealed && options.length > 0) {
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
  }, [revealed, options, handlePick, nextRound]);

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
      if (correct >= 9) return "Master curve builder. You understand deck composition.";
      if (correct >= 7) return "Strong curve intuition. Keep refining your choices.";
      if (correct >= 5) return "Building understanding. Focus on archetype fit.";
      return "Learning the patterns. Study how curves are constructed.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Puzzle className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Complete the Curve</p>
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
                  title={`${r.archetype}: ${r.correct ? '✓' : '✗'}`}
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

  if (curve.length === 0 || !correctCard) return null;

  const formatTime = (ms: number) => (ms / 1000).toFixed(1) + 's';
  const isCorrect = picked?.id === correctCard.id;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Complete the Curve</div>
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
          Complete this <span className="text-white font-medium">{archetype}</span> curve · {formatTime(elapsedTime)}
        </div>

        {/* Curve display - 5 cards showing the mana curve */}
        <div className="flex justify-center items-end gap-3">
          {curve.map((card, idx) => {
            const cmcLabels = ['1-drop', '2-drop', '3-drop', '4-drop', '5-drop'];
            const isMissing = card === null;
            const showCorrect = revealed && isMissing;

            return (
              <div key={idx} className="flex flex-col items-center w-[110px] flex-shrink-0">
                <div className="text-xs text-white/40 mb-1">{cmcLabels[idx]}</div>
                {isMissing ? (
                  <div className={`w-full aspect-[0.72] rounded-lg border-2 border-dashed flex items-center justify-center ${
                    showCorrect ? 'border-green-500 bg-green-500/10' : 'border-white/30 bg-white/5'
                  }`}>
                    {showCorrect ? (
                      <img
                        src={getCardImage(correctCard)}
                        alt={correctCard.name}
                        className="w-full rounded-lg shadow-lg"
                      />
                    ) : (
                      <span className="text-3xl text-white/30">?</span>
                    )}
                  </div>
                ) : (
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-full rounded-lg opacity-80 shadow-lg"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Options - 2x2 grid of larger cards */}
        {!revealed ? (
          <div className="grid grid-cols-2 gap-4" style={{ width: 'min(100%, 400px)' }}>
            {options.map((card, idx) => {
              const keys = ['A', 'S', 'D', 'F'];
              return (
                <button
                  key={card.id}
                  onClick={() => handlePick(card)}
                  className="relative rounded-xl overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    className="w-full shadow-lg"
                  />
                  <div className="absolute bottom-2 right-2">
                    <kbd className="px-2.5 py-1 bg-black/80 rounded text-sm text-white font-mono">
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
              {!isCorrect && (
                <div className="text-sm text-white/60">
                  Best fit: <span className="text-white font-medium">{correctCard.name}</span>
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
        )}
      </div>
    </div>
  );
}
