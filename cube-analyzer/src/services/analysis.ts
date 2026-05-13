import type { ScryfallCard, CubeCard, CardRole, Archetype, DraftStrategy } from '../types/card';
import eloRatingsData from '../data/elo-ratings.json';

// ELO data from CubeCobra - based on actual pick data from thousands of drafts
const ELO_RATINGS: Record<string, { elo: number; pickCount: number; cubeCount: number }> = eloRatingsData.cards;
const ELO_MIN = eloRatingsData.metadata.eloRange.min;
const ELO_MAX = eloRatingsData.metadata.eloRange.max;

// Power 9 and other iconic power cards
const POWER_CARDS = new Set([
  'Black Lotus', 'Ancestral Recall', 'Time Walk', 'Mox Pearl', 'Mox Sapphire',
  'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Timetwister', 'Sol Ring', 'Mana Crypt',
  'Mana Vault', 'Library of Alexandria', 'Channel', 'Demonic Tutor', 'Vampiric Tutor',
  'Imperial Seal', 'Mystical Tutor', 'Enlightened Tutor', 'Balance', 'Mind Twist',
  'Tinker', 'Yawgmoth\'s Will', 'Fastbond', 'Strip Mine', 'Tolarian Academy',
  "Gaea's Cradle", "Mishra's Workshop"
]);

const FAST_MANA = new Set([
  'Black Lotus', 'Mox Pearl', 'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald',
  'Sol Ring', 'Mana Crypt', 'Mana Vault', 'Chrome Mox', 'Mox Diamond', 'Mox Opal',
  'Lotus Petal', "Lion's Eye Diamond", 'Dark Ritual', 'Cabal Ritual', 'Seething Song',
  'Channel', 'Grim Monolith', 'Basalt Monolith'
]);

const TUTORS = new Set([
  'Demonic Tutor', 'Vampiric Tutor', 'Imperial Seal', 'Mystical Tutor',
  'Enlightened Tutor', 'Worldly Tutor', 'Green Sun\'s Zenith', 'Natural Order',
  'Entomb', 'Survival of the Fittest', 'Tinker', 'Stoneforge Mystic',
  'Imperial Recruiter', 'Recruiter of the Guard', 'Spellseeker'
]);

const COMBO_PIECES = new Set([
  'Thassa\'s Oracle', 'Doomsday', 'Brain Freeze', 'Underworld Breach',
  'Show and Tell', 'Sneak Attack', 'Through the Breach', 'Channel',
  'Animate Dead', 'Reanimate', 'Exhume', 'Necromancy', 'Shallow Grave',
  'Bolas\'s Citadel', 'Time Spiral', 'Echo of Eons', 'Lion\'s Eye Diamond',
  'Walking Ballista', 'Displacer Kitten', 'Recurring Nightmare'
]);

const REANIMATION_TARGETS = new Set([
  'Griselbrand', 'Archon of Cruelty', 'Atraxa, Grand Unifier', 'Emrakul, the Aeons Torn',
  'Blightsteel Colossus', 'Worldspine Wurm', 'Craterhoof Behemoth', 'Woodfall Primus',
  'Sheoldred, the Apocalypse', 'Portal to Phyrexia', 'Inferno Titan', 'Primeval Titan',
  'Triplicate Titan', 'Wurmcoil Engine', 'Myr Battlesphere', 'Kaldra Compleat'
]);

export function analyzeCard(card: ScryfallCard): CubeCard {
  const archetypes = determineArchetypes(card);
  const powerLevel = calculatePowerLevel(card);
  const draftPriority = calculateDraftPriority(card, powerLevel);
  const synergyTags = identifySynergyTags(card);
  const role = determineRole(card);

  return {
    ...card,
    archetypes,
    powerLevel,
    draftPriority,
    synergyTags,
    role,
  };
}

