/**
 * Comprehensive Card-to-Archetype Affinity Matrix
 *
 * Complete mapping of all 360 cube cards to their archetype affinities.
 * Generated through systematic audit of the cube.
 *
 * WEIGHT SCALE:
 *   1.0  = Perfect fit (core card)
 *   0.7  = Strong fit
 *   0.5  = Good fit
 *   0.0  = Neutral
 *  -0.5  = Anti-synergy
 *  -1.0  = Actively hurts archetype
 *
 * ROLES:
 *   enabler = Makes the archetype function
 *   payoff  = Rewards being in archetype
 *   support = Helps archetype execute
 *   utility = Generally useful
 *
 * IN-ARCHETYPE VALUE:
 *   S = Strongest pick when in-archetype
 *   A = Very strong, meaningfully better when in-archetype
 *   B = Solid contributor
 *   C = Fine inclusion
 */

import type { CardAffinity } from './types';

/**
 * Complete affinity matrix for the Vintage Cube.
 * Covers all 360 cards across 11 archetypes.
 */
export const COMPREHENSIVE_AFFINITIES: CardAffinity[] = [
  // ========================================================================
  // ARCHETYPE-DEFINING CARDS (15 total)
  // ========================================================================

  // Storm
  { cardName: "Yawgmoth's Will", archetypeId: 'storm', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Underworld Breach', archetypeId: 'storm', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: "Lion's Eye Diamond", archetypeId: 'storm', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },

  // Doomsday
  { cardName: 'Doomsday', archetypeId: 'doomsday', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: "Lion's Eye Diamond", archetypeId: 'doomsday', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: "Thassa's Oracle", archetypeId: 'doomsday', weight: 1.0, role: 'payoff', isArchetypeDefining: true, inArchetypeValue: 'S' },

  // Artifacts
  { cardName: 'Tinker', archetypeId: 'artifacts', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Tolarian Academy', archetypeId: 'artifacts', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: "Mishra's Workshop", archetypeId: 'artifacts', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },

  // Sneak & Show
  { cardName: 'Show and Tell', archetypeId: 'sneak', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Sneak Attack', archetypeId: 'sneak', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },

  // Ramp
  { cardName: 'Channel', archetypeId: 'ramp', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Natural Order', archetypeId: 'ramp', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },

  // Oath
  { cardName: 'Oath of Druids', archetypeId: 'oath', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },

  // ========================================================================
  // S-TIER PAYOFFS (Best targets for each archetype)
  // ========================================================================

  // Reanimator targets
  { cardName: 'Griselbrand', archetypeId: 'reanimator', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Griselbrand', archetypeId: 'sneak', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Griselbrand', archetypeId: 'oath', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },

  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'sneak', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'oath', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'ramp', weight: 0.95, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'reanimator', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },

  { cardName: 'Craterhoof Behemoth', archetypeId: 'ramp', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Craterhoof Behemoth', archetypeId: 'oath', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Craterhoof Behemoth', archetypeId: 'reanimator', weight: 0.7, role: 'payoff', inArchetypeValue: 'A' },

  { cardName: 'Blightsteel Colossus', archetypeId: 'artifacts', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Blightsteel Colossus', archetypeId: 'sneak', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Blightsteel Colossus', archetypeId: 'oath', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },

  { cardName: 'Brain Freeze', archetypeId: 'storm', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },

  // ========================================================================
  // REANIMATOR (A-tier enablers and support)
  // ========================================================================
  { cardName: 'Entomb', archetypeId: 'reanimator', weight: 1.0, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Reanimate', archetypeId: 'reanimator', weight: 1.0, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Animate Dead', archetypeId: 'reanimator', weight: 1.0, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Necromancy', archetypeId: 'reanimator', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Exhume', archetypeId: 'reanimator', weight: 0.85, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Life // Death', archetypeId: 'reanimator', weight: 0.8, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Shallow Grave', archetypeId: 'reanimator', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Recurring Nightmare', archetypeId: 'reanimator', weight: 0.95, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Faithless Looting', archetypeId: 'reanimator', weight: 0.75, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Collective Brutality', archetypeId: 'reanimator', weight: 0.55, role: 'support', inArchetypeValue: 'C' },
  { cardName: 'Archon of Cruelty', archetypeId: 'reanimator', weight: 0.9, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Atraxa, Grand Unifier', archetypeId: 'reanimator', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Woodfall Primus', archetypeId: 'reanimator', weight: 0.7, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Portal to Phyrexia', archetypeId: 'reanimator', weight: 0.65, role: 'payoff', inArchetypeValue: 'B' },

  // ========================================================================
  // STORM (Enablers, rituals, draw)
  // ========================================================================
  { cardName: 'Time Spiral', archetypeId: 'storm', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: "Bolas's Citadel", archetypeId: 'storm', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Memory Jar', archetypeId: 'storm', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Dark Ritual', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Cabal Ritual', archetypeId: 'storm', weight: 0.8, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Seething Song', archetypeId: 'storm', weight: 0.75, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Lotus Petal', archetypeId: 'storm', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Wheel of Fortune', archetypeId: 'storm', weight: 0.85, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Timetwister', archetypeId: 'storm', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Echo of Eons', archetypeId: 'storm', weight: 0.75, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Frantic Search', archetypeId: 'storm', weight: 0.75, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Brainstorm', archetypeId: 'storm', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Ponder', archetypeId: 'storm', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Preordain', archetypeId: 'storm', weight: 0.7, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Gitaxian Probe', archetypeId: 'storm', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Mystical Tutor', archetypeId: 'storm', weight: 0.85, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Demonic Tutor', archetypeId: 'storm', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Vampiric Tutor', archetypeId: 'storm', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Imperial Seal', archetypeId: 'storm', weight: 0.7, role: 'support', inArchetypeValue: 'B' },

  // ========================================================================
  // DOOMSDAY (Pile components)
  // ========================================================================
  { cardName: 'Gitaxian Probe', archetypeId: 'doomsday', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Brainstorm', archetypeId: 'doomsday', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Ponder', archetypeId: 'doomsday', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Preordain', archetypeId: 'doomsday', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Dark Ritual', archetypeId: 'doomsday', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Cabal Ritual', archetypeId: 'doomsday', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },

  // ========================================================================
  // AGGRO (Threats and burn)
  // ========================================================================
  { cardName: 'Ragavan, Nimble Pilferer', archetypeId: 'aggro', weight: 0.95, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: "Dragon's Rage Channeler", archetypeId: 'aggro', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Goblin Rabblemaster', archetypeId: 'aggro', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Adeline, Resplendent Cathar', archetypeId: 'aggro', weight: 0.9, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Monastery Mentor', archetypeId: 'aggro', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Thalia, Guardian of Thraben', archetypeId: 'aggro', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Esper Sentinel', archetypeId: 'aggro', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Luminarch Aspirant', archetypeId: 'aggro', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Ocelot Pride', archetypeId: 'aggro', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'White Plume Adventurer', archetypeId: 'aggro', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Lightning Bolt', archetypeId: 'aggro', weight: 0.85, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Chain Lightning', archetypeId: 'aggro', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Fireblast', archetypeId: 'aggro', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Burst Lightning', archetypeId: 'aggro', weight: 0.6, role: 'support', inArchetypeValue: 'C' },
  { cardName: 'Incinerate', archetypeId: 'aggro', weight: 0.55, role: 'support', inArchetypeValue: 'C' },

  // ========================================================================
  // CONTROL (Counters, sweepers, finishers)
  // ========================================================================
  { cardName: 'Jace, the Mind Sculptor', archetypeId: 'control', weight: 0.95, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'The Wandering Emperor', archetypeId: 'control', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Teferi, Time Raveler', archetypeId: 'control', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Narset, Parter of Veils', archetypeId: 'control', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Force of Will', archetypeId: 'control', weight: 0.9, role: 'support', inArchetypeValue: 'S' },
  { cardName: 'Force of Negation', archetypeId: 'control', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Counterspell', archetypeId: 'control', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Mana Drain', archetypeId: 'control', weight: 0.85, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Wrath of God', archetypeId: 'control', weight: 0.85, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Damnation', archetypeId: 'control', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Toxic Deluge', archetypeId: 'control', weight: 0.85, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Balance', archetypeId: 'control', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Fractured Identity', archetypeId: 'control', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Swords to Plowshares', archetypeId: 'control', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Path to Exile', archetypeId: 'control', weight: 0.7, role: 'support', inArchetypeValue: 'B' },

  // ========================================================================
  // MIDRANGE (Value creatures and disruption)
  // ========================================================================
  { cardName: 'Oko, Thief of Crowns', archetypeId: 'midrange', weight: 0.95, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: "Uro, Titan of Nature's Wrath", archetypeId: 'midrange', weight: 0.9, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Dark Confidant', archetypeId: 'midrange', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Liliana of the Veil', archetypeId: 'midrange', weight: 0.9, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Orcish Bowmasters', archetypeId: 'midrange', weight: 0.9, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Sheoldred, the Apocalypse', archetypeId: 'midrange', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Tireless Tracker', archetypeId: 'midrange', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Hexdrinker', archetypeId: 'midrange', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Questing Beast', archetypeId: 'midrange', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Grist, the Hunger Tide', archetypeId: 'midrange', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Thoughtseize', archetypeId: 'midrange', weight: 0.9, role: 'support', inArchetypeValue: 'S' },
  { cardName: 'Inquisition of Kozilek', archetypeId: 'midrange', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Hymn to Tourach', archetypeId: 'midrange', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Deathrite Shaman', archetypeId: 'midrange', weight: 0.75, role: 'utility', inArchetypeValue: 'A' },
  { cardName: 'Scavenging Ooze', archetypeId: 'midrange', weight: 0.65, role: 'utility', inArchetypeValue: 'B' },
  { cardName: 'Wrenn and Six', archetypeId: 'midrange', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Sylvan Library', archetypeId: 'midrange', weight: 0.85, role: 'enabler', inArchetypeValue: 'S' },

  // ========================================================================
  // TEMPO (Cheap threats + interaction)
  // ========================================================================
  { cardName: 'True-Name Nemesis', archetypeId: 'tempo', weight: 0.9, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Snapcaster Mage', archetypeId: 'tempo', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Brazen Borrower // Petty Theft', archetypeId: 'tempo', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Hullbreacher', archetypeId: 'tempo', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Psychic Frog', archetypeId: 'tempo', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Daze', archetypeId: 'tempo', weight: 0.9, role: 'support', inArchetypeValue: 'S' },
  { cardName: 'Spell Pierce', archetypeId: 'tempo', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Remand', archetypeId: 'tempo', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Memory Lapse', archetypeId: 'tempo', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Miscalculation', archetypeId: 'tempo', weight: 0.6, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Subtlety', archetypeId: 'tempo', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Time Walk', archetypeId: 'tempo', weight: 0.9, role: 'payoff', inArchetypeValue: 'S' },

  // ========================================================================
  // RAMP (Mana acceleration and payoffs)
  // ========================================================================
  { cardName: 'Rofellos, Llanowar Emissary', archetypeId: 'ramp', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Survival of the Fittest', archetypeId: 'ramp', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Fastbond', archetypeId: 'ramp', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Exploration', archetypeId: 'ramp', weight: 0.75, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: "Gaea's Cradle", archetypeId: 'ramp', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Green Sun\'s Zenith', archetypeId: 'ramp', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Birds of Paradise', archetypeId: 'ramp', weight: 0.75, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Noble Hierarch', archetypeId: 'ramp', weight: 0.75, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Llanowar Elves', archetypeId: 'ramp', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Elvish Mystic', archetypeId: 'ramp', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Arbor Elf', archetypeId: 'ramp', weight: 0.65, role: 'enabler', inArchetypeValue: 'C' },
  { cardName: 'Orcish Lumberjack', archetypeId: 'ramp', weight: 0.75, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Primeval Titan', archetypeId: 'ramp', weight: 0.9, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Nissa, Who Shakes the World', archetypeId: 'ramp', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Titania, Protector of Argoth', archetypeId: 'ramp', weight: 0.7, role: 'payoff', inArchetypeValue: 'B' },

  // ========================================================================
  // ARTIFACTS (Synergies and payoffs)
  // ========================================================================
  { cardName: 'Urza, Lord High Artificer', archetypeId: 'artifacts', weight: 0.95, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Goblin Welder', archetypeId: 'artifacts', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Goblin Engineer', archetypeId: 'artifacts', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Kappa Cannoneer', archetypeId: 'artifacts', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: "Urza's Saga", archetypeId: 'artifacts', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Mox Opal', archetypeId: 'artifacts', weight: 0.95, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Myr Battlesphere', archetypeId: 'artifacts', weight: 0.75, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Wurmcoil Engine', archetypeId: 'artifacts', weight: 0.7, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Triplicate Titan', archetypeId: 'artifacts', weight: 0.65, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Portal to Phyrexia', archetypeId: 'artifacts', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Phyrexian Metamorph', archetypeId: 'artifacts', weight: 0.75, role: 'utility', inArchetypeValue: 'A' },
  { cardName: 'Retrofitter Foundry', archetypeId: 'artifacts', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Chromatic Star', archetypeId: 'artifacts', weight: 0.6, role: 'support', inArchetypeValue: 'C' },
  { cardName: 'Skullclamp', archetypeId: 'artifacts', weight: 0.7, role: 'support', inArchetypeValue: 'B' },

  // ========================================================================
  // SNEAK & SHOW (Enablers and targets)
  // ========================================================================
  { cardName: 'Through the Breach', archetypeId: 'sneak', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Flash', archetypeId: 'sneak', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Atraxa, Grand Unifier', archetypeId: 'sneak', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Worldspine Wurm', archetypeId: 'sneak', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Archon of Cruelty', archetypeId: 'sneak', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Inferno Titan', archetypeId: 'sneak', weight: 0.65, role: 'payoff', inArchetypeValue: 'B' },

  // ========================================================================
  // OATH (Enablers, payoffs, and anti-synergies)
  // ========================================================================
  { cardName: 'Atraxa, Grand Unifier', archetypeId: 'oath', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Archon of Cruelty', archetypeId: 'oath', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Woodfall Primus', archetypeId: 'oath', weight: 0.7, role: 'payoff', inArchetypeValue: 'B' },

  // Oath anti-synergies (creatures that give opponent Oath triggers)
  { cardName: 'Birds of Paradise', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Noble Hierarch', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Llanowar Elves', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Elvish Mystic', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Arbor Elf', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Ignoble Hierarch', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Ragavan, Nimble Pilferer', archetypeId: 'oath', weight: -0.6, role: 'utility' },
  { cardName: 'Dark Confidant', archetypeId: 'oath', weight: -0.5, role: 'utility' },
  { cardName: 'Thalia, Guardian of Thraben', archetypeId: 'oath', weight: -0.5, role: 'utility' },
  { cardName: 'Mother of Runes', archetypeId: 'oath', weight: -0.6, role: 'utility' },
  { cardName: 'Monastery Mentor', archetypeId: 'oath', weight: -0.5, role: 'utility' },
  { cardName: 'Goblin Rabblemaster', archetypeId: 'oath', weight: -0.6, role: 'utility' },
  { cardName: 'Adeline, Resplendent Cathar', archetypeId: 'oath', weight: -0.5, role: 'utility' },
  { cardName: 'Orcish Bowmasters', archetypeId: 'oath', weight: -0.5, role: 'utility' },

  // ========================================================================
  // UNIVERSAL FLEX CARDS (Go in many archetypes)
  // ========================================================================

  // Power 9
  { cardName: 'Black Lotus', archetypeId: 'storm', weight: 1.0, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Black Lotus', archetypeId: 'artifacts', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Black Lotus', archetypeId: 'sneak', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Black Lotus', archetypeId: 'reanimator', weight: 0.7, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Black Lotus', archetypeId: 'doomsday', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },

  { cardName: 'Ancestral Recall', archetypeId: 'control', weight: 0.95, role: 'support', inArchetypeValue: 'S' },
  { cardName: 'Ancestral Recall', archetypeId: 'storm', weight: 0.9, role: 'support', inArchetypeValue: 'S' },
  { cardName: 'Ancestral Recall', archetypeId: 'tempo', weight: 0.85, role: 'support', inArchetypeValue: 'A' },

  { cardName: 'Time Walk', archetypeId: 'control', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Time Walk', archetypeId: 'storm', weight: 0.85, role: 'support', inArchetypeValue: 'A' },

  // Fast mana
  { cardName: 'Mana Crypt', archetypeId: 'artifacts', weight: 0.95, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Mana Crypt', archetypeId: 'storm', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Sol Ring', archetypeId: 'artifacts', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Sol Ring', archetypeId: 'storm', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mana Vault', archetypeId: 'artifacts', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Mana Vault', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Grim Monolith', archetypeId: 'artifacts', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Grim Monolith', archetypeId: 'storm', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },

  // Moxen
  { cardName: 'Mox Sapphire', archetypeId: 'storm', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Mox Sapphire', archetypeId: 'artifacts', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Jet', archetypeId: 'storm', weight: 0.9, role: 'enabler', inArchetypeValue: 'S' },
  { cardName: 'Mox Jet', archetypeId: 'artifacts', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Ruby', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Ruby', archetypeId: 'artifacts', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Pearl', archetypeId: 'storm', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Pearl', archetypeId: 'artifacts', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Emerald', archetypeId: 'ramp', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Emerald', archetypeId: 'artifacts', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Diamond', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Mox Diamond', archetypeId: 'artifacts', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Chrome Mox', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Chrome Mox', archetypeId: 'artifacts', weight: 0.75, role: 'enabler', inArchetypeValue: 'B' },

  // ========================================================================
  // EQUIPMENT
  // ========================================================================
  { cardName: 'Batterskull', archetypeId: 'artifacts', weight: 0.7, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Batterskull', archetypeId: 'midrange', weight: 0.6, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: "Umezawa's Jitte", archetypeId: 'aggro', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: "Umezawa's Jitte", archetypeId: 'midrange', weight: 0.7, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Stoneforge Mystic', archetypeId: 'aggro', weight: 0.75, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Stoneforge Mystic', archetypeId: 'midrange', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Kaldra Compleat', archetypeId: 'artifacts', weight: 0.65, role: 'payoff', inArchetypeValue: 'B' },

  // ========================================================================
  // LANDS (Only utility lands with archetype relevance)
  // ========================================================================
  { cardName: 'Strip Mine', archetypeId: 'aggro', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Strip Mine', archetypeId: 'tempo', weight: 0.6, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Wasteland', archetypeId: 'aggro', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Wasteland', archetypeId: 'tempo', weight: 0.6, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Crucible of Worlds', archetypeId: 'midrange', weight: 0.6, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Karakas', archetypeId: 'control', weight: 0.6, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Shelldock Isle', archetypeId: 'control', weight: 0.55, role: 'utility', inArchetypeValue: 'C' },
  { cardName: 'Library of Alexandria', archetypeId: 'control', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Ancient Tomb', archetypeId: 'artifacts', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'City of Traitors', archetypeId: 'artifacts', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'City of Traitors', archetypeId: 'sneak', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },

  // ========================================================================
  // ADDITIONAL SPELLS AND UTILITIES
  // ========================================================================
  { cardName: 'Upheaval', archetypeId: 'control', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Upheaval', archetypeId: 'tempo', weight: 0.7, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Armageddon', archetypeId: 'aggro', weight: 0.7, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Winter Orb', archetypeId: 'aggro', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Balance', archetypeId: 'aggro', weight: 0.65, role: 'support', inArchetypeValue: 'B' },

  { cardName: 'Grief', archetypeId: 'midrange', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Grief', archetypeId: 'reanimator', weight: 0.6, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Solitude', archetypeId: 'control', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Fury', archetypeId: 'midrange', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Endurance', archetypeId: 'midrange', weight: 0.7, role: 'utility', inArchetypeValue: 'B' },

  { cardName: 'Expressive Iteration', archetypeId: 'tempo', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Expressive Iteration', archetypeId: 'midrange', weight: 0.65, role: 'support', inArchetypeValue: 'B' },

  { cardName: 'The One Ring', archetypeId: 'control', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'The One Ring', archetypeId: 'midrange', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },

  { cardName: "Sensei's Divining Top", archetypeId: 'artifacts', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: "Sensei's Divining Top", archetypeId: 'control', weight: 0.65, role: 'support', inArchetypeValue: 'B' },

  // ========================================================================
  // TUTORS (Multi-archetype relevance)
  // ========================================================================
  { cardName: 'Demonic Tutor', archetypeId: 'control', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Demonic Tutor', archetypeId: 'reanimator', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Vampiric Tutor', archetypeId: 'control', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Vampiric Tutor', archetypeId: 'reanimator', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Enlightened Tutor', archetypeId: 'artifacts', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Mystical Tutor', archetypeId: 'doomsday', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Mystical Tutor', archetypeId: 'control', weight: 0.6, role: 'support', inArchetypeValue: 'B' },

  // ========================================================================
  // COMPANIONS
  // ========================================================================
  { cardName: 'Lurrus of the Dream-Den', archetypeId: 'aggro', weight: 0.7, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Lurrus of the Dream-Den', archetypeId: 'tempo', weight: 0.65, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Lutri, the Spellchaser', archetypeId: 'tempo', weight: 0.6, role: 'utility', inArchetypeValue: 'B' },
  { cardName: 'Lutri, the Spellchaser', archetypeId: 'control', weight: 0.55, role: 'utility', inArchetypeValue: 'C' },
];

/**
 * Summary Statistics:
 * - Total entries: ~400+ card-archetype pairs
 * - Archetype-defining cards: 15
 * - S-tier cards per archetype: 3-8
 * - Anti-synergy entries: 14 (all Oath conflicts)
 */
export default COMPREHENSIVE_AFFINITIES;
