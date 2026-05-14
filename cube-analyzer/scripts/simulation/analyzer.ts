/**
 * Draft Analyzer
 *
 * Aggregates data across multiple draft simulations.
 * Calculates wheel rates, archetype emergence, and anomalies.
 */

import type { CubeCard } from '../../src/types/card';
import type {
  DraftResult,
  BuiltDeck,
  PickLogEntry,
  CardStats,
  ArchetypeStats,
  DeckProfileStats,
  AggregateAnalysis,
} from './types';

const COLORS = ['W', 'U', 'B', 'R', 'G'];

// ============================================
// Main Analysis Function
// ============================================

export function analyzeDrafts(
  results: DraftResult[],
  cubeCards: CubeCard[]
): AggregateAnalysis {
  const draftCount = results.length;
  const totalDecks = draftCount * 8;

  // Initialize card stats
  const cardStats: Record<string, CardStats> = {};
  for (const card of cubeCards) {
    cardStats[card.name] = {
      pickCount: 0,
      totalAppearances: 0,
      avgPickPosition: 0,
      wheelCount: 0,
      wheelOpportunities: 0,
      archetypeBreakdown: {},
      sideboardCount: 0,
    };
  }

  // Initialize archetype stats
  const archetypeDistribution: Record<string, ArchetypeStats> = {};

  // Color tracking
  const colorAppearances: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const colorPairCounts: Record<string, number> = {};

  // Deck profile tracking
  const creatures: number[] = [];
  const removal: number[] = [];
  const cardDraw: number[] = [];
  const avgCmcs: number[] = [];
  const deckQualities: number[] = [];

  // Anomaly tracking
  let insufficientPoolCount = 0;

  // Process each draft
  for (const draft of results) {
    // Analyze picks
    analyzePickLog(draft.pickLog, cardStats);

    // Calculate wheel rates
    calculateWheelRates(draft.pickLog, cardStats);

    // Analyze decks
    for (const deck of draft.decks) {
      analyzeDeck(deck, cardStats, archetypeDistribution, colorAppearances, colorPairCounts);

      creatures.push(deck.creatureCount);
      removal.push(deck.removalCount);
      cardDraw.push(deck.cardDrawCount);
      avgCmcs.push(deck.avgCmc);
      deckQualities.push(deck.deckQuality);

      if (deck.insufficientPoolDepth) {
        insufficientPoolCount++;
      }
    }
  }

  // Calculate averages for pick positions
  for (const name in cardStats) {
    const stats = cardStats[name];
    if (stats.pickCount > 0) {
      stats.avgPickPosition = Math.round((stats.avgPickPosition / stats.pickCount) * 10) / 10;
    }
  }

  // Calculate archetype averages
  for (const archId in archetypeDistribution) {
    const arch = archetypeDistribution[archId];
    if (arch.count > 0) {
      arch.avgCommitment = Math.round((arch.avgCommitment / arch.count) * 100) / 100;
      arch.avgDeckQuality = Math.round(arch.avgDeckQuality / arch.count);
    }
  }

  // Calculate anomalies
  const consistentWheelers = findConsistentWheelers(cardStats);
  const neverWheelers = findNeverWheelers(cardStats);
  const consistentSideboards = findConsistentSideboards(cardStats, totalDecks);
  const colorImbalances = findColorImbalances(colorAppearances, totalDecks);

  // Run sanity checks
  const sanityChecks = runSanityChecks(results, cardStats, archetypeDistribution, cubeCards);

  return {
    draftCount,
    totalDecks,
    archetypeDistribution,
    cardStats,
    colorDistribution: colorAppearances,
    colorPairDistribution: colorPairCounts,
    deckProfiles: {
      creatures: calculateStats(creatures),
      removal: calculateStats(removal),
      cardDraw: calculateStats(cardDraw),
      avgCmc: calculateStats(avgCmcs),
      deckQuality: calculateStats(deckQualities),
    },
    consistentWheelers,
    neverWheelers,
    consistentSideboards,
    colorImbalances,
    insufficientPoolCount,
    sanityChecks,
  };
}

// ============================================
// Pick Analysis
// ============================================

