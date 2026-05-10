import { useState, useCallback, useEffect } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  type WheelLikelihood,
} from '../services/eloHelpers';
import { Scale, CircleDot, Layers, Trophy, ChevronRight, Check, X } from 'lucide-react';

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

// Get N random cards with ELO data
function getRandomCards(cards: CubeCard[], n: number): CubeCard[] {
  const withElo = cards.filter(c => getEloData(c.name));
  const shuffled = [...withElo].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
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

  const resetStats = useCallback(() => {
    const empty: GameStats = {
      higherLower: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
      wheelOrNot: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
      firstPick: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
      colorCommit: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    };
    setStats(empty);
    saveStats(empty);
  }, []);

  if (game === 'higher-lower') {
    return <HigherLowerGame cards={cards} stats={stats.higherLower} onUpdate={(c) => updateStats('higherLower', c)} onBack={() => setGame('menu')} />;
  }
  if (game === 'wheel-or-not') {
    return <WheelOrNotGame cards={cards} stats={stats.wheelOrNot} onUpdate={(c) => updateStats('wheelOrNot', c)} onBack={() => setGame('menu')} />;
  }
  if (game === 'first-pick') {
    return <FirstPickGame cards={cards} stats={stats.firstPick} onUpdate={(c) => updateStats('firstPick', c)} onBack={() => setGame('menu')} />;
  }
  if (game === 'color-commit') {
    return <ColorCommitGame cards={cards} stats={stats.colorCommit} onUpdate={(c) => updateStats('colorCommit', c)} onBack={() => setGame('menu')} />;
  }

  // Menu
  const games = [
    {
      id: 'higher-lower' as GameType,
      name: 'Higher or Lower',
      description: 'Which card has the higher ELO rating?',
      icon: Scale,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      stats: stats.higherLower,
    },
    {
      id: 'wheel-or-not' as GameType,
      name: 'Will It Wheel?',
      description: 'Guess if the card will make it back around',
      icon: CircleDot,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      stats: stats.wheelOrNot,
    },
    {
      id: 'first-pick' as GameType,
      name: 'First Pickable?',
      description: 'Is this card worth a P1P1?',
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      stats: stats.firstPick,
    },
    {
      id: 'color-commit' as GameType,
      name: 'Stay in Lane',
      description: 'Pick the card that fits your colors best',
      icon: Layers,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      stats: stats.colorCommit,
    },
  ];

  const totalPlayed = Object.values(stats).reduce((sum, s) => sum + s.played, 0);
  const totalCorrect = Object.values(stats).reduce((sum, s) => sum + s.correct, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Draft Games</h2>
          <p className="text-sm text-white/50 mt-1">Quick games to sharpen your drafting instincts</p>
        </div>
        {totalPlayed > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{Math.round((totalCorrect / totalPlayed) * 100)}%</div>
            <div className="text-xs text-white/40">{totalCorrect}/{totalPlayed} correct</div>
          </div>
        )}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.map(g => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className={`${g.bg} ${g.border} border rounded-xl p-5 text-left hover:scale-[1.02] active:scale-[0.98] transition-all group`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${g.bg} flex items-center justify-center`}>
                <g.icon className={`w-6 h-6 ${g.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${g.color}`}>{g.name}</h3>
                  <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/50 transition-colors" />
                </div>
                <p className="text-sm text-white/50 mt-1">{g.description}</p>
                {g.stats.played > 0 && (
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="text-white/60">
                      {Math.round((g.stats.correct / g.stats.played) * 100)}% accuracy
                    </span>
                    {g.stats.bestStreak > 0 && (
                      <span className="text-amber-400/80">
                        Best: {g.stats.bestStreak} streak
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Reset Stats */}
      {totalPlayed > 0 && (
        <div className="text-center pt-4">
          <button
            onClick={resetStats}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Reset all stats
          </button>
        </div>
      )}
    </div>
  );
}

// ============ GAME 1: Higher or Lower ============
interface GameComponentProps {
  cards: CubeCard[];
  stats: { played: number; correct: number; streak: number; bestStreak: number };
  onUpdate: (correct: boolean) => void;
  onBack: () => void;
}

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/50 hover:text-white text-sm flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Higher or Lower</h2>
          <p className="text-xs text-white/40">Which card has higher ELO?</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-400">{stats.streak}</div>
          <div className="text-[10px] text-white/40">streak</div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
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
                  ? isCorrect
                    ? 'ring-4 ring-green-500'
                    : isPicked
                    ? 'ring-4 ring-red-500 opacity-60'
                    : 'opacity-60'
                  : 'hover:scale-105 active:scale-95'
              }`}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full" />
              {revealed && (
                <div className={`absolute bottom-0 left-0 right-0 p-3 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                  <div className="text-white font-bold text-lg">{Math.round(elo)}</div>
                  <div className="text-white/80 text-xs">ELO</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Result & Next */}
      {revealed && (
        <div className="text-center space-y-4">
          <div className={`text-xl font-bold ${picked === correctIndex ? 'text-green-400' : 'text-red-400'}`}>
            {picked === correctIndex ? 'Correct!' : 'Wrong!'}
            <span className="text-white/50 text-base ml-2">
              Difference: {Math.abs(eloA - eloB).toFixed(0)} ELO
            </span>
          </div>
          <button
            onClick={newRound}
            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            Next Round
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-white/40">
        {stats.played > 0 && (
          <span>{Math.round((stats.correct / stats.played) * 100)}% accuracy ({stats.correct}/{stats.played})</span>
        )}
        {stats.bestStreak > 0 && <span className="ml-3">Best streak: {stats.bestStreak}</span>}
      </div>
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

  const options: { value: WheelLikelihood; label: string; color: string }[] = [
    { value: 'likely', label: 'Yes, will wheel', color: 'bg-green-500' },
    { value: 'maybe', label: 'Maybe', color: 'bg-amber-500' },
    { value: 'unlikely', label: 'No way', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/50 hover:text-white text-sm flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Will It Wheel?</h2>
          <p className="text-xs text-white/40">Will this card come back around?</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-400">{stats.streak}</div>
          <div className="text-[10px] text-white/40">streak</div>
        </div>
      </div>

      {/* Card */}
      <div className="flex justify-center">
        <div className="w-64 max-w-[70vw]">
          <img src={getCardImage(card)} alt={card.name} className="w-full rounded-xl shadow-2xl" />
        </div>
      </div>

      {/* Options */}
      <div className="flex gap-3 justify-center">
        {options.map(opt => {
          const isCorrect = opt.value === actual;
          const isGuessed = opt.value === guess;

          return (
            <button
              key={opt.value}
              onClick={() => handleGuess(opt.value)}
              disabled={revealed}
              className={`px-4 py-3 rounded-xl font-medium transition-all ${
                revealed
                  ? isCorrect
                    ? `${opt.color} text-white`
                    : isGuessed
                    ? 'bg-red-500/50 text-white/50'
                    : 'bg-white/5 text-white/30'
                  : `bg-white/10 text-white hover:bg-white/20 active:scale-95`
              }`}
            >
              {opt.label}
              {revealed && isCorrect && <Check className="w-4 h-4 inline ml-2" />}
              {revealed && isGuessed && !isCorrect && <X className="w-4 h-4 inline ml-2" />}
            </button>
          );
        })}
      </div>

      {/* Result */}
      {revealed && (
        <div className="text-center space-y-3">
          <div className={`text-xl font-bold ${guess === actual ? 'text-green-400' : 'text-red-400'}`}>
            {guess === actual ? 'Correct!' : 'Wrong!'}
          </div>
          <p className="text-sm text-white/50">
            Top {100 - percentile}% pick rate — {actual === 'likely' ? 'usually wheels' : actual === 'maybe' ? 'sometimes wheels' : 'rarely wheels'}
          </p>
          <button
            onClick={newRound}
            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            Next Card
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-white/40">
        {stats.played > 0 && (
          <span>{Math.round((stats.correct / stats.played) * 100)}% accuracy ({stats.correct}/{stats.played})</span>
        )}
        {stats.bestStreak > 0 && <span className="ml-3">Best streak: {stats.bestStreak}</span>}
      </div>
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
  const isFirstPickable = percentile >= 75; // Top 25%

  const handleGuess = (g: boolean) => {
    if (revealed) return;
    setGuess(g);
    setRevealed(true);
    onUpdate(g === isFirstPickable);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/50 hover:text-white text-sm flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">First Pickable?</h2>
          <p className="text-xs text-white/40">Is this card P1P1 worthy? (Top 25%)</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-amber-400">{stats.streak}</div>
          <div className="text-[10px] text-white/40">streak</div>
        </div>
      </div>

      {/* Card */}
      <div className="flex justify-center">
        <div className="w-64 max-w-[70vw]">
          <img src={getCardImage(card)} alt={card.name} className="w-full rounded-xl shadow-2xl" />
        </div>
      </div>

      {/* Options */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => handleGuess(true)}
          disabled={revealed}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
            revealed
              ? isFirstPickable
                ? 'bg-green-500 text-white'
                : guess === true
                ? 'bg-red-500/50 text-white/50'
                : 'bg-white/5 text-white/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 active:scale-95'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => handleGuess(false)}
          disabled={revealed}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
            revealed
              ? !isFirstPickable
                ? 'bg-green-500 text-white'
                : guess === false
                ? 'bg-red-500/50 text-white/50'
                : 'bg-white/5 text-white/30'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95'
          }`}
        >
          No
        </button>
      </div>

      {/* Result */}
      {revealed && (
        <div className="text-center space-y-3">
          <div className={`text-xl font-bold ${guess === isFirstPickable ? 'text-green-400' : 'text-red-400'}`}>
            {guess === isFirstPickable ? 'Correct!' : 'Wrong!'}
          </div>
          <p className="text-sm text-white/50">
            ELO {Math.round(elo)} — Top {100 - percentile}% — {isFirstPickable ? 'Definitely first pickable' : 'Not quite P1P1 material'}
          </p>
          <button
            onClick={newRound}
            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            Next Card
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-white/40">
        {stats.played > 0 && (
          <span>{Math.round((stats.correct / stats.played) * 100)}% accuracy ({stats.correct}/{stats.played})</span>
        )}
        {stats.bestStreak > 0 && <span className="ml-3">Best streak: {stats.bestStreak}</span>}
      </div>
    </div>
  );
}

// ============ GAME 4: Stay in Lane (Color Commit) ============
function ColorCommitGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [state, setState] = useState<{
    deckColors: string[];
    options: CubeCard[];
    correctIndex: number;
  } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const newRound = useCallback(() => {
    // Pick 2 random colors for the "deck"
    const allColors = ['W', 'U', 'B', 'R', 'G'];
    const shuffledColors = [...allColors].sort(() => Math.random() - 0.5);
    const deckColors = shuffledColors.slice(0, 2);

    // Get cards with ELO data
    const withElo = cards.filter(c => getEloData(c.name));

    // Find one on-color card and two off-color cards
    const onColorCards = withElo.filter(c => {
      const cardColors = c.colors || [];
      if (cardColors.length === 0) return true; // Colorless fits anywhere
      return cardColors.some(col => deckColors.includes(col));
    });

    const offColorCards = withElo.filter(c => {
      const cardColors = c.colors || [];
      if (cardColors.length === 0) return false;
      return !cardColors.some(col => deckColors.includes(col));
    });

    if (onColorCards.length === 0 || offColorCards.length < 2) {
      // Fallback: just random
      const random = getRandomCards(cards, 3);
      setState({
        deckColors,
        options: random,
        correctIndex: 0,
      });
    } else {
      // Pick one good on-color card
      const sortedOnColor = onColorCards.sort((a, b) => {
        const eloA = getEloData(a.name)?.elo || 0;
        const eloB = getEloData(b.name)?.elo || 0;
        return eloB - eloA;
      });
      const onColor = sortedOnColor[Math.floor(Math.random() * Math.min(50, sortedOnColor.length))];

      // Pick two off-color cards (can be higher ELO to make it tempting)
      const shuffledOff = [...offColorCards].sort(() => Math.random() - 0.5);
      const off1 = shuffledOff[0];
      const off2 = shuffledOff[1];

      // Shuffle positions
      const options = [onColor, off1, off2].sort(() => Math.random() - 0.5);
      const correctIndex = options.findIndex(c => c.id === onColor.id);

      setState({
        deckColors,
        options,
        correctIndex,
      });
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
    W: { name: 'White', bg: 'bg-amber-100 text-amber-900' },
    U: { name: 'Blue', bg: 'bg-blue-500 text-white' },
    B: { name: 'Black', bg: 'bg-neutral-600 text-white' },
    R: { name: 'Red', bg: 'bg-red-500 text-white' },
    G: { name: 'Green', bg: 'bg-green-600 text-white' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/50 hover:text-white text-sm flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Stay in Lane</h2>
          <p className="text-xs text-white/40">Pick the card that fits your colors</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-purple-400">{stats.streak}</div>
          <div className="text-[10px] text-white/40">streak</div>
        </div>
      </div>

      {/* Your Colors */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-white/50">Your deck:</span>
        {state.deckColors.map(c => (
          <span key={c} className={`px-3 py-1 rounded-lg text-sm font-bold ${colorLabels[c].bg}`}>
            {colorLabels[c].name}
          </span>
        ))}
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-3">
        {state.options.map((card, idx) => {
          const isCorrect = idx === state.correctIndex;
          const isPicked = picked === idx;
          const elo = getEloData(card.name)?.elo || 0;

          return (
            <button
              key={card.id}
              onClick={() => handlePick(idx)}
              disabled={revealed}
              className={`relative rounded-xl overflow-hidden transition-all ${
                revealed
                  ? isCorrect
                    ? 'ring-4 ring-green-500'
                    : isPicked
                    ? 'ring-4 ring-red-500 opacity-60'
                    : 'opacity-50'
                  : 'hover:scale-105 active:scale-95'
              }`}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full" />
              {revealed && (
                <div className={`absolute bottom-0 left-0 right-0 p-2 text-center ${isCorrect ? 'bg-green-500' : 'bg-black/80'}`}>
                  <div className="text-white text-xs font-medium">{Math.round(elo)} ELO</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Result */}
      {revealed && (
        <div className="text-center space-y-3">
          <div className={`text-xl font-bold ${picked === state.correctIndex ? 'text-green-400' : 'text-red-400'}`}>
            {picked === state.correctIndex ? 'Correct!' : 'Wrong!'}
          </div>
          <p className="text-sm text-white/50">
            {picked === state.correctIndex
              ? 'You stayed in your colors!'
              : 'The highlighted card fits your colors better'}
          </p>
          <button
            onClick={newRound}
            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            Next Round
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-white/40">
        {stats.played > 0 && (
          <span>{Math.round((stats.correct / stats.played) * 100)}% accuracy ({stats.correct}/{stats.played})</span>
        )}
        {stats.bestStreak > 0 && <span className="ml-3">Best streak: {stats.bestStreak}</span>}
      </div>
    </div>
  );
}
