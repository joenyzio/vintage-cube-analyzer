#!/usr/bin/env npx tsx
/**
 * Draft Validation Harness
 *
 * Tests the card rating system against known-good draft scenarios.
 * Run with: npx tsx scripts/validate-draft.ts
 */

import type { CubeCard } from '../src/types';
import type { ValidationScenario } from '../src/services/cardRating/types';
import {
  rateAllCards,
  createInitialContext,
  updateContext,
  updateArchetypeWeights,
  getArchetype,
} from '../src/services/cardRating';

// ============================================
// Test Scenarios
// ============================================

const draftScenarios: ValidationScenario[] = [
  {
    name: 'Reanimator commit pick',
    description: 'After 4 Reanimator enablers, Griselbrand should beat Jace',
    packNumber: 1,
    pickNumber: 5,
    currentPicks: ['Entomb', 'Reanimate', 'Faithless Looting', 'Animate Dead'],
    packCards: ['Griselbrand', 'Jace, the Mind Sculptor', 'Lightning Bolt'],
    expectedTop3: ['Griselbrand', 'Jace, the Mind Sculptor', 'Lightning Bolt'],
    archetype: 'reanimator',
  },
  {
    name: 'Open P1P1 power pick',
    description: 'With no prior picks, take the highest ELO card',
    packNumber: 1,
    pickNumber: 1,
    currentPicks: [],
    packCards: ['Black Lotus', 'Llanowar Elves', 'Lightning Bolt'],
    expectedTop3: ['Black Lotus', 'Lightning Bolt', 'Llanowar Elves'],
  },
  {
    name: 'Storm build-around',
    description: 'After Storm signals, Yawgmoth\'s Will should be top',
    packNumber: 1,
    pickNumber: 6,
    currentPicks: ['Dark Ritual', 'Lotus Petal', 'Brain Freeze', 'Mana Vault', 'Wheel of Fortune'],
    packCards: ["Yawgmoth's Will", 'Primeval Titan', 'Counterspell'],
    expectedTop3: ["Yawgmoth's Will", 'Counterspell', 'Primeval Titan'],
    archetype: 'storm',
  },
  {
    name: 'Aggro on-curve',
    description: 'Aggro deck should prioritize efficient creatures',
    packNumber: 1,
    pickNumber: 7,
    currentPicks: ['Goblin Guide', 'Monastery Swiftspear', 'Lightning Bolt', 'Chain Lightning', 'Ragavan, Nimble Pilferer', 'Eidolon of the Great Revel'],
    packCards: ["Dragon's Rage Channeler", 'Grave Titan', 'Daze'],
    expectedTop3: ["Dragon's Rage Channeler", 'Daze', 'Grave Titan'],
    archetype: 'aggro',
  },
  {
    name: 'Control finisher',
    description: 'Control deck should value powerful late game',
    packNumber: 2,
    pickNumber: 3,
    currentPicks: ['Counterspell', 'Force of Will', 'Mana Drain', 'Jace, the Mind Sculptor', 'Wrath of God', 'Snapcaster Mage', 'Flooded Strand', 'Tundra'],
    packCards: ['Teferi, Hero of Dominaria', 'Goblin Guide', 'Birds of Paradise'],
    expectedTop3: ['Teferi, Hero of Dominaria', 'Birds of Paradise', 'Goblin Guide'],
    archetype: 'control',
  },
  {
    name: 'Sneak Attack payoff',
    description: 'With Sneak Attack, Emrakul is premium',
    packNumber: 1,
    pickNumber: 8,
    currentPicks: ['Sneak Attack', 'Through the Breach', 'Show and Tell', 'Emrakul, the Aeons Torn', 'Griselbrand', 'Worldspine Wurm', 'Ancient Tomb'],
    packCards: ['Omniscience', 'Lightning Bolt', 'Tarmogoyf'],
    expectedTop3: ['Omniscience', 'Tarmogoyf', 'Lightning Bolt'],
    archetype: 'sneak',
  },
  {
    name: 'Off-color premium card',
    description: 'Top 5% off-color cards should still be considered',
    packNumber: 1,
    pickNumber: 4,
    currentPicks: ['Counterspell', 'Force of Will', 'Snapcaster Mage'],
    packCards: ['Black Lotus', 'Goblin Guide', 'Plains'],
    expectedTop3: ['Black Lotus', 'Goblin Guide', 'Plains'],
  },
  {
    name: 'Ramp payoffs',
    description: 'Ramp deck values big threats',
    packNumber: 2,
    pickNumber: 5,
    currentPicks: ['Channel', 'Natural Order', 'Birds of Paradise', 'Noble Hierarch', 'Llanowar Elves', 'Oracle of Mul Daya', 'Rofellos, Llanowar Emissary', 'Forest', 'Tropical Island'],
    packCards: ['Craterhoof Behemoth', 'Lightning Bolt', 'Counterspell'],
    expectedTop3: ['Craterhoof Behemoth', 'Counterspell', 'Lightning Bolt'],
    archetype: 'ramp',
  },
];

