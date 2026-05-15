import { useState, useCallback, useEffect } from 'react';
import type { CubeCard } from '../types/card';
import { getCardImage } from '../services/scryfall';
import {
  getEloData,
  getPercentile,
  getWheelLikelihood,
  type WheelLikelihood,
} from '../services/eloHelpers';
import { Scale, CircleDot, Layers, Trophy, ChevronLeft, Flame, Timer, Hash, Sparkles, Package, Hand, Radio, GraduationCap, TrendingUp, TrendingDown, Minus, ArrowLeftRight, ListOrdered, Swords, Eye, Target, ListTree, Search, Gauge, Stethoscope, PuzzleIcon, SlidersHorizontal, Shuffle, BookOpen, LayoutGrid, Zap, Link2, Clock, Calculator, Shield, RotateCcw, Droplets, Users } from 'lucide-react';
import { srs, boolToQuality, type SkillCategory, type SkillRating } from '../services/spacedRepetition';

// Global filter types
type Color = 'W' | 'U' | 'B' | 'R' | 'G' | 'Colorless' | 'Multi';
type Tier = 'S' | 'A' | 'B' | 'C';

interface GlobalFilters {
  colors: Color[];  // Empty = all colors
  tiers: Tier[];    // Empty = all tiers
}

const FILTER_STORAGE_KEY = 'cube-games-filters-v2';

function loadFilters(): GlobalFilters {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return { colors: [], tiers: [] };
}

function saveFilters(filters: GlobalFilters) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {}
}

// Cognitive loop games (self-contained)
import { RecognitionGame } from './games/RecognitionGame';
import { EstimationGame } from './games/EstimationGame';
import { SequenceGame } from './games/SequenceGame';
import { ClassificationGame } from './games/ClassificationGame';
import { SpottingGame } from './games/SpottingGame';
import { ConstraintGame } from './games/ConstraintGame';
import { ReconstructionGame } from './games/ReconstructionGame';
import { RulesQuizGame } from './games/RulesQuizGame';
import { ArchetypeIdentifyGame } from './games/ArchetypeIdentifyGame';
import { PowerPredictorGame } from './games/PowerPredictorGame';
import { MechanicSpotGame } from './games/MechanicSpotGame';
import { SynergyMatchGame } from './games/SynergyMatchGame';
import { SpeedDraftGame } from './games/SpeedDraftGame';
import { CombatMathGame } from './games/CombatMathGame';
import { CounterPlayGame } from './games/CounterPlayGame';
import { WheelPredictionGame } from './games/WheelPredictionGame';
import { ManaBaseGame } from './games/ManaBaseGame';
import { RoleAssessmentGame } from './games/RoleAssessmentGame';

interface GamesPageProps {
  cards: CubeCard[];
}

type GameType = 'menu' | 'higher-lower' | 'wheel-or-not' | 'first-pick' | 'color-commit' | 'guess-cmc' | 'synergy-snap' | 'pack-p1p1' | 'mulligan-trainer' | 'signal-quiz' | 'archetype-flashcards' | 'sideboard-drill' | 'sequencing' | 'beatdown' | 'recognition' | 'estimation' | 'pick-order' | 'archetype-sort' | 'odd-one-out' | 'deck-doctor' | 'complete-curve' | 'rules-quiz' | 'archetype-identify' | 'power-predictor' | 'mechanic-spot' | 'synergy-match' | 'speed-draft' | 'combat-math' | 'counter-play' | 'wheel-prediction' | 'mana-base' | 'role-assessment';

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
  sequencing: { played: number; correct: number; streak: number; bestStreak: number };
  beatdown: { played: number; correct: number; streak: number; bestStreak: number };
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
        sequencing: parsed.sequencing || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
        beatdown: parsed.beatdown || { played: 0, correct: 0, streak: 0, bestStreak: 0 },
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
    sequencing: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
    beatdown: { played: 0, correct: 0, streak: 0, bestStreak: 0 },
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

// All playable games for quick match
const ALL_GAME_IDS: GameType[] = [
  'recognition', 'estimation', 'pick-order', 'archetype-sort', 'odd-one-out', 'deck-doctor', 'complete-curve',
  'pack-p1p1', 'mulligan-trainer', 'signal-quiz', 'archetype-flashcards', 'higher-lower', 'wheel-or-not',
  'first-pick', 'color-commit', 'guess-cmc', 'synergy-snap', 'sequencing', 'beatdown', 'rules-quiz', 'archetype-identify', 'power-predictor', 'mechanic-spot', 'synergy-match', 'speed-draft', 'combat-math', 'counter-play', 'wheel-prediction', 'mana-base', 'role-assessment',
];

