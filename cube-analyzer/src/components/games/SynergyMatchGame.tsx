import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { getEloData } from '../../services/eloHelpers';
import { ChevronLeft, Shuffle, CheckCircle2, XCircle, Link2 } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

// Build-around cards with their synergy patterns
interface BuildAround {
  cardName: string;
  synergyPatterns: RegExp[];
  synergyKeywords: string[];
  antiSynergyPatterns?: RegExp[];
  category: string;
  explanation: string;
}

const BUILD_AROUNDS: BuildAround[] = [
  // Reanimator
  {
    cardName: 'Reanimate',
    synergyPatterns: [/enters the battlefield/i, /when .* dies/i, /7\/7|8\/8|9\/9|10\/10/],
    synergyKeywords: ['Annihilator', 'Flying'],
    antiSynergyPatterns: [/1\/1|2\/2|2\/1/],
    category: 'Reanimator',
    explanation: 'Wants big creatures with ETB/death triggers'
  },
  {
    cardName: 'Entomb',
    synergyPatterns: [/return.*from.*graveyard/i, /reanimate/i, /flashback/i],
    synergyKeywords: ['Flashback', 'Unearth'],
    category: 'Reanimator',
    explanation: 'Wants cards that benefit from being in the graveyard'
  },
  {
    cardName: 'Animate Dead',
    synergyPatterns: [/enters the battlefield/i, /power.*7|8|9/],
    synergyKeywords: ['Annihilator'],
    category: 'Reanimator',
    explanation: 'Wants expensive creatures to cheat into play'
  },
  // Storm
  {
    cardName: 'Brain Freeze',
    synergyPatterns: [/add \{[WUBRGC]\}/i, /draw.*card/i, /cost.*less/i, /without paying/i],
    synergyKeywords: ['Storm'],
    category: 'Storm',
    explanation: 'Wants cheap spells and mana generation'
  },
  {
    cardName: 'Tendrils of Agony',
    synergyPatterns: [/add \{[WUBRGC]\}/i, /ritual/i, /draw.*card/i],
    synergyKeywords: ['Storm'],
    category: 'Storm',
    explanation: 'Wants rituals and card draw to chain spells'
  },
  // Blink
  {
    cardName: 'Restoration Angel',
    synergyPatterns: [/enters the battlefield/i, /when .* enters/i],
    synergyKeywords: [],
    category: 'Blink',
    explanation: 'Wants creatures with strong ETB abilities'
  },
  {
    cardName: 'Ephemerate',
    synergyPatterns: [/enters the battlefield/i, /when .* enters/i],
    synergyKeywords: [],
    category: 'Blink',
    explanation: 'Wants ETB creatures to flicker repeatedly'
  },
  // Artifacts
  {
    cardName: 'Tinker',
    synergyPatterns: [/artifact/i],
    synergyKeywords: [],
    antiSynergyPatterns: [/creature/i],
    category: 'Artifacts',
    explanation: 'Wants expensive artifacts to cheat into play'
  },
  {
    cardName: 'Urza, Lord High Artificer',
    synergyPatterns: [/artifact/i, /\{T\}: Add/i],
    synergyKeywords: [],
    category: 'Artifacts',
    explanation: 'Wants cheap artifacts for mana and the construct'
  },
  // Sacrifice
  {
    cardName: 'Recurring Nightmare',
    synergyPatterns: [/enters the battlefield/i, /when .* dies/i],
    synergyKeywords: [],
    category: 'Sacrifice',
    explanation: 'Wants creatures with ETB and death triggers'
  },
  {
    cardName: 'Goblin Bombardment',
    synergyPatterns: [/create.*token/i, /when .* dies/i, /undying|persist/i],
    synergyKeywords: ['Undying', 'Persist'],
    category: 'Sacrifice',
    explanation: 'Wants token makers and death triggers'
  },
  // Spells matter
  {
    cardName: 'Young Pyromancer',
    synergyPatterns: [/instant|sorcery/i, /draw.*card/i],
    synergyKeywords: ['Prowess'],
    antiSynergyPatterns: [/creature/i],
    category: 'Spells',
    explanation: 'Wants cheap instants and sorceries'
  },
  {
    cardName: 'Monastery Mentor',
    synergyPatterns: [/instant|sorcery/i],
    synergyKeywords: ['Prowess'],
    category: 'Spells',
    explanation: 'Wants noncreature spells for tokens and prowess'
  },
  // Ramp
  {
    cardName: 'Channel',
    synergyPatterns: [/\{X\}|colorless/i, /eldrazi/i],
    synergyKeywords: ['Annihilator'],
    category: 'Ramp',
    explanation: 'Wants expensive colorless cards to cast'
  },
  // Control
  {
    cardName: 'Snapcaster Mage',
    synergyPatterns: [/instant|sorcery/i, /counter.*spell/i, /destroy target/i],
    synergyKeywords: [],
    category: 'Control',
    explanation: 'Wants instants and sorceries in graveyard'
  },
  // Tokens
  {
    cardName: 'Gaea\'s Cradle',
    synergyPatterns: [/create.*token/i, /creature token/i],
    synergyKeywords: [],
    category: 'Tokens',
    explanation: 'Wants lots of creatures for massive mana'
  },
  // Planeswalkers
  {
    cardName: 'Doubling Season',
    synergyPatterns: [/\+\d+:|create.*token/i, /counter/i],
    synergyKeywords: [],
    category: 'Combo',
    explanation: 'Wants planeswalkers and token makers'
  },
];