function determineRole(card: ScryfallCard): CardRole {
  const name = card.name;
  const typeLine = card.type_line?.toLowerCase() || '';
  const oracleText = card.oracle_text?.toLowerCase() || '';

  if (typeLine.includes('land')) return 'land';
  if (FAST_MANA.has(name)) return 'fast_mana';
  if (TUTORS.has(name)) return 'tutor';
  if (REANIMATION_TARGETS.has(name)) return 'reanimation_target';
  if (COMBO_PIECES.has(name)) return 'combo_piece';

  // Removal
  if (oracleText.includes('destroy target') || oracleText.includes('exile target') ||
      oracleText.includes('deal') && oracleText.includes('damage') ||
      name.includes('Swords to Plowshares') || name.includes('Path to Exile')) {
    return 'removal';
  }

  // Counterspells
  if (oracleText.includes('counter target') || oracleText.includes('counter that spell')) {
    return 'counterspell';
  }

  // Card advantage
  if (oracleText.includes('draw') && oracleText.includes('card') ||
      oracleText.includes('search your library')) {
    return 'card_advantage';
  }

  // Creatures by power/CMC ratio
  if (typeLine.includes('creature')) {
    const power = parseInt(card.power || '0');
    const cmc = card.cmc || 0;
    if (cmc <= 2 && power >= 2) return 'aggro_creature';
    if (cmc >= 5) return 'finisher';
    return 'midrange_threat';
  }

  return 'utility';
}

function determineArchetypes(card: ScryfallCard): string[] {
  const archetypes: string[] = [];
  const name = card.name;
  const typeLine = card.type_line?.toLowerCase() || '';
  const oracleText = card.oracle_text?.toLowerCase() || '';
  const colors = card.color_identity || [];

  // Storm/Spells
  if (oracleText.includes('storm') || name === 'Brain Freeze' ||
      name === 'Underworld Breach' || name === 'Yawgmoth\'s Will') {
    archetypes.push('Storm');
  }

  // Reanimator
  if (REANIMATION_TARGETS.has(name) ||
      oracleText.includes('return') && oracleText.includes('graveyard') && oracleText.includes('battlefield')) {
    archetypes.push('Reanimator');
  }

  // Control
  if (oracleText.includes('counter target') ||
      (typeLine.includes('planeswalker') && colors.includes('U'))) {
    archetypes.push('Control');
  }

  // Aggro
  if (typeLine.includes('creature') && card.cmc <= 3) {
    const power = parseInt(card.power || '0');
    if (power >= card.cmc) {
      archetypes.push('Aggro');
    }
  }

  // Artifacts
  if (typeLine.includes('artifact') || name === 'Tinker' ||
      name === 'Tolarian Academy' || name === 'Mishra\'s Workshop') {
    archetypes.push('Artifacts');
  }

  // Ramp
  if (oracleText.includes('add') && (oracleText.includes('mana') || oracleText.includes('{'))) {
    archetypes.push('Ramp');
  }

  // Tempo/Delver style
  if ((colors.includes('U') || colors.includes('R')) &&
      (typeLine.includes('instant') || typeLine.includes('sorcery')) &&
      card.cmc <= 2) {
    archetypes.push('Tempo');
  }

  // Midrange
  if (typeLine.includes('creature') && card.cmc >= 3 && card.cmc <= 5) {
    archetypes.push('Midrange');
  }

  // Combo
  if (COMBO_PIECES.has(name)) {
    archetypes.push('Combo');
  }

  return [...new Set(archetypes)];
}

