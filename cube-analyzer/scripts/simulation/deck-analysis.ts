/**
 * Deck Analysis Module
 *
 * Analyzes assembled decks vs drafted pools.
 * Computes multi-dimensional quality scores and surfaces interesting patterns.
 */

import type { CubeCard } from '../../src/types/card';
import type { BuiltDeck, DraftResult, PickLogEntry } from './types';
import { getEloData } from '../../src/services/eloHelpers';

// ============================================
// Types
// ============================================

export interface DeckQualityMetrics {
  // Overall scores
  overallScore: number;           // Composite quality score (0-100)
  powerLevel: number;             // Sum of ELO of included cards
  avgCardElo: number;             // Average ELO of main deck spells

  // Dimensional scores (each 0-100)
  archetypeCoherence: number;     // Do cards support a consistent strategy?
  manaBaseQuality: number;        // Right lands for colors?
  curveQuality: number;           // Plays at each mana cost?
  winConditionPresence: number;   // Ways to actually win?
  cardAdvantageEngines: number;   // Ways to draw cards?
  removalPackage: number;         // Answers to threats?
  synergyDensity: number;         // Cards that work together?

  // Curve breakdown
  curveDistribution: number[];    // Count at each CMC [0,1,2,3,4,5,6,7+]
}

export interface PoolAnalysis {
  // Pool totals
  poolSize: number;
  poolPowerLevel: number;         // Sum of ELO of all drafted cards
  avgPoolElo: number;             // Average ELO across entire pool

  // Inclusion analysis
  mainDeckCards: CardInclusion[];
  sideboardCards: CardInclusion[];

  // Cut analysis
  highEloCuts: CardInclusion[];   // High ELO cards that got cut
  lowEloInclusions: CardInclusion[]; // Low ELO cards that made the cut

  // Power transfer
  powerUtilization: number;       // % of pool power that made main deck
  eloWastedInSideboard: number;   // Total ELO sitting in sideboard
}

export interface CardInclusion {
  name: string;
  elo: number;
  cmc: number;
  colors: string[];
  type: string;
  isOnColor: boolean;
  pickPosition: number;           // When it was drafted (1-45)
}

export interface DraftVsDeckComparison {
  drafterId: number;

  // Draft quality (real-time pick evaluation)
  draftQuality: number;           // Average rating of picks when made
  avgPickElo: number;             // Average ELO of cards picked

  // Deck quality (post-assembly)
  deckQuality: DeckQualityMetrics;

  // Pool analysis
  poolAnalysis: PoolAnalysis;

  // The delta
  qualityDelta: number;           // deckQuality.overallScore - normalized draftQuality
  interpretation: 'built_well' | 'built_poorly' | 'neutral';
}

export interface AggregatedDeckAnalysis {
  totalDecks: number;

  // Quality distributions
  avgDeckQuality: number;
  avgPoolPower: number;
  avgPowerUtilization: number;

  // Delta analysis
  avgQualityDelta: number;
  builtWellCount: number;         // Positive delta
  builtPoorlyCount: number;       // Negative delta

  // By archetype
  archetypeBreakdown: Record<string, {
    count: number;
    avgDeckQuality: number;
    avgQualityDelta: number;
    avgPowerUtilization: number;
  }>;

  // Card patterns
  frequentCuts: CardCutPattern[];           // Cards often cut despite being drafted
  frequentInclusions: CardInclusionPattern[]; // Cards rarely cut
  surprisingInclusions: CardInclusionPattern[]; // Low ELO cards that make decks
  surprisingCuts: CardCutPattern[];          // High ELO cards often cut

  // Outliers
  outliers: DeckOutlier[];
}

export interface CardCutPattern {
  cardName: string;
  avgElo: number;
  avgPickPosition: number;
  timesPickedIn: number;
  timesMainDecked: number;
  timesSideboarded: number;
  cutRate: number;                // % of times cut
  primaryCutReason: string;       // Why it gets cut (off-color, curve, etc.)
}

export interface CardInclusionPattern {
  cardName: string;
  avgElo: number;
  avgPickPosition: number;
  timesPickedIn: number;
  timesMainDecked: number;
  inclusionRate: number;
  primaryArchetypes: string[];    // Which archetypes include it most
}

export interface DeckOutlier {
  drafterId: number;
  seed: number;
  type: 'high_draft_low_deck' | 'low_draft_high_deck' | 'surprising_inclusion' | 'surprising_cut';
  description: string;
  details: {
    draftQuality?: number;
    deckQuality?: number;
    delta?: number;
    cardName?: string;
    cardElo?: number;
  };
}