function cardMatchesSynergy(card: CubeCard, buildAround: BuildAround): number {
  let score = 0;
  const text = card.oracle_text || '';
  const keywords = card.keywords || [];

  // Check synergy patterns
  buildAround.synergyPatterns.forEach(pattern => {
    if (pattern.test(text) || pattern.test(card.type_line)) {
      score += 10;
    }
  });

  // Check synergy keywords
  buildAround.synergyKeywords.forEach(kw => {
    if (keywords.includes(kw)) {
      score += 15;
    }
  });

  // Penalize anti-synergy
  if (buildAround.antiSynergyPatterns) {
    buildAround.antiSynergyPatterns.forEach(pattern => {
      if (pattern.test(text) || pattern.test(card.type_line)) {
        score -= 5;
      }
    });
  }

  // Bonus for high-power synergies
  const elo = getEloData(card.name)?.elo || 0;
  if (elo > 1900 && score > 0) {
    score += 5;
  }

  return score;
}

export function SynergyMatchGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [buildAround, setBuildAround] = useState<BuildAround | null>(null);
  const [buildAroundCard, setBuildAroundCard] = useState<CubeCard | null>(null);
  const [options, setOptions] = useState<CubeCard[]>([]);
  const [correctCard, setCorrectCard] = useState<CubeCard | null>(null);
  const [selected, setSelected] = useState<CubeCard | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Find build-around cards that exist in the cube
  const availableBuildArounds = useMemo(() => {
    return BUILD_AROUNDS.filter(ba =>
      cards.some(c => c.name.toLowerCase() === ba.cardName.toLowerCase())
    );
  }, [cards]);

  const newRound = useCallback(() => {
    if (availableBuildArounds.length === 0) return;

    // Pick random build-around
    const ba = availableBuildArounds[Math.floor(Math.random() * availableBuildArounds.length)];
    const baCard = cards.find(c => c.name.toLowerCase() === ba.cardName.toLowerCase());
    if (!baCard) return;

    // Score all other cards
    const otherCards = cards.filter(c => c.name !== baCard.name);
    const scored = otherCards.map(c => ({
      card: c,
      score: cardMatchesSynergy(c, ba)
    }));

    // Get high synergy cards (score > 15)
    const highSynergy = scored.filter(s => s.score > 15).sort((a, b) => b.score - a.score);
    // Get low/no synergy cards (score <= 5)
    const lowSynergy = scored.filter(s => s.score <= 5);

    if (highSynergy.length === 0 || lowSynergy.length < 3) {
      // Try another build-around
      newRound();
      return;
    }

    // Pick 1 correct answer from high synergy
    const correct = highSynergy[Math.floor(Math.random() * Math.min(3, highSynergy.length))].card;

    // Pick 3 wrong answers from low synergy (shuffled)
    const shuffledLow = [...lowSynergy].sort(() => Math.random() - 0.5);
    const wrong = shuffledLow.slice(0, 3).map(s => s.card);

    // Combine and shuffle
    const allOptions = [correct, ...wrong].sort(() => Math.random() - 0.5);

    setBuildAround(ba);
    setBuildAroundCard(baCard);
    setOptions(allOptions);
    setCorrectCard(correct);
    setSelected(null);
    setRevealed(false);
  }, [cards, availableBuildArounds]);

  useEffect(() => {
    if (cards.length > 0 && !buildAroundCard && availableBuildArounds.length > 0) {
      newRound();
    }
  }, [cards, buildAroundCard, availableBuildArounds, newRound]);

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
    newRound();
  }, [newRound]);

  // Keyboard shortcuts
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

  if (!buildAroundCard || !buildAround) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Loading synergies...</div>
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
            title="Random game (P)"
          >
            <Shuffle className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-4 overflow-auto">
        {/* Build-around card */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Link2 className="w-4 h-4" />
            <span>Which card synergizes best with...</span>
          </div>
          <img
            src={getCardImage(buildAroundCard)}
            alt={buildAroundCard.name}
            className="h-56 w-auto rounded-xl shadow-2xl"
          />
          <span className="text-xs text-white/40 px-3 py-1 rounded-full bg-white/[0.06]">
            {buildAround.category}
          </span>
        </div>

        {/* Options - 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
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

        {/* Result / Explanation */}
        {revealed && (
          <div className="w-full max-w-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl ${
              isCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={`text-sm font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect ? 'Correct!' : `Wrong - ${correctCard?.name} was the best synergy`}
              </span>
            </div>

            <div className="text-center text-sm text-white/50 px-4">
              <span className="text-white font-medium">{buildAround.cardName}</span>: {buildAround.explanation}
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

      {/* Progress bar */}
      <div className="flex-shrink-0 h-1 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-white/40 to-white/60 transition-all duration-300"
          style={{ width: `${Math.min(100, (round / 20) * 100)}%` }}
        />
      </div>
    </div>
  );
}