function calculatePowerLevel(card: ScryfallCard): number {
  const name = card.name;

  // Use real ELO data from CubeCobra (based on thousands of draft picks)
  const eloData = ELO_RATINGS[name];
  if (eloData) {
    // Convert ELO to power level
    // ELO range: ~1240 to ~2377 (1137 point spread)
    const normalized = (eloData.elo - ELO_MIN) / (ELO_MAX - ELO_MIN);

    // Apply a curved scale:
    // - Power 9/Moxen (normalized > 0.8) get 9-10
    // - Premium cards (0.4-0.8) get 6-9
    // - Good cards (0.1-0.4) get 4-6
    // - Role players (0-0.1) get 3-4
    // All cards in a Vintage Cube are at least a 3
    let powerLevel: number;
    if (normalized > 0.8) {
      // Power 9 tier: 9-10
      powerLevel = 9 + (normalized - 0.8) / 0.2;
    } else if (normalized > 0.4) {
      // Premium tier: 6-9
      powerLevel = 6 + (normalized - 0.4) / 0.4 * 3;
    } else if (normalized > 0.1) {
      // Good tier: 4-6
      powerLevel = 4 + (normalized - 0.1) / 0.3 * 2;
    } else {
      // Role player tier: 3-4
      powerLevel = 3 + normalized / 0.1;
    }

    return Math.round(powerLevel * 10) / 10; // Round to 1 decimal
  }

  // Fallback for cards not in ELO data (shouldn't happen for cube cards)
  const typeLine = card.type_line?.toLowerCase() || '';
  const cmc = card.cmc || 0;

  // S Tier (10) - Power 9 and absolute best cards
  if (POWER_CARDS.has(name)) {
    return 10;
  }

  // A Tier (8-9) - Premium cards
  if (FAST_MANA.has(name)) {
    return 9;
  }
  if (TUTORS.has(name)) {
    return 8;
  }
  if (COMBO_PIECES.has(name)) {
    return 8;
  }
  if (REANIMATION_TARGETS.has(name)) {
    return 8;
  }

  // Force cycle and free spells
  if (name.startsWith('Force of') || ['Solitude', 'Subtlety', 'Endurance', 'Fury', 'Grief'].includes(name)) {
    return 8;
  }

  // B Tier (6-7) - Strong cards
  if (typeLine.includes('planeswalker')) {
    return 7;
  }

  // Lands
  if (typeLine.includes('land')) {
    if (name.includes('Strand') || name.includes('Delta') || name.includes('Foothills') ||
        name.includes('Heath') || name.includes('Mire') || name.includes('Flats') ||
        name.includes('Tarn') || name.includes('Catacombs') || name.includes('Mesa') ||
        name.includes('Rainforest') || name.includes('Vista')) {
      return 7;
    }
    return 5;
  }

  // Efficient removal/counterspells
  if (['Swords to Plowshares', 'Lightning Bolt', 'Counterspell', 'Thoughtseize'].includes(name)) {
    return 7;
  }

  // Good creatures
  if (typeLine.includes('creature')) {
    const power = parseInt(card.power || '0');
    if (cmc > 0 && power / cmc >= 1.5) {
      return 6;
    }
    return 5;
  }

  // Default
  return 5;
}

function calculateDraftPriority(card: ScryfallCard, powerLevel: number): number {
  let priority = powerLevel;

  // Lands are always valuable
  if (card.type_line?.toLowerCase().includes('land')) {
    if (card.type_line?.toLowerCase().includes('fetch') ||
        card.name.includes('Strand') || card.name.includes('Delta') ||
        card.name.includes('Foothills') || card.name.includes('Heath') ||
        card.name.includes('Mire') || card.name.includes('Flats') ||
        card.name.includes('Tarn') || card.name.includes('Catacombs') ||
        card.name.includes('Mesa') || card.name.includes('Rainforest')) {
      priority = Math.max(priority, 8);
    }
  }

  // Colorless cards can go in any deck
  if ((card.color_identity?.length || 0) === 0) {
    priority += 1;
  }

  // Multi-color cards require commitment
  if ((card.color_identity?.length || 0) > 2) {
    priority -= 0.5;
  }

  return Math.min(10, Math.max(1, priority));
}

function identifySynergyTags(card: ScryfallCard): string[] {
  const tags: string[] = [];
  const typeLine = card.type_line?.toLowerCase() || '';
  const oracleText = card.oracle_text?.toLowerCase() || '';

  if (oracleText.includes('graveyard')) tags.push('graveyard');
  if (oracleText.includes('discard')) tags.push('discard');
  if (oracleText.includes('artifact')) tags.push('artifacts-matter');
  if (oracleText.includes('draw a card')) tags.push('card-draw');
  if (oracleText.includes('token')) tags.push('tokens');
  if (oracleText.includes('counter') && !oracleText.includes('counter target')) tags.push('counters');
  if (oracleText.includes('+1/+1')) tags.push('+1/+1 counters');
  if (oracleText.includes('sacrifice')) tags.push('sacrifice');
  if (typeLine.includes('instant') || typeLine.includes('sorcery')) tags.push('spells-matter');
  if (oracleText.includes('flash') || typeLine.includes('instant')) tags.push('instant-speed');
  if (oracleText.includes('enters')) tags.push('ETB');
  if (oracleText.includes('leaves')) tags.push('LTB');
  if (oracleText.includes('blink') || oracleText.includes('exile') && oracleText.includes('return')) tags.push('blink');

  return tags;
}

