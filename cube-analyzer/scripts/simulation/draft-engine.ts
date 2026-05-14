/**
 * Draft Engine
 *
 * Core draft simulation logic. Handles pack generation, pick decisions,
 * and pack rotation for 8-player drafts.
 */

import type { CubeCard } from '../../src/types/card';
import type { DraftContext } from '../../src/services/cardRating/types';
import type { DrafterState, PackState, PickLogEntry, DraftResult } from './types';
import {
  rateAllCards,
  createInitialContext,
  updateContext,
  updateArchetypeWeights,
} from '../../src/services/cardRating';
import { buildDeck } from './deck-builder';

const DRAFTER_COUNT = 8;
const PACKS_PER_DRAFTER = 3;
const CARDS_PER_PACK = 15;
const TOTAL_PICKS = PACKS_PER_DRAFTER * CARDS_PER_PACK;  // 45

// ============================================
// Seeded Random Number Generator
// ============================================

function createRng(seed: number): () => number {
  // Simple mulberry32 PRNG
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seeded RNG
function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================
// Pack Generation
// ============================================

function generatePacks(cube: CubeCard[], seed: number): PackState[][] {
  const rng = createRng(seed);
  const shuffled = shuffleArray(cube, rng);

  // Create 3 rounds of packs, 8 packs per round
  const packs: PackState[][] = [[], [], []];

  for (let round = 0; round < PACKS_PER_DRAFTER; round++) {
    for (let drafter = 0; drafter < DRAFTER_COUNT; drafter++) {
      const startIdx = (round * DRAFTER_COUNT + drafter) * CARDS_PER_PACK;
      const packCards = shuffled.slice(startIdx, startIdx + CARDS_PER_PACK);
      packs[round].push({
        cards: packCards,
        originalDrafterId: drafter,
        round: round + 1,
      });
    }
  }

  return packs;
}

// ============================================
// Draft Simulation
// ============================================

export function simulateDraft(cube: CubeCard[], seed: number): DraftResult {
  // Validate cube size
  if (cube.length !== 360) {
    console.warn(`Warning: Cube has ${cube.length} cards, expected 360`);
  }

  // Initialize drafters
  const drafters: DrafterState[] = [];
  for (let i = 0; i < DRAFTER_COUNT; i++) {
    drafters.push({
      id: i,
      pool: [],
      context: createInitialContext(),
    });
  }

  // Generate packs
  const allPacks = generatePacks(cube, seed);

  // Pick log for analysis
  const pickLog: PickLogEntry[] = [];

  // Run each round
  for (let round = 0; round < PACKS_PER_DRAFTER; round++) {
    // Pack direction: left for odd rounds (1, 3), right for even rounds (2)
    const direction = (round % 2 === 0) ? 1 : -1;

    // Current packs in rotation (each drafter has one)
    let currentPacks = [...allPacks[round]];

    // 15 picks per round
    for (let pick = 0; pick < CARDS_PER_PACK; pick++) {
      // Each drafter picks from their current pack
      for (let drafterId = 0; drafterId < DRAFTER_COUNT; drafterId++) {
        const drafter = drafters[drafterId];
        const pack = currentPacks[drafterId];

        if (pack.cards.length === 0) continue;

        // Update context with current pack/pick number
        drafter.context = {
          ...drafter.context,
          packNumber: round + 1,
          pickNumber: pick + 1,
        };

        // Rate all cards in pack
        const ratings = rateAllCards(pack.cards, drafter.context);
        const sorted = [...ratings].sort((a, b) => b.contextualScore - a.contextualScore);

        // Pick the highest-rated card (pure optimal strategy)
        const bestRating = sorted[0];
        const pickedCard = pack.cards.find(c => c.name === bestRating.cardName)!;

        // Log the pick
        pickLog.push({
          round: round + 1,
          pick: pick + 1,
          drafterId,
          cardPicked: pickedCard.name,
          packContents: pack.cards.map(c => c.name),
          topRatings: sorted.slice(0, 3).map(r => ({
            card: r.cardName,
            score: Math.round(r.contextualScore),
          })),
        });

        // Add to drafter's pool
        drafter.pool.push(pickedCard);

        // Update drafter's context
        const newWeights = updateArchetypeWeights(drafter.context.archetypeWeights, pickedCard);
        drafter.context = updateContext(drafter.context, pickedCard, newWeights);

        // Remove card from pack
        pack.cards = pack.cards.filter(c => c.name !== pickedCard.name);
      }

      // Rotate packs
      if (direction === 1) {
        // Pass left: player 0 gets from player 7, player 1 gets from player 0, etc.
        const lastPack = currentPacks[DRAFTER_COUNT - 1];
        for (let i = DRAFTER_COUNT - 1; i > 0; i--) {
          currentPacks[i] = currentPacks[i - 1];
        }
        currentPacks[0] = lastPack;
      } else {
        // Pass right: player 0 gets from player 1, player 7 gets from player 0, etc.
        const firstPack = currentPacks[0];
        for (let i = 0; i < DRAFTER_COUNT - 1; i++) {
          currentPacks[i] = currentPacks[i + 1];
        }
        currentPacks[DRAFTER_COUNT - 1] = firstPack;
      }
    }
  }

  // Build decks from pools
  const decks = drafters.map(drafter =>
    buildDeck(drafter.pool, drafter.context, drafter.id)
  );

  return {
    seed,
    decks,
    pickLog,
  };
}

// ============================================
// Batch Simulation
// ============================================

export function simulateMultipleDrafts(
  cube: CubeCard[],
  count: number,
  baseSeed?: number
): DraftResult[] {
  const results: DraftResult[] = [];
  const startSeed = baseSeed ?? Date.now();

  for (let i = 0; i < count; i++) {
    const seed = startSeed + i;
    const result = simulateDraft(cube, seed);
    results.push(result);

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`  Completed ${i + 1}/${count} drafts...`);
    }
  }

  return results;
}
