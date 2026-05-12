import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { ChevronLeft, Shuffle, Swords, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface BoardState {
  yourCreatures: CubeCard[];
  theirCreatures: CubeCard[];
  yourLife: number;
  theirLife: number;
  question: string;
  correctAnswer: 'yes' | 'no';
  explanation: string;
}

function getCreaturePT(card: CubeCard): { power: number; toughness: number } | null {
  if (!card.power || !card.toughness) return null;
  const power = parseInt(card.power) || 0;
  const toughness = parseInt(card.toughness) || 0;
  return { power, toughness };
}

function hasKeyword(card: CubeCard, keyword: string): boolean {
  return (card.keywords || []).some(k => k.toLowerCase() === keyword.toLowerCase()) ||
         (card.oracle_text || '').toLowerCase().includes(keyword.toLowerCase());
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function CombatMathGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Get all creatures
  const creatures = useMemo(() => {
    return cards.filter(c => {
      const pt = getCreaturePT(c);
      return pt && pt.power >= 1 && pt.toughness >= 1 && c.type_line?.includes('Creature');
    });
  }, [cards]);

  const generateScenario = useCallback(() => {
    if (creatures.length < 6) return;

    const shuffled = shuffleArray(creatures);
    const scenarios = [
      // Alpha strike scenarios
      () => {
        const yourTeam = shuffled.slice(0, 3);
        const theirTeam = shuffled.slice(3, 5);

        const yourPower = yourTeam.reduce((sum, c) => sum + (getCreaturePT(c)?.power || 0), 0);

        // Check for evasion
        const flyersCount = yourTeam.filter(c => hasKeyword(c, 'flying')).length;
        const theirCanBlock = theirTeam.filter(c => hasKeyword(c, 'flying') || hasKeyword(c, 'reach')).length;
        const unblockableDamage = flyersCount > theirCanBlock ?
          yourTeam.filter(c => hasKeyword(c, 'flying')).slice(0, flyersCount - theirCanBlock)
            .reduce((sum, c) => sum + (getCreaturePT(c)?.power || 0), 0) : 0;

        const theirLife = 10 + Math.floor(Math.random() * 8);
        const canLethal = (yourPower >= theirLife) || (unblockableDamage >= theirLife);

        return {
          yourCreatures: yourTeam,
          theirCreatures: theirTeam,
          yourLife: 15,
          theirLife,
          question: 'Can you attack for lethal this turn?',
          correctAnswer: canLethal ? 'yes' : 'no',
          explanation: canLethal
            ? `Your ${yourPower} power beats their ${theirLife} life${unblockableDamage > 0 ? ` (${unblockableDamage} unblockable)` : ''}`
            : `Your ${yourPower} power can't beat their ${theirLife} life through ${theirTeam.length} blockers`
        } as BoardState;
      },
      // Profitable attack
      () => {
        const yourTeam = shuffled.slice(0, 2);
        const theirTeam = shuffled.slice(2, 4);

        // Find best attacks
        const yourBest = yourTeam.reduce((best, c) => {
          const pt = getCreaturePT(c);
          return pt && pt.power > (getCreaturePT(best)?.power || 0) ? c : best;
        }, yourTeam[0]);

        const theirBest = theirTeam.reduce((best, c) => {
          const pt = getCreaturePT(c);
          return pt && pt.toughness > (getCreaturePT(best)?.toughness || 0) ? c : best;
        }, theirTeam[0]);

        const yourPT = getCreaturePT(yourBest);
        const theirPT = getCreaturePT(theirBest);

        // Can we attack and trade up or get through?
        const hasFirstStrike = hasKeyword(yourBest, 'first strike') || hasKeyword(yourBest, 'double strike');
        const hasDeathtouch = hasKeyword(yourBest, 'deathtouch');
        const hasTrample = hasKeyword(yourBest, 'trample');
        const hasFlying = hasKeyword(yourBest, 'flying');
        const theyCanBlockFlyer = theirTeam.some(c => hasKeyword(c, 'flying') || hasKeyword(c, 'reach'));

        let profitable = false;
        let reason = '';

        if (hasFlying && !theyCanBlockFlyer) {
          profitable = true;
          reason = 'Flying gets through unblocked';
        } else if (hasFirstStrike && yourPT && theirPT && yourPT.power >= theirPT.toughness) {
          profitable = true;
          reason = 'First strike kills before they deal damage';
        } else if (hasDeathtouch && yourPT && theirPT && yourPT.toughness > theirPT.power) {
          profitable = true;
          reason = 'Deathtouch trades favorably';
        } else if (yourPT && theirPT && yourPT.power > theirPT.toughness && yourPT.toughness > theirPT.power) {
          profitable = true;
          reason = 'You win the combat outright';
        } else if (hasTrample && yourPT && theirPT && yourPT.power > theirPT.toughness) {
          profitable = true;
          reason = 'Trample pushes damage through';
        } else {
          reason = 'No favorable attacks available';
        }

        return {
          yourCreatures: yourTeam,
          theirCreatures: theirTeam,
          yourLife: 12,
          theirLife: 14,
          question: 'Can you make a profitable attack?',
          correctAnswer: profitable ? 'yes' : 'no',
          explanation: reason
        } as BoardState;
      },
      // Safe to attack all
      () => {
        const yourTeam = shuffled.slice(0, 3);
        const theirTeam = shuffled.slice(3, 4);

        const theirPT = getCreaturePT(theirTeam[0]);
        const yourSmallest = yourTeam.reduce((min, c) => {
          const pt = getCreaturePT(c);
          return pt && pt.toughness < (getCreaturePT(min)?.toughness || 99) ? c : min;
        }, yourTeam[0]);

        const smallestToughness = getCreaturePT(yourSmallest)?.toughness || 0;
        const canKillOne = theirPT && theirPT.power >= smallestToughness;
        const hasVigilance = yourTeam.every(c => hasKeyword(c, 'vigilance'));

        const safe = hasVigilance || !canKillOne || theirTeam.length === 0;

        return {
          yourCreatures: yourTeam,
          theirCreatures: theirTeam,
          yourLife: 8,
          theirLife: 18,
          question: 'Is it safe to attack with everything?',
          correctAnswer: safe ? 'yes' : 'no',
          explanation: safe
            ? hasVigilance ? 'Vigilance means you can still block' : 'They can\'t crack back for enough'
            : `If you attack all, their crack-back could be lethal`
        } as BoardState;
      }
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]();
    setBoardState(scenario);
    setSelected(null);
    setRevealed(false);
  }, [creatures]);

  useEffect(() => {
    if (creatures.length > 0 && !boardState) {
      generateScenario();
    }
  }, [creatures, boardState, generateScenario]);

  const handleAnswer = useCallback((answer: 'yes' | 'no') => {
    if (revealed || !boardState) return;

    setSelected(answer);
    setRevealed(true);

    const isCorrect = answer === boardState.correctAnswer;

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
  }, [revealed, boardState, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    generateScenario();
  }, [generateScenario]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed) {
        if (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleAnswer('yes');
        } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleAnswer('no');
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
  }, [revealed, handleAnswer, handleNext]);

  if (!boardState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Loading combat scenario...</div>
      </div>
    );
  }

  const isCorrect = selected === boardState.correctAnswer;

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

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-4 overflow-auto">
        {/* Life totals */}
        <div className="flex items-center gap-8 mb-2">
          <div className="text-center">
            <div className="text-xs text-white/40">Opponent</div>
            <div className="text-2xl font-bold text-red-400">{boardState.theirLife}</div>
          </div>
          <Swords className="w-6 h-6 text-white/20" />
          <div className="text-center">
            <div className="text-xs text-white/40">You</div>
            <div className="text-2xl font-bold text-green-400">{boardState.yourLife}</div>
          </div>
        </div>

        {/* Their side */}
        <div className="w-full max-w-2xl">
          <div className="text-xs text-white/40 text-center mb-2">Opponent's creatures</div>
          <div className="flex justify-center gap-2">
            {boardState.theirCreatures.map(card => (
              <div key={card.name} className="relative">
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="h-32 w-auto rounded-lg border border-red-500/30"
                />
                <div className="absolute bottom-1 left-1 right-1 bg-black/80 rounded text-center">
                  <span className="text-xs text-red-400 font-mono">
                    {card.power}/{card.toughness}
                  </span>
                </div>
              </div>
            ))}
            {boardState.theirCreatures.length === 0 && (
              <div className="text-white/30 text-sm py-8">No creatures</div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full max-w-xl border-t border-white/10 my-2" />

        {/* Your side */}
        <div className="w-full max-w-2xl">
          <div className="text-xs text-white/40 text-center mb-2">Your creatures</div>
          <div className="flex justify-center gap-2">
            {boardState.yourCreatures.map(card => (
              <div key={card.name} className="relative">
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="h-32 w-auto rounded-lg border border-green-500/30"
                />
                <div className="absolute bottom-1 left-1 right-1 bg-black/80 rounded text-center">
                  <span className="text-xs text-green-400 font-mono">
                    {card.power}/{card.toughness}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="text-center mt-4">
          <p className="text-lg text-white font-medium">{boardState.question}</p>
        </div>

        {/* Answer buttons */}
        {!revealed && (
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={() => handleAnswer('yes')}
              className="flex-1 py-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all"
            >
              <span className="text-lg font-medium text-green-400">Yes</span>
              <div className="text-xs text-white/30 mt-1">Y / A</div>
            </button>
            <button
              onClick={() => handleAnswer('no')}
              className="flex-1 py-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <span className="text-lg font-medium text-red-400">No</span>
              <div className="text-xs text-white/30 mt-1">N / D</div>
            </button>
          </div>
        )}

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
                  {isCorrect ? 'Correct!' : `Wrong - Answer was ${boardState.correctAnswer.toUpperCase()}`}
                </span>
              </div>
              <p className="text-sm text-white/60 text-center">{boardState.explanation}</p>
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