export function generateArchetypes(_cards: CubeCard[]): Archetype[] {
  return [
    {
      id: 'uw-control',
      name: 'UW Control',
      colors: ['W', 'U'],
      description: 'Classic draw-go control with efficient answers and powerful planeswalkers',
      keyCards: ['Jace, the Mind Sculptor', 'The Wandering Emperor', 'Counterspell', 'Swords to Plowshares', 'Force of Will', 'Balance', 'Teferi, Time Raveler'],
      strategy: 'Answer threats efficiently, generate card advantage, and win with planeswalkers or a single haymaker.',
      powerRating: 9,
      difficulty: 'Medium',
      tips: [
        'Prioritize efficient removal and counterspells',
        'Balance is one of the best cards you can open',
        'Fetch lands early for deck thinning',
        'The Wandering Emperor is your best win condition'
      ]
    },
    {
      id: 'ub-reanimator',
      name: 'UB Reanimator',
      colors: ['U', 'B'],
      description: 'Cheat massive creatures into play from the graveyard as early as turn 1-2',
      keyCards: ['Entomb', 'Reanimate', 'Animate Dead', 'Griselbrand', 'Archon of Cruelty', 'Shallow Grave', 'Exhume'],
      strategy: 'Discard or entomb a fatty, then reanimate it immediately. Backup plan is fair UB control.',
      powerRating: 10,
      difficulty: 'Medium',
      tips: [
        'Entomb + Reanimate is the nut draw',
        'Griselbrand is the best target - refills your hand',
        'Don\'t get greedy with reanimation targets in pack 1',
        'Shallow Grave is instant speed!'
      ]
    },
    {
      id: 'br-aggro',
      name: 'BR Aggro/Rakdos',
      colors: ['B', 'R'],
      description: 'Fast, disruptive aggro with hand disruption and burn',
      keyCards: ['Ragavan, Nimble Pilferer', 'Thoughtseize', 'Lightning Bolt', 'Orcish Bowmasters', 'Grief', 'Dark Confidant'],
      strategy: 'Disrupt their hand, deploy efficient threats, and burn them out.',
      powerRating: 8,
      difficulty: 'Easy',
      tips: [
        'Ragavan is the best card in aggressive decks',
        'Thoughtseize on turn 1 is backbreaking',
        'Don\'t be afraid to use burn on creatures early',
        'Grief with evoke can time walk opponents'
      ]
    },
    {
      id: 'ug-ramp',
      name: 'UG Ramp/Channel',
      colors: ['U', 'G'],
      description: 'Accelerate into massive threats or game-ending combos',
      keyCards: ['Channel', 'Primeval Titan', 'Craterhoof Behemoth', 'Natural Order', 'Fastbond', 'Oracle of Mul Daya', 'Uro, Titan of Nature\'s Wrath'],
      strategy: 'Deploy mana dorks, accelerate into haymakers, protect them with counterspells.',
      powerRating: 9,
      difficulty: 'Medium',
      tips: [
        'Channel + Emrakul is an instant win',
        'Natural Order sacrificing a dork for Craterhoof is GG',
        'Green Sun\'s Zenith is a toolbox card',
        'Prioritize 1-mana dorks highly'
      ]
    },
    {
      id: 'ur-storm',
      name: 'UR Storm/Spells',
      colors: ['U', 'R'],
      description: 'Chain spells together for massive storm counts or value',
      keyCards: ['Brain Freeze', 'Underworld Breach', 'Time Spiral', 'Yawgmoth\'s Will', 'Wheel of Fortune', 'Lion\'s Eye Diamond', 'Echo of Eons'],
      strategy: 'Generate mana, draw cards, and either storm off or create insurmountable advantage.',
      powerRating: 9,
      difficulty: 'Expert',
      tips: [
        'LED + Underworld Breach + Brain Freeze is the combo',
        'Time Spiral untaps your lands!',
        'Wheel of Fortune after emptying your hand is amazing',
        'Count your storm cards before going off'
      ]
    },
    {
      id: 'mono-white',
      name: 'Mono White Aggro',
      colors: ['W'],
      description: 'Efficient white creatures with disruption and anthem effects',
      keyCards: ['Mother of Runes', 'Thalia, Guardian of Thraben', 'Adeline, Resplendent Cathar', 'Armageddon', 'Monastery Mentor', 'Solitude'],
      strategy: 'Deploy efficient threats, disrupt with Thalia, close games with Armageddon.',
      powerRating: 7,
      difficulty: 'Easy',
      tips: [
        'Thalia is a nightmare for spell-based decks',
        'Armageddon after deploying threats is game-winning',
        'Mother of Runes protects your key creatures',
        'The White Plume Adventurer initiative package is very strong'
      ]
    },
    {
      id: 'artifact-combo',
      name: 'Artifact Combo',
      colors: [],
      description: 'Abuse fast mana and artifact synergies for unfair plays',
      keyCards: ['Tinker', 'Tolarian Academy', 'Mishra\'s Workshop', 'Blightsteel Colossus', 'Mana Vault', 'Grim Monolith', 'Memory Jar'],
      strategy: 'Accelerate with artifact mana, Tinker for a win condition, or generate overwhelming value.',
      powerRating: 10,
      difficulty: 'Hard',
      tips: [
        'Tinker sacrificing a Mox for Blightsteel is usually GG',
        'Tolarian Academy is broken with cheap artifacts',
        'Memory Jar is like drawing 7 cards',
        'Urza\'s Saga fetches key artifacts'
      ]
    },
    {
      id: 'bg-midrange',
      name: 'BG Rock/Midrange',
      colors: ['B', 'G'],
      description: 'Efficient threats, hand disruption, and recursive value',
      keyCards: ['Deathrite Shaman', 'Grist, the Hunger Tide', 'Liliana of the Veil', 'Endurance', 'Scavenging Ooze', 'Recurring Nightmare'],
      strategy: 'Grind opponents out with 2-for-1s, discard, and recursive threats.',
      powerRating: 7,
      difficulty: 'Medium',
      tips: [
        'Deathrite Shaman is the best 1-drop in the cube',
        'Recurring Nightmare is insane value',
        'Grist can be found with creature tutors!',
        'Life from the Loam synergizes with fetches'
      ]
    },
    {
      id: 'rw-aggro',
      name: 'RW Aggro/Boros',
      colors: ['R', 'W'],
      description: 'The fastest deck in the cube - all gas, no brakes',
      keyCards: ['Ragavan, Nimble Pilferer', 'Goblin Rabblemaster', 'Adeline, Resplendent Cathar', 'Lightning Bolt', 'Forth Eorlingas!', 'Armageddon'],
      strategy: 'Curve out with efficient creatures and burn, close with Armageddon.',
      powerRating: 8,
      difficulty: 'Easy',
      tips: [
        'This is the best deck at punishing slow starts',
        'Play lands that come in untapped',
        'Forth Eorlingas! generates incredible value',
        'Be aggressive with your mulligans'
      ]
    },
    {
      id: 'show-tell',
      name: 'Show and Tell/Sneak',
      colors: ['U', 'R'],
      description: 'Cheat giant creatures into play without paying their costs',
      keyCards: ['Show and Tell', 'Sneak Attack', 'Through the Breach', 'Emrakul, the Aeons Torn', 'Griselbrand', 'Atraxa, Grand Unifier'],
      strategy: 'Land a way to cheat creatures, then deploy game-ending threats.',
      powerRating: 9,
      difficulty: 'Medium',
      tips: [
        'Show and Tell is symmetric - be careful!',
        'Sneak Attack can activate multiple times',
        'Emrakul annihilator trigger usually ends games',
        'Have backup fair threats'
      ]
    },
    {
      id: 'uw-blink',
      name: 'UW Blink',
      colors: ['W', 'U'],
      description: 'Abuse enter-the-battlefield triggers by blinking creatures',
      keyCards: ['Flickerwisp', 'Restoration Angel', 'Ephemerate', 'Phelia, Exuberant Shepherd', 'Solitude', 'Skyclave Apparition'],
      strategy: 'Play powerful ETB creatures, then repeatedly trigger them.',
      powerRating: 7,
      difficulty: 'Medium',
      tips: [
        'Ephemerate is card advantage and protection',
        'Solitude blink is recurring removal',
        'Restoration Angel at end of turn is a blowout',
        'Displacer Kitten goes infinite with 0-cost spells'
      ]
    },
    {
      id: 'oath',
      name: 'Oath of Druids',
      colors: ['U', 'G'],
      description: 'Abuse Oath of Druids to cheat the biggest creature into play',
      keyCards: ['Oath of Druids', 'Emrakul, the Aeons Torn', 'Griselbrand', 'Forbidden Orchard', 'Show and Tell'],
      strategy: 'Play Oath with no other creatures, give opponent a token, flip your deck into play.',
      powerRating: 8,
      difficulty: 'Hard',
      tips: [
        'Run very few creatures - only the best targets',
        'Oath triggers on YOUR upkeep',
        'Backup plan is natural ramp or Show and Tell',
        'Be careful not to give away the deck in draft'
      ]
    }
  ];
}

