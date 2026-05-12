import { useState, useEffect, useCallback } from 'react';
import type { CubeCard } from '../../types/card';
import { getCardImage } from '../../services/scryfall';
import { ChevronLeft, Shuffle, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

// All mechanics to check for
const MECHANICS: { name: string; pattern: RegExp }[] = [
  // Card advantage
  { name: 'Draw cards', pattern: /draw (a |one |two |three |\d+ )?cards?/i },
  { name: 'Tutor', pattern: /search your library/i },
  { name: 'Scry', pattern: /scry \d/i },
  // Mana
  { name: 'Mana dork', pattern: /add \{[WUBRGC]\}/i },
  { name: 'Mana rock', pattern: /\{T\}: Add/i },
  { name: 'Free spell', pattern: /without paying (its |their )?mana cost/i },
  { name: 'Treasure', pattern: /treasure token/i },
  // Removal
  { name: 'Destroy', pattern: /destroy target/i },
  { name: 'Exile', pattern: /exile target/i },
  { name: 'Board wipe', pattern: /destroy all (creatures|nonland|permanents)/i },
  { name: 'Bounce', pattern: /return target.*to.*hand/i },
  // Disruption
  { name: 'Counter spell', pattern: /counter target spell/i },
  { name: 'Discard', pattern: /(target player|opponent) discards/i },
  // Protection
  { name: 'Hexproof', pattern: /hexproof/i },
  { name: 'Indestructible', pattern: /indestructible/i },
  { name: 'Protection', pattern: /protection from/i },
  // Recursion
  { name: 'Reanimate', pattern: /put.*creature card.*onto the battlefield|return.*from.*graveyard/i },
  { name: 'Flashback', pattern: /flashback/i },
  // Combat keywords
  { name: 'Flying', pattern: /\bflying\b/i },
  { name: 'Haste', pattern: /\bhaste\b/i },
  { name: 'Trample', pattern: /\btrample\b/i },
  { name: 'Lifelink', pattern: /\blifelink\b/i },
  { name: 'Deathtouch', pattern: /\bdeathtouch\b/i },
  { name: 'First strike', pattern: /first strike/i },
  { name: 'Double strike', pattern: /double strike/i },
  { name: 'Vigilance', pattern: /\bvigilance\b/i },
  { name: 'Menace', pattern: /\bmenace\b/i },
  { name: 'Prowess', pattern: /\bprowess\b/i },
  // Tokens
  { name: 'Create token', pattern: /create.*token/i },
  // ETB
  { name: 'ETB trigger', pattern: /when .* enters/i },
  // Combo
  { name: 'Storm', pattern: /\bstorm\b/i },
  { name: 'Extra turn', pattern: /extra turn/i },
  { name: 'Cascade', pattern: /\bcascade\b/i },
  // Special
  { name: 'Initiative', pattern: /take the initiative/i },
  { name: 'Monarch', pattern: /become the monarch/i },
  { name: 'Annihilator', pattern: /annihilator/i },
  { name: 'Delve', pattern: /\bdelve\b/i },
  { name: 'Evoke', pattern: /\bevoke\b/i },
  { name: 'Miracle', pattern: /\bmiracle\b/i },
  { name: 'Phyrexian mana', pattern: /\{[WUBRG]\/P\}/i },
  { name: 'Affinity', pattern: /\baffinity\b/i },
  { name: 'Convoke', pattern: /\bconvoke\b/i },
  { name: 'Channel', pattern: /\bchannel\b.*discard this card/i },
  { name: 'Ninjutsu', pattern: /\bninjutsu\b/i },
  { name: 'Suspend', pattern: /\bsuspend \d/i },
  { name: 'Dredge', pattern: /\bdredge \d/i },
  { name: 'Madness', pattern: /\bmadness\b/i },
  { name: 'Foretell', pattern: /\bforetell\b/i },
  { name: 'Companion', pattern: /\bcompanion\b/i },
  { name: 'Adventure', pattern: /\badventure\b/i },
  { name: 'Cycling', pattern: /\bcycling\b/i },
  { name: 'Landfall', pattern: /\blandfall\b/i },
  { name: 'Kicker', pattern: /\bkicker\b/i },
  { name: 'Undying', pattern: /\bundying\b/i },
  { name: 'Persist', pattern: /\bpersist\b/i },
  { name: 'Blitz', pattern: /\bblitz\b/i },
  { name: 'Connive', pattern: /\bconnive\b/i },
  { name: 'Exploit', pattern: /\bexploit\b/i },
  { name: 'Crew', pattern: /\bcrew \d/i },
  { name: 'Embalm', pattern: /\bembalm\b/i },
  { name: 'Eternalize', pattern: /\beternalize\b/i },
  { name: 'Retrace', pattern: /\bretrace\b/i },
  { name: 'Jump-start', pattern: /\bjump-start\b/i },
  { name: 'Overload', pattern: /\boverload\b/i },
  { name: 'Spectacle', pattern: /\bspectacle\b/i },
  { name: 'Dash', pattern: /\bdash\b/i },
  { name: 'Modular', pattern: /\bmodular\b/i },
  { name: 'Fabricate', pattern: /\bfabricate\b/i },
  { name: 'Riot', pattern: /\briot\b/i },
  // Planeswalker
  { name: 'Planeswalker', pattern: /\+\d+:|−\d+:|-\d+:/i },
];

function getCardMechanics(card: CubeCard): string[] {
  const text = card.oracle_text || '';
  const found: string[] = [];

  // Check keywords from card data
  (card.keywords || []).forEach(kw => {
    if (!found.includes(kw)) found.push(kw);
  });

  // Check patterns
  MECHANICS.forEach(m => {
    if (m.pattern.test(text) && !found.includes(m.name)) {
      found.push(m.name);
    }
  });

  return found;
}

export function MechanicSpotGame({ cards, onBack, onShuffle }: Props) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentCard, setCurrentCard] = useState<CubeCard | null>(null);
  const [correctMechanic, setCorrectMechanic] = useState<string>('');
  const [options, setOptions] = useState<[string, string]>(['', '']);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Get all unique mechanics in the cube
  const allMechanics = useCallback(() => {
    const mechs = new Set<string>();
    cards.forEach(card => {
      getCardMechanics(card).forEach(m => mechs.add(m));
    });
    return Array.from(mechs);
  }, [cards]);

  const newRound = useCallback(() => {
    // Find a card with at least one mechanic
    const validCards = cards.filter(c => getCardMechanics(c).length > 0);
    if (validCards.length === 0) return;

    const card = validCards[Math.floor(Math.random() * validCards.length)];
    const cardMechanics = getCardMechanics(card);
    const allMechs = allMechanics();

    // Pick a random mechanic this card HAS
    const correct = cardMechanics[Math.floor(Math.random() * cardMechanics.length)];

    // Pick a random mechanic this card DOESN'T have
    const wrongOptions = allMechs.filter(m => !cardMechanics.includes(m));
    if (wrongOptions.length === 0) {
      // Card has everything somehow, try again
      newRound();
      return;
    }
    const wrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];

    // Randomize which side each option appears on
    const leftIsCorrect = Math.random() > 0.5;

    setCurrentCard(card);
    setCorrectMechanic(correct);
    setOptions(leftIsCorrect ? [correct, wrong] : [wrong, correct]);
    setSelected(null);
    setRevealed(false);
  }, [cards, allMechanics]);

  useEffect(() => {
    if (cards.length > 0 && !currentCard) {
      newRound();
    }
  }, [cards, currentCard, newRound]);

  const handlePick = useCallback((pick: string) => {
    if (revealed) return;

    setSelected(pick);
    setRevealed(true);

    const isCorrect = pick === correctMechanic;

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
  }, [revealed, correctMechanic, bestStreak]);

  const handleNext = useCallback(() => {
    setRound(r => r + 1);
    newRound();
  }, [newRound]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed) {
        if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePick(options[0]);
        } else if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
          e.preventDefault();
          handlePick(options[1]);
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
  }, [revealed, handlePick, handleNext, options]);

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  const isCorrect = selected === correctMechanic;

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
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-6">
        {/* Card */}
        <div className="relative">
          <img
            src={getCardImage(currentCard)}
            alt={currentCard.name}
            className="h-80 w-auto rounded-xl shadow-2xl"
          />
          {revealed && (
            <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center ${
              isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <XCircle className="w-6 h-6 text-white" />
              )}
            </div>
          )}
        </div>

        {/* Question */}
        <p className="text-white/50 text-sm">Which mechanic does this card have?</p>

        {/* Two Options */}
        <div className="flex gap-4 w-full max-w-xl">
          {options.map((option, idx) => {
            const isThis = selected === option;
            const isCorrectOption = option === correctMechanic;

            let btnClass = 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15]';
            if (revealed) {
              if (isCorrectOption) {
                btnClass = 'bg-green-500/20 border-green-500/40';
              } else if (isThis) {
                btnClass = 'bg-red-500/20 border-red-500/40';
              } else {
                btnClass = 'bg-white/[0.02] border-white/[0.04] opacity-50';
              }
            }

            return (
              <button
                key={option}
                onClick={() => handlePick(option)}
                disabled={revealed}
                className={`flex-1 py-6 px-4 rounded-xl border text-center transition-all active:scale-95 ${btnClass}`}
              >
                <div className="text-lg font-semibold text-white mb-1">{option}</div>
                {!revealed && (
                  <div className="text-xs text-white/30 font-mono">
                    {idx === 0 ? 'A / ←' : 'D / →'}
                  </div>
                )}
                {revealed && isCorrectOption && (
                  <div className="text-xs text-green-400 mt-1">Correct</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Result / Next */}
        {revealed && (
          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all"
          >
            Next <span className="text-white/40 text-sm ml-2">Enter</span>
          </button>
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