function analyzePickLog(pickLog: PickLogEntry[], cardStats: Record<string, CardStats>): void {
  for (const entry of pickLog) {
    // Track card appearances
    for (const cardName of entry.packContents) {
      if (cardStats[cardName]) {
        cardStats[cardName].totalAppearances++;
      }
    }

    // Track picked card
    const stats = cardStats[entry.cardPicked];
    if (stats) {
      stats.pickCount++;
      // For avgPickPosition, accumulate (round-1)*15 + pick
      const overallPick = (entry.round - 1) * 15 + entry.pick;
      stats.avgPickPosition += overallPick;
    }
  }
}

// ============================================
// Wheel Rate Calculation
// ============================================

/**
 * A card "wheels" when it appears in a pack for a drafter,
 * gets passed all the way around the table (7 other drafters),
 * and returns to the same drafter.
 *
 * In an 8-player draft, if a card is in a pack at pick N for drafter D,
 * and still in the pack at pick N+8 for drafter D (due to pack rotation),
 * then it wheeled.
 */
function calculateWheelRates(
  pickLog: PickLogEntry[],
  cardStats: Record<string, CardStats>
): void {
  // Group picks by drafter and round
  const picksByDrafterRound: Record<string, PickLogEntry[]> = {};

  for (const entry of pickLog) {
    const key = `${entry.drafterId}-${entry.round}`;
    if (!picksByDrafterRound[key]) {
      picksByDrafterRound[key] = [];
    }
    picksByDrafterRound[key].push(entry);
  }

  // For each drafter in each round, check which cards wheeled
  for (const key in picksByDrafterRound) {
    const picks = picksByDrafterRound[key].sort((a, b) => a.pick - b.pick);

    // For each pick position where wheeling is possible (picks 1-7)
    for (let i = 0; i < picks.length - 8; i++) {
      const earlyPick = picks[i];
      const latePick = picks[i + 8];

      if (!latePick) continue;

      // Cards that were in pack at early pick
      const earlyPackCards = new Set(earlyPick.packContents);

      // Cards that are in pack at late pick (8 picks later for same drafter)
      const latePackCards = new Set(latePick.packContents);

      // Cards in both = they wheeled
      for (const cardName of earlyPackCards) {
        const stats = cardStats[cardName];
        if (!stats) continue;

        // This card had an opportunity to wheel
        stats.wheelOpportunities++;

        // Did it actually wheel?
        if (latePackCards.has(cardName)) {
          stats.wheelCount++;
        }
      }
    }
  }
}

// ============================================
// Deck Analysis
// ============================================

function analyzeDeck(
  deck: BuiltDeck,
  cardStats: Record<string, CardStats>,
  archetypeDistribution: Record<string, ArchetypeStats>,
  colorAppearances: Record<string, number>,
  colorPairCounts: Record<string, number>
): void {
  // Track archetype
  if (deck.finalArchetype && deck.archetypeCommitment >= 0.4) {
    if (!archetypeDistribution[deck.finalArchetype]) {
      archetypeDistribution[deck.finalArchetype] = {
        count: 0,
        avgCommitment: 0,
        avgDeckQuality: 0,
      };
    }
    const arch = archetypeDistribution[deck.finalArchetype];
    arch.count++;
    arch.avgCommitment += deck.archetypeCommitment;
    arch.avgDeckQuality += deck.deckQuality;

    // Track which cards go into this archetype
    for (const card of deck.mainDeck) {
      const stats = cardStats[card.name];
      if (stats) {
        if (!stats.archetypeBreakdown[deck.finalArchetype]) {
          stats.archetypeBreakdown[deck.finalArchetype] = 0;
        }
        stats.archetypeBreakdown[deck.finalArchetype]++;
      }
    }
  }

  // Track colors
  for (const color of deck.colors) {
    colorAppearances[color] = (colorAppearances[color] || 0) + 1;
  }

  // Track color pair
  const sortedColors = [...deck.colors].sort().join('');
  colorPairCounts[sortedColors] = (colorPairCounts[sortedColors] || 0) + 1;

  // Track sideboards
  for (const card of deck.sideboard) {
    const stats = cardStats[card.name];
    if (stats) {
      stats.sideboardCount++;
    }
  }
}

// ============================================
// Anomaly Detection
// ============================================

