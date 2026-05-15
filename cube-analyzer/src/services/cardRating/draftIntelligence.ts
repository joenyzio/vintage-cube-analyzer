/**
 * Draft Intelligence System
 *
 * Advanced draft analysis that goes beyond simple card ratings.
 * Implements "card counting" logic - using visible information to make
 * probabilistic inferences about the draft state.
 *
 * Key concepts:
 * 1. Wheel Prediction - What cards will come back based on pack contents + sim data
 * 2. Opponent Modeling - What are neighbors drafting based on signals
 * 3. Synergy Scoring - Card-to-card synergies beyond archetype fit
 * 4. Path Planning - Optimal draft path given current pool
 * 5. Win Probability - Expected win rate impact of each pick
 */

import type { CubeCard } from '../../types/card';
import { getEloData } from '../eloHelpers';
import { getWheelRate } from '../simulationInsights';
import { VINTAGE_CUBE_ARCHETYPES } from './archetypes';

// ============================================
// Types
// ============================================

export interface WheelPrediction {
  cardName: string;
  wheelProbability: number;  // 0-1 chance it comes back
  reasons: string[];
}

export interface OpponentModel {
  position: number;  // 1-7 (relative to you)
  likelyColors: string[];
  confidence: number;  // 0-1
  signals: string[];  // Cards that informed this
}

export interface CardSynergy {
  card1: string;
  card2: string;
  synergyScore: number;  // 0-1, how much better they are together
  synergyType: 'combo' | 'enabler-payoff' | 'curve' | 'color' | 'archetype';
  description: string;
}

export interface DraftPath {
  archetype: string;
  probability: number;  // How likely this path succeeds
  keyCardsNeeded: string[];
  keyCardsOwned: string[];
  expectedElo: number;
  recommendation: string;
}

export interface PickAnalysis {
  cardName: string;
  immediateValue: number;  // Raw power
  synergyValue: number;  // How well it fits current pool
  futureValue: number;  // How much it opens up options
  wheelRisk: number;  // Risk of not seeing it again if passed
  winProbabilityDelta: number;  // Expected change in win %
  overallScore: number;  // Weighted combination
  recommendation: string;
}

export interface DraftIntelligence {
  wheelPredictions: WheelPrediction[];
  opponentModels: OpponentModel[];
  topSynergies: CardSynergy[];
  viablePaths: DraftPath[];
  pickAnalysis: PickAnalysis[];
  strategicAdvice: string[];
}

// ============================================
// Card Synergies Database
// ============================================