// ============================================
// Core Analysis Functions
// ============================================

/**
 * Calculate multi-dimensional deck quality metrics.
 */
export function calculateDeckQualityMetrics(
  deck: BuiltDeck,
  pool: CubeCard[]
): DeckQualityMetrics {
  const mainDeckSpells = deck.mainDeck.filter(c =>
    !c.type_line?.toLowerCase().includes('land') ||
    c.type_line?.toLowerCase().includes('basic land') === false
  ).filter(c => !c.type_line?.toLowerCase().includes('basic land'));

  // Calculate power level
  let totalElo = 0;
  let cardCount = 0;
  for (const card of mainDeckSpells) {
    const elo = getEloData(card.name)?.elo || 1500;
    totalElo += elo;
    cardCount++;
  }
  const avgCardElo = cardCount > 0 ? totalElo / cardCount : 1500;

  // Build curve distribution
  const curveDistribution = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const card of mainDeckSpells) {
    const cmc = Math.min(7, Math.floor(card.cmc || 0));
    curveDistribution[cmc]++;
  }

  // Calculate dimensional scores

  // 1. Archetype coherence (based on commitment and having key pieces)
  const archetypeCoherence = Math.min(100, deck.archetypeCommitment * 100 + (deck.finalArchetype ? 20 : 0));

  // 2. Mana base quality
  const manaBaseQuality = calculateManaBaseQuality(deck);

  // 3. Curve quality - penalize for gaps or too many expensive cards
  const curveQuality = calculateCurveQuality(curveDistribution, deck.finalArchetype);

  // 4. Win condition presence
  const winConditionPresence = calculateWinConditionScore(mainDeckSpells, deck.finalArchetype);

  // 5. Card advantage engines
  const cardAdvantageEngines = Math.min(100, deck.cardDrawCount * 15);

  // 6. Removal package
  const removalPackage = Math.min(100, deck.removalCount * 20);

  // 7. Synergy density (approximate via archetype commitment and card types)
  const synergyDensity = calculateSynergyDensity(mainDeckSpells, deck.finalArchetype);

  // Composite score (weighted average)
  const weights = {
    power: 0.30,
    coherence: 0.15,
    mana: 0.15,
    curve: 0.10,
    wincon: 0.10,
    cardAdvantage: 0.08,
    removal: 0.07,
    synergy: 0.05,
  };

  // Normalize power level to 0-100 scale (1400-2000 ELO range)
  const normalizedPower = Math.min(100, Math.max(0, ((avgCardElo - 1400) / 600) * 100));

  const overallScore =
    normalizedPower * weights.power +
    archetypeCoherence * weights.coherence +
    manaBaseQuality * weights.mana +
    curveQuality * weights.curve +
    winConditionPresence * weights.wincon +
    cardAdvantageEngines * weights.cardAdvantage +
    removalPackage * weights.removal +
    synergyDensity * weights.synergy;

  return {
    overallScore: Math.round(overallScore),
    powerLevel: totalElo,
    avgCardElo: Math.round(avgCardElo),
    archetypeCoherence: Math.round(archetypeCoherence),
    manaBaseQuality: Math.round(manaBaseQuality),
    curveQuality: Math.round(curveQuality),
    winConditionPresence: Math.round(winConditionPresence),
    cardAdvantageEngines: Math.round(cardAdvantageEngines),
    removalPackage: Math.round(removalPackage),
    synergyDensity: Math.round(synergyDensity),
    curveDistribution,
  };
}

/**
 * Analyze pool vs deck - what got played, what got cut.
 */