export function generateDraftStrategies(): DraftStrategy[] {
  return [
    {
      name: 'Stay Open Pack 1',
      description: 'Take the most powerful card regardless of color. Let the cube guide you.',
      firstPickPriority: ['Black Lotus', 'Ancestral Recall', 'Time Walk', 'Sol Ring', 'Mana Crypt', 'Library of Alexandria'],
      signalCards: ['Late pack Thoughtseize means black is open', 'Late Counterspell signals blue'],
      avoidCards: ['3+ color cards early', 'Narrow sideboard cards'],
      colorPreferences: ['Take colorless power over colored cards P1P1']
    },
    {
      name: 'Force Blue',
      description: 'Blue is the best color - it has Ancestral Recall, Time Walk, counterspells, and goes with everything.',
      firstPickPriority: ['Ancestral Recall', 'Time Walk', 'Jace, the Mind Sculptor', 'Counterspell', 'Force of Will'],
      signalCards: ['Seeing Mana Drain 4th pick means blue is WIDE open'],
      avoidCards: ['Aggressive red cards', 'Green creatures without blue'],
      colorPreferences: ['UB', 'UW', 'UR', 'UG']
    },
    {
      name: 'Combo Draft',
      description: 'Identify a combo in pack 1 and draft the pieces aggressively.',
      firstPickPriority: ['Tinker', 'Show and Tell', 'Channel', 'Sneak Attack', 'Underworld Breach', 'Doomsday'],
      signalCards: ['Entomb wheels? Reanimator is open', 'Brain Freeze late means storm is free'],
      avoidCards: ['Fair midrange cards', 'Narrow removal'],
      colorPreferences: ['UB', 'UR', 'Artifact-heavy']
    },
    {
      name: 'Lands Matter',
      description: 'Prioritize mana fixing and powerful lands. Good mana wins games.',
      firstPickPriority: ['Fetch lands', 'Tolarian Academy', "Gaea's Cradle", 'Library of Alexandria', 'Strip Mine'],
      signalCards: ['Fetchlands should never wheel', 'Late duals mean a color pair is open'],
      avoidCards: ['Greedy 3-color cards without fixing'],
      colorPreferences: ['Build around your dual lands']
    }
  ];
}