const SYNERGY_PAIRS: { cards: [string, string]; score: number; type: CardSynergy['synergyType']; desc: string }[] = [
  // Reanimator combos
  { cards: ['Entomb', 'Reanimate'], score: 0.95, type: 'combo', desc: 'Turn 1-2 Griselbrand' },
  { cards: ['Entomb', 'Animate Dead'], score: 0.9, type: 'combo', desc: 'Classic reanimation' },
  { cards: ['Reanimate', 'Griselbrand'], score: 0.9, type: 'enabler-payoff', desc: 'Best target' },
  { cards: ['Animate Dead', 'Griselbrand'], score: 0.85, type: 'enabler-payoff', desc: 'Premium target' },
  { cards: ['Faithless Looting', 'Reanimate'], score: 0.7, type: 'enabler-payoff', desc: 'Discard + reanimate' },

  // Storm combos
  { cards: ['Dark Ritual', 'Tendrils of Agony'], score: 0.9, type: 'combo', desc: 'Storm fuel + payoff' },
  { cards: ["Yawgmoth's Will", 'Dark Ritual'], score: 0.95, type: 'combo', desc: 'Replay rituals' },
  { cards: ["Lion's Eye Diamond", "Yawgmoth's Will"], score: 0.95, type: 'combo', desc: 'LED + Will = win' },
  { cards: ['Brain Freeze', 'Wheel of Fortune'], score: 0.8, type: 'combo', desc: 'Draw 7 + storm' },

  // Sneak combos
  { cards: ['Sneak Attack', 'Emrakul, the Aeons Torn'], score: 0.95, type: 'enabler-payoff', desc: 'Annihilator 6' },
  { cards: ['Show and Tell', 'Omniscience'], score: 0.9, type: 'combo', desc: 'Free spells' },
  { cards: ['Through the Breach', 'Griselbrand'], score: 0.9, type: 'enabler-payoff', desc: 'Draw 14' },

  // Artifact combos
  { cards: ['Tinker', 'Blightsteel Colossus'], score: 0.95, type: 'enabler-payoff', desc: 'Turn 2 win' },
  { cards: ['Goblin Welder', 'Myr Battlesphere'], score: 0.85, type: 'enabler-payoff', desc: 'Recurring value' },
  { cards: ['Time Vault', 'Voltaic Key'], score: 1.0, type: 'combo', desc: 'Infinite turns' },
  { cards: ['Tolarian Academy', 'Mox Diamond'], score: 0.7, type: 'enabler-payoff', desc: 'Fast mana' },

  // Tempo synergies
  { cards: ['Daze', 'True-Name Nemesis'], score: 0.8, type: 'archetype', desc: 'Protect the clock' },
  { cards: ['Spell Pierce', 'Ragavan, Nimble Pilferer'], score: 0.75, type: 'archetype', desc: 'Protect threat' },
  { cards: ['Snapcaster Mage', 'Lightning Bolt'], score: 0.7, type: 'archetype', desc: 'Flashback value' },

  // Ramp synergies
  { cards: ['Channel', 'Emrakul, the Aeons Torn'], score: 0.95, type: 'combo', desc: 'Turn 1-2 Emrakul' },
  { cards: ['Natural Order', 'Craterhoof Behemoth'], score: 0.9, type: 'enabler-payoff', desc: 'Instant win' },
  { cards: ['Rofellos, Llanowar Emissary', 'Craterhoof Behemoth'], score: 0.75, type: 'enabler-payoff', desc: 'Ramp to hoof' },

  // Control synergies
  { cards: ['Force of Will', 'Jace, the Mind Sculptor'], score: 0.7, type: 'archetype', desc: 'Protect Jace' },
  { cards: ['Mana Drain', 'Karn, Scion of Urza'], score: 0.65, type: 'curve', desc: 'Drain into threat' },

  // Midrange value
  { cards: ['Dark Confidant', 'Thoughtseize'], score: 0.75, type: 'archetype', desc: 'Disrupt + draw' },
  { cards: ['Liliana of the Veil', 'Tarmogoyf'], score: 0.7, type: 'archetype', desc: 'Classic midrange' },
  { cards: ['Oko, Thief of Crowns', 'Uro, Titan of Nature\'s Wrath'], score: 0.8, type: 'archetype', desc: 'Sultai value' },
];

// ============================================
// Wheel Prediction
// ============================================

/**
 * Predict which cards in the pack will wheel back to you.
 * Uses simulation wheel rates + pack composition analysis.
 */
export function predictWheels(
  pack: CubeCard[],
  _pickNumber: number,
  numPlayers: number = 8
): WheelPrediction[] {
  const predictions: WheelPrediction[] = [];

  // Cards wheel if they survive (15 - pickNumber) picks
  // In 8-player draft, you see pack again after 7 other players pick
  const picksUntilWheel = numPlayers - 1;
  const cardsAfterWheel = pack.length - picksUntilWheel;

  if (cardsAfterWheel <= 0) {
    // Pack won't wheel back
    return pack.map(card => ({
      cardName: card.name,
      wheelProbability: 0,
      reasons: ['Pack exhausted before wheel'],
    }));
  }

  for (const card of pack) {
    const reasons: string[] = [];

    // Get simulation wheel rate
    const simWheelRate = getWheelRate(card.name);
    const baseWheelProb = simWheelRate !== null ? simWheelRate / 100 : 0.3;

    // Get card ELO
    const elo = getEloData(card.name)?.elo ?? 1650;

    // Adjust based on ELO (lower ELO = more likely to wheel)
    let wheelProb = baseWheelProb;

    if (elo < 1500) {
      wheelProb = Math.min(0.95, wheelProb * 1.5);
      reasons.push('Low power - often passed');
    } else if (elo > 1800) {
      wheelProb = Math.max(0.05, wheelProb * 0.3);
      reasons.push('High power - rarely wheels');
    }

    // Adjust based on color (niche colors wheel more)
    const colors = card.color_identity || [];
    if (colors.length >= 3) {
      wheelProb = Math.min(0.9, wheelProb * 1.3);
      reasons.push('3+ colors - harder to splash');
    }

    // Adjust based on archetype specificity
    for (const arch of VINTAGE_CUBE_ARCHETYPES) {
      if (arch.keyCards.includes(card.name)) {
        // Key cards for specific archetypes often wheel if that archetype isn't being drafted
        wheelProb = Math.min(0.85, wheelProb * 1.2);
        reasons.push(`${arch.shortName} key card - may wheel if not contested`);
        break;
      }
    }

    // If we have simulation data, weight it heavily
    if (simWheelRate !== null) {
      if (simWheelRate > 70) {
        reasons.push(`${Math.round(simWheelRate)}% wheel rate in sims`);
      } else if (simWheelRate < 10) {
        reasons.push(`Only ${Math.round(simWheelRate)}% wheel rate`);
      }
    }

    predictions.push({
      cardName: card.name,
      wheelProbability: Math.max(0, Math.min(1, wheelProb)),
      reasons,
    });
  }

  return predictions.sort((a, b) => b.wheelProbability - a.wheelProbability);
}

