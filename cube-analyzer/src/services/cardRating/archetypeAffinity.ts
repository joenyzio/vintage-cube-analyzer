/**
 * Card-to-Archetype Affinity Mappings
 *
 * This file defines how well each card fits each archetype, including
 * archetype-defining flags and conditional in-archetype value tiers.
 *
 * AFFINITY WEIGHTS (-1.0 to 1.0):
 *   1.0  = Perfect fit (core card)
 *   0.7  = Strong fit
 *   0.5  = Good fit
 *   0.0  = Neutral
 *  -0.5  = Anti-synergy
 *  -1.0  = Actively hurts archetype
 *
 * ARCHETYPE-DEFINING (isArchetypeDefining: true):
 *   The archetype literally cannot exist without this card.
 *   Examples: Oath of Druids, Tinker, Channel, Show and Tell
 *
 * IN-ARCHETYPE VALUE (inArchetypeValue: 'S' | 'A' | 'B' | 'C'):
 *   S = Strongest pick available when in-archetype
 *   A = Very strong, archetype works without it but meaningfully weaker
 *   B = Solid contributor, replaceable
 *   C = Fine inclusion, easily swapped
 *
 * Used for conditional rating display in coaching UI:
 * "General: B tier | In-Archetype: S tier" when pool has 2+ archetype cards
 */

import type { CardAffinity, AffinityMap, AffinityRole } from './types';
import type { CubeCard } from '../../types/card';
import { COMPREHENSIVE_AFFINITIES } from './comprehensiveAffinities';

/**
 * Role weight multipliers for affinity calculations.
 * Moved here from tuning.ts for simplicity.
 */
const ROLE_WEIGHT_MULTIPLIERS: Record<AffinityRole, number> = {
  enabler: 1.2,   // Enablers (Entomb) are slightly more valuable
  payoff: 1.1,    // Payoffs (Griselbrand) are valuable
  support: 1.0,   // Support cards at base weight
  utility: 0.9,   // Utility cards slightly less important
};

// ============================================
// Explicit Card Affinities (Key Cards)
// ============================================

/**
 * Manually curated affinities for key archetype cards.
 * These are the most important mappings.
 */
