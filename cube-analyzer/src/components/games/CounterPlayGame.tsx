import { useState, useEffect, useCallback } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { ChevronLeft, Shuffle, Shield, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

interface Strategy {
  name: string;
  description: string;
  exampleCards: string[];
  counters: { pattern: RegExp; reason: string }[];
  weakTo: string[];
}

const STRATEGIES: Strategy[] = [
  {
    name: 'Reanimator',
    description: 'Cheat big creatures into play from the graveyard',
    exampleCards: ['Reanimate', 'Entomb', 'Griselbrand'],
    counters: [
      { pattern: /exile.*graveyard|exile all cards from/i, reason: 'Exiles their graveyard' },
      { pattern: /can't.*cast.*graveyard|cards.*can't leave graveyards/i, reason: 'Stops graveyard interaction' },
      { pattern: /counter target.*spell/i, reason: 'Counter their reanimate spell' },
    ],
    weakTo: ['Graveyard hate', 'Counterspells', 'Fast aggro']
  },
  {
    name: 'Storm',
    description: 'Chain spells and win with Storm finisher',
    exampleCards: ['Tendrils of Agony', 'Brain Freeze', 'Dark Ritual'],
    counters: [
      { pattern: /counter target.*spell/i, reason: 'Counter their key spell' },
      { pattern: /each opponent loses.*life|deals.*damage.*each opponent/i, reason: 'Race them with damage' },
      { pattern: /player.*can't.*draw|opponents can't draw/i, reason: 'Stops their card draw engine' },
      { pattern: /target player discards/i, reason: 'Strip their hand' },
    ],
    weakTo: ['Counterspells', 'Hand disruption', 'Fast pressure']
  },
  {
    name: 'Aggro',
    description: 'Kill them before they set up with fast creatures',
    exampleCards: ['Goblin Guide', 'Monastery Swiftspear', 'Lightning Bolt'],
    counters: [
      { pattern: /destroy all creatures|exile all creatures|-\d\/-\d.*all creatures/i, reason: 'Wipes their board' },
      { pattern: /gain.*life|lifelink/i, reason: 'Gains life to stabilize' },
      { pattern: /destroy target creature|exile target creature/i, reason: 'Removes their threats' },
    ],
    weakTo: ['Board wipes', 'Lifegain', 'Efficient blockers']
  },
  {
    name: 'Control',
    description: 'Counter threats and win with card advantage',
    exampleCards: ['Counterspell', 'Jace, the Mind Sculptor', 'Wrath of God'],
    counters: [
      { pattern: /can't be countered/i, reason: 'Gets through their counters' },
      { pattern: /haste/i, reason: 'Attacks before they can react' },
      { pattern: /flash/i, reason: 'Plays on their end step' },
      { pattern: /planeswalker/i, reason: 'Hard to counter, recurring threat' },
    ],
    weakTo: ['Uncounterable threats', 'Flash creatures', 'Planeswalkers']
  },
  {
    name: 'Artifacts',
    description: 'Power out artifacts and abuse synergies',
    exampleCards: ['Tinker', 'Mox Diamond', 'Blightsteel Colossus'],
    counters: [
      { pattern: /destroy.*artifact|exile.*artifact/i, reason: 'Destroys their artifacts' },
      { pattern: /artifact.*can't/i, reason: 'Shuts off artifacts' },
      { pattern: /destroy all artifacts/i, reason: 'Wipes their board' },
    ],
    weakTo: ['Artifact removal', 'Null Rod effects', 'Counterspells']
  },
  {
    name: 'Ramp',
    description: 'Accelerate mana and cast huge threats early',
    exampleCards: ['Channel', 'Ulamog', 'Primeval Titan'],
    counters: [
      { pattern: /destroy.*land|exile.*land/i, reason: 'Attacks their mana' },
      { pattern: /counter target.*spell/i, reason: 'Counter their payoff' },
      { pattern: /haste.*power|deals.*damage.*each/i, reason: 'Kill them before they set up' },
    ],
    weakTo: ['Land destruction', 'Fast aggro', 'Counterspells']
  },
  {
    name: 'Tokens',
    description: 'Go wide with token creatures',
    exampleCards: ['Bitterblossom', 'Lingering Souls', 'Monastery Mentor'],
    counters: [
      { pattern: /destroy all creatures|-\d\/-\d.*all creatures/i, reason: 'Wipes their tokens' },
      { pattern: /can't attack|can't be blocked/i, reason: 'Stops their attacks' },
      { pattern: /flying|reach/i, reason: 'Blocks their go-wide strategy' },
    ],
    weakTo: ['Board wipes', 'Flyers', 'Wraths']
  },
];

function cardCountersStrategy(card: CubeCard, strategy: Strategy): { matches: boolean; reason: string } {
  const text = card.oracle_text || '';
  const typeLine = card.type_line || '';

  for (const counter of strategy.counters) {
    if (counter.pattern.test(text) || counter.pattern.test(typeLine)) {
      return { matches: true, reason: counter.reason };
    }
  }

  return { matches: false, reason: '' };
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function CounterPlayGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [options, setOptions] = useState<CubeCard[]>([]);
  const [correctCard, setCorrectCard] = useState<CubeCard | null>(null);
  const [correctReason, setCorrectReason] = useState('');
  const [selected, setSelected] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);

  const generateRound = useCallback(() => {
    // Pick a random strategy
    const strat = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];

    // Find cards that counter it
    const counters: { card: CubeCard; reason: string }[] = [];
    const nonCounters: CubeCard[] = [];

    cards.forEach(card => {
      const result = cardCountersStrategy(card, strat);
      if (result.matches) {
        counters.push({ card, reason: result.reason });
      } else {
        nonCounters.push(card);
      }
    });

    if (counters.length === 0 || nonCounters.length < 3) {
      // Try another strategy
      generateRound();
      return;
    }

    // Pick one correct answer
    const correct = counters[Math.floor(Math.random() * counters.length)];

    // Pick 3 wrong answers
    const shuffledWrong = shuffleArray(nonCounters);
    const wrong = shuffledWrong.slice(0, 3);

    // Combine and shuffle
    const allOptions = shuffleArray([correct.card, ...wrong]);

    setStrategy(strat);
    setOptions(allOptions);
    setCorrectCard(correct.card);
    setCorrectReason(correct.reason);
    setSelected(null);
    setRevealed(false);
  }, [cards]);

  useEffect(() => {
    if (cards.length > 0 && !strategy) {
      generateRound();
    }
  }, [cards, strategy, generateRound]);

  const handlePick = useCallback((card: CubeCard) => {
    if (revealed) return;

    setSelected(card);
    setRevealed(true);

    const isCorrect = card.name === correctCard?.name;

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
  }, [revealed, correctCard, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    generateRound();
  }, [generateRound]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed && options.length === 4) {
        const keyMap: Record<string, number> = { 'q': 0, 'w': 1, 'e': 2, 'r': 3 };
        const idx = keyMap[e.key.toLowerCase()];
        if (idx !== undefined && options[idx]) {
          e.preventDefault();
          handlePick(options[idx]);
        }
      } else if (revealed) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, handlePick, handleNext, options]);

  if (!strategy) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Loading strategies...</div>
      </div>
    );
  }

  const isCorrect = selected?.name === correctCard?.name;

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
        {/* Strategy info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-white/50">Which card best counters...</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{strategy.name}</h2>
          <p className="text-sm text-white/50 max-w-md">{strategy.description}</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {strategy.exampleCards.map(name => (
              <span key={name} className="text-xs bg-white/[0.06] px-2 py-1 rounded text-white/40">
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Options - 2x2 */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg mt-4">
          {options.map((card, idx) => {
            const isThis = selected?.name === card.name;
            const isCorrectOption = card.name === correctCard?.name;
            const keys = ['Q', 'W', 'E', 'R'];

            let borderClass = 'border-white/[0.08] hover:border-white/20';
            if (revealed) {
              if (isCorrectOption) {
                borderClass = 'border-green-500 ring-2 ring-green-500/30';
              } else if (isThis) {
                borderClass = 'border-red-500 ring-2 ring-red-500/30';
              } else {
                borderClass = 'border-white/[0.04] opacity-50';
              }
            }

            return (
              <button
                key={card.name}
                onClick={() => handlePick(card)}
                disabled={revealed}
                className={`relative rounded-xl border overflow-hidden transition-all active:scale-95 ${borderClass}`}
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full aspect-[5/7] object-cover"
                />
                {!revealed && (
                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/70 flex items-center justify-center text-xs text-white/70 font-mono">
                    {keys[idx]}
                  </div>
                )}
                {revealed && isCorrectOption && (
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}
                {revealed && isThis && !isCorrectOption && (
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Result */}
        {revealed && (
          <div className="w-full max-w-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                  {isCorrect ? 'Correct!' : `Wrong - ${correctCard?.name} was the answer`}
                </span>
              </div>
              <p className="text-sm text-white/60 text-center">
                <span className="text-white">{correctCard?.name}</span>: {correctReason}
              </p>
            </div>

            <div className="text-center text-xs text-white/40">
              {strategy.name} is weak to: {strategy.weakTo.join(', ')}
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