// ============================================
// Opponent Modeling
// ============================================

/**
 * Model what opponents are likely drafting based on signals.
 * Signals = late cards of specific colors/archetypes being passed to you.
 */
export function modelOpponents(
  passedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>,
  _pickHistory: CubeCard[]
): OpponentModel[] {
  const models: OpponentModel[] = [];

  // Analyze passed cards by pack
  const packSignals: Map<number, { colors: Record<string, number>; signals: string[] }> = new Map();

  for (const [cardName, info] of passedCards) {
    const packNum = info.packNumber;
    if (!packSignals.has(packNum)) {
      packSignals.set(packNum, { colors: {}, signals: [] });
    }

    const packData = packSignals.get(packNum)!;
    const card = info.card;

    // Late high-quality cards are signals
    const elo = getEloData(cardName)?.elo ?? 1650;
    if (info.passedAtPick >= 6 && elo > 1700) {
      // Good card passed late = those colors might be open
      for (const color of card.color_identity || []) {
        packData.colors[color] = (packData.colors[color] || 0) + 1;
      }
      packData.signals.push(`${cardName} (pick ${info.passedAtPick})`);
    }
  }

  // Pack 1 = right neighbor passes to you
  // Pack 2 = left neighbor passes to you
  // Pack 3 = right neighbor passes to you

  for (const [packNum, data] of packSignals) {
    const position = packNum % 2 === 1 ? 1 : 7; // Right or left
    const colorEntries = Object.entries(data.colors);

    if (colorEntries.length > 0) {
      // Colors NOT being passed are what opponent is in
      const allColors = ['W', 'U', 'B', 'R', 'G'];
      const passedColors = colorEntries.map(([c]) => c);
      const likelyOpponentColors = allColors.filter(c => !passedColors.includes(c));

      if (likelyOpponentColors.length > 0 && likelyOpponentColors.length <= 3) {
        models.push({
          position,
          likelyColors: likelyOpponentColors,
          confidence: Math.min(0.9, data.signals.length * 0.15),
          signals: data.signals,
        });
      }
    }
  }

  return models;
}

// ============================================
// Synergy Scoring
// ============================================

/**
 * Find synergies between cards in the pool.
 */
export function findSynergies(pool: CubeCard[]): CardSynergy[] {
  const synergies: CardSynergy[] = [];
  const poolNames = new Set(pool.map(c => c.name));

  for (const syn of SYNERGY_PAIRS) {
    const [card1, card2] = syn.cards;

    if (poolNames.has(card1) && poolNames.has(card2)) {
      synergies.push({
        card1,
        card2,
        synergyScore: syn.score,
        synergyType: syn.type,
        description: syn.desc,
      });
    }
  }

  return synergies.sort((a, b) => b.synergyScore - a.synergyScore);
}

/**
 * Calculate synergy bonus for a card with the current pool.
 */
export function calculateSynergyBonus(card: CubeCard, pool: CubeCard[]): number {
  let bonus = 0;
  const poolNames = new Set(pool.map(c => c.name));

  for (const syn of SYNERGY_PAIRS) {
    const [card1, card2] = syn.cards;

    if (card.name === card1 && poolNames.has(card2)) {
      bonus += syn.score * 150; // Scale to ELO-like points
    } else if (card.name === card2 && poolNames.has(card1)) {
      bonus += syn.score * 150;
    }
  }

  return bonus;
}