export function analyzePoolVsDeck(
  deck: BuiltDeck,
  pool: CubeCard[],
  pickLog: PickLogEntry[],
  drafterId: number
): PoolAnalysis {
  // Get pick positions for this drafter
  const pickPositions = new Map<string, number>();
  const drafterPicks = pickLog.filter(p => p.drafterId === drafterId);
  for (let i = 0; i < drafterPicks.length; i++) {
    pickPositions.set(drafterPicks[i].cardPicked, i + 1);
  }

  // Calculate pool totals
  let poolPowerLevel = 0;
  const poolNonLands = pool.filter(c => !c.type_line?.toLowerCase().includes('land'));
  for (const card of poolNonLands) {
    const elo = getEloData(card.name)?.elo || 1500;
    poolPowerLevel += elo;
  }
  const avgPoolElo = poolNonLands.length > 0 ? poolPowerLevel / poolNonLands.length : 1500;

  // Categorize cards
  const mainDeckCards: CardInclusion[] = [];
  const sideboardCards: CardInclusion[] = [];
  const mainDeckSet = new Set(deck.mainDeck.map(c => c.name));
  const sideboardSet = new Set(deck.sideboard.map(c => c.name));

  for (const card of pool) {
    if (card.type_line?.toLowerCase().includes('basic land')) continue;

    const inclusion: CardInclusion = {
      name: card.name,
      elo: getEloData(card.name)?.elo || 1500,
      cmc: card.cmc || 0,
      colors: card.color_identity || [],
      type: card.type_line || '',
      isOnColor: card.color_identity?.every(c => deck.colors.includes(c)) ?? true,
      pickPosition: pickPositions.get(card.name) || 0,
    };

    if (mainDeckSet.has(card.name)) {
      mainDeckCards.push(inclusion);
    } else if (sideboardSet.has(card.name)) {
      sideboardCards.push(inclusion);
    }
  }

  // Find high ELO cuts (top quartile of pool ELO that got cut)
  const poolByElo = [...mainDeckCards, ...sideboardCards].sort((a, b) => b.elo - a.elo);
  const topQuartileThreshold = poolByElo.length > 4 ? poolByElo[Math.floor(poolByElo.length / 4)].elo : 1600;

  const highEloCuts = sideboardCards
    .filter(c => c.elo >= topQuartileThreshold)
    .sort((a, b) => b.elo - a.elo);

  // Find low ELO inclusions (bottom quartile that made main deck)
  const bottomQuartileThreshold = poolByElo.length > 4 ? poolByElo[Math.floor(poolByElo.length * 3 / 4)].elo : 1500;

  const lowEloInclusions = mainDeckCards
    .filter(c => c.elo <= bottomQuartileThreshold && !c.type.toLowerCase().includes('land'))
    .sort((a, b) => a.elo - b.elo);

  // Calculate power utilization
  const mainDeckPower = mainDeckCards.reduce((sum, c) => sum + c.elo, 0);
  const sideboardPower = sideboardCards.reduce((sum, c) => sum + c.elo, 0);
  const powerUtilization = poolPowerLevel > 0 ? (mainDeckPower / poolPowerLevel) * 100 : 100;

  return {
    poolSize: pool.length,
    poolPowerLevel,
    avgPoolElo: Math.round(avgPoolElo),
    mainDeckCards,
    sideboardCards,
    highEloCuts,
    lowEloInclusions,
    powerUtilization: Math.round(powerUtilization),
    eloWastedInSideboard: sideboardPower,
  };
}

/**
 * Compare draft quality (how they picked) vs deck quality (what they built).
 */
export function compareDraftVsDeck(
  deck: BuiltDeck,
  pool: CubeCard[],
  pickLog: PickLogEntry[],
  drafterId: number
): DraftVsDeckComparison {
  // Calculate draft quality (average rating when picks were made)
  const drafterPicks = pickLog.filter(p => p.drafterId === drafterId);
  let totalDraftScore = 0;
  let totalPickElo = 0;

  for (const pick of drafterPicks) {
    // The rating at time of pick
    const topRating = pick.topRatings[0];
    if (topRating && topRating.card === pick.cardPicked) {
      totalDraftScore += topRating.score;
    }
    // ELO of picked card
    const elo = getEloData(pick.cardPicked)?.elo || 1500;
    totalPickElo += elo;
  }

  const draftQuality = drafterPicks.length > 0 ? totalDraftScore / drafterPicks.length : 0;
  const avgPickElo = drafterPicks.length > 0 ? totalPickElo / drafterPicks.length : 1500;

  // Calculate deck quality metrics
  const deckQuality = calculateDeckQualityMetrics(deck, pool);

  // Analyze pool
  const poolAnalysis = analyzePoolVsDeck(deck, pool, pickLog, drafterId);

  // Calculate delta
  // Normalize draft quality to 0-100 scale (1400-2000 range similar to deck)
  const normalizedDraftQuality = Math.min(100, Math.max(0, ((draftQuality - 1400) / 600) * 100));
  const qualityDelta = deckQuality.overallScore - normalizedDraftQuality;

  // Interpret delta
  let interpretation: 'built_well' | 'built_poorly' | 'neutral';
  if (qualityDelta > 10) {
    interpretation = 'built_well';
  } else if (qualityDelta < -10) {
    interpretation = 'built_poorly';
  } else {
    interpretation = 'neutral';
  }

  return {
    drafterId,
    draftQuality: Math.round(draftQuality),
    avgPickElo: Math.round(avgPickElo),
    deckQuality,
    poolAnalysis,
    qualityDelta: Math.round(qualityDelta),
    interpretation,
  };
}

