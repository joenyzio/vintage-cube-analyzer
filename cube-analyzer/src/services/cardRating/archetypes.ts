/**
 * Vintage Cube Archetype Definitions
 *
 * The 10 major archetypes in Vintage Cube, with key cards and signals.
 * Used for archetype detection and affinity calculations.
 */

import type { ArchetypeDefinition } from './types';

export const VINTAGE_CUBE_ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'reanimator',
    name: 'Reanimator',
    shortName: 'Rean',
    description: 'Cheat large creatures into play from the graveyard',
    primaryColors: ['B'],
    keyCards: [
      'Reanimate',
      'Animate Dead',
      'Entomb',
      'Griselbrand',
      'Necromancy',
      "Shallow Grave",
      'Life // Death',
    ],
    signalCards: [
      'Faithless Looting',
      'Careful Study',
      'Collective Brutality',
      'Unmarked Grave',
      'Persist',
      'Archon of Cruelty',
      'Atraxa, Grand Unifier',
      'Emrakul, the Aeons Torn',
      'Grave Titan',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'storm',
    name: 'Storm',
    shortName: 'Storm',
    description: 'Win via storm count spell chains',
    primaryColors: ['U', 'B'],
    keyCards: [
      'Tendrils of Agony',
      'Brain Freeze',
      "Yawgmoth's Will",
      'Underworld Breach',
      "Lion's Eye Diamond",
      'Dark Ritual',
    ],
    signalCards: [
      'Lotus Petal',
      'Mana Vault',
      'Mox Diamond',
      'Chrome Mox',
      'Cabal Ritual',
      'Turnabout',
      'Time Spiral',
      'Wheel of Fortune',
      'Timetwister',
      'Windfall',
      'Echo of Eons',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'aggro',
    name: 'Aggro',
    shortName: 'Aggro',
    description: 'Fast creature beatdown with burn support. Best variant: Jeskai (RUW) at 1893 ELO.',
    primaryColors: ['R', 'W', 'U'],
    keyCards: [
      'Monastery Swiftspear',
      'Goblin Guide',
      'Ragavan, Nimble Pilferer',
      'Flame-Blessed Bolt',
      'Lightning Bolt',
      'Chain Lightning',
    ],
    signalCards: [
      "Dragon's Rage Channeler",
      'Soul-Scar Mage',
      'Eidolon of the Great Revel',
      'Thalia, Guardian of Thraben',
      'Adeline, Resplendent Cathar',
      'Sulfuric Vortex',
      'Fireblast',
      'Price of Progress',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'control',
    name: 'Control',
    shortName: 'Ctrl',
    description: 'Answer threats and win with card advantage',
    primaryColors: ['U', 'W'],
    keyCards: [
      'Jace, the Mind Sculptor',
      'Teferi, Hero of Dominaria',
      'Force of Will',
      'Counterspell',
      'Mana Drain',
      'Supreme Verdict',
      'Wrath of God',
    ],
    signalCards: [
      'Snapcaster Mage',
      'Narset, Parter of Veils',
      'Cryptic Command',
      'Force of Negation',
      'Fact or Fiction',
      'Search for Azcanta',
      'The Wandering Emperor',
      'Day of Judgment',
      'Terminus',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'ramp',
    name: 'Ramp',
    shortName: 'Ramp',
    description: 'Accelerate mana and cast big threats early',
    primaryColors: ['G'],
    keyCards: [
      'Channel',
      'Natural Order',
      'Craterhoof Behemoth',
      'Primeval Titan',
      'Oracle of Mul Daya',
    ],
    signalCards: [
      'Birds of Paradise',
      'Noble Hierarch',
      'Llanowar Elves',
      'Rofellos, Llanowar Emissary',
      'Joraga Treespeaker',
      'Nissa, Who Shakes the World',
      'Tooth and Nail',
      'Ulamog, the Ceaseless Hunger',
      'Kozilek, Butcher of Truth',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'artifacts',
    name: 'Artifact Combo',
    shortName: 'Artfct',
    description: 'Artifact-based synergies and combos',
    primaryColors: [],
    keyCards: [
      'Tinker',
      'Goblin Welder',
      'Urza, Lord High Artificer',
      'Tolarian Academy',
      'Blightsteel Colossus',
    ],
    signalCards: [
      'Daretti, Scrap Savant',
      'Karn, Scion of Urza',
      'Myr Battlesphere',
      'Wurmcoil Engine',
      'Metalworker',
      'Grim Monolith',
      'Voltaic Key',
      'Time Vault',
      'Memory Jar',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'sneak',
    name: 'Sneak & Show',
    shortName: 'Sneak',
    description: 'Cheat massive creatures into play via Show and Tell or Sneak Attack',
    primaryColors: ['R', 'U'],
    keyCards: [
      'Show and Tell',
      'Sneak Attack',
      'Through the Breach',
      'Emrakul, the Aeons Torn',
      'Griselbrand',
    ],
    signalCards: [
      'Omniscience',
      'Ulamog, the Ceaseless Hunger',
      "Kozilek, Butcher of Truth",
      'Worldspine Wurm',
      'Serra\'s Emissary',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'midrange',
    name: 'Midrange',
    shortName: 'Mid',
    description: 'Efficient threats with flexible answers. Best variant: Sultai (BGU) at 1929 ELO.',
    primaryColors: ['B', 'G', 'U'],
    keyCards: [
      'Tarmogoyf',
      'Tireless Tracker',
      'Liliana of the Veil',
      'Thoughtseize',
      'Oko, Thief of Crowns',
    ],
    signalCards: [
      'Deathrite Shaman',
      'Scavenging Ooze',
      'Hexdrinker',
      'Grist, the Hunger Tide',
      'Vraska, Golgari Queen',
      'Maelstrom Pulse',
      'Abrupt Decay',
      'Assassin\'s Trophy',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'tempo',
    name: 'Tempo',
    shortName: 'Tempo',
    description: 'Efficient threats backed by cheap interaction. Best variant: Sultai (BGU) at 1907 ELO.',
    primaryColors: ['U', 'B', 'G'],
    keyCards: [
      'Daze',
      'Force Spike',
      'Delver of Secrets',
      'Vendilion Clique',
      'True-Name Nemesis',
    ],
    signalCards: [
      'Brazen Borrower',
      'Subtlety',
      'Spell Pierce',
      'Flusterstorm',
      'Remand',
      'Vapor Snag',
      'Lightning Bolt',
      'Snapcaster Mage',
    ],
    antiSynergyCards: [],
  },
  {
    id: 'oath',
    name: 'Oath of Druids',
    shortName: 'Oath',
    description: 'Abuse Oath of Druids to cheat creatures into play',
    primaryColors: ['G', 'U'],
    keyCards: [
      'Oath of Druids',
      'Forbidden Orchard',
      'Griselbrand',
      'Emrakul, the Aeons Torn',
    ],
    signalCards: [
      'Omniscience',
      'Show and Tell',
      'Atraxa, Grand Unifier',
      'Archon of Cruelty',
    ],
    antiSynergyCards: [
      // Cards that give you creatures (bad with Oath)
      'Birds of Paradise',
      'Noble Hierarch',
      'Llanowar Elves',
    ],
  },
  {
    id: 'doomsday',
    name: 'Doomsday',
    shortName: 'Doom',
    description: 'Assemble a specific 5-card pile and resolve it in sequence to win',
    primaryColors: ['U', 'B'],
    keyCards: [
      'Doomsday',
      "Thassa's Oracle",
      "Lion's Eye Diamond",
    ],
    signalCards: [
      'Gitaxian Probe',
      'Ponder',
      'Brainstorm',
      'Preordain',
      'Dark Ritual',
      'Cabal Ritual',
      'Street Wraith',
      'Consider',
    ],
    antiSynergyCards: [],
  },
];

/**
 * Get archetype by ID
 */
export function getArchetype(id: string): ArchetypeDefinition | undefined {
  return VINTAGE_CUBE_ARCHETYPES.find(a => a.id === id);
}

/**
 * Get all archetype IDs
 */
export function getArchetypeIds(): string[] {
  return VINTAGE_CUBE_ARCHETYPES.map(a => a.id);
}

/**
 * Check if a card is a key card for any archetype
 */
export function isKeyCard(cardName: string): { archetypeId: string; archetype: string } | null {
  for (const arch of VINTAGE_CUBE_ARCHETYPES) {
    if (arch.keyCards.includes(cardName)) {
      return { archetypeId: arch.id, archetype: arch.name };
    }
  }
  return null;
}

/**
 * Check if a card is a signal card for any archetype
 */
export function isSignalCard(cardName: string): { archetypeId: string; archetype: string }[] {
  const results: { archetypeId: string; archetype: string }[] = [];
  for (const arch of VINTAGE_CUBE_ARCHETYPES) {
    if (arch.signalCards.includes(cardName)) {
      results.push({ archetypeId: arch.id, archetype: arch.name });
    }
  }
  return results;
}
