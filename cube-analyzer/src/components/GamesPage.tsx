import { useState, useCallback, useEffect } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  type WheelLikelihood,
} from '../services/eloHelpers';
import { Scale, CircleDot, Layers, Trophy, ChevronLeft, Flame, Timer, Hash, Sparkles, Package, Hand, Radio, GraduationCap, TrendingUp, TrendingDown, Minus, BarChart3, ArrowLeftRight } from 'lucide-react';
import { srs, boolToQuality, type SkillCategory, type SkillRating } from '../services/spacedRepetition';

interface GamesPageProps {
  cards: CubeCard[];
}

type GameType = 'menu' | 'higher-lower' | 'wheel-or-not' | 'first-pick' | 'color-commit' | 'speed-round' | 'guess-cmc' | 'synergy-snap' | 'pack-p1p1' | 'mulligan-trainer' | 'signal-quiz' | 'archetype-flashcards' | 'sideboard-drill';

interface GameStats {
  higherLower: { played: number; correct: number; streak: number; bestStreak: number };
  wheelOrNot: { played: number; correct: number; streak: number; bestStreak: number };
  firstPick: { played: number; correct: number; streak: number; bestStreak: number };
  colorCommit: { played: number; correct: number; streak: number; bestStreak: number };
  speedRound: { played: number; correct: number; streak: number; bestStreak: number };
  guessCmc: { played: number; correct: number; streak: number; bestStreak: number };
  synergySnap: { played: number; correct: number; streak: number; bestStreak: number };
  packP1P1: { played: number; correct: number; streak: number; bestStreak: number };
  mulliganTrainer: { played: number; correct: number; streak: number; bestStreak: number };
  signalQuiz: { played: number; correct: number; streak: number; bestStreak: number };
  archetypeFlashcards: { played: number; correct: number; streak: number; bestStreak: number };
  sideboardDrill: { played: number; correct: number; streak: number; bestStreak: number };
}

const STORAGE_KEY = 'cube-games-stats';