// ============================================
// Draft Path Planning
// ============================================

/**
 * Analyze viable draft paths from current pool.
 */
export function analyzeViablePaths(
  pool: CubeCard[],
  colorCounts: Record<string, number>
): DraftPath[] {
  const paths: DraftPath[] = [];

  for (const arch of VINTAGE_CUBE_ARCHETYPES) {
    // Check how many key cards we have
    const keyCardsOwned = pool.filter(c => arch.keyCards.includes(c.name)).map(c => c.name);
    const signalCardsOwned = pool.filter(c => arch.signalCards.includes(c.name)).map(c => c.name);
    const keyCardsMissing = arch.keyCards.filter(c => !keyCardsOwned.includes(c));

    // Calculate probability based on cards owned
    let probability = 0;

    if (keyCardsOwned.length >= 2) {
      probability = 0.8;
    } else if (keyCardsOwned.length === 1) {
      probability = 0.5;
    } else if (signalCardsOwned.length >= 3) {
      probability = 0.4;
    } else if (signalCardsOwned.length >= 1) {
      probability = 0.2;
    }

    // Adjust for color match
    const hasColors = arch.primaryColors.every(c => (colorCounts[c] || 0) >= 1);
    if (hasColors) {
      probability = Math.min(1, probability * 1.3);
    } else if (arch.primaryColors.length > 0) {
      probability *= 0.6;
    }

    // Only show viable paths
    if (probability >= 0.2) {
      paths.push({
        archetype: arch.name,
        probability,
        keyCardsNeeded: keyCardsMissing.slice(0, 3),
        keyCardsOwned,
        expectedElo: 1850 + (probability * 100), // Rough estimate
        recommendation: probability >= 0.6
          ? `Strong ${arch.name} potential - commit`
          : probability >= 0.4
          ? `${arch.name} possible - stay open`
          : `${arch.name} speculative - need key cards`,
      });
    }
  }

  return paths.sort((a, b) => b.probability - a.probability);
}

// ============================================
// Complete Pick Analysis
// ============================================

/**
 * Comprehensive analysis of each card in a pack.
 */
export function analyzePackComplete(
  pack: CubeCard[],
  pool: CubeCard[],
  pickNumber: number,
  colorCounts: Record<string, number>
): PickAnalysis[] {
  const wheelPredictions = predictWheels(pack, pickNumber);
  const viablePaths = analyzeViablePaths(pool, colorCounts);
  const topPath = viablePaths[0];

  const analyses: PickAnalysis[] = [];

  for (const card of pack) {
    const elo = getEloData(card.name)?.elo ?? 1650;
    const wheelPred = wheelPredictions.find(w => w.cardName === card.name);
    const synergyBonus = calculateSynergyBonus(card, pool);

    // Immediate value = raw ELO
    const immediateValue = elo;

    // Synergy value = how well it fits current pool
    const synergyValue = synergyBonus;

    // Future value = how much it opens options
    let futureValue = 0;
    for (const path of viablePaths) {
      const arch = VINTAGE_CUBE_ARCHETYPES.find(a => a.name === path.archetype);
      if (arch?.keyCards.includes(card.name)) {
        futureValue += 100 * path.probability;
      } else if (arch?.signalCards.includes(card.name)) {
        futureValue += 50 * path.probability;
      }
    }

    // Wheel risk = inverse of wheel probability
    const wheelRisk = wheelPred ? (1 - wheelPred.wheelProbability) * 100 : 50;

    // Win probability delta (simplified model)
    // High ELO + synergy + fits path = bigger impact
    const winProbabilityDelta = (
      (elo - 1650) / 50 +  // ELO contribution
      synergyBonus / 50 +  // Synergy contribution
      futureValue / 100    // Path contribution
    );

    // Overall score
    const overallScore = immediateValue + synergyValue + futureValue + (wheelRisk * 0.5);

    // Generate recommendation
    let recommendation = '';
    if (synergyBonus > 100) {
      recommendation = `Strong synergy with your pool (+${Math.round(synergyBonus)} ELO)`;
    } else if (wheelPred && wheelPred.wheelProbability > 0.7) {
      recommendation = `Likely to wheel (${Math.round(wheelPred.wheelProbability * 100)}%) - can pass`;
    } else if (wheelPred && wheelPred.wheelProbability < 0.1) {
      recommendation = `Won't wheel - take now if you want it`;
    } else if (topPath && VINTAGE_CUBE_ARCHETYPES.find(a => a.name === topPath.archetype)?.keyCards.includes(card.name)) {
      recommendation = `Key card for ${topPath.archetype} path`;
    } else if (elo > 1800) {
      recommendation = `High power - always playable`;
    }

    analyses.push({
      cardName: card.name,
      immediateValue,
      synergyValue,
      futureValue,
      wheelRisk,
      winProbabilityDelta,
      overallScore,
      recommendation,
    });
  }

  return analyses.sort((a, b) => b.overallScore - a.overallScore);
}

