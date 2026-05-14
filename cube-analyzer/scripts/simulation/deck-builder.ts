/**
 * Deck Builder
 *
 * Converts a 45-card drafted pool into a 40-card deck.
 * Uses two-pass algorithm for color determination and spell selection.
 */

import type { CubeCard } from '../../src/types/card';
import type { DraftContext } from '../../src/services/cardRating/types';
import type { BuiltDeck } from './types';
import { rateCard } from '../../src/services/cardRating';

const MAIN_DECK_SIZE = 40;
const LAND_COUNT = 17;
const SPELL_COUNT = 23;
const COLORS = ['W', 'U', 'B', 'R', 'G'];

// ============================================
// Color Pip Counting
// ============================================

interface PipCounts {
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  colorless: number;
}

function countColorPips(card: CubeCard): PipCounts {
  const pips: PipCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, colorless: 0 };
  const manaCost = card.mana_cost || '';

  // Count each pip in the mana cost
  // Format: {W}, {U}, {B}, {R}, {G}, {1}, {2}, etc.
  const matches = manaCost.match(/\{([^}]+)\}/g) || [];

  for (const match of matches) {
    const symbol = match.slice(1, -1);  // Remove braces

    if (symbol === 'W') pips.W++;
    else if (symbol === 'U') pips.U++;
    else if (symbol === 'B') pips.B++;
    else if (symbol === 'R') pips.R++;
    else if (symbol === 'G') pips.G++;
    // Hybrid mana (e.g., W/U, 2/W)
    else if (symbol.includes('/')) {
      const parts = symbol.split('/');
      for (const part of parts) {
        if (part === 'W') pips.W++;
        else if (part === 'U') pips.U++;
        else if (part === 'B') pips.B++;
        else if (part === 'R') pips.R++;
        else if (part === 'G') pips.G++;
      }
    }
    // Phyrexian mana (e.g., W/P, U/P)
    else if (symbol.includes('P')) {
      const colorPart = symbol.replace('/P', '').replace('P', '');
      if (colorPart === 'W') pips.W++;
      else if (colorPart === 'U') pips.U++;
      else if (colorPart === 'B') pips.B++;
      else if (colorPart === 'R') pips.R++;
      else if (colorPart === 'G') pips.G++;
    }
  }

  return pips;
}

function sumPips(pipsList: PipCounts[]): PipCounts {
  const total: PipCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, colorless: 0 };
  for (const pips of pipsList) {
    total.W += pips.W;
    total.U += pips.U;
    total.B += pips.B;
    total.R += pips.R;
    total.G += pips.G;
  }
  return total;
}

// ============================================
// Card Classification
// ============================================

function isLand(card: CubeCard): boolean {
  return card.type_line?.toLowerCase().includes('land') ?? false;
}

function isBasicLand(card: CubeCard): boolean {
  return card.type_line?.toLowerCase().includes('basic land') ?? false;
}

function cardCanBeCastWith(card: CubeCard, colors: string[]): boolean {
  const identity = card.color_identity || [];

  // Colorless cards can always be cast
  if (identity.length === 0) return true;

  // All colors in identity must be in our deck colors
  return identity.every(c => colors.includes(c));
}

function getLandColors(card: CubeCard): string[] {
  // For dual lands, check produced mana or type line
  const produced = card.produced_mana || [];
  if (produced.length > 0) {
    return produced.filter(c => COLORS.includes(c));
  }

  // Fallback to color_identity for lands
  return card.color_identity || [];
}

// ============================================
// Two-Pass Deck Building Algorithm
// ============================================