/**
 * Aggregate analysis across all decks in a simulation.
 */
export function aggregateDeckAnalysis(
  results: DraftResult[],
  comparisons: DraftVsDeckComparison[]
): AggregatedDeckAnalysis {
  const totalDecks = comparisons.length;

  // Quality averages
  let totalDeckQuality = 0;
  let totalPoolPower = 0;
  let totalPowerUtilization = 0;
  let totalQualityDelta = 0;
  let builtWellCount = 0;
  let builtPoorlyCount = 0;

  // Archetype tracking
  const archetypeData: Record<string, {
    count: number;
    totalQuality: number;
    totalDelta: number;
    totalUtilization: number;
  }> = {};

  // Card tracking (for patterns)
  const cardPickData: Record<string, {
    timesPicked: number;
    timesMainDecked: number;
    timesSideboarded: number;
    totalElo: number;
    totalPickPosition: number;
    archetypes: Record<string, number>;
  }> = {};

  // Process each comparison
  for (let i = 0; i < comparisons.length; i++) {
    const comp = comparisons[i];
    const draftIndex = Math.floor(i / 8);
    const deck = results[draftIndex].decks.find(d => d.drafterId === comp.drafterId);
    if (!deck) continue;

    totalDeckQuality += comp.deckQuality.overallScore;
    totalPoolPower += comp.poolAnalysis.poolPowerLevel;
    totalPowerUtilization += comp.poolAnalysis.powerUtilization;
    totalQualityDelta += comp.qualityDelta;

    if (comp.interpretation === 'built_well') builtWellCount++;
    if (comp.interpretation === 'built_poorly') builtPoorlyCount++;

    // Track archetype
    const arch = deck.finalArchetype || 'unknown';
    if (!archetypeData[arch]) {
      archetypeData[arch] = { count: 0, totalQuality: 0, totalDelta: 0, totalUtilization: 0 };
    }
    archetypeData[arch].count++;
    archetypeData[arch].totalQuality += comp.deckQuality.overallScore;
    archetypeData[arch].totalDelta += comp.qualityDelta;
    archetypeData[arch].totalUtilization += comp.poolAnalysis.powerUtilization;

    // Track card patterns
    for (const card of comp.poolAnalysis.mainDeckCards) {
      if (!cardPickData[card.name]) {
        cardPickData[card.name] = {
          timesPicked: 0,
          timesMainDecked: 0,
          timesSideboarded: 0,
          totalElo: 0,
          totalPickPosition: 0,
          archetypes: {},
        };
      }
      cardPickData[card.name].timesPicked++;
      cardPickData[card.name].timesMainDecked++;
      cardPickData[card.name].totalElo += card.elo;
      cardPickData[card.name].totalPickPosition += card.pickPosition;
      cardPickData[card.name].archetypes[arch] = (cardPickData[card.name].archetypes[arch] || 0) + 1;
    }

    for (const card of comp.poolAnalysis.sideboardCards) {
      if (!cardPickData[card.name]) {
        cardPickData[card.name] = {
          timesPicked: 0,
          timesMainDecked: 0,
          timesSideboarded: 0,
          totalElo: 0,
          totalPickPosition: 0,
          archetypes: {},
        };
      }
      cardPickData[card.name].timesPicked++;
      cardPickData[card.name].timesSideboarded++;
      cardPickData[card.name].totalElo += card.elo;
      cardPickData[card.name].totalPickPosition += card.pickPosition;
    }
  }

  // Build archetype breakdown
  const archetypeBreakdown: Record<string, {
    count: number;
    avgDeckQuality: number;
    avgQualityDelta: number;
    avgPowerUtilization: number;
  }> = {};

  for (const [arch, data] of Object.entries(archetypeData)) {
    if (data.count > 0) {
      archetypeBreakdown[arch] = {
        count: data.count,
        avgDeckQuality: Math.round(data.totalQuality / data.count),
        avgQualityDelta: Math.round(data.totalDelta / data.count),
        avgPowerUtilization: Math.round(data.totalUtilization / data.count),
      };
    }
  }

  // Build card patterns
  const frequentCuts: CardCutPattern[] = [];
  const frequentInclusions: CardInclusionPattern[] = [];
  const surprisingInclusions: CardInclusionPattern[] = [];
  const surprisingCuts: CardCutPattern[] = [];

  for (const [cardName, data] of Object.entries(cardPickData)) {
    if (data.timesPicked < 10) continue; // Minimum sample size

    const avgElo = data.totalElo / data.timesPicked;
    const avgPickPosition = data.totalPickPosition / data.timesPicked;
    const cutRate = data.timesSideboarded / data.timesPicked;
    const inclusionRate = data.timesMainDecked / data.timesPicked;

    // Frequent cuts: picked often but cut often
    if (cutRate > 0.5) {
      frequentCuts.push({
        cardName,
        avgElo: Math.round(avgElo),
        avgPickPosition: Math.round(avgPickPosition * 10) / 10,
        timesPickedIn: data.timesPicked,
        timesMainDecked: data.timesMainDecked,
        timesSideboarded: data.timesSideboarded,
        cutRate: Math.round(cutRate * 100),
        primaryCutReason: avgElo > 1600 ? 'off-color or curve issues' : 'low power',
      });
    }

    // Frequent inclusions: rarely cut
    if (inclusionRate > 0.8) {
      const topArchetypes = Object.entries(data.archetypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([arch]) => arch);

      frequentInclusions.push({
        cardName,
        avgElo: Math.round(avgElo),
        avgPickPosition: Math.round(avgPickPosition * 10) / 10,
        timesPickedIn: data.timesPicked,
        timesMainDecked: data.timesMainDecked,
        inclusionRate: Math.round(inclusionRate * 100),
        primaryArchetypes: topArchetypes,
      });
    }

    // Surprising inclusions: low ELO but high inclusion
    if (avgElo < 1550 && inclusionRate > 0.7) {
      const topArchetypes = Object.entries(data.archetypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([arch]) => arch);

      surprisingInclusions.push({
        cardName,
        avgElo: Math.round(avgElo),
        avgPickPosition: Math.round(avgPickPosition * 10) / 10,
        timesPickedIn: data.timesPicked,
        timesMainDecked: data.timesMainDecked,
        inclusionRate: Math.round(inclusionRate * 100),
        primaryArchetypes: topArchetypes,
      });
    }

    // Surprising cuts: high ELO but often cut
    if (avgElo > 1700 && cutRate > 0.4) {
      surprisingCuts.push({
        cardName,
        avgElo: Math.round(avgElo),
        avgPickPosition: Math.round(avgPickPosition * 10) / 10,
        timesPickedIn: data.timesPicked,
        timesMainDecked: data.timesMainDecked,
        timesSideboarded: data.timesSideboarded,
        cutRate: Math.round(cutRate * 100),
        primaryCutReason: 'likely off-color',
      });
    }
  }

  // Sort patterns
  frequentCuts.sort((a, b) => b.cutRate - a.cutRate);
  frequentInclusions.sort((a, b) => b.inclusionRate - a.inclusionRate);
  surprisingInclusions.sort((a, b) => a.avgElo - b.avgElo);
  surprisingCuts.sort((a, b) => b.avgElo - a.avgElo);

  // Find outliers
  const outliers: DeckOutlier[] = [];

  // Sort by delta to find extremes
  const sortedByDelta = [...comparisons].sort((a, b) => a.qualityDelta - b.qualityDelta);

  // Low draft + high deck (bottom 5 by delta, positive deck quality)
  const topBuilders = sortedByDelta.slice(-10).filter(c => c.qualityDelta > 15);
  for (const comp of topBuilders.slice(0, 5)) {
    const draftIndex = Math.floor(comparisons.indexOf(comp) / 8);
    outliers.push({
      drafterId: comp.drafterId,
      seed: results[draftIndex]?.seed || 0,
      type: 'low_draft_high_deck',
      description: `Drafted average cards but built an excellent deck (delta: +${comp.qualityDelta})`,
      details: {
        draftQuality: comp.draftQuality,
        deckQuality: comp.deckQuality.overallScore,
        delta: comp.qualityDelta,
      },
    });
  }

  // High draft + low deck (top 5 by negative delta)
  const worstBuilders = sortedByDelta.slice(0, 10).filter(c => c.qualityDelta < -15);
  for (const comp of worstBuilders.slice(0, 5)) {
    const draftIndex = Math.floor(comparisons.indexOf(comp) / 8);
    outliers.push({
      drafterId: comp.drafterId,
      seed: results[draftIndex]?.seed || 0,
      type: 'high_draft_low_deck',
      description: `Drafted strong cards but built a weak deck (delta: ${comp.qualityDelta})`,
      details: {
        draftQuality: comp.draftQuality,
        deckQuality: comp.deckQuality.overallScore,
        delta: comp.qualityDelta,
      },
    });
  }

  return {
    totalDecks,
    avgDeckQuality: Math.round(totalDeckQuality / totalDecks),
    avgPoolPower: Math.round(totalPoolPower / totalDecks),
    avgPowerUtilization: Math.round(totalPowerUtilization / totalDecks),
    avgQualityDelta: Math.round(totalQualityDelta / totalDecks),
    builtWellCount,
    builtPoorlyCount,
    archetypeBreakdown,
    frequentCuts: frequentCuts.slice(0, 20),
    frequentInclusions: frequentInclusions.slice(0, 20),
    surprisingInclusions: surprisingInclusions.slice(0, 15),
    surprisingCuts: surprisingCuts.slice(0, 15),
    outliers,
  };
}

