import { useState, useEffect, useCallback } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { ChevronLeft, Shuffle, Swords, Shield, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface MatchupScenario {
  yourDeck: CubeCard[];
  theirDeck: CubeCard[];
  yourArchetype: string;
  theirArchetype: string;
  correctRole: 'beatdown' | 'control';
  explanation: string;
}

interface ArchetypeFilter {
  name: string;
  speed: number;
  filter: (c: CubeCard) => boolean;
}

const ARCHETYPES: ArchetypeFilter[] = [
  {
    name: 'Mono-Red Aggro',
    speed: 10,
    filter: (c) => {
      const colors = c.colors || [];
      const cmc = c.cmc || 0;
      return colors.length === 1 && colors[0] === 'R' && cmc <= 3 &&
             (c.type_line?.includes('Creature') || c.type_line?.includes('Instant'));
    }
  },
  {
    name: 'White Weenie',
    speed: 9,
    filter: (c) => {
      const colors = c.colors || [];
      const cmc = c.cmc || 0;
      return colors.length === 1 && colors[0] === 'W' && cmc <= 3 &&
             c.type_line?.includes('Creature');
    }
  },
  {
    name: 'UW Control',
    speed: 2,
    filter: (c) => {
      const colors = c.colors || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      return colors.some(col => col === 'U' || col === 'W') &&
             (oracle.includes('counter') || oracle.includes('destroy all') ||
              c.type_line?.includes('Planeswalker'));
    }
  },
  {
    name: 'Green Ramp',
    speed: 4,
    filter: (c) => {
      const colors = c.colors || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      return colors.includes('G') &&
             (oracle.includes('add {') || oracle.includes('search your library for') ||
              (c.cmc || 0) >= 5);
    }
  },
  {
    name: 'Midrange',
    speed: 5,
    filter: (c) => {
      const cmc = c.cmc || 0;
      return c.type_line?.includes('Creature') && cmc >= 3 && cmc <= 5;
    }
  },
  {
    name: 'Tempo',
    speed: 7,
    filter: (c) => {
      const colors = c.colors || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      return colors.includes('U') &&
             (oracle.includes('return') || oracle.includes('counter') ||
              (c.type_line?.includes('Creature') && (c.cmc || 0) <= 3));
    }
  },
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function RoleAssessmentGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [scenario, setScenario] = useState<MatchupScenario | null>(null);
  const [selected, setSelected] = useState<'beatdown' | 'control' | null>(null);
  const [revealed, setRevealed] = useState(false);

  const generateScenario = useCallback(() => {
    // Pick two different archetypes
    const shuffledArchetypes = shuffleArray(ARCHETYPES);
    const arch1 = shuffledArchetypes[0];
    const arch2 = shuffledArchetypes[1];

    // Get cards for each archetype
    const cards1 = shuffleArray(cards.filter(arch1.filter)).slice(0, 5);
    const cards2 = shuffleArray(cards.filter(arch2.filter)).slice(0, 5);

    if (cards1.length < 4 || cards2.length < 4) {
      generateScenario();
      return;
    }

    // Determine correct role based on speed
    // Faster deck should be beatdown, slower should be control
    const youAreFaster = arch1.speed > arch2.speed;
    const correctRole = youAreFaster ? 'beatdown' : 'control';

    const explanation = youAreFaster
      ? `${arch1.name} (speed ${arch1.speed}) is faster than ${arch2.name} (speed ${arch2.speed}). You should be aggressive and force them to react.`
      : `${arch2.name} (speed ${arch2.speed}) is faster than ${arch1.name} (speed ${arch1.speed}). You should play defensively and grind them out.`;

    setScenario({
      yourDeck: cards1,
      theirDeck: cards2,
      yourArchetype: arch1.name,
      theirArchetype: arch2.name,
      correctRole,
      explanation
    });
    setSelected(null);
    setRevealed(false);
  }, [cards]);

  useEffect(() => {
    if (cards.length > 0 && !scenario) {
      generateScenario();
    }
  }, [cards, scenario, generateScenario]);

  const handleAnswer = useCallback((role: 'beatdown' | 'control') => {
    if (revealed || !scenario) return;

    setSelected(role);
    setRevealed(true);

    const isCorrect = role === scenario.correctRole;

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
  }, [revealed, scenario, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    generateScenario();
  }, [generateScenario]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed) {
        if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'b') {
          e.preventDefault();
          handleAnswer('beatdown');
        } else if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'c') {
          e.preventDefault();
          handleAnswer('control');
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

  if (!scenario) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Setting up matchup...</div>
      </div>
    );
  }

  const isCorrect = selected === scenario.correctRole;

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
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-white">Who's the Beatdown?</h2>
          <p className="text-sm text-white/50">In this matchup, what role should YOU play?</p>
        </div>

        {/* Matchup Display */}
        <div className="flex items-center gap-6 w-full max-w-3xl">
          {/* Your Deck */}
          <div className="flex-1">
            <div className="text-center mb-2">
              <span className="text-xs text-green-400 uppercase tracking-wider">Your Deck</span>
              <h3 className="text-sm font-medium text-white">{scenario.yourArchetype}</h3>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {scenario.yourDeck.slice(0, 6).map(card => (
                <img
                  key={card.name}
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full rounded border border-green-500/30"
                />
              ))}
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-white/20">VS</span>
          </div>

          {/* Their Deck */}
          <div className="flex-1">
            <div className="text-center mb-2">
              <span className="text-xs text-red-400 uppercase tracking-wider">Opponent</span>
              <h3 className="text-sm font-medium text-white">{scenario.theirArchetype}</h3>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {scenario.theirDeck.slice(0, 6).map(card => (
                <img
                  key={card.name}
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full rounded border border-red-500/30"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Role Buttons */}
        {!revealed && (
          <div className="flex gap-4 w-full max-w-md mt-4">
            <button
              onClick={() => handleAnswer('beatdown')}
              className="flex-1 flex flex-col items-center gap-2 py-5 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all"
            >
              <Swords className="w-8 h-8 text-orange-400" />
              <span className="text-lg font-medium text-orange-400">Beatdown</span>
              <span className="text-xs text-white/40">Be aggressive, attack!</span>
              <span className="text-xs text-white/30 font-mono">A / B</span>
            </button>
            <button
              onClick={() => handleAnswer('control')}
              className="flex-1 flex flex-col items-center gap-2 py-5 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
            >
              <Shield className="w-8 h-8 text-blue-400" />
              <span className="text-lg font-medium text-blue-400">Control</span>
              <span className="text-xs text-white/40">Play defensive, grind</span>
              <span className="text-xs text-white/30 font-mono">D / C</span>
            </button>
          </div>
        )}

        {/* Result */}
        {revealed && (
          <div className="w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`flex flex-col items-center gap-2 py-4 px-4 rounded-xl ${
              isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? 'Correct!' : `Wrong - You should be the ${scenario.correctRole}`}
                </span>
              </div>
              <p className="text-sm text-white/60 text-center">{scenario.explanation}</p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all"
            >
              Next Matchup <span className="text-white/40 text-sm ml-2">Enter</span>
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