export function analyzeColorDistribution(cards: CubeCard[]): Record<string, number> {
  const distribution: Record<string, number> = {
    W: 0, U: 0, B: 0, R: 0, G: 0, Multicolor: 0, Colorless: 0
  };

  for (const card of cards) {
    const colors = card.color_identity || [];
    if (card.type_line?.toLowerCase().includes('land') && colors.length === 0) {
      continue; // Skip counting lands in color distribution
    }
    if (colors.length === 0) {
      distribution.Colorless++;
    } else if (colors.length === 1) {
      distribution[colors[0]]++;
    } else {
      distribution.Multicolor++;
    }
  }

  return distribution;
}

export function analyzeManaCurve(cards: CubeCard[]): Record<number, Record<string, number>> {
  const curve: Record<number, Record<string, number>> = {};

  for (let i = 0; i <= 7; i++) {
    curve[i] = { W: 0, U: 0, B: 0, R: 0, G: 0, Colorless: 0, Multicolor: 0 };
  }

  for (const card of cards) {
    if (card.type_line?.toLowerCase().includes('land')) continue;

    const cmc = Math.min(7, Math.floor(card.cmc || 0));
    const colors = card.color_identity || [];

    if (colors.length === 0) {
      curve[cmc].Colorless++;
    } else if (colors.length === 1) {
      curve[cmc][colors[0]]++;
    } else {
      curve[cmc].Multicolor++;
    }
  }

  return curve;
}