export function buildDeck(
  pool: CubeCard[],
  finalContext: DraftContext,
  drafterId: number
): BuiltDeck {
  // Separate lands and non-lands
  const poolLands = pool.filter(isLand);
  const poolNonLands = pool.filter(c => !isLand(c));

  // ============================================
  // PASS 1: Determine deck colors
  // ============================================

  // Count pips across ALL non-land cards
  const allPipCounts = poolNonLands.map(countColorPips);
  const totalPips = sumPips(allPipCounts);

  // Sort colors by pip count
  const colorsByPips = COLORS
    .map(c => ({ color: c, pips: totalPips[c as keyof PipCounts] as number }))
    .filter(x => x.pips > 0)
    .sort((a, b) => b.pips - a.pips);

  // Choose 2-3 colors (or fewer if pool is sparse)
  // TUNED: More aggressive about staying 2-color
  let deckColors: string[];

  if (colorsByPips.length === 0) {
    // Colorless deck (all artifacts)
    deckColors = [];
  } else if (colorsByPips.length === 1) {
    // Mono-color
    deckColors = [colorsByPips[0].color];
  } else if (colorsByPips.length === 2) {
    // Two-color
    deckColors = colorsByPips.slice(0, 2).map(x => x.color);
  } else {
    // 3+ colors in pool - default to top 2 colors
    deckColors = colorsByPips.slice(0, 2).map(x => x.color);

    // Only add third color if:
    // 1. It has substantial pips (> 50% of second color), AND
    // 2. Adding it gives access to enough castable spells
    // TUNED v5: Balanced at 50% to target 25-30% 2-color decks
    const thirdColor = colorsByPips[2];
    const secondColorPips = colorsByPips[1].pips;
    const firstColorPips = colorsByPips[0].pips;

    // Require 3rd color to be meaningful relative to top colors
    const isThirdColorSubstantial =
      thirdColor &&
      thirdColor.pips > secondColorPips * 0.50 &&
      thirdColor.pips > firstColorPips * 0.30;

    if (isThirdColorSubstantial) {
      deckColors.push(thirdColor.color);
    }
  }

  // ============================================
  // PASS 2: Select castable spells
  // ============================================

  // Filter to castable non-land cards
  const castableNonLands = poolNonLands.filter(c => cardCanBeCastWith(c, deckColors));
  const uncastableNonLands = poolNonLands.filter(c => !cardCanBeCastWith(c, deckColors));

  // Check for insufficient pool depth
  const insufficientPoolDepth = castableNonLands.length < SPELL_COUNT;

  // Rate castable cards using final context
  const ratedCastable = castableNonLands.map(card => ({
    card,
    rating: rateCard(card, finalContext),
  }));

  // Sort by contextual score
  ratedCastable.sort((a, b) => b.rating.contextualScore - a.rating.contextualScore);

  // Take top 23 (or all if fewer)
  let mainDeckSpells = ratedCastable.slice(0, SPELL_COUNT).map(x => x.card);
  let sideboardSpells = ratedCastable.slice(SPELL_COUNT).map(x => x.card);

  // If we don't have 23 castable spells, fill with best off-color cards
  if (mainDeckSpells.length < SPELL_COUNT && uncastableNonLands.length > 0) {
    const ratedUncastable = uncastableNonLands.map(card => ({
      card,
      rating: rateCard(card, finalContext),
    }));
    ratedUncastable.sort((a, b) => b.rating.contextualScore - a.rating.contextualScore);

    const needed = SPELL_COUNT - mainDeckSpells.length;
    const fillers = ratedUncastable.slice(0, needed).map(x => x.card);
    mainDeckSpells = [...mainDeckSpells, ...fillers];

    // Remaining uncastable go to sideboard
    sideboardSpells = [...sideboardSpells, ...ratedUncastable.slice(needed).map(x => x.card)];
  } else {
    // All uncastable go to sideboard
    sideboardSpells = [...sideboardSpells, ...uncastableNonLands];
  }

  const sideboard = sideboardSpells;

  // ============================================
  // PASS 3: Build mana base
  // ============================================

  // Recalculate pips from main deck spells only
  const mainDeckPips = sumPips(mainDeckSpells.map(countColorPips));

  // Select lands from pool
  const usableLands = poolLands.filter(land => {
    if (isBasicLand(land)) return false;  // Don't use pool basics (we add our own)

    const landColors = getLandColors(land);
    const oracleText = land.oracle_text?.toLowerCase() || '';
    const typeLine = land.type_line?.toLowerCase() || '';

    // Colorless utility lands are always usable (Ancient Tomb, Library, etc.)
    if (landColors.length === 0 && !oracleText.includes('search')) {
      return true;
    }

    // Fetch lands: check if they can find lands of our colors
    if (oracleText.includes('search') && oracleText.includes('land')) {
      // Check what basic types it can find
      const canFindPlains = oracleText.includes('plains') || typeLine.includes('plains');
      const canFindIsland = oracleText.includes('island') || typeLine.includes('island');
      const canFindSwamp = oracleText.includes('swamp') || typeLine.includes('swamp');
      const canFindMountain = oracleText.includes('mountain') || typeLine.includes('mountain');
      const canFindForest = oracleText.includes('forest') || typeLine.includes('forest');

      // Prismatic Vista and similar can find any basic
      const canFindAny = oracleText.includes('basic land card');

      if (canFindAny) return deckColors.length > 0;

      return (
        (canFindPlains && deckColors.includes('W')) ||
        (canFindIsland && deckColors.includes('U')) ||
        (canFindSwamp && deckColors.includes('B')) ||
        (canFindMountain && deckColors.includes('R')) ||
        (canFindForest && deckColors.includes('G'))
      );
    }

    // Regular lands: on-color if they produce at least one of our colors
    return landColors.some(c => deckColors.includes(c));
  });

  // Sort lands by utility: prioritize dual lands and fetches over single-color
  usableLands.sort((a, b) => {
    const aColors = getLandColors(a).filter(c => deckColors.includes(c)).length;
    const bColors = getLandColors(b).filter(c => deckColors.includes(c)).length;
    const aOracle = a.oracle_text?.toLowerCase() || '';
    const bOracle = b.oracle_text?.toLowerCase() || '';

    // Fetch lands get priority (consistent mana fixing)
    const aIsFetch = aOracle.includes('search') && aOracle.includes('land');
    const bIsFetch = bOracle.includes('search') && bOracle.includes('land');
    if (aIsFetch && !bIsFetch) return -1;
    if (!aIsFetch && bIsFetch) return 1;

    // Then by colors produced
    return bColors - aColors;
  });

  // Take lands up to our land count
  const mainDeckLands: CubeCard[] = [];
  const sideboardLands: CubeCard[] = [];

  for (const land of usableLands) {
    if (mainDeckLands.length < LAND_COUNT) {
      mainDeckLands.push(land);
    } else {
      sideboardLands.push(land);
    }
  }

  // Off-color lands go to sideboard
  const offColorLands = poolLands.filter(land =>
    !usableLands.includes(land) && !isBasicLand(land)
  );
  sideboardLands.push(...offColorLands);

  const draftedLandsUsed = mainDeckLands.length;

  // Fill remaining land slots with basics
  const basicsNeeded = LAND_COUNT - mainDeckLands.length;

  if (basicsNeeded > 0 && deckColors.length > 0) {
    // Calculate basic distribution based on pip counts
    const totalColoredPips = deckColors.reduce(
      (sum, c) => sum + (mainDeckPips[c as keyof PipCounts] as number),
      0
    );

    for (const color of deckColors) {
      const colorPips = mainDeckPips[color as keyof PipCounts] as number;
      const basicsForColor = Math.round(basicsNeeded * (colorPips / totalColoredPips));

      for (let i = 0; i < basicsForColor; i++) {
        mainDeckLands.push(createBasicLand(color));
      }
    }

    // Fill any remaining slots (rounding errors) with the primary color
    while (mainDeckLands.length < LAND_COUNT) {
      mainDeckLands.push(createBasicLand(deckColors[0]));
    }
  } else if (basicsNeeded > 0) {
    // Colorless deck - add wastes or just mark as needing basics
    // In practice, cube decks rarely need this
    for (let i = 0; i < basicsNeeded; i++) {
      mainDeckLands.push(createBasicLand('C'));  // Colorless basic
    }
  }

  // ============================================
  // Assemble Final Deck
  // ============================================

  const mainDeck = [...mainDeckSpells, ...mainDeckLands.slice(0, LAND_COUNT)];
  const finalSideboard = [...sideboard, ...sideboardLands];

  // Calculate stats
  const avgCmc = calculateAvgCmc(mainDeckSpells);
  const creatureCount = countType(mainDeckSpells, 'creature');
  const removalCount = countRemoval(mainDeckSpells);
  const cardDrawCount = countCardDraw(mainDeckSpells);

  // Calculate deck quality (avg contextual score of 23 non-land cards)
  const deckQuality = ratedCastable.length > 0
    ? ratedCastable.slice(0, SPELL_COUNT).reduce((sum, x) => sum + x.rating.contextualScore, 0) / Math.min(SPELL_COUNT, ratedCastable.length)
    : 0;

  return {
    drafterId,
    mainDeck,
    sideboard: finalSideboard,
    lands: LAND_COUNT,
    spells: mainDeckSpells.length,
    colors: deckColors,
    avgCmc,
    creatureCount,
    removalCount,
    cardDrawCount,
    finalArchetype: finalContext.dominantArchetype,
    archetypeCommitment: finalContext.archetypeWeights.size > 0
      ? Math.max(0, ...finalContext.archetypeWeights.values())
      : 0,
    deckQuality: Math.round(deckQuality),
    draftedLandsUsed,
    basicsAdded: basicsNeeded > 0 ? basicsNeeded : 0,
    insufficientPoolDepth,
  };
}