// ============================================
// Strategic Advice Generator
// ============================================

/**
 * Generate high-level strategic advice based on draft state.
 */
export function generateStrategicAdvice(
  pool: CubeCard[],
  _packNumber: number,
  _pickNumber: number,
  colorCounts: Record<string, number>,
  opponentModels: OpponentModel[]
): string[] {
  const advice: string[] = [];
  const totalPicks = pool.length;
  const viablePaths = analyzeViablePaths(pool, colorCounts);

  // Early draft advice
  if (totalPicks < 5) {
    advice.push('Stay flexible - prioritize raw power over synergy');
    if (Object.values(colorCounts).filter(c => c >= 2).length > 2) {
      advice.push('Spreading too thin - start focusing on 2-3 colors');
    }
  }

  // Mid-draft advice
  if (totalPicks >= 5 && totalPicks < 15) {
    const topPath = viablePaths[0];
    if (topPath && topPath.probability >= 0.6) {
      advice.push(`Commit to ${topPath.archetype} - look for: ${topPath.keyCardsNeeded.slice(0, 2).join(', ')}`);
    } else if (viablePaths.length >= 3) {
      advice.push('Multiple paths viable - key cards will decide');
    }
  }

  // Late draft advice
  if (totalPicks >= 15) {
    const synergies = findSynergies(pool);
    if (synergies.length >= 2) {
      advice.push(`Strong synergies: ${synergies.slice(0, 2).map(s => s.description).join(', ')}`);
    }

    // Deck composition check
    const creatures = pool.filter(c => c.type_line?.includes('Creature')).length;
    if (creatures < 8) {
      advice.push('Low creature count - prioritize threats');
    }
  }

  // Opponent-based advice
  if (opponentModels.length > 0) {
    const rightNeighbor = opponentModels.find(m => m.position === 1);
    if (rightNeighbor && rightNeighbor.confidence > 0.5) {
      const colors = rightNeighbor.likelyColors.join('');
      advice.push(`Right neighbor likely in ${colors} - those colors contested`);
    }
  }

  return advice;
}

// ============================================
// Cube Depletion Tracking
// ============================================

export interface CubeDepletionState {
  cardsSeen: Set<string>;
  cardsRemaining: number;
  colorDepletion: Record<string, { seen: number; estimated: number; depletion: number }>;
  archetypeDepletion: Record<string, { keyCardsSeen: number; totalKeyCards: number; availability: number }>;
}

/**
 * Track what's been depleted from the cube based on cards seen.
 * 360 card cube - tracking what you've seen tells you what's left.
 */
