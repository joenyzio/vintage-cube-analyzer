/**
 * Card-to-Archetype Affinity Mappings
 *
 * This file defines how well each card fits each archetype.
 * Initial values are bootstrapped from the existing hardcoded bonuses.
 *
 * Affinity weights are normalized to -1.0 to 1.0:
 *   1.0  = Perfect fit (was +100 bonus)
 *   0.7  = Strong fit (was +70 bonus)
 *   0.5  = Good fit (was +50 bonus)
 *   0.0  = Neutral
 *  -0.5  = Anti-synergy
 *  -1.0  = Actively hurts archetype
 */

import type { CardAffinity, AffinityMap, AffinityRole } from './types';
import type { CubeCard } from '../../types/card';
import { ROLE_WEIGHT_MULTIPLIERS } from './tuning';

// ============================================
// Explicit Card Affinities (Key Cards)
// ============================================

/**
 * Manually curated affinities for key archetype cards.
 * These are the most important mappings.
 */
export const EXPLICIT_AFFINITIES: CardAffinity[] = [
  // ========== REANIMATOR ==========
  // Key enablers
  { cardName: 'Entomb', archetypeId: 'reanimator', weight: 1.0, role: 'enabler' },
  { cardName: 'Reanimate', archetypeId: 'reanimator', weight: 1.0, role: 'enabler' },
  { cardName: 'Animate Dead', archetypeId: 'reanimator', weight: 1.0, role: 'enabler' },
  { cardName: 'Necromancy', archetypeId: 'reanimator', weight: 0.9, role: 'enabler' },
  { cardName: 'Exhume', archetypeId: 'reanimator', weight: 0.85, role: 'enabler' },
  { cardName: 'Life // Death', archetypeId: 'reanimator', weight: 0.8, role: 'enabler' },
  { cardName: 'Persist', archetypeId: 'reanimator', weight: 0.75, role: 'enabler' },
  { cardName: 'Shallow Grave', archetypeId: 'reanimator', weight: 0.7, role: 'enabler' },
  { cardName: 'Unmarked Grave', archetypeId: 'reanimator', weight: 0.85, role: 'enabler' },

  // Discard outlets
  { cardName: 'Faithless Looting', archetypeId: 'reanimator', weight: 0.7, role: 'support' },
  { cardName: 'Careful Study', archetypeId: 'reanimator', weight: 0.65, role: 'support' },
  { cardName: 'Collective Brutality', archetypeId: 'reanimator', weight: 0.5, role: 'support' },

  // Payoffs (big creatures)
  { cardName: 'Griselbrand', archetypeId: 'reanimator', weight: 1.0, role: 'payoff' },
  { cardName: 'Archon of Cruelty', archetypeId: 'reanimator', weight: 0.9, role: 'payoff' },
  { cardName: 'Atraxa, Grand Unifier', archetypeId: 'reanimator', weight: 0.85, role: 'payoff' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'reanimator', weight: 0.8, role: 'payoff' },
  { cardName: "Serra's Emissary", archetypeId: 'reanimator', weight: 0.75, role: 'payoff' },
  { cardName: 'Grave Titan', archetypeId: 'reanimator', weight: 0.7, role: 'payoff' },

  // ========== STORM ==========
  // Engines
  { cardName: "Yawgmoth's Will", archetypeId: 'storm', weight: 1.0, role: 'enabler' },
  { cardName: 'Underworld Breach', archetypeId: 'storm', weight: 0.95, role: 'enabler' },
  { cardName: 'Time Spiral', archetypeId: 'storm', weight: 0.85, role: 'enabler' },

  // Fast mana
  { cardName: "Lion's Eye Diamond", archetypeId: 'storm', weight: 0.9, role: 'enabler' },
  { cardName: 'Dark Ritual', archetypeId: 'storm', weight: 0.85, role: 'enabler' },
  { cardName: 'Cabal Ritual', archetypeId: 'storm', weight: 0.8, role: 'enabler' },
  { cardName: 'Lotus Petal', archetypeId: 'storm', weight: 0.75, role: 'support' },

  // Payoffs
  { cardName: 'Tendrils of Agony', archetypeId: 'storm', weight: 1.0, role: 'payoff' },
  { cardName: 'Brain Freeze', archetypeId: 'storm', weight: 0.9, role: 'payoff' },

  // Draw/selection
  { cardName: 'Wheel of Fortune', archetypeId: 'storm', weight: 0.8, role: 'support' },
  { cardName: 'Timetwister', archetypeId: 'storm', weight: 0.75, role: 'support' },
  { cardName: 'Windfall', archetypeId: 'storm', weight: 0.7, role: 'support' },
  { cardName: 'Echo of Eons', archetypeId: 'storm', weight: 0.7, role: 'support' },

  // ========== AGGRO ==========
  { cardName: 'Monastery Swiftspear', archetypeId: 'aggro', weight: 0.9, role: 'payoff' },
  { cardName: 'Goblin Guide', archetypeId: 'aggro', weight: 0.9, role: 'payoff' },
  { cardName: 'Ragavan, Nimble Pilferer', archetypeId: 'aggro', weight: 0.85, role: 'payoff' },
  { cardName: "Dragon's Rage Channeler", archetypeId: 'aggro', weight: 0.8, role: 'payoff' },
  { cardName: 'Soul-Scar Mage', archetypeId: 'aggro', weight: 0.75, role: 'payoff' },
  { cardName: 'Eidolon of the Great Revel', archetypeId: 'aggro', weight: 0.8, role: 'support' },
  { cardName: 'Lightning Bolt', archetypeId: 'aggro', weight: 0.7, role: 'support' },
  { cardName: 'Chain Lightning', archetypeId: 'aggro', weight: 0.65, role: 'support' },
  { cardName: 'Fireblast', archetypeId: 'aggro', weight: 0.6, role: 'support' },
  { cardName: 'Sulfuric Vortex', archetypeId: 'aggro', weight: 0.75, role: 'support' },

  // ========== CONTROL ==========
  { cardName: 'Jace, the Mind Sculptor', archetypeId: 'control', weight: 0.85, role: 'payoff' },
  { cardName: 'Teferi, Hero of Dominaria', archetypeId: 'control', weight: 0.8, role: 'payoff' },
  { cardName: 'The Wandering Emperor', archetypeId: 'control', weight: 0.7, role: 'payoff' },
  { cardName: 'Force of Will', archetypeId: 'control', weight: 0.75, role: 'support' },
  { cardName: 'Counterspell', archetypeId: 'control', weight: 0.65, role: 'support' },
  { cardName: 'Mana Drain', archetypeId: 'control', weight: 0.7, role: 'support' },
  { cardName: 'Cryptic Command', archetypeId: 'control', weight: 0.6, role: 'support' },
  { cardName: 'Supreme Verdict', archetypeId: 'control', weight: 0.8, role: 'support' },
  { cardName: 'Wrath of God', archetypeId: 'control', weight: 0.75, role: 'support' },
  { cardName: 'Day of Judgment', archetypeId: 'control', weight: 0.7, role: 'support' },
  { cardName: 'Terminus', archetypeId: 'control', weight: 0.65, role: 'support' },

  // ========== RAMP ==========
  { cardName: 'Channel', archetypeId: 'ramp', weight: 0.9, role: 'enabler' },
  { cardName: 'Natural Order', archetypeId: 'ramp', weight: 0.85, role: 'enabler' },
  { cardName: 'Rofellos, Llanowar Emissary', archetypeId: 'ramp', weight: 0.8, role: 'enabler' },
  { cardName: 'Oracle of Mul Daya', archetypeId: 'ramp', weight: 0.7, role: 'support' },
  { cardName: 'Craterhoof Behemoth', archetypeId: 'ramp', weight: 0.9, role: 'payoff' },
  { cardName: 'Primeval Titan', archetypeId: 'ramp', weight: 0.8, role: 'payoff' },
  { cardName: 'Ulamog, the Ceaseless Hunger', archetypeId: 'ramp', weight: 0.75, role: 'payoff' },

  // ========== ARTIFACTS ==========
  { cardName: 'Tinker', archetypeId: 'artifacts', weight: 0.95, role: 'enabler' },
  { cardName: 'Goblin Welder', archetypeId: 'artifacts', weight: 0.85, role: 'enabler' },
  { cardName: 'Daretti, Scrap Savant', archetypeId: 'artifacts', weight: 0.75, role: 'enabler' },
  { cardName: 'Urza, Lord High Artificer', archetypeId: 'artifacts', weight: 0.9, role: 'payoff' },
  { cardName: 'Tolarian Academy', archetypeId: 'artifacts', weight: 0.85, role: 'support' },
  { cardName: 'Blightsteel Colossus', archetypeId: 'artifacts', weight: 0.9, role: 'payoff' },
  { cardName: 'Myr Battlesphere', archetypeId: 'artifacts', weight: 0.75, role: 'payoff' },
  { cardName: 'Wurmcoil Engine', archetypeId: 'artifacts', weight: 0.7, role: 'payoff' },
  { cardName: 'Time Vault', archetypeId: 'artifacts', weight: 0.85, role: 'enabler' },
  { cardName: 'Voltaic Key', archetypeId: 'artifacts', weight: 0.8, role: 'enabler' },

  // ========== SNEAK & SHOW ==========
  { cardName: 'Show and Tell', archetypeId: 'sneak', weight: 1.0, role: 'enabler' },
  { cardName: 'Sneak Attack', archetypeId: 'sneak', weight: 0.95, role: 'enabler' },
  { cardName: 'Through the Breach', archetypeId: 'sneak', weight: 0.85, role: 'enabler' },
  { cardName: 'Emrakul, the Aeons Torn', archetypeId: 'sneak', weight: 1.0, role: 'payoff' },
  { cardName: 'Griselbrand', archetypeId: 'sneak', weight: 0.9, role: 'payoff' },
  { cardName: 'Omniscience', archetypeId: 'sneak', weight: 0.85, role: 'payoff' },
  { cardName: 'Worldspine Wurm', archetypeId: 'sneak', weight: 0.8, role: 'payoff' },

  // ========== TEMPO ==========
  { cardName: 'Delver of Secrets', archetypeId: 'tempo', weight: 0.85, role: 'payoff' },
  { cardName: 'True-Name Nemesis', archetypeId: 'tempo', weight: 0.8, role: 'payoff' },
  { cardName: 'Vendilion Clique', archetypeId: 'tempo', weight: 0.75, role: 'payoff' },
  { cardName: 'Daze', archetypeId: 'tempo', weight: 0.8, role: 'support' },
  { cardName: 'Force Spike', archetypeId: 'tempo', weight: 0.65, role: 'support' },
  { cardName: 'Spell Pierce', archetypeId: 'tempo', weight: 0.6, role: 'support' },
  { cardName: 'Brazen Borrower', archetypeId: 'tempo', weight: 0.7, role: 'payoff' },

  // ========== OATH ==========
  { cardName: 'Oath of Druids', archetypeId: 'oath', weight: 1.0, role: 'enabler' },
  { cardName: 'Forbidden Orchard', archetypeId: 'oath', weight: 0.85, role: 'enabler' },
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

  // Aggro - cheap creatures
  {
    archetypeId: 'aggro',
    check: (c) => (c.cmc ?? 0) <= 2 && Boolean(c.type_line?.toLowerCase().includes('creature')),
    weight: 0.4,
    role: 'payoff',
    reason: 'Cheap creature',
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

  // Control - counters and sweepers
  {
    archetypeId: 'control',
    check: (c) => Boolean(c.oracle_text?.toLowerCase().includes('counter target spell')),
    weight: 0.35,
    role: 'support',
    reason: 'Counterspell',
  },
  {
    archetypeId: 'control',
    check: (c) => Boolean(c.oracle_text?.toLowerCase().includes('destroy all')),
    weight: 0.45,
    role: 'support',
    reason: 'Board wipe',
  },
  {
    archetypeId: 'control',
    check: (c) => Boolean(c.type_line?.toLowerCase().includes('planeswalker')),
    weight: 0.3,
    role: 'payoff',
    reason: 'Planeswalker',
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
];

// ============================================
// Affinity Lookup Functions
// ============================================

// Cache for built affinity map
let affinityMapCache: AffinityMap | null = null;

/**
 * Build the complete affinity map from explicit affinities.
 */
export function buildAffinityMap(): AffinityMap {
  if (affinityMapCache) return affinityMapCache;

  const map: AffinityMap = new Map();

  for (const affinity of EXPLICIT_AFFINITIES) {
    const existing = map.get(affinity.cardName) || [];
    existing.push(affinity);
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