// ============================================
// Helper Functions
// ============================================

function createBasicLand(color: string): CubeCard {
  const nameMap: Record<string, string> = {
    W: 'Plains',
    U: 'Island',
    B: 'Swamp',
    R: 'Mountain',
    G: 'Forest',
    C: 'Wastes',
  };

  return {
    id: `basic-${color}-${Date.now()}-${Math.random()}`,
    name: nameMap[color] || 'Wastes',
    mana_cost: '',
    cmc: 0,
    type_line: 'Basic Land',
    color_identity: color === 'C' ? [] : [color],
    rarity: 'common',
    set: 'basic',
    legalities: {},
    archetypes: [],
    powerLevel: 0,
    draftPriority: 0,
    synergyTags: [],
    role: 'land',
  };
}

function calculateAvgCmc(cards: CubeCard[]): number {
  if (cards.length === 0) return 0;
  const total = cards.reduce((sum, c) => sum + (c.cmc || 0), 0);
  return Math.round((total / cards.length) * 10) / 10;
}

function countType(cards: CubeCard[], type: string): number {
  return cards.filter(c => c.type_line?.toLowerCase().includes(type)).length;
}

function countRemoval(cards: CubeCard[]): number {
  return cards.filter(c => {
    const text = c.oracle_text?.toLowerCase() || '';
    return (
      text.includes('destroy target') ||
      text.includes('exile target') ||
      (text.includes('deals') && text.includes('damage') && text.includes('target')) ||
      text.includes('counter target spell')
    );
  }).length;
}

function countCardDraw(cards: CubeCard[]): number {
  return cards.filter(c => {
    const text = c.oracle_text?.toLowerCase() || '';
    return text.includes('draw') && (text.includes('card') || text.includes('cards'));
  }).length;
}