// ============================================
// Mock Card Factory
// ============================================

function createMockCard(name: string): CubeCard {
  // Basic mock - in real implementation, would load from cube data
  const colorMap: Record<string, string[]> = {
    'Entomb': ['B'],
    'Reanimate': ['B'],
    'Animate Dead': ['B'],
    'Griselbrand': ['B'],
    'Faithless Looting': ['R'],
    'Jace, the Mind Sculptor': ['U'],
    'Lightning Bolt': ['R'],
    'Black Lotus': [],
    'Llanowar Elves': ['G'],
    'Dark Ritual': ['B'],
    'Lotus Petal': [],
    'Brain Freeze': ['U'],
    'Mana Vault': [],
    "Yawgmoth's Will": ['B'],
    'Wheel of Fortune': ['R'],
    'Primeval Titan': ['G'],
    'Counterspell': ['U'],
    'Goblin Guide': ['R'],
    'Monastery Swiftspear': ['R'],
    'Chain Lightning': ['R'],
    'Ragavan, Nimble Pilferer': ['R'],
    'Eidolon of the Great Revel': ['R'],
    "Dragon's Rage Channeler": ['R'],
    'Grave Titan': ['B'],
    'Daze': ['U'],
    'Force of Will': ['U'],
    'Mana Drain': ['U'],
    'Wrath of God': ['W'],
    'Snapcaster Mage': ['U'],
    'Flooded Strand': [],
    'Tundra': ['W', 'U'],
    'Teferi, Hero of Dominaria': ['W', 'U'],
    'Birds of Paradise': ['G'],
    'Sneak Attack': ['R'],
    'Through the Breach': ['R'],
    'Show and Tell': ['U'],
    'Emrakul, the Aeons Torn': [],
    'Worldspine Wurm': ['G'],
    'Ancient Tomb': [],
    'Omniscience': ['U'],
    'Tarmogoyf': ['G'],
    'Plains': ['W'],
    'Channel': ['G'],
    'Natural Order': ['G'],
    'Noble Hierarch': ['G'],
    'Oracle of Mul Daya': ['G'],
    'Rofellos, Llanowar Emissary': ['G'],
    'Forest': ['G'],
    'Tropical Island': ['G', 'U'],
    'Craterhoof Behemoth': ['G'],
  };

  const cmcMap: Record<string, number> = {
    'Entomb': 1,
    'Reanimate': 1,
    'Animate Dead': 2,
    'Griselbrand': 8,
    'Faithless Looting': 1,
    'Jace, the Mind Sculptor': 4,
    'Lightning Bolt': 1,
    'Black Lotus': 0,
    'Llanowar Elves': 1,
    'Dark Ritual': 1,
    'Lotus Petal': 0,
    'Brain Freeze': 2,
    'Mana Vault': 1,
    "Yawgmoth's Will": 3,
    'Wheel of Fortune': 3,
    'Primeval Titan': 6,
    'Counterspell': 2,
    'Goblin Guide': 1,
    'Monastery Swiftspear': 1,
    'Chain Lightning': 1,
    'Ragavan, Nimble Pilferer': 1,
    'Eidolon of the Great Revel': 2,
    "Dragon's Rage Channeler": 1,
    'Grave Titan': 6,
    'Daze': 2,
    'Force of Will': 5,
    'Mana Drain': 2,
    'Wrath of God': 4,
    'Snapcaster Mage': 2,
    'Teferi, Hero of Dominaria': 5,
    'Birds of Paradise': 1,
    'Sneak Attack': 4,
    'Through the Breach': 5,
    'Show and Tell': 3,
    'Emrakul, the Aeons Torn': 15,
    'Worldspine Wurm': 11,
    'Omniscience': 10,
    'Tarmogoyf': 2,
    'Channel': 2,
    'Natural Order': 4,
    'Noble Hierarch': 1,
    'Oracle of Mul Daya': 4,
    'Rofellos, Llanowar Emissary': 2,
    'Craterhoof Behemoth': 8,
  };

  const typeMap: Record<string, string> = {
    'Entomb': 'Instant',
    'Reanimate': 'Sorcery',
    'Animate Dead': 'Enchantment — Aura',
    'Griselbrand': 'Legendary Creature — Demon',
    'Faithless Looting': 'Sorcery',
    'Jace, the Mind Sculptor': 'Legendary Planeswalker — Jace',
    'Lightning Bolt': 'Instant',
    'Black Lotus': 'Artifact',
    'Llanowar Elves': 'Creature — Elf Druid',
    'Dark Ritual': 'Instant',
    'Lotus Petal': 'Artifact',
    'Brain Freeze': 'Instant',
    'Mana Vault': 'Artifact',
    "Yawgmoth's Will": 'Sorcery',
    'Wheel of Fortune': 'Sorcery',
    'Primeval Titan': 'Creature — Giant',
    'Counterspell': 'Instant',
    'Goblin Guide': 'Creature — Goblin Scout',
    'Monastery Swiftspear': 'Creature — Human Monk',
    'Chain Lightning': 'Sorcery',
    'Ragavan, Nimble Pilferer': 'Legendary Creature — Monkey Pirate',
    'Eidolon of the Great Revel': 'Enchantment Creature — Spirit',
    "Dragon's Rage Channeler": 'Creature — Human Shaman',
    'Grave Titan': 'Creature — Giant',
    'Daze': 'Instant',
    'Force of Will': 'Instant',
    'Mana Drain': 'Instant',
    'Wrath of God': 'Sorcery',
    'Snapcaster Mage': 'Creature — Human Wizard',
    'Flooded Strand': 'Land',
    'Tundra': 'Land — Plains Island',
    'Teferi, Hero of Dominaria': 'Legendary Planeswalker — Teferi',
    'Birds of Paradise': 'Creature — Bird',
    'Sneak Attack': 'Enchantment',
    'Through the Breach': 'Instant — Arcane',
    'Show and Tell': 'Sorcery',
    'Emrakul, the Aeons Torn': 'Legendary Creature — Eldrazi',
    'Worldspine Wurm': 'Creature — Wurm',
    'Ancient Tomb': 'Land',
    'Omniscience': 'Enchantment',
    'Tarmogoyf': 'Creature — Lhurgoyf',
    'Plains': 'Basic Land — Plains',
    'Forest': 'Basic Land — Forest',
    'Channel': 'Sorcery',
    'Natural Order': 'Sorcery',
    'Noble Hierarch': 'Creature — Human Druid',
    'Oracle of Mul Daya': 'Creature — Elf Shaman',
    'Rofellos, Llanowar Emissary': 'Legendary Creature — Elf Druid',
    'Tropical Island': 'Land — Forest Island',
    'Craterhoof Behemoth': 'Creature — Beast',
  };

  return {
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name,
    color_identity: colorMap[name] || [],
    cmc: cmcMap[name] ?? 3,
    type_line: typeMap[name] || 'Unknown',
    oracle_text: '',
    image_uris: { small: '', normal: '', large: '', art_crop: '' },
    set: 'test',
  };
}

