/**
 * Rules Quiz Game: "Know the Rules"
 *
 * Learn MTG keywords and mechanics through drilling.
 * Modes: Keyword→Definition, Definition→Keyword, Card Context
 */

import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, BookOpen, Shuffle, CheckCircle, XCircle } from 'lucide-react';
import type { CubeCard } from '../../types/card';

interface RulesQuizGameProps {
  cards: CubeCard[];
  onBack: () => void;
  onShuffle?: () => void;
}

// Comprehensive MTG keyword/mechanic glossary
const KEYWORDS: { keyword: string; definition: string; category: string; example?: string }[] = [
  // Combat Keywords
  { keyword: 'Trample', definition: 'Excess combat damage dealt to a blocking creature is dealt to the defending player or planeswalker', category: 'Combat', example: 'Craterhoof Behemoth' },
  { keyword: 'First Strike', definition: 'Deals combat damage before creatures without first strike', category: 'Combat', example: 'Mirran Crusader' },
  { keyword: 'Double Strike', definition: 'Deals both first strike and regular combat damage', category: 'Combat', example: 'Mirran Crusader' },
  { keyword: 'Deathtouch', definition: 'Any amount of damage this deals to a creature is enough to destroy it', category: 'Combat', example: 'Nighthawk Scavenger' },
  { keyword: 'Lifelink', definition: 'Damage dealt by this creature also causes you to gain that much life', category: 'Combat', example: 'Batterskull' },
  { keyword: 'Vigilance', definition: 'Attacking doesn\'t cause this creature to tap', category: 'Combat', example: 'Adanto Vanguard' },
  { keyword: 'Menace', definition: 'This creature can only be blocked by two or more creatures', category: 'Combat', example: 'Rankle, Master of Pranks' },
  { keyword: 'Reach', definition: 'Can block creatures with flying', category: 'Combat', example: 'Sylvan Caryatid' },
  { keyword: 'Flying', definition: 'Can only be blocked by creatures with flying or reach', category: 'Combat', example: 'Restoration Angel' },
  { keyword: 'Haste', definition: 'Can attack and tap the turn it enters the battlefield', category: 'Combat', example: 'Goblin Guide' },
  { keyword: 'Skulk', definition: 'Can only be blocked by creatures with greater power', category: 'Combat' },
  { keyword: 'Fear', definition: 'Can only be blocked by artifact creatures and/or black creatures', category: 'Combat' },
  { keyword: 'Intimidate', definition: 'Can only be blocked by artifact creatures and/or creatures that share a color', category: 'Combat' },
  { keyword: 'Shadow', definition: 'Can only block or be blocked by creatures with shadow', category: 'Combat' },
  { keyword: 'Horsemanship', definition: 'Can only be blocked by creatures with horsemanship', category: 'Combat' },
  { keyword: 'Flanking', definition: 'Whenever a creature without flanking blocks this, the blocker gets -1/-1 until end of turn', category: 'Combat' },
  { keyword: 'Banding', definition: 'Attacking creatures with banding can attack together, and the controller assigns combat damage dealt to the band', category: 'Combat' },
  { keyword: 'Rampage', definition: 'Whenever this creature becomes blocked, it gets +N/+N for each creature blocking it beyond the first', category: 'Combat' },

  // Timing/Casting Keywords
  { keyword: 'Flash', definition: 'Can be cast any time you could cast an instant', category: 'Timing', example: 'Teferi, Time Raveler' },
  { keyword: 'Split Second', definition: 'While this spell is on the stack, players can\'t cast spells or activate abilities that aren\'t mana abilities', category: 'Timing', example: 'Krosan Grip' },
  { keyword: 'Instant', definition: 'Can be cast at any time, including on opponent\'s turn and in response to other spells', category: 'Timing' },
  { keyword: 'Sorcery Speed', definition: 'Can only be cast during your main phase when the stack is empty', category: 'Timing' },

  // Storm & Copy
  { keyword: 'Storm', definition: 'When you cast this spell, copy it for each spell cast before it this turn', category: 'Copy', example: 'Tendrils of Agony' },
  { keyword: 'Cascade', definition: 'When you cast this spell, exile cards from your library until you exile a nonland card with lesser mana value, then cast it without paying its mana cost', category: 'Copy', example: 'Bloodbraid Elf' },
  { keyword: 'Replicate', definition: 'When you cast this spell, copy it for each time you paid its replicate cost', category: 'Copy' },
  { keyword: 'Conspire', definition: 'You may tap two untapped creatures you control that share a color with this spell to copy it', category: 'Copy' },

  // Protection Keywords
  { keyword: 'Hexproof', definition: 'Cannot be the target of spells or abilities your opponents control', category: 'Protection', example: 'Carnage Tyrant' },
  { keyword: 'Shroud', definition: 'Cannot be the target of spells or abilities (including your own)', category: 'Protection', example: 'Blightsteel Colossus' },
  { keyword: 'Indestructible', definition: 'Cannot be destroyed by damage or effects that say "destroy"', category: 'Protection', example: 'Blightsteel Colossus' },
  { keyword: 'Protection', definition: 'Can\'t be damaged, enchanted, equipped, blocked, or targeted by anything with the specified quality (DEBT)', category: 'Protection', example: 'Mirran Crusader' },
  { keyword: 'Ward', definition: 'Whenever this permanent becomes the target of a spell or ability an opponent controls, counter it unless that player pays the ward cost', category: 'Protection' },
  { keyword: 'Regenerate', definition: 'The next time this permanent would be destroyed this turn, it isn\'t. Instead, tap it, remove all damage from it, and remove it from combat', category: 'Protection' },
  { keyword: 'Totem Armor', definition: 'If enchanted permanent would be destroyed, instead remove all damage from it and destroy this Aura', category: 'Protection' },
  { keyword: 'Persist', definition: 'When this creature dies, if it had no -1/-1 counters, return it to the battlefield with a -1/-1 counter', category: 'Protection', example: 'Kitchen Finks' },
  { keyword: 'Undying', definition: 'When this creature dies, if it had no +1/+1 counters, return it to the battlefield with a +1/+1 counter', category: 'Protection', example: 'Geralf\'s Messenger' },

  // Enters/Leaves Effects
  { keyword: 'ETB (Enters the Battlefield)', definition: 'Triggers when a permanent enters the battlefield', category: 'Triggers', example: 'Snapcaster Mage' },
  { keyword: 'LTB (Leaves the Battlefield)', definition: 'Triggers when a permanent leaves the battlefield', category: 'Triggers' },
  { keyword: 'Flicker/Blink', definition: 'Exile a permanent, then return it to the battlefield (resets it and triggers ETB)', category: 'Triggers', example: 'Ephemerate' },
  { keyword: 'Phasing', definition: 'Phases out at the beginning of your untap step, then phases in on your next untap step. While phased out, it\'s treated as if it doesn\'t exist', category: 'Triggers' },
  { keyword: 'Vanishing', definition: 'This permanent enters with N time counters. At the beginning of your upkeep, remove a time counter. When the last is removed, sacrifice it', category: 'Triggers' },
  { keyword: 'Fading', definition: 'This permanent enters with N fade counters. At the beginning of your upkeep, remove a fade counter. If you can\'t, sacrifice it', category: 'Triggers' },

  // Graveyard Keywords
  { keyword: 'Flashback', definition: 'You may cast this card from your graveyard for its flashback cost, then exile it', category: 'Graveyard', example: 'Faithless Looting' },
  { keyword: 'Unearth', definition: 'Return this card from your graveyard to the battlefield. It gains haste. Exile it at the beginning of the next end step or if it would leave the battlefield', category: 'Graveyard' },
  { keyword: 'Dredge', definition: 'If you would draw a card, you may mill N cards and return this card from your graveyard to your hand instead', category: 'Graveyard', example: 'Golgari Grave-Troll' },
  { keyword: 'Delve', definition: 'Each card you exile from your graveyard while casting this spell pays for 1 colorless mana', category: 'Graveyard', example: 'Treasure Cruise' },
  { keyword: 'Escape', definition: 'You may cast this card from your graveyard for its escape cost (includes exiling other cards from your graveyard)', category: 'Graveyard', example: 'Uro, Titan of Nature\'s Wrath' },
  { keyword: 'Embalm', definition: 'Exile this card from your graveyard: Create a token copy of it, except it\'s a white Zombie with no mana cost', category: 'Graveyard' },
  { keyword: 'Eternalize', definition: 'Exile this card from your graveyard: Create a token copy of it, except it\'s a 4/4 black Zombie', category: 'Graveyard' },
  { keyword: 'Aftermath', definition: 'This half of the card can only be cast from your graveyard, then exile it', category: 'Graveyard' },
  { keyword: 'Retrace', definition: 'You may cast this card from your graveyard by discarding a land card in addition to paying its other costs', category: 'Graveyard' },
  { keyword: 'Jump-Start', definition: 'You may cast this card from your graveyard by discarding a card in addition to paying its other costs, then exile it', category: 'Graveyard' },
  { keyword: 'Disturb', definition: 'You may cast this card transformed from your graveyard for its disturb cost', category: 'Graveyard' },

  // Counter Keywords
  { keyword: 'Infect', definition: 'Deals damage to creatures as -1/-1 counters and to players as poison counters (10 poison = lose)', category: 'Counters', example: 'Blightsteel Colossus' },
  { keyword: 'Proliferate', definition: 'Choose any number of permanents and/or players with counters, then give each another counter of each kind already there', category: 'Counters' },
  { keyword: 'Wither', definition: 'Deals damage to creatures in the form of -1/-1 counters', category: 'Counters' },
  { keyword: 'Modular', definition: 'Enters with N +1/+1 counters. When it dies, you may put its +1/+1 counters on target artifact creature', category: 'Counters' },
  { keyword: 'Fabricate', definition: 'When this enters, put N +1/+1 counters on it, or create N 1/1 colorless Servo artifact creature tokens', category: 'Counters' },
  { keyword: 'Graft', definition: 'Enters with N +1/+1 counters. Whenever another creature enters, you may move a +1/+1 counter from this onto it', category: 'Counters' },
  { keyword: 'Evolve', definition: 'Whenever a creature enters under your control, if it has greater power or toughness than this creature, put a +1/+1 counter on this creature', category: 'Counters' },
  { keyword: 'Bolster', definition: 'Choose a creature with the least toughness among creatures you control and put N +1/+1 counters on it', category: 'Counters' },
  { keyword: 'Reinforce', definition: 'Discard this card: Put N +1/+1 counters on target creature', category: 'Counters' },
  { keyword: 'Unleash', definition: 'You may have this creature enter with a +1/+1 counter. It can\'t block as long as it has a +1/+1 counter', category: 'Counters' },
  { keyword: 'Riot', definition: 'This creature enters with your choice of a +1/+1 counter or haste', category: 'Counters' },
  { keyword: 'Adapt', definition: 'If this creature has no +1/+1 counters, put N +1/+1 counters on it', category: 'Counters' },
  { keyword: 'Monstrosity', definition: 'If this creature isn\'t monstrous, put N +1/+1 counters on it and it becomes monstrous', category: 'Counters' },
  { keyword: 'Renown', definition: 'When this creature deals combat damage to a player, if it isn\'t renowned, put N +1/+1 counters on it and it becomes renowned', category: 'Counters' },

  // Mana Keywords
  { keyword: 'Convoke', definition: 'Your creatures can help cast this spell. Each creature you tap while casting this pays for 1 or one mana of that creature\'s color', category: 'Mana', example: 'Hogaak' },
  { keyword: 'Affinity', definition: 'This spell costs 1 less to cast for each [specified permanent type] you control', category: 'Mana', example: 'Thought Monitor' },
  { keyword: 'Improvise', definition: 'Your artifacts can help cast this spell. Tap an untapped artifact you control: Pay 1 colorless', category: 'Mana' },
  { keyword: 'Treasure', definition: 'Artifact token with "Tap, Sacrifice: Add one mana of any color"', category: 'Mana' },
  { keyword: 'Suspend', definition: 'Pay cost and exile with N time counters. Remove one each upkeep. When the last is removed, cast it without paying its mana cost. It has haste', category: 'Mana', example: 'Ancestral Vision' },
  { keyword: 'Evoke', definition: 'You may cast this spell for its evoke cost. If you do, sacrifice it when it enters the battlefield', category: 'Mana', example: 'Solitude' },
  { keyword: 'Kicker', definition: 'You may pay an additional cost as you cast this spell for an additional effect', category: 'Mana' },
  { keyword: 'Multikicker', definition: 'You may pay the kicker cost any number of times for additional effects', category: 'Mana' },
  { keyword: 'Overload', definition: 'Cast for overload cost to replace "target" with "each"', category: 'Mana', example: 'Cyclonic Rift' },
  { keyword: 'Splice', definition: 'As you cast a spell of the specified type, you may reveal this card and pay its splice cost to add its effects', category: 'Mana' },
  { keyword: 'Buyback', definition: 'You may pay the buyback cost in addition to any other costs. If you do, put this card into your hand as it resolves', category: 'Mana' },
  { keyword: 'Spectacle', definition: 'You may cast this spell for its spectacle cost if an opponent lost life this turn', category: 'Mana' },
  { keyword: 'Emerge', definition: 'You may cast this spell by sacrificing a creature and paying the emerge cost reduced by that creature\'s mana value', category: 'Mana' },
  { keyword: 'Prowl', definition: 'You may cast this for its prowl cost if you dealt combat damage to a player this turn with a creature of the specified type', category: 'Mana' },
  { keyword: 'Foretell', definition: 'During your turn, you may exile this card face down for 2. Cast it on a later turn for its foretell cost', category: 'Mana' },
  { keyword: 'Madness', definition: 'If you discard this card, you may cast it for its madness cost instead of putting it into your graveyard', category: 'Mana' },
  { keyword: 'Miracle', definition: 'You may cast this card for its miracle cost when you draw it if it\'s the first card you drew this turn', category: 'Mana', example: 'Terminus' },
  { keyword: 'Channel', definition: 'Discard this card: Activate the channel ability', category: 'Mana' },

  // Draw/Mill Keywords
  { keyword: 'Scry', definition: 'Look at the top N cards of your library, then put any number on the bottom and the rest on top in any order', category: 'Library' },
  { keyword: 'Surveil', definition: 'Look at the top N cards of your library. Put any number into your graveyard and the rest on top in any order', category: 'Library' },
  { keyword: 'Mill', definition: 'Put the top N cards of your library into your graveyard', category: 'Library' },
  { keyword: 'Cycling', definition: 'Discard this card: Draw a card. (Can be done at instant speed)', category: 'Library', example: 'Shark Typhoon' },
  { keyword: 'Transmute', definition: 'Discard this card: Search your library for a card with the same mana value, reveal it, and put it into your hand', category: 'Library' },
  { keyword: 'Investigate', definition: 'Create a Clue artifact token with "2, Sacrifice: Draw a card"', category: 'Library' },
  { keyword: 'Learn', definition: 'You may reveal a Lesson card from outside the game and put it into your hand, or discard a card to draw a card', category: 'Library' },
  { keyword: 'Connive', definition: 'Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on this creature', category: 'Library' },

  // Creature Keywords
  { keyword: 'Annihilator', definition: 'Whenever this creature attacks, defending player sacrifices N permanents', category: 'Creature', example: 'Emrakul' },
  { keyword: 'Devour', definition: 'As this enters, you may sacrifice any number of creatures. It enters with N +1/+1 counters for each creature sacrificed', category: 'Creature' },
  { keyword: 'Exalted', definition: 'Whenever a creature you control attacks alone, it gets +1/+1 until end of turn (stacks)', category: 'Creature' },
  { keyword: 'Changeling', definition: 'This creature is every creature type at all times', category: 'Creature' },
  { keyword: 'Myriad', definition: 'When this attacks, for each opponent other than the defending player, create a token copy attacking that opponent. Exile the tokens at end of combat', category: 'Creature' },
  { keyword: 'Partner', definition: 'You can have two commanders if both have partner', category: 'Creature' },
  { keyword: 'Soulbond', definition: 'You may pair this with another unpaired creature when either enters. They remain paired as long as you control both', category: 'Creature' },
  { keyword: 'Bestow', definition: 'Cast this for its bestow cost to make it an Aura. If the enchanted creature leaves, this becomes a creature', category: 'Creature' },
  { keyword: 'Mutate', definition: 'Cast on a non-Human creature you own for mutate cost. Merge with that creature, becoming the top or bottom', category: 'Creature' },
  { keyword: 'Ninjutsu', definition: 'Return an unblocked attacker you control to hand: Put this creature from your hand onto the battlefield tapped and attacking', category: 'Creature' },
  { keyword: 'Dash', definition: 'Cast for dash cost. If you do, it gains haste and is returned to your hand at end of turn', category: 'Creature' },
  { keyword: 'Blitz', definition: 'Cast for blitz cost. If you do, it gains haste and "When this dies, draw a card." Sacrifice it at end of turn', category: 'Creature' },
  { keyword: 'Crew', definition: 'Tap any number of creatures you control with total power N or more: This Vehicle becomes an artifact creature until end of turn', category: 'Creature' },
  { keyword: 'Equip', definition: 'Attach to target creature you control. Equip only as a sorcery', category: 'Creature' },
  { keyword: 'Reconfigure', definition: 'Attach to or unattach from target creature you control. This becomes unattached if it becomes a creature', category: 'Creature' },

  // Planeswalker Keywords
  { keyword: 'Loyalty', definition: 'Planeswalkers enter with loyalty counters and use them to activate abilities (+ gains, - costs)', category: 'Planeswalker' },
  { keyword: 'Ultimate', definition: 'A planeswalker\'s most powerful ability, usually at a high loyalty cost', category: 'Planeswalker' },

  // Land Keywords
  { keyword: 'Landfall', definition: 'Triggers whenever a land enters the battlefield under your control', category: 'Land', example: 'Lotus Cobra' },
  { keyword: 'Fetchland', definition: 'A land that can be sacrificed to search for another land (e.g., Scalding Tarn)', category: 'Land' },
  { keyword: 'Shock Land', definition: 'A dual land that can enter untapped if you pay 2 life', category: 'Land' },

  // Game Rules
  { keyword: 'The Stack', definition: 'A zone where spells and abilities go before resolving. Last in, first out (LIFO). Players can respond before each item resolves', category: 'Rules' },
  { keyword: 'Priority', definition: 'The right to take an action. Active player gets priority first, then passes to opponents', category: 'Rules' },
  { keyword: 'State-Based Actions', definition: 'Game rules that are checked whenever a player would receive priority (creature with 0 toughness dies, etc.)', category: 'Rules' },
  { keyword: 'Mana Ability', definition: 'An ability that produces mana. Does not use the stack and cannot be responded to', category: 'Rules' },
  { keyword: 'Legendary Rule', definition: 'If a player controls two or more legendary permanents with the same name, they choose one and sacrifice the rest', category: 'Rules' },
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

type QuizMode = 'keyword-to-def' | 'def-to-keyword';

interface RoundResult {
  keyword: string;
  correct: boolean;
  mode: QuizMode;
}

const TOTAL_ROUNDS = 10;

export function RulesQuizGame({ cards: _cards, onBack, onShuffle }: RulesQuizGameProps) {
  // Game state
  const [round, setRound] = useState(1);
  const [mode, setMode] = useState<QuizMode>('keyword-to-def');
  const [currentKeyword, setCurrentKeyword] = useState<typeof KEYWORDS[0] | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Session state
  const [results, setResults] = useState<RoundResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Categories for filtering (future feature)
  const [_selectedCategories] = useState<string[]>([]);
  const availableCategories = [...new Set(KEYWORDS.map(k => k.category))];

  // Get active keywords based on category filter
  const activeKeywords = _selectedCategories.length > 0
    ? KEYWORDS.filter(k => _selectedCategories.includes(k.category))
    : KEYWORDS;

  // Generate a new round
  const newRound = useCallback(() => {
    if (activeKeywords.length < 4) return;

    // Randomly pick mode
    const newMode: QuizMode = Math.random() > 0.5 ? 'keyword-to-def' : 'def-to-keyword';
    setMode(newMode);

    // Pick a random keyword
    const shuffled = shuffleArray(activeKeywords);
    const target = shuffled[0];
    setCurrentKeyword(target);

    // Generate options
    if (newMode === 'keyword-to-def') {
      // Show keyword, pick definition
      const wrongDefs = shuffled.slice(1, 4).map(k => k.definition);
      setOptions(shuffleArray([target.definition, ...wrongDefs]));
    } else {
      // Show definition, pick keyword
      const wrongKeywords = shuffled.slice(1, 4).map(k => k.keyword);
      setOptions(shuffleArray([target.keyword, ...wrongKeywords]));
    }

    setPicked(null);
    setRevealed(false);
  }, [activeKeywords]);

  // Start first round
  useEffect(() => {
    newRound();
  }, []);

  // Handle pick
  const handlePick = useCallback((answer: string) => {
    if (revealed || !currentKeyword) return;

    const correctAnswer = mode === 'keyword-to-def' ? currentKeyword.definition : currentKeyword.keyword;
    const isCorrect = answer === correctAnswer;

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
      keyword: currentKeyword.keyword,
      correct: isCorrect,
      mode,
    }]);
  }, [revealed, currentKeyword, mode, streak, bestStreak]);

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
      if (correct >= 9) return "Rules expert! You know the game inside out.";
      if (correct >= 7) return "Strong rules knowledge. Keep drilling the tricky ones.";
      if (correct >= 5) return "Good foundation. Focus on the keywords you missed.";
      return "Building your knowledge. More practice will cement these rules.";
    };

    // Group missed keywords by category
    const missed = results.filter(r => !r.correct).map(r => r.keyword);
    const missedByCategory = missed.reduce((acc, kw) => {
      const cat = KEYWORDS.find(k => k.keyword === kw)?.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(kw);
      return acc;
    }, {} as Record<string, string[]>);

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <p className="text-white/40 mt-1">Rules Quiz</p>
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
              <div className="text-2xl font-bold text-white">{availableCategories.length}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mt-1">Categories</div>
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
                  title={`${r.keyword}: ${r.correct ? '✓' : '✗'}`}
                />
              ))}
            </div>
          </div>

          {/* Missed keywords */}
          {Object.keys(missedByCategory).length > 0 && (
            <div className="mb-6">
              <div className="text-[11px] text-white/40 mb-2 uppercase tracking-wide">Review These</div>
              <div className="space-y-2">
                {Object.entries(missedByCategory).map(([cat, keywords]) => (
                  <div key={cat} className="text-sm">
                    <span className="text-white/50">{cat}:</span>{' '}
                    <span className="text-white/70">{keywords.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

  if (!currentKeyword) return null;

  const correctAnswer = mode === 'keyword-to-def' ? currentKeyword.definition : currentKeyword.keyword;
  const isCorrect = picked === correctAnswer;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
        <div className="text-center">
          <div className="text-white font-medium">Rules Quiz</div>
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

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {/* Category badge */}
        <div className="px-3 py-1 bg-white/[0.06] rounded-full text-xs text-white/50">
          {currentKeyword.category}
        </div>

        {/* Question */}
        <div className="max-w-lg w-full text-center">
          {mode === 'keyword-to-def' ? (
            <>
              <div className="text-white/50 text-sm mb-2">What does this keyword mean?</div>
              <div className="text-3xl font-bold text-white">{currentKeyword.keyword}</div>
            </>
          ) : (
            <>
              <div className="text-white/50 text-sm mb-2">Which keyword is this?</div>
              <div className="text-xl text-white leading-relaxed px-4">{currentKeyword.definition}</div>
            </>
          )}
        </div>

        {/* Options */}
        {!revealed ? (
          <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
            {options.map((opt, idx) => {
              const keys = ['A', 'S', 'D', 'F'];
              const isLongOption = mode === 'keyword-to-def';
              return (
                <button
                  key={opt}
                  onClick={() => handlePick(opt)}
                  className="py-4 px-4 bg-white/[0.06] border border-white/[0.08] rounded-xl hover:bg-white/[0.1] active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-white/40 font-mono flex-shrink-0">
                      {keys[idx]}
                    </kbd>
                    <span className={`text-white font-medium ${isLongOption ? 'text-sm' : ''}`}>{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-lg w-full">
            <div className={`text-center mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              <div className="flex items-center justify-center gap-2 text-xl font-bold mb-2">
                {isCorrect ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                {isCorrect ? 'Correct!' : 'Wrong!'}
              </div>
              {!isCorrect && (
                <div className="text-sm text-white/60">
                  {mode === 'keyword-to-def' ? (
                    <>Correct definition: <span className="text-white font-medium">{currentKeyword.definition}</span></>
                  ) : (
                    <>The keyword was: <span className="text-white font-medium">{currentKeyword.keyword}</span></>
                  )}
                </div>
              )}
            </div>

            {/* Extra info */}
            {currentKeyword.example && (
              <div className="bg-white/[0.04] rounded-xl p-4 mb-4 text-sm text-white/60">
                <span className="text-white/40">Example:</span> {currentKeyword.example}
              </div>
            )}

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
