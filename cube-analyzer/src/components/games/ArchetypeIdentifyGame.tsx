/**
 * Archetype Identify Game: "Name That Deck"
 *
 * Show a collection of 5-6 cards from an archetype.
 * Player identifies which archetype/deck the cards belong to.
 * Trains: Pattern recognition, understanding what cards go together.
 */

import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, Layers, Shuffle } from 'lucide-react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';

interface ArchetypeIdentifyGameProps {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

// Archetype definitions with key cards and filtering logic
const ARCHETYPES = [
  {
    id: 'ub-reanimator',
    name: 'UB Reanimator',
    description: 'Cheat massive creatures from graveyard',
    keyCards: ['Entomb', 'Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Exhume', 'Faithless Looting', 'Unmarked Grave', 'Goryo\'s Vengeance'],
    filter: (c: CubeCard) => {
      const oracle = c.oracle_text?.toLowerCase() || '';
      const name = c.name;
      return oracle.includes('graveyard') || oracle.includes('reanimate') ||
             oracle.includes('return') && oracle.includes('battlefield') ||
             ['Griselbrand', 'Archon of Cruelty', 'Sheoldred', 'Grave Titan'].some(n => name.includes(n));
    },
  },
  {
    id: 'ur-storm',
    name: 'UR Storm',
    description: 'Cast many spells, win with storm count',
    keyCards: ['Tendrils of Agony', 'Brain Freeze', 'Grapeshot', 'Dark Ritual', 'Lion\'s Eye Diamond', 'Lotus Petal', 'Yawgmoth\'s Will', 'Past in Flames', 'Birgi, God of Storytelling'],
    filter: (c: CubeCard) => {
      const oracle = c.oracle_text?.toLowerCase() || '';
      const keywords = c.keywords || [];
      return keywords.some(k => k.toLowerCase() === 'storm') ||
             oracle.includes('add') && oracle.includes('mana') ||
             oracle.includes('ritual') || oracle.includes('copy') && oracle.includes('spell');
    },
  },
  {
    id: 'mono-white-aggro',
    name: 'Mono White Aggro',
    description: 'Fast creatures, efficient beaters',
    keyCards: ['Thalia, Guardian of Thraben', 'Adanto Vanguard', 'Usher of the Fallen', 'Elite Spellbinder', 'Luminarch Aspirant', 'Benalish Marshal', 'Soldier of the Pantheon'],
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const cmc = c.cmc || 0;
      const type = c.type_line?.toLowerCase() || '';
      return colors.length === 1 && colors[0] === 'W' && cmc <= 3 && type.includes('creature');
    },
  },
  {
    id: 'mono-red-aggro',
    name: 'Mono Red Aggro',
    description: 'Burn and hasty creatures',
    keyCards: ['Goblin Guide', 'Monastery Swiftspear', 'Eidolon of the Great Revel', 'Lightning Bolt', 'Chain Lightning', 'Sulfuric Vortex', 'Ragavan, Nimble Pilferer'],
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const cmc = c.cmc || 0;
      const keywords = c.keywords || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      return colors.length === 1 && colors[0] === 'R' && cmc <= 3 &&
             (keywords.some(k => k.toLowerCase() === 'haste') || oracle.includes('damage'));
    },
  },
  {
    id: 'uw-control',
    name: 'UW Control',
    description: 'Counterspells, wraths, planeswalkers',
    keyCards: ['Counterspell', 'Force of Will', 'Wrath of God', 'Supreme Verdict', 'Teferi, Hero of Dominaria', 'Jace, the Mind Sculptor', 'Snapcaster Mage', 'Terminus'],
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      const type = c.type_line?.toLowerCase() || '';
      return (colors.includes('U') || colors.includes('W')) &&
             (oracle.includes('counter target') || oracle.includes('destroy all') ||
              type.includes('planeswalker') || oracle.includes('draw') && oracle.includes('card'));
    },
  },
  {
    id: 'green-ramp',
    name: 'Green Ramp',
    description: 'Mana acceleration into big threats',
    keyCards: ['Llanowar Elves', 'Birds of Paradise', 'Noble Hierarch', 'Craterhoof Behemoth', 'Natural Order', 'Green Sun\'s Zenith', 'Primeval Titan', 'Oracle of Mul Daya'],
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      const cmc = c.cmc || 0;
      return colors.includes('G') &&
             (oracle.includes('add') && (oracle.includes('mana') || oracle.includes('{g}')) ||
              cmc >= 6 || oracle.includes('search') && oracle.includes('land'));
    },
  },
  {
    id: 'sneak-show',
    name: 'Sneak & Show',
    description: 'Cheat Emrakul/Griselbrand into play',
    keyCards: ['Sneak Attack', 'Show and Tell', 'Through the Breach', 'Emrakul, the Aeons Torn', 'Griselbrand', 'Omniscience', 'Channel'],
    filter: (c: CubeCard) => {
      const oracle = c.oracle_text?.toLowerCase() || '';
      const cmc = c.cmc || 0;
      const name = c.name;
      return oracle.includes('put') && oracle.includes('battlefield') && !oracle.includes('graveyard') ||
             cmc >= 10 || ['Emrakul', 'Griselbrand', 'Omniscience'].some(n => name.includes(n));
    },
  },
  {
    id: 'bg-midrange',
    name: 'BG Midrange',
    description: 'Value creatures, removal, attrition',
    keyCards: ['Thoughtseize', 'Liliana of the Veil', 'Tireless Tracker', 'Deathrite Shaman', 'Assassin\'s Trophy', 'Abrupt Decay', 'Scavenging Ooze', 'Vraska, Golgari Queen'],
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const oracle = c.oracle_text?.toLowerCase() || '';
      const cmc = c.cmc || 0;
      return colors.includes('B') && colors.includes('G') ||
             (colors.includes('B') && (oracle.includes('discard') || oracle.includes('destroy'))) ||
             (colors.includes('G') && cmc >= 3 && cmc <= 5);
    },
  },
  {
    id: 'artifacts',
    name: 'Artifact Aggro',
    description: 'Artifact synergies and fast mana',
    keyCards: ['Mishra\'s Workshop', 'Lodestone Golem', 'Phyrexian Revoker', 'Steel Overseer', 'Arcbound Ravager', 'Walking Ballista', 'Thought Monitor', 'Nettlecyst'],
    filter: (c: CubeCard) => {
      const type = c.type_line?.toLowerCase() || '';
      const oracle = c.oracle_text?.toLowerCase() || '';
      return type.includes('artifact') && (type.includes('creature') || oracle.includes('artifact'));
    },
  },
  {
    id: 'twin-tempo',
    name: 'UR Tempo/Twin',
    description: 'Efficient threats with countermagic backup',
    keyCards: ['Snapcaster Mage', 'Young Pyromancer', 'Dreadhorde Arcanist', 'Lightning Bolt', 'Counterspell', 'Expressive Iteration', 'Brainstorm', 'Murktide Regent'],
    filter: (c: CubeCard) => {
      const colors = c.color_identity || [];
      const cmc = c.cmc || 0;
      const type = c.type_line?.toLowerCase() || '';
      return colors.includes('U') && colors.includes('R') ||
             (colors.includes('U') && type.includes('instant')) ||
             (colors.includes('R') && cmc <= 2 && type.includes('creature'));
    },
  },
];