// ============================================
// Helper Functions
// ============================================

function calculateManaBaseQuality(deck: BuiltDeck): number {
  // Base score for having lands
  let score = 50;

  // Bonus for drafted lands vs basics
  const draftedLandBonus = Math.min(30, deck.draftedLandsUsed * 3);
  score += draftedLandBonus;

  // Penalty for too many basics
  const basicsPenalty = Math.max(0, (deck.basicsAdded - 10) * 2);
  score -= basicsPenalty;

  // Bonus for 2-color (easier mana)
  if (deck.colors.length === 2) score += 10;
  if (deck.colors.length === 1) score += 15;

  // Penalty for 4+ colors
  if (deck.colors.length >= 4) score -= 15;

  return Math.min(100, Math.max(0, score));
}

function calculateCurveQuality(curve: number[], archetype: string | null): number {
  let score = 50;

  // Check for plays at key CMCs
  if (curve[1] >= 2) score += 10;  // 1-drops
  if (curve[2] >= 4) score += 15;  // 2-drops are critical
  if (curve[3] >= 3) score += 10;  // 3-drops
  if (curve[4] >= 2) score += 5;   // 4-drops

  // Penalty for too many expensive cards
  const expensiveCount = curve[5] + curve[6] + curve[7];
  if (expensiveCount > 5) score -= (expensiveCount - 5) * 5;

  // Aggro wants lower curve
  if (archetype === 'aggro') {
    if (curve[1] >= 4) score += 10;
    if (expensiveCount > 3) score -= 10;
  }

  // Control can have higher curve
  if (archetype === 'control') {
    if (expensiveCount > 3) score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

function calculateWinConditionScore(cards: CubeCard[], archetype: string | null): number {
  let score = 30;

  // Count potential win conditions
  for (const card of cards) {
    const text = card.oracle_text?.toLowerCase() || '';
    const type = card.type_line?.toLowerCase() || '';
    const cmc = card.cmc || 0;

    // Big creatures
    if (type.includes('creature') && cmc >= 5) score += 10;

    // Planeswalkers
    if (type.includes('planeswalker')) score += 15;

    // Combo pieces (archetype-specific)
    if (archetype === 'storm' && (text.includes('storm') || card.name.includes('Tendrils'))) {
      score += 25;
    }
    if (archetype === 'reanimator' && cmc >= 7 && type.includes('creature')) {
      score += 15;
    }
    if (archetype === 'doomsday' && card.name.includes('Oracle')) {
      score += 30;
    }
  }

  return Math.min(100, score);
}

function calculateSynergyDensity(cards: CubeCard[], archetype: string | null): number {
  let score = 40;

  // Count cards with synergy keywords
  for (const card of cards) {
    const text = card.oracle_text?.toLowerCase() || '';

    // Generic synergy indicators
    if (text.includes('whenever')) score += 2;
    if (text.includes('if you control')) score += 3;
    if (text.includes('each') && text.includes('you control')) score += 2;

    // Archetype-specific synergies
    if (archetype === 'artifacts' && text.includes('artifact')) score += 3;
    if (archetype === 'reanimator' && text.includes('graveyard')) score += 3;
    if (archetype === 'storm' && (text.includes('draw') || text.includes('add'))) score += 2;
  }

  return Math.min(100, score);
}
