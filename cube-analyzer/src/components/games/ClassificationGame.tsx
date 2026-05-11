/**
 * Classification Game: "Archetype Sort"
 *
 * Cognitive loop: CLASSIFICATION
 * Show a card, pick which archetype wants it most.
 * Trains: Deck-building intuition, archetype recognition.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, Target, Shuffle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { shuffleArray } from './gameUtils';

interface ClassificationGameProps {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface RoundResult {
  card: CubeCard;
  correctArchetype: string;
  userPick: string;
  correct: boolean;
  responseTimeMs: number;
}

// Archetypes with card classification rules
const ARCHETYPES = [
  {
    id: 'aggro',
    name: 'Aggro',
    keywords: ['haste', 'first strike', 'menace', 'prowess'],
    types: ['creature'],
    cmcMax: 3,
    colors: ['R', 'W'],
    oracleHints: ['deals damage', 'attacking'],
  },
  {
    id: 'control',
    name: 'Control',
    keywords: ['flash', 'hexproof'],
    types: ['instant', 'sorcery', 'planeswalker'],
    cmcMin: 3,
    colors: ['U', 'W', 'B'],
    oracleHints: ['counter', 'destroy', 'exile', 'draw', 'return to hand'],
  },
  {
    id: 'reanimator',
    name: 'Reanimator',
    keywords: [],
    types: ['creature'],
    cmcMin: 5,
    colors: ['B', 'U'],
    oracleHints: ['graveyard', 'return to the battlefield', 'discard', 'mill', 'reanimate'],
  },
  {
    id: 'ramp',
    name: 'Ramp',
    keywords: [],
    types: ['creature', 'sorcery'],
    colors: ['G'],
    oracleHints: ['add', 'mana', 'land', 'search your library for a', 'untap'],
  },
  {
    id: 'combo',
    name: 'Combo',
    keywords: ['storm'],
    types: ['instant', 'sorcery', 'artifact'],
    colors: ['U', 'R'],
    oracleHints: ['untap', 'copy', 'whenever you cast', 'draw', 'each', 'infinite'],
  },
  {
    id: 'midrange',
    name: 'Midrange',
    keywords: ['deathtouch', 'lifelink', 'vigilance'],
    types: ['creature', 'planeswalker'],
    cmcRange: [3, 5],
    colors: ['B', 'G'],
    oracleHints: ['enters the battlefield', 'value', 'sacrifice'],
  },
];

const TOTAL_ROUNDS = 10;

// Score a card for each archetype
function scoreCardForArchetype(card: CubeCard, archetype: typeof ARCHETYPES[0]): number {
  let score = 0;
  const oracle = card.oracle_text?.toLowerCase() || '';
  const typeLine = card.type_line?.toLowerCase() || '';
  const colors = card.color_identity || [];
  const cmc = card.cmc || 0;
  const keywords = card.keywords || [];

  // Color match
  const colorMatch = archetype.colors.some(c => colors.includes(c));
  if (colorMatch) score += 2;

  // Type match
  const typeMatch = archetype.types.some(t => typeLine.includes(t));
  if (typeMatch) score += 2;

  // Keyword match
  const keywordMatch = archetype.keywords.some(k =>
    keywords.map(kw => kw.toLowerCase()).includes(k.toLowerCase())
  );
  if (keywordMatch) score += 3;

  // Oracle text hints
  const oracleMatch = archetype.oracleHints.some(hint => oracle.includes(hint));
  if (oracleMatch) score += 4;

  // CMC considerations
  if (archetype.cmcMax && cmc <= archetype.cmcMax) score += 1;
  if (archetype.cmcMin && cmc >= archetype.cmcMin) score += 1;
  if (archetype.cmcRange && cmc >= archetype.cmcRange[0] && cmc <= archetype.cmcRange[1]) score += 1;

  return score;
}

// Find best archetype for a card
function getBestArchetype(card: CubeCard): string {
  let bestArchetype = ARCHETYPES[0].name;
  let bestScore = -1;

  for (const arch of ARCHETYPES) {
    const score = scoreCardForArchetype(card, arch);
    if (score > bestScore) {
      bestScore = score;
      bestArchetype = arch.name;
    }
  }

  return bestArchetype;
}

export function ClassificationGame({ cards, onBack, onShuffle }: ClassificationGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [targetCard, setTargetCard] = useState<CubeCard | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [correctArchetype, setCorrectArchetype] = useState('');
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

  // Get cards with clear archetype affinity (score > 3 for best archetype)
  const goodCards = cards.filter(c => {
    if (!getEloData(c.name)) return false;
    const scores = ARCHETYPES.map(a => scoreCardForArchetype(c, a));
    const maxScore = Math.max(...scores);
    return maxScore >= 4; // Must have clear affinity
  });

  // Generate a new round
  const newRound = useCallback(() => {
    if (goodCards.length === 0) return;

    const target = shuffleArray(goodCards)[0];
    const bestArch = getBestArchetype(target);

    setTargetCard(target);
    setCorrectArchetype(bestArch);

    // Get 3 other archetypes as distractors
    const otherArchetypes = ARCHETYPES
      .map(a => a.name)
      .filter(name => name !== bestArch);
    const distractors = shuffleArray(otherArchetypes).slice(0, 3);
    setOptions(shuffleArray([bestArch, ...distractors]));

    setPicked(null);
    setRevealed(false);
    setRoundStartTime(Date.now());
    setElapsedTime(0);
  }, [goodCards]);

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
  const handlePick = useCallback((archetype: string | null) => {
    if (revealed || !targetCard) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTime;
    const correct = archetype === correctArchetype;

    setPicked(archetype);
    setRevealed(true);

    // Update streak
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    // Calculate score
    let roundScore = 0;
    if (correct) {
      roundScore = 100;
      // Speed bonus: up to 50 extra points for fast answers (under 3 seconds)
      if (responseTime < 3000) {
        roundScore += Math.round((1 - responseTime / 3000) * 50);
      }
      // Streak bonus
      roundScore += Math.min(50, streak * 10);
    }

    setTotalScore(prev => prev + roundScore);

    // Record result
    setResults(prev => [...prev, {
      card: targetCard,
      correctArchetype,
      userPick: archetype || '(timeout)',
      correct,
      responseTimeMs: responseTime,
    }]);
  }, [revealed, targetCard, correctArchetype, roundStartTime, streak, bestStreak]);

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

  // Game over screen
  if (gameOver) {
    const correct = results.filter(r => r.correct).length;
    const avgTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;

    const getSummary = () => {
      if (correct >= 9) return "Expert-level archetype recognition. You know where cards belong.";
      if (correct >= 7) return "Strong deck-building intuition. Keep drilling edge cases.";
      if (correct >= 5) return "Solid foundation. Focus on the archetypes you missed.";
      return "Building your intuition. Study how card text signals archetype fit.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Target className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Archetype Sort</p>
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
                  title={`${r.card.name}: ${r.correct ? '✓' : '✗'} (${r.correctArchetype})`}
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

  const formatTime = (ms: number) => (ms / 1000).toFixed(1) + 's';
  const isCorrect = picked === correctArchetype;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Archetype Sort</div>
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
          className="max-h-[50vh] w-auto rounded-xl shadow-2xl"
        />

        {/* Question */}
        <div className="text-center text-white/60 text-sm">
          Which deck wants this card most? · {formatTime(elapsedTime)}
        </div>

        {/* Options */}
        {!revealed ? (
          <div className="grid grid-cols-2 gap-3 max-w-md w-full">
            {options.map((arch, idx) => {
              const keys = ['A', 'S', 'D', 'F'];
              return (
                <button
                  key={arch}
                  onClick={() => handlePick(arch)}
                  className="py-4 px-4 bg-white/[0.06] border border-white/[0.08] rounded-xl hover:bg-white/[0.1] active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{arch}</span>
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
              {!isCorrect && (
                <div className="text-sm text-white/60">
                  Best fit: <span className="text-white font-medium">{correctArchetype}</span>
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