// Shuffle helper
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface RoundResult {
  archetype: string;
  correct: boolean;
  picked: string;
}

const TOTAL_ROUNDS = 10;
const CARDS_TO_SHOW = 5;

export function ArchetypeIdentifyGame({ cards, onBack, onShuffle }: ArchetypeIdentifyGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [currentArchetype, setCurrentArchetype] = useState<typeof ARCHETYPES[0] | null>(null);
  const [displayCards, setDisplayCards] = useState<CubeCard[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Session state
  const [results, setResults] = useState<RoundResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Get cards with ELO data
  const validCards = cards.filter(c => getEloData(c.name));

  // Find cards for each archetype
  const getArchetypeCards = useCallback((archetype: typeof ARCHETYPES[0]): CubeCard[] => {
    // First try to find key cards by name
    const keyCardMatches = validCards.filter(c =>
      archetype.keyCards.some(key => c.name.toLowerCase().includes(key.toLowerCase()))
    );

    // Then add cards that match the filter
    const filterMatches = validCards.filter(c =>
      archetype.filter(c) && !keyCardMatches.some(kc => kc.id === c.id)
    );

    return [...keyCardMatches, ...filterMatches];
  }, [validCards]);

  // Generate a new round
  const newRound = useCallback(() => {
    // Find archetypes that have enough cards
    const viableArchetypes = ARCHETYPES.filter(arch => {
      const archCards = getArchetypeCards(arch);
      return archCards.length >= CARDS_TO_SHOW;
    });

    if (viableArchetypes.length < 4) return;

    // Pick a random archetype
    const archetype = shuffleArray(viableArchetypes)[0];
    setCurrentArchetype(archetype);

    // Get cards for this archetype
    const archCards = getArchetypeCards(archetype);
    const selected = shuffleArray(archCards).slice(0, CARDS_TO_SHOW);
    setDisplayCards(selected);

    // Generate options (correct + 3 wrong)
    const wrongOptions = shuffleArray(
      viableArchetypes.filter(a => a.id !== archetype.id)
    ).slice(0, 3).map(a => a.name);
    setOptions(shuffleArray([archetype.name, ...wrongOptions]));

    setPicked(null);
    setRevealed(false);
  }, [getArchetypeCards]);

  // Start first round
  useEffect(() => {
    newRound();
  }, []);

  // Handle pick
  const handlePick = useCallback((answer: string) => {
    if (revealed || !currentArchetype) return;

    const isCorrect = answer === currentArchetype.name;

    setPicked(answer);
    setRevealed(true);

    // Update streak
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    // Calculate score
    let roundScore = 0;
    if (isCorrect) {
      roundScore = 100;
      roundScore += Math.min(50, streak * 10);
    }
    setTotalScore(prev => prev + roundScore);

    // Record result
    setResults(prev => [...prev, {
      archetype: currentArchetype.name,
      correct: isCorrect,
      picked: answer,
    }]);
  }, [revealed, currentArchetype, streak, bestStreak]);

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

      if (!revealed && options.length === 4) {
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

    const getSummary = () => {
      if (correct >= 9) return "Archetype master! You recognize deck patterns instantly.";
      if (correct >= 7) return "Strong pattern recognition. Keep drilling the tricky ones.";
      if (correct >= 5) return "Good foundation. Study how cards group together.";
      return "Building your intuition. Focus on key cards that define each archetype.";
    };

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Layers className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Name That Deck</p>
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
              <div className="text-2xl font-bold text-white">{bestStreak}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Best Streak</div>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{ARCHETYPES.length}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Archetypes</div>
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

  if (!currentArchetype || displayCards.length === 0) return null;

  const isCorrect = picked === currentArchetype.name;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Name That Deck</div>
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

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-white/40 rounded-full transition-all duration-300"
            style={{ width: `${(round / TOTAL_ROUNDS) * 100}%` }}
          />
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Question */}
        <div className="text-center text-white/60 text-sm">
          What archetype are these cards from?
        </div>

        {/* Cards display - horizontal row */}
        <div className="flex justify-center gap-2 flex-wrap max-w-4xl">
          {displayCards.map((card) => (
            <div key={card.id} className="w-[120px] flex-shrink-0">
              <img
                src={getCardImage(card)}
                alt={card.name}
                className={`w-full rounded-lg shadow-lg transition-all ${
                  revealed ? 'ring-2 ring-white/20' : ''
                }`}
              />
            </div>
          ))}
        </div>

        {/* Options */}
        {!revealed ? (
          <div className="grid grid-cols-2 gap-3 max-w-lg w-full mt-4">
            {options.map((opt, idx) => {
              const keys = ['A', 'S', 'D', 'F'];
              return (
                <button
                  key={opt}
                  onClick={() => handlePick(opt)}
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
          <div className="max-w-md w-full mt-4">
            <div className={`text-center mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-xl font-bold mb-1">
                {isCorrect ? 'Correct!' : 'Wrong!'}
              </div>
              {!isCorrect && (
                <div className="text-sm text-white/60">
                  It was <span className="text-white font-medium">{currentArchetype.name}</span>
                </div>
              )}
            </div>

            {/* Archetype description */}
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 mb-4 text-center">
              <div className="text-white font-medium mb-1">{currentArchetype.name}</div>
              <div className="text-white/50 text-sm">{currentArchetype.description}</div>
            </div>

            <button
              onClick={nextRound}
              className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              {round >= TOTAL_ROUNDS ? 'See Results' : 'Next'}
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