function loadStats(): GameStats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure new games have default stats
      return {
        higherLower: parsed.higherLower || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        wheelOrNot: parsed.wheelOrNot || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        firstPick: parsed.firstPick || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        colorCommit: parsed.colorCommit || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        speedRound: parsed.speedRound || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        guessCmc: parsed.guessCmc || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        synergySnap: parsed.synergySnap || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        packP1P1: parsed.packP1P1 || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        mulliganTrainer: parsed.mulliganTrainer || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        signalQuiz: parsed.signalQuiz || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        archetypeFlashcards: parsed.archetypeFlashcards || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        sideboardDrill: parsed.sideboardDrill || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
      };
    }
  } catch {}
  return {
    higherLower: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    wheelOrNot: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    firstPick: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    colorCommit: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    speedRound: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    guessCmc: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    synergySnap: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    packP1P1: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    mulliganTrainer: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    signalQuiz: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    archetypeFlashcards: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    sideboardDrill: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
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
    { id: 'pack-p1p1' as GameType, name: 'Pack P1P1', desc: 'Pick the best card from a pack', icon: Package, color: 'orange', stats: stats.packP1P1, featured: true },
    { id: 'mulligan-trainer' as GameType, name: 'Mulligan Trainer', desc: 'Keep or mull this hand?', icon: Hand, color: 'indigo', stats: stats.mulliganTrainer, featured: true },
    { id: 'signal-quiz' as GameType, name: 'Signal Quiz', desc: 'What does this late pick mean?', icon: Radio, color: 'cyan', stats: stats.signalQuiz, featured: true },
    { id: 'archetype-flashcards' as GameType, name: 'Archetype Drills', desc: 'Name the key cards', icon: GraduationCap, color: 'emerald', stats: stats.archetypeFlashcards, featured: true },
    { id: 'sideboard-drill' as GameType, name: 'Sideboard Guide', desc: 'What comes in/out?', icon: ArrowLeftRight, color: 'rose', stats: stats.sideboardDrill, featured: true },
    { id: 'higher-lower' as GameType, name: 'Higher or Lower', desc: 'Which has higher ELO?', icon: Scale, color: 'blue', stats: stats.higherLower },
    { id: 'speed-round' as GameType, name: 'Speed Round', desc: '30 seconds, how many right?', icon: Timer, color: 'red', stats: stats.speedRound },
    { id: 'wheel-or-not' as GameType, name: 'Will It Wheel?', desc: 'Will it come back around?', icon: CircleDot, color: 'green', stats: stats.wheelOrNot },
    { id: 'first-pick' as GameType, name: 'First Pickable?', desc: 'Is this P1P1 worthy?', icon: Trophy, color: 'amber', stats: stats.firstPick },
    { id: 'guess-cmc' as GameType, name: 'Guess the CMC', desc: 'What does this card cost?', icon: Hash, color: 'cyan', stats: stats.guessCmc },
    { id: 'synergy-snap' as GameType, name: 'Synergy Snap', desc: 'Do these cards combo?', icon: Sparkles, color: 'pink', stats: stats.synergySnap },
    { id: 'color-commit' as GameType, name: 'Stay in Lane', desc: 'Pick the on-color card', icon: Layers, color: 'purple', stats: stats.colorCommit },
  ];

  if (game !== 'menu') {
    const GameComponent = {
      'pack-p1p1': PackP1P1Game,
      'mulligan-trainer': MulliganTrainerGame,
      'signal-quiz': SignalQuizGame,
      'archetype-flashcards': ArchetypeFlashcardsGame,
      'sideboard-drill': SideboardDrillGame,
      'higher-lower': HigherLowerGame,
      'wheel-or-not': WheelOrNotGame,
      'first-pick': FirstPickGame,
      'color-commit': ColorCommitGame,
      'speed-round': SpeedRoundGame,
      'guess-cmc': GuessCmcGame,
      'synergy-snap': SynergySnapGame,
    }[game];

    const gameKey = {
      'pack-p1p1': 'packP1P1',
      'mulligan-trainer': 'mulliganTrainer',
      'signal-quiz': 'signalQuiz',
      'archetype-flashcards': 'archetypeFlashcards',
      'sideboard-drill': 'sideboardDrill',
      'higher-lower': 'higherLower',
      'wheel-or-not': 'wheelOrNot',
      'first-pick': 'firstPick',
      'color-commit': 'colorCommit',
      'speed-round': 'speedRound',
      'guess-cmc': 'guessCmc',
      'synergy-snap': 'synergySnap',
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

  // Get skill data for dashboard
  const skillRatings = srs.getSkillRatings();
  const mastery = srs.getOverallMastery();
  const totalReviews = srs.getTotalReviews();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Training</h1>
        <p className="text-sm text-white/50 mt-1">Drills to internalize before draft day</p>
      </div>

      {/* Progress Dashboard */}
      <ProgressDashboard
        mastery={mastery}
        skillRatings={skillRatings}
        totalReviews={totalReviews}
      />

      {/* Featured Training Modes */}
      <div>
        <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Core Drills</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {games.filter(g => g.featured).map(g => (
            <GameMenuButton key={g.id} game={g} onSelect={setGame} />
          ))}
        </div>
      </div>

      {/* Other Games */}
      <div>
        <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Quick Games</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {games.filter(g => !g.featured).map(g => (
            <GameMenuButton key={g.id} game={g} onSelect={setGame} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ PROGRESS DASHBOARD ============
const SKILL_NAMES: Record<SkillCategory, string> = {
  'card-evaluation': 'Card Evaluation',
  'pack-picks': 'Pack Picks',
  'mulligans': 'Mulligans',
  'signals': 'Signals',
  'archetypes': 'Archetypes',
  'sideboard': 'Sideboard',
  'sequencing': 'Sequencing',
  'matchups': 'Matchups',
};

function ProgressDashboard({
  mastery,
  skillRatings,
  totalReviews,
}: {
  mastery: { elo: number; percentile: number; strengths: SkillCategory[]; weaknesses: SkillCategory[] };
  skillRatings: SkillRating[];
  totalReviews: number;
}) {
  // Only show if there's some training data
  const hasData = totalReviews > 0 || skillRatings.some(r => r.totalAttempts > 0);

  if (!hasData) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
        <BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <div className="text-sm text-white/50">Complete drills to track your progress</div>
      </div>
    );
  }

  // Filter to skills with data
  const activeSkills = skillRatings.filter(r => r.totalAttempts > 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      {/* Overall Stats */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold text-white">{mastery.elo}</div>
          <div className="text-xs text-white/40">Overall ELO</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-white">Top {100 - mastery.percentile}%</div>
          <div className="text-xs text-white/40">{totalReviews} reviews</div>
        </div>
      </div>

      {/* Skill Ratings */}
      {activeSkills.length > 0 && (
        <div className="space-y-2">
          {activeSkills.map(skill => (
            <SkillBar key={skill.category} skill={skill} />
          ))}
        </div>
      )}

      {/* Insights */}
      {mastery.strengths.length > 0 && activeSkills.length >= 2 && (
        <div className="mt-4 pt-3 border-t border-white/10 flex gap-4 text-xs">
          <div className="flex-1">
            <div className="text-white/40 mb-1">Strengths</div>
            <div className="text-green-400">
              {mastery.strengths.map(s => SKILL_NAMES[s]).join(', ')}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-white/40 mb-1">Focus on</div>
            <div className="text-amber-400">
              {mastery.weaknesses.map(s => SKILL_NAMES[s]).join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillBar({ skill }: { skill: SkillRating }) {
  const TrendIcon = skill.trend === 'improving' ? TrendingUp
    : skill.trend === 'declining' ? TrendingDown
    : Minus;

  const trendColor = skill.trend === 'improving' ? 'text-green-400'
    : skill.trend === 'declining' ? 'text-red-400'
    : 'text-white/30';

  // Normalize ELO to 0-100 for bar (1000 = 0%, 1400 = 100%)
  const barWidth = Math.min(100, Math.max(0, ((skill.elo - 1000) / 400) * 100));

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/70">{SKILL_NAMES[skill.category]}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/50">{skill.elo}</span>
          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
        </div>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// ============ GAME MENU BUTTON ============
interface GameMenuItem {
  id: GameType;
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  stats: { played: number; correct: number; streak: number; bestStreak: number };
  featured?: boolean;
}

function GameMenuButton({ game, onSelect }: { game: GameMenuItem; onSelect: (id: GameType) => void }) {
  const accuracy = game.stats.played > 0 ? Math.round((game.stats.correct / game.stats.played) * 100) : null;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
    green: 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
    red: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',
    pink: 'bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20',
    rose: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
    pink: 'text-pink-400',
    orange: 'text-orange-400',
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  };

  return (
    <button
      onClick={() => onSelect(game.id)}
      className={`${colorClasses[game.color] || colorClasses.blue} border rounded-xl p-4 text-left transition-all active:scale-[0.98]`}
    >
      <div className="flex items-center gap-3">
        <game.icon className={`w-8 h-8 ${iconColors[game.color] || iconColors.blue}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white">{game.name}</div>
          <div className="text-xs text-white/50">{game.desc}</div>
        </div>
        {accuracy !== null && (
          <div className="text-right">
            <div className="text-lg font-bold text-white">{accuracy}%</div>
            <div className="text-[10px] text-white/40">{game.stats.played} played</div>
          </div>
        )}
      </div>
      {game.stats.bestStreak > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-400/80">
          <Flame className="w-3 h-3" />
          Best streak: {game.stats.bestStreak}
        </div>
      )}
    </button>
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

// Full-screen card viewer matching DraftSimulator style
function CardViewer({
  card,
  onClose,
  onPick,
  pickLabel = 'Pick This Card'
}: {
  card: CubeCard;
  onClose: () => void;
  onPick?: () => void;
  pickLabel?: string;
}) {
  const eloData = getEloData(card.name);
  const percentile = getPercentile(card.name);
  const wheelLikelihood = getWheelLikelihood(card.name);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer - centered on desktop, full on mobile */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-black border-t border-white/10 rounded-t-3xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[90vh]">
        {/* Drag handle */}
        <div className="flex justify-center py-2 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Card Image - constrained */}
        <div className="flex-1 flex items-center justify-center px-4 min-h-0 overflow-hidden">
          <img
            src={getCardImage(card)}
            alt={card.name}
            className="max-h-[50vh] w-auto max-w-full rounded-xl shadow-2xl object-contain"
          />
        </div>

        {/* Stats Grid */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-3">
            {/* ELO Rating */}
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">ELO</div>
              <div className="text-lg font-mono font-bold text-white">
                {eloData ? Math.round(eloData.elo) : '—'}
              </div>
              {eloData && (
                <div className={`text-xs mt-1 ${
                  percentile >= 75 ? 'text-amber-400' :
                  percentile >= 50 ? 'text-purple-400' :
                  'text-white/50'
                }`}>
                  Top {100 - percentile}%
                </div>
              )}
            </div>

            {/* Wheel Likelihood */}
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Wheel</div>
              <div className={`text-lg font-bold ${
                wheelLikelihood === 'likely' ? 'text-green-400' :
                wheelLikelihood === 'maybe' ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {wheelLikelihood === 'likely' ? 'Yes' :
                 wheelLikelihood === 'maybe' ? 'Maybe' :
                 'No'}
              </div>
              <div className="text-xs text-white/40 mt-1">
                {wheelLikelihood === 'likely' ? 'Will come back' :
                 wheelLikelihood === 'maybe' ? 'Risky' :
                 'Take now'}
              </div>
            </div>

            {/* Power */}
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Power</div>
              <div className="text-lg font-bold text-white">
                {card.powerLevel.toFixed(1)}
              </div>
              <div className="text-xs text-white/40 mt-1">
                {card.type_line?.split('—')[0]?.trim() || 'Card'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 pb-8 border-t border-white/10 bg-black">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-4 bg-white/10 border border-white/10 rounded-xl text-white font-medium active:scale-95 transition-transform"
          >
            Back
          </button>
          {onPick && (
            <button
              onClick={onPick}
              className="flex-1 py-4 px-4 bg-white text-black rounded-xl font-bold active:scale-95 transition-transform"
            >
              {pickLabel}
            </button>
          )}
        </div>
      </div>
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
    <div className="fixed inset-0 bg-black flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <span className="text-white/50 text-sm">Tap the higher ELO</span>
        {stats.streak > 0 ? (
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Flame className="w-5 h-5" />{stats.streak}
          </div>
        ) : <div className="w-8" />}
      </div>

      {/* Two cards side by side */}
      <div className="flex-1 flex items-center justify-center gap-4 px-4">
        {pair.map((card, idx) => {
          const elo = idx === 0 ? eloA : eloB;
          const isCorrect = idx === correctIndex;
          const isPicked = picked === idx;

          return (
            <div key={card.id} className="flex flex-col items-center w-[46%] max-w-[280px]">
              <button
                onClick={() => handlePick(idx as 0 | 1)}
                disabled={revealed}
                className={`w-full rounded-xl overflow-hidden transition-all ${
                  revealed
                    ? isCorrect
                      ? 'ring-4 ring-green-500'
                      : isPicked
                        ? 'ring-4 ring-red-500 opacity-60'
                        : 'opacity-30'
                    : 'active:scale-[0.97]'
                }`}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full" />
              </button>
              {/* ELO + Power shown below card after reveal */}
              {revealed && (
                <div className={`mt-2 text-center ${isCorrect ? 'text-green-400' : 'text-white/40'}`}>
                  <div className="text-xl font-bold">{Math.round(elo)}</div>
                  <div className="text-sm opacity-60">{card.powerLevel.toFixed(1)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="px-4 pb-8 pt-4 max-w-lg mx-auto w-full">
        {revealed ? (
          <>
            <div className={`text-center text-xl font-bold mb-4 ${picked === correctIndex ? 'text-green-400' : 'text-red-400'}`}>
              {picked === correctIndex ? 'Correct!' : 'Wrong!'}
            </div>
            <button onClick={newRound} className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]">
              Next
            </button>
          </>
        ) : null}
        {stats.played > 0 && (
          <div className="text-center text-white/20 text-xs mt-3">
            {Math.round((stats.correct / stats.played) * 100)}% · {stats.correct}/{stats.played}
            {stats.bestStreak > 1 && ` · Best: ${stats.bestStreak}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ PACK P1P1 TRAINING ============
function PackP1P1Game({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [pack, setPack] = useState<CubeCard[]>([]);
  const [picked, setPicked] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selectedForView, setSelectedForView] = useState<CubeCard | null>(null);

  // Generate a new pack
  const newPack = useCallback(() => {
    // Get 15 random cards with ELO data for a realistic pack
    const packCards = getRandomCards(cards, 15);
    setPack(packCards);
    setPicked(null);
    setRevealed(false);
    setSelectedForView(null);
  }, [cards]);

  useEffect(() => { newPack(); }, [newPack]);

  if (pack.length === 0) return null;

  // Find the "correct" pick (highest ELO)
  const sortedByElo = [...pack].sort((a, b) => {
    const eloA = getEloData(a.name)?.elo || 0;
    const eloB = getEloData(b.name)?.elo || 0;
    return eloB - eloA;
  });
  const bestPick = sortedByElo[0];
  const bestElo = getEloData(bestPick.name)?.elo || 0;

  // Top 3 picks for "acceptable" range
  const top3 = sortedByElo.slice(0, 3);
  const isAcceptable = picked ? top3.some(c => c.id === picked.id) : false;

  const handlePick = (card: CubeCard) => {
    if (revealed) return;
    setPicked(card);
    setRevealed(true);

    const isCorrect = card.id === bestPick.id;
    const pickedElo = getEloData(card.name)?.elo || 0;

    // Record in SRS
    const packId = `pack-${pack.map(c => c.id).sort().join('-').slice(0, 50)}`;
    srs.recordReview(
      packId,
      'pack-picks',
      boolToQuality(isCorrect || isAcceptable),
      isCorrect ? undefined : 'missed-best-pick',
      isCorrect ? undefined : `Picked ${card.name} (${Math.round(pickedElo)}) over ${bestPick.name} (${Math.round(bestElo)})`
    );

    onUpdate(isCorrect || isAcceptable);
  };

  const pickedElo = picked ? (getEloData(picked.name)?.elo || 0) : 0;
  const eloDiff = picked ? Math.round(bestElo - pickedElo) : 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-40">
      {/* Card viewer overlay */}
      {selectedForView && (
        <CardViewer
          card={selectedForView}
          onClose={() => setSelectedForView(null)}
          onPick={revealed ? undefined : () => {
            handlePick(selectedForView);
            setSelectedForView(null);
          }}
          pickLabel="Pick This Card"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Pack 1, Pick 1</div>
          <div className="text-white/40 text-xs">Tap to view, pick the best card</div>
        </div>
        {stats.streak > 0 ? (
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Flame className="w-5 h-5" />{stats.streak}
          </div>
        ) : <div className="w-8" />}
      </div>

      {/* Pack grid */}
      <div className="flex-1 overflow-auto px-2 py-2">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 max-w-3xl mx-auto">
          {pack.map((card) => {
            const cardElo = getEloData(card.name)?.elo || 0;
            const isBest = card.id === bestPick.id;
            const isPicked = picked?.id === card.id;
            const isTop3 = top3.some(c => c.id === card.id);
            const rank = sortedByElo.findIndex(c => c.id === card.id) + 1;

            return (
              <button
                key={card.id}
                onClick={() => revealed ? setSelectedForView(card) : setSelectedForView(card)}
                className={`relative rounded-lg overflow-hidden transition-all ${
                  revealed
                    ? isBest
                      ? 'ring-2 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)]'
                      : isPicked && !isTop3
                        ? 'ring-2 ring-red-500 opacity-70'
                        : isTop3
                          ? 'ring-1 ring-green-400/50'
                          : 'opacity-40 grayscale'
                    : 'active:scale-95'
                }`}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full"
                />
                {/* Rank badge after reveal */}
                {revealed && (
                  <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isBest ? 'bg-green-500 text-white' :
                    isTop3 ? 'bg-green-500/50 text-white' :
                    'bg-black/70 text-white/50'
                  }`}>
                    {rank}
                  </div>
                )}
                {/* ELO badge after reveal */}
                {revealed && (
                  <div className={`absolute bottom-0 inset-x-0 py-1 text-center text-[10px] font-mono ${
                    isBest ? 'bg-green-500 text-white' :
                    isTop3 ? 'bg-green-500/30 text-green-300' :
                    'bg-black/80 text-white/50'
                  }`}>
                    {Math.round(cardElo)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom - Results */}
      <div className="px-4 pb-8 pt-4 shrink-0 max-w-lg mx-auto w-full">
        {revealed && picked ? (
          <>
            <div className={`text-center mb-4 ${picked.id === bestPick.id ? 'text-green-400' : isAcceptable ? 'text-amber-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {picked.id === bestPick.id ? 'Perfect!' : isAcceptable ? 'Good pick!' : 'Not optimal'}
              </div>
              {picked.id !== bestPick.id && (
                <div className="text-sm text-white/60">
                  Best: <span className="text-white font-medium">{bestPick.name}</span>
                  <span className="text-white/40 ml-1">({Math.round(bestElo)} ELO, +{eloDiff})</span>
                </div>
              )}
            </div>
            <button
              onClick={newPack}
              className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]"
            >
              Next Pack
            </button>
          </>
        ) : (
          <div className="text-center text-white/30 text-sm py-4">
            Tap a card to view it, then pick
          </div>
        )}
        {stats.played > 0 && (
          <div className="text-center text-white/20 text-xs mt-3">
            {Math.round((stats.correct / stats.played) * 100)}% · {stats.correct}/{stats.played}
            {stats.bestStreak > 1 && ` · Best: ${stats.bestStreak}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ MULLIGAN TRAINER ============
interface ArchetypeProfile {
  id: string;
  name: string;
  colors: string[];
  keyTypes: string[];        // Card types we want
  keyKeywords: string[];     // Keywords to look for in oracle text
  idealLandCount: [number, number]; // min, max lands
  needsFastMana: boolean;
  needsEarlyPlay: boolean;   // Needs something to do T1-2
}

const ARCHETYPE_PROFILES: ArchetypeProfile[] = [
  {
    id: 'reanimator',
    name: 'Reanimator',
    colors: ['U', 'B'],
    keyTypes: ['creature'],
    keyKeywords: ['reanimate', 'graveyard', 'return', 'discard', 'entomb'],
    idealLandCount: [2, 4],
    needsFastMana: true,
    needsEarlyPlay: true,
  },
  {
    id: 'storm',
    name: 'Storm',
    colors: ['U', 'R'],
    keyTypes: ['instant', 'sorcery'],
    keyKeywords: ['draw', 'add', 'mana', 'storm', 'ritual'],
    idealLandCount: [2, 4],
    needsFastMana: true,
    needsEarlyPlay: false,
  },
  {
    id: 'aggro',
    name: 'Aggro',
    colors: ['R', 'W'],
    keyTypes: ['creature'],
    keyKeywords: ['haste', 'first strike', 'damage'],
    idealLandCount: [2, 3],
    needsFastMana: false,
    needsEarlyPlay: true,
  },
  {
    id: 'control',
    name: 'Control',
    colors: ['U', 'W'],
    keyTypes: ['instant', 'sorcery', 'planeswalker'],
    keyKeywords: ['counter', 'destroy', 'exile', 'draw'],
    idealLandCount: [3, 5],
    needsFastMana: false,
    needsEarlyPlay: false,
  },
  {
    id: 'ramp',
    name: 'Ramp',
    colors: ['U', 'G'],
    keyTypes: ['creature', 'sorcery'],
    keyKeywords: ['add', 'mana', 'land', 'search'],
    idealLandCount: [2, 4],
    needsFastMana: true,
    needsEarlyPlay: true,
  },
  {
    id: 'midrange',
    name: 'Midrange',
    colors: ['B', 'G'],
    keyTypes: ['creature', 'planeswalker'],
    keyKeywords: ['destroy', 'discard', 'return'],
    idealLandCount: [3, 4],
    needsFastMana: false,
    needsEarlyPlay: true,
  },
];

function evaluateHand(hand: CubeCard[], archetype: ArchetypeProfile): {
  verdict: 'keep' | 'mull';
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 50; // Start neutral

  // Count lands
  const lands = hand.filter(c => c.type_line?.toLowerCase().includes('land'));
  const landCount = lands.length;

  // Check land count
  if (landCount < archetype.idealLandCount[0]) {
    score -= 30;
    reasons.push(`Only ${landCount} land${landCount !== 1 ? 's' : ''} (need ${archetype.idealLandCount[0]}+)`);
  } else if (landCount > archetype.idealLandCount[1]) {
    score -= 20;
    reasons.push(`${landCount} lands is too many (flooding risk)`);
  } else {
    score += 15;
    reasons.push(`Good land count (${landCount})`);
  }

  // Check for fast mana
  const fastMana = hand.filter(c => {
    const name = c.name.toLowerCase();
    const oracle = c.oracle_text?.toLowerCase() || '';
    return name.includes('mox') || name.includes('lotus') ||
           name.includes('crypt') || name.includes('vault') ||
           name.includes('sol ring') || name.includes('chrome mox') ||
           oracle.includes('add') && (c.cmc || 0) <= 1;
  });

  if (archetype.needsFastMana) {
    if (fastMana.length > 0) {
      score += 25;
      reasons.push(`Has fast mana (${fastMana[0].name})`);
    } else {
      score -= 15;
      reasons.push('No fast mana');
    }
  }

  // Check for early plays
  const earlyPlays = hand.filter(c => {
    const cmc = c.cmc || 0;
    const isLand = c.type_line?.toLowerCase().includes('land');
    return !isLand && cmc <= 2;
  });

  if (archetype.needsEarlyPlay) {
    if (earlyPlays.length > 0) {
      score += 20;
      reasons.push(`Early play available (${earlyPlays[0].name})`);
    } else {
      score -= 20;
      reasons.push('No early plays');
    }
  }

  // Check for archetype-relevant cards
  const relevantCards = hand.filter(c => {
    const oracle = c.oracle_text?.toLowerCase() || '';
    const typeLine = c.type_line?.toLowerCase() || '';
    return archetype.keyKeywords.some(kw => oracle.includes(kw)) ||
           archetype.keyTypes.some(t => typeLine.includes(t));
  });

  if (relevantCards.length >= 2) {
    score += 20;
    reasons.push('Multiple on-plan cards');
  } else if (relevantCards.length === 0) {
    score -= 25;
    reasons.push('No cards that fit the archetype');
  }

  // Determine verdict
  const verdict: 'keep' | 'mull' = score >= 50 ? 'keep' : 'mull';

  return { verdict, score, reasons };
}

function MulliganTrainerGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [hand, setHand] = useState<CubeCard[]>([]);
  const [archetype, setArchetype] = useState<ArchetypeProfile | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [userChoice, setUserChoice] = useState<'keep' | 'mull' | null>(null);
  const [evaluation, setEvaluation] = useState<{ verdict: 'keep' | 'mull'; score: number; reasons: string[] } | null>(null);
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);

  const newHand = useCallback(() => {
    // Pick random archetype
    const arch = ARCHETYPE_PROFILES[Math.floor(Math.random() * ARCHETYPE_PROFILES.length)];
    setArchetype(arch);

    // Get cards that could be in this archetype's deck
    const deckCards = cards.filter(c => {
      const colors = c.color_identity || [];
      const isColorless = colors.length === 0;
      const isOnColor = colors.every(col => arch.colors.includes(col) || isColorless);
      const isLand = c.type_line?.toLowerCase().includes('land');
      return isOnColor || isLand || isColorless;
    });

    // Generate a hand with some lands and some spells
    const landPool = deckCards.filter(c => c.type_line?.toLowerCase().includes('land'));
    const spellPool = deckCards.filter(c => !c.type_line?.toLowerCase().includes('land'));

    // Random land count between 1-5
    const targetLands = Math.floor(Math.random() * 5) + 1;
    const handLands = shuffleArray(landPool).slice(0, Math.min(targetLands, landPool.length));
    const handSpells = shuffleArray(spellPool).slice(0, 7 - handLands.length);
    const newHandCards = shuffleArray([...handLands, ...handSpells]).slice(0, 7);

    setHand(newHandCards);
    setRevealed(false);
    setUserChoice(null);
    setEvaluation(null);
    setSelectedCard(null);
  }, [cards]);

  useEffect(() => { newHand(); }, [newHand]);

  if (hand.length === 0 || !archetype) return null;

  const handleChoice = (choice: 'keep' | 'mull') => {
    if (revealed) return;

    const eval_ = evaluateHand(hand, archetype);
    setEvaluation(eval_);
    setUserChoice(choice);
    setRevealed(true);

    const isCorrect = choice === eval_.verdict;

    // Record in SRS
    const handId = `mull-${hand.map(c => c.id).sort().join('-').slice(0, 50)}`;
    srs.recordReview(
      handId,
      'mulligans',
      boolToQuality(isCorrect),
      isCorrect ? undefined : `wrong-${archetype.id}-mull`,
      isCorrect ? undefined : `${choice === 'keep' ? 'Kept' : 'Mulled'} when should ${eval_.verdict}`
    );

    onUpdate(isCorrect);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-40">
      {/* Card viewer */}
      {selectedCard && (
        <CardViewer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Mulligan Trainer</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-white/40 text-xs">Playing:</span>
            <div className="flex -space-x-0.5">
              {archetype.colors.map(c => (
                <div key={c} className={`w-3 h-3 rounded-full
                  ${c === 'W' ? 'bg-amber-100' : ''}
                  ${c === 'U' ? 'bg-blue-500' : ''}
                  ${c === 'B' ? 'bg-neutral-500' : ''}
                  ${c === 'R' ? 'bg-red-500' : ''}
                  ${c === 'G' ? 'bg-green-500' : ''}
                `} />
              ))}
            </div>
            <span className="text-white/60 text-xs font-medium">{archetype.name}</span>
          </div>
        </div>
        {stats.streak > 0 ? (
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Flame className="w-5 h-5" />{stats.streak}
          </div>
        ) : <div className="w-8" />}
      </div>

      {/* Hand display */}
      <div className="flex-1 flex items-center justify-center px-2 overflow-hidden">
        <div className="flex gap-1 sm:gap-2 max-w-4xl">
          {hand.map((card) => {
            const isLand = card.type_line?.toLowerCase().includes('land');
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`flex-1 min-w-0 rounded-lg overflow-hidden transition-all active:scale-95 ${
                  revealed && isLand ? 'ring-2 ring-amber-400/50' : ''
                }`}
                style={{ maxWidth: '14%' }}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Decision / Results */}
      <div className="px-4 pb-8 pt-4 shrink-0 max-w-lg mx-auto w-full">
        {!revealed ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleChoice('keep')}
              className="py-4 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl font-bold text-lg active:scale-[0.98]"
            >
              Keep
            </button>
            <button
              onClick={() => handleChoice('mull')}
              className="py-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold text-lg active:scale-[0.98]"
            >
              Mulligan
            </button>
          </div>
        ) : evaluation && (
          <>
            <div className={`text-center mb-3 ${userChoice === evaluation.verdict ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {userChoice === evaluation.verdict ? 'Correct!' : 'Wrong!'}
              </div>
              <div className="text-sm text-white/60">
                This hand is a <span className={evaluation.verdict === 'keep' ? 'text-green-400' : 'text-red-400'} >{evaluation.verdict.toUpperCase()}</span>
              </div>
            </div>

            {/* Reasons */}
            <div className="bg-white/5 rounded-lg p-3 mb-4 text-sm">
              {evaluation.reasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-2 text-white/70">
                  <span className={reason.includes('No ') || reason.includes('Only') || reason.includes('too many') ? 'text-red-400' : 'text-green-400'}>
                    {reason.includes('No ') || reason.includes('Only') || reason.includes('too many') ? '−' : '+'}
                  </span>
                  {reason}
                </div>
              ))}
            </div>

            <button
              onClick={newHand}
              className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]"
            >
              Next Hand
            </button>
          </>
        )}

        {stats.played > 0 && (
          <div className="text-center text-white/20 text-xs mt-3">
            {Math.round((stats.correct / stats.played) * 100)}% · {stats.correct}/{stats.played}
            {stats.bestStreak > 1 && ` · Best: ${stats.bestStreak}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SIGNAL QUIZ ============
// Cards that signal specific archetypes when seen late
const SIGNAL_CARDS: Record<string, { signals: string; explanation: string }> = {
  // Reanimator signals
  'Reanimate': { signals: 'Reanimator', explanation: 'Premium reanimation spell - if this wheels, UB Reanimator is wide open' },
  'Animate Dead': { signals: 'Reanimator', explanation: 'Key reanimation piece going late means the archetype is underdrafted' },
  'Entomb': { signals: 'Reanimator', explanation: 'The best enabler for Reanimator - late Entomb is a huge signal' },
  'Exhume': { signals: 'Reanimator', explanation: 'Cheap reanimation going late means no one is in the archetype' },
  'Griselbrand': { signals: 'Reanimator', explanation: 'The best reanimation target - if late, Reanimator is open' },

  // Storm signals
  'Brain Freeze': { signals: 'Storm', explanation: 'Storm win condition going late means no Storm drafters' },
  'Underworld Breach': { signals: 'Storm', explanation: 'Premium combo piece - late means Storm/combo is open' },
  'Yawgmoth\'s Will': { signals: 'Storm', explanation: 'One of the best Storm cards - late = no competition' },
  'Time Spiral': { signals: 'Storm', explanation: 'Key Storm card that untaps lands - signals Storm is open' },
  'Lion\'s Eye Diamond': { signals: 'Storm', explanation: 'Combo-only card - late means combo decks are open' },

  // Aggro signals
  'Ragavan, Nimble Pilferer': { signals: 'Red Aggro', explanation: 'Best red one-drop - late means aggro is open' },
  'Goblin Guide': { signals: 'Red Aggro', explanation: 'Premium aggro creature going late - red aggro open' },
  'Monastery Swiftspear': { signals: 'Red Aggro', explanation: 'Efficient beater going late signals red is open' },
  'Thalia, Guardian of Thraben': { signals: 'White Aggro', explanation: 'Premium hatebear - late means white aggro open' },
  'Mother of Runes': { signals: 'White Aggro', explanation: 'Elite white creature - late means white is underdrafted' },

  // Control signals
  'Counterspell': { signals: 'Blue Control', explanation: 'Premium counter going late means control is open' },
  'Mana Drain': { signals: 'Blue Control', explanation: 'Best counterspell - late = blue control wide open' },
  'Force of Will': { signals: 'Blue', explanation: 'Best free counter - late means blue is seriously open' },
  'Jace, the Mind Sculptor': { signals: 'Blue Control', explanation: 'Best planeswalker going late - blue control open' },
  'The Wandering Emperor': { signals: 'White Control', explanation: 'Premium white card - late means white is open' },

  // Artifact signals
  'Tinker': { signals: 'Artifacts', explanation: 'Broken artifact tutor - late means artifact combo open' },
  'Tolarian Academy': { signals: 'Artifacts', explanation: 'Best artifact land - late signals artifacts underdrafted' },
  'Memory Jar': { signals: 'Artifacts', explanation: 'Powerful artifact - late means artifact strategies open' },

  // Ramp signals
  'Channel': { signals: 'Green Ramp', explanation: 'Broken ramp spell - late means green combo/ramp open' },
  'Natural Order': { signals: 'Green Ramp', explanation: 'Premium green card - late means green is open' },
  'Craterhoof Behemoth': { signals: 'Green Ramp', explanation: 'Green finisher going late - ramp is open' },

  // Combo signals
  'Show and Tell': { signals: 'Sneak/Show', explanation: 'Combo enabler going late means combo is open' },
  'Sneak Attack': { signals: 'Sneak/Show', explanation: 'Cheat card going late - combo decks open' },
  'Oath of Druids': { signals: 'Oath', explanation: 'Build-around going late means Oath is free' },
};

function SignalQuizGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [scenario, setScenario] = useState<{ card: CubeCard; pick: number; signal: string; explanation: string } | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CubeCard | null>(null);

  const allSignals = ['Reanimator', 'Storm', 'Red Aggro', 'White Aggro', 'Blue Control', 'White Control', 'Artifacts', 'Green Ramp', 'Sneak/Show', 'Oath', 'Blue'];

  const newScenario = useCallback(() => {
    // Find a card that has signal data
    const signalCardNames = Object.keys(SIGNAL_CARDS);
    const availableCards = cards.filter(c => signalCardNames.includes(c.name));

    if (availableCards.length === 0) {
      // Fallback: use any card and generate based on colors
      const randomCard = getRandomCards(cards, 1)[0];
      const colors = randomCard.color_identity || [];
      const colorSignal = colors.includes('U') ? 'Blue' :
                          colors.includes('R') ? 'Red Aggro' :
                          colors.includes('W') ? 'White Aggro' :
                          colors.includes('G') ? 'Green Ramp' :
                          colors.includes('B') ? 'Black' : 'Colorless';

      setScenario({
        card: randomCard,
        pick: Math.floor(Math.random() * 4) + 5, // Pick 5-8
        signal: colorSignal,
        explanation: `Late ${randomCard.name} suggests ${colorSignal} is underdrafted`,
      });
    } else {
      const card = shuffleArray(availableCards)[0];
      const signalData = SIGNAL_CARDS[card.name];
      setScenario({
        card,
        pick: Math.floor(Math.random() * 4) + 5, // Pick 5-8
        signal: signalData.signals,
        explanation: signalData.explanation,
      });
    }

    // Generate wrong options
    setRevealed(false);
    setUserAnswer(null);
  }, [cards]);

  // Generate options when scenario changes
  useEffect(() => {
    if (scenario) {
      const wrongOptions = allSignals
        .filter(s => s !== scenario.signal)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      setOptions(shuffleArray([scenario.signal, ...wrongOptions]));
    }
  }, [scenario]);

  useEffect(() => { newScenario(); }, [newScenario]);

  if (!scenario) return null;

  const handleAnswer = (answer: string) => {
    if (revealed) return;
    setUserAnswer(answer);
    setRevealed(true);

    const isCorrect = answer === scenario.signal;

    // Record in SRS
    srs.recordReview(
      `signal-${scenario.card.name}`,
      'signals',
      boolToQuality(isCorrect),
      isCorrect ? undefined : 'wrong-signal-read',
      isCorrect ? undefined : `Thought ${scenario.card.name} signals ${answer}, actually ${scenario.signal}`
    );

    onUpdate(isCorrect);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-40">
      {/* Card viewer */}
      {selectedCard && (
        <CardViewer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Signal Quiz</div>
          <div className="text-white/40 text-xs">What does this late pick tell you?</div>
        </div>
        {stats.streak > 0 ? (
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Flame className="w-5 h-5" />{stats.streak}
          </div>
        ) : <div className="w-8" />}
      </div>

      {/* Scenario */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        {/* Context */}
        <div className="text-center">
          <div className="text-white/50 text-sm mb-1">You see this card at</div>
          <div className="text-2xl font-bold text-amber-400">Pick {scenario.pick}</div>
        </div>

        {/* Card */}
        <button
          onClick={() => setSelectedCard(scenario.card)}
          className="w-48 rounded-xl overflow-hidden active:scale-95 shadow-xl"
        >
          <img src={getCardImage(scenario.card)} alt={scenario.card.name} className="w-full" />
        </button>

        {/* Question */}
        <div className="text-center text-white/70 text-sm">
          What archetype is likely open?
        </div>
      </div>

      {/* Options / Results */}
      <div className="px-4 pb-8 pt-4 shrink-0 max-w-lg mx-auto w-full">
        {!revealed ? (
          <div className="grid grid-cols-2 gap-2">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="py-3 bg-white/10 border border-white/20 text-white rounded-xl font-medium active:scale-[0.98] text-sm"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className={`text-center mb-3 ${userAnswer === scenario.signal ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {userAnswer === scenario.signal ? 'Correct!' : 'Wrong!'}
              </div>
              {userAnswer !== scenario.signal && (
                <div className="text-sm text-white/60">
                  Answer: <span className="text-cyan-400 font-medium">{scenario.signal}</span>
                </div>
              )}
            </div>

            <div className="bg-white/5 rounded-lg p-3 mb-4 text-sm text-white/70">
              {scenario.explanation}
            </div>

            <button
              onClick={newScenario}
              className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]"
            >
              Next Signal
            </button>
          </>
        )}

        {stats.played > 0 && (
          <div className="text-center text-white/20 text-xs mt-3">
            {Math.round((stats.correct / stats.played) * 100)}% · {stats.correct}/{stats.played}
            {stats.bestStreak > 1 && ` · Best: ${stats.bestStreak}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ARCHETYPE FLASHCARDS ============
// Archetype definitions with key cards for drilling
const ARCHETYPES_DATA = [
  {
    id: 'ub-reanimator',
    name: 'UB Reanimator',
    keyCards: ['Entomb', 'Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Exhume'],
    description: 'Cheat massive creatures into play from the graveyard as early as turn 1-2',
  },
  {
    id: 'ur-storm',
    name: 'UR Storm',
    keyCards: ['Brain Freeze', 'Underworld Breach', 'Time Spiral', 'Yawgmoth\'s Will', 'Wheel of Fortune', 'Lion\'s Eye Diamond', 'Echo of Eons'],
    description: 'Chain spells together for massive storm counts',
  },
  {
    id: 'artifact-combo',
    name: 'Artifact Combo',
    keyCards: ['Tinker', 'Tolarian Academy', 'Mishra\'s Workshop', 'Blightsteel Colossus', 'Mana Vault', 'Grim Monolith', 'Memory Jar'],
    description: 'Abuse fast mana and artifact synergies',
  },
  {
    id: 'mono-white',
    name: 'Mono White Aggro',
    keyCards: ['Mother of Runes', 'Thalia, Guardian of Thraben', 'Adeline, Resplendent Cathar', 'Armageddon', 'Monastery Mentor', 'Solitude'],
    description: 'Efficient white creatures with disruption',
  },
  {
    id: 'uw-control',
    name: 'UW Control',
    keyCards: ['Jace, the Mind Sculptor', 'The Wandering Emperor', 'Counterspell', 'Swords to Plowshares', 'Force of Will', 'Balance', 'Teferi, Time Raveler'],
    description: 'Draw-go control with efficient answers',
  },
  {
    id: 'ug-ramp',
    name: 'UG Ramp',
    keyCards: ['Channel', 'Primeval Titan', 'Craterhoof Behemoth', 'Natural Order', 'Fastbond', 'Oracle of Mul Daya', 'Uro, Titan of Nature\'s Wrath'],
    description: 'Accelerate into massive threats',
  },
  {
    id: 'br-aggro',
    name: 'BR Rakdos',
    keyCards: ['Ragavan, Nimble Pilferer', 'Thoughtseize', 'Lightning Bolt', 'Orcish Bowmasters', 'Grief', 'Dark Confidant'],
    description: 'Fast aggro with hand disruption',
  },
  {
    id: 'show-tell',
    name: 'Show and Tell',
    keyCards: ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Emrakul, the Aeons Torn', 'Griselbrand', 'Atraxa, Grand Unifier'],
    description: 'Cheat giant creatures without paying costs',
  },
  {
    id: 'bg-midrange',
    name: 'BG Rock',
    keyCards: ['Deathrite Shaman', 'Grist, the Hunger Tide', 'Liliana of the Veil', 'Endurance', 'Scavenging Ooze', 'Recurring Nightmare'],
    description: 'Grind with 2-for-1s and recursive threats',
  },
  {
    id: 'rw-aggro',
    name: 'RW Boros',
    keyCards: ['Ragavan, Nimble Pilferer', 'Goblin Rabblemaster', 'Adeline, Resplendent Cathar', 'Lightning Bolt', 'Forth Eorlingas!', 'Armageddon'],
    description: 'The fastest deck in the cube',
  },
];

// Get all unique key cards for wrong answers
const ALL_KEY_CARDS = [...new Set(ARCHETYPES_DATA.flatMap(a => a.keyCards))];

function ArchetypeFlashcardsGame({ stats, onUpdate, onBack }: GameComponentProps) {
  const [archetype, setArchetype] = useState<typeof ARCHETYPES_DATA[0] | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const newRound = useCallback(() => {
    // Pick random archetype
    const arch = ARCHETYPES_DATA[Math.floor(Math.random() * ARCHETYPES_DATA.length)];

    // Get 3 correct key cards
    const correctCards = shuffleArray(arch.keyCards).slice(0, 3);

    // Get 3 wrong cards (from other archetypes)
    const wrongCards = shuffleArray(
      ALL_KEY_CARDS.filter(c => !arch.keyCards.includes(c))
    ).slice(0, 3);

    // Shuffle all options
    const allOptions = shuffleArray([...correctCards, ...wrongCards]);

    setArchetype(arch);
    setOptions(allOptions);
    setSelected(new Set());
    setRevealed(false);
  }, []);

  useEffect(() => { newRound(); }, [newRound]);

  if (!archetype) return null;

  const toggleCard = (card: string) => {
    if (revealed) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(card)) {
        next.delete(card);
      } else if (next.size < 3) {
        next.add(card);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size !== 3 || revealed) return;
    setRevealed(true);

    // Count correct selections
    const correctCount = [...selected].filter(c => archetype.keyCards.includes(c)).length;
    const isCorrect = correctCount === 3;
    onUpdate(isCorrect);

    // Track in SRS
    srs.recordReview(
      `archetype-${archetype.id}`,
      'archetypes',
      boolToQuality(isCorrect, true)
    );
  };

  const correctCards = options.filter(c => archetype.keyCards.includes(c));

  return (
    <div>
      <GameHeader
        title="Archetype Drills"
        subtitle="Select 3 key cards"
        streak={stats.streak}
        onBack={onBack}
      />

      {/* Archetype Name */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-emerald-400 mb-1">{archetype.name}</div>
        <div className="text-sm text-white/50">{archetype.description}</div>
      </div>

      {/* Card Options */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {options.map(card => {
          const isSelected = selected.has(card);
          const isCorrect = archetype.keyCards.includes(card);

          let className = 'p-3 rounded-lg text-sm font-medium transition-all active:scale-[0.98] text-left ';

          if (revealed) {
            if (isCorrect) {
              className += 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50';
            } else if (isSelected) {
              className += 'bg-red-500/30 text-red-300 border border-red-500/50';
            } else {
              className += 'bg-white/5 text-white/30';
            }
          } else {
            if (isSelected) {
              className += 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
            } else {
              className += 'bg-white/5 text-white/70 hover:bg-white/10';
            }
          }

          return (
            <button
              key={card}
              onClick={() => toggleCard(card)}
              disabled={revealed}
              className={className}
            >
              {card}
            </button>
          );
        })}
      </div>

      {/* Submit or Result */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={selected.size !== 3}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] ${
            selected.size === 3
              ? 'bg-emerald-500 text-white'
              : 'bg-white/10 text-white/30'
          }`}
        >
          {selected.size === 3 ? 'Check Answer' : `Select ${3 - selected.size} more`}
        </button>
      ) : (
        <>
          <div className="text-center mb-3">
            <div className={`text-xl font-bold ${
              [...selected].filter(c => archetype.keyCards.includes(c)).length === 3
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}>
              {[...selected].filter(c => archetype.keyCards.includes(c)).length}/3 Correct
            </div>
            {[...selected].filter(c => archetype.keyCards.includes(c)).length < 3 && (
              <div className="text-sm text-white/50 mt-1">
                Correct: {correctCards.join(', ')}
              </div>
            )}
          </div>

          <button
            onClick={newRound}
            className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]"
          >
            Next Archetype
          </button>
        </>
      )}

      {stats.played > 0 && (
        <div className="text-center text-white/20 text-xs mt-3">
          {Math.round((stats.correct / stats.played) * 100)}% · {stats.correct}/{stats.played}
          {stats.bestStreak > 1 && ` · Best: ${stats.bestStreak}`}
        </div>
      )}
    </div>
  );
}

// ============ SIDEBOARD DRILL ============
// Sideboard scenarios for common matchups
interface SideboardScenario {
  yourDeck: string;
  opponent: string;
  cardsIn: string[];
  cardsOut: string[];
  explanation: string;
}

const SIDEBOARD_SCENARIOS: SideboardScenario[] = [
  {
    yourDeck: 'UR Storm',
    opponent: 'Mono White Aggro',
    cardsIn: ['Pyroclasm', 'Chain Lightning', 'Fire // Ice'],
    cardsOut: ['Brain Freeze', 'Echo of Eons', 'Time Spiral'],
    explanation: 'Board out slow combo pieces for interaction. You need to survive long enough to combo, so cheap removal is essential. Storm count win cons are too slow.'
  },
  {
    yourDeck: 'UR Storm',
    opponent: 'UW Control',
    cardsIn: ['Defense Grid', 'Xantid Swarm', 'Red Elemental Blast'],
    cardsOut: ['Chain Lightning', 'Pyroclasm', 'Fire // Ice'],
    explanation: 'Board out creature removal for anti-counter tech. Control has no creatures you need to kill, but lots of counters you need to beat.'
  },
  {
    yourDeck: 'UB Reanimator',
    opponent: 'UW Control',
    cardsIn: ['Duress', 'Defense Grid', 'Thoughtseize'],
    cardsOut: ['Fatal Push', 'Doom Blade', 'Go for the Throat'],
    explanation: 'UW Control has very few creatures. Bring in discard to strip their counters and Containment Priest before you combo.'
  },
  {
    yourDeck: 'UB Reanimator',
    opponent: 'Mono White Aggro',
    cardsIn: ['Toxic Deluge', 'Fatal Push', 'Massacre'],
    cardsOut: ['Duress', 'Careful Study', 'Thought Scour'],
    explanation: 'Need removal to survive their fast clock. Discard is weak vs aggro - they dump their hand quickly anyway.'
  },
  {
    yourDeck: 'Mono White Aggro',
    opponent: 'UR Storm',
    cardsIn: ['Thalia, Guardian of Thraben', 'Ethersworn Canonist', 'Deafening Silence'],
    cardsOut: ['Armageddon', 'Balance', 'Wrath effects'],
    explanation: 'Hate bears are devastating vs Storm. Symmetrical effects hurt you too - you want to be attacking, not resetting.'
  },
  {
    yourDeck: 'Mono White Aggro',
    opponent: 'UB Reanimator',
    cardsIn: ['Containment Priest', 'Rest in Peace', 'Grafdigger\'s Cage'],
    cardsOut: ['Armageddon', 'Honor of the Pure', 'Anthem effects'],
    explanation: 'Graveyard hate is essential. Your anthems are too slow vs turn 1-2 Griselbrand. You need to disrupt first.'
  },
  {
    yourDeck: 'UW Control',
    opponent: 'UR Storm',
    cardsIn: ['Flusterstorm', 'Mindbreak Trap', 'Rule of Law'],
    cardsOut: ['Wrath of God', 'Day of Judgment', 'Terminus'],
    explanation: 'Wrath effects are useless vs Storm. Bring in stack interaction and lock pieces to stop the combo.'
  },
  {
    yourDeck: 'UW Control',
    opponent: 'UB Reanimator',
    cardsIn: ['Containment Priest', 'Rest in Peace', 'Surgical Extraction'],
    cardsOut: ['Wrath of God', 'Day of Judgment', 'Supreme Verdict'],
    explanation: 'Wraths are too slow vs turn 1-2 reanimation. You need graveyard hate to stop them before they start.'
  },
  {
    yourDeck: 'BG Midrange',
    opponent: 'UR Storm',
    cardsIn: ['Thoughtseize', 'Collector Ouphe', 'Endurance'],
    cardsOut: ['Fatal Push', 'Abrupt Decay', 'Assassin\'s Trophy'],
    explanation: 'Creature removal is useless vs Storm. Discard their key pieces and Endurance stops Breach lines.'
  },
  {
    yourDeck: 'BG Midrange',
    opponent: 'Mono White Aggro',
    cardsIn: ['Toxic Deluge', 'Fatal Push', 'Massacre Wurm'],
    cardsOut: ['Thoughtseize', 'Duress', 'Hand disruption'],
    explanation: 'Aggro dumps their hand fast - discard is weak. You need cheap removal to survive the early game.'
  },
];

function SideboardDrillGame({ stats, onUpdate, onBack }: GameComponentProps) {
  const [scenario, setScenario] = useState<SideboardScenario | null>(null);
  const [selectedIn, setSelectedIn] = useState<Set<string>>(new Set());
  const [selectedOut, setSelectedOut] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [allOptions, setAllOptions] = useState<{ inOptions: string[]; outOptions: string[] }>({ inOptions: [], outOptions: [] });

  const newScenario = useCallback(() => {
    const s = SIDEBOARD_SCENARIOS[Math.floor(Math.random() * SIDEBOARD_SCENARIOS.length)];

    // Create options with wrong answers
    const wrongInCards = [
      'Wrath of God', 'Counterspell', 'Lightning Bolt', 'Dark Ritual',
      'Mana Drain', 'Force of Will', 'Swords to Plowshares', 'Path to Exile',
      'Ancestral Recall', 'Time Walk', 'Birds of Paradise', 'Llanowar Elves'
    ].filter(c => !s.cardsIn.includes(c));

    const wrongOutCards = [
      'Black Lotus', 'Mox Sapphire', 'Sol Ring', 'Mana Crypt',
      'Island', 'Swamp', 'Mountain', 'Forest', 'Plains',
      'Flooded Strand', 'Polluted Delta', 'Bloodstained Mire'
    ].filter(c => !s.cardsOut.includes(c));

    const inOptions = shuffleArray([...s.cardsIn, ...shuffleArray(wrongInCards).slice(0, 3)]);
    const outOptions = shuffleArray([...s.cardsOut, ...shuffleArray(wrongOutCards).slice(0, 3)]);

    setScenario(s);
    setAllOptions({ inOptions, outOptions });
    setSelectedIn(new Set());
    setSelectedOut(new Set());
    setRevealed(false);
  }, []);

  useEffect(() => { newScenario(); }, [newScenario]);

  if (!scenario) return null;

  const toggleIn = (card: string) => {
    if (revealed) return;
    setSelectedIn(prev => {
      const next = new Set(prev);
      if (next.has(card)) next.delete(card);
      else if (next.size < scenario.cardsIn.length) next.add(card);
      return next;
    });
  };

  const toggleOut = (card: string) => {
    if (revealed) return;
    setSelectedOut(prev => {
      const next = new Set(prev);
      if (next.has(card)) next.delete(card);
      else if (next.size < scenario.cardsOut.length) next.add(card);
      return next;
    });
  };

  const handleSubmit = () => {
    if (revealed) return;
    setRevealed(true);

    const correctIn = [...selectedIn].filter(c => scenario.cardsIn.includes(c)).length;
    const correctOut = [...selectedOut].filter(c => scenario.cardsOut.includes(c)).length;
    const totalCorrect = correctIn + correctOut;
    const totalNeeded = scenario.cardsIn.length + scenario.cardsOut.length;
    const isCorrect = totalCorrect === totalNeeded;

    onUpdate(isCorrect);
    srs.recordReview(
      `sideboard-${scenario.yourDeck}-${scenario.opponent}`,
      'sideboard',
      boolToQuality(isCorrect, true)
    );
  };

  const canSubmit = selectedIn.size === scenario.cardsIn.length && selectedOut.size === scenario.cardsOut.length;

  return (
    <div>
      <GameHeader
        title="Sideboard Guide"
        subtitle={`${scenario.yourDeck} vs ${scenario.opponent}`}
        streak={stats.streak}
        onBack={onBack}
      />

      {/* Matchup Description */}
      <div className="text-center mb-4">
        <div className="text-lg font-bold text-white">You are: <span className="text-rose-400">{scenario.yourDeck}</span></div>
        <div className="text-sm text-white/50">vs <span className="text-amber-400">{scenario.opponent}</span></div>
      </div>

      {/* Cards In */}
      <div className="mb-4">
        <div className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">
          Bring In ({selectedIn.size}/{scenario.cardsIn.length})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allOptions.inOptions.map(card => {
            const isSelected = selectedIn.has(card);
            const isCorrect = scenario.cardsIn.includes(card);

            let className = 'p-2 rounded-lg text-sm transition-all active:scale-[0.98] text-left ';
            if (revealed) {
              if (isCorrect) className += 'bg-green-500/30 text-green-300 border border-green-500/50';
              else if (isSelected) className += 'bg-red-500/30 text-red-300 border border-red-500/50';
              else className += 'bg-white/5 text-white/30';
            } else {
              if (isSelected) className += 'bg-green-500/20 text-green-400 border border-green-500/40';
              else className += 'bg-white/5 text-white/70 hover:bg-white/10';
            }

            return (
              <button key={card} onClick={() => toggleIn(card)} disabled={revealed} className={className}>
                {card}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Out */}
      <div className="mb-4">
        <div className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">
          Take Out ({selectedOut.size}/{scenario.cardsOut.length})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allOptions.outOptions.map(card => {
            const isSelected = selectedOut.has(card);
            const isCorrect = scenario.cardsOut.includes(card);

            let className = 'p-2 rounded-lg text-sm transition-all active:scale-[0.98] text-left ';
            if (revealed) {
              if (isCorrect) className += 'bg-red-500/30 text-red-300 border border-red-500/50';
              else if (isSelected) className += 'bg-amber-500/30 text-amber-300 border border-amber-500/50';
              else className += 'bg-white/5 text-white/30';
            } else {
              if (isSelected) className += 'bg-red-500/20 text-red-400 border border-red-500/40';
              else className += 'bg-white/5 text-white/70 hover:bg-white/10';
            }

            return (
              <button key={card} onClick={() => toggleOut(card)} disabled={revealed} className={className}>
                {card}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit or Result */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] ${
            canSubmit ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/30'
          }`}
        >
          {canSubmit ? 'Check Answer' : `Select cards`}
        </button>
      ) : (
        <>
          <div className="bg-white/5 rounded-lg p-3 mb-4 text-sm text-white/70">
            {scenario.explanation}
          </div>

          <button
            onClick={newScenario}
            className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]"
          >
            Next Matchup
          </button>
        </>
      )}

      {stats.played > 0 && (
        <div className="text-center text-white/20 text-xs mt-3">
          {Math.round((stats.correct / stats.played) * 100)}% · {stats.correct}/{stats.played}
          {stats.bestStreak > 1 && ` · Best: ${stats.bestStreak}`}
        </div>
      )}
    </div>
  );
}

// ============ GAME 2: Will It Wheel? ============
function WheelOrNotGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [card, setCard] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<WheelLikelihood | null>(null);
  const [viewCard, setViewCard] = useState<CubeCard | null>(null);

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
    <div>
      <GameHeader title="Will It Wheel?" subtitle="Will this come back around?" streak={stats.streak} onBack={onBack} />

      {viewCard && <CardViewer card={viewCard} onClose={() => setViewCard(null)} />}

      {/* Card - centered, compact */}
      <div className="flex justify-center mb-3">
        <button onClick={() => setViewCard(card)} className="w-44 rounded-lg overflow-hidden active:scale-[0.98]">
          <img src={getCardImage(card)} alt={card.name} className="w-full" />
        </button>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { value: 'likely' as WheelLikelihood, label: 'Wheels', color: 'green' },
          { value: 'maybe' as WheelLikelihood, label: 'Maybe', color: 'amber' },
          { value: 'unlikely' as WheelLikelihood, label: 'Taken', color: 'red' },
        ].map(opt => {
          const isCorrect = opt.value === actual;
          const isGuessed = opt.value === guess;

          return (
            <button
              key={opt.value}
              onClick={() => handleGuess(opt.value)}
              disabled={revealed}
              className={`py-3 rounded-lg font-bold transition-all active:scale-[0.98] ${
                revealed
                  ? isCorrect
                    ? opt.color === 'green' ? 'bg-green-500 text-white' : opt.color === 'amber' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                    : isGuessed ? 'bg-red-500/50 text-white/70' : 'bg-white/5 text-white/30'
                  : opt.color === 'green' ? 'bg-green-500/20 text-green-400' : opt.color === 'amber' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Result + Next */}
      {revealed && (
        <div className="space-y-2">
          <div className={`text-center font-bold ${guess === actual ? 'text-green-400' : 'text-red-400'}`}>
            {guess === actual ? 'Correct!' : 'Wrong!'}
            <span className="text-white/40 text-sm font-normal ml-2">Top {100 - percentile}%</span>
          </div>
          <button onClick={newRound} className="w-full py-3 bg-white text-black rounded-lg font-bold active:scale-[0.98]">
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
  const [viewCard, setViewCard] = useState<CubeCard | null>(null);

  const newRound = useCallback(() => {
    const [c] = getRandomCards(cards, 1);
    setCard(c);
    setRevealed(false);
    setGuess(null);
  }, [cards]);

  useEffect(() => { newRound(); }, [newRound]);

  if (!card) return null;

  const percentile = getPercentile(card.name);
  const isFirstPickable = percentile >= 75;

  const handleGuess = (g: boolean) => {
    if (revealed) return;
    setGuess(g);
    setRevealed(true);
    onUpdate(g === isFirstPickable);
  };

  return (
    <div>
      <GameHeader title="First Pickable?" subtitle="Would you P1P1 this? (Top 25%)" streak={stats.streak} onBack={onBack} />

      {viewCard && <CardViewer card={viewCard} onClose={() => setViewCard(null)} />}

      {/* Card */}
      <div className="flex justify-center mb-3">
        <button onClick={() => setViewCard(card)} className="w-44 rounded-lg overflow-hidden active:scale-[0.98]">
          <img src={getCardImage(card)} alt={card.name} className="w-full" />
        </button>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => handleGuess(true)}
          disabled={revealed}
          className={`py-3 rounded-lg font-bold transition-all active:scale-[0.98] ${
            revealed
              ? isFirstPickable ? 'bg-green-500 text-white' : guess === true ? 'bg-red-500/50 text-white/70' : 'bg-white/5 text-white/30'
              : 'bg-green-500/20 text-green-400'
          }`}
        >
          First Pick
        </button>
        <button
          onClick={() => handleGuess(false)}
          disabled={revealed}
          className={`py-3 rounded-lg font-bold transition-all active:scale-[0.98] ${
            revealed
              ? !isFirstPickable ? 'bg-green-500 text-white' : guess === false ? 'bg-red-500/50 text-white/70' : 'bg-white/5 text-white/30'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          Pass
        </button>
      </div>

      {/* Result + Next */}
      {revealed && (
        <div className="space-y-2">
          <div className={`text-center font-bold ${guess === isFirstPickable ? 'text-green-400' : 'text-red-400'}`}>
            {guess === isFirstPickable ? 'Correct!' : 'Wrong!'}
            <span className="text-white/40 text-sm font-normal ml-2">Top {100 - percentile}%</span>
          </div>
          <button onClick={newRound} className="w-full py-3 bg-white text-black rounded-lg font-bold active:scale-[0.98]">
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
  const [viewCard, setViewCard] = useState<CubeCard | null>(null);

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
    <div>
      <GameHeader title="Stay in Lane" subtitle="Pick the card that fits your colors" streak={stats.streak} onBack={onBack} />

      {viewCard && <CardViewer card={viewCard} onClose={() => setViewCard(null)} />}

      {/* Deck colors */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-sm text-white/50">Your deck:</span>
        {state.deckColors.map(c => (
          <span key={c} className={`w-7 h-7 rounded flex items-center justify-center font-bold text-sm ${colorLabels[c].bg}`}>
            {colorLabels[c].name}
          </span>
        ))}
      </div>

      {/* 3 cards in a row */}
      <div className="flex gap-2 mb-3">
        {state.options.map((card, idx) => {
          const isCorrect = idx === state.correctIndex;
          const isPicked = picked === idx;

          return (
            <button
              key={card.id}
              onClick={() => revealed ? setViewCard(card) : handlePick(idx)}
              className={`flex-1 rounded-lg overflow-hidden transition-all ${
                revealed
                  ? isCorrect ? 'ring-2 ring-green-500' : isPicked ? 'ring-2 ring-red-500' : 'opacity-40'
                  : 'active:scale-[0.98]'
              }`}
            >
              <img src={getCardImage(card)} alt={card.name} className="w-full" />
            </button>
          );
        })}
      </div>

      {/* Result + Next */}
      {revealed && (
        <div className="space-y-2">
          <div className={`text-center font-bold ${picked === state.correctIndex ? 'text-green-400' : 'text-red-400'}`}>
            {picked === state.correctIndex ? 'Correct!' : 'Wrong!'}
          </div>
          <button onClick={newRound} className="w-full py-3 bg-white text-black rounded-lg font-bold active:scale-[0.98]">
            Next
          </button>
        </div>
      )}

      <GameStats stats={stats} />
    </div>
  );
}

// ============ GAME 5: Speed Round ============
function SpeedRoundGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'done'>('ready');
  const [pair, setPair] = useState<[CubeCard, CubeCard] | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);

  const newPair = useCallback(() => {
    const [a, b] = getRandomCards(cards, 2);
    setPair([a, b]);
    setLastResult(null);
  }, [cards]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(30);
    newPair();
  }, [newPair]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft <= 0) {
      setGameState('done');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, timeLeft]);

  const handlePick = (index: 0 | 1) => {
    if (!pair || gameState !== 'playing') return;
    const eloA = getEloData(pair[0].name)?.elo || 0;
    const eloB = getEloData(pair[1].name)?.elo || 0;
    const correct = (index === 0 && eloA >= eloB) || (index === 1 && eloB > eloA);

    if (correct) {
      setScore(s => s + 1);
      setLastResult('correct');
      onUpdate(true);
    } else {
      setLastResult('wrong');
      onUpdate(false);
    }

    setTimeout(newPair, 150);
  };

  if (gameState === 'ready') {
    return (
      <div className="text-center">
        <GameHeader title="Speed Round" subtitle="30 seconds of Higher/Lower" streak={stats.bestStreak} onBack={onBack} />
        <Timer className="w-16 h-16 text-red-400 mx-auto my-4" />
        <p className="text-white/60 mb-4">Tap the higher ELO card as fast as you can!</p>
        <button onClick={startGame} className="w-full py-4 bg-red-500 text-white rounded-lg font-bold text-lg active:scale-[0.98]">
          Start!
        </button>
        {stats.bestStreak > 0 && (
          <div className="text-white/40 text-sm mt-3">Best: {stats.bestStreak}</div>
        )}
      </div>
    );
  }

  if (gameState === 'done') {
    return (
      <div className="text-center">
        <GameHeader title="Speed Round" subtitle="Time's up!" streak={stats.bestStreak} onBack={onBack} />
        <div className="text-6xl font-bold text-white my-4">{score}</div>
        <div className="text-white/50 mb-4">correct picks</div>
        {score > stats.bestStreak && (
          <div className="text-amber-400 font-bold mb-3">New best!</div>
        )}
        <button onClick={startGame} className="w-full py-4 bg-red-500 text-white rounded-lg font-bold text-lg active:scale-[0.98]">
          Play Again
        </button>
      </div>
    );
  }

  if (!pair) return null;

  return (
    <div>
      {/* Score + timer */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-bold text-white">{score}</div>
        <div className={`text-3xl font-mono font-bold px-3 py-1 rounded-lg ${
          timeLeft <= 5 ? 'text-red-400 bg-red-500/20 animate-pulse' : 'text-white bg-white/10'
        }`}>
          {timeLeft}
        </div>
      </div>

      {/* Cards side by side */}
      <div className={`flex gap-2 transition-all ${lastResult === 'correct' ? 'scale-[1.01]' : lastResult === 'wrong' ? 'opacity-80' : ''}`}>
        {pair.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handlePick(idx as 0 | 1)}
            className="flex-1 rounded-lg overflow-hidden active:scale-[0.98]"
          >
            <img src={getCardImage(card)} alt={card.name} className="w-full" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ GAME 6: Guess the CMC ============
function GuessCmcGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [card, setCard] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const [viewCard, setViewCard] = useState<CubeCard | null>(null);

  const newRound = useCallback(() => {
    const [c] = getRandomCards(cards, 1);
    setCard(c);
    setRevealed(false);
    setGuess(null);
  }, [cards]);

  useEffect(() => { newRound(); }, [newRound]);

  if (!card) return null;

  const actualCmc = card.cmc ?? 0;

  const handleGuess = (g: number) => {
    if (revealed) return;
    setGuess(g);
    setRevealed(true);
    onUpdate(g === Math.min(actualCmc, 7));
  };

  return (
    <div>
      <GameHeader title="Guess the CMC" subtitle="What's this card's mana value?" streak={stats.streak} onBack={onBack} />

      {viewCard && <CardViewer card={viewCard} onClose={() => setViewCard(null)} />}

      {/* Card */}
      <div className="flex justify-center mb-3">
        <button onClick={() => setViewCard(card)} className="w-44 rounded-lg overflow-hidden active:scale-[0.98]">
          <img src={getCardImage(card)} alt={card.name} className="w-full" />
        </button>
      </div>

      {/* CMC buttons - 4x2 grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(n => {
          const isCorrect = n === Math.min(actualCmc, 7);
          const isGuessed = guess === n;

          return (
            <button
              key={n}
              onClick={() => handleGuess(n)}
              disabled={revealed}
              className={`py-3 rounded-lg font-bold transition-all active:scale-[0.98] ${
                revealed
                  ? isCorrect ? 'bg-green-500 text-white' : isGuessed ? 'bg-red-500 text-white' : 'bg-white/5 text-white/30'
                  : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              {n === 7 ? '7+' : n}
            </button>
          );
        })}
      </div>

      {/* Result + Next */}
      {revealed && (
        <div className="space-y-2">
          <div className={`text-center font-bold ${guess === Math.min(actualCmc, 7) ? 'text-green-400' : 'text-red-400'}`}>
            {guess === Math.min(actualCmc, 7) ? 'Correct!' : `Wrong! It costs ${actualCmc}`}
          </div>
          <button onClick={newRound} className="w-full py-3 bg-white text-black rounded-lg font-bold active:scale-[0.98]">
            Next
          </button>
        </div>
      )}

      <GameStats stats={stats} />
    </div>
  );
}

// Vector API URL
const VECTOR_API = 'https://cube-vectors.jdnyzio.workers.dev';

// ============ GAME 7: Synergy Snap ============
function SynergySnapGame({ cards, stats, onUpdate, onBack }: GameComponentProps) {
  const [pair, setPair] = useState<[CubeCard, CubeCard] | null>(null);
  const [hasSynergy, setHasSynergy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [similarity, setSimilarity] = useState<number | null>(null);

  const newRound = useCallback(async () => {
    setLoading(true);
    const [a, b] = getRandomCards(cards, 2);
    setPair([a, b]);
    setRevealed(false);
    setGuess(null);
    setSimilarity(null);

    try {
      const response = await fetch(`${VECTOR_API}/similarity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card1: { name: a.name, type_line: a.type_line || '', oracle_text: a.oracle_text || '' },
          card2: { name: b.name, type_line: b.type_line || '', oracle_text: b.oracle_text || '' },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setHasSynergy(result.hasSynergy);
        setSimilarity(result.similarity);
      } else {
        setHasSynergy(false);
      }
    } catch {
      setHasSynergy(false);
    }

    setLoading(false);
  }, [cards]);

  useEffect(() => { newRound(); }, [newRound]);

  const [viewCard, setViewCard] = useState<CubeCard | null>(null);

  if (!pair || loading) {
    return (
      <div className="text-center">
        <GameHeader title="Synergy Snap" subtitle="Analyzing with AI..." streak={stats.streak} onBack={onBack} />
        <div className="py-8">
          <div className="animate-spin w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  const handleGuess = (g: boolean) => {
    if (revealed) return;
    setGuess(g);
    setRevealed(true);
    onUpdate(g === hasSynergy);
  };

  return (
    <div>
      <GameHeader title="Synergy Snap" subtitle="Do these cards work together?" streak={stats.streak} onBack={onBack} />

      {viewCard && <CardViewer card={viewCard} onClose={() => setViewCard(null)} />}

      {/* Cards side by side */}
      <div className="flex gap-2 mb-3">
        {pair.map((card) => (
          <button
            key={card.id}
            onClick={() => setViewCard(card)}
            className="flex-1 rounded-lg overflow-hidden active:scale-[0.98]"
          >
            <img src={getCardImage(card)} alt={card.name} className="w-full" />
          </button>
        ))}
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => handleGuess(true)}
          disabled={revealed}
          className={`py-3 rounded-lg font-bold transition-all active:scale-[0.98] ${
            revealed
              ? hasSynergy ? 'bg-green-500 text-white' : guess === true ? 'bg-red-500/50 text-white/70' : 'bg-white/5 text-white/30'
              : 'bg-pink-500/20 text-pink-400'
          }`}
        >
          Synergy!
        </button>
        <button
          onClick={() => handleGuess(false)}
          disabled={revealed}
          className={`py-3 rounded-lg font-bold transition-all active:scale-[0.98] ${
            revealed
              ? !hasSynergy ? 'bg-green-500 text-white' : guess === false ? 'bg-red-500/50 text-white/70' : 'bg-white/5 text-white/30'
              : 'bg-white/10 text-white/60'
          }`}
        >
          No synergy
        </button>
      </div>

      {/* Result + Next */}
      {revealed && (
        <div className="space-y-2">
          <div className={`text-center font-bold ${guess === hasSynergy ? 'text-green-400' : 'text-red-400'}`}>
            {guess === hasSynergy ? 'Correct!' : 'Wrong!'}
            {similarity !== null && (
              <span className="text-white/40 text-sm font-normal ml-2">{Math.round(similarity * 100)}% match</span>
            )}
          </div>
          <button onClick={newRound} className="w-full py-3 bg-white text-black rounded-lg font-bold active:scale-[0.98]">
            Next
          </button>
        </div>
      )}

      <GameStats stats={stats} />
    </div>
  );
}
