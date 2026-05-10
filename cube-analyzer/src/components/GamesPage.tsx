import { useState, useCallback, useEffect } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  type WheelLikelihood,
} from '../services/eloHelpers';
import { Scale, CircleDot, Layers, Trophy, ChevronLeft, Flame } from 'lucide-react';

interface GamesPageProps {
  cards: CubeCard[];
}

type GameType = 'menu' | 'higher-lower' | 'wheel-or-not' | 'first-pick' | 'color-commit';

interface GameStats {
  higherLower: { played: number; correct: number; streak: number; bestStreak: number };
  wheelOrNot: { played: number; correct: number; streak: number; bestStreak: number };
  firstPick: { played: number; correct: number; streak: number; bestStreak: number };
  colorCommit: { played: number; correct: number; streak: number; bestStreak: number };
}

const STORAGE_KEY = 'cube-games-stats';

function loadStats(): GameStats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    higherLower: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    wheelOrNot: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    firstPick: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    colorCommit: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
  };
}

function saveStats(stats: GameStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomCards(cards: CubeCard[], n: number): CubeCard[] {
  const withElo = cards.filter(c => getEloData(c.name));
  return shuffleArray(withElo).slice(0, n);
}

export function GamesPage({ cards }: GamesPageProps) {
  const [game, setGame] = useState<GameType>('menu');
  const [stats, setStats] = useState<GameStats>(loadStats);

  const updateStats = useCallback((gameKey: keyof GameStats, correct: boolean) => {
    setStats(prev => {
      const gameStats = prev[gameKey];
      const newStreak = correct ? gameStats.streak + 1 : 0;
      const updated = {
        ...prev,
        [gameKey]: {
          played: gameStats.played + 1,
          correct: gameStats.correct + (correct ? 1 : 0),
          streak: newStreak,
          bestStreak: Math.max(gameStats.bestStreak, newStreak),
        },
      };
      saveStats(updated);
      return updated;
    });
  }, []);

  const games = [
    { id: 'higher-lower' as GameType, name: 'Higher or Lower', desc: 'Which has higher ELO?', icon: Scale, color: 'blue', stats: stats.higherLower },
    { id: 'wheel-or-not' as GameType, name: 'Will It Wheel?', desc: 'Will it come back around?', icon: CircleDot, color: 'green', stats: stats.wheelOrNot },
    { id: 'first-pick' as GameType, name: 'First Pickable?', desc: 'Is this P1P1 worthy?', icon: Trophy, color: 'amber', stats: stats.firstPick },
    { id: 'color-commit' as GameType, name: 'Stay in Lane', desc: 'Pick the on-color card', icon: Layers, color: 'purple', stats: stats.colorCommit },
  ];

  if (game !== 'menu') {
    const GameComponent = {
      'higher-lower': HigherLowerGame,
      'wheel-or-not': WheelOrNotGame,
      'first-pick': FirstPickGame,
      'color-commit': ColorCommitGame,
    }[game];

    const gameKey = {
      'higher-lower': 'higherLower',
      'wheel-or-not': 'wheelOrNot',
      'first-pick': 'firstPick',
      'color-commit': 'colorCommit',
    }[game] as keyof GameStats;

    return (
      <GameComponent
        cards={cards}
        stats={stats[gameKey]}
        onUpdate={(c) => updateStats(gameKey, c)}
        onBack={() => setGame('menu')}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Draft Games</h1>
        <p className="text-sm text-white/50 mt-1">Quick games to sharpen your instincts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {games.map(g => {
          const accuracy = g.stats.played > 0 ? Math.round((g.stats.correct / g.stats.played) * 100) : null;
          const colorClasses = {
            blue: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
            green: 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20',
            amber: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
            purple: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
          }[g.color];
          const iconColor = {
            blue: 'text-blue-400',
            green: 'text-green-400',
            amber: 'text-amber-400',
            purple: 'text-purple-400',
          }[g.color];

          return (
            <button
              key={g.id}
              onClick={() => setGame(g.id)}
              className={`${colorClasses} border rounded-xl p-4 text-left transition-all active:scale-[0.98]`}
            >
              <div className="flex items-center gap-3">
                <g.icon className={`w-8 h-8 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{g.name}</div>
                  <div className="text-xs text-white/50">{g.desc}</div>
                </div>
                {accuracy !== null && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{accuracy}%</div>
                    <div className="text-[10px] text-white/40">{g.stats.played} played</div>
                  </div>
                )}
              </div>
              {g.stats.bestStreak > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-400/80">
                  <Flame className="w-3 h-3" />
                  Best streak: {g.stats.bestStreak}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ SHARED GAME WRAPPER ============
interface GameComponentProps {
  cards: CubeCard[];
  stats: { played: number; correct: number; streak: number; bestStreak: number };
  onUpdate: (correct: boolean) => void;
  onBack: () => void;
}

function GameHeader({ title, subtitle, streak, onBack }: { title: string; subtitle: string; streak: number; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back</span>
      </button>
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
      <div className="text-right min-w-[40px]">
        {streak > 0 && (
          <div className="flex items-center gap-1 text-amber-400">
            <Flame className="w-4 h-4" />
            <span className="font-bold">{streak}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GameStats({ stats }: { stats: { played: number; correct: number; bestStreak: number } }) {
  if (stats.played === 0) return null;
  return (
    <div className="text-center text-xs text-white/40 mt-4">
      {Math.round((stats.correct / stats.played) * 100)}% accuracy ({stats.correct}/{stats.played})
      {stats.bestStreak > 0 && <span className="ml-2">· Best: {stats.bestStreak}</span>}
    </div>
  );
}

// ============ GAME 1: Higher or Lower ============
function HigherLowerGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [pair, setPair] = useState<[CubeCard, CubeCard] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<0 | 1 | null>(null);

  const newRound = useCallback(() => {
    const [a, b] = getRandomCards(cards, 2);
    setPair([a, b]);
    setRevealed(false);
    setPicked(null);
  }, [cards]);

  useEffect(() => { newRound(); }, [newRound]);

  if (!pair) return null;

  const eloA = getEloData(pair[0].name)?.elo || 0;
  const eloB = getEloData(pair[1].name)?.elo || 0;
  const correctIndex = eloA >= eloB ? 0 : 1;

  const handlePick = (index: 0 | 1) => {
    if (revealed) return;
    setPicked(index);
    setRevealed(true);
    onUpdate(index === correctIndex);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <GameHeader title="Higher or Lower" subtitle="Which card has higher ELO?" streak={stats.streak} onBack={onBack} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {pair.map((card, idx) => {
          const elo = idx === 0 ? eloA : eloB;
          const isCorrect = idx === correctIndex;
          const isPicked = picked === idx;

          return (
            <button
              key={card.id}
              onClick={() => handlePick(idx as 0 | 1)}
              disabled={revealed}
              className={`relative rounded-xl overflow-hidden transition-all ${
                revealed
                  ? isCorrect ? 'ring-2 ring-green-500' : isPicked ? 'ring-2 ring-red-500 opacity-70' : 'opacity-50'
                  : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full" />
              {revealed && (
                <div className={`absolute bottom-0 left-0 right-0 py-2 text-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                  <div className="text-white font-bold">{Math.round(elo)}</div>
                  <div className="text-white/80 text-[10px]">ELO</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="text-center mt-4 space-y-3">
          <div className={`text-lg font-bold ${picked === correctIndex ? 'text-green-400' : 'text-red-400'}`}>
            {picked === correctIndex ? 'Correct!' : 'Wrong!'}{' '}
            <span className="text-white/50 text-sm font-normal">Diff: {Math.abs(eloA - eloB).toFixed(0)}</span>
          </div>
          <button onClick={newRound} className="px-6 py-2.5 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-colors">
            Next
          </button>
        </div>
      )}

      <GameStats stats={stats} />
    </div>
  );
}

// ============ GAME 2: Will It Wheel? ============
function WheelOrNotGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [card, setCard] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<WheelLikelihood | null>(null);

  const newRound = useCallback(() => {
    const [c] = getRandomCards(cards, 1);
    setCard(c);
    setRevealed(false);
    setGuess(null);
  }, [cards]);

  useEffect(() => { newRound(); }, [newRound]);

  if (!card) return null;

  const actual = getWheelLikelihood(card.name);
  const percentile = getPercentile(card.name);

  const handleGuess = (g: WheelLikelihood) => {
    if (revealed) return;
    setGuess(g);
    setRevealed(true);
    onUpdate(g === actual);
  };

  return (
    <div className="max-w-sm mx-auto">
      <GameHeader title="Will It Wheel?" subtitle="Will this card come back around?" streak={stats.streak} onBack={onBack} />

      <div className="flex justify-center mb-4">
        <img src={getCardImage(card)} alt={card.name} className="w-48 sm:w-56 rounded-xl shadow-xl" />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { value: 'likely' as WheelLikelihood, label: 'Yes', color: 'green' },
          { value: 'maybe' as WheelLikelihood, label: 'Maybe', color: 'amber' },
          { value: 'unlikely' as WheelLikelihood, label: 'No', color: 'red' },
        ].map(opt => {
          const isCorrect = opt.value === actual;
          const isGuessed = opt.value === guess;
          const baseColor = {
            green: revealed && isCorrect ? 'bg-green-500 text-white' : 'bg-green-500/20 text-green-400',
            amber: revealed && isCorrect ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-400',
            red: revealed && isCorrect ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-400',
          }[opt.color];

          return (
            <button
              key={opt.value}
              onClick={() => handleGuess(opt.value)}
              disabled={revealed}
              className={`py-3 rounded-xl font-semibold transition-all ${
                revealed
                  ? isCorrect ? baseColor : isGuessed ? 'bg-red-500/30 text-red-300' : 'bg-white/5 text-white/30'
                  : `${baseColor} hover:opacity-80 active:scale-95`
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="text-center space-y-3">
          <div className={`font-bold ${guess === actual ? 'text-green-400' : 'text-red-400'}`}>
            {guess === actual ? 'Correct!' : 'Wrong!'}{' '}
            <span className="text-white/50 text-sm font-normal">Top {100 - percentile}%</span>
          </div>
          <button onClick={newRound} className="px-6 py-2.5 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-colors">
            Next
          </button>
        </div>
      )}

      <GameStats stats={stats} />
    </div>
  );
}

// ============ GAME 3: First Pickable? ============
function FirstPickGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [card, setCard] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<boolean | null>(null);

  const newRound = useCallback(() => {
    const [c] = getRandomCards(cards, 1);
    setCard(c);
    setRevealed(false);
    setGuess(null);
  }, [cards]);

  useEffect(() => { newRound(); }, [newRound]);

  if (!card) return null;

  const percentile = getPercentile(card.name);
  const elo = getEloData(card.name)?.elo || 0;
  const isFirstPickable = percentile >= 75;

  const handleGuess = (g: boolean) => {
    if (revealed) return;
    setGuess(g);
    setRevealed(true);
    onUpdate(g === isFirstPickable);
  };

  return (
    <div className="max-w-sm mx-auto">
      <GameHeader title="First Pickable?" subtitle="Is this card P1P1 worthy? (Top 25%)" streak={stats.streak} onBack={onBack} />

      <div className="flex justify-center mb-4">
        <img src={getCardImage(card)} alt={card.name} className="w-48 sm:w-56 rounded-xl shadow-xl" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => handleGuess(true)}
          disabled={revealed}
          className={`py-4 rounded-xl font-bold text-lg transition-all ${
            revealed
              ? isFirstPickable ? 'bg-green-500 text-white' : guess === true ? 'bg-red-500/50 text-white/70' : 'bg-white/5 text-white/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 active:scale-95'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => handleGuess(false)}
          disabled={revealed}
          className={`py-4 rounded-xl font-bold text-lg transition-all ${
            revealed
              ? !isFirstPickable ? 'bg-green-500 text-white' : guess === false ? 'bg-red-500/50 text-white/70' : 'bg-white/5 text-white/30'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95'
          }`}
        >
          No
        </button>
      </div>

      {revealed && (
        <div className="text-center space-y-3">
          <div className={`font-bold ${guess === isFirstPickable ? 'text-green-400' : 'text-red-400'}`}>
            {guess === isFirstPickable ? 'Correct!' : 'Wrong!'}{' '}
            <span className="text-white/50 text-sm font-normal">ELO {Math.round(elo)} · Top {100 - percentile}%</span>
          </div>
          <button onClick={newRound} className="px-6 py-2.5 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-colors">
            Next
          </button>
        </div>
      )}

      <GameStats stats={stats} />
    </div>
  );
}

// ============ GAME 4: Stay in Lane ============
function ColorCommitGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [state, setState] = useState<{
    deckColors: string[];
    options: CubeCard[];
    correctIndex: number;
  } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const newRound = useCallback(() => {
    const allColors = ['W', 'U', 'B', 'R', 'G'];
    const deckColors = shuffleArray(allColors).slice(0, 2);
    const withElo = cards.filter(c => getEloData(c.name));

    const onColorCards = withElo.filter(c => {
      const cardColors = c.colors || [];
      if (cardColors.length === 0) return true;
      return cardColors.some(col => deckColors.includes(col));
    });

    const offColorCards = withElo.filter(c => {
      const cardColors = c.colors || [];
      if (cardColors.length === 0) return false;
      return !cardColors.some(col => deckColors.includes(col));
    });

    if (onColorCards.length === 0 || offColorCards.length < 2) {
      const random = getRandomCards(cards, 3);
      setState({ deckColors, options: random, correctIndex: 0 });
    } else {
      const onColor = shuffleArray(onColorCards)[0];
      const offCards = shuffleArray(offColorCards).slice(0, 2);
      const options = shuffleArray([onColor, ...offCards]);
      setState({ deckColors, options, correctIndex: options.findIndex(c => c.id === onColor.id) });
    }

    setRevealed(false);
    setPicked(null);
  }, [cards]);

  useEffect(() => { newRound(); }, [newRound]);

  if (!state) return null;

  const handlePick = (index: number) => {
    if (revealed) return;
    setPicked(index);
    setRevealed(true);
    onUpdate(index === state.correctIndex);
  };

  const colorLabels: Record<string, { name: string; bg: string }> = {
    W: { name: 'W', bg: 'bg-amber-100 text-amber-900' },
    U: { name: 'U', bg: 'bg-blue-500 text-white' },
    B: { name: 'B', bg: 'bg-neutral-600 text-white' },
    R: { name: 'R', bg: 'bg-red-500 text-white' },
    G: { name: 'G', bg: 'bg-green-600 text-white' },
  };

  return (
    <div className="max-w-2xl mx-auto">
      <GameHeader title="Stay in Lane" subtitle="Pick the card that fits your colors" streak={stats.streak} onBack={onBack} />

      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-sm text-white/50">Your colors:</span>
        {state.deckColors.map(c => (
          <span key={c} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${colorLabels[c].bg}`}>
            {colorLabels[c].name}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {state.options.map((card, idx) => {
          const isCorrect = idx === state.correctIndex;
          const isPicked = picked === idx;

          return (
            <button
              key={card.id}
              onClick={() => handlePick(idx)}
              disabled={revealed}
              className={`relative rounded-xl overflow-hidden transition-all ${
                revealed
                  ? isCorrect ? 'ring-2 ring-green-500' : isPicked ? 'ring-2 ring-red-500 opacity-70' : 'opacity-50'
                  : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full" />
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="text-center mt-4 space-y-3">
          <div className={`font-bold ${picked === state.correctIndex ? 'text-green-400' : 'text-red-400'}`}>
            {picked === state.correctIndex ? 'Correct! You stayed in lane.' : 'Wrong! The highlighted card fits better.'}
          </div>
          <button onClick={newRound} className="px-6 py-2.5 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-colors">
            Next
          </button>
        </div>
      )}

      <GameStats stats={stats} />
    </div>
  );
}