export function trackCubeDepletion(
  seenCards: Set<string>,
  allCards: CubeCard[]
): CubeDepletionState {
  const cardsSeen = seenCards;
  const cardsRemaining = 360 - cardsSeen.size;

  // Estimate color depletion
  // Rough estimates: ~70 cards per color in a balanced cube
  const colorDepletion: Record<string, { seen: number; estimated: number; depletion: number }> = {};
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  for (const card of allCards) {
    if (seenCards.has(card.name)) {
      for (const color of card.color_identity || []) {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      }
    }
  }

  for (const color of ['W', 'U', 'B', 'R', 'G']) {
    const seen = colorCounts[color] || 0;
    const estimated = 70; // ~70 cards per color
    colorDepletion[color] = {
      seen,
      estimated,
      depletion: seen / estimated,
    };
  }

  // Track archetype key card depletion
  const archetypeDepletion: Record<string, { keyCardsSeen: number; totalKeyCards: number; availability: number }> = {};

  for (const arch of VINTAGE_CUBE_ARCHETYPES) {
    let keyCardsSeen = 0;
    for (const keyCard of arch.keyCards) {
      if (seenCards.has(keyCard)) {
        keyCardsSeen++;
      }
    }
    archetypeDepletion[arch.id] = {
      keyCardsSeen,
      totalKeyCards: arch.keyCards.length,
      availability: 1 - (keyCardsSeen / arch.keyCards.length),
    };
  }

  return { cardsSeen, cardsRemaining, colorDepletion, archetypeDepletion };
}

// ============================================
// Signal Strength Quantification
// ============================================

export interface SignalStrength {
  archetypeId: string;
  openness: number;  // 0-1, how open this archetype is
  confidence: number;  // 0-1, how confident we are
  signals: string[];  // Evidence
}

/**
 * Quantify how "open" each archetype is based on signals.
 * Returns openness scores from 0 (heavily contested) to 1 (wide open).
 */
export function quantifySignals(
  passedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>,
  seenCards: Set<string>,
  _pickNumber: number
): SignalStrength[] {
  const signals: SignalStrength[] = [];

  for (const arch of VINTAGE_CUBE_ARCHETYPES) {
    let signalScore = 0.5; // Start neutral
    let confidence = 0;
    const evidence: string[] = [];

    // Check for late key/signal cards being passed
    for (const [cardName, info] of passedCards) {
      const isKeyCard = arch.keyCards.includes(cardName);
      const isSignalCard = arch.signalCards.includes(cardName);

      if (isKeyCard || isSignalCard) {
        // Late picks of archetype cards = archetype is open
        if (info.passedAtPick >= 5) {
          const bonus = isKeyCard ? 0.15 : 0.08;
          signalScore += bonus;
          confidence += 0.1;
          evidence.push(`${cardName} passed pick ${info.passedAtPick}`);
        }
      }
    }

    // Check cube depletion for this archetype
    let keyCardsSeen = 0;
    for (const keyCard of arch.keyCards) {
      if (seenCards.has(keyCard)) {
        keyCardsSeen++;
      }
    }

    // If we've seen most key cards already picked, archetype is contested
    if (keyCardsSeen >= arch.keyCards.length * 0.5) {
      signalScore -= 0.2;
      evidence.push(`${keyCardsSeen}/${arch.keyCards.length} key cards already seen`);
    }

    // Normalize
    signalScore = Math.max(0, Math.min(1, signalScore));
    confidence = Math.min(1, confidence);

    // Only report if we have some confidence
    if (confidence > 0.1 || keyCardsSeen > 0) {
      signals.push({
        archetypeId: arch.id,
        openness: signalScore,
        confidence,
        signals: evidence,
      });
    }
  }

  return signals.sort((a, b) => b.openness - a.openness);
}

// ============================================
// Pick Regret Prediction
// ============================================

export interface RegretPrediction {
  cardName: string;
  regretProbability: number;  // 0-1, chance you'll regret passing
  regretReason: string;
}

/**
 * Predict how likely you are to regret passing a card.
 * Based on: wheel probability, card power, synergy potential, scarcity.
 */
export function predictRegret(
  card: CubeCard,
  pool: CubeCard[],
  _seenCards: Set<string>,
  _pickNumber: number
): RegretPrediction {
  const elo = getEloData(card.name)?.elo ?? 1650;
  const wheelRate = getWheelRate(card.name);
  const wheelProb = wheelRate !== null ? wheelRate / 100 : 0.3;

  let regretProb = 0;
  let reason = '';

  // High power cards you'll regret passing
  if (elo >= 1850) {
    regretProb = 0.9 * (1 - wheelProb);
    reason = 'High power - unlikely to see better';
  }
  // Cards that synergize with your pool
  else if (calculateSynergyBonus(card, pool) >= 100) {
    regretProb = 0.8 * (1 - wheelProb);
    reason = 'Strong synergy with your pool';
  }
  // Key cards for your archetype path
  else {
    const paths = analyzeViablePaths(pool, {});
    const topPath = paths[0];
    if (topPath) {
      const arch = VINTAGE_CUBE_ARCHETYPES.find(a => a.name === topPath.archetype);
      if (arch?.keyCards.includes(card.name)) {
        regretProb = 0.85 * (1 - wheelProb);
        reason = `Key card for ${topPath.archetype}`;
      }
    }
  }

  // Scarcity factor - if most copies of similar effect are gone, regret increases
  // (simplified - would need better card categorization)

  // Won't wheel = high regret
  if (wheelProb < 0.1 && elo > 1700) {
    regretProb = Math.max(regretProb, 0.7);
    reason = reason || "Won't wheel and solid card";
  }

  return {
    cardName: card.name,
    regretProbability: Math.max(0, Math.min(1, regretProb)),
    regretReason: reason || 'Replaceable',
  };
}