export function analyzeTypeDistribution(cards: CubeCard[]): Record<string, number> {
  const types: Record<string, number> = {
    Creature: 0,
    Instant: 0,
    Sorcery: 0,
    Artifact: 0,
    Enchantment: 0,
    Planeswalker: 0,
    Land: 0
  };

  for (const card of cards) {
    const typeLine = card.type_line?.toLowerCase() || '';
    if (typeLine.includes('creature')) types.Creature++;
    else if (typeLine.includes('planeswalker')) types.Planeswalker++;
    else if (typeLine.includes('instant')) types.Instant++;
    else if (typeLine.includes('sorcery')) types.Sorcery++;
    else if (typeLine.includes('land')) types.Land++;
    else if (typeLine.includes('artifact')) types.Artifact++;
    else if (typeLine.includes('enchantment')) types.Enchantment++;
  }

  return types;
}

export function getTopCardsByPower(cards: CubeCard[], count: number = 20): CubeCard[] {
  return [...cards]
    .sort((a, b) => b.powerLevel - a.powerLevel)
    .slice(0, count);
}

export function getCardsByArchetype(cards: CubeCard[], archetype: string): CubeCard[] {
  return cards.filter(card => card.archetypes.includes(archetype));
}

export function getCardsByColor(cards: CubeCard[], color: string): CubeCard[] {
  if (color === 'Colorless') {
    return cards.filter(card => (card.color_identity?.length || 0) === 0);
  }
  if (color === 'Multicolor') {
    return cards.filter(card => (card.color_identity?.length || 0) > 1);
  }
  return cards.filter(card =>
    card.color_identity?.length === 1 && card.color_identity[0] === color
  );
}

export function getColorPairSynergy(cards: CubeCard[]): Record<string, { count: number; avgPower: number }> {
  const pairs = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'];
  const synergies: Record<string, { count: number; avgPower: number }> = {};

  for (const pair of pairs) {
    const [c1, c2] = pair.split('');
    const pairCards = cards.filter(card => {
      const colors = card.color_identity || [];
      return colors.length === 2 && colors.includes(c1) && colors.includes(c2);
    });

    const avgPower = pairCards.length > 0
      ? pairCards.reduce((sum, c) => sum + c.powerLevel, 0) / pairCards.length
      : 0;

    synergies[pair] = { count: pairCards.length, avgPower };
  }

  return synergies;
}

// Get archetype signals for a card - which archetypes want it and how much
export interface ArchetypeSignal {
  archetypeId: string;
  archetypeName: string;
  isKeyCard: boolean; // Is this a signpost/core card for the archetype?
  colors: string[];
  powerRating: number;
}

const ARCHETYPE_DATA = [
  { id: 'uw-control', name: 'UW Control', colors: ['W', 'U'], power: 9, keyCards: ['jace, the mind sculptor', 'the wandering emperor', 'counterspell', 'swords to plowshares', 'force of will', 'balance', 'teferi, time raveler', 'supreme verdict', 'wrath of god', 'cryptic command'] },
  { id: 'ub-reanimator', name: 'Reanimator', colors: ['U', 'B'], power: 10, keyCards: ['entomb', 'reanimate', 'animate dead', 'griselbrand', 'archon of cruelty', 'shallow grave', 'exhume', 'necromancy', 'buried alive', 'persist'] },
  { id: 'br-aggro', name: 'BR Aggro', colors: ['B', 'R'], power: 8, keyCards: ['ragavan, nimble pilferer', 'thoughtseize', 'lightning bolt', 'orcish bowmasters', 'grief', 'dark confidant', 'bloodghast'] },
  { id: 'ug-ramp', name: 'UG Ramp', colors: ['U', 'G'], power: 9, keyCards: ['channel', 'primeval titan', 'craterhoof behemoth', 'natural order', 'fastbond', 'oracle of mul daya', 'uro, titan of nature\'s wrath', 'rofellos'] },
  { id: 'ur-storm', name: 'Storm', colors: ['U', 'R'], power: 9, keyCards: ['brain freeze', 'underworld breach', 'time spiral', 'yawgmoth\'s will', 'wheel of fortune', 'lion\'s eye diamond', 'echo of eons', 'tendrils of agony', 'dark ritual', 'cabal ritual'] },
  { id: 'mono-white', name: 'Mono White', colors: ['W'], power: 7, keyCards: ['mother of runes', 'thalia, guardian of thraben', 'adeline, resplendent cathar', 'armageddon', 'monastery mentor', 'solitude', 'elite spellbinder'] },
  { id: 'artifact-combo', name: 'Artifacts', colors: [], power: 10, keyCards: ['tinker', 'tolarian academy', 'mishra\'s workshop', 'blightsteel colossus', 'memory jar', 'goblin welder', 'daretti', 'kuldotha forgemaster'] },
  { id: 'bg-midrange', name: 'BG Midrange', colors: ['B', 'G'], power: 7, keyCards: ['deathrite shaman', 'grist, the hunger tide', 'liliana of the veil', 'endurance', 'scavenging ooze', 'recurring nightmare'] },
  { id: 'rw-aggro', name: 'RW Aggro', colors: ['R', 'W'], power: 8, keyCards: ['ragavan, nimble pilferer', 'goblin rabblemaster', 'adeline, resplendent cathar', 'lightning bolt', 'forth eorlingas!', 'armageddon', 'monastery swiftspear'] },
  { id: 'show-tell', name: 'Show & Tell', colors: ['U', 'R'], power: 9, keyCards: ['show and tell', 'sneak attack', 'through the breach', 'emrakul, the aeons torn', 'griselbrand', 'atraxa, grand unifier', 'omniscience'] },
  { id: 'uw-blink', name: 'UW Blink', colors: ['W', 'U'], power: 7, keyCards: ['flickerwisp', 'restoration angel', 'ephemerate', 'solitude', 'skyclave apparition', 'charming prince', 'yorion'] },
  { id: 'oath', name: 'Oath', colors: ['U', 'G'], power: 8, keyCards: ['oath of druids', 'emrakul, the aeons torn', 'griselbrand', 'forbidden orchard', 'show and tell'] },
];