function findConsistentWheelers(cardStats: Record<string, CardStats>): string[] {
  const wheelers: string[] = [];

  for (const name in cardStats) {
    const stats = cardStats[name];
    if (stats.wheelOpportunities >= 10) {  // Minimum sample size
      const wheelRate = stats.wheelCount / stats.wheelOpportunities;
      if (wheelRate >= 0.8) {
        wheelers.push(name);
      }
    }
  }

  return wheelers.sort((a, b) => {
    const rateA = cardStats[a].wheelCount / cardStats[a].wheelOpportunities;
    const rateB = cardStats[b].wheelCount / cardStats[b].wheelOpportunities;
    return rateB - rateA;
  });
}

function findNeverWheelers(cardStats: Record<string, CardStats>): string[] {
  const neverWheelers: string[] = [];

  for (const name in cardStats) {
    const stats = cardStats[name];
    if (stats.wheelOpportunities >= 10) {  // Minimum sample size
      const wheelRate = stats.wheelCount / stats.wheelOpportunities;
      if (wheelRate <= 0.05) {
        neverWheelers.push(name);
      }
    }
  }

  return neverWheelers.sort((a, b) => cardStats[a].avgPickPosition - cardStats[b].avgPickPosition);
}

function findConsistentSideboards(
  cardStats: Record<string, CardStats>,
  totalDecks: number
): string[] {
  const sideboarders: string[] = [];

  for (const name in cardStats) {
    const stats = cardStats[name];
    if (stats.pickCount >= 10) {  // Minimum picks
      const sideboardRate = stats.sideboardCount / stats.pickCount;
      if (sideboardRate >= 0.5) {
        sideboarders.push(name);
      }
    }
  }

  return sideboarders.sort((a, b) => {
    const rateA = cardStats[a].sideboardCount / cardStats[a].pickCount;
    const rateB = cardStats[b].sideboardCount / cardStats[b].pickCount;
    return rateB - rateA;
  });
}

function findColorImbalances(
  colorAppearances: Record<string, number>,
  totalDecks: number
): string[] {
  const imbalances: string[] = [];

  for (const color of COLORS) {
    const rate = (colorAppearances[color] || 0) / totalDecks;
    if (rate < 0.3) {
      imbalances.push(`${color} underrepresented (${Math.round(rate * 100)}%)`);
    } else if (rate > 0.7) {
      imbalances.push(`${color} overrepresented (${Math.round(rate * 100)}%)`);
    }
  }

  return imbalances;
}

// ============================================
// Sanity Checks
// ============================================

function runSanityChecks(
  results: DraftResult[],
  cardStats: Record<string, CardStats>,
  archetypeDistribution: Record<string, ArchetypeStats>,
  cubeCards: CubeCard[]
): AggregateAnalysis['sanityChecks'] {
  // Check deck sizes
  let allDecks40Cards = true;
  let allDecks17Lands = true;

  for (const draft of results) {
    for (const deck of draft.decks) {
      if (deck.mainDeck.length !== 40) allDecks40Cards = false;
      if (deck.lands !== 17) allDecks17Lands = false;
    }
  }

  // Check for duplicates within drafts
  let noDuplicatesInDraft = true;
  for (const draft of results) {
    const allPicked = new Set<string>();
    for (const deck of draft.decks) {
      for (const card of deck.mainDeck) {
        // Skip basic lands
        if (card.type_line?.includes('Basic Land')) continue;
        if (allPicked.has(card.name)) {
          noDuplicatesInDraft = false;
          break;
        }
        allPicked.add(card.name);
      }
      for (const card of deck.sideboard) {
        if (card.type_line?.includes('Basic Land')) continue;
        if (allPicked.has(card.name)) {
          noDuplicatesInDraft = false;
          break;
        }
        allPicked.add(card.name);
      }
    }
  }

  // Check all cards picked at least once
  const unpickedCards = cubeCards.filter(c => cardStats[c.name]?.pickCount === 0);
  const allCardsPickedAtLeastOnce = unpickedCards.length === 0;

  // Check archetype diversity
  const archetypesAbove1Percent = Object.values(archetypeDistribution)
    .filter(a => a.count / (results.length * 8) >= 0.01).length;
  const archetyesDiverse = archetypesAbove1Percent >= 5;

  return {
    allDecks40Cards,
    allDecks17Lands,
    noDuplicatesInDraft,
    allCardsPickedAtLeastOnce,
    archetyesDiverse,
  };
}

// ============================================
// Utility Functions
// ============================================

function calculateStats(values: number[]): DeckProfileStats {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0 };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