// ============================================
// Final Deck Projection
// ============================================

export interface DeckProjection {
  projectedArchetype: string;
  confidence: number;
  estimatedElo: number;
  composition: {
    creatures: number;
    spells: number;
    lands: number;
    avgCmc: number;
  };
  strengths: string[];
  weaknesses: string[];
  cardsNeeded: string[];  // What you should prioritize
}

/**
 * Project what your final 40-card deck will look like.
 */
export function projectFinalDeck(
  pool: CubeCard[],
  colorCounts: Record<string, number>,
  _pickNumber: number
): DeckProjection {
  const paths = analyzeViablePaths(pool, colorCounts);
  const topPath = paths[0];
  const synergies = findSynergies(pool);

  // Count current composition
  let creatures = 0;
  let spells = 0;
  let lands = 0;
  let totalCmc = 0;
  let removal = 0;
  let cardDraw = 0;

  for (const card of pool) {
    const type = card.type_line?.toLowerCase() || '';
    const text = card.oracle_text?.toLowerCase() || '';

    if (type.includes('land')) {
      lands++;
    } else {
      if (type.includes('creature')) creatures++;
      else spells++;
      totalCmc += card.cmc ?? 0;

      if (text.includes('destroy') || text.includes('exile target') ||
          text.includes('deals') && text.includes('damage')) {
        removal++;
      }
      if (text.includes('draw')) cardDraw++;
    }
  }

  const nonLands = pool.length - lands;
  const avgCmc = nonLands > 0 ? totalCmc / nonLands : 0;

  // Calculate picks remaining (45 total in 8-player draft)
  const totalPicks = 45;
  const picksRemaining = totalPicks - pool.length;

  // Project final counts (assuming ~23 spells, 17 lands)
  const projectedCreatures = Math.round(creatures + (picksRemaining * (creatures / Math.max(1, nonLands))));
  const projectedSpells = Math.round(spells + (picksRemaining * (spells / Math.max(1, nonLands))));

  // Identify strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const cardsNeeded: string[] = [];

  if (synergies.length >= 2) {
    strengths.push(`${synergies.length} active synergies`);
  }
  if (removal >= 3) {
    strengths.push('Good removal suite');
  } else if (removal < 2 && pool.length >= 15) {
    weaknesses.push('Light on removal');
    cardsNeeded.push('Removal spells');
  }

  if (cardDraw >= 3) {
    strengths.push('Strong card advantage');
  } else if (cardDraw < 2 && pool.length >= 15) {
    weaknesses.push('Needs card draw');
    cardsNeeded.push('Card draw');
  }

  if (creatures < 6 && pool.length >= 15) {
    weaknesses.push('Low creature count');
    cardsNeeded.push('Creatures/Threats');
  }

  if (avgCmc > 3.5 && pool.length >= 10) {
    weaknesses.push('Curve is high');
    cardsNeeded.push('2-drops');
  }

  // Estimate final ELO
  const baseElo = topPath ? topPath.expectedElo : 1850;
  const synergyBonus = synergies.length * 15;
  const estimatedElo = Math.round(baseElo + synergyBonus);

  return {
    projectedArchetype: topPath?.archetype || 'Undetermined',
    confidence: topPath?.probability || 0.3,
    estimatedElo,
    composition: {
      creatures: projectedCreatures,
      spells: projectedSpells,
      lands: 17,
      avgCmc: Math.round(avgCmc * 10) / 10,
    },
    strengths,
    weaknesses,
    cardsNeeded,
  };
}