export const EXPLICIT_AFFINITIES: CardAffinity[] = [
  // ========== REANIMATOR ==========
  // Key enablers (verified in cube)
  { cardName: 'Entomb', archetypeId: 'reanimator', weight: 1.0, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Reanimate', archetypeId: 'reanimator', weight: 1.0, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Animate Dead', archetypeId: 'reanimator', weight: 1.0, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Necromancy', archetypeId: 'reanimator', weight: 0.9, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Exhume', archetypeId: 'reanimator', weight: 0.85, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Life // Death', archetypeId: 'reanimator', weight: 0.8, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Shallow Grave', archetypeId: 'reanimator', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Recurring Nightmare', archetypeId: 'reanimator', weight: 0.95, role: 'enabler', inArchetypeValue: 'A' },

  // Discard outlets
  { cardName: 'Faithless Looting', archetypeId: 'reanimator', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Collective Brutality', archetypeId: 'reanimator', weight: 0.5, role: 'support', inArchetypeValue: 'C' },

  // Payoffs (big creatures) - S-tier payoffs
  { cardName: 'Griselbrand', archetypeId: 'reanimator', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Archon of Cruelty', archetypeId: 'reanimator', weight: 0.9, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Atraxa, Grand Unifier', archetypeId: 'reanimator', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'reanimator', weight: 0.8, role: 'payoff', inArchetypeValue: 'S' },

  // ========== STORM ==========
  // Engines - ARCHETYPE-DEFINING
  { cardName: "Yawgmoth's Will", archetypeId: 'storm', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Underworld Breach', archetypeId: 'storm', weight: 0.95, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Time Spiral', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: "Bolas's Citadel", archetypeId: 'storm', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Memory Jar', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },

  // Fast mana - LED is ARCHETYPE-DEFINING for LED storm lines
  { cardName: "Lion's Eye Diamond", archetypeId: 'storm', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Dark Ritual', archetypeId: 'storm', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Cabal Ritual', archetypeId: 'storm', weight: 0.8, role: 'enabler', inArchetypeValue: 'B' },
  { cardName: 'Lotus Petal', archetypeId: 'storm', weight: 0.75, role: 'support', inArchetypeValue: 'B' },

  // Payoffs - Brain Freeze is THE storm payoff in this cube
  { cardName: 'Brain Freeze', archetypeId: 'storm', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },

  // Draw/selection
  { cardName: 'Wheel of Fortune', archetypeId: 'storm', weight: 0.8, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Timetwister', archetypeId: 'storm', weight: 0.75, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Echo of Eons', archetypeId: 'storm', weight: 0.7, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Frantic Search', archetypeId: 'storm', weight: 0.7, role: 'support', inArchetypeValue: 'B' },

  // ========== DOOMSDAY ==========
  // ARCHETYPE-DEFINING
  { cardName: 'Doomsday', archetypeId: 'doomsday', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: "Thassa's Oracle", archetypeId: 'doomsday', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: "Lion's Eye Diamond", archetypeId: 'doomsday', weight: 0.95, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  // Support
  { cardName: 'Gitaxian Probe', archetypeId: 'doomsday', weight: 0.7, role: 'support', inArchetypeValue: 'A' },
  { cardName: 'Ponder', archetypeId: 'doomsday', weight: 0.6, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Brainstorm', archetypeId: 'doomsday', weight: 0.65, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Dark Ritual', archetypeId: 'doomsday', weight: 0.7, role: 'support', inArchetypeValue: 'A' },

  // ========== AGGRO ==========
  // Verified in cube
  { cardName: 'Ragavan, Nimble Pilferer', archetypeId: 'aggro', weight: 0.85, role: 'payoff' },
  { cardName: "Dragon's Rage Channeler", archetypeId: 'aggro', weight: 0.8, role: 'payoff' },
  { cardName: 'Lightning Bolt', archetypeId: 'aggro', weight: 0.7, role: 'support' },
  { cardName: 'Chain Lightning', archetypeId: 'aggro', weight: 0.65, role: 'support' },
  { cardName: 'Fireblast', archetypeId: 'aggro', weight: 0.6, role: 'support' },

  // ========== CONTROL ==========
  // Verified in cube
  { cardName: 'Jace, the Mind Sculptor', archetypeId: 'control', weight: 0.85, role: 'payoff' },
  { cardName: 'The Wandering Emperor', archetypeId: 'control', weight: 0.7, role: 'payoff' },
  { cardName: 'Force of Will', archetypeId: 'control', weight: 0.75, role: 'support' },
  { cardName: 'Counterspell', archetypeId: 'control', weight: 0.65, role: 'support' },
  { cardName: 'Mana Drain', archetypeId: 'control', weight: 0.7, role: 'support' },
  { cardName: 'Wrath of God', archetypeId: 'control', weight: 0.75, role: 'support' },

  // ========== RAMP ==========
  // ARCHETYPE-DEFINING
  { cardName: 'Channel', archetypeId: 'ramp', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Natural Order', archetypeId: 'ramp', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  // Strong enablers
  { cardName: 'Rofellos, Llanowar Emissary', archetypeId: 'ramp', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Survival of the Fittest', archetypeId: 'ramp', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Fastbond', archetypeId: 'ramp', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Exploration', archetypeId: 'ramp', weight: 0.7, role: 'enabler', inArchetypeValue: 'B' },
  // S-tier payoffs
  { cardName: 'Craterhoof Behemoth', archetypeId: 'ramp', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'ramp', weight: 0.95, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Primeval Titan', archetypeId: 'ramp', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },

  // ========== ARTIFACTS ==========
  // ARCHETYPE-DEFINING
  { cardName: 'Tinker', archetypeId: 'artifacts', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Tolarian Academy', archetypeId: 'artifacts', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  // Strong enablers
  { cardName: 'Goblin Welder', archetypeId: 'artifacts', weight: 0.85, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Urza, Lord High Artificer', archetypeId: 'artifacts', weight: 0.95, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: "Mishra's Workshop", archetypeId: 'artifacts', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  // S-tier payoffs
  { cardName: 'Blightsteel Colossus', archetypeId: 'artifacts', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Myr Battlesphere', archetypeId: 'artifacts', weight: 0.75, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Wurmcoil Engine', archetypeId: 'artifacts', weight: 0.7, role: 'payoff', inArchetypeValue: 'B' },
  { cardName: 'Kappa Cannoneer', archetypeId: 'artifacts', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },

  // ========== SNEAK & SHOW ==========
  // ARCHETYPE-DEFINING
  { cardName: 'Show and Tell', archetypeId: 'sneak', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  { cardName: 'Sneak Attack', archetypeId: 'sneak', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },
  // Strong enablers
  { cardName: 'Flash', archetypeId: 'sneak', weight: 0.8, role: 'enabler', inArchetypeValue: 'A' },
  { cardName: 'Through the Breach', archetypeId: 'sneak', weight: 0.9, role: 'enabler', inArchetypeValue: 'A' },
  // S-tier payoffs
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'sneak', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Griselbrand', archetypeId: 'sneak', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Worldspine Wurm', archetypeId: 'sneak', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Atraxa, Grand Unifier', archetypeId: 'sneak', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },

  // ========== TEMPO ==========
  // Verified in cube - 13 cards total
  // NOTE: This cube has limited Tempo support (no Delver, Vendilion Clique,
  // Brazen Borrower, Ledger Shredder, Force Spike, Vapor Snag, Flusterstorm)
  // 10.2% emergence is the natural ceiling for this cube's composition.

  // Core tempo threats
  { cardName: 'True-Name Nemesis', archetypeId: 'tempo', weight: 0.85, role: 'payoff' },
  { cardName: 'Snapcaster Mage', archetypeId: 'tempo', weight: 0.65, role: 'payoff' },
  { cardName: 'Subtlety', archetypeId: 'tempo', weight: 0.6, role: 'support' },
  { cardName: 'Hullbreacher', archetypeId: 'tempo', weight: 0.6, role: 'payoff' },

  // Core tempo interaction
  { cardName: 'Daze', archetypeId: 'tempo', weight: 0.9, role: 'support' },
  { cardName: 'Spell Pierce', archetypeId: 'tempo', weight: 0.6, role: 'support' },
  { cardName: 'Remand', archetypeId: 'tempo', weight: 0.65, role: 'support' },
  { cardName: 'Miscalculation', archetypeId: 'tempo', weight: 0.55, role: 'support' },
  { cardName: 'Memory Lapse', archetypeId: 'tempo', weight: 0.55, role: 'support' },

  // Cantrips (shared with storm)
  { cardName: 'Ponder', archetypeId: 'tempo', weight: 0.4, role: 'support' },
  { cardName: 'Preordain', archetypeId: 'tempo', weight: 0.4, role: 'support' },
  { cardName: 'Brainstorm', archetypeId: 'tempo', weight: 0.45, role: 'support' },
  { cardName: 'Gitaxian Probe', archetypeId: 'tempo', weight: 0.35, role: 'support' },

  // ========== OATH ==========
  // NOTE: Missing Forbidden Orchard and Omniscience - Oath support limited

  // ARCHETYPE-DEFINING - Oath literally cannot exist without Oath
  { cardName: 'Oath of Druids', archetypeId: 'oath', weight: 1.0, role: 'enabler', isArchetypeDefining: true, inArchetypeValue: 'S' },

  // S-tier payoffs (creatures to cheat out)
  { cardName: 'Griselbrand', archetypeId: 'oath', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'oath', weight: 1.0, role: 'payoff', inArchetypeValue: 'S' },
  { cardName: 'Atraxa, Grand Unifier', archetypeId: 'oath', weight: 0.85, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Archon of Cruelty', archetypeId: 'oath', weight: 0.8, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Craterhoof Behemoth', archetypeId: 'oath', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Blightsteel Colossus', archetypeId: 'oath', weight: 0.75, role: 'payoff', inArchetypeValue: 'A' },
  { cardName: 'Woodfall Primus', archetypeId: 'oath', weight: 0.65, role: 'payoff', inArchetypeValue: 'B' },

  // Protection/control (keep Oath alive)
  { cardName: 'Force of Will', archetypeId: 'oath', weight: 0.55, role: 'support', inArchetypeValue: 'B' },
  { cardName: 'Counterspell', archetypeId: 'oath', weight: 0.45, role: 'support', inArchetypeValue: 'C' },
  { cardName: 'Mana Drain', archetypeId: 'oath', weight: 0.5, role: 'support', inArchetypeValue: 'B' },

  // Anti-synergy: creature-makers (bad with Oath)
  { cardName: 'Birds of Paradise', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Noble Hierarch', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Llanowar Elves', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Elvish Mystic', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Arbor Elf', archetypeId: 'oath', weight: -0.7, role: 'utility' },
  { cardName: 'Ignoble Hierarch', archetypeId: 'oath', weight: -0.7, role: 'utility' },

  // ========== MIDRANGE ==========
  // Disruption
  { cardName: 'Thoughtseize', archetypeId: 'midrange', weight: 0.85, role: 'support' },
  { cardName: 'Inquisition of Kozilek', archetypeId: 'midrange', weight: 0.75, role: 'support' },
  { cardName: 'Collective Brutality', archetypeId: 'midrange', weight: 0.6, role: 'support' },

  // Efficient threats
  { cardName: 'Hexdrinker', archetypeId: 'midrange', weight: 0.7, role: 'payoff' },
  { cardName: 'Questing Beast', archetypeId: 'midrange', weight: 0.65, role: 'payoff' },
  { cardName: 'Uro, Titan of Nature\'s Wrath', archetypeId: 'midrange', weight: 0.8, role: 'payoff' },

  // Value engines
  { cardName: 'Dark Confidant', archetypeId: 'midrange', weight: 0.8, role: 'enabler' },
  { cardName: 'Tireless Tracker', archetypeId: 'midrange', weight: 0.75, role: 'payoff' },
  { cardName: 'Liliana of the Veil', archetypeId: 'midrange', weight: 0.85, role: 'payoff' },
  { cardName: 'Oko, Thief of Crowns', archetypeId: 'midrange', weight: 0.9, role: 'payoff' },
  { cardName: 'Grist, the Hunger Tide', archetypeId: 'midrange', weight: 0.7, role: 'payoff' },

  // Utility creatures
  { cardName: 'Deathrite Shaman', archetypeId: 'midrange', weight: 0.7, role: 'utility' },
  { cardName: 'Scavenging Ooze', archetypeId: 'midrange', weight: 0.6, role: 'utility' },

  // Removal
  { cardName: 'Fatal Push', archetypeId: 'midrange', weight: 0.5, role: 'support' },
];

// ============================================
// Property-Based Affinity Rules
// ============================================

/**
 * Rules for calculating affinity based on card properties.
 * Used for cards not in the explicit list.
 */
export interface PropertyRule {
  archetypeId: string;
  check: (card: CubeCard) => boolean;
  weight: number;
  role?: AffinityRole;
  reason: string;
}

export const PROPERTY_RULES: PropertyRule[] = [
  // Reanimator - big creatures
  {
    archetypeId: 'reanimator',
    check: (c) => (c.cmc ?? 0) >= 7 && Boolean(c.type_line?.toLowerCase().includes('creature')),
    weight: 0.6,
    role: 'payoff',
    reason: '7+ CMC creature',
  },

  // Storm - cantrips
  {
    archetypeId: 'storm',
    check: (c) => (c.cmc ?? 0) <= 2 && Boolean(c.oracle_text?.toLowerCase().includes('draw')),
    weight: 0.35,
    role: 'support',
    reason: 'Cheap cantrip',
  },

  // Aggro - cheap creatures (RW only)
  {
    archetypeId: 'aggro',
    check: (c) => {
      const colors = c.color_identity || [];
      const isRW = colors.includes('R') || colors.includes('W');
      return (c.cmc ?? 0) <= 2 && Boolean(c.type_line?.toLowerCase().includes('creature')) && isRW;
    },
    weight: 0.2,  // Reduced from 0.4
    role: 'payoff',
    reason: 'Cheap RW creature',
  },
  {
    archetypeId: 'aggro',
    check: (c) => Boolean(c.oracle_text?.toLowerCase().includes('haste')),
    weight: 0.25,
    role: 'support',
    reason: 'Has haste',
  },
  // Aggro anti-synergy - expensive cards
  {
    archetypeId: 'aggro',
    check: (c) => (c.cmc ?? 0) >= 5,
    weight: -0.4,
    reason: 'Too expensive for aggro',
  },

  // Control - counters and sweepers (UW only)
  {
    archetypeId: 'control',
    check: (c) => {
      const colors = c.color_identity || [];
      const isUW = colors.includes('U') || colors.includes('W');
      return isUW && Boolean(c.oracle_text?.toLowerCase().includes('counter target spell'));
    },
    weight: 0.2,  // Reduced from 0.35
    role: 'support',
    reason: 'UW counter',
  },
  {
    archetypeId: 'control',
    check: (c) => Boolean(c.oracle_text?.toLowerCase().includes('destroy all')),
    weight: 0.25,  // Reduced from 0.45
    role: 'support',
    reason: 'Board wipe',
  },
  {
    archetypeId: 'control',
    check: (c) => {
      const colors = c.color_identity || [];
      const isUW = colors.includes('U') || colors.includes('W');
      return isUW && Boolean(c.type_line?.toLowerCase().includes('planeswalker'));
    },
    weight: 0.15,  // Reduced from 0.3
    role: 'payoff',
    reason: 'UW planeswalker',
  },

  // Ramp - expensive creatures and mana
  {
    archetypeId: 'ramp',
    check: (c) => (c.cmc ?? 0) >= 6 && Boolean(c.type_line?.toLowerCase().includes('creature')),
    weight: 0.5,
    role: 'payoff',
    reason: '6+ CMC creature',
  },
  {
    archetypeId: 'ramp',
    check: (c) => Boolean(c.oracle_text?.toLowerCase().includes('add') && c.oracle_text?.toLowerCase().includes('mana')),
    weight: 0.35,
    role: 'enabler',
    reason: 'Mana acceleration',
  },

  // Artifacts - artifact type
  {
    archetypeId: 'artifacts',
    check: (c) => Boolean(c.type_line?.toLowerCase().includes('artifact')),
    weight: 0.25,
    role: 'support',
    reason: 'Is artifact',
  },

  // Sneak - big creatures
  {
    archetypeId: 'sneak',
    check: (c) => (c.cmc ?? 0) >= 7 && Boolean(c.type_line?.toLowerCase().includes('creature')),
    weight: 0.5,
    role: 'payoff',
    reason: 'Cheat target',
  },

  // Midrange - very low weight for generic creatures to prevent dominating
  // Only specific midrange cards (Oko, Liliana, etc.) should push this archetype
  {
    archetypeId: 'midrange',
    check: (c) => {
      const cmc = c.cmc ?? 0;
      const isCreature = Boolean(c.type_line?.toLowerCase().includes('creature'));
      // Only BG creatures get midrange bonus (traditional midrange colors)
      const colors = c.color_identity || [];
      const isBG = colors.includes('B') || colors.includes('G');
      return isCreature && cmc >= 2 && cmc <= 4 && isBG;
    },
    weight: 0.1,  // Very low to prevent dominating
    role: 'payoff',
    reason: 'BG creature',
  },

  // Midrange - discard effects (only for BG)
  {
    archetypeId: 'midrange',
    check: (c) => {
      const colors = c.color_identity || [];
      const isBlack = colors.includes('B');
      return isBlack && Boolean(c.oracle_text?.toLowerCase().includes('discard a card') ||
                          c.oracle_text?.toLowerCase().includes('discard two'));
    },
    weight: 0.15,  // Lowered
    role: 'support',
    reason: 'Disruption',
  },

  // ========== TEMPO ==========
  // Property rules for tempo-specific card patterns

  // Bounce effects (tempo-defining - returns permanents to hand)
  {
    archetypeId: 'tempo',
    check: (c) => {
      const text = c.oracle_text?.toLowerCase() || '';
      return text.includes('return') && text.includes('to its owner') && text.includes('hand');
    },
    weight: 0.4,
    role: 'support',
    reason: 'Bounce effect',
  },
  // Cheap counterspells (CMC <= 2, contains "counter target")
  {
    archetypeId: 'tempo',
    check: (c) => {
      const cmc = c.cmc ?? 0;
      const text = c.oracle_text?.toLowerCase() || '';
      return cmc <= 2 && text.includes('counter target');
    },
    weight: 0.35,
    role: 'support',
    reason: 'Cheap counter',
  },
  // Cheap evasive creatures (CMC <= 3, flying or can't be blocked)
  {
    archetypeId: 'tempo',
    check: (c) => {
      const cmc = c.cmc ?? 0;
      const isCreature = c.type_line?.toLowerCase().includes('creature');
      const text = c.oracle_text?.toLowerCase() || '';
      const hasEvasion = text.includes('flying') || text.includes("can't be blocked");
      return Boolean(isCreature && cmc <= 3 && hasEvasion);
    },
    weight: 0.3,
    role: 'payoff',
    reason: 'Evasive threat',
  },
  // Tempo anti-synergy: expensive cards
  {
    archetypeId: 'tempo',
    check: (c) => (c.cmc ?? 0) >= 5,
    weight: -0.3,
    reason: 'Too slow for tempo',
  },

  // ========== OATH ==========
  // Big creatures as Oath targets
  {
    archetypeId: 'oath',
    check: (c) => {
      const cmc = c.cmc ?? 0;
      const isCreature = c.type_line?.toLowerCase().includes('creature');
      return Boolean(isCreature && cmc >= 7);
    },
    weight: 0.45,
    role: 'payoff',
    reason: 'Oath target',
  },
  // Lands that make tokens for opponent (enables Oath)
  {
    archetypeId: 'oath',
    check: (c) => {
      const isLand = c.type_line?.toLowerCase().includes('land');
      const makesTokens = c.oracle_text?.toLowerCase().includes('create') &&
                          c.oracle_text?.toLowerCase().includes('token');
      return Boolean(isLand && makesTokens);
    },
    weight: 0.5,
    role: 'enabler',
    reason: 'Token-making land',
  },
  // Oath anti-synergy: small creatures
  {
    archetypeId: 'oath',
    check: (c) => {
      const cmc = c.cmc ?? 0;
      const isCreature = c.type_line?.toLowerCase().includes('creature');
      return Boolean(isCreature && cmc <= 3);
    },
    weight: -0.4,
    reason: 'Small creature blocks Oath',
  },
];

// ============================================
// Affinity Lookup Functions
// ============================================

// Cache for built affinity map
let affinityMapCache: AffinityMap | null = null;

/**
 * Build the complete affinity map from explicit and comprehensive affinities.
 * Comprehensive affinities take precedence for overlapping card+archetype pairs.
 */
export function buildAffinityMap(): AffinityMap {
  if (affinityMapCache) return affinityMapCache;

  const map: AffinityMap = new Map();

  // First, add all explicit affinities (base layer)
  for (const affinity of EXPLICIT_AFFINITIES) {
    const existing = map.get(affinity.cardName) || [];
    existing.push(affinity);
    map.set(affinity.cardName, existing);
  }

  // Then, merge comprehensive affinities (takes precedence for same card+archetype)
  for (const affinity of COMPREHENSIVE_AFFINITIES) {
    const existing = map.get(affinity.cardName) || [];
    // Check if this card+archetype combo already exists
    const existingIndex = existing.findIndex(a => a.archetypeId === affinity.archetypeId);
    if (existingIndex >= 0) {
      // Replace with comprehensive data (more detailed)
      existing[existingIndex] = affinity;
    } else {
      // Add new affinity
      existing.push(affinity);
    }
    map.set(affinity.cardName, existing);
  }

  affinityMapCache = map;
  return map;
}

/**
 * Get all affinities for a specific card.
 */
export function getCardAffinities(cardName: string): CardAffinity[] {
  const map = buildAffinityMap();
  return map.get(cardName) || [];
}

/**
 * Get affinity for a card in a specific archetype.
 */
export function getAffinity(cardName: string, archetypeId: string): CardAffinity | undefined {
  const affinities = getCardAffinities(cardName);
  return affinities.find(a => a.archetypeId === archetypeId);
}

/**
 * Calculate total affinity for a card given current archetype weights.
 * This is the core function that determines how well a card fits the deck.
 */
export function calculateCardAffinity(
  card: CubeCard,
  archetypeWeights: Map<string, number>
): { totalAffinity: number; breakdown: { archetypeId: string; weight: number; contribution: number }[] } {
  const breakdown: { archetypeId: string; weight: number; contribution: number }[] = [];
  let totalAffinity = 0;

  // 1. Check explicit affinities
  const explicitAffinities = getCardAffinities(card.name);

  for (const affinity of explicitAffinities) {
    const archetypeWeight = archetypeWeights.get(affinity.archetypeId) || 0;
    if (archetypeWeight > 0) {
      // Apply role multiplier
      const roleMultiplier = affinity.role ? ROLE_WEIGHT_MULTIPLIERS[affinity.role] : 1.0;
      const contribution = affinity.weight * roleMultiplier * archetypeWeight;
      totalAffinity += contribution;
      breakdown.push({
        archetypeId: affinity.archetypeId,
        weight: affinity.weight * roleMultiplier,
        contribution,
      });
    }
  }

  // 2. Check property-based rules (only if no explicit affinity for that archetype)
  for (const rule of PROPERTY_RULES) {
    const archetypeWeight = archetypeWeights.get(rule.archetypeId) || 0;
    if (archetypeWeight > 0 && !explicitAffinities.some(a => a.archetypeId === rule.archetypeId)) {
      if (rule.check(card)) {
        const roleMultiplier = rule.role ? ROLE_WEIGHT_MULTIPLIERS[rule.role] : 1.0;
        const contribution = rule.weight * roleMultiplier * archetypeWeight;
        totalAffinity += contribution;
        breakdown.push({
          archetypeId: rule.archetypeId,
          weight: rule.weight * roleMultiplier,
          contribution,
        });
      }
    }
  }

  return { totalAffinity, breakdown };
}

/**
 * Update archetype weights after picking a card.
 * This is the dynamic weight evolution from madrury's approach.
 */
export function updateArchetypeWeights(
  currentWeights: Map<string, number>,
  pickedCard: CubeCard
): Map<string, number> {
  const newWeights = new Map(currentWeights);

  // Get affinities for the picked card
  const affinities = getCardAffinities(pickedCard.name);

  for (const affinity of affinities) {
    const currentWeight = newWeights.get(affinity.archetypeId) || 0;
    // Add a fraction of the affinity weight to the archetype weight
    // This makes picking archetype cards increase commitment
    const increment = affinity.weight * 0.15; // Tunable
    newWeights.set(affinity.archetypeId, Math.min(1.0, currentWeight + increment));
  }

  // Also check property rules
  for (const rule of PROPERTY_RULES) {
    if (rule.check(pickedCard) && rule.weight > 0) {
      const currentWeight = newWeights.get(rule.archetypeId) || 0;
      const increment = rule.weight * 0.1;
      newWeights.set(rule.archetypeId, Math.min(1.0, currentWeight + increment));
    }
  }

  return newWeights;
}

/**
 * Initialize archetype weights for a new draft.
 */
export function createInitialArchetypeWeights(): Map<string, number> {
  const weights = new Map<string, number>();
  // All archetypes start at 0 (completely open)
  return weights;
}

// ============================================
// Conditional Value Functions
// ============================================

/**
 * Get conditional value info for a card based on current pool.
 * Returns archetype-defining status and in-archetype value when
 * pool has 2+ cards supporting that archetype (the threshold where
 * the archetype becomes a real consideration).
 */
export interface ConditionalValueInfo {
  hasConditionalValue: boolean;
  archetypeId: string | null;
  archetypeName: string | null;
  isArchetypeDefining: boolean;
  inArchetypeValue: 'S' | 'A' | 'B' | 'C' | null;
  poolSupportCount: number;
  reason: string | null;
}

export function getConditionalValue(
  cardName: string,
  poolCardNames: string[]
): ConditionalValueInfo {
  const affinities = getCardAffinities(cardName);

  // No affinities = no conditional value
  if (affinities.length === 0) {
    return {
      hasConditionalValue: false,
      archetypeId: null,
      archetypeName: null,
      isArchetypeDefining: false,
      inArchetypeValue: null,
      poolSupportCount: 0,
      reason: null,
    };
  }

  // Find the best archetype match based on pool support
  let bestMatch: {
    archetypeId: string;
    affinity: CardAffinity;
    supportCount: number;
  } | null = null;

  for (const affinity of affinities) {
    if (!affinity.inArchetypeValue && !affinity.isArchetypeDefining) continue;

    // Count how many pool cards support this archetype
    let supportCount = 0;
    for (const poolCard of poolCardNames) {
      const poolAffinities = getCardAffinities(poolCard);
      if (poolAffinities.some(a => a.archetypeId === affinity.archetypeId && a.weight > 0)) {
        supportCount++;
      }
    }

    if (!bestMatch || supportCount > bestMatch.supportCount) {
      bestMatch = { archetypeId: affinity.archetypeId, affinity, supportCount };
    }
  }

  // Threshold: need 2+ cards to show conditional value
  if (!bestMatch || bestMatch.supportCount < 2) {
    // Even if no pool support, flag archetype-defining cards
    const definingAffinity = affinities.find(a => a.isArchetypeDefining);
    if (definingAffinity) {
      return {
        hasConditionalValue: true,
        archetypeId: definingAffinity.archetypeId,
        archetypeName: getArchetypeDisplayName(definingAffinity.archetypeId),
        isArchetypeDefining: true,
        inArchetypeValue: definingAffinity.inArchetypeValue || 'S',
        poolSupportCount: bestMatch?.supportCount || 0,
        reason: `Archetype-defining for ${getArchetypeDisplayName(definingAffinity.archetypeId)}`,
      };
    }

    return {
      hasConditionalValue: false,
      archetypeId: null,
      archetypeName: null,
      isArchetypeDefining: false,
      inArchetypeValue: null,
      poolSupportCount: 0,
      reason: null,
    };
  }

  const archName = getArchetypeDisplayName(bestMatch.archetypeId);

  return {
    hasConditionalValue: true,
    archetypeId: bestMatch.archetypeId,
    archetypeName: archName,
    isArchetypeDefining: bestMatch.affinity.isArchetypeDefining || false,
    inArchetypeValue: bestMatch.affinity.inArchetypeValue || null,
    poolSupportCount: bestMatch.supportCount,
    reason: bestMatch.affinity.isArchetypeDefining
      ? `Archetype-defining for ${archName}`
      : `${bestMatch.affinity.inArchetypeValue}-tier in ${archName}`,
  };
}

/**
 * Get display name for archetype ID
 */
function getArchetypeDisplayName(archetypeId: string): string {
  const names: Record<string, string> = {
    reanimator: 'Reanimator',
    storm: 'Storm',
    aggro: 'Aggro',
    control: 'Control',
    ramp: 'Ramp',
    artifacts: 'Artifacts',
    sneak: 'Sneak & Show',
    tempo: 'Tempo',
    oath: 'Oath',
    midrange: 'Midrange',
    doomsday: 'Doomsday',
  };
  return names[archetypeId] || archetypeId;
}