export function getArchetypeSignals(cardName: string): ArchetypeSignal[] {
  const name = cardName.toLowerCase();
  const signals: ArchetypeSignal[] = [];

  for (const arch of ARCHETYPE_DATA) {
    const isKey = arch.keyCards.some(k => name.includes(k) || k.includes(name));
    if (isKey) {
      signals.push({
        archetypeId: arch.id,
        archetypeName: arch.name,
        isKeyCard: true,
        colors: arch.colors,
        powerRating: arch.power,
      });
    }
  }

  return signals;
}

// Analyze a set of picks to determine which archetypes you're drafting toward
export interface DraftDirection {
  archetypeId: string;
  archetypeName: string;
  strength: number; // 0-100, how much your picks align with this archetype
  keyCardsOwned: string[];
  colors: string[];
}

export function analyzeDraftDirection(picks: CubeCard[]): DraftDirection[] {
  const directions: Map<string, { keyCards: string[]; totalSignals: number }> = new Map();

  for (const pick of picks) {
    const signals = getArchetypeSignals(pick.name);
    for (const signal of signals) {
      const existing = directions.get(signal.archetypeId) || { keyCards: [], totalSignals: 0 };
      if (signal.isKeyCard && !existing.keyCards.includes(pick.name)) {
        existing.keyCards.push(pick.name);
      }
      existing.totalSignals++;
      directions.set(signal.archetypeId, existing);
    }
  }

  // Also count by archetype tags on cards
  for (const pick of picks) {
    for (const archTag of pick.archetypes || []) {
      const matchingArch = ARCHETYPE_DATA.find(a =>
        a.name.toLowerCase().includes(archTag.toLowerCase()) ||
        archTag.toLowerCase().includes(a.name.toLowerCase().split(' ')[0])
      );
      if (matchingArch) {
        const existing = directions.get(matchingArch.id) || { keyCards: [], totalSignals: 0 };
        existing.totalSignals++;
        directions.set(matchingArch.id, existing);
      }
    }
  }

  const results: DraftDirection[] = [];
  for (const [archId, data] of directions) {
    const arch = ARCHETYPE_DATA.find(a => a.id === archId);
    if (arch && data.totalSignals > 0) {
      results.push({
        archetypeId: archId,
        archetypeName: arch.name,
        strength: Math.min(100, data.keyCards.length * 25 + data.totalSignals * 5),
        keyCardsOwned: data.keyCards,
        colors: arch.colors,
      });
    }
  }

  return results.sort((a, b) => b.strength - a.strength).slice(0, 4);
}