// ============================================
// Multi-Pick Lookahead
// ============================================

export interface PickSequence {
  pick1: string;
  likelyWheel: string[];
  pick2Candidates: string[];
  expectedPoolElo: number;
  narrative: string;
}

/**
 * Look ahead to plan multiple picks.
 * "If you take X, Y and Z likely wheel, then you take Y next."
 */
export function planPickSequence(
  pack: CubeCard[],
  pool: CubeCard[],
  topPick: CubeCard
): PickSequence {
  const wheelPredictions = predictWheels(pack, pool.length);

  // Find cards likely to wheel (>50% probability)
  const likelyWheels = wheelPredictions
    .filter(w => w.wheelProbability >= 0.5 && w.cardName !== topPick.name)
    .slice(0, 3)
    .map(w => w.cardName);

  // Simulate taking the top pick
  const newPool = [...pool, topPick];

  // Find best pick 2 candidates from what wheels
  const pick2Candidates: string[] = [];
  for (const wheelCard of likelyWheels) {
    const card = pack.find(c => c.name === wheelCard);
    if (card) {
      const synergy = calculateSynergyBonus(card, newPool);
      if (synergy > 0 || (getEloData(wheelCard)?.elo ?? 0) > 1700) {
        pick2Candidates.push(wheelCard);
      }
    }
  }

  // Calculate expected pool ELO after sequence
  const topPickElo = getEloData(topPick.name)?.elo ?? 1650;
  const poolElo = pool.reduce((sum, c) => sum + (getEloData(c.name)?.elo ?? 1650), 0);
  const avgElo = pool.length > 0 ? poolElo / pool.length : 1650;
  const expectedPoolElo = Math.round((avgElo * pool.length + topPickElo) / (pool.length + 1));

  // Generate narrative
  let narrative = `Take ${topPick.name}`;
  if (likelyWheels.length > 0) {
    narrative += `. ${likelyWheels.slice(0, 2).join(' and ')} should wheel`;
    if (pick2Candidates.length > 0) {
      narrative += `, then grab ${pick2Candidates[0]}`;
    }
  }
  narrative += '.';

  return {
    pick1: topPick.name,
    likelyWheel: likelyWheels,
    pick2Candidates,
    expectedPoolElo,
    narrative,
  };
}

// ============================================
// Main Intelligence Function
// ============================================

/**
 * Generate complete draft intelligence for a pack.
 */
export function generateDraftIntelligence(
  pack: CubeCard[],
  pool: CubeCard[],
  passedCards: Map<string, { card: CubeCard; passedAtPick: number; packNumber: number }>,
  packNumber: number,
  pickNumber: number,
  colorCounts: Record<string, number>,
  seenCards: Set<string> = new Set(),
  allCards: CubeCard[] = []
): DraftIntelligence & {
  cubeDepletion: CubeDepletionState | null;
  signalStrengths: SignalStrength[];
  deckProjection: DeckProjection;
  pickSequence: PickSequence | null;
} {
  const wheelPredictions = predictWheels(pack, pickNumber);
  const opponentModels = modelOpponents(passedCards, pool);
  const topSynergies = findSynergies(pool);
  const viablePaths = analyzeViablePaths(pool, colorCounts);
  const pickAnalysis = analyzePackComplete(pack, pool, pickNumber, colorCounts);
  const strategicAdvice = generateStrategicAdvice(pool, packNumber, pickNumber, colorCounts, opponentModels);

  // New intelligence
  const cubeDepletion = allCards.length > 0 ? trackCubeDepletion(seenCards, allCards) : null;
  const signalStrengths = quantifySignals(passedCards, seenCards, pickNumber);
  const deckProjection = projectFinalDeck(pool, colorCounts, pickNumber);

  // Pick sequence lookahead
  const topPick = pack.find(c => c.name === pickAnalysis[0]?.cardName);
  const pickSequence = topPick ? planPickSequence(pack, pool, topPick) : null;

  return {
    wheelPredictions,
    opponentModels,
    topSynergies,
    viablePaths,
    pickAnalysis,
    strategicAdvice,
    cubeDepletion,
    signalStrengths,
    deckProjection,
    pickSequence,
  };
}