// ============================================
// Test Runner
// ============================================

function runScenario(scenario: ValidationScenario): {
  passed: boolean;
  details: string;
  rankings: { name: string; score: number }[];
} {
  // Build initial context
  let context = createInitialContext();
  context.packNumber = scenario.packNumber;
  context.pickNumber = scenario.pickNumber;

  // Add prior picks
  for (const pickName of scenario.currentPicks) {
    const card = createMockCard(pickName);
    const newWeights = updateArchetypeWeights(context.archetypeWeights, card);
    context = updateContext(context, card, newWeights);
  }

  // Rate pack cards
  const packCards = scenario.packCards.map(createMockCard);
  const ratings = rateAllCards(packCards, context);

  // Sort by contextual score
  const sorted = [...ratings].sort((a, b) => b.contextualScore - a.contextualScore);
  const actualTop3 = sorted.slice(0, 3).map(r => r.cardName);

  // Check if expected matches actual
  const passed = scenario.expectedTop3.every((expected, idx) =>
    actualTop3[idx] === expected
  );

  // Check archetype if specified
  let archetypeMatch = true;
  if (scenario.archetype) {
    archetypeMatch = context.dominantArchetype === scenario.archetype;
  }

  const rankings = sorted.map(r => ({
    name: r.cardName,
    score: Math.round(r.contextualScore)
  }));

  let details = `Expected: ${scenario.expectedTop3.join(' > ')}\n`;
  details += `  Actual: ${actualTop3.join(' > ')}\n`;
  details += `  Scores: ${rankings.map(r => `${r.name}(${r.score})`).join(', ')}`;

  if (scenario.archetype) {
    details += `\n  Archetype: expected=${scenario.archetype}, got=${context.dominantArchetype || 'none'} ${archetypeMatch ? '✓' : '✗'}`;
  }

  return {
    passed: passed && archetypeMatch,
    details,
    rankings,
  };
}

function runAllScenarios(): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                  Draft Validation Harness');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passCount = 0;
  let failCount = 0;

  for (const scenario of draftScenarios) {
    const result = runScenario(scenario);

    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${statusColor}${status}${reset} ${scenario.name}`);
    console.log(`  ${scenario.description}`);
    console.log(`  ${result.details.split('\n').join('\n  ')}`);
    console.log('');

    if (result.passed) {
      passCount++;
    } else {
      failCount++;
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Results: ${passCount} passed, ${failCount} failed out of ${draftScenarios.length} scenarios`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Exit with error code if any failed
  if (failCount > 0) {
    process.exit(1);
  }
}

// Run if executed directly
runAllScenarios();