export function GamesPage({ cards }: GamesPageProps) {
  const [game, setGame] = useState<GameType>('menu');
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [filters, setFilters] = useState<GlobalFilters>(loadFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Play a random game (excluding current game)
  const playRandomGame = useCallback((excludeCurrent = true) => {
    const available = excludeCurrent && game !== 'menu'
      ? ALL_GAME_IDS.filter(g => g !== game)
      : ALL_GAME_IDS;
    const randomGame = available[Math.floor(Math.random() * available.length)];
    setGame(randomGame);
  }, [game]);

  // Global P hotkey for quick match
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        playRandomGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playRandomGame]);

  // Apply filters to cards
  const filteredCards = cards.filter(card => {
    // Must have ELO data
    if (!getEloData(card.name)) return false;

    // Color filter (if any selected, card must match at least one)
    if (filters.colors.length > 0) {
      const cardColors = card.color_identity || [];
      const isColorless = cardColors.length === 0;
      const isMulti = cardColors.length > 1;

      let matchesColor = false;
      for (const filterColor of filters.colors) {
        if (filterColor === 'Colorless' && isColorless) matchesColor = true;
        else if (filterColor === 'Multi' && isMulti) matchesColor = true;
        else if (['W', 'U', 'B', 'R', 'G'].includes(filterColor) && cardColors.includes(filterColor)) matchesColor = true;
      }
      if (!matchesColor) return false;
    }

    // Tier filter (if any selected, card must match at least one)
    if (filters.tiers.length > 0) {
      const percentile = getPercentile(card.name);
      let matchesTier = false;
      for (const tier of filters.tiers) {
        if (tier === 'S' && percentile >= 90) matchesTier = true;
        else if (tier === 'A' && percentile >= 75 && percentile < 90) matchesTier = true;
        else if (tier === 'B' && percentile >= 50 && percentile < 75) matchesTier = true;
        else if (tier === 'C' && percentile < 50) matchesTier = true;
      }
      if (!matchesTier) return false;
    }

    return true;
  });

  const updateFilters = useCallback((newFilters: GlobalFilters) => {
    setFilters(newFilters);
    saveFilters(newFilters);
  }, []);

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

  // Difficulty levels for games
  type Difficulty = 'beginner' | 'intermediate' | 'advanced';

  // All games with difficulty ratings - organized by skill progression
  const allGames: {
    id: GameType;
    name: string;
    desc: string;
    icon: React.ElementType;
    difficulty: Difficulty;
    cognitive?: boolean;
    color?: string;
    stats?: typeof stats.higherLower;
    featured?: boolean;
  }[] = [
    // Beginner - Card Recognition & Basic Evaluation
    { id: 'recognition', name: 'Name That Card', desc: 'Identify from art only', icon: Eye, difficulty: 'beginner', cognitive: true },
    { id: 'guess-cmc', name: 'Guess the CMC', desc: 'What does this card cost?', icon: Hash, difficulty: 'beginner', color: 'cyan', stats: stats.guessCmc },
    { id: 'higher-lower', name: 'Higher or Lower', desc: 'Which has higher ELO?', icon: Scale, difficulty: 'beginner', color: 'blue', stats: stats.higherLower },
    { id: 'first-pick', name: 'First Pickable?', desc: 'Is this P1P1 worthy?', icon: Trophy, difficulty: 'beginner', color: 'amber', stats: stats.firstPick },
    { id: 'estimation', name: 'Guess the ELO', desc: 'How strong is this card?', icon: Gauge, difficulty: 'beginner', cognitive: true },
    { id: 'rules-quiz', name: 'Rules Quiz', desc: 'Master MTG keywords', icon: BookOpen, difficulty: 'beginner', cognitive: true },

    // Intermediate - Draft Strategy
    { id: 'pack-p1p1', name: 'Pack P1P1', desc: 'Pick the best card from a pack', icon: Package, difficulty: 'intermediate', color: 'orange', stats: stats.packP1P1, featured: true },
    { id: 'pick-order', name: 'Pick Order', desc: 'Rank 3 cards best to worst', icon: ListTree, difficulty: 'intermediate', cognitive: true },
    { id: 'wheel-or-not', name: 'Will It Wheel?', desc: 'Will it come back around?', icon: CircleDot, difficulty: 'intermediate', color: 'green', stats: stats.wheelOrNot },
    { id: 'wheel-prediction', name: 'Wheel Prediction', desc: 'Which cards will table?', icon: RotateCcw, difficulty: 'intermediate', cognitive: true },
    { id: 'archetype-sort', name: 'Archetype Sort', desc: 'Which deck wants this?', icon: Target, difficulty: 'intermediate', cognitive: true },
    { id: 'archetype-identify', name: 'Name That Deck', desc: 'Identify archetype from cards', icon: LayoutGrid, difficulty: 'intermediate', cognitive: true },
    { id: 'color-commit', name: 'Stay in Lane', desc: 'Pick the on-color card', icon: Layers, difficulty: 'intermediate', color: 'purple', stats: stats.colorCommit },
    { id: 'signal-quiz', name: 'Signal Quiz', desc: 'What does this late pick mean?', icon: Radio, difficulty: 'intermediate', color: 'cyan', stats: stats.signalQuiz, featured: true },

    // Advanced - Deck Building & Play
    { id: 'synergy-match', name: 'Synergy Match', desc: 'Which card synergizes best?', icon: Link2, difficulty: 'advanced', cognitive: true },
    { id: 'synergy-snap', name: 'Synergy Snap', desc: 'Do these cards combo?', icon: Sparkles, difficulty: 'advanced', color: 'pink', stats: stats.synergySnap },
    { id: 'odd-one-out', name: 'Odd One Out', desc: 'Find the misfit', icon: Search, difficulty: 'advanced', cognitive: true },
    { id: 'deck-doctor', name: 'Deck Doctor', desc: 'What\'s wrong here?', icon: Stethoscope, difficulty: 'advanced', cognitive: true },
    { id: 'complete-curve', name: 'Complete the Curve', desc: 'Fill the missing slot', icon: PuzzleIcon, difficulty: 'advanced', cognitive: true },
    { id: 'mana-base', name: 'Mana Base', desc: 'Build the right land split', icon: Droplets, difficulty: 'advanced', cognitive: true },
    { id: 'mulligan-trainer', name: 'Mulligan Trainer', desc: 'Keep or mull this hand?', icon: Hand, difficulty: 'advanced', color: 'indigo', stats: stats.mulliganTrainer, featured: true },
    { id: 'archetype-flashcards', name: 'Archetype Drills', desc: 'Name the key cards', icon: GraduationCap, difficulty: 'advanced', color: 'emerald', stats: stats.archetypeFlashcards, featured: true },
    { id: 'speed-draft', name: 'Speed Draft', desc: 'Timed P1P1 picks under pressure', icon: Clock, difficulty: 'advanced', cognitive: true },
    { id: 'sequencing', name: 'Sequencing', desc: 'Order your plays correctly', icon: ListOrdered, difficulty: 'advanced', color: 'violet', stats: stats.sequencing, featured: true },
    { id: 'beatdown', name: 'Who\'s the Beatdown?', desc: 'Identify your role', icon: Swords, difficulty: 'advanced', color: 'sky', stats: stats.beatdown, featured: true },
    { id: 'role-assessment', name: 'Role Assessment', desc: 'Who\'s the beatdown?', icon: Users, difficulty: 'advanced', cognitive: true },
    { id: 'combat-math', name: 'Combat Math', desc: 'Can you attack profitably?', icon: Calculator, difficulty: 'advanced', cognitive: true },
    { id: 'counter-play', name: 'Counter Play', desc: 'What beats this strategy?', icon: Shield, difficulty: 'advanced', cognitive: true },
    { id: 'power-predictor', name: 'Power Predictor', desc: 'Guess mechanic strength', icon: Zap, difficulty: 'advanced', cognitive: true },
    { id: 'mechanic-spot', name: 'Mechanic Spot', desc: 'Quick binary: what does this card do?', icon: Target, difficulty: 'advanced', cognitive: true },
    { id: 'sideboard-drill', name: 'Sideboard Guide', desc: 'What comes in/out?', icon: ArrowLeftRight, difficulty: 'advanced', color: 'rose', stats: stats.sideboardDrill, featured: true },
  ];

  // Filter games by type (with type guards for proper typing)
  const cognitiveLoopGames = allGames.filter((g): g is typeof g & { cognitive: true } => g.cognitive === true);
  const games = allGames.filter((g): g is typeof g & { color: string; stats: typeof stats.higherLower } =>
    !g.cognitive && g.color !== undefined && g.stats !== undefined
  );

  // Cognitive loop games route first (they manage their own state)
  if (game === 'recognition') {
    return <RecognitionGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'estimation') {
    return <EstimationGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'pick-order') {
    return <SequenceGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'archetype-sort') {
    return <ClassificationGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'odd-one-out') {
    return <SpottingGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'deck-doctor') {
    return <ConstraintGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'complete-curve') {
    return <ReconstructionGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'rules-quiz') {
    return <RulesQuizGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'archetype-identify') {
    return <ArchetypeIdentifyGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'power-predictor') {
    return <PowerPredictorGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'mechanic-spot') {
    return <MechanicSpotGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'synergy-match') {
    return <SynergyMatchGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'speed-draft') {
    return <SpeedDraftGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'combat-math') {
    return <CombatMathGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'counter-play') {
    return <CounterPlayGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'wheel-prediction') {
    return <WheelPredictionGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'mana-base') {
    return <ManaBaseGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }
  if (game === 'role-assessment') {
    return <RoleAssessmentGame cards={filteredCards} onBack={() => setGame('menu')} onShuffle={playRandomGame} />;
  }

  // Legacy games with shared stats system
  const legacyGameTypes = ['pack-p1p1', 'mulligan-trainer', 'signal-quiz', 'archetype-flashcards',
    'sideboard-drill', 'sequencing', 'beatdown', 'higher-lower', 'wheel-or-not',
    'first-pick', 'color-commit', 'guess-cmc', 'synergy-snap'] as const;

  if (game !== 'menu' && legacyGameTypes.includes(game as typeof legacyGameTypes[number])) {
    const GameComponent = {
      'pack-p1p1': PackP1P1Game,
      'mulligan-trainer': MulliganTrainerGame,
      'signal-quiz': SignalQuizGame,
      'archetype-flashcards': ArchetypeFlashcardsGame,
      'sideboard-drill': SideboardDrillGame,
      'sequencing': SequencingGame,
      'beatdown': BeatdownGame,
      'higher-lower': HigherLowerGame,
      'wheel-or-not': WheelOrNotGame,
      'first-pick': FirstPickGame,
      'color-commit': ColorCommitGame,
      'guess-cmc': GuessCmcGame,
      'synergy-snap': SynergySnapGame,
    }[game as typeof legacyGameTypes[number]];

    const gameKey = {
      'pack-p1p1': 'packP1P1',
      'mulligan-trainer': 'mulliganTrainer',
      'signal-quiz': 'signalQuiz',
      'archetype-flashcards': 'archetypeFlashcards',
      'sideboard-drill': 'sideboardDrill',
      'sequencing': 'sequencing',
      'beatdown': 'beatdown',
      'higher-lower': 'higherLower',
      'wheel-or-not': 'wheelOrNot',
      'first-pick': 'firstPick',
      'color-commit': 'colorCommit',
      'guess-cmc': 'guessCmc',
      'synergy-snap': 'synergySnap',
    }[game as typeof legacyGameTypes[number]] as keyof GameStats;

    return (
      <GameComponent
        cards={filteredCards}
        stats={stats[gameKey]}
        onUpdate={(c: boolean) => updateStats(gameKey, c)}
        onBack={() => setGame('menu')}
        onShuffle={playRandomGame}
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

      {/* Quick Match Button */}
      <button
        onClick={() => playRandomGame(false)}
        className="w-full py-4 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center gap-3 hover:bg-white/[0.1] active:scale-[0.99] transition-all group"
      >
        <Shuffle className="w-5 h-5 text-white/60 group-hover:scale-110 transition-transform" />
        <span className="text-lg font-medium text-white/80">Quick Match</span>
        <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/40 font-mono">P</kbd>
      </button>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onUpdateFilters={updateFilters}
        filteredCount={filteredCards.length}
        totalCount={cards.filter(c => getEloData(c.name)).length}
        expanded={showFilterPanel}
        onToggle={() => setShowFilterPanel(!showFilterPanel)}
      />

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

      {/* Cognitive Loop Games */}
      <div>
        <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Cognitive Training</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cognitiveLoopGames.map(g => (
            <CognitiveGameButton key={g.id} game={g} onSelect={setGame} />
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

// ============ FILTER PANEL ============
function FilterPanel({
  filters,
  onUpdateFilters,
  filteredCount,
  totalCount,
  expanded,
  onToggle,
}: {
  filters: GlobalFilters;
  onUpdateFilters: (filters: GlobalFilters) => void;
  filteredCount: number;
  totalCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasFilters = filters.colors.length > 0 || filters.tiers.length > 0;

  const colorOptions: { value: Color; label: string; shortLabel: string; bg: string; textClass: string }[] = [
    { value: 'W', label: 'White', shortLabel: 'W', bg: 'bg-amber-100', textClass: 'text-amber-900' },
    { value: 'U', label: 'Blue', shortLabel: 'U', bg: 'bg-blue-500', textClass: 'text-white' },
    { value: 'B', label: 'Black', shortLabel: 'B', bg: 'bg-purple-900', textClass: 'text-white' },
    { value: 'R', label: 'Red', shortLabel: 'R', bg: 'bg-red-500', textClass: 'text-white' },
    { value: 'G', label: 'Green', shortLabel: 'G', bg: 'bg-green-600', textClass: 'text-white' },
    { value: 'Colorless', label: 'Colorless', shortLabel: 'C', bg: 'bg-gray-500', textClass: 'text-white' },
    { value: 'Multi', label: 'Multi', shortLabel: 'M', bg: 'bg-gradient-to-r from-amber-400 via-green-400 to-blue-400', textClass: 'text-white' },
  ];

  const tierOptions: { value: Tier; label: string; shortLabel: string; color: string }[] = [
    { value: 'S', label: 'S-Tier', shortLabel: 'S', color: 'text-amber-400 border-amber-400/50' },
    { value: 'A', label: 'A-Tier', shortLabel: 'A', color: 'text-purple-400 border-purple-400/50' },
    { value: 'B', label: 'B-Tier', shortLabel: 'B', color: 'text-blue-400 border-blue-400/50' },
    { value: 'C', label: 'C-Tier', shortLabel: 'C', color: 'text-white/50 border-white/20' },
  ];

  const toggleColor = (color: Color) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter(c => c !== color)
      : [...filters.colors, color];
    onUpdateFilters({ ...filters, colors: newColors });
  };

  const toggleTier = (tier: Tier) => {
    const newTiers = filters.tiers.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...filters.tiers, tier];
    onUpdateFilters({ ...filters, tiers: newTiers });
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Collapsed header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <SlidersHorizontal className={`w-4 h-4 ${hasFilters ? 'text-white' : 'text-white/40'}`} />
          <span className="text-sm text-white/70">Card Filter</span>
          {hasFilters && (
            <div className="flex items-center gap-1">
              {filters.colors.map(c => {
                const opt = colorOptions.find(o => o.value === c);
                return (
                  <span key={c} className={`w-5 h-5 rounded-full ${opt?.bg} flex items-center justify-center text-[10px] font-bold ${opt?.textClass}`}>
                    {opt?.shortLabel}
                  </span>
                );
              })}
              {filters.tiers.map(t => {
                const opt = tierOptions.find(o => o.value === t);
                return (
                  <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 ${opt?.color.split(' ')[0]}`}>
                    {t}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{filteredCount}/{totalCount} cards</span>
          <ChevronLeft className={`w-4 h-4 text-white/40 transition-transform ${expanded ? '-rotate-90' : 'rotate-180'}`} />
        </div>
      </button>

      {/* Expanded filter options */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">
          {/* Color Filter - Multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-white/40 uppercase tracking-wide">Colors</div>
              <div className="text-[10px] text-white/30">
                {filters.colors.length === 0 ? 'All colors' : `${filters.colors.length} selected`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(opt => {
                const isSelected = filters.colors.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleColor(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${opt.bg} ${opt.textClass} ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-105'
                        : 'opacity-40 hover:opacity-70'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier Filter - Multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-white/40 uppercase tracking-wide">Power Tier</div>
              <div className="text-[10px] text-white/30">
                {filters.tiers.length === 0 ? 'All tiers' : `${filters.tiers.length} selected`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {tierOptions.map(opt => {
                const isSelected = filters.tiers.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleTier(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${opt.color} ${
                      isSelected
                        ? 'bg-white/20 ring-1 ring-white/50'
                        : 'bg-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-white/30">
              S = Top 10% • A = Top 25% • B = Top 50% • C = Bottom 50%
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => onUpdateFilters({ colors: [], tiers: [] })}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
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

// Mastery level definitions
const MASTERY_LEVELS = [
  { name: 'Bronze', minElo: 0, color: 'text-amber-600', bg: 'bg-amber-600', border: 'border-amber-600' },
  { name: 'Silver', minElo: 1150, color: 'text-gray-300', bg: 'bg-gray-300', border: 'border-gray-300' },
  { name: 'Gold', minElo: 1250, color: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-400' },
  { name: 'Diamond', minElo: 1350, color: 'text-cyan-300', bg: 'bg-cyan-300', border: 'border-cyan-300' },
  { name: 'Master', minElo: 1450, color: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-400' },
];

function getMasteryLevel(elo: number) {
  for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
    if (elo >= MASTERY_LEVELS[i].minElo) return { level: MASTERY_LEVELS[i], index: i };
  }
  return { level: MASTERY_LEVELS[0], index: 0 };
}

function getProgressToNextLevel(elo: number) {
  const { level, index } = getMasteryLevel(elo);
  const nextLevel = MASTERY_LEVELS[index + 1];
  if (!nextLevel) return { progress: 100, pointsNeeded: 0, nextLevel: null };

  const rangeStart = level.minElo;
  const rangeEnd = nextLevel.minElo;
  const progress = ((elo - rangeStart) / (rangeEnd - rangeStart)) * 100;
  const pointsNeeded = rangeEnd - elo;

  return { progress: Math.min(100, Math.max(0, progress)), pointsNeeded, nextLevel };
}

function ProgressDashboard({
  mastery,
  skillRatings,
  totalReviews,
}: {
  mastery: { elo: number; percentile: number; strengths: SkillCategory[]; weaknesses: SkillCategory[] };
  skillRatings: SkillRating[];
  totalReviews: number;
}) {
  const hasData = totalReviews > 0 || skillRatings.some(r => r.totalAttempts > 0);

  if (!hasData) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
          <Target className="w-8 h-8 text-white/30" />
        </div>
        <div className="text-white/70 font-medium mb-1">Start Your Training</div>
        <div className="text-sm text-white/40">Complete drills to build your Draft Readiness score</div>
      </div>
    );
  }

  const activeSkills = skillRatings.filter(r => r.totalAttempts > 0);
  const { level: overallLevel } = getMasteryLevel(mastery.elo);
  const { progress, pointsNeeded, nextLevel } = getProgressToNextLevel(mastery.elo);

  // Calculate "Draft Readiness" as a 0-1000 score
  // Based on: overall ELO normalized + skill breadth bonus
  const baseScore = Math.min(800, Math.max(0, ((mastery.elo - 1000) / 500) * 800));
  const breadthBonus = Math.min(200, activeSkills.length * 25); // Up to 200 for training 8 skills
  const draftReadiness = Math.round(baseScore + breadthBonus);

  const getReadinessLabel = (score: number) => {
    if (score >= 900) return { label: 'Expert', desc: 'You\'re ready for high-stakes drafts' };
    if (score >= 750) return { label: 'Advanced', desc: 'Strong fundamentals, refining edges' };
    if (score >= 550) return { label: 'Intermediate', desc: 'Building solid foundations' };
    if (score >= 300) return { label: 'Developing', desc: 'Learning the core concepts' };
    return { label: 'Beginner', desc: 'Just getting started' };
  };

  const readiness = getReadinessLabel(draftReadiness);

  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Draft Readiness Header */}
      <div className="p-5 bg-gradient-to-br from-white/[0.04] to-transparent">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Draft Readiness</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">{draftReadiness}</span>
              <span className="text-white/30 text-sm">/ 1000</span>
            </div>
            <div className="text-sm text-white/50 mt-1">{readiness.label}</div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${overallLevel.border} bg-black/20`}>
              <div className={`w-2 h-2 rounded-full ${overallLevel.bg}`} />
              <span className={`text-sm font-medium ${overallLevel.color}`}>{overallLevel.name}</span>
            </div>
            {nextLevel && (
              <div className="text-[10px] text-white/30 mt-1.5">
                {pointsNeeded} pts to {nextLevel.name}
              </div>
            )}
          </div>
        </div>

        {/* Progress to next level */}
        {nextLevel && (
          <div className="mb-3">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${overallLevel.bg}`}
                style={{ width: `${progress}%`, opacity: 0.8 }}
              />
            </div>
          </div>
        )}

        <div className="text-xs text-white/40">{readiness.desc}</div>
      </div>

      {/* Skills Grid */}
      {activeSkills.length > 0 && (
        <div className="px-5 pb-5">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Skill Mastery</div>
          <div className="grid grid-cols-2 gap-2">
            {activeSkills.slice(0, 6).map(skill => (
              <SkillMasteryCard key={skill.category} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {/* Focus Recommendation */}
      {mastery.weaknesses.length > 0 && activeSkills.length >= 2 && (
        <div className="px-5 pb-5 pt-0">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
            <Target className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-amber-400">Recommended Focus</div>
              <div className="text-xs text-white/60 mt-0.5">
                Train <span className="text-white">{mastery.weaknesses.map(s => SKILL_NAMES[s]).join(' or ')}</span> to level up faster
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
        <span>{totalReviews} total reviews</span>
        <span>{activeSkills.length}/8 skills trained</span>
      </div>
    </div>
  );
}

function SkillMasteryCard({ skill }: { skill: SkillRating }) {
  const { level } = getMasteryLevel(skill.elo);
  const { progress, nextLevel } = getProgressToNextLevel(skill.elo);

  const TrendIcon = skill.trend === 'improving' ? TrendingUp
    : skill.trend === 'declining' ? TrendingDown
    : Minus;

  const trendColor = skill.trend === 'improving' ? 'text-green-400'
    : skill.trend === 'declining' ? 'text-red-400'
    : 'text-white/20';

  return (
    <div className="bg-white/[0.03] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/70 truncate">{SKILL_NAMES[skill.category]}</span>
        <TrendIcon className={`w-3 h-3 ${trendColor} flex-shrink-0`} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${level.bg}`} />
        <span className={`text-xs font-medium ${level.color}`}>{level.name}</span>
        <span className="text-[10px] text-white/30 ml-auto">{skill.elo}</span>
      </div>

      {nextLevel && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${level.bg}`}
            style={{ width: `${progress}%`, opacity: 0.6 }}
          />
        </div>
      )}
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

  return (
    <button
      onClick={() => onSelect(game.id)}
      className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] rounded-xl p-4 text-left transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <game.icon className="w-5 h-5 text-white/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">{game.name}</div>
          <div className="text-xs text-white/40">{game.desc}</div>
        </div>
        {accuracy !== null && (
          <div className="text-right">
            <div className="text-lg font-bold text-white">{accuracy}%</div>
            <div className="text-[10px] text-white/30">{game.stats.played} played</div>
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

// ============ COGNITIVE GAME BUTTON ============
interface CognitiveGameItem {
  id: GameType;
  name: string;
  desc: string;
  icon: React.ElementType;
  cognitive: boolean;
}

function CognitiveGameButton({ game, onSelect }: { game: CognitiveGameItem; onSelect: (id: GameType) => void }) {
  return (
    <button
      onClick={() => onSelect(game.id)}
      className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] rounded-xl p-4 text-left transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <game.icon className="w-5 h-5 text-white/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">{game.name}</div>
          <div className="text-xs text-white/40">{game.desc}</div>
        </div>
      </div>
    </button>
  );
}

// ============ SHARED GAME WRAPPER ============
interface GameComponentProps {
  cards: CubeCard[];
  stats: { played: number; correct: number; streak: number; bestStreak: number };
  onUpdate: (correct: boolean) => void;
  onBack: () => void;
  onShuffle?: () => void;
}

function GameHeader({ title, subtitle, streak, onBack, onShuffle }: { title: string; subtitle: string; streak: number; onBack: () => void; onShuffle?: () => void }) {
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
      <div className="flex items-center gap-3">
        {streak > 0 && (
          <div className="flex items-center gap-1 text-amber-400">
            <Flame className="w-4 h-4" />
            <span className="font-bold">{streak}</span>
          </div>
        )}
        {onShuffle && (
          <button
            onClick={onShuffle}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
            title="Random game (P)"
          >
            <Shuffle className="w-4 h-4" />
          </button>
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

  // Timer state - always available during gameplay
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timedScore, setTimedScore] = useState(0);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [showTimerResults, setShowTimerResults] = useState(false);
  const [timerInputValue, setTimerInputValue] = useState(30);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Array<{
    leftCard: string;
    rightCard: string;
    leftElo: number;
    rightElo: number;
    pickedLeft: boolean;
    correct: boolean;
    timestamp: number;
  }>>([]);
  const [sessionStartTime, setSessionStartTime] = useState(0);

  // Cards are already filtered by global filter
  const newRound = useCallback(() => {
    if (cards.length < 2) return;
    const shuffled = shuffleArray(cards);
    setPair([shuffled[0], shuffled[1]]);
    setRevealed(false);
    setPicked(null);
  }, [cards]);

  // Start first round
  useEffect(() => {
    if (cards.length >= 2) {
      newRound();
    }
  }, []);

  // Start a timed challenge with countdown
  const startTimer = (duration: number) => {
    setShowTimerPicker(false);
    setTimedScore(0);
    setShowTimerResults(false);
    setTimeRemaining(duration);
    setSessionHistory([]);
    setSessionStartTime(Date.now());
    setCountdown(3); // Start 3-2-1 countdown
    // Reset to fresh round
    newRound();
  };

  // Countdown effect (3, 2, 1, GO!)
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setCountdown(null);
      setTimerRunning(true);
      setSessionStartTime(Date.now()); // Start tracking time when timer begins
      return;
    }

    const timer = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timeRemaining <= 0) return;

    const timer = setTimeout(() => {
      const newTime = timeRemaining - 1;
      setTimeRemaining(newTime);

      if (newTime === 0) {
        setTimerRunning(false);
        setShowTimerResults(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [timerRunning, timeRemaining]);

  // Keyboard shortcuts: A=left, S=right, Enter=next
  useEffect(() => {
    if (!pair || showTimerResults) return;

    const eloA = getEloData(pair[0].name)?.elo || 0;
    const eloB = getEloData(pair[1].name)?.elo || 0;
    const correctIndex = eloA >= eloB ? 0 : 1;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      if (!revealed) {
        if (key === 'a' || key === 's') {
          e.preventDefault();
          const pickedIdx = key === 'a' ? 0 : 1;
          setPicked(pickedIdx);
          setRevealed(true);
          const correct = pickedIdx === correctIndex;
          onUpdate(correct);

          // Track session if timer running
          if (timerRunning) {
            if (correct) setTimedScore(s => s + 1);
            const eloLeft = getEloData(pair[0].name)?.elo || 0;
            const eloRight = getEloData(pair[1].name)?.elo || 0;
            setSessionHistory(prev => [...prev, {
              leftCard: pair[0].name,
              rightCard: pair[1].name,
              leftElo: eloLeft,
              rightElo: eloRight,
              pickedLeft: pickedIdx === 0,
              correct,
              timestamp: Date.now(),
            }]);
          }
        }
      } else if (key === 'enter') {
        e.preventDefault();
        newRound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, pair, newRound, onUpdate, timerRunning, showTimerResults]);

  if (!pair) return null;

  const eloA = getEloData(pair[0].name)?.elo || 0;
  const eloB = getEloData(pair[1].name)?.elo || 0;
  const correctIndex = eloA >= eloB ? 0 : 1;

  const handlePick = (index: 0 | 1) => {
    if (revealed) return;
    setPicked(index);
    setRevealed(true);
    const correct = index === correctIndex;
    onUpdate(correct);

    // Track session if timer running
    if (timerRunning) {
      if (correct) setTimedScore(s => s + 1);
      setSessionHistory(prev => [...prev, {
        leftCard: pair[0].name,
        rightCard: pair[1].name,
        leftElo: eloA,
        rightElo: eloB,
        pickedLeft: index === 0,
        correct,
        timestamp: Date.now(),
      }]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timer Results Modal - Rich Stats */}
      {showTimerResults && (() => {
        const totalPicks = sessionHistory.length;
        const correctPicks = sessionHistory.filter(h => h.correct).length;
        const incorrectPicks = totalPicks - correctPicks;
        const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;

        // Calculate average time per pick
        const avgTimePerPick = totalPicks > 1
          ? Math.round((sessionHistory[sessionHistory.length - 1]?.timestamp - sessionStartTime) / totalPicks / 100) / 10
          : 0;

        // Get cards you got wrong for learning
        const mistakes = sessionHistory.filter(h => !h.correct).map(h => ({
          picked: h.pickedLeft ? h.leftCard : h.rightCard,
          pickedElo: h.pickedLeft ? h.leftElo : h.rightElo,
          correct: h.pickedLeft ? h.rightCard : h.leftCard,
          correctElo: h.pickedLeft ? h.rightElo : h.leftElo,
          eloDiff: Math.abs(h.leftElo - h.rightElo),
        }));

        // Find close calls (correct but within 50 ELO)
        const closeCalls = sessionHistory.filter(h => h.correct && Math.abs(h.leftElo - h.rightElo) < 50).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-in fade-in overflow-y-auto">
            <div className="bg-black border border-white/[0.08] rounded-2xl max-w-md w-full animate-in scale-up my-8 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06] text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-white/70" />
                </div>
                <h2 className="text-xl font-semibold text-white tracking-tight">Session Complete</h2>
                <p className="text-white/40 text-sm mt-1">{timerInputValue} second challenge</p>
              </div>

              {/* Main Score */}
              <div className="p-6 text-center">
                <div className="text-6xl font-bold text-white tracking-tight">{correctPicks}</div>
                <div className="text-white/40 text-sm mt-1">correct out of {totalPicks}</div>

                {/* Accuracy bar */}
                <div className="mt-4 max-w-[200px] mx-auto">
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-white/40 to-white/60 rounded-full transition-all duration-500"
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-white/30">0%</span>
                    <span className="text-white font-medium">{accuracy}% accuracy</span>
                    <span className="text-white/30">100%</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 border-y border-white/[0.06]">
                <div className="p-4 text-center border-r border-white/[0.06]">
                  <div className="text-2xl font-bold text-white">{correctPicks}</div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wide mt-0.5">Correct</div>
                </div>
                <div className="p-4 text-center border-r border-white/[0.06]">
                  <div className="text-2xl font-bold text-white/50">{incorrectPicks}</div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wide mt-0.5">Missed</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">{avgTimePerPick}s</div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wide mt-0.5">Per Pick</div>
                </div>
              </div>

              {/* Visual Chart - Pick History */}
              {totalPicks > 0 && (
                <div className="p-4">
                  <div className="text-[11px] text-white/40 mb-2 uppercase tracking-wide">Pick History</div>
                  <div className="flex gap-1 flex-wrap">
                    {sessionHistory.map((h, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-sm transition-all ${
                          h.correct ? 'bg-white/70' : 'bg-white/20'
                        }`}
                        title={`${i + 1}: ${h.correct ? '✓' : '✗'} ${h.leftCard} vs ${h.rightCard}`}
                      />
                    ))}
                  </div>
                  {closeCalls > 0 && (
                    <div className="text-xs text-white/30 mt-2">
                      {closeCalls} close call{closeCalls > 1 ? 's' : ''} within 50 ELO
                    </div>
                  )}
                </div>
              )}

              {/* Cards to Review */}
              {mistakes.length > 0 && (
                <div className="p-4 border-t border-white/[0.06]">
                  <div className="text-[11px] text-white/40 mb-3 uppercase tracking-wide">Cards to Review</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {mistakes.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white/30 flex-shrink-0">✗</span>
                          <span className="text-white/50 truncate">{m.picked}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-white/20">→</span>
                          <span className="text-white font-medium">{m.correct}</span>
                        </div>
                      </div>
                    ))}
                    {mistakes.length > 5 && (
                      <div className="text-xs text-white/30 text-center pt-1">+{mistakes.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Insight */}
              <div className="p-4 border-t border-white/[0.06]">
                <div className="text-sm text-white/50 leading-relaxed">
                  {accuracy >= 90 ? (
                    <span>Excellent session. You have strong card evaluation instincts.</span>
                  ) : accuracy >= 75 ? (
                    <span>Solid performance. Review the close matchups to sharpen your edge.</span>
                  ) : accuracy >= 60 ? (
                    <span>Good foundation. Focus on the cards above to improve recall.</span>
                  ) : mistakes.some(m => m.eloDiff > 300) ? (
                    <span>Review high-power staples like {mistakes.find(m => m.eloDiff > 300)?.correct}.</span>
                  ) : (
                    <span>Card evaluation improves with reps. Keep practicing.</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-white/[0.06] flex gap-3">
                <button
                  onClick={() => setShowTimerResults(false)}
                  className="flex-1 py-3 bg-white/[0.06] border border-white/[0.08] text-white/70 rounded-xl font-medium text-sm hover:bg-white/[0.1] hover:text-white active:scale-[0.98] transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => { setShowTimerResults(false); startTimer(timerInputValue); }}
                  className="flex-1 py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
                >
                  Go Again
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Timer Picker Modal */}
      {showTimerPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-in fade-in" onClick={() => setShowTimerPicker(false)}>
          <div className="bg-black border border-white/[0.08] rounded-2xl p-6 max-w-xs w-full space-y-6 animate-in scale-up shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header with icon */}
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.06] flex items-center justify-center">
                <Timer className="w-6 h-6 text-white/70" />
              </div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Timed Challenge</h3>
              <p className="text-white/40 text-sm mt-1">Set your duration</p>
            </div>

            {/* Time input */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setTimerInputValue(v => Math.max(10, v - 10))}
                className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 text-xl font-medium hover:bg-white/[0.1] hover:text-white active:scale-95 transition-all"
              >
                −
              </button>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="number"
                  value={timerInputValue}
                  onChange={e => setTimerInputValue(Math.max(5, Math.min(300, parseInt(e.target.value) || 30)))}
                  className="w-16 text-center text-4xl font-bold text-white bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-white/30 text-sm font-medium">sec</span>
              </div>
              <button
                onClick={() => setTimerInputValue(v => Math.min(300, v + 10))}
                className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 text-xl font-medium hover:bg-white/[0.1] hover:text-white active:scale-95 transition-all"
              >
                +
              </button>
            </div>

            {/* Quick presets */}
            <div className="flex justify-center gap-2">
              {[30, 60, 90].map(t => (
                <button
                  key={t}
                  onClick={() => setTimerInputValue(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    timerInputValue === t
                      ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>

            {/* Start button */}
            <button
              onClick={() => startTimer(timerInputValue)}
              className="w-full py-3.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Start Challenge
            </button>

            {/* Cancel link */}
            <button
              onClick={() => setShowTimerPicker(false)}
              className="w-full text-center text-white/30 text-sm hover:text-white/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-in fade-in">
          <div className="text-center">
            <div className={`text-[10rem] font-bold text-white tracking-tighter leading-none ${countdown === 0 ? '' : 'animate-pulse'}`}>
              {countdown === 0 ? 'GO' : countdown}
            </div>
            {countdown > 0 && (
              <div className="text-white/30 text-sm mt-4 uppercase tracking-widest">Get ready</div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-white/60" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">Which has higher ELO?</h2>
            <p className="text-xs text-white/40">{cards.length} cards</p>
          </div>
        </div>

        {/* Right side: Timer or Streak */}
        <div className="flex items-center gap-2">
          {timerRunning ? (
            <>
              <div className="text-white font-bold text-lg">{timedScore}</div>
              <div className={`text-2xl font-mono font-bold px-3 py-1 rounded-lg ${
                timeRemaining <= 5 ? 'text-red-400 bg-red-500/20 animate-pulse' : 'text-white bg-white/10'
              }`}>
                {timeRemaining}
              </div>
            </>
          ) : (
            <>
              {stats.streak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 rounded-full mr-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-bold">{stats.streak}</span>
                </div>
              )}
              <button
                onClick={() => setShowTimerPicker(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Start timed challenge"
              >
                <Timer className="w-5 h-5 text-white/40 hover:text-white/70" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two cards - responsive layout */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
        {pair.map((card, idx) => {
          const elo = idx === 0 ? eloA : eloB;
          const percentile = getPercentile(card.name);
          const isCorrect = idx === correctIndex;
          const isPicked = picked === idx;

          return (
            <div key={card.id} className="flex flex-col items-center">
              <button
                onClick={() => handlePick(idx as 0 | 1)}
                disabled={revealed}
                className={`rounded-2xl overflow-hidden transition-all shadow-xl ${
                  revealed
                    ? isCorrect
                      ? 'ring-4 ring-green-500 shadow-green-500/30'
                      : isPicked
                        ? 'ring-4 ring-red-500 opacity-60'
                        : 'opacity-30'
                    : 'hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] cursor-pointer'
                }`}
                style={{ maxWidth: '320px' }}
              >
                <img src={getCardImage(card)} alt={card.name} className="w-full" />
              </button>

              {/* Card info - always show name, show ELO after reveal (only in non-timed mode) */}
              <div className="mt-4 text-center">
                <div className="text-white font-medium">{card.name}</div>
                {revealed && (
                  <div className={`mt-1 ${isCorrect ? 'text-green-400' : 'text-white/50'}`}>
                    <span className="text-2xl font-bold">{Math.round(elo)}</span>
                    <span className="text-sm ml-2 opacity-60">Top {100 - percentile}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Result and Next button */}
      <div className="max-w-md mx-auto">
          {revealed ? (
            <div className="space-y-4">
              <div className={`text-center text-xl font-bold ${picked === correctIndex ? 'text-green-400' : 'text-red-400'}`}>
                {picked === correctIndex ? 'Correct!' : `Wrong! ${pair[correctIndex].name} wins by ${Math.abs(Math.round(eloA - eloB))} ELO`}
              </div>
              <button
                onClick={newRound}
                className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                Next Round
              </button>
            </div>
          ) : (
            <div className="text-center text-white/30 text-sm">
              Click the card you think has higher ELO · <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">A</kbd> / <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">S</kbd>
            </div>
          )}

          {stats.played > 0 && (
            <div className="text-center text-white/20 text-xs mt-4">
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

function getCardRole(card: CubeCard): string | null {
  const name = card.name.toLowerCase();
  const oracle = card.oracle_text?.toLowerCase() || '';
  const typeLine = card.type_line?.toLowerCase() || '';
  if (name.includes('mox') || name.includes('lotus') || name.includes('crypt') || name.includes('sol ring')) return 'Fast Mana';
  if (oracle.includes('counter target')) return 'Counter';
  if (oracle.includes('destroy target') || oracle.includes('exile target')) return 'Removal';
  if (oracle.includes('draw') && oracle.includes('card')) return 'Draw';
  if ((card.cmc || 0) >= 5 && typeLine.includes('creature')) return 'Finisher';
  if ((card.cmc || 0) <= 2 && typeLine.includes('creature')) return 'Early Play';
  return null;
}

interface ArchetypeProfile {
  id: string;
  name: string;
  colors: string[];
  keyTypes: string[];
  keyKeywords: string[];
  idealLandCount: [number, number];
  needsFastMana: boolean;
  needsEarlyPlay: boolean;
  keepPriority: string[];
  playstyle: string;
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
    keepPriority: ['Reanimation spell', 'Discard outlet', 'Big creature'],
    playstyle: 'Dump a creature, reanimate it fast',
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
    keepPriority: ['Fast mana', 'Card draw', 'Storm payoff'],
    playstyle: 'Build mana, go off in one turn',
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
    keepPriority: ['1-drop', '2 lands', 'Burn spell'],
    playstyle: 'Curve out, attack, burn to finish',
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
    keepPriority: ['Lands', 'Removal', 'Card draw'],
    playstyle: 'Answer everything, win with any threat',
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
    keepPriority: ['Mana dork', 'Ramp spell', 'Payoff'],
    playstyle: 'Accelerate mana, slam haymakers',
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
    keepPriority: ['Removal', 'Value creature', 'Planeswalker'],
    playstyle: 'Trade efficiently, grind them out',
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { newHand(); }, []);

  const handleChoice = useCallback((choice: 'keep' | 'mull') => {
    if (revealed || !archetype) return;

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
  }, [revealed, archetype, hand, onUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();

      if (!revealed) {
        if (key === 'a') {
          e.preventDefault();
          handleChoice('keep');
        } else if (key === 's') {
          e.preventDefault();
          handleChoice('mull');
        }
      } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        newHand();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, newHand, handleChoice]);

  if (hand.length === 0 || !archetype) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-40">
      {/* Card viewer */}
      {selectedCard && (
        <CardViewer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {/* Minimal header - just back button and streak */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="w-8" />
        {stats.streak > 0 ? (
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Flame className="w-5 h-5" />{stats.streak}
          </div>
        ) : <div className="w-8" />}
      </div>

      {/* Main content - all centered together */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {/* Archetype info - integrated with hand */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="flex -space-x-0.5">
              {archetype.colors.map(c => (
                <div key={c} className={`w-4 h-4 rounded-full
                  ${c === 'W' ? 'bg-amber-100' : ''}
                  ${c === 'U' ? 'bg-blue-500' : ''}
                  ${c === 'B' ? 'bg-neutral-500' : ''}
                  ${c === 'R' ? 'bg-red-500' : ''}
                  ${c === 'G' ? 'bg-green-500' : ''}
                `} />
              ))}
            </div>
            <span className="text-white font-medium">{archetype.name}</span>
          </div>
          <div className="text-white/40 text-sm">{archetype.playstyle}</div>
        </div>

        {/* Hand display - 4+3 stacked layout with larger cards */}
        <div className="flex flex-col gap-3">
          {/* Top row: 4 cards */}
          <div className="flex justify-center gap-3">
            {hand.slice(0, 4).map((card) => {
              const isLand = card.type_line?.toLowerCase().includes('land');
              const role = revealed ? getCardRole(card) : null;
              const percentile = revealed ? getPercentile(card.name) : null;
              return (
                <div key={card.id} className="relative w-[150px] flex-shrink-0">
                  <button
                    onClick={() => setSelectedCard(card)}
                    className={`w-full rounded-xl overflow-hidden transition-all active:scale-95 ${
                      revealed && isLand ? 'ring-2 ring-amber-400/50' : ''
                    }`}
                  >
                    <img src={getCardImage(card)} alt={card.name} className="w-full shadow-lg" />
                  </button>
                  {revealed && role && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black/90 text-white/80 text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                      {role}
                    </div>
                  )}
                  {revealed && percentile !== null && (
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded ${
                      percentile >= 80 ? 'bg-amber-500 text-black' :
                      percentile >= 60 ? 'bg-purple-500 text-white' :
                      percentile >= 40 ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/60'
                    }`}>
                      {percentile >= 80 ? 'S' : percentile >= 60 ? 'A' : percentile >= 40 ? 'B' : 'C'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Bottom row: 3 cards */}
          <div className="flex justify-center gap-3">
            {hand.slice(4, 7).map((card) => {
              const isLand = card.type_line?.toLowerCase().includes('land');
              const role = revealed ? getCardRole(card) : null;
              const percentile = revealed ? getPercentile(card.name) : null;
              return (
                <div key={card.id} className="relative w-[150px] flex-shrink-0">
                  <button
                    onClick={() => setSelectedCard(card)}
                    className={`w-full rounded-xl overflow-hidden transition-all active:scale-95 ${
                      revealed && isLand ? 'ring-2 ring-amber-400/50' : ''
                    }`}
                  >
                    <img src={getCardImage(card)} alt={card.name} className="w-full shadow-lg" />
                  </button>
                  {revealed && role && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black/90 text-white/80 text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                      {role}
                    </div>
                  )}
                  {revealed && percentile !== null && (
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded ${
                      percentile >= 80 ? 'bg-amber-500 text-black' :
                      percentile >= 60 ? 'bg-purple-500 text-white' :
                      percentile >= 40 ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/60'
                    }`}>
                      {percentile >= 80 ? 'S' : percentile >= 60 ? 'A' : percentile >= 40 ? 'B' : 'C'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Decision / Results - part of the same flow */}
        <div className="w-full max-w-xl">
          {!revealed ? (
            <>
              <div className="text-center text-white/40 text-sm mb-4">
                Look for: <span className="text-white/60">{archetype.keepPriority.join(', ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleChoice('keep')}
                  className="py-5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl font-bold text-lg active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  Keep
                  <kbd className="px-2.5 py-1 bg-green-500/20 rounded text-sm text-green-400/60 font-mono">A</kbd>
                </button>
                <button
                  onClick={() => handleChoice('mull')}
                  className="py-5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold text-lg active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  Mulligan
                  <kbd className="px-2.5 py-1 bg-red-500/20 rounded text-sm text-red-400/60 font-mono">S</kbd>
                </button>
              </div>
            </>
          ) : evaluation && (
            <>
              <div className={`text-center mb-4 ${userChoice === evaluation.verdict ? 'text-green-400' : 'text-red-400'}`}>
                <div className="text-2xl font-bold mb-1">
                  {userChoice === evaluation.verdict ? 'Correct!' : 'Wrong!'}
                </div>
                <div className="text-sm text-white/60">
                  This hand is a <span className={evaluation.verdict === 'keep' ? 'text-green-400' : 'text-red-400'} >{evaluation.verdict.toUpperCase()}</span>
                </div>
              </div>

              {/* Reasons */}
              <div className="bg-white/5 rounded-xl p-4 mb-4 text-sm">
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
                className="w-full py-5 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]"
              >
                Next Hand
              </button>
              <div className="text-center text-white/30 text-xs mt-3">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> to continue
              </div>
            </>
          )}
        </div>

        {/* Stats - subtle at bottom of main content */}
        {stats.played > 0 && (
          <div className="text-center text-white/20 text-xs">
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

function SignalQuizGame({ cards, stats, onUpdate, onBack, onShuffle }: GameComponentProps) {
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

  const handleAnswer = useCallback((answer: string) => {
    if (revealed || !scenario) return;
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
  }, [revealed, scenario, onUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();

      if (!revealed && options.length === 4) {
        const keyMap: Record<string, number> = { a: 0, s: 1, d: 2, f: 3 };
        if (key in keyMap && options[keyMap[key]]) {
          e.preventDefault();
          handleAnswer(options[keyMap[key]]);
        }
      } else if (revealed && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        newScenario();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, options, handleAnswer, newScenario]);

  if (!scenario) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Card viewer */}
      {selectedCard && (
        <CardViewer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Signal Quiz</div>
          <div className="text-white/40 text-xs">What does this late pick tell you?</div>
        </div>
        <div className="flex items-center gap-3">
          {stats.streak > 0 && (
            <div className="text-amber-400 text-sm">🔥 {stats.streak}</div>
          )}
          {onShuffle && (
            <button onClick={onShuffle} className="p-2 hover:bg-white/10 rounded-lg" title="Random game (P)">
              <Shuffle className="w-4 h-4 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Context */}
        <div className="text-center">
          <div className="text-white/50 text-sm mb-1">You see this card at</div>
          <div className="text-2xl font-bold text-white">Pick {scenario.pick}</div>
        </div>

        {/* Card */}
        <button
          onClick={() => setSelectedCard(scenario.card)}
          className="max-h-[45vh] rounded-xl overflow-hidden active:scale-[0.98] shadow-2xl"
        >
          <img src={getCardImage(scenario.card)} alt={scenario.card.name} className="max-h-[45vh] w-auto" />
        </button>

        {/* Question */}
        <div className="text-center text-white/60 text-sm">
          What archetype is likely open?
        </div>

        {/* Options / Results */}
        {!revealed ? (
          <div className="grid grid-cols-2 gap-3 max-w-md w-full">
            {options.map((opt, idx) => {
              const keys = ['A', 'S', 'D', 'F'];
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className="py-4 px-4 bg-white/[0.06] border border-white/[0.08] rounded-xl hover:bg-white/[0.1] active:scale-[0.98] transition-all"
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
            <div className={`text-center mb-4 ${userAnswer === scenario.signal ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {userAnswer === scenario.signal ? 'Correct!' : 'Wrong!'}
              </div>
              {userAnswer !== scenario.signal && (
                <div className="text-sm text-white/60">
                  Answer: <span className="text-white font-medium">{scenario.signal}</span>
                </div>
              )}
            </div>

            <div className="bg-white/[0.04] rounded-xl p-4 mb-4 text-sm text-white/70">
              {scenario.explanation}
            </div>

            <button
              onClick={newScenario}
              className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Next Signal
            </button>
            <div className="text-center text-white/30 text-xs mt-3">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> to continue
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="text-center text-white/40 text-sm">
          {stats.correct}/{stats.played} correct · Best: {stats.bestStreak}
        </div>
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

// ============ SEQUENCING PUZZLES ============
interface SequencePuzzle {
  name: string;
  scenario: string;
  hand: string[];
  board: string[];
  mana: string;
  correctOrder: string[];
  explanation: string;
}

const SEQUENCE_PUZZLES: SequencePuzzle[] = [
  {
    name: 'Storm Setup',
    scenario: 'You need to storm off this turn for lethal.',
    hand: ['Lion\'s Eye Diamond', 'Underworld Breach', 'Brain Freeze', 'Dark Ritual'],
    board: ['Island', 'Swamp', 'Mox Sapphire'],
    mana: 'UBB available',
    correctOrder: ['Dark Ritual', 'Lion\'s Eye Diamond', 'Underworld Breach', 'Brain Freeze'],
    explanation: 'Cast Ritual first for mana, LED second (hold priority), Breach third (crack LED for RRR in response), then escape Brain Freeze repeatedly from graveyard.'
  },
  {
    name: 'Reanimator Line',
    scenario: 'Turn 1 with the nuts. Get Griselbrand into play.',
    hand: ['Entomb', 'Reanimate', 'Dark Ritual', 'Swamp'],
    board: [],
    mana: 'None yet',
    correctOrder: ['Swamp', 'Dark Ritual', 'Entomb', 'Reanimate'],
    explanation: 'Land first, Ritual for BBB, Entomb to put Griselbrand in yard, Reanimate paying 8 life. Draw 7 immediately.'
  },
  {
    name: 'Tinker Setup',
    scenario: 'Maximize your Tinker. What order?',
    hand: ['Tinker', 'Mana Crypt', 'Time Walk', 'Blightsteel Colossus'],
    board: ['Island', 'Island', 'Mox Sapphire'],
    mana: 'UUU available',
    correctOrder: ['Time Walk', 'Mana Crypt', 'Tinker'],
    explanation: 'Time Walk first gives you an extra turn. Play Crypt second as Tinker fodder. Tinker third for Blightsteel. Attack next turn for 11 infect, attack again for lethal.'
  },
  {
    name: 'Aggro Pressure',
    scenario: 'Maximize damage this turn against a tapped-out opponent.',
    hand: ['Lightning Bolt', 'Goblin Guide', 'Monastery Swiftspear'],
    board: ['Mountain', 'Mountain', 'Ragavan, Nimble Pilferer'],
    mana: 'RR available',
    correctOrder: ['Monastery Swiftspear', 'Goblin Guide', 'Lightning Bolt'],
    explanation: 'Swiftspear first, Guide second (triggers prowess +1/+1), Bolt third (triggers prowess again). Swiftspear attacks as 3/4, Guide as 2/2, Ragavan as 2/1. Maximum damage.'
  },
  {
    name: 'Control Setup',
    scenario: 'Set up for the long game while holding up interaction.',
    hand: ['Jace, the Mind Sculptor', 'Force of Will', 'Brainstorm', 'Counterspell'],
    board: ['Island', 'Island', 'Tundra', 'Flooded Strand'],
    mana: 'UUUW available',
    correctOrder: ['Flooded Strand', 'Jace, the Mind Sculptor', 'Brainstorm'],
    explanation: 'Crack fetch first (shuffle away bad cards with Jace). Play Jace and Brainstorm immediately. Keep Force + blue card and Counterspell for protection. Fetch lets you shuffle away Brainstorm\'s bad cards later.'
  },
  {
    name: 'Natural Order Line',
    scenario: 'You have the combo. Execute it correctly.',
    hand: ['Natural Order', 'Craterhoof Behemoth', 'Birds of Paradise'],
    board: ['Forest', 'Forest', 'Llanowar Elves', 'Elvish Mystic'],
    mana: 'GGGG available (2 lands + 2 dorks)',
    correctOrder: ['Birds of Paradise', 'Natural Order'],
    explanation: 'Play Birds first for another body. Then Natural Order sacrificing the Birds (not a mana dork you need). Get Craterhoof. Each creature gets +4/+4 and trample. Attack for 16.'
  },
  {
    name: 'Wheel Setup',
    scenario: 'Maximize your Wheel of Fortune.',
    hand: ['Wheel of Fortune', 'Mox Ruby', 'Lightning Bolt', 'Chrome Mox'],
    board: ['Mountain', 'Mountain'],
    mana: 'RR available',
    correctOrder: ['Mox Ruby', 'Chrome Mox', 'Lightning Bolt', 'Wheel of Fortune'],
    explanation: 'Deploy all mana artifacts first. Use Bolt on opponent (or creature). Empty your hand, then Wheel. You keep mana advantage and draw 7 fresh cards.'
  },
  {
    name: 'Show and Tell',
    scenario: 'Resolve Show and Tell safely.',
    hand: ['Show and Tell', 'Emrakul, the Aeons Torn', 'Force of Will', 'Brainstorm'],
    board: ['Island', 'Island', 'Ancient Tomb'],
    mana: 'UU + 2 colorless',
    correctOrder: ['Brainstorm', 'Show and Tell'],
    explanation: 'Brainstorm first to put Emrakul on top if needed (in case of discard), but mainly to look for more protection. Then Show and Tell. Keep Force backup for their response. Put Emrakul in, attack for 15 + Annihilator 6.'
  },
];

function SequencingGame({ stats, onUpdate, onBack }: GameComponentProps) {
  const [puzzle, setPuzzle] = useState<SequencePuzzle | null>(null);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  const newPuzzle = useCallback(() => {
    const p = SEQUENCE_PUZZLES[Math.floor(Math.random() * SEQUENCE_PUZZLES.length)];
    setPuzzle(p);
    setUserOrder([]);
    setRemaining(shuffleArray([...p.correctOrder]));
    setRevealed(false);
  }, []);

  useEffect(() => { newPuzzle(); }, [newPuzzle]);

  if (!puzzle) return null;

  const selectCard = (card: string) => {
    if (revealed) return;
    setUserOrder(prev => [...prev, card]);
    setRemaining(prev => prev.filter(c => c !== card));
  };

  const undoLast = () => {
    if (revealed || userOrder.length === 0) return;
    const last = userOrder[userOrder.length - 1];
    setUserOrder(prev => prev.slice(0, -1));
    setRemaining(prev => [...prev, last]);
  };

  const handleSubmit = () => {
    if (revealed || userOrder.length !== puzzle.correctOrder.length) return;
    setRevealed(true);

    const isCorrect = userOrder.every((card, i) => card === puzzle.correctOrder[i]);
    onUpdate(isCorrect);
    srs.recordReview(
      `sequence-${puzzle.name}`,
      'sequencing',
      boolToQuality(isCorrect, true)
    );
  };

  const isCorrect = revealed && userOrder.every((card, i) => card === puzzle.correctOrder[i]);

  return (
    <div>
      <GameHeader
        title="Sequencing"
        subtitle={puzzle.name}
        streak={stats.streak}
        onBack={onBack}
      />

      {/* Scenario */}
      <div className="bg-white/5 rounded-lg p-3 mb-4">
        <div className="text-sm text-white/70 mb-2">{puzzle.scenario}</div>
        <div className="text-xs text-white/40">
          <span className="text-violet-400">Board:</span> {puzzle.board.length > 0 ? puzzle.board.join(', ') : 'Empty'}
        </div>
        <div className="text-xs text-white/40">
          <span className="text-violet-400">Mana:</span> {puzzle.mana}
        </div>
      </div>

      {/* Your Sequence */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-violet-400 uppercase tracking-wider">
            Your Sequence
          </div>
          {userOrder.length > 0 && !revealed && (
            <button onClick={undoLast} className="text-xs text-white/40 hover:text-white/60">
              Undo
            </button>
          )}
        </div>
        <div className="min-h-[48px] bg-white/5 rounded-lg p-2 flex flex-wrap gap-2">
          {userOrder.map((card, i) => {
            const isCardCorrect = revealed && card === puzzle.correctOrder[i];
            const isCardWrong = revealed && card !== puzzle.correctOrder[i];

            return (
              <div
                key={`${card}-${i}`}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  isCardCorrect ? 'bg-green-500/30 text-green-300' :
                  isCardWrong ? 'bg-red-500/30 text-red-300' :
                  'bg-violet-500/20 text-violet-300'
                }`}
              >
                <span className="text-white/40 mr-1">{i + 1}.</span>
                {card}
              </div>
            );
          })}
          {userOrder.length === 0 && (
            <div className="text-sm text-white/30">Tap cards below in order...</div>
          )}
        </div>
      </div>

      {/* Available Cards */}
      {remaining.length > 0 && !revealed && (
        <div className="mb-4">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Hand
          </div>
          <div className="flex flex-wrap gap-2">
            {remaining.map(card => (
              <button
                key={card}
                onClick={() => selectCard(card)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white font-medium transition-all active:scale-[0.98]"
              >
                {card}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit or Result */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={userOrder.length !== puzzle.correctOrder.length}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] ${
            userOrder.length === puzzle.correctOrder.length
              ? 'bg-violet-500 text-white'
              : 'bg-white/10 text-white/30'
          }`}
        >
          {userOrder.length === puzzle.correctOrder.length ? 'Check Sequence' : `Select ${puzzle.correctOrder.length - userOrder.length} more`}
        </button>
      ) : (
        <>
          <div className={`text-center text-xl font-bold mb-3 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? 'Perfect!' : 'Not Quite'}
          </div>

          {!isCorrect && (
            <div className="bg-white/5 rounded-lg p-3 mb-3">
              <div className="text-xs text-white/40 mb-1">Correct Order:</div>
              <div className="text-sm text-violet-300">
                {puzzle.correctOrder.map((c, i) => `${i + 1}. ${c}`).join(' → ')}
              </div>
            </div>
          )}

          <div className="bg-white/5 rounded-lg p-3 mb-4 text-sm text-white/70">
            {puzzle.explanation}
          </div>

          <button
            onClick={newPuzzle}
            className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-[0.98]"
          >
            Next Puzzle
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

// ============ WHO'S THE BEATDOWN ============
// Classic Mike Flores concept - identify who's the aggressor
interface BeatdownScenario {
  yourDeck: string;
  yourStrategy: string;
  opponentDeck: string;
  opponentStrategy: string;
  beatdown: 'you' | 'opponent';
  explanation: string;
  keyInsight: string;
}

const BEATDOWN_SCENARIOS: BeatdownScenario[] = [
  {
    yourDeck: 'UB Reanimator',
    yourStrategy: 'Fast combo that wins turn 1-3',
    opponentDeck: 'Mono White Aggro',
    opponentStrategy: 'Efficient creatures and disruption',
    beatdown: 'you',
    explanation: 'You\'re faster. Reanimator goldfish is turn 1-2, White Aggro is turn 4-5. You\'re racing to combo before they can kill you.',
    keyInsight: 'Combo decks vs fair decks: combo is the beatdown because their clock is faster.'
  },
  {
    yourDeck: 'Mono White Aggro',
    yourStrategy: 'Efficient creatures with disruption',
    opponentDeck: 'UW Control',
    opponentStrategy: 'Counters, removal, and card advantage',
    beatdown: 'you',
    explanation: 'Control wants to go long. Every turn the game goes on, their card advantage compounds. You must pressure their life total aggressively.',
    keyInsight: 'Aggro vs Control: aggro must be the beatdown or lose to inevitability.'
  },
  {
    yourDeck: 'UW Control',
    yourStrategy: 'Counters, removal, planeswalkers',
    opponentDeck: 'UR Storm',
    opponentStrategy: 'Combo off with spell chains',
    beatdown: 'opponent',
    explanation: 'Storm is trying to assemble and execute their combo. You are the control deck - your role is disruption, not damage. Counter their key spells.',
    keyInsight: 'Control vs Combo: you\'re not the beatdown, you\'re the police. Disruption > damage.'
  },
  {
    yourDeck: 'BR Rakdos Aggro',
    yourStrategy: 'Disruptive aggro with hand attack',
    opponentDeck: 'BG Midrange',
    opponentStrategy: 'Grind with value creatures',
    beatdown: 'you',
    explanation: 'Midrange out-values you in the long game. Their recursive threats and removal will bury you. Kill them before they stabilize.',
    keyInsight: 'Aggro vs Midrange: you\'re favored early, they\'re favored late. Be the beatdown.'
  },
  {
    yourDeck: 'BG Midrange',
    yourStrategy: 'Value creatures and removal',
    opponentDeck: 'UW Control',
    opponentStrategy: 'Counters and card draw',
    beatdown: 'you',
    explanation: 'Control has more raw card advantage than you. Your recursive threats are your clock. You need to pressure them, not grind with them.',
    keyInsight: 'Midrange vs Control: surprisingly, midrange must beatdown or get out-carded.'
  },
  {
    yourDeck: 'UR Storm',
    yourStrategy: 'Combo kill with spell chains',
    opponentDeck: 'Mono White Aggro',
    opponentStrategy: 'Fast creatures with hate bears',
    beatdown: 'opponent',
    explanation: 'White Aggro has Thalia and fast creatures. They\'re attacking your life total AND your ability to combo. Survive first, combo second.',
    keyInsight: 'Combo vs Hatebear Aggro: they\'re pressuring you on two axes. You\'re the control role.'
  },
  {
    yourDeck: 'Show and Tell',
    yourStrategy: 'Cheat Emrakul into play',
    opponentDeck: 'UB Reanimator',
    opponentStrategy: 'Cheat Griselbrand into play',
    beatdown: 'opponent',
    explanation: 'Reanimator is faster - they can combo turn 1. Show and Tell needs turn 2-3. You need interaction to slow them down.',
    keyInsight: 'Combo vs faster Combo: the slower combo is "control" and must interact first.'
  },
  {
    yourDeck: 'Artifact Combo',
    yourStrategy: 'Fast mana into Tinker for Blightsteel',
    opponentDeck: 'UG Ramp',
    opponentStrategy: 'Mana dorks into big haymakers',
    beatdown: 'you',
    explanation: 'Your turn 2 Tinker beats their turn 3-4 Natural Order. You\'re the faster unfair deck. Execute your plan, don\'t interact with theirs.',
    keyInsight: 'Fast combo vs slow combo: be the beatdown through speed, not damage.'
  },
  {
    yourDeck: 'UW Blink',
    yourStrategy: 'ETB value and recursion',
    opponentDeck: 'BR Rakdos Aggro',
    opponentStrategy: 'Burn and efficient threats',
    beatdown: 'opponent',
    explanation: 'Aggro is pressuring your life total. Your ETB value is too slow if you\'re dead. Trade aggressively, stabilize first.',
    keyInsight: 'Value deck vs Aggro: accept the control role, don\'t try to race.'
  },
  {
    yourDeck: 'RW Boros Aggro',
    yourStrategy: 'Maximum speed, Armageddon',
    opponentDeck: 'Mono White Aggro',
    opponentStrategy: 'Efficient creatures, hatebears',
    beatdown: 'you',
    explanation: 'Both are aggro, but Boros is faster with burn reach. Mono White has more disruption. Race them - they can\'t Armageddon like you can.',
    keyInsight: 'Aggro mirror: whoever\'s faster is the beatdown. Boros burn gives reach.'
  },
];

function BeatdownGame({ stats, onUpdate, onBack }: GameComponentProps) {
  const [scenario, setScenario] = useState<BeatdownScenario | null>(null);
  const [guess, setGuess] = useState<'you' | 'opponent' | null>(null);
  const [revealed, setRevealed] = useState(false);

  const newScenario = useCallback(() => {
    const s = BEATDOWN_SCENARIOS[Math.floor(Math.random() * BEATDOWN_SCENARIOS.length)];
    setScenario(s);
    setGuess(null);
    setRevealed(false);
  }, []);

  useEffect(() => { newScenario(); }, [newScenario]);

  if (!scenario) return null;

  const handleGuess = (g: 'you' | 'opponent') => {
    if (revealed) return;
    setGuess(g);
    setRevealed(true);

    const isCorrect = g === scenario.beatdown;
    onUpdate(isCorrect);
    srs.recordReview(
      `beatdown-${scenario.yourDeck}-${scenario.opponentDeck}`,
      'matchups',
      boolToQuality(isCorrect, true)
    );
  };

  const isCorrect = guess === scenario.beatdown;

  return (
    <div>
      <GameHeader
        title="Who's the Beatdown?"
        subtitle="Identify who's the aggressor"
        streak={stats.streak}
        onBack={onBack}
      />

      {/* Matchup Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
          <div className="text-xs text-sky-400 uppercase tracking-wider mb-1">You</div>
          <div className="font-bold text-white mb-1">{scenario.yourDeck}</div>
          <div className="text-xs text-white/50">{scenario.yourStrategy}</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">Opponent</div>
          <div className="font-bold text-white mb-1">{scenario.opponentDeck}</div>
          <div className="text-xs text-white/50">{scenario.opponentStrategy}</div>
        </div>
      </div>

      {/* Question */}
      {!revealed && (
        <div className="text-center text-white/70 mb-4">
          Who should be the aggressor in this matchup?
        </div>
      )}

      {/* Answer Buttons */}
      {!revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleGuess('you')}
            className="py-4 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 rounded-xl font-bold text-sky-300 transition-all active:scale-[0.98]"
          >
            I'm the Beatdown
          </button>
          <button
            onClick={() => handleGuess('opponent')}
            className="py-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl font-bold text-amber-300 transition-all active:scale-[0.98]"
          >
            They're the Beatdown
          </button>
        </div>
      ) : (
        <>
          <div className={`text-center text-xl font-bold mb-3 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? 'Correct!' : 'Wrong!'}
          </div>

          <div className="bg-white/5 rounded-lg p-3 mb-3">
            <div className="text-sm text-white/70 mb-2">{scenario.explanation}</div>
            <div className="text-xs text-sky-400 italic">💡 {scenario.keyInsight}</div>
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
function WheelOrNotGame({ cards, stats, onUpdate, onBack, onShuffle }: GameComponentProps) {
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

  useEffect(() => { newRound(); }, []);

  const handleGuess = useCallback((g: WheelLikelihood) => {
    if (revealed || !card) return;
    setGuess(g);
    setRevealed(true);
    const actual = getWheelLikelihood(card.name);
    onUpdate(g === actual);
  }, [revealed, card, onUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();

      if (!revealed) {
        if (key === 'a') { e.preventDefault(); handleGuess('likely'); }
        if (key === 's') { e.preventDefault(); handleGuess('maybe'); }
        if (key === 'd') { e.preventDefault(); handleGuess('unlikely'); }
      } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        newRound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, handleGuess, newRound]);

  if (!card) return null;

  const actual = getWheelLikelihood(card.name);
  const percentile = getPercentile(card.name);
  const isCorrect = guess === actual;

  const wheelLabels: Record<WheelLikelihood, string> = {
    likely: 'Will likely wheel',
    maybe: 'Might wheel',
    unlikely: 'Won\'t wheel',
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Will It Wheel?</div>
          <div className="text-white/40 text-xs">Will this come back around?</div>
        </div>
        <div className="flex items-center gap-3">
          {stats.streak > 0 && (
            <div className="text-amber-400 text-sm">🔥 {stats.streak}</div>
          )}
          {onShuffle && (
            <button onClick={onShuffle} className="p-2 hover:bg-white/10 rounded-lg" title="Random game (P)">
              <Shuffle className="w-4 h-4 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {viewCard && <CardViewer card={viewCard} onClose={() => setViewCard(null)} />}

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {/* Card */}
        <button onClick={() => setViewCard(card)} className="max-h-[50vh] rounded-xl overflow-hidden active:scale-[0.98] shadow-2xl">
          <img src={getCardImage(card)} alt={card.name} className="max-h-[50vh] w-auto" />
        </button>

        {/* Answer buttons */}
        {!revealed ? (
          <div className="flex gap-3 max-w-lg w-full">
            {[
              { value: 'likely' as WheelLikelihood, label: 'Wheels', key: 'A' },
              { value: 'maybe' as WheelLikelihood, label: 'Maybe', key: 'S' },
              { value: 'unlikely' as WheelLikelihood, label: 'Taken', key: 'D' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => handleGuess(opt.value)}
                className="flex-1 py-4 px-4 bg-white/[0.06] border border-white/[0.08] rounded-xl hover:bg-white/[0.1] active:scale-[0.98] transition-all"
              >
                <div className="text-center">
                  <div className="text-white font-medium mb-1">{opt.label}</div>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/40 font-mono">{opt.key}</kbd>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-w-md w-full">
            <div className={`text-center mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {isCorrect ? 'Correct!' : 'Wrong!'}
              </div>
              <div className="text-white/50 text-sm">
                {wheelLabels[actual]} · Top {100 - percentile}%
              </div>
            </div>
            <button
              onClick={newRound}
              className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Next
            </button>
            <div className="text-center text-white/30 text-xs mt-3">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> to continue
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="text-center text-white/40 text-sm">
          {stats.correct}/{stats.played} correct · Best: {stats.bestStreak}
        </div>
      </div>
    </div>
  );
}

// ============ GAME 3: First Pickable? ============
function FirstPickGame({ cards, stats, onUpdate, onBack, onShuffle }: GameComponentProps) {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();

      if (!revealed) {
        if (key === 'a') { e.preventDefault(); handleGuess(true); }
        if (key === 's') { e.preventDefault(); handleGuess(false); }
      } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        newRound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, handleGuess, newRound]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">First Pickable?</div>
          <div className="text-white/40 text-xs">Would you P1P1 this? (Top 25%)</div>
        </div>
        <div className="flex items-center gap-3">
          {stats.streak > 0 && (
            <div className="text-amber-400 text-sm">🔥 {stats.streak}</div>
          )}
          {onShuffle && (
            <button onClick={onShuffle} className="p-2 hover:bg-white/10 rounded-lg" title="Random game (P)">
              <Shuffle className="w-4 h-4 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {viewCard && <CardViewer card={viewCard} onClose={() => setViewCard(null)} />}

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {/* Card */}
        <button onClick={() => setViewCard(card)} className="max-h-[50vh] rounded-xl overflow-hidden active:scale-[0.98] shadow-2xl">
          <img src={getCardImage(card)} alt={card.name} className="max-h-[50vh] w-auto" />
        </button>

        {/* Answer buttons */}
        {!revealed ? (
          <div className="grid grid-cols-2 gap-4 max-w-md w-full">
            <button
              onClick={() => handleGuess(true)}
              className="py-4 px-6 bg-white/[0.06] border border-white/[0.08] rounded-xl hover:bg-white/[0.1] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">First Pick</span>
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/40 font-mono">A</kbd>
              </div>
            </button>
            <button
              onClick={() => handleGuess(false)}
              className="py-4 px-6 bg-white/[0.06] border border-white/[0.08] rounded-xl hover:bg-white/[0.1] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Pass</span>
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/40 font-mono">S</kbd>
              </div>
            </button>
          </div>
        ) : (
          <div className="max-w-md w-full">
            <div className={`text-center mb-4 ${guess === isFirstPickable ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {guess === isFirstPickable ? 'Correct!' : 'Wrong!'}
              </div>
              <div className="text-white/50 text-sm">
                {isFirstPickable ? 'This is a first pick!' : 'Not first pickable'} · Top {100 - percentile}%
              </div>
            </div>
            <button
              onClick={newRound}
              className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Next
            </button>
            <div className="text-center text-white/30 text-xs mt-3">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> to continue
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="text-center text-white/40 text-sm">
          {stats.correct}/{stats.played} correct · Best: {stats.bestStreak}
        </div>
      </div>
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

// ============ GAME 5: Guess the CMC ============
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
